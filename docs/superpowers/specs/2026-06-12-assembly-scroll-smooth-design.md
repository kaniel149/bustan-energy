# Smooth Assembly Scroll — Design Spec

**Date:** 2026-06-12 · **Branch:** `fable/assembly-scroll` · **Status:** Approved by Kaniel

## Goal

Make the `SolarInstallationScroll` section (homepage) feel like the building is being
*assembled* fluidly while scrolling — for all 3 house types (concrete / villa / tropical
"Thai house") — and upgrade the section into an Apple-style scroll story.

## Current state (problems)

- 63 frames/type (960×540 JPEG, `public/frames/{type}/NNN.jpg`), scroll maps to nearest
  frame with **no interpolation** → visible stepping ("jumpy").
- Switching house type resets everything and shows a loading bar → breaks the
  "same building" illusion.
- Stage copy sits at the bottom; 13 micro-stages, weak marketing value.

## Decisions (user-approved)

1. **Smoothness via AI-generated in-between frames** (not canvas crossfade):
   - `ffmpeg minterpolate` (mci/aobmc/bidir/vsbmc) 2× → **~125 frames/type**.
     Pilot on `concrete` verified visually by Kaniel before full rollout.
   - Fallback if quality fails: RIFE (rife-ncnn-vulkan, macOS binary).
   - Output re-encoded **WebP q80, 960×540** → target ≤6MB/type (~17MB total, lazy).
2. **One upgraded section** on the homepage (not distributed across pages).

## Architecture

### 1. Frame pipeline — `scripts/interpolate-frames.sh`
- Input: `public/frames/{type}/%03d.jpg` (63) → minterpolate fps=25→50 → 125 JPEG →
  `cwebp -q 80` → `public/frames-smooth/{type}/NNN.webp`.
- Original `public/frames/` kept (mobile/fallback can keep using it).
- A `manifest.json` per set: `{ frameCount, ext, path }` so the component is
  count-agnostic.

### 2. Component — `SolarInstallationScroll.tsx`
- `FRAME_COUNT` read from manifest (63 legacy / 125 smooth).
- **Spring smoothing:** `useSpring(scrollYProgress, { stiffness 120, damping 28 })`
  before mapping to frame index — fast scrolls glide instead of jump.
- **Type switch continuity:** keep current scroll/frame position; new type starts
  rendering at the *same* assembly stage. No loading overlay on switch — previous
  type's frame stays on canvas until the matching new frame is decoded
  (per-frame `img.decode()` await), then swap.
- Progressive decode: nearest-first loading around current frame, not 1→N order.
- WebP with JPEG fallback via manifest ext.

### 3. Section redesign (Apple-style)
- 13 stages grouped into **6 narrative beats**:
  1. Your Roof Today · 2. Wiring & Safety · 3. Mounting Structure ·
  4. Panels Go On · 5. Fully Installed (savings claim) · 6. 360° — Built To Last.
- Beat card: heading + 1-line customer value, alternating left/right of the canvas
  (desktop), fade/slide on beat change. Mobile: card docks at bottom.
- Thin vertical progress rail (replaces top dots), beat-aligned.
- House-type tabs stay top-center; switching keeps scroll position (see §2).

### 4. Performance guardrails (unchanged behavior)
- Section stays `lazy()` + Suspense on HomePage.
- Active type loads first; inactive types preload only after active completes.
- `500vh` scroll length kept; reduced-motion users get static final frame.

## Out of scope
- Other pages (Services/Pricing minis) — possible later.
- New renders / camera angles. Re-rendering source frames at higher res.

## Verification
- Local build + Playwright scroll-through (desktop + mobile viewport) screenshots.
- Vercel preview deploy → Kaniel approves visually → merge to `main`.
