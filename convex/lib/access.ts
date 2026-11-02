import { ConvexError } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { QueryCtx, MutationCtx } from '../_generated/server'

export function usernameParts(value: string) {
  const username = value.trim()
  if (!/^[A-Za-z0-9_]{3,32}$/.test(username)) throw new ConvexError('Use 3–32 letters, numbers, or underscores for your username.')
  return { username, usernameKey: username.toLowerCase() }
}
export function checkPassword(password: string) {
  if (password.length < 8 || password.length > 128) throw new ConvexError('Passwords must have 8–128 characters.')
}
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const id = await getAuthUserId(ctx)
  const user = id ? await ctx.db.get(id) : null
  if (!user?.username || !user.role) throw new ConvexError('Not authorized. Please sign in.')
  return user
}
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireUser(ctx)
  if (user.role !== 'admin') throw new ConvexError('Not authorized. Admin access required.')
  return user
}
