import { expect, test } from '@playwright/test'

test('public homepage renders primary Bustan Energy offer', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/Bustan Energy/)
  await expect(page.getByRole('navigation')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText(/solar/i).first()).toBeVisible()
})

test('admin login is reachable without exposing the admin app', async ({ page }) => {
  await page.goto('/admin/login')

  await expect(page.getByRole('heading', { name: /פאנל ניהול הצעות|admin/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /שלח לינק התחברות/i })).toBeVisible()
})

test('contact route exposes a real lead form shell', async ({ page }) => {
  await page.goto('/contact')

  await expect(page.getByRole('textbox', { name: /name|שם/i })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /email|אימייל/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /send|שלח|submit/i })).toBeVisible()
})

test('new admin routes exist and are auth-gated', async ({ page }) => {
  for (const path of ['/admin', '/admin/scan', '/admin/knowledge']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/admin\/login$/)
  }
})

test('admin-funnel rejects anonymous calls', async ({ request }) => {
  const r = await request.get('/api/admin-funnel')
  if (r.status() === 200) {
    // Plain `vite` dev has no api/ runtime — it serves the source module (or the SPA
    // index.html), never a JSON API response.
    expect(r.headers()['content-type'] ?? '').not.toMatch(/application\/json/)
  } else {
    expect(r.status()).toBe(401)   // Vercel preview / prod
  }
})

test('partners page: facts under review, deck iframe, data-room form', async ({ page }) => {
  await page.goto('/partners')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByTestId('facts-review-badge')).toBeVisible()
  await expect(page.locator('iframe[src="/bustan-financing-deck.html"]')).toBeVisible()
  await expect(page.getByLabel(/full name|ชื่อ|שם/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /request access|ขอเข้าถึง|בקש/i })).toBeVisible()
})

test('about page carries the trust sections and the academy link', async ({ page }) => {
  await page.goto('/about')
  await expect(page.locator('#trust')).toBeVisible()
  await expect(page.locator('#pea-process li')).toHaveCount(4)
  await expect(page.getByRole('link', { name: /open the academy/i })).toHaveAttribute('href', /index\.bustan-energy\.com\/academy/)
})

test('Learn link points at the academy from every locale', async ({ page }) => {
  for (const p of ['/', '/th', '/he']) {
    await page.goto(p)
    await expect(page.getByTestId('nav-learn').first()).toHaveAttribute('href', 'https://index.bustan-energy.com/academy/')
  }
})
