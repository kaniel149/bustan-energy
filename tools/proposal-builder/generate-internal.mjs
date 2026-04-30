#!/usr/bin/env node
// Generates internal margin document from template-internal.html + amir-internal.json

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, resolve, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function render(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const val = data[k]
    return val !== undefined ? String(val) : `{{${k}}}`
  })
}

async function main() {
  const dataPath = join(__dirname, 'clients/amir-internal.json')
  const templatePath = join(__dirname, 'template-internal.html')
  const data = JSON.parse(readFileSync(dataPath, 'utf8'))
  const template = readFileSync(templatePath, 'utf8')

  const rendered = render(template, data)

  const outDir = join(__dirname, 'output')
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

  const htmlPath = join(outDir, `${data.ref}-he.html`)
  writeFileSync(htmlPath, rendered)
  console.log(`HTML: ${htmlPath}`)

  // PDF via Playwright
  try {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch()
    const page = await browser.newPage()
    await page.goto(`file://${resolve(htmlPath)}`)
    await page.waitForTimeout(1500)
    const pdfPath = join(outDir, `${data.ref}-he.pdf`)
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' }
    })
    await browser.close()
    console.log(`PDF: ${pdfPath}`)
  } catch (e) {
    console.warn('Playwright error:', e.message)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
