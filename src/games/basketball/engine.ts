export const WIDTH = 390
export const HEIGHT = 540
export const GRAVITY = 1050
export const RIM_Y = 155
export const RIM_HALF = 33
export const BALL_RADIUS = 13
export const START = { x: WIDTH / 2, y: HEIGHT - 65 }
export type Vec = { x: number, y: number }
export type Ball = Vec & { vx: number, vy: number, flying: boolean, scored: boolean, age: number, trail?: Vec[] }
export type Game = {
  status: 'ready' | 'playing' | 'paused' | 'over'
  remaining: number, elapsed: number, score: number, made: number, shots: number,
  streak: number, bestStreak: number, nextBonus: number, bonusLevel: number,
  phase: number, hoopX: number, ball: Ball, flights: Ball[], respawn: number,
  feedback: string, feedbackTime: number, netTime: number,
}
export type StepEvent = { kind: 'score', points: number, bonus: number, streak: number } | { kind: 'miss' } | { kind: 'over' }
export function freshBall(): Ball { return { ...START, vx: 0, vy: 0, flying: false, scored: false, age: 0 } }
export function newGame(): Game {
  return { status: 'ready', remaining: 60, elapsed: 0, score: 0, made: 0, shots: 0, streak: 0, bestStreak: 0, nextBonus: 10, bonusLevel: 0, phase: 0, hoopX: WIDTH / 2, ball: freshBall(), flights: [], respawn: 0, feedback: '', feedbackTime: 0, netTime: 0 }
}
export function multiplier(streak: number) { return Math.min(5, 1 + Math.floor(Math.max(0, streak - 1) / 3)) }
export function hoopSpeed(made: number, elapsed: number) { return Math.min(1.95, .45 + made * .055 + elapsed * .002) }
export function flickVelocity(dx: number, dy: number, milliseconds: number): Vec | null {
  const distance = Math.hypot(dx, dy)
  if (dy > -16 || distance < 24) return null
  const angle = Math.atan2(dx, -dy)
  if (Math.abs(angle) > Math.PI * .4) return null
  const speed = distance / Math.max(60, milliseconds)
  const power = Math.min(1170, Math.max(750, 660 + distance * 1.8 + speed * 100))
  return { x: Math.sin(angle) * power * .42, y: -Math.cos(angle) * power }
}
export function shoot(game: Game, velocity: Vec) {
  if (game.status !== 'playing' || game.respawn > 0 || game.flights.length >= 32) return false
  game.flights.push({ ...freshBall(), vx: velocity.x, vy: velocity.y, flying: true, trail: [] })
  game.respawn = .1
  game.shots++
  return true
}
export function crossedRim(before: Vec, after: Vec, oldHoop: number, hoop: number, descending: boolean) {
  if (!descending || before.y >= RIM_Y || after.y < RIM_Y) return false
  const t = (RIM_Y - before.y) / (after.y - before.y)
  const x = before.x + (after.x - before.x) * t
  const center = oldHoop + (hoop - oldHoop) * t
  return Math.abs(x - center) < RIM_HALF - BALL_RADIUS - 2
}
export function awardBasket(game: Game) {
  game.made++; game.streak++; game.bestStreak = Math.max(game.bestStreak, game.streak)
  const points = 2 * multiplier(game.streak)
  game.score += points
  let bonus = 0
  while (game.score >= game.nextBonus) {
    bonus += 10; game.bonusLevel++; game.nextBonus += 10 + game.bonusLevel * 5
  }
  game.remaining += bonus
  game.feedback = `${game.streak >= 3 ? 'ON FIRE! ' : 'BUCKET! '}+${points}${bonus ? `  +${bonus}s` : ''}`
  game.feedbackTime = 1.1; game.netTime = .5
  return { kind: 'score', points, bonus, streak: game.streak } as const
}
function rimBounce(ball: Ball, x: number, hoopVelocity: number) {
  const dx = ball.x - x, dy = ball.y - RIM_Y
  const distance = Math.hypot(dx, dy)
  const radius = BALL_RADIUS + 3
  if (distance >= radius || distance < .001) return
  const nx = dx / distance, ny = dy / distance
  ball.x = x + nx * radius; ball.y = RIM_Y + ny * radius
  const dot = (ball.vx - hoopVelocity) * nx + ball.vy * ny
  if (dot < 0) { ball.vx -= 1.65 * dot * nx; ball.vy -= 1.65 * dot * ny }
}
// Called in fixed 1/120s steps so scoring and collisions do not depend on frame rate.
export function step(game: Game, dt: number): StepEvent[] {
  if (game.status !== 'playing') return []
  const events: StepEvent[] = []
  game.remaining = Math.max(0, game.remaining - dt); game.elapsed += dt
  game.feedbackTime = Math.max(0, game.feedbackTime - dt); game.netTime = Math.max(0, game.netTime - dt)
  if (game.remaining <= 0) { game.status = 'over'; events.push({ kind: 'over' }); return events }
  const oldHoop = game.hoopX
  game.phase += hoopSpeed(game.made, game.elapsed) * dt
  game.hoopX = WIDTH / 2 + Math.sin(game.phase) * 104
  game.respawn = Math.max(0, game.respawn - dt)
  for (const ball of game.flights) {
  const before = { x: ball.x, y: ball.y }
  ball.age += dt; ball.vy += GRAVITY * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt
  ball.trail?.push({ x: ball.x, y: ball.y })
  if (ball.trail && ball.trail.length > 10) ball.trail.shift()
  if (!ball.scored && crossedRim(before, ball, oldHoop, game.hoopX, ball.vy > 0)) {
    ball.scored = true; events.push(awardBasket(game))
  }
  if (!ball.scored) {
    const hoopVelocity = (game.hoopX - oldHoop) / dt
    rimBounce(ball, game.hoopX - RIM_HALF, hoopVelocity)
    rimBounce(ball, game.hoopX + RIM_HALF, hoopVelocity)
  }
  if (ball.x < BALL_RADIUS) { ball.x = BALL_RADIUS; ball.vx = Math.abs(ball.vx) * .6 }
  if (ball.x > WIDTH - BALL_RADIUS) { ball.x = WIDTH - BALL_RADIUS; ball.vx = -Math.abs(ball.vx) * .6 }
  if (ball.y > HEIGHT + 35 || ball.age > 4.5 || (ball.scored && ball.y > RIM_Y + 95)) {
    if (!ball.scored) { game.streak = 0; game.feedback = 'NEXT SHOT. YOU GOT THIS.'; game.feedbackTime = .7; events.push({ kind: 'miss' }) }
    ball.flying = false
  }
  }
  game.flights = game.flights.filter(ball => ball.flying)
  return events
}
export function hapticPattern(streak: number): number[] {
  const duration = Math.min(100, 15 + streak * 9)
  return streak < 3 ? [duration] : streak < 6 ? [duration, 35, duration] : [duration, 30, duration, 30, duration]
}
