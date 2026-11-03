import { getAuthUserId } from '@convex-dev/auth/server'
import { ConvexError, v } from 'convex/values'
import { RateLimiter, MINUTE } from '@convex-dev/rate-limiter'
import { components } from './_generated/api'
import { query, mutation, type QueryCtx, type MutationCtx } from './_generated/server'
import type { Id, Doc } from './_generated/dataModel'
import schema, { pollQuestion, pollStatus, pollPhase, pollFormat } from './schema'
import { requireAdmin } from './lib/access'

const limiter = new RateLimiter(components.rateLimiter, {
  pollJoin: { kind: 'token bucket', rate: 120, period: MINUTE, capacity: 120 },
})
const publicQuestion = v.object({ prompt: v.string(), kind: v.union(v.literal('choice'), v.literal('checkbox'), v.literal('text')), options: v.array(v.string()), allowMultiple: v.optional(v.boolean()), allowMultipleSubmissions: v.optional(v.boolean()) })
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const codeOf = (value: string) => value.toUpperCase().replace(/[\s-]/g, '')
async function owned(ctx: QueryCtx | MutationCtx, id: Id<'polls'>) {
  const admin = await requireAdmin(ctx)
  const poll = await ctx.db.get(id)
  if (!poll || poll.ownerId !== admin._id) throw new ConvexError('Poll not found or not authorized.')
  return poll
}
async function byCode(ctx: QueryCtx | MutationCtx, code: string) {
  if (!/^[A-Z2-9]{8}$/.test(codeOf(code))) return null
  return ctx.db.query('polls').withIndex('by_code', q => q.eq('code', codeOf(code))).unique()
}
function keyFor(q: Doc<'polls'>['questions'][number]) { return q.correctIndices ?? (q.correctIndex === undefined ? [] : [q.correctIndex]) }
function picksFor(a: { choice?: number, choices?: number[] }) { return a.choices ?? (a.choice === undefined ? [] : [a.choice]) }
function same(a: number[], b: number[]) { return a.length === b.length && [...a].sort((x, y) => x - y).every((n, i) => n === [...b].sort((x, y) => x - y)[i]) }
function visibleResult(poll: Doc<'polls'>, question: number) {
  return poll.resultsVisible && (!poll.hosted || ((poll.phase === 'results' || poll.phase === 'finished') && (poll.revealed ?? []).includes(question)))
}
function clean(title: string, description: string, questions: Doc<'polls'>['questions']) {
  title = title.trim(); description = description.trim()
  if (!title || title.length > 120 || description.length > 600 || questions.length < 1 || questions.length > 20) throw new ConvexError('Use a title up to 120 characters, a description up to 600, and 1–20 questions.')
  const cleaned = questions.map(q => {
    const prompt = q.prompt.trim(), options = q.options.map(o => o.trim())
    if (!prompt || prompt.length > 300) throw new ConvexError('Each question needs 1–300 characters.')
    if (q.kind !== 'text') {
      if (options.length < 2 || options.length > 12 || options.some(o => !o || o.length > 100) || new Set(options.map(o => o.toLocaleLowerCase())).size !== options.length) throw new ConvexError('Use 2–12 different options, up to 100 characters each.')
      if (q.correctIndex !== undefined && (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= options.length)) throw new ConvexError('Choose a valid correct answer.')
      const keys = keyFor(q)
      if (keys.length > options.length || new Set(keys).size !== keys.length || keys.some(i => !Number.isInteger(i) || i < 0 || i >= options.length) || (!(q.kind === 'checkbox' || q.allowMultiple) && keys.length > 1)) throw new ConvexError('Choose valid, distinct correct answers for this question type.')
      if (q.correctIndex !== undefined && q.correctIndices !== undefined) throw new ConvexError('Use one answer key format.')
      return { ...q, prompt, options }
    }
    return { prompt, kind: q.kind, options: [], ...(q.allowMultipleSubmissions === undefined ? {} : { allowMultipleSubmissions: q.allowMultipleSubmissions }) }
  })
  return { title, description, questions: cleaned }
}
export const list = query({ args: {}, returns: v.array(schema.doc('polls')), handler: async ctx => {
  const admin = await requireAdmin(ctx)
  return ctx.db.query('polls').withIndex('by_ownerId', q => q.eq('ownerId', admin._id)).order('desc').take(100)
} })
export const get = query({ args: { id: v.id('polls') }, returns: schema.doc('polls'), handler: (ctx, { id }) => owned(ctx, id) })
export const create = mutation({ args: { title: v.string(), description: v.string(), questions: v.array(pollQuestion), hosted: v.optional(v.boolean()) }, returns: v.id('polls'), handler: async (ctx, args) => {
  const admin = await requireAdmin(ctx)
  const data = clean(args.title, args.description, args.questions)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
    if (await byCode(ctx, code)) continue
    return ctx.db.insert('polls', { ...data, ownerId: admin._id, code, status: 'draft', resultsVisible: false, participantCount: 0, hosted: args.hosted ?? false, phase: 'lobby', activeQuestion: 0, revealed: [] })
  }
  throw new ConvexError('Could not create a join code. Please try again.')
} })
export const edit = mutation({ args: { id: v.id('polls'), title: v.string(), description: v.string(), questions: v.array(pollQuestion), hosted: v.optional(v.boolean()) }, returns: v.null(), handler: async (ctx, args) => {
  const poll = await owned(ctx, args.id)
  if (poll.status !== 'draft') throw new ConvexError('Questions are locked after publishing. Create a new poll to change them.')
  await ctx.db.patch(args.id, { ...clean(args.title, args.description, args.questions), hosted: args.hosted ?? poll.hosted ?? false })
  return null
} })
export const control = mutation({ args: { id: v.id('polls'), status: v.optional(pollStatus), resultsVisible: v.optional(v.boolean()) }, returns: v.null(), handler: async (ctx, args) => {
  const poll = await owned(ctx, args.id)
  if (args.status === 'draft' && poll.status !== 'draft') throw new ConvexError('Published polls cannot return to draft.')
  const status = args.status ?? poll.status, resultsVisible = args.resultsVisible ?? poll.resultsVisible
  if (status === 'draft' && resultsVisible) throw new ConvexError('Publish before sharing results.')
  if (poll.hosted && status === 'open' && poll.phase === 'finished') throw new ConvexError('This session has finished. Create a new session to play again.')
  if (poll.hosted && resultsVisible && poll.phase !== 'results' && poll.phase !== 'finished') throw new ConvexError('Reveal the current question first.')
  await ctx.db.patch(args.id, { status, resultsVisible, ...(poll.hosted && status === 'closed' ? { phase: 'finished' as const } : {}) })
  return null
} })
export const advance = mutation({ args: { id: v.id('polls'), question: v.number(), action: v.union(v.literal('start'), v.literal('lock'), v.literal('resume'), v.literal('reveal'), v.literal('next'), v.literal('finish')) }, returns: v.null(), handler: async (ctx, { id, question, action }) => {
  const poll = await owned(ctx, id)
  if (!poll.hosted || poll.status !== 'open') throw new ConvexError('This live session is not open.')
  const active = poll.activeQuestion ?? 0, phase = poll.phase ?? 'lobby'
  if (question !== active) throw new ConvexError('The host has already moved to another question. Refresh your controls.')
  if (action === 'start' && phase === 'lobby') await ctx.db.patch(id, { phase: 'question', resultsVisible: false, displayFormat: poll.questions[active].kind === 'text' ? 'cloud' : 'bar' })
  else if (action === 'lock' && phase === 'question') await ctx.db.patch(id, { phase: 'locked' })
  else if (action === 'resume' && phase === 'locked') await ctx.db.patch(id, { phase: 'question' })
  else if (action === 'reveal' && (phase === 'question' || phase === 'locked')) await ctx.db.patch(id, { phase: 'results', resultsVisible: true, revealed: [...new Set([...(poll.revealed ?? []), active])] })
  else if (action === 'next' && phase === 'results' && active < poll.questions.length - 1) await ctx.db.patch(id, { activeQuestion: active + 1, phase: 'question', resultsVisible: false, displayFormat: poll.questions[active + 1].kind === 'text' ? 'cloud' : 'bar' })
  else if (action === 'finish' && phase !== 'finished') await ctx.db.patch(id, { status: 'closed', phase: 'finished', resultsVisible: true, revealed: [...new Set([...(poll.revealed ?? []), ...(phase === 'lobby' ? [] : [active])])] })
  else throw new ConvexError('That control is not available in this round.')
  return null
} })
export const setDisplayFormat = mutation({ args: { id: v.id('polls'), question: v.number(), format: pollFormat }, returns: v.null(), handler: async (ctx, { id, question, format }) => {
  const poll = await owned(ctx, id)
  if (question !== (poll.activeQuestion ?? 0)) throw new ConvexError('The current question has changed.')
  const allowed = poll.questions[question]?.kind === 'text' ? ['cloud', 'answers', 'table'] : ['bar', 'pie', 'donut', 'table']
  if (!allowed.includes(format)) throw new ConvexError('That format does not match this question.')
  await ctx.db.patch(id, { displayFormat: format })
  return null
} })
export const lookup = query({ args: { code: v.string() }, returns: v.union(v.null(), v.object({ title: v.string(), description: v.string(), status: pollStatus, resultsVisible: v.boolean(), questions: v.array(publicQuestion), hosted: v.boolean(), phase: pollPhase, activeQuestion: v.number(), questionCount: v.number(), participantCount: v.number(), answeredCount: v.number(), displayFormat: v.optional(pollFormat) })), handler: async (ctx, { code }) => {
  const poll = await byCode(ctx, code)
  if (!poll || poll.status === 'draft') return null
  const phase = poll.phase ?? 'lobby', activeQuestion = poll.activeQuestion ?? 0
  const answeredCount = poll.hosted && phase !== 'lobby' && phase !== 'finished' ? new Set((await ctx.db.query('pollResponses').withIndex('by_pollId_and_question', q => q.eq('pollId', poll._id).eq('question', activeQuestion)).take(5001)).map(r => r.participantId)).size : 0
  // Future questions and answer keys never leave the server during hosted play.
  const questions = poll.hosted ? (phase === 'lobby' || phase === 'finished' ? [] : [poll.questions[activeQuestion]]) : poll.questions
  return { title: poll.title, description: poll.description, status: poll.status, resultsVisible: poll.resultsVisible, hosted: poll.hosted ?? false, phase, activeQuestion, questionCount: poll.questions.length, participantCount: poll.participantCount, answeredCount, displayFormat: poll.displayFormat, questions: questions.map(({ prompt, kind, options, allowMultiple, allowMultipleSubmissions }) => ({ prompt, kind, options, ...(allowMultiple === undefined ? {} : { allowMultiple }), ...(allowMultipleSubmissions === undefined ? {} : { allowMultipleSubmissions }) })) }
} })
export const join = mutation({ args: { code: v.string(), token: v.string() }, returns: v.null(), handler: async (ctx, { code, token }) => {
  if (!uuid.test(token)) throw new ConvexError('Please reload and try again.')
  const poll = await byCode(ctx, code)
  if (!poll || poll.status === 'draft') throw new ConvexError('No published poll has that code.')
  const existing = await ctx.db.query('pollParticipants').withIndex('by_pollId_and_token', q => q.eq('pollId', poll._id).eq('token', token)).unique()
  if (existing) return null
  if (poll.status !== 'open') throw new ConvexError('This poll is closed.')
  if (poll.participantCount >= 1000) throw new ConvexError('This session has reached its 1,000-participant limit.')
  const limit = await limiter.limit(ctx, 'pollJoin', { key: poll._id })
  if (!limit.ok) throw new ConvexError('Lots of people are joining. Please try again in a moment.')
  await ctx.db.insert('pollParticipants', { pollId: poll._id, token })
  await ctx.db.patch(poll._id, { participantCount: poll.participantCount + 1 })
  return null
} })
const answer = v.object({ question: v.number(), choice: v.optional(v.number()), choices: v.optional(v.array(v.number())), text: v.optional(v.string()) })
export const myAnswers = query({ args: { code: v.string(), token: v.string() }, returns: v.union(v.null(), v.object({ answers: v.array(answer), correct: v.union(v.number(), v.null()), quizTotal: v.number(), submissionCounts: v.array(v.number()) })), handler: async (ctx, { code, token }) => {
  const poll = await byCode(ctx, code)
  if (!poll || poll.status === 'draft' || !uuid.test(token)) return null
  const participant = await ctx.db.query('pollParticipants').withIndex('by_pollId_and_token', q => q.eq('pollId', poll._id).eq('token', token)).unique()
  if (!participant) return null
  const rows = await ctx.db.query('pollResponses').withIndex('by_participantId_and_question', q => q.eq('participantId', participant._id)).take(401)
  const latest = new Map<number, typeof rows[number]>()
  const submissionCounts = poll.questions.map(() => 0)
  for (const row of rows) { latest.set(row.question, row); submissionCounts[row.question]++ }
  const answers = [...latest.values()]
  const quizTotal = poll.questions.filter((q, i) => keyFor(q).length > 0 && (!poll.hosted || (poll.revealed ?? []).includes(i))).length
  const canGrade = poll.hosted ? poll.phase === 'finished' && poll.resultsVisible : poll.resultsVisible
  return { submissionCounts, answers: answers.map(({ question, choice, choices, text }) => ({ question, choice, choices, text })), quizTotal, correct: canGrade ? answers.filter(a => { const keys = keyFor(poll.questions[a.question]); return keys.length > 0 && same(picksFor(a), keys) }).length : null }
} })
export const respond = mutation({ args: { code: v.string(), token: v.string(), requestId: v.optional(v.string()), ...answer.fields }, returns: v.null(), handler: async (ctx, args) => {
  const poll = await byCode(ctx, args.code)
  if (!poll || poll.status !== 'open') throw new ConvexError('This poll is not accepting answers.')
  if (!uuid.test(args.token)) throw new ConvexError('Join this poll first.')
  const participant = await ctx.db.query('pollParticipants').withIndex('by_pollId_and_token', q => q.eq('pollId', poll._id).eq('token', args.token)).unique()
  if (!participant) throw new ConvexError('Join this poll first.')
  const q = poll.questions[args.question]
  if (!Number.isInteger(args.question) || !q) throw new ConvexError('Invalid question.')
  if (poll.hosted && (poll.phase !== 'question' || args.question !== (poll.activeQuestion ?? 0))) throw new ConvexError('Wait for the host to open this question.')
  let choice: number | undefined, text: string | undefined, choices: number[] | undefined
  if (q.kind !== 'text') {
    const selected = args.choices ?? (args.choice === undefined ? [] : [args.choice])
    if ((args.choice !== undefined && args.choices !== undefined) || !selected.length || selected.length > q.options.length || new Set(selected).size !== selected.length || selected.some(i => !Number.isInteger(i) || i < 0 || i >= q.options.length) || (!(q.kind === 'checkbox' || q.allowMultiple) && selected.length !== 1) || args.text !== undefined) throw new ConvexError('Choose valid, distinct options.')
    choices = [...selected].sort((a, b) => a - b)
    choice = choices.length === 1 ? choices[0] : undefined
  } else {
    text = args.text?.trim()
    if (!text || text.length > 300 || (args.choice !== undefined || args.choices !== undefined)) throw new ConvexError('Write an answer from 1 to 300 characters.')
  }
  const previous = await ctx.db.query('pollResponses').withIndex('by_participantId_and_question', i => i.eq('participantId', participant._id).eq('question', args.question)).order('desc').take(21)
  if (args.requestId !== undefined && !uuid.test(args.requestId)) throw new ConvexError('Please reload and try again.')
  const retry = args.requestId ? previous.find(r => r.requestId === args.requestId) : undefined
  if (retry) {
    if (same(picksFor(retry), choices ?? []) && retry.text === text) return null
    throw new ConvexError('This submission ID has already been used. Submit a new answer instead.')
  }
  if (!q.allowMultipleSubmissions && previous.length) {
    if (same(picksFor(previous[0]), choices ?? []) && previous[0].text === text) return null
    throw new ConvexError('Your answer has already been submitted.')
  }
  if (q.allowMultipleSubmissions && !args.requestId) throw new ConvexError('A submission ID is required. Please reload and try again.')
  if (previous.length >= 20) throw new ConvexError('You have reached the 20-submission limit for this question.')
  const room = await ctx.db.query('pollResponses').withIndex('by_pollId_and_question', i => i.eq('pollId', poll._id).eq('question', args.question)).take(5001)
  if (room.length >= 5000) throw new ConvexError('This question has reached its 5,000-submission limit.')
  await ctx.db.insert('pollResponses', { pollId: poll._id, participantId: participant._id, question: args.question, choice, choices, text, requestId: args.requestId, hidden: false })
  return null
} })
const results = v.object({ total: v.number(), participants: v.number(), counts: v.array(v.number()), texts: v.array(v.object({ text: v.string(), count: v.number() })), responses: v.array(v.object({ id: v.id('pollResponses'), text: v.string(), hidden: v.boolean() })), correctIndex: v.union(v.number(), v.null()), correctIndices: v.array(v.number()) })
export const resultsForQuestion = query({ args: { code: v.string(), question: v.number(), audience: v.optional(v.boolean()) }, returns: v.union(v.null(), results), handler: async (ctx, { code, question, audience }) => {
  const poll = await byCode(ctx, code)
  if (!poll || !Number.isInteger(question) || !poll.questions[question]) return null
  let isOwner = false
  const identity = await ctx.auth.getUserIdentity()
  if (identity) {
    const id = await getAuthUserId(ctx)
    const user = id ? await ctx.db.get(id) : null
    isOwner = !audience && user?.role === 'admin' && poll.ownerId === id
  }
  if (!isOwner && (poll.status === 'draft' || !visibleResult(poll, question))) return null
  const rows = await ctx.db.query('pollResponses').withIndex('by_pollId_and_question', i => i.eq('pollId', poll._id).eq('question', question)).take(5001)
  const visible = rows.filter(r => !r.hidden)
  const q = poll.questions[question], counts = q.options.map((_, i) => visible.filter(r => picksFor(r).includes(i)).length)
  const texts = new Map<string, number>()
  for (const row of visible) if (row.text) texts.set(row.text, (texts.get(row.text) ?? 0) + 1)
  return { total: visible.length, participants: new Set(rows.map(r => r.participantId)).size, counts, texts: [...texts].map(([text, count]) => ({ text, count })), responses: isOwner ? rows.filter(r => r.text !== undefined).map(r => ({ id: r._id, text: r.text!, hidden: r.hidden })) : [], correctIndex: keyFor(q).length === 1 ? keyFor(q)[0] : null, correctIndices: keyFor(q) }
} })
export const moderate = mutation({ args: { id: v.id('pollResponses'), hidden: v.boolean() }, returns: v.null(), handler: async (ctx, { id, hidden }) => {
  const response = await ctx.db.get(id)
  if (!response) throw new ConvexError('Response not found.')
  await owned(ctx, response.pollId)
  if (response.text === undefined) throw new ConvexError('Only open-ended responses can be moderated.')
  await ctx.db.patch(id, { hidden })
  return null
} })
