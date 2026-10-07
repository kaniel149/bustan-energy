import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { render } from '../.prerender/entry-server.js'

const origin = 'https://bustan-energy.com'
const template = await readFile('dist/index.html', 'utf8')
if (!template.includes('<div id="root"></div>')) throw new Error('Prerender requires a fresh Vite build')
const sitemap = await readFile('public/sitemap.xml', 'utf8')
const paths = [...new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => {
  const parsed = new URL(url)
  if (parsed.origin !== origin) throw new Error(`Unexpected sitemap origin: ${url}`)
  return parsed.pathname.replace(/\/$/, '') || '/'
}))]
const privatePath = /^\/(?:th\/|he\/)?(?:admin|api|crm|platform|p|proposals|proposal-templates)(?:\/|$)/
const report = []

// Keep the SPA fallback for private and unknown routes, separate from the home snapshot.
await writeFile('dist/spa.html', template)
for (const path of paths) {
  if (privatePath.test(path)) throw new Error(`Private route cannot be prerendered: ${path}`)
  let body = await render(path)
  if (!/<h1[\s>]/.test(body)) throw new Error(`Missing H1: ${path}`)
  if (/<!--\$!-->|<template[^>]*data-msg/.test(body)) throw new Error(`Unresolved rendering error: ${path}`)
  const head = []
  body = body.replace(/<title\b[^>]*>[\s\S]*?<\/title>|<meta\b[^>]*>|<link\b[^>]*>|<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g, (tag) => {
    head.push(tag.replace(/^<(title|meta|link|script)\b/, '<$1 data-static-meta')); return ''
  })
  const routeHead = head.join('\n')
  if (!/<title\b/.test(routeHead) || !/rel="canonical"/.test(routeHead)) throw new Error(`Missing route metadata: ${path}`)
  const lang = path === '/th' || path.startsWith('/th/') ? 'th' : path === '/he' || path.startsWith('/he/') ? 'he' : 'en'
  let html = template.replace(/<[^>]+data-static-meta[^>]*>(?:[^<]*<\/title>)?/g, '')
  html = html.replace(/<html\b[^>]*>/, `<html lang="${lang}" dir="${lang === 'he' ? 'rtl' : 'ltr'}">`)
    .replace('</head>', `${routeHead}\n</head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`)
  const destination = path === '/' ? 'dist/index.html' : resolve('dist', `.${path}`, 'index.html')
  await mkdir(dirname(destination), { recursive: true })
  await writeFile(destination, html)
  report.push({ path, bytes: Buffer.byteLength(html), h1: (body.match(/<h1[\s>]/g) ?? []).length })
}
await writeFile('.prerender/report.json', JSON.stringify(report, null, 2))
console.log(`Prerendered ${report.length} public routes with route metadata and visible content.`)
