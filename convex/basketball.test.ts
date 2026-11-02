/// <reference types="vite/client" />
import { it, expect } from 'vitest'
import { convexTest } from 'convex-test'
import schema from './schema'
import { api } from './_generated/api'
const modules = import.meta.glob(['./**/*.ts', '!./**/*.test.ts'])
it('keeps basketball records private, deduplicates saves, and rejects invalid results', async () => {
  const t = convexTest(schema, modules)
  const ids = await t.run(async ctx => ({ owner: await ctx.db.insert('users', { username: 'Player', usernameKey: 'player', role: 'member' }), other: await ctx.db.insert('users', { username: 'Other', usernameKey: 'other', role: 'member' }) }))
  const owner = t.withIdentity({ subject: `${ids.owner}|session` })
  const other = t.withIdentity({ subject: `${ids.other}|session` })
  const run = { runId: crypto.randomUUID(), score: 10, made: 4, shots: 6, bestStreak: 4, playedSeconds: 60 }
  await expect(t.mutation(api.basketball.saveRun, run)).rejects.toThrow(/Not authorized/)
  await expect(t.query(api.basketball.stats, {})).rejects.toThrow(/Not authorized/)
  await owner.mutation(api.basketball.saveRun, run)
  await owner.mutation(api.basketball.saveRun, run)
  expect(await owner.query(api.basketball.stats, {})).toEqual({ bestScore: 10, lastScore: 10 })
  expect(await other.query(api.basketball.stats, {})).toEqual({ bestScore: 0, lastScore: null })
  expect(await t.run(ctx => ctx.db.query('basketballRuns').withIndex('by_ownerId', q => q.eq('ownerId', ids.owner)).take(10))).toHaveLength(1)
  await expect(owner.mutation(api.basketball.saveRun, { ...run, runId: crypto.randomUUID(), score: 1000 })).rejects.toThrow(/invalid/)
  await expect(owner.mutation(api.basketball.saveRun, { ...run, runId: crypto.randomUUID(), made: 7 })).rejects.toThrow(/invalid/)
  await owner.mutation(api.basketball.saveRun, { ...run, runId: crypto.randomUUID(), score: 2, made: 1, shots: 3, bestStreak: 1 })
  expect(await owner.query(api.basketball.stats, {})).toEqual({ bestScore: 10, lastScore: 2 })
})
