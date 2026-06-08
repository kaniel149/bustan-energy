# Bustan Resort Solar + Battery Assessment — Handoff

Date: 2026-06-08
Repo: `/Users/macmini/projects/github-kaniel149/solar-intelligence`

## What was added

A new additive lead-magnet funnel page for Bustan Energy:

- Public route: `/resort-solar-assessment`
- Thai-prefixed route: `/th/resort-solar-assessment`
- Page component: `src/pages/ResortSolarAssessmentPage.tsx`
- Router wiring: `src/App.tsx`
- PDF lead magnet: `public/assets/lead-magnets/bustan-resort-solar-battery-checklist.pdf`

## Funnel behavior

1. Visitor lands on the assessment page.
2. Page explains the resort/hospitality solar + battery assessment offer.
3. Visitor can download the checklist PDF.
4. Visitor can fill a short assessment form.
5. Form builds a prefilled WhatsApp message to `+66 94 669 2011` without storing data in the app.
6. Bustan can continue qualification manually on WhatsApp and request electricity bills/photos.

## Verification

- `npm run build` passed.
- Local preview route verified at `http://127.0.0.1:4173/resort-solar-assessment`.
- Browser console showed no JS errors.
- PDF endpoint returned HTTP 200 with `Content-Type: application/pdf`.
- WhatsApp CTA href was verified to include typed form values.

## Deployment next step

Commit and deploy the repo through the existing production flow. After deployment, test:

- `https://energy-tm.com/resort-solar-assessment`
- `https://energy-tm.com/th/resort-solar-assessment`
- `https://energy-tm.com/assets/lead-magnets/bustan-resort-solar-battery-checklist.pdf`

## Notes

- This was implemented additively and does not replace existing home, CRM, admin, platform, or Colliers routes.
- The page uses existing Bustan palette variables and existing assets.
- No external messages were sent during verification.
