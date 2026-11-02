import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useConvexAuth } from 'convex/react'
import { ArrowLeft, ArrowUpRight, Flame, Pause, Play, RotateCcw, Timer, Trophy, Maximize2, Minimize2, CircleDot, Check, LoaderCircle } from 'lucide-react'
import { api } from '@/lib/backend'
import { message } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useBasketball, type RunResult } from '@/games/basketball/use-game'

export function BasketballPage() {
  const { isAuthenticated } = useConvexAuth()
  const stats = useQuery(api.basketball.stats, isAuthenticated ? {} : 'skip')
  const save = useMutation(api.basketball.saveRun)
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved' | 'error' | 'guest'>('idle')
  const [saveError, setSaveError] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [lastResult, setLastResult] = useState<RunResult | null>(null)
  const saveResult = useCallback(async (result: RunResult) => {
    if (!isAuthenticated) { setSaved('guest'); return }
    setLastResult(result); setSaved('saving'); setSaveError('')
    try { await save(result); setSaved('saved') } catch (error) { setSaved('error'); setSaveError(message(error)) }
  }, [save, isAuthenticated])
  const finished = useCallback((result: RunResult) => { void saveResult(result) }, [saveResult])
  const { canvas, hud, start: startGame, pause, resume, end, haptics, setHaptics, canVibrate, pointerDown, pointerMove, pointerUp, cancel, keyDown } = useBasketball(finished)
  const start = () => { setSaved('idle'); setLastResult(null); startGame() }
  return <div className={`basketball-page ${expanded ? 'basketball-expanded' : ''}`}>
    <div className="basketball-heading"><div><Link to="/public-apps" className="mb-3 inline-flex min-h-8 items-center gap-2 text-xs text-muted-foreground"><ArrowLeft size={14} />Public apps</Link><p className="eyebrow">ONE MORE SHOT</p><h1 className="page-title">Flick Basketball<span className="text-orange-500">.</span></h1></div><Button variant="outline" size="icon" className="size-11 shrink-0" aria-label={expanded ? 'Exit focus mode' : 'Focus mode'} aria-pressed={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</Button></div>
    <div className="basketball-content">
      <section className="basketball-machine" aria-label="Basketball game">
        <div className="basketball-scoreboard"><div><span>SCORE</span><strong data-testid="basketball-score">{hud.score}</strong></div><div className={hud.remaining <= 10 ? 'text-orange-300' : ''}><span><Timer size={12} />TIME</span><strong data-testid="basketball-timer">{Math.ceil(hud.remaining)}<small>s</small></strong></div><div className={hud.streak >= 3 ? 'text-orange-300' : ''}><span><Flame size={12} />STREAK</span><strong data-testid="basketball-streak">{hud.streak}<small> · {hud.multiplier}×</small></strong></div></div>
        <div className="basketball-bonus"><span>Next +10 seconds</span><span>{hud.score} / {hud.nextBonus} pts</span><div className="basketball-progress"><div style={{ width: `${Math.min(100, hud.score / hud.nextBonus * 100)}%` }} /></div></div>
        <div className="basketball-court">
          <canvas ref={canvas} width={390} height={540} tabIndex={0} aria-label="Basketball court. Flick upward from the ball. Keyboard: left and right aim, up and down change power, Space shoots, Escape pauses." onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={cancel} onLostPointerCapture={cancel} onKeyDown={keyDown} />
          {hud.status !== 'playing' && <div className="basketball-overlay"><div className="basketball-overlay-card">
            {hud.status === 'ready' ? <><span className="basketball-overlay-icon"><CircleDot size={30} /></span><p className="basketball-kicker">WELCOME TO BLUE COURT</p><h2>Find your flick.</h2><p>60 seconds. A moving hoop.<br />How long can you keep the streak alive?</p><Button className="basketball-primary h-12 w-full rounded-xl bg-orange-400 text-[#172036] hover:bg-orange-300" onClick={start}><Play size={17} fill="currentColor" />Let’s play</Button><span className="basketball-overlay-hint">Flick upward from the ball to shoot.</span></> : hud.status === 'paused' ? <><span className="basketball-overlay-icon"><Pause size={27} /></span><h2>Take a breather.</h2><p>Your clock is paused.<br />Pick up right where you left off.</p><Button className="basketball-primary h-12 w-full rounded-xl bg-orange-400 text-[#172036] hover:bg-orange-300" onClick={resume}><Play size={17} />Resume game</Button><Button variant="ghost" className="h-11 text-slate-300 hover:bg-white/10 hover:text-white" onClick={end}>Finish this run</Button></> : <><span className="basketball-overlay-icon"><Trophy size={29} /></span><p className="basketball-kicker">THAT’S THE BUZZER</p><h2>{hud.score} <span className="text-2xl font-normal">points</span></h2><p>{hud.made} baskets · {hud.shots ? Math.round(hud.made / hud.shots * 100) : 0}% accuracy<br />Best streak: {hud.bestStreak} in a row</p><div className="basketball-save" role="status">{saved === 'saving' ? <><LoaderCircle size={13} className="animate-spin" />Saving your run…</> : saved === 'saved' ? <><Check size={13} />Saved to your account</> : saved === 'error' ? <span>{saveError}</span> : saved === 'guest' ? 'Guest run complete. Play again anytime.' : 'No shots? There’s always another round.'}</div>{saved === 'error' && <Button variant="outline" className="h-11 bg-transparent text-white" onClick={() => { if (lastResult) void saveResult(lastResult) }}>Retry saving</Button>}<Button className="basketball-primary h-12 w-full rounded-xl bg-orange-400 text-[#172036] hover:bg-orange-300" disabled={saved === 'saving'} onClick={start}><RotateCcw size={17} />{saved === 'error' ? 'Play again without saving' : 'Play again'}</Button></>}
          </div></div>}
        </div>
        <div className="basketball-controls"><span data-testid="basketball-attempts" className="sr-only">{hud.made} baskets from {hud.shots} shots</span><div className="flex items-center gap-2 text-xs text-slate-400"><Trophy size={14} className="text-amber-300" />{isAuthenticated ? 'Personal best' : 'Guest play'} <strong className="text-white">{isAuthenticated ? stats?.bestScore ?? '…' : '—'}</strong></div><Button variant="ghost" className="h-10 gap-2 text-slate-200 hover:bg-white/10 hover:text-white" disabled={hud.status !== 'playing'} onClick={pause}><Pause size={15} />Pause</Button></div>
      </section>
      <aside className="basketball-guide"><div className="panel space-y-5 p-5"><p className="eyebrow">THE PLAYBOOK</p><p className="text-xs text-muted-foreground">Play freely without an account. <Link to="/sign-in" className="font-medium text-primary underline underline-offset-2">Sign in</Link> only if you want to save runs and a personal best.</p><h2 className="text-xl font-semibold tracking-tight">A flick. A swish.<br />A little obsession.</h2><ol className="space-y-5 text-sm"><li><strong>01 · Find your angle</strong><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Start on the ball and flick up. Left or right changes your aim; a longer, faster flick adds power. Lead the moving hoop. Flick again right away—even while earlier balls are still in the air.</p></li><li><strong>02 · Chase the clock</strong><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Start with 60 seconds. Reach 10, 25, 45, 70 points and beyond for +10 seconds each time. The hoop speeds up as you score.</p></li><li><strong>03 · Keep the heat</strong><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Baskets start at 2 points. Every 3 consecutive makes increases the multiplier, up to 5×. A miss resets it.</p></li></ol><div className="border-t pt-4"><div className="flex items-center gap-3"><Checkbox id="basketball-haptics" checked={haptics && canVibrate} disabled={!canVibrate} onCheckedChange={value => setHaptics(value === true)} /><Label htmlFor="basketball-haptics">Streak vibration</Label></div><p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{canVibrate ? 'Longer streaks bring stronger vibration patterns, when your phone supports it.' : 'This browser does not support vibration. Scoring and streak effects still work.'}</p></div><p className="border-t pt-4 text-[11px] leading-relaxed text-muted-foreground">On a keyboard: ← → aim, ↑ ↓ power, Space shoots. Leaving the tab automatically pauses the game.</p></div><Link to="/public-apps" className="mt-4 inline-flex min-h-10 items-center gap-2 text-xs text-muted-foreground">More public apps<ArrowUpRight size={14} /></Link></aside>
    </div>
    <span className="sr-only" role="status" aria-live="polite">{hud.feedback}</span>
  </div>
}
