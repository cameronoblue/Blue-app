import { Link } from 'react-router'
import { useConvexAuth } from 'convex/react'
import { ArrowLeft, ArrowUpRight, CircleDot, Gamepad2, Timer, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function GamesPage() {
  const { isAuthenticated } = useConvexAuth()
  return <div className="space-y-8">
    <div><Link to={isAuthenticated ? '/apps' : '/public-apps'} className="mb-5 inline-flex min-h-9 items-center gap-2 text-xs text-muted-foreground"><ArrowLeft size={14} />{isAuthenticated ? 'Dashboard' : 'Public apps'}</Link><p className="eyebrow">THE BLUE ARCADE</p><h1 className="page-title">Games<span className="text-blue-600">.</span></h1><p className="page-subtitle">Take a break. Chase a streak. Find your next favorite game.</p></div>
    <section aria-label="Games" className="grid items-start gap-5 md:grid-cols-2">
      <article className="panel overflow-hidden"><div className="relative grid h-52 place-items-center overflow-hidden bg-[#101d30]"><div className="absolute size-64 rounded-full border border-orange-300/10" /><div className="absolute size-40 rounded-full border border-orange-300/15" /><CircleDot className="relative size-24 -rotate-12 text-orange-400" strokeWidth={1.1} /><span className="absolute right-4 bottom-4 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] text-orange-200">ONE MORE SHOT</span></div><div className="p-6"><h2 className="text-xl font-semibold tracking-tight">Flick Basketball</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Flick the ball, chase a moving hoop, and keep your streak alive. Earn extra time and bigger buckets as the challenge heats up.</p><div className="mt-5 flex flex-wrap gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><Timer size={14} />60-second start</span><span className="flex items-center gap-1.5"><Flame size={14} />Streak multipliers</span></div><Button className="mt-6 h-12 w-full gap-2 bg-orange-400 text-[#172036] hover:bg-orange-300" render={<Link to="/basketball" />}>Play basketball<ArrowUpRight size={17} /></Button></div></article>
      <div className="rounded-2xl border border-dashed p-7"><Gamepad2 size={24} className="mb-4 text-blue-500" /><h2 className="font-semibold">More games to come.</h2><p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">This is your home for games on Blue. New games will join the arcade here.</p></div>
    </section>
  </div>
}
