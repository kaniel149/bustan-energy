# Assembly-Scroll Frame Generation Guide — Factory / Large Roof / Field

**For:** Codex (or any image/3D pipeline) running on Kaniel's machine.
**Goal:** Produce the source frames for **3 new types** in the homepage "Smooth
Assembly Scroll" (`SolarInstallationScroll.tsx`), matching the existing 3 types
(concrete / villa / tropical) frame-for-frame in timing, camera and style.

When you finish and run the interpolation script, three new tabs
(**Factory Roof · Large Roof · Solar Field**) appear automatically on the
homepage. The website code is already wired and merged — it only waits for these
frames to exist.

---

## 0. The single most important rule

**Open the existing reference set first and match it exactly:**

```
public/frames/concrete/001.jpg … 063.jpg   ← 63 frames, 960×540
public/frames/villa/001.jpg    … 063.jpg
public/frames/tropical/001.jpg … 063.jpg
```

Your new frames must use the **same camera framing, the same lighting, the same
clean/light background, and the same stage-to-frame timing**. The viewer switches
between tabs while keeping scroll position, so frame `N` of every type must show
roughly the **same assembly stage** as frame `N` of the others.

---

## 1. Exact output spec (non-negotiable)

| Property | Value |
|---|---|
| Frames per type | **63** |
| Naming | `001.jpg`, `002.jpg`, … `063.jpg` (zero-padded to 3 digits) |
| Resolution | **960 × 540** px (16:9), sRGB |
| Format | JPEG, quality ~85 |
| Output folders | `public/frames/factory/`<br>`public/frames/largeroof/`<br>`public/frames/field/` |

> Folder names are literal and must match: `factory`, `largeroof`, `field`.

---

## 2. Stage → frame mapping (copy the concrete set's timing)

The scroll story has **6 beats**. Map the build progression to these exact frame
ranges so the narrative card matches what's on screen:

| Frames | Beat (roof types) | Beat (field) | What the frame shows |
|---|---|---|---|
| **001–008** | Your Roof Today | Your Land Today | Bare subject, no solar. Establishing 3/4 aerial shot. |
| **009–017** | Wiring & Safety | Civil & Foundations | Conduit/cable trays on roof · OR ground screws/footings being set |
| **018–028** | Mounting Structure | Mounting & Racking | Aluminum rails / galvanized ground tables appear (no panels yet) |
| **029–039** | Panels Go On | Panels Go On | Panels installed progressively — partial → most rows filled |
| **040–049** | Fully Installed | Energized & Exporting | Complete system. Field adds inverter/transformer skid + grid tie |
| **050–063** | Built To Last (360°) | Built To Last (360°) | Smooth orbit / camera walk-around of the finished system |

Beats 1–5 keep a **fixed 3/4 top-down camera**. Beat 6 (frames 050–063) is a
smooth **orbit** of ~120–180° around the finished subject. Match the orbit
direction/speed of `public/frames/concrete/050.jpg … 063.jpg`.

---

## 3. How to keep frames consistent (read before generating)

63 independent text-to-image generations **will flicker** and look broken. Use a
method that locks the subject + camera. In priority order:

1. **3D render (best, deterministic).** Build the subject in Blender, keyframe the
   assembly (panels/rails appearing) on a fixed camera for frames 1–49, then an
   orbit for 50–63. Render 63 frames at 960×540. This is how to get perfect
   stability — strongly preferred for the **field** (rows must stay aligned).
2. **Image-to-video / keyframe model.** Generate **6 anchor keyframes** (one per
   beat, consistent subject via the same seed + reference image), then drive a
   controllable video model (e.g. a build/orbit prompt) between anchors and export
   63 evenly-spaced frames.
3. **img2img chain.** Generate frame 001, then feed each frame as the init image
   for the next with a low denoise strength (~0.25–0.35), nudging one stage at a
   time. Cheapest, least stable — only if 1–2 aren't available.

Whichever method: **same seed family, same camera, same light, same background**
across all 63.

---

## 4. Per-type art direction

Shared style (match the villa set): photoreal, clean **near-white seamless
background**, soft tropical daylight, subtle shadow, isometric-leaning 3/4 aerial
view, Tier-1 **mono black-blue panels**, silver aluminum rails. No text, no people,
no logos, no watermark. Subject fills ~70% of the frame, centered.

### `factory` — Factory Roof
- Single/two-story **industrial factory**: long rectangular footprint, **flat or
  low-slope metal roof**, roller loading-bay doors on one side, a few rooftop AC
  units / vents. Light-grey walls.
- Solar covers the large flat roof in neat rows.

### `largeroof` — Large Roof
- **Big-box warehouse / logistics building**: even larger, very wide uniform
  **flat roof**, minimal rooftop clutter, clean parapet edge. Think distribution
  center.
- Solar fills a vast uninterrupted roof area — emphasize scale (more rows than
  factory).

### `field` — Solar Field (ground-mount)
- Open **cleared/green land plot** → **ground-mount solar farm**: parallel rows of
  **tilted panel tables** on galvanized steel legs, gravel/grass ground, a central
  **inverter + transformer skid**, simple perimeter fence.
- Beat 2 = ground screws / concrete footings. Beat 5 = inverters + grid tie.
- Rows MUST stay perfectly aligned frame-to-frame (use the 3D method).

---

## 5. Run it (commands)

```bash
cd ~/Desktop/projects/solar/bustan/bustan-energy

# 1. Create folders
mkdir -p public/frames/factory public/frames/largeroof public/frames/field

# 2. (generate the 63 frames per folder with your chosen method)

# 3. Normalize every frame to exactly 960×540 JPEG q85 (ImageMagick example):
for t in factory largeroof field; do
  for f in public/frames/$t/*.jpg; do
    magick "$f" -resize 960x540^ -gravity center -extent 960x540 -quality 85 "$f"
  done
done

# 4. Sanity check: must print 63 for each
for t in factory largeroof field; do echo "$t: $(ls public/frames/$t/*.jpg | wc -l)"; done

# 5. Interpolate → smooth WebP + regenerate manifest (needs ffmpeg + cwebp)
bash scripts/interpolate-frames.sh

# 6. Verify the manifest now lists all 6 types
cat public/frames-smooth/manifest.json
```

Expected manifest after step 5:
```json
{"ext":"webp","concrete":123,"villa":123,"tropical":123,"factory":123,"largeroof":123,"field":123}
```

---

## 6. Acceptance checklist

- [ ] `public/frames/{factory,largeroof,field}/` each contain exactly **63** files `001.jpg`–`063.jpg`
- [ ] Every frame is **960×540** JPEG
- [ ] Stage progression matches the table in §2 (bare → wiring/civil → mounting → panels → done → orbit)
- [ ] Camera/lighting/background match the existing `concrete` set
- [ ] `scripts/interpolate-frames.sh` runs clean and `manifest.json` lists all 6 types with `123`
- [ ] `npm run build` passes

## 7. Ship

```bash
git checkout -b feat/assembly-frames-biztypes
git add public/frames/factory public/frames/largeroof public/frames/field \
        public/frames-smooth/factory public/frames-smooth/largeroof public/frames-smooth/field \
        public/frames-smooth/manifest.json
git commit -m "feat(assembly): factory + large-roof + field frame sets"
git push -u origin feat/assembly-frames-biztypes
# open a PR → merge to main → Vercel auto-deploys → 6 tabs live
```

> Note: the frame WebP sets are ~18 MB/type. Six types ≈ 110 MB in the repo; that
> is acceptable (they are lazy-loaded and served from CDN), matching the existing 3.
