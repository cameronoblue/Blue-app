import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import { v, ConvexError } from 'convex/values'
import { query, mutation } from './_generated/server'
import { requireUser } from './lib/access'
import schema, { eventColor, logLocation } from './schema'
import type { MutationCtx, QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'

async function ownedEvent(ctx: QueryCtx | MutationCtx, id: Id<'eventTypes'>) {
  const user = await requireUser(ctx)
  const event = await ctx.db.get(id)
  if (!event || event.ownerId !== user._id) throw new ConvexError('Not authorized to access this event.')
  return { user, event }
}
function text(value: string, max: number, required = false) {
  const clean = value.trim()
  if ((required && !clean) || clean.length > max) throw new ConvexError(`Enter ${required ? '1' : '0'}–${max} characters.`)
  return clean
}
export const listEvents = query({ args: {}, returns: v.array(schema.doc('eventTypes')), handler: async ctx => {
  const user = await requireUser(ctx)
  return await ctx.db.query('eventTypes').withIndex('by_ownerId', q => q.eq('ownerId', user._id)).take(200)
} })
export const createEvent = mutation({ args: { name: v.string(), description: v.string(), color: eventColor, trackLocation: v.optional(v.boolean()) }, returns: v.id('eventTypes'), handler: async (ctx, args) => {
  const user = await requireUser(ctx)
  const events = await ctx.db.query('eventTypes').withIndex('by_ownerId', q => q.eq('ownerId', user._id)).take(200)
  if (events.length >= 200) throw new ConvexError('Your library is full (200 events).')
  const name = text(args.name, 60, true)
  if (events.some(e => e.name.toLowerCase() === name.toLowerCase())) throw new ConvexError('An event with that name already exists.')
  return await ctx.db.insert('eventTypes', { ownerId: user._id, name, description: text(args.description, 240), color: args.color, trackLocation: args.trackLocation ?? false, archived: false, totalCount: 0 })
} })
export const updateEvent = mutation({ args: { id: v.id('eventTypes'), name: v.string(), description: v.string(), color: eventColor, archived: v.boolean(), trackLocation: v.optional(v.boolean()) }, returns: v.null(), handler: async (ctx, args) => {
  const { user } = await ownedEvent(ctx, args.id)
  const name = text(args.name, 60, true)
  const events = await ctx.db.query('eventTypes').withIndex('by_ownerId', q => q.eq('ownerId', user._id)).take(200)
  if (events.some(e => e._id !== args.id && e.name.toLowerCase() === name.toLowerCase())) throw new ConvexError('An event with that name already exists.')
  await ctx.db.patch(args.id, { name, description: text(args.description, 240), color: args.color, archived: args.archived, ...(args.trackLocation !== undefined ? { trackLocation: args.trackLocation } : {}) })
  return null
} })
export const record = mutation({ args: { eventTypeId: v.id('eventTypes'), occurredAt: v.number(), requestId: v.string() }, returns: v.id('logs'), handler: async (ctx, args) => {
  const { user, event } = await ownedEvent(ctx, args.eventTypeId)
  const requestId = text(args.requestId, 100, true)
  const previous = await ctx.db.query('logs').withIndex('by_ownerId_and_requestId', q => q.eq('ownerId', user._id).eq('requestId', requestId)).unique()
  if (previous) {
    if (previous.eventTypeId !== event._id) throw new ConvexError('This request belongs to a different event.')
    return previous._id
  }
  if (event.archived) throw new ConvexError('Restore this event before logging it.')
  if (!Number.isFinite(args.occurredAt) || args.occurredAt < Date.now() - 86400000 || args.occurredAt > Date.now() + 60000) throw new ConvexError('The captured time is invalid. Tap the event again.')
  const id = await ctx.db.insert('logs', { ...args, requestId, ownerId: user._id, comment: '' })
  await ctx.db.patch(event._id, { totalCount: event.totalCount + 1, lastLoggedAt: Math.max(event.lastLoggedAt ?? 0, args.occurredAt) })
  return id
} })
export const updateComment = mutation({ args: { id: v.id('logs'), comment: v.string() }, returns: v.null(), handler: async (ctx, args) => {
  const user = await requireUser(ctx)
  const log = await ctx.db.get(args.id)
  if (!log || log.ownerId !== user._id) throw new ConvexError('Not authorized to edit this entry.')
  await ctx.db.patch(log._id, { comment: text(args.comment, 2000) })
  return null
} })
export const saveLocation = mutation({ args: { id: v.id('logs'), location: logLocation }, returns: v.null(), handler: async (ctx, args) => {
  const user = await requireUser(ctx)
  const log = await ctx.db.get(args.id)
  if (!log || log.ownerId !== user._id) throw new ConvexError('Not authorized to edit this entry.')
  const { latitude, longitude, accuracy, capturedAt } = args.location
  if (![latitude, longitude, accuracy, capturedAt].every(Number.isFinite) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy < 0 || capturedAt < log.occurredAt - 300000 || capturedAt > Date.now() + 60000) throw new ConvexError('The captured location is invalid.')
  await ctx.db.patch(log._id, { location: args.location })
  return null
} })
export const removeLog = mutation({ args: { id: v.id('logs') }, returns: v.null(), handler: async (ctx, args) => {
  const user = await requireUser(ctx)
  const log = await ctx.db.get(args.id)
  if (!log || log.ownerId !== user._id) throw new ConvexError('Not authorized to delete this entry.')
  const { event } = await ownedEvent(ctx, log.eventTypeId)
  await ctx.db.delete(log._id)
  const latest = await ctx.db.query('logs').withIndex('by_ownerId_and_eventTypeId_and_occurredAt', q => q.eq('ownerId', user._id).eq('eventTypeId', event._id)).order('desc').first()
  await ctx.db.patch(event._id, { totalCount: Math.max(0, event.totalCount - 1), lastLoggedAt: latest?.occurredAt })
  return null
} })
const scope = { eventTypeId: v.optional(v.id('eventTypes')), since: v.number() }
export const removeEvent = mutation({ args: { id: v.id('eventTypes') }, returns: v.null(), handler: async (ctx, args) => {
  const { user, event } = await ownedEvent(ctx, args.id)
  const log = await ctx.db.query('logs').withIndex('by_ownerId_and_eventTypeId_and_occurredAt', q => q.eq('ownerId', user._id).eq('eventTypeId', event._id)).first()
  if (log || event.totalCount !== 0) throw new ConvexError('Only empty events can be deleted. Archive this event to preserve its history.')
  await ctx.db.delete(event._id)
  return null
} })
export const history = query({ args: { ...scope, paginationOpts: paginationOptsValidator }, returns: paginationResultValidator(schema.doc('logs')), handler: async (ctx, args) => {
  const user = await requireUser(ctx)
  if (args.eventTypeId) {
    await ownedEvent(ctx, args.eventTypeId)
    return await ctx.db.query('logs').withIndex('by_ownerId_and_eventTypeId_and_occurredAt', q => q.eq('ownerId', user._id).eq('eventTypeId', args.eventTypeId!).gte('occurredAt', args.since)).order('desc').paginate(args.paginationOpts)
  }
  return await ctx.db.query('logs').withIndex('by_ownerId_and_occurredAt', q => q.eq('ownerId', user._id).gte('occurredAt', args.since)).order('desc').paginate(args.paginationOpts)
} })
// Bounded chart series. UI explicitly labels the scope when more than 1,000 match.
export const activity = query({ args: scope, returns: v.object({ entries: v.array(schema.doc('logs')), truncated: v.boolean() }), handler: async (ctx, args) => {
  const user = await requireUser(ctx)
  if (args.eventTypeId) await ownedEvent(ctx, args.eventTypeId)
  const entries = args.eventTypeId
    ? await ctx.db.query('logs').withIndex('by_ownerId_and_eventTypeId_and_occurredAt', q => q.eq('ownerId', user._id).eq('eventTypeId', args.eventTypeId!).gte('occurredAt', args.since)).order('desc').take(1001)
    : await ctx.db.query('logs').withIndex('by_ownerId_and_occurredAt', q => q.eq('ownerId', user._id).gte('occurredAt', args.since)).order('desc').take(1001)
  return { entries: entries.slice(0, 1000), truncated: entries.length > 1000 }
} })
