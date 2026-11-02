/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest'
import { convexTest } from 'convex-test'
import { Scrypt } from 'lucia'
import schema from './schema'
import { api, internal } from './_generated/api'

const modules = import.meta.glob(['./**/*.ts', '!./**/*.test.ts'])
async function fixture() {
  const t = convexTest(schema, modules)
  const hash = await new Scrypt().hash('TestPassword123')
  const users = await t.run(async ctx => {
    const admin = await ctx.db.insert('users', { username: 'Owner_Admin', usernameKey: 'owner_admin', role: 'admin' })
    const other = await ctx.db.insert('users', { username: 'Other_Member', usernameKey: 'other_member', role: 'member' })
    const account = await ctx.db.insert('authAccounts', { userId: admin, provider: 'password', providerAccountId: 'owner_admin', secret: hash })
    const otherAccount = await ctx.db.insert('authAccounts', { userId: other, provider: 'password', providerAccountId: 'other_member', secret: hash })
    const session = await ctx.db.insert('authSessions', { userId: admin, expirationTime: Date.now() + 86400000 })
    return { admin, other, account, otherAccount, session }
  })
  const owner = t.withIdentity({ subject: `${users.admin}|${users.session}` })
  const other = t.withIdentity({ subject: `${users.other}|other-session` })
  return { t, owner, other, users }
}

