import { test, expect } from '@playwright/test'

test('basketball supports flicks, keyboard shots, pause, bonuses UI, and saving a completed run', async ({ page }) => {
  test.setTimeout(120000)
  const username = process.env.BLUE_E2E_USERNAME
  const password = process.env.BLUE_E2E_PASSWORD
  test.skip(!username || !password, 'Development player credentials required.')
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/sign-in')
  await page.getByLabel('Username', { exact: true }).fill(username!)
  await page.getByLabel('Password', { exact: true }).fill(password!)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/apps$/)
  // Install before mounting the game so its animation loop uses the test clock.
  await page.clock.install()
  await page.clock.pauseAt(new Date(Date.now() + 1000))
  await page.getByRole('link', { name: /Flick Basketball/ }).click()
  await expect(page.getByRole('heading', { name: 'Find your flick.' })).toBeVisible()
  await expect(page.getByTestId('basketball-timer')).toHaveText('60s')
  await page.clock.runFor(32)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'artifacts/basketball-ready-mobile.png', fullPage: true })
  // Freeze the clock before launch so browser scrolling/input latency cannot
  // move the target between aiming this deterministic shot and releasing it.
  await page.getByRole('button', { name: 'Let’s play', exact: true }).click()
  const canvas = page.locator('canvas')
  await canvas.scrollIntoViewIfNeeded()
  const box = (await canvas.boundingBox())!
  const x = box.x + box.width / 2, y = box.y + box.height * 475 / 540
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + box.width * 12 / 390, y - box.height * 120 / 540, { steps: 8 })
  await page.mouse.up()
  await page.clock.runFor(2500)
  await expect(page.getByTestId('basketball-attempts')).toContainText('1 shots')
  await expect(page.getByTestId('basketball-attempts')).toHaveText('1 baskets from 1 shots', { timeout: 5000 })
  await expect(page.getByTestId('basketball-score')).toHaveText('2')
  await page.screenshot({ path: 'artifacts/basketball-playing-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Take a breather.' })).toBeVisible()
  const pausedTime = await page.getByTestId('basketball-timer').textContent()
  await page.clock.runFor(2500)
  await expect(page.getByTestId('basketball-timer')).toHaveText(pausedTime!)
  await page.getByRole('button', { name: 'Resume game', exact: true }).click()
  await canvas.press('Space')
  await expect(page.getByTestId('basketball-attempts')).toContainText('2 shots')
  await page.clock.runFor(65000)
  await expect(page.getByRole('heading', { name: '2 points', exact: true })).toBeVisible()
  await expect(page.getByText('Saved to your account', { exact: true })).toBeVisible({ timeout: 20000 })
  await page.getByRole('button', { name: 'Play again', exact: true }).click()
  await expect(page.getByTestId('basketball-score')).toHaveText('0')
  await expect(page.getByTestId('basketball-timer')).toHaveText('60s')
  await page.getByRole('button', { name: 'Focus mode', exact: true }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.getByRole('button', { name: 'Exit focus mode', exact: true }).click()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: 'artifacts/basketball-desktop.png', fullPage: true })
  expect(errors).toEqual([])
})

test('a real touch flick scores and a stalled frame still expires the timer', async ({ page, context }) => {
  const username = process.env.BLUE_E2E_USERNAME
  const password = process.env.BLUE_E2E_PASSWORD
  test.skip(!username || !password, 'Development player credentials required.')
  await page.goto('/sign-in')
  await page.getByLabel('Username', { exact: true }).fill(username!)
  await page.getByLabel('Password', { exact: true }).fill(password!)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/apps$/)
  await page.clock.install()
  await page.clock.pauseAt(new Date(Date.now() + 1000))
  await page.getByRole('link', { name: /Flick Basketball/ }).click()
  await page.clock.runFor(32)
  await page.getByRole('button', { name: 'Let’s play', exact: true }).click()
  const canvas = page.locator('canvas')
  await canvas.scrollIntoViewIfNeeded()
  const box = (await canvas.boundingBox())!
  const x = box.x + box.width / 2, y = box.y + box.height * 475 / 540
  const session = await context.newCDPSession(page)
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  for (let i = 1; i <= 8; i++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + box.width * 12 / 390 * i / 8, y: y - box.height * 120 / 540 * i / 8 }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.clock.runFor(2500)
  await expect(page.getByTestId('basketball-score')).toHaveText('2')
  // fastForward skips animation callbacks, simulating a long main-thread stall.
  await page.clock.fastForward(61000)
  await page.clock.runFor(32)
  await expect(page.getByRole('heading', { name: '2 points', exact: true })).toBeVisible()
  // Let Convex's reconnect/heartbeat timers run normally after the clock jump.
  await page.clock.resume()
  await expect(page.getByText('Saved to your account', { exact: true })).toBeVisible({ timeout: 20000 })
})
