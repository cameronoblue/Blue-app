import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent } from 'react'
import { newGame, step, shoot, flickVelocity, multiplier, hapticPattern, WIDTH, HEIGHT, START, type Game, type Vec } from './engine'
import { renderCourt } from './render'
export type RunResult = { runId: string, score: number, made: number, shots: number, bestStreak: number, playedSeconds: number }
export type Hud = Pick<Game, 'status' | 'score' | 'made' | 'shots' | 'streak' | 'bestStreak' | 'remaining' | 'nextBonus'> & { multiplier: number, feedback: string }
function hudOf(game: Game): Hud { return { status: game.status, score: game.score, made: game.made, shots: game.shots, streak: game.streak, bestStreak: game.bestStreak, remaining: game.remaining, nextBonus: game.nextBonus, multiplier: multiplier(game.streak + 1), feedback: game.feedbackTime > 0 ? game.feedback : '' } }
export function useBasketball(onFinish: (result: RunResult) => void) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const game = useRef<Game>(newGame())
  const runId = useRef('')
  const aim = useRef<Vec | null>(null)
  const drag = useRef<{ id: number, point: Vec, time: number } | null>(null)
  const finish = useRef(onFinish)
  const vibrations = useRef(true)
  const reported = useRef(false)
  const [hud, setHud] = useState<Hud>(() => hudOf(newGame()))
  const [haptics, setHaptics] = useState(true)
  const [canVibrate] = useState(() => typeof navigator.vibrate === 'function')
  const keyboard = useRef({ angle: 0, power: 900 })
  useEffect(() => { finish.current = onFinish }, [onFinish])
  useEffect(() => { vibrations.current = haptics }, [haptics])
  const sync = useCallback(() => setHud(hudOf(game.current)), [])
  const stopVibration = useCallback(() => { try { navigator.vibrate?.(0) } catch { /* Unsupported hardware does not affect play. */ } }, [])
  const pause = useCallback(() => {
    if (game.current.status !== 'playing') return
    game.current.status = 'paused'; drag.current = null; aim.current = null; stopVibration(); sync()
  }, [stopVibration, sync])
  const start = useCallback(() => {
    game.current = newGame(); game.current.status = 'playing'; runId.current = crypto.randomUUID(); reported.current = false
    drag.current = null; aim.current = null; keyboard.current = { angle: 0, power: 900 }; sync(); canvas.current?.focus({ preventScroll: true })
  }, [sync])
  const resume = useCallback(() => { if (game.current.status === 'paused') { game.current.status = 'playing'; sync(); canvas.current?.focus({ preventScroll: true }) } }, [sync])
  const end = useCallback(() => {
    if (game.current.status !== 'playing' && game.current.status !== 'paused') return
    game.current.status = 'over'; drag.current = null; aim.current = null; sync(); stopVibration()
  }, [sync, stopVibration])
  useEffect(() => {
    const element = canvas.current
    const ctx = element?.getContext('2d')
    if (!element || !ctx) return
    let frame = 0, previous = 0, accumulated = 0, lastSync = 0
    function animate(timestamp: number) {
      if (!element || !ctx) return
      const elapsedWall = previous ? Math.max(0, (timestamp - previous) / 1000) : 0
      const dt = Math.min(.1, elapsedWall)
      previous = timestamp
      // Bound physics work after a stalled frame, but keep the clock honest.
      if (game.current.status === 'playing' && elapsedWall > dt) {
        const skipped = Math.min(game.current.remaining, elapsedWall - dt)
        game.current.remaining -= skipped; game.current.elapsed += skipped
      }
      accumulated += dt
      while (accumulated >= 1 / 120) {
        const events = step(game.current, 1 / 120)
        for (const event of events) if (event.kind === 'score' && vibrations.current) {
          try { navigator.vibrate?.(hapticPattern(event.streak)) } catch { /* Vibration is optional. */ }
        }
        accumulated -= 1 / 120
      }
      if (game.current.status === 'over' && !reported.current) {
        reported.current = true
        const g = game.current
        if (g.elapsed > 0) finish.current({ runId: runId.current, score: g.score, made: g.made, shots: g.shots, bestStreak: g.bestStreak, playedSeconds: Math.round(g.elapsed * 1000) / 1000 })
        sync()
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, element.clientWidth)
      const targetWidth = Math.round(width * dpr), targetHeight = Math.round(width * HEIGHT / WIDTH * dpr)
      if (element.width !== targetWidth || element.height !== targetHeight) { element.width = targetWidth; element.height = targetHeight }
      ctx.setTransform(element.width / WIDTH, 0, 0, element.height / HEIGHT, 0, 0)
      renderCourt(ctx, game.current, aim.current)
      if (timestamp - lastSync > 80) { sync(); lastSync = timestamp }
      frame = requestAnimationFrame(animate)
    }
    const hide = () => { if (document.hidden) pause() }
    document.addEventListener('visibilitychange', hide)
    window.addEventListener('blur', pause)
    frame = requestAnimationFrame(animate)
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', hide); window.removeEventListener('blur', pause); stopVibration() }
  }, [pause, sync, stopVibration])
  function point(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: (event.clientX - rect.left) * WIDTH / rect.width, y: (event.clientY - rect.top) * HEIGHT / rect.height }
  }
  function pointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!event.isPrimary || game.current.status !== 'playing' || drag.current) return
    const p = point(event)
    if (Math.hypot(p.x - START.x, p.y - START.y) > 44) return
    event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { id: event.pointerId, point: p, time: performance.now() }; aim.current = null
  }
  function pointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const initial = drag.current
    if (!initial || initial.id !== event.pointerId) return
    event.preventDefault()
    const p = point(event)
    aim.current = flickVelocity(p.x - initial.point.x, p.y - initial.point.y, performance.now() - initial.time)
  }
  function pointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    const initial = drag.current
    if (!initial || initial.id !== event.pointerId) return
    event.preventDefault()
    const p = point(event), velocity = flickVelocity(p.x - initial.point.x, p.y - initial.point.y, performance.now() - initial.time)
    drag.current = null; aim.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (velocity) shoot(game.current, velocity)
    else { game.current.feedback = 'FLICK UPWARD FROM THE BALL'; game.current.feedbackTime = 1 }
    sync()
  }
  function cancel() { drag.current = null; aim.current = null }
  function keyDown(event: KeyboardEvent<HTMLCanvasElement>) {
    if (event.key === 'Escape') { pause(); return }
    if (game.current.status !== 'playing') return
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'ArrowLeft') keyboard.current.angle = Math.max(-.8, keyboard.current.angle - .04)
    if (event.key === 'ArrowRight') keyboard.current.angle = Math.min(.8, keyboard.current.angle + .04)
    if (event.key === 'ArrowUp') keyboard.current.power = Math.min(1170, keyboard.current.power + 25)
    if (event.key === 'ArrowDown') keyboard.current.power = Math.max(750, keyboard.current.power - 25)
    const velocity = { x: Math.sin(keyboard.current.angle) * keyboard.current.power * .42, y: -Math.cos(keyboard.current.angle) * keyboard.current.power }
    if (event.key === ' ' && !event.repeat) { shoot(game.current, velocity); aim.current = null; sync() } else aim.current = velocity
  }
  return { canvas, hud, start, pause, resume, end, haptics, setHaptics, canVibrate, pointerDown, pointerMove, pointerUp, cancel, keyDown }
}
