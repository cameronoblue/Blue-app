import { describe, it, expect } from 'vitest'
import { newGame, step, shoot, flickVelocity, crossedRim, awardBasket, multiplier, hapticPattern, hoopSpeed, RIM_Y, HEIGHT } from './engine'

describe('basketball physics and rules', () => {
  it('maps flick angle to left/right motion and flick strength to power', () => {
    const left = flickVelocity(-35, -120, 200)!
    const right = flickVelocity(35, -120, 200)!
    expect(left.x).toBeLessThan(0); expect(right.x).toBeGreaterThan(0)
    expect(left.y).toBeCloseTo(right.y)
    expect(flickVelocity(0, -180, 120)!.y).toBeLessThan(flickVelocity(0, -70, 300)!.y)
    expect(flickVelocity(30, 40, 100)).toBeNull()
    expect(flickVelocity(0, -10, 100)).toBeNull()
  })
  it('counts only a downward pass inside the moving rim', () => {
    expect(crossedRim({ x: 190, y: RIM_Y - 10 }, { x: 210, y: RIM_Y + 10 }, 195, 205, true)).toBe(true)
    expect(crossedRim({ x: 195, y: RIM_Y + 10 }, { x: 195, y: RIM_Y - 10 }, 195, 195, false)).toBe(false)
    expect(crossedRim({ x: 250, y: RIM_Y - 10 }, { x: 250, y: RIM_Y + 10 }, 195, 195, true)).toBe(false)
  })
  it('makes a real aimed shot against a moving hoop and scores it only once', () => {
    const game = newGame(); game.status = 'playing'
    expect(shoot(game, { x: 45, y: -900 })).toBe(true)
    expect(shoot(game, { x: 45, y: -900 })).toBe(false)
    let scores = 0
    for (let i = 0; i < 300; i++) scores += step(game, 1 / 120).filter(e => e.kind === 'score').length
    expect(scores).toBe(1); expect(game.made).toBe(1); expect(game.score).toBe(2); expect(game.shots).toBe(1)
    expect(game.ball.flying).toBe(false)
  })
  it('resets streaks on a miss and respawns the ball', () => {
    const game = newGame(); game.status = 'playing'; game.streak = 5
    shoot(game, { x: 0, y: -750 })
    for (let i = 0; i < 400; i++) step(game, 1 / 120)
    expect(game.made).toBe(0); expect(game.streak).toBe(0); expect(game.ball.flying).toBe(false)
    expect(game.ball.y).toBeLessThan(HEIGHT)
  })
  it('starts at 60 seconds, pauses without consuming time, and ends at the buzzer', () => {
    const game = newGame(); expect(game.remaining).toBe(60)
    game.status = 'playing'; step(game, .5); expect(game.remaining).toBe(59.5)
    game.status = 'paused'; step(game, 3); expect(game.remaining).toBe(59.5)
    game.status = 'playing'; game.remaining = .004
    expect(step(game, 1 / 120)).toContainEqual({ kind: 'over' })
    expect(game.status).toBe('over'); expect(shoot(game, { x: 0, y: -900 })).toBe(false)
  })
  it('awards bonuses at 10, 25, 45 points and grows multipliers with streaks', () => {
    const game = newGame(); game.status = 'playing'
    for (let i = 0; i < 3; i++) expect(awardBasket(game).points).toBe(2)
    const fourth = awardBasket(game)
    expect(fourth.points).toBe(4); expect(fourth.bonus).toBe(10)
    expect(game.score).toBe(10); expect(game.remaining).toBe(70); expect(game.nextBonus).toBe(25)
    while (game.score < 25) awardBasket(game)
    expect(game.remaining).toBe(80); expect(game.nextBonus).toBe(45)
    while (game.score < 45) awardBasket(game)
    expect(game.remaining).toBe(90); expect(game.nextBonus).toBe(70)
    expect(multiplier(100)).toBe(5)
  })
  it('increases hoop speed and vibration as the run builds', () => {
    expect(hoopSpeed(10, 30)).toBeGreaterThan(hoopSpeed(0, 0))
    expect(hoopSpeed(1000, 10000)).toBeLessThanOrEqual(1.95)
    const vibrationTime = (streak: number) => hapticPattern(streak).filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0)
    expect(vibrationTime(3)).toBeGreaterThan(vibrationTime(1))
    expect(vibrationTime(8)).toBeGreaterThan(vibrationTime(3))
    expect(Math.max(...hapticPattern(1000))).toBeLessThanOrEqual(100)
  })
})
