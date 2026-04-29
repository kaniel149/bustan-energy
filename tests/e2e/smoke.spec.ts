import { expect, test } from '@playwright/test'

test('public homepage renders primary TM Energy offer', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/TM Energy/)
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
