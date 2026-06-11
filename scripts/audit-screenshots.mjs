// scripts/audit-screenshots.mjs
// Usage: node scripts/audit-screenshots.mjs [baseUrl] [outDir]
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://localhost:4173'
const OUT = process.argv[3] ?? 'docs/superpowers/audit/2026-06-11-baseline'
const ROUTES = [
  ['home', '/'],
  ['services', '/services'],
  ['services-residential', '/services/residential'],
  ['services-commercial', '/services/commercial'],
  ['services-offgrid', '/services/off-grid'],
  ['services-maintenance', '/services/maintenance'],
  ['how-it-works', '/how-it-works'],
  ['pricing', '/pricing'],
  ['projects', '/projects'],
  ['about', '/about'],
  ['blog', '/blog'],
  ['contact', '/contact'],
  ['tools', '/tools'],
  ['404', '/this-page-does-not-exist'],
]
const VIEWPORTS = [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
]

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
for (const [vpName, viewport] of VIEWPORTS) {
  const page = await browser.newPage({ viewport })
  for (const [name, route] of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200) // settle animations
    await page.screenshot({ path: `${OUT}/${name}-${vpName}.png`, fullPage: true })
    console.log(`✓ ${name}-${vpName}`)
  }
  await page.close()
}
await browser.close()
