import { v, ConvexError } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { query, internalMutation, internalQuery } from './_generated/server'
import { requireUser, requireAdmin, usernameParts } from './lib/access'

export const member = v.object({ id: v.id('users'), username: v.string(), role: v.union(v.literal('admin'), v.literal('member')) })
export const me = query({ args: {}, returns: v.union(member, v.null()), handler: async (ctx) => {
  const id = await getAuthUserId(ctx)
  const user = id ? await ctx.db.get(id) : null
  return user?.username && user.role ? { id: user._id, username: user.username, role: user.role } : null
} })
export const list = query({ args: {}, returns: v.array(member), handler: async (ctx) => {
  await requireAdmin(ctx)
  const admins = await ctx.db.query('users').withIndex('by_role', q => q.eq('role', 'admin')).take(100)
  const members = await ctx.db.query('users').withIndex('by_role', q => q.eq('role', 'member')).take(100)
  return [...admins, ...members].map(u => ({ id: u._id, username: u.username!, role: u.role! }))
} })
export const adminExists = internalQuery({ args: {}, returns: v.boolean(), handler: async ctx =>
  (await ctx.db.query('users').withIndex('by_role', q => q.eq('role', 'admin')).first()) !== null,
})
export const available = internalQuery({ args: { username: v.string() }, returns: v.boolean(), handler: async (ctx, args) => {
  const { usernameKey } = usernameParts(args.username)
  return (await ctx.db.query('authAccounts').withIndex('providerAndAccountId', q => q.eq('provider', 'password').eq('providerAccountId', usernameKey)).unique()) === null
} })
export const rename = internalMutation({ args: { username: v.string(), verifiedAccountId: v.id('authAccounts') }, returns: v.null(), handler: async (ctx, args) => {
  const user = await requireUser(ctx)
  const parts = usernameParts(args.username)
  const account = await ctx.db.get(args.verifiedAccountId)
  if (!account || account.userId !== user._id || account.provider !== 'password') throw new ConvexError('Not authorized.')
  const existing = await ctx.db.query('authAccounts').withIndex('providerAndAccountId', q => q.eq('provider', 'password').eq('providerAccountId', parts.usernameKey)).unique()
  if (existing && existing._id !== account._id) throw new ConvexError('That username is already taken.')
  await ctx.db.patch(account._id, { providerAccountId: parts.usernameKey })
  await ctx.db.patch(user._id, parts)
  return null
} })
export const changeSecret = internalMutation({ args: { verifiedAccountId: v.id('authAccounts'), hash: v.string() }, returns: v.null(), handler: async (ctx, args) => {
  const user = await requireUser(ctx)
  const account = await ctx.db.get(args.verifiedAccountId)
  if (!account || account.userId !== user._id || account.provider !== 'password') throw new ConvexError('Not authorized.')
  await ctx.db.patch(account._id, { secret: args.hash })
  return null
} })
