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
