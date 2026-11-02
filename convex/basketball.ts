import { v, ConvexError } from 'convex/values'
import { query, mutation } from './_generated/server'
import { requireUser } from './lib/access'

export const stats = query({ args: {}, returns: v.object({ bestScore: v.number(), lastScore: v.union(v.number(), v.null()) }), handler: async ctx => {
  const user = await requireUser(ctx)
  const best = await ctx.db.query('basketballRuns').withIndex('by_ownerId_and_score', q => q.eq('ownerId', user._id)).order('desc').first()
  const last = await ctx.db.query('basketballRuns').withIndex('by_ownerId', q => q.eq('ownerId', user._id)).order('desc').first()
  return { bestScore: best?.score ?? 0, lastScore: last?.score ?? null }
} })
export const saveRun = mutation({ args: { runId: v.string(), score: v.number(), made: v.number(), shots: v.number(), bestStreak: v.number(), playedSeconds: v.number() }, returns: v.null(), handler: async (ctx, args) => {
  const user = await requireUser(ctx)
  const { score, made, shots, bestStreak, playedSeconds } = args
  if (!/^[0-9a-f-]{36}$/i.test(args.runId) || ![score, made, shots, bestStreak].every(n => Number.isSafeInteger(n) && n >= 0) || score % 2 !== 0 || score < made * 2 || score > made * 10 || made > shots || bestStreak > made || shots > 100000 || !Number.isFinite(playedSeconds) || playedSeconds <= 0 || playedSeconds > 86400) throw new ConvexError('This game result is invalid.')
  const existing = await ctx.db.query('basketballRuns').withIndex('by_ownerId_and_runId', q => q.eq('ownerId', user._id).eq('runId', args.runId)).unique()
  if (!existing) await ctx.db.insert('basketballRuns', { ...args, ownerId: user._id })
  return null
} })
