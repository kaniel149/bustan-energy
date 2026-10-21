// Unknown public URLs. Status 404 so crawlers do not treat the homepage as the page.
export const config = { runtime: 'edge' }

const HTML = `<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Page Not Found | Bustan Energy</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta name="theme-color" content="#24463e" />
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 20px;
      background: #f4ead8;
      color: #24463e;
      font-family: Georgia, "Times New Roman", serif;
    }
    main { max-width: 36rem; text-align: center; }
    p.kicker {
      margin: 0 0 12px;
      font-family: "Segoe UI", sans-serif;
      font-size: 13px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    h1 { margin: 0 0 16px; font-size: clamp(40px, 8vw, 64px); font-weight: 500; line-height: 1; }
    p.lead {
      margin: 0 0 28px;
      font-family: "Segoe UI", sans-serif;
      font-size: 18px;
      line-height: 1.5;
    }
    nav { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
    a {
      font-family: "Segoe UI", sans-serif;
      color: #24463e;
      text-decoration: none;
      border: 1px solid rgba(36, 70, 62, 0.35);
      border-radius: 999px;
      padding: 10px 16px;
      font-size: 15px;
    }
    a:hover { background: #fff; }
  </style>
</head>
<body>
  <main>
    <p class="kicker">404</p>
    <h1>Page not found</h1>
    <p class="lead">This address is not a Bustan Energy page.</p>
    <nav aria-label="Helpful pages">
      <a href="/">Home</a>
      <a href="/services">Services</a>
      <a href="/contact">Contact</a>
    </nav>
  </main>
</body>
</html>
`

export default function handler(): Response {
  return new Response(HTML, {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-robots-tag': 'noindex, nofollow',
      'cache-control': 'public, max-age=0, must-revalidate',
      'x-content-type-options': 'nosniff',
    },
  })
}
