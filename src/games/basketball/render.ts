import { WIDTH, HEIGHT, RIM_Y, RIM_HALF, BALL_RADIUS, START, GRAVITY, type Game, type Vec } from './engine'
export function renderCourt(ctx: CanvasRenderingContext2D, game: Game, aim: Vec | null, trail: Vec[]) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT)
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT)
  sky.addColorStop(0, '#0b1428'); sky.addColorStop(.7, '#172c44'); sky.addColorStop(1, '#25465a')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, WIDTH, HEIGHT)
  const glow = ctx.createRadialGradient(game.hoopX, RIM_Y, 0, game.hoopX, RIM_Y, 180)
  glow.addColorStop(0, game.streak >= 3 ? '#ff982520' : '#7abbff18'); glow.addColorStop(1, '#ffffff00')
  ctx.fillStyle = glow; ctx.fillRect(0, 0, WIDTH, HEIGHT)
  // Fence and overhead court lights.
  ctx.strokeStyle = '#b9d8ec0a'; ctx.lineWidth = 1
  for (let x = -HEIGHT; x < WIDTH + HEIGHT; x += 26) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + HEIGHT, HEIGHT * .65); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - HEIGHT, HEIGHT * .65); ctx.stroke() }
  ctx.fillStyle = '#bdd8f5'; ctx.shadowColor = '#aaccff'; ctx.shadowBlur = 15
  for (const x of [35, WIDTH - 35]) { ctx.fillRect(x - 10, 26, 20, 3) }
  ctx.shadowBlur = 0
  // Hardwood and perspective court markings.
  ctx.fillStyle = '#b67144'; ctx.beginPath(); ctx.moveTo(68, HEIGHT * .62); ctx.lineTo(WIDTH - 68, HEIGHT * .62); ctx.lineTo(WIDTH + 80, HEIGHT); ctx.lineTo(-80, HEIGHT); ctx.fill()
  ctx.strokeStyle = '#372a2520'
  for (let y = HEIGHT * .62; y < HEIGHT; y += 15) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke() }
  ctx.strokeStyle = '#fbe7c275'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(136, HEIGHT * .62); ctx.lineTo(95, HEIGHT); ctx.moveTo(WIDTH - 136, HEIGHT * .62); ctx.lineTo(WIDTH - 95, HEIGHT); ctx.stroke()
  ctx.beginPath(); ctx.ellipse(WIDTH / 2, HEIGHT * .83, 90, 30, 0, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = '#ffffff25'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('BLUE COURT', WIDTH / 2, HEIGHT - 20)
  // Moving backboard, support, and net.
  const hx = game.hoopX
  ctx.strokeStyle = '#8da3bb60'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(hx, 65); ctx.lineTo(hx, RIM_Y - 47); ctx.stroke()
  ctx.fillStyle = '#d4e6fb16'; ctx.strokeStyle = '#c7d9eecc'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.roundRect(hx - 57, RIM_Y - 76, 114, 65, 5); ctx.fill(); ctx.stroke()
  ctx.strokeStyle = '#ffffffaa'; ctx.lineWidth = 2; ctx.strokeRect(hx - 20, RIM_Y - 49, 40, 29)
  const sway = game.netTime > 0 ? Math.sin(game.netTime * 35) * 5 : 0
  ctx.strokeStyle = '#f1f6ffc0'; ctx.lineWidth = 1.3
  for (let i = 0; i <= 6; i++) {
    const x = hx - RIM_HALF + i * RIM_HALF / 3
    ctx.beginPath(); ctx.moveTo(x, RIM_Y + 2); ctx.lineTo(hx + (x - hx) * .6 + sway, RIM_Y + 43); ctx.stroke()
  }
  for (let row = 1; row <= 3; row++) {
    const y = RIM_Y + row * 12, half = RIM_HALF * (1 - row * .1)
    ctx.beginPath(); ctx.moveTo(hx - half + sway * row / 3, y); ctx.lineTo(hx + half + sway * row / 3, y); ctx.stroke()
  }
  ctx.strokeStyle = '#fa8c42'; ctx.lineWidth = 5; ctx.shadowColor = '#ff8a36'; ctx.shadowBlur = game.streak >= 3 ? 14 : 4
  ctx.beginPath(); ctx.ellipse(hx, RIM_Y, RIM_HALF, 5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0
  // Aim is a short trajectory, leaving room for timing the moving hoop.
  if (aim && !game.ball.flying) {
    ctx.fillStyle = '#fff0cfa0'
    for (let i = 1; i < 13; i++) { const t = i * .038; const x = START.x + aim.x * t, y = START.y + aim.y * t + GRAVITY * t * t / 2; ctx.globalAlpha = 1 - i / 14; ctx.beginPath(); ctx.arc(x, y, Math.max(1.2, 3 - i * .13), 0, Math.PI * 2); ctx.fill() }
    ctx.globalAlpha = 1
  }
  const ball = game.ball
  if (game.respawn <= 0) {
    if (ball.flying) trail.forEach((point, i) => { ctx.fillStyle = `rgba(255,158,61,${i / Math.max(1, trail.length) * .16})`; ctx.beginPath(); ctx.arc(point.x, point.y, BALL_RADIUS * i / Math.max(1, trail.length), 0, Math.PI * 2); ctx.fill() })
    if (!ball.flying) {
      ctx.fillStyle = '#00000030'; ctx.beginPath(); ctx.ellipse(ball.x, ball.y + 20, 24, 7, 0, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#ffbd6660'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ball.x, ball.y, 33, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.save(); ctx.translate(ball.x, ball.y); ctx.rotate(ball.flying ? ball.age * (ball.vx < 0 ? -5 : 5) : -.2)
    const fill = ctx.createRadialGradient(-5, -6, 1, 0, 0, BALL_RADIUS + 3); fill.addColorStop(0, '#ffc16c'); fill.addColorStop(.55, '#f48d36'); fill.addColorStop(1, '#c34e17')
    ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#693515'; ctx.lineWidth = 1.25
    ctx.beginPath(); ctx.moveTo(-BALL_RADIUS, 0); ctx.lineTo(BALL_RADIUS, 0); ctx.moveTo(0, -BALL_RADIUS); ctx.lineTo(0, BALL_RADIUS); ctx.stroke()
    ctx.beginPath(); ctx.ellipse(0, 0, BALL_RADIUS * .45, BALL_RADIUS, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
  }
  ctx.textAlign = 'center'
  if (!ball.flying && game.status === 'playing' && !game.respawn) { ctx.font = '10px sans-serif'; ctx.fillStyle = '#fbe7c2'; ctx.fillText('FLICK UP FROM THE BALL', WIDTH / 2, START.y + 43) }
  if (game.feedbackTime > 0) { ctx.globalAlpha = Math.min(1, game.feedbackTime * 3); ctx.fillStyle = game.feedback.includes('+10s') ? '#b5f9b6' : '#ffe0a1'; ctx.font = 'bold 19px sans-serif'; ctx.fillText(game.feedback, WIDTH / 2, 245); ctx.globalAlpha = 1 }
}
