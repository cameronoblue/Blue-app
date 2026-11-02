import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import { ConvexError, v } from 'convex/values'
import { RateLimiter, HOUR, MINUTE, DAY } from '@convex-dev/rate-limiter'
import { components } from './_generated/api'
import { query, mutation } from './_generated/server'
import { requireAdmin } from './lib/access'
import type { Doc } from './_generated/dataModel'

const rating = v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4), v.literal(5))
const visibleReview = v.object({ id: v.id('reviews'), displayName: v.string(), rating, comment: v.string(), createdAt: v.number() })
const limiter = new RateLimiter(components.rateLimiter, {
  guestReviewBrowser: { kind: 'token bucket', rate: 1, period: HOUR, capacity: 1 },
  guestReviewMinute: { kind: 'token bucket', rate: 10, period: MINUTE, capacity: 10 },
  guestReviewDay: { kind: 'token bucket', rate: 100, period: DAY, capacity: 100 },
})
function present(review: Doc<'reviews'>) {
  return { id: review._id, displayName: review.displayName, rating: review.rating as 1 | 2 | 3 | 4 | 5, comment: review.comment, createdAt: review._creationTime }
}
function checkPage(size: number) {
  if (size < 1 || size > 50) throw new ConvexError('Choose a page size from 1 to 50.')
}
export const list = query({ args: { paginationOpts: paginationOptsValidator }, returns: paginationResultValidator(visibleReview), handler: async (ctx, args) => {
  checkPage(args.paginationOpts.numItems)
  const result = await ctx.db.query('reviews').withIndex('by_hidden', q => q.eq('hidden', false)).order('desc').paginate(args.paginationOpts)
  return { ...result, page: result.page.map(present) }
} })
export const submit = mutation({ args: {
  displayName: v.string(), rating, comment: v.string(), browserKey: v.string(), requestId: v.string(), website: v.string(),
}, returns: v.null(), handler: async (ctx, args) => {
  // Honeypot: ignored without creating a review. No guest account is created.
  if (args.website) return null
  const displayName = args.displayName.trim() || 'Anonymous'
  const comment = args.comment.trim()
  if (displayName.length > 50 || comment.length < 10 || comment.length > 1000) throw new ConvexError('Use a name up to 50 characters and a review from 10 to 1,000 characters.')
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuid.test(args.browserKey) || !uuid.test(args.requestId)) throw new ConvexError('Please reload the page and try again.')
  const previous = await ctx.db.query('reviews').withIndex('by_requestId', q => q.eq('requestId', args.requestId)).unique()
  if (previous) return null
  const perBrowser = await limiter.limit(ctx, 'guestReviewBrowser', { key: args.browserKey })
  if (!perBrowser.ok) throw new ConvexError('Thanks for sharing! Please wait an hour before leaving another review from this browser.')
  const perMinute = await limiter.limit(ctx, 'guestReviewMinute')
  const perDay = await limiter.limit(ctx, 'guestReviewDay')
  if (!perMinute.ok || !perDay.ok) throw new ConvexError('Reviews are busy right now. Please try again later.')
  await ctx.db.insert('reviews', { displayName, rating: args.rating, comment, hidden: false, requestId: args.requestId })
  return null
} })
export const adminList = query({ args: { hidden: v.boolean(), paginationOpts: paginationOptsValidator }, returns: paginationResultValidator(visibleReview), handler: async (ctx, args) => {
  await requireAdmin(ctx)
  checkPage(args.paginationOpts.numItems)
  const result = await ctx.db.query('reviews').withIndex('by_hidden', q => q.eq('hidden', args.hidden)).order('desc').paginate(args.paginationOpts)
  return { ...result, page: result.page.map(present) }
} })
export const setHidden = mutation({ args: { id: v.id('reviews'), hidden: v.boolean() }, returns: v.null(), handler: async (ctx, args) => {
  await requireAdmin(ctx)
  if (!await ctx.db.get(args.id)) throw new ConvexError('This review no longer exists.')
  await ctx.db.patch(args.id, { hidden: args.hidden })
  return null
} })