describe('private logbook', () => {
  it('captures the tap time once, persists notes, and maintains counters after deletion', async () => {
    const { t, owner } = await fixture()
    const event = await owner.mutation(api.logbook.createEvent, { name: 'Coffee', description: 'A pause', color: 'blue' })
    const time = Date.now() - 1500
    const first = await owner.mutation(api.logbook.record, { eventTypeId: event, occurredAt: time, requestId: 'tap-one' })
    const again = await owner.mutation(api.logbook.record, { eventTypeId: event, occurredAt: time, requestId: 'tap-one' })
    expect(again).toEqual(first)
    await owner.mutation(api.logbook.updateComment, { id: first, comment: '  Morning coffee  ' })
    await expect(owner.mutation(api.logbook.removeEvent, { id: event })).rejects.toThrow(/Only empty/)
    const second = await owner.mutation(api.logbook.record, { eventTypeId: event, occurredAt: time + 500, requestId: 'tap-two' })
    const history = await owner.query(api.logbook.history, { since: 0, eventTypeId: event, paginationOpts: { numItems: 20, cursor: null } })
    expect(history.page.map(e => e.occurredAt)).toEqual([time + 500, time])
    expect(history.page[1].comment).toBe('Morning coffee')
    expect((await owner.query(api.logbook.listEvents, {}))[0].totalCount).toBe(2)
    await owner.mutation(api.logbook.removeLog, { id: second })
    expect((await owner.query(api.logbook.listEvents, {}))[0]).toMatchObject({ totalCount: 1, lastLoggedAt: time })
    await owner.mutation(api.logbook.removeLog, { id: first })
    expect((await owner.query(api.logbook.listEvents, {}))[0].totalCount).toBe(0)
    expect(await t.run(ctx => ctx.db.get(first))).toBeNull()
    await owner.mutation(api.logbook.removeEvent, { id: event })
    expect(await owner.query(api.logbook.listEvents, {})).toEqual([])
  })
  it('isolates accounts and refuses other-user and anonymous access', async () => {
    const { t, owner, other } = await fixture()
    const event = await owner.mutation(api.logbook.createEvent, { name: 'Private event', description: '', color: 'mint' })
    const log = await owner.mutation(api.logbook.record, { eventTypeId: event, occurredAt: Date.now(), requestId: 'private-tap' })
    await other.mutation(api.logbook.createEvent, { name: 'Other event', description: '', color: 'rose' })
    expect((await other.query(api.logbook.listEvents, {})).map(e => e.name)).toEqual(['Other event'])
    expect((await owner.query(api.logbook.listEvents, {})).map(e => e.name)).toEqual(['Private event'])
    expect((await other.query(api.logbook.history, { since: 0, paginationOpts: { numItems: 20, cursor: null } })).page).toEqual([])
    await expect(other.query(api.logbook.activity, { since: 0, eventTypeId: event })).rejects.toThrow(/Not authorized/)
    await expect(other.query(api.logbook.history, { since: 0, eventTypeId: event, paginationOpts: { numItems: 20, cursor: null } })).rejects.toThrow(/Not authorized/)
    await expect(other.mutation(api.logbook.record, { eventTypeId: event, occurredAt: Date.now(), requestId: 'attack' })).rejects.toThrow(/Not authorized/)
    await expect(other.mutation(api.logbook.updateEvent, { id: event, name: 'Hijacked', description: '', color: 'blue', archived: true })).rejects.toThrow(/Not authorized/)
    await expect(other.mutation(api.logbook.updateComment, { id: log, comment: 'Hijacked' })).rejects.toThrow(/Not authorized/)
    await expect(other.mutation(api.logbook.removeLog, { id: log })).rejects.toThrow(/Not authorized/)
    await expect(t.query(api.logbook.listEvents, {})).rejects.toThrow(/Not authorized/)
    await expect(t.mutation(api.logbook.createEvent, { name: 'No auth', description: '', color: 'blue' })).rejects.toThrow(/Not authorized/)
  })
  it('archives without losing history and rejects invalid event/log input', async () => {
    const { owner } = await fixture()
    const event = await owner.mutation(api.logbook.createEvent, { name: 'Walk', description: '', color: 'amber' })
    await owner.mutation(api.logbook.record, { eventTypeId: event, occurredAt: Date.now(), requestId: 'walk-one' })
    await owner.mutation(api.logbook.updateEvent, { id: event, name: 'Walk', description: '', color: 'amber', archived: true })
    expect((await owner.query(api.logbook.activity, { since: 0, eventTypeId: event })).entries).toHaveLength(1)
    await expect(owner.mutation(api.logbook.record, { eventTypeId: event, occurredAt: Date.now(), requestId: 'walk-two' })).rejects.toThrow(/Restore/)
    await expect(owner.mutation(api.logbook.createEvent, { name: ' WALK ', description: '', color: 'blue' })).rejects.toThrow(/already exists/)
    await expect(owner.mutation(api.logbook.createEvent, { name: '   ', description: '', color: 'blue' })).rejects.toThrow(/characters/)
  })
})
describe('account administration', () => {
  it('allows only admins to add people and keeps new accounts separate', async () => {
    const { t, owner, other, users } = await fixture()
    await expect(other.query(api.accounts.list, {})).rejects.toThrow(/Admin/)
    await expect(other.action(api.credentials.addPerson, { username: 'New_User', password: 'NewPassword123' })).rejects.toThrow(/Admin/)
    await expect(t.action(api.credentials.addPerson, { username: 'New_User', password: 'NewPassword123' })).rejects.toThrow(/Admin/)
    await owner.action(api.credentials.addPerson, { username: 'New_User', password: 'NewPassword123' })
    const people = await owner.query(api.accounts.list, {})
    const added = people.find(p => p.username === 'New_User')!
    expect(added.role).toBe('member')
    expect(added.id).not.toEqual(users.admin)
    await expect(owner.action(api.credentials.addPerson, { username: 'new_USER', password: 'AnotherPassword' })).rejects.toThrow(/already taken/)
    await expect(t.action(api.auth.signIn, { provider: 'password', params: { flow: 'signUp', username: 'Self_Admin', password: 'SelfPassword123' } })).rejects.toThrow(/administrator/)
  })
  it('requires the current password, renames atomically, and revokes sessions on password change', async () => {
    const { t, owner, users } = await fixture()
    await expect(owner.action(api.credentials.changeUsername, { username: 'Renamed', currentPassword: 'wrong' })).rejects.toThrow()
    await expect(owner.action(api.credentials.changePassword, { currentPassword: 'wrong', newPassword: 'NewPassword123' })).rejects.toThrow()
    await expect(owner.action(api.credentials.changeUsername, { username: 'OTHER_MEMBER', currentPassword: 'TestPassword123' })).rejects.toThrow(/already taken/)
    await owner.action(api.credentials.changeUsername, { username: 'Renamed', currentPassword: 'TestPassword123' })
    expect((await owner.query(api.accounts.me, {}))?.username).toBe('Renamed')
    expect((await t.run(ctx => ctx.db.get(users.account)))?.providerAccountId).toBe('renamed')
    await owner.action(api.credentials.changePassword, { currentPassword: 'TestPassword123', newPassword: 'NewPassword123' })
    const updated = await t.run(ctx => ctx.db.get(users.account))
    expect(await new Scrypt().verify(updated!.secret!, 'NewPassword123')).toBe(true)
    expect(await new Scrypt().verify(updated!.secret!, 'TestPassword123')).toBe(false)
    expect(await t.run(ctx => ctx.db.get(users.session))).toBeNull()
  })
  it('internal account edits refuse account IDs belonging to someone else', async () => {
    const { owner, users } = await fixture()
    await expect(owner.mutation(internal.accounts.rename, { username: 'Attack', verifiedAccountId: users.otherAccount })).rejects.toThrow(/Not authorized/)
    await expect(owner.mutation(internal.accounts.changeSecret, { verifiedAccountId: users.otherAccount, hash: 'attack' })).rejects.toThrow(/Not authorized/)
  })
})


