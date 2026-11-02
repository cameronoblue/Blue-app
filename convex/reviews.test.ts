/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest'
import { convexTest } from 'convex-test'
import rateLimiter from '@convex-dev/rate-limiter/test'
import schema from './schema'
import { api } from './_generated/api'
const modules = import.meta.glob(['./**/*.ts', '!./**/*.test.ts'])
function fixture() {
  const t = convexTest(schema, modules)
  rateLimiter.register(t)
  return t
}
function review() {
  return { displayName: 'Guest', rating: 4 as const, comment: 'A thoughtful and very cool human.', browserKey: crypto.randomUUID(), requestId: crypto.randomUUID(), website: '' }
}
const page = { paginationOpts: { numItems: 6, cursor: null } }
describe('guest reviews', () => {
  it('accepts a review without authentication and returns only public fields', async () => {
    const t = fixture()
    const submission = { ...review(), displayName: '   ', comment: '  A thoughtful and very cool human.  ' }
    await t.mutation(api.reviews.submit, submission)
    const publicPage = await t.query(api.reviews.list, page)
    expect(publicPage.page).toHaveLength(1)
    expect(publicPage.page[0]).toMatchObject({ displayName: 'Anonymous', rating: 4, comment: 'A thoughtful and very cool human.' })
    expect(Object.keys(publicPage.page[0]).sort()).toEqual(['id', 'displayName', 'rating', 'comment', 'createdAt'].sort())
    expect(await t.run(ctx => ctx.db.query('users').take(1))).toEqual([])
    await expect(t.query(api.logbook.listEvents, {})).rejects.toThrow(/Not authorized/)
  })
  it('deduplicates retries, rate-limits each browser, and applies a global cap across new browser keys', async () => {
    const t = fixture()
    const submission = review()
    await t.mutation(api.reviews.submit, submission)
    await t.mutation(api.reviews.submit, submission)
    expect((await t.query(api.reviews.list, page)).page).toHaveLength(1)
    await expect(t.mutation(api.reviews.submit, { ...submission, requestId: crypto.randomUUID() })).rejects.toThrow(/wait an hour/)
    for (let i = 1; i < 10; i++) await t.mutation(api.reviews.submit, review())
    await expect(t.mutation(api.reviews.submit, review())).rejects.toThrow(/busy/)
  })
  it('rejects invalid text/ratings and silently discards honeypot submissions', async () => {
    const t = fixture()
    await expect(t.mutation(api.reviews.submit, { ...review(), comment: 'short' })).rejects.toThrow(/10 to 1,000/)
    await expect(t.mutation(api.reviews.submit, { ...review(), displayName: 'x'.repeat(51) })).rejects.toThrow(/50/)
    await expect(t.mutation(api.reviews.submit, { ...review(), rating: 6 as 4 })).rejects.toThrow()
    await expect(t.mutation(api.reviews.submit, { ...review(), browserKey: 'invalid' })).rejects.toThrow(/reload/)
    await t.mutation(api.reviews.submit, { ...review(), website: 'bot-filled' })
    expect((await t.query(api.reviews.list, page)).page).toEqual([])
  })
  it('allows only admins to hide/restore and never includes hidden reviews in the public list', async () => {
    const t = fixture()
    await t.mutation(api.reviews.submit, review())
    const id = (await t.query(api.reviews.list, page)).page[0].id
    const ids = await t.run(async ctx => ({
      admin: await ctx.db.insert('users', { username: 'Admin', usernameKey: 'admin', role: 'admin' }),
      member: await ctx.db.insert('users', { username: 'Member', usernameKey: 'member', role: 'member' }),
    }))
    const admin = t.withIdentity({ subject: `${ids.admin}|session` })
    const member = t.withIdentity({ subject: `${ids.member}|session` })
    await expect(t.mutation(api.reviews.setHidden, { id, hidden: true })).rejects.toThrow(/Not authorized/)
    await expect(member.mutation(api.reviews.setHidden, { id, hidden: true })).rejects.toThrow(/Admin/)
    await expect(t.query(api.reviews.adminList, { ...page, hidden: false })).rejects.toThrow(/Not authorized/)
    await expect(member.query(api.reviews.adminList, { ...page, hidden: false })).rejects.toThrow(/Admin/)
    await admin.mutation(api.reviews.setHidden, { id, hidden: true })
    expect((await t.query(api.reviews.list, page)).page).toEqual([])
    expect((await admin.query(api.reviews.adminList, { ...page, hidden: true })).page[0].id).toBe(id)
    await admin.mutation(api.reviews.setHidden, { id, hidden: false })
    expect((await t.query(api.reviews.list, page)).page[0].id).toBe(id)
  })
})
