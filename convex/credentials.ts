import { v, ConvexError } from 'convex/values'
import { Scrypt } from 'lucia'
import { createAccount, retrieveAccount, invalidateSessions } from '@convex-dev/auth/server'
import { action, internalAction, env } from './_generated/server'
import { api, internal } from './_generated/api'
import { usernameParts, checkPassword } from './lib/access'

export const addPerson = action({ args: { username: v.string(), password: v.string() }, returns: v.null(), handler: async (ctx, args) => {
  const caller = await ctx.runQuery(api.accounts.me, {})
  if (caller?.role !== 'admin') throw new ConvexError('Not authorized. Admin access required.')
  const parts = usernameParts(args.username)
  checkPassword(args.password)
  if (!await ctx.runQuery(internal.accounts.available, { username: parts.username })) throw new ConvexError('That username is already taken.')
  await createAccount(ctx, { provider: 'password', account: { id: parts.usernameKey, secret: args.password }, profile: { ...parts, role: 'member' }, shouldLinkViaEmail: false, shouldLinkViaPhone: false })
  return null
} })
export const changeUsername = action({ args: { username: v.string(), currentPassword: v.string() }, returns: v.null(), handler: async (ctx, args) => {
  const caller = await ctx.runQuery(api.accounts.me, {})
  if (!caller) throw new ConvexError('Not authorized.')
  const verified = await retrieveAccount(ctx, { provider: 'password', account: { id: caller.username.toLowerCase(), secret: args.currentPassword } })
  if (verified.user._id !== caller.id) throw new ConvexError('Not authorized.')
  await ctx.runMutation(internal.accounts.rename, { username: args.username, verifiedAccountId: verified.account._id })
  return null
} })
export const changePassword = action({ args: { currentPassword: v.string(), newPassword: v.string() }, returns: v.null(), handler: async (ctx, args) => {
  const caller = await ctx.runQuery(api.accounts.me, {})
  if (!caller) throw new ConvexError('Not authorized.')
  checkPassword(args.newPassword)
  const id = caller.username.toLowerCase()
  const verified = await retrieveAccount(ctx, { provider: 'password', account: { id, secret: args.currentPassword } })
  if (verified.user._id !== caller.id) throw new ConvexError('Not authorized.')
  const hash = await new Scrypt().hash(args.newPassword)
  await ctx.runMutation(internal.accounts.changeSecret, { verifiedAccountId: verified.account._id, hash })
  await invalidateSessions(ctx, { userId: caller.id })
  return null
} })
// Operator-only, one-time bootstrap. No password is stored in application source.
export const bootstrap = internalAction({ args: {}, returns: v.null(), handler: async ctx => {
  if (await ctx.runQuery(internal.accounts.adminExists, {})) throw new ConvexError('An administrator already exists. Bootstrap is disabled.')
  const username = env.BOOTSTRAP_USERNAME
  const password = env.BOOTSTRAP_PASSWORD
  if (!username || !password) throw new ConvexError('Missing one-time bootstrap credentials.')
  const parts = usernameParts(username)
  checkPassword(password)
  if (!await ctx.runQuery(internal.accounts.available, { username })) throw new ConvexError('Username already exists; bootstrap will not alter an existing account.')
  await createAccount(ctx, { provider: 'password', account: { id: parts.usernameKey, secret: password }, profile: { ...parts, role: 'admin' }, shouldLinkViaEmail: false, shouldLinkViaPhone: false })
  return null
} })