describe('optional log location', () => {
  it('keeps existing entries location-free and saves validated coordinates only for their owner', async () => {
    const { t, owner, other } = await fixture()
    const event = await owner.mutation(api.logbook.createEvent, { name: 'Location test', description: '', color: 'blue' })
    const id = await owner.mutation(api.logbook.record, { eventTypeId: event, occurredAt: Date.now(), requestId: 'location-tap' })
    expect((await t.run(ctx => ctx.db.get(id)))?.location).toBeUndefined()
    const location = { latitude: 40, longitude: -80, accuracy: 15, capturedAt: Date.now() }
    await expect(other.mutation(api.logbook.saveLocation, { id, location })).rejects.toThrow(/Not authorized/)
    await expect(t.mutation(api.logbook.saveLocation, { id, location })).rejects.toThrow(/Not authorized/)
    await expect(owner.mutation(api.logbook.saveLocation, { id, location: { ...location, latitude: 91 } })).rejects.toThrow(/invalid/)
    await expect(owner.mutation(api.logbook.saveLocation, { id, location: { ...location, accuracy: -1 } })).rejects.toThrow(/invalid/)
    await owner.mutation(api.logbook.saveLocation, { id, location })
    expect((await owner.query(api.logbook.activity, { since: 0 })).entries[0].location).toEqual(location)
    expect((await other.query(api.logbook.activity, { since: 0 })).entries).toEqual([])
  })
})

describe('event-specific location preference', () => {
  it('defaults off, persists opt-in per event, and preserves it through archiving', async () => {
    const { owner, other } = await fixture()
    const plain = await owner.mutation(api.logbook.createEvent, { name: 'No location', description: '', color: 'blue' })
    const tracked = await owner.mutation(api.logbook.createEvent, { name: 'With location', description: '', color: 'mint', trackLocation: true })
    let events = await owner.query(api.logbook.listEvents, {})
    expect(events.find(e => e._id === plain)?.trackLocation).toBe(false)
    expect(events.find(e => e._id === tracked)?.trackLocation).toBe(true)
    await owner.mutation(api.logbook.updateEvent, { id: tracked, name: 'With location', description: '', color: 'mint', archived: true })
    events = await owner.query(api.logbook.listEvents, {})
    expect(events.find(e => e._id === tracked)).toMatchObject({ trackLocation: true, archived: true })
    await expect(other.mutation(api.logbook.updateEvent, { id: tracked, name: 'With location', description: '', color: 'mint', archived: false, trackLocation: false })).rejects.toThrow(/Not authorized/)
    await owner.mutation(api.logbook.updateEvent, { id: tracked, name: 'With location', description: '', color: 'mint', archived: false, trackLocation: false })
    expect((await owner.query(api.logbook.listEvents, {})).find(e => e._id === tracked)?.trackLocation).toBe(false)
  })
})
