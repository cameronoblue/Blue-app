import { getAuthUserId } from '@convex-dev/auth/server'
import { ConvexError, v } from 'convex/values'
import { RateLimiter, MINUTE } from '@convex-dev/rate-limiter'
import { components } from './_generated/api'
import { query, mutation, type QueryCtx, type MutationCtx } from './_generated/server'
import type { Id, Doc } from './_generated/dataModel'
import schema, { pollQuestion, pollStatus } from './schema'
import { requireAdmin } from './lib/access'

const limiter = new RateLimiter(components.rateLimiter, {
  pollJoin: { kind: 'token bucket', rate: 120, period: MINUTE, capacity: 120 },
})
const publicQuestion = v.object({ prompt: v.string(), kind: v.union(v.literal('choice'), v.literal('text')), options: v.array(v.string()) })
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
function clean(title: string, description: string, questions: Doc<'polls'>['questions']) {
  title = title.trim(); description = description.trim()
  if (!title || title.length > 120 || description.length > 600 || questions.length < 1 || questions.length > 20) throw new ConvexError('Use a title up to 120 characters, a description up to 600, and 1–20 questions.')
  const cleaned = questions.map(q => {
    const prompt = q.prompt.trim(), options = q.options.map(o => o.trim())
    if (!prompt || prompt.length > 300) throw new ConvexError('Each question needs 1–300 characters.')
    if (q.kind === 'choice') {
      if (options.length < 2 || options.length > 12 || options.some(o => !o || o.length > 100) || new Set(options.map(o => o.toLocaleLowerCase())).size !== options.length) throw new ConvexError('Use 2–12 different options, up to 100 characters each.')
      if (q.correctIndex !== undefined && (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= options.length)) throw new ConvexError('Choose a valid correct answer.')
      return { ...q, prompt, options }
    }
    return { prompt, kind: q.kind, options: [] }
  })
  return { title, description, questions: cleaned }
}
export const list = query({ args: {}, returns: v.array(schema.doc('polls')), handler: async ctx => {
  const admin = await requireAdmin(ctx)
  return ctx.db.query('polls').withIndex('by_ownerId', q => q.eq('ownerId', admin._id)).order('desc').take(100)
} })
export const get = query({ args: { id: v.id('polls') }, returns: schema.doc('polls'), handler: (ctx, { id }) => owned(ctx, id) })
export const create = mutation({ args: { title: v.string(), description: v.string(), questions: v.array(pollQuestion) }, returns: v.id('polls'), handler: async (ctx, args) => {
  const admin = await requireAdmin(ctx)
  const data = clean(args.title, args.description, args.questions)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
    if (await byCode(ctx, code)) continue
    return ctx.db.insert('polls', { ...data, ownerId: admin._id, code, status: 'draft', resultsVisible: false, participantCount: 0 })
  }
  throw new ConvexError('Could not create a join code. Please try again.')
} })
export const edit = mutation({ args: { id: v.id('polls'), title: v.string(), description: v.string(), questions: v.array(pollQuestion) }, returns: v.null(), handler: async (ctx, args) => {
  const poll = await owned(ctx, args.id)
  if (poll.status !== 'draft') throw new ConvexError('Questions are locked after publishing. Create a new poll to change them.')
  await ctx.db.patch(args.id, clean(args.title, args.description, args.questions))
  return null
} })
export const control = mutation({ args: { id: v.id('polls'), status: v.optional(pollStatus), resultsVisible: v.optional(v.boolean()) }, returns: v.null(), handler: async (ctx, args) => {
  const poll = await owned(ctx, args.id)
  if (args.status === 'draft' && poll.status !== 'draft') throw new ConvexError('Published polls cannot return to draft.')
  const status = args.status ?? poll.status, resultsVisible = args.resultsVisible ?? poll.resultsVisible
  if (status === 'draft' && resultsVisible) throw new ConvexError('Publish before sharing results.')
  await ctx.db.patch(args.id, { status, resultsVisible })
  return null
} })
export const lookup = query({ args: { code: v.string() }, returns: v.union(v.null(), v.object({ title: v.string(), description: v.string(), status: pollStatus, resultsVisible: v.boolean(), questions: v.array(publicQuestion) })), handler: async (ctx, { code }) => {
  const poll = await byCode(ctx, code)
  if (!poll || poll.status === 'draft') return null
  // Never return owner IDs, guest tokens, or quiz answer keys to public clients.
  return { title: poll.title, description: poll.description, status: poll.status, resultsVisible: poll.resultsVisible, questions: poll.questions.map(({ prompt, kind, options }) => ({ prompt, kind, options })) }
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
const answer = v.object({ question: v.number(), choice: v.optional(v.number()), text: v.optional(v.string()) })
export const myAnswers = query({ args: { code: v.string(), token: v.string() }, returns: v.union(v.null(), v.object({ answers: v.array(answer), correct: v.union(v.number(), v.null()), quizTotal: v.number() })), handler: async (ctx, { code, token }) => {
  const poll = await byCode(ctx, code)
  if (!poll || poll.status === 'draft' || !uuid.test(token)) return null
  const participant = await ctx.db.query('pollParticipants').withIndex('by_pollId_and_token', q => q.eq('pollId', poll._id).eq('token', token)).unique()
  if (!participant) return null
  const answers = await ctx.db.query('pollResponses').withIndex('by_participantId_and_question', q => q.eq('participantId', participant._id)).take(20)
  const quizTotal = poll.questions.filter(q => q.correctIndex !== undefined).length
  return { answers: answers.map(({ question, choice, text }) => ({ question, choice, text })), quizTotal, correct: poll.resultsVisible ? answers.filter(a => a.choice !== undefined && a.choice === poll.questions[a.question]?.correctIndex).length : null }
} })
export const respond = mutation({ args: { code: v.string(), token: v.string(), ...answer.fields }, returns: v.null(), handler: async (ctx, args) => {
  const poll = await byCode(ctx, args.code)
  if (!poll || poll.status !== 'open') throw new ConvexError('This poll is not accepting answers.')
  if (!uuid.test(args.token)) throw new ConvexError('Join this poll first.')
  const participant = await ctx.db.query('pollParticipants').withIndex('by_pollId_and_token', q => q.eq('pollId', poll._id).eq('token', args.token)).unique()
  if (!participant) throw new ConvexError('Join this poll first.')
  const q = poll.questions[args.question]
  if (!Number.isInteger(args.question) || !q) throw new ConvexError('Invalid question.')
  let choice: number | undefined, text: string | undefined
  if (q.kind === 'choice') {
    if (args.choice === undefined || !Number.isInteger(args.choice) || args.choice < 0 || args.choice >= q.options.length || args.text !== undefined) throw new ConvexError('Choose a valid option.')
    choice = args.choice
  } else {
    text = args.text?.trim()
    if (!text || text.length > 300 || args.choice !== undefined) throw new ConvexError('Write an answer from 1 to 300 characters.')
  }
  const existing = await ctx.db.query('pollResponses').withIndex('by_participantId_and_question', i => i.eq('participantId', participant._id).eq('question', args.question)).unique()
  if (existing) {
    if (existing.choice === choice && existing.text === text) return null
    throw new ConvexError('Your answer has already been submitted.')
  }
  await ctx.db.insert('pollResponses', { pollId: poll._id, participantId: participant._id, question: args.question, choice, text, hidden: false })
  return null
} })
const results = v.object({ total: v.number(), counts: v.array(v.number()), texts: v.array(v.object({ text: v.string(), count: v.number() })), responses: v.array(v.object({ id: v.id('pollResponses'), text: v.string(), hidden: v.boolean() })), correctIndex: v.union(v.number(), v.null()) })
export const resultsForQuestion = query({ args: { code: v.string(), question: v.number() }, returns: v.union(v.null(), results), handler: async (ctx, { code, question }) => {
  const poll = await byCode(ctx, code)
  if (!poll || !Number.isInteger(question) || !poll.questions[question]) return null
  let isOwner = false
  const identity = await ctx.auth.getUserIdentity()
  if (identity) {
    const id = await getAuthUserId(ctx)
    const user = id ? await ctx.db.get(id) : null
    isOwner = user?.role === 'admin' && poll.ownerId === id
  }
  if (!isOwner && (poll.status === 'draft' || !poll.resultsVisible)) return null
  const rows = await ctx.db.query('pollResponses').withIndex('by_pollId_and_question', i => i.eq('pollId', poll._id).eq('question', question)).take(1001)
  const visible = rows.filter(r => !r.hidden)
  const q = poll.questions[question], counts = q.options.map((_, i) => visible.filter(r => r.choice === i).length)
  const texts = new Map<string, number>()
  for (const row of visible) if (row.text) texts.set(row.text, (texts.get(row.text) ?? 0) + 1)
  return { total: visible.length, counts, texts: [...texts].map(([text, count]) => ({ text, count })), responses: isOwner ? rows.filter(r => r.text !== undefined).map(r => ({ id: r._id, text: r.text!, hidden: r.hidden })) : [], correctIndex: q.correctIndex ?? null }
} })
export const moderate = mutation({ args: { id: v.id('pollResponses'), hidden: v.boolean() }, returns: v.null(), handler: async (ctx, { id, hidden }) => {
  const response = await ctx.db.get(id)
  if (!response) throw new ConvexError('Response not found.')
  await owned(ctx, response.pollId)
  if (response.text === undefined) throw new ConvexError('Only open-ended responses can be moderated.')
  await ctx.db.patch(id, { hidden })
  return null
} })
