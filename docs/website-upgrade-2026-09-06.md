# Bustan Energy website upgrade — 6 September 2026

## Source and preview

The production website is the React/Vite application on `kaniel149/bustan-energy`, based on `origin/main` at `834d969`. The older campaign checkout at `Documents/New project` does not contain the current production application.

Worktree: `/Users/kanieltordjman/.codex/worktrees/bustan-website-upgrade`
Branch: `codex/bustan-website-upgrade`

Run from that worktree:

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5177
```

Preview: http://127.0.0.1:5177/ (English), /th (Thai), /he (Hebrew).
The user approved applying and deploying this release. Deployment status and the final production URL are recorded in the task. No live lead submission is part of validation.

## Changes

- Rebuilt the homepage around property-first planning with warm Paper/Grove styling, the existing Instrument Serif/DM Sans fonts, and the supplied final PNG logo.
- Added localized property selection, solar/storage/care comparison, a clear four-step process, practical FAQs and links to the existing lead form and published WhatsApp number.
- Existing service pages, business assessment routes and admin handoff remain reachable. Illustrative imagery is labelled as such; unsupported headline counters and blanket guarantees were removed from the homepage.
- Installation walkthrough mounts only when opened; its loader waits for the manifest, downloads only the selected sequence and cancels outstanding work when closed.
- Compressed the hero to 124 KB, property images to 120–175 KB, and the installation preview from 18 MB to 77 KB. The original PNG logo remains intact and is shared by header/footer.
- Navigation supports explicit EN/TH/HE choices, preserves path/query/hash, and provides keyboard menu behavior and a skip link.
- Contact validation matches the existing API: a name plus valid email or phone; a supplied invalid email is rejected. Attribution, endpoint, payload and retry event ID are preserved.
- Document language/direction and Hebrew homepage canonical are corrected. Static metadata remains available to non-JavaScript scrapers; React takes ownership at startup to prevent duplicate titles, canonicals and descriptions.

## Validation

- Production build and TypeScript: pass.
- Focused ESLint for changed page, layout, metadata and validation code: pass.
- Contact validator: 10 tests pass.
- Full unit suite: 155 pass, 2 pre-existing failures, unchanged from baseline:
  - `tests/solar-financial.test.ts:76`: annual kWh expected 12,397, actual 12,622.
  - `tests/outreach/assumptions.test.ts:20`: monthly saving expected 148,000, actual 137,000.
- The installation component retains seven pre-existing ESLint `react-hooks/refs` diagnostics; comparison against HEAD confirmed the performance changes add none.
- Browser review covered desktop and narrow layouts; property selection and destinations; opening/closing the walkthrough; preserved walkthrough typography; language switching and RTL; no broken homepage images or horizontal overflow; and contact validation without a live lead submission.
- Contact success/retry paths were checked locally with a mocked endpoint, and the pure validator is covered by tests. Production CRM/email delivery was not exercised.

## Existing limitations outside this change

The other marketing pages still have partial Hebrew coverage. The homepage and cinematic installation player include English, Thai and Hebrew. The existing footer privacy/terms URLs do not have matching application routes. Financial test expectation mismatches and broader repository lint debt remain separate work.

The release uses Vercel CLI 59.11.7 through npx, linked to the existing `bustan-energy` project and `bustan-energy.com` domain.

## Cinematic installation release

- Native 20-second, 30fps movies for all seven property types; residential sources are 1920×1080 and commercial sources are 960×540.
- Continuous camera push/pull, property-specific roof crops, five timed chapters, playback controls, fullscreen, and reduced-motion behavior.
- The visual storyboard is available at `/bustan/installation-storyboard.html` and links to the production walkthrough.
- Release verification: build/typecheck and focused lint pass; 215 tests pass with the same two baseline financial/assumptions failures. All seven movies pass metadata and decoding checks.
- `.vercelignore` excludes local render sources, generated build output and development configuration. All public URLs, API routes, cron definitions and proposal-builder dependencies are preserved.
