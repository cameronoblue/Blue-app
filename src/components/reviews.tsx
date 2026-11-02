import { useRef, useState } from 'react'
import { useMutation, usePaginatedQuery } from 'convex/react'
import { Check, MessageSquare, Star, Send, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { api, type Id } from '@/lib/backend'
import { message } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

function Stars({ rating }: { rating: number }) {
  return <span className="flex gap-1 text-[#315dd0]" aria-label={`${rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map(star => <Star key={star} size={14} fill={star <= rating ? 'currentColor' : 'none'} aria-hidden="true" className={star <= rating ? '' : 'opacity-25'} />)}</span>
}
export function PublicReviews() {
  const { results, status, loadMore } = usePaginatedQuery(api.reviews.list, {}, { initialNumItems: 6 })
  return <section id="reviews" className="public-section scroll-mt-8">
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="public-kicker">THE PEOPLE HAVE THE MIC</p><h2>Your turn to weigh in.</h2></div><p className="max-w-64 text-sm leading-relaxed text-muted-foreground">Got a good word for Cameron?<br />Leave a review. No account needed.</p></div>
    <div className="mt-9 grid items-start gap-6 lg:grid-cols-[.9fr_1.1fr]">
      <ReviewForm />
      <div className="space-y-4" aria-live="polite">
        {status === 'LoadingFirstPage' ? <p className="p-6 text-sm text-muted-foreground" role="status">Loading reviews…</p> : results.length === 0 ? <div className="rounded-2xl border border-dashed border-[#dfe4dc] p-8 text-center"><MessageSquare className="mx-auto mb-4 text-[#315dd0]" size={27} /><h3 className="font-semibold">The first word is yours.</h3><p className="mt-2 text-sm text-muted-foreground">No reviews yet. Start the conversation.</p></div> : results.map(review => <Card key={review.id} className="gap-0 rounded-2xl border-[#e1e5df] bg-white p-5 text-[#18243a] shadow-none"><div className="flex flex-wrap items-center justify-between gap-3"><Stars rating={review.rating} /><span className="text-[10px] text-[#667085]">{new Date(review.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span></div><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7">{review.comment}</p><div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#e1e5df] pt-4"><span className="break-all text-xs font-semibold">{review.displayName}</span><span className="text-[10px] text-[#667085]">· Guest review</span></div></Card>)}
        {status !== 'Exhausted' && status !== 'LoadingFirstPage' && <Button variant="outline" className="h-11 w-full rounded-xl" disabled={status === 'LoadingMore'} onClick={() => loadMore(6)}>{status === 'LoadingMore' ? 'Loading…' : 'More reviews'}</Button>}
      </div>
    </div>
  </section>
}
function ReviewForm() {
  const submit = useMutation(api.reviews.submit)
  const [rating, setRating] = useState(0)
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  // Keep an idempotency key across retries. This is interaction state, not query data.
  const requestId = useRef<string | null>(null)
  const browserKey = useRef<string | null>(null)
  if (sent) return <Card className="items-center gap-3 rounded-2xl border-[#dce4d6] bg-[#eef3e7] p-8 text-center text-[#18243a]"><span className="grid size-12 place-items-center rounded-full bg-white text-[#315dd0]"><Check size={24} /></span><h3 className="text-lg font-semibold">You made the page a little cooler.</h3><p className="text-sm leading-relaxed text-[#667085]">Thanks for leaving a review! Your words are now part of Cameron’s corner of the internet.</p></Card>
  return <Card className="gap-0 rounded-2xl border-[#e1e5df] bg-white p-6 text-[#18243a] shadow-none"><h3 className="text-lg font-semibold">Leave a review</h3><p className="mt-2 text-xs leading-relaxed text-[#667085]">Your display name, stars, and comment will be public. Guest names are not verified.</p><form className="mt-6 space-y-5" onSubmit={async event => {
    event.preventDefault()
    if (pending) return
    if (!rating) { setError('Choose a star rating first.'); return }
    const form = new FormData(event.currentTarget)
    setPending(true); setError('')
    try {
      if (!browserKey.current) {
        try { browserKey.current = localStorage.getItem('blue-review-browser') } catch { /* Storage may be unavailable. */ }
        if (!browserKey.current || !/^[0-9a-f-]{36}$/i.test(browserKey.current)) browserKey.current = crypto.randomUUID()
        try { localStorage.setItem('blue-review-browser', browserKey.current) } catch { /* Keep it in memory for this visit. */ }
      }
      requestId.current ??= crypto.randomUUID()
      await submit({ displayName: String(form.get('displayName')), rating: rating as 1 | 2 | 3 | 4 | 5, comment: String(form.get('comment')), website: String(form.get('website') ?? ''), browserKey: browserKey.current, requestId: requestId.current })
      setSent(true)
    } catch (cause) { setError(message(cause)) } finally { setPending(false) }
  }}>
    <fieldset disabled={pending}><legend className="mb-2 text-sm font-medium">Your rating</legend><div className="flex gap-1" role="group" aria-label="Star rating">{[1, 2, 3, 4, 5].map(value => <Button key={value} type="button" variant="ghost" className="size-11 text-[#315dd0] hover:bg-[#eaf0ff]" aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`} aria-pressed={value === rating} onClick={() => setRating(value)}><Star className="size-6!" fill={value <= rating ? 'currentColor' : 'none'} /></Button>)}</div><p className="mt-1 text-[11px] text-[#667085]">{rating ? `${rating} out of 5 stars` : 'Pick 1 to 5 stars'}</p></fieldset>
    <div className="space-y-2"><Label htmlFor="review-name">Display name <span className="font-normal text-[#667085]">(optional)</span></Label><Input id="review-name" name="displayName" className="h-11 border-[#d2d9e2] bg-white text-[#18243a]" placeholder="Your name, or leave it anonymous" maxLength={50} autoComplete="nickname" disabled={pending} /></div>
    <div className="space-y-2"><Label htmlFor="review-comment">Your review</Label><Textarea id="review-comment" name="comment" className="min-h-28 border-[#d2d9e2] bg-white text-[#18243a]" placeholder="What’s your take on Cameron?" minLength={10} maxLength={1000} required disabled={pending} /><p className="text-[11px] text-[#667085]">10–1,000 characters. Keep it kind and skip private information.</p></div>
    <div hidden aria-hidden="true"><Label htmlFor="review-website">Website</Label><Input id="review-website" name="website" tabIndex={-1} autoComplete="off" /></div>
    {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
    <Button type="submit" className="h-12 w-full rounded-full bg-[#315dd0] text-white hover:bg-[#2449ab]" disabled={pending}>{pending ? 'Sharing…' : 'Post review'}<Send size={15} /></Button><p className="text-center text-[10px] text-[#667085]">No sign-up. Just your two cents.</p>
  </form></Card>
}
export function ReviewModeration() {
  const [hidden, setHidden] = useState(false)
  const { results, status, loadMore } = usePaginatedQuery(api.reviews.adminList, { hidden }, { initialNumItems: 10 })
  const setHiddenAction = useMutation(api.reviews.setHidden)
  const [pending, setPending] = useState<Id<'reviews'> | null>(null)
  return <section className="panel p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="section-title">Guest reviews</h2><p className="mt-2 text-xs text-muted-foreground">Hide unwanted reviews from the homepage or restore them later.</p></div><Button variant="outline" className="h-11" onClick={() => setHidden(!hidden)}>{hidden ? 'Show public reviews' : 'Show hidden reviews'}</Button></div><p className="mt-5 text-[11px] font-medium text-muted-foreground">{hidden ? 'HIDDEN' : 'PUBLIC'}</p><div className="mt-2 divide-y">{results.map(review => <article key={review.id} className="space-y-3 py-5"><div className="flex flex-wrap items-center justify-between gap-3"><span className="break-all text-sm font-semibold">{review.displayName}</span><Stars rating={review.rating} /></div><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{review.comment}</p><Button variant="outline" className="h-11" disabled={pending !== null} onClick={async () => { setPending(review.id); try { await setHiddenAction({ id: review.id, hidden: !hidden }); toast.success(hidden ? 'Review restored' : 'Review hidden') } catch (error) { toast.error(message(error)) } finally { setPending(null) } }}>{hidden ? <Eye size={15} /> : <EyeOff size={15} />}{pending === review.id ? 'Saving…' : hidden ? 'Restore review' : 'Hide review'}</Button></article>)}</div>{results.length === 0 && <p className="py-6 text-sm text-muted-foreground">{status === 'LoadingFirstPage' ? 'Loading reviews…' : hidden ? 'No hidden reviews.' : 'No public reviews yet.'}</p>}{status !== 'Exhausted' && status !== 'LoadingFirstPage' && <Button variant="outline" className="h-11 w-full" disabled={status === 'LoadingMore'} onClick={() => loadMore(10)}>Load more reviews</Button>}</section>
}
