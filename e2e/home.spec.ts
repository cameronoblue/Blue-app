import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

test('public homepage, top-bar sign in, and protected apps on mobile and desktop', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await mkdir('artifacts', { recursive: true })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Cameron Blue.' })).toBeVisible()
  const portrait = page.getByRole('img', { name: 'Cameron Blue wearing aviator sunglasses' })
  await expect(portrait).toBeVisible()
  await expect(portrait).toHaveJSProperty('complete', true)
  expect(await portrait.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'artifacts/cameron-home-mobile.png', fullPage: true })
  await page.getByRole('banner').getByRole('link', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
  await page.goto('/apps')
  await expect(page).toHaveURL(/\/sign-in$/)
  await page.goto('/')
  await page.setViewportSize({ width: 1440, height: 1100 })
  await expect(page.getByRole('heading', { name: 'Cameron Blue.' })).toBeVisible()
  await page.screenshot({ path: 'artifacts/cameron-home-desktop.png', fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})
