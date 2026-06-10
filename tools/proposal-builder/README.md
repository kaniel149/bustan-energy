# 🌞 Bustan Energy Proposal Builder

Generate password-protected HTML + PDF proposals with view tracking.

## Quick Start

```bash
# 1. Install deps (once)
cd tools/proposal-builder
npm i -D playwright
npx playwright install chromium

# 2. Set env vars (add to ~/.zshrc)
export SUPABASE_URL="https://trvgpgpsqvvdsudpgwpm.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="..."
export PROPOSAL_BASE_URL="https://bustan-energy.com/p"

# 3. Generate a proposal
node generate.mjs --data clients/amir.json
```

## Output

- `output/AMIR-001-he.html` — password-protected, deploy to `/p/AMIR-001`
- `output/AMIR-001-he.pdf` — unlocked version, send as attachment
- Supabase row in `proposals` table
- 6-digit password printed to console

## How Tracking Works

1. Client opens `https://bustan-energy.com/p/AMIR-001`
2. Password gate appears → client enters 6-digit password
3. `POST /api/proposal-view` validates + logs view
4. Email sent to **erez@bustan-energy.com** + **kaniel@bustan-energy.com**
5. `localStorage` remembers unlock → auto-opens on next visit (but still logs)

## Email Notification

First view: `🎯 {client} פתח את ההצעה! ({ref})`
Repeat: `👁️ {client} צופה שוב ({ref} · פעם N)`

Includes: client, phone, location, system size, price, IP, user-agent, timestamp (Bangkok).

## Files

| File | Purpose |
|------|---------|
| `generate.mjs` | Main CLI — reads JSON, renders template, creates HTML+PDF, registers in DB |
| `template.html` | Base HTML template with `{{placeholders}}` |
| `clients/*.json` | One file per client — all data + images |
| `assets/` | Logo + default images (copied to output) |
| `../../api/proposal-view.ts` | Vercel edge fn — validates password, logs view, sends email |
| `../../supabase/migrations/009_proposals.sql` | DB schema |

## Deploying a Proposal

```bash
# 1. Generate
node generate.mjs --data clients/amir.json

# 2. Copy HTML to public/proposals/ in the main project
cp output/AMIR-001-he.html ../../public/proposals/AMIR-001.html
cp output/*.png output/*.jpeg ../../public/proposals/

# 3. Deploy main project
cd ../.. && vercel --prod

# 4. Send client: https://bustan-energy.com/p/AMIR-001 + password
```

## Required Env Vars (Vercel)

| Var | Where | Purpose |
|-----|-------|---------|
| `SUPABASE_URL` | Vercel | API endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel | Write access |
| `RESEND_API_KEY` | Vercel | Send emails |

## Flags

- `--skip-pdf` — don't generate PDF (faster, for testing)
- `--skip-supa` — don't register in DB (for local testing)
- `--data PATH` — path to client JSON (required)
