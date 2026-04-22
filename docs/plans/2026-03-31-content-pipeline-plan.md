# TM Energy Content Pipeline — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a production pipeline that generates 4 branded social media posts/week for TM Energy (2 Reels + 1 Carousel + 1 Static) with zero real project photos.

**Architecture:** New `content/` directory inside `solar-intelligence` project. Remotion for video Reels, branded HTML templates for carousels (rendered to PNG via Playwright), AI image generation for lifestyle statics. Voiceover via ElevenLabs (English). Reuse patterns from `navitas-promo`.

**Tech Stack:** Remotion 4 + React + TypeScript | ElevenLabs TTS (English) | Playwright (carousel screenshot) | AI images (external — Midjourney/Flux)

---

## Task 1: Scaffold Content Directory + Install Remotion

**Files:**
- Create: `content/package.json`
- Create: `content/tsconfig.json`
- Create: `content/src/Root.tsx`
- Create: `content/src/index.tsx`
- Create: `content/src/styles.ts`

**Step 1: Create content directory**

```bash
cd ~/Desktop/projects/solar/solar-intelligence
mkdir -p content/src/{components,scenes,videos,templates} content/public/{audio,images,output} content/scripts
```

**Step 2: Initialize Remotion project**

```bash
cd content
npm init -y
npm install remotion @remotion/cli @remotion/player react react-dom
npm install -D typescript @types/react @types/react-dom
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": "src",
    "baseUrl": "src"
  },
  "include": ["src"]
}
```

**Step 4: Create styles.ts — TM Energy brand tokens**

```typescript
// content/src/styles.ts
export const colors = {
  navy: '#0D2137',
  navyLight: '#142D4A',
  gold: '#E8A820',
  goldLight: '#F5C84D',
  green: '#1A7A5A',
  greenLight: '#22A06B',
  white: '#FFFFFF',
  gray: '#94A3B8',
  grayDark: '#64748B',
  bg: '#0A1628',
  card: 'rgba(13, 33, 55, 0.8)',
  gradients: {
    hero: 'linear-gradient(135deg, #0D2137 0%, #142D4A 50%, #0A1628 100%)',
    gold: 'linear-gradient(135deg, #E8A820 0%, #F5C84D 100%)',
    green: 'linear-gradient(135deg, #1A7A5A 0%, #22A06B 100%)',
  },
};

export const fonts = {
  heading: "'Space Grotesk', sans-serif",
  body: "'DM Sans', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

export const shadows = {
  glow: '0 0 40px rgba(232, 168, 32, 0.3)',
  glowGreen: '0 0 40px rgba(26, 122, 90, 0.3)',
  card: '0 8px 32px rgba(0, 0, 0, 0.4)',
};
```

**Step 5: Create Root.tsx + index.tsx**

```typescript
// content/src/index.tsx
import { registerRoot } from 'remotion';
import { Root } from './Root';
registerRoot(Root);
```

```typescript
// content/src/Root.tsx
import { Composition } from 'remotion';

export const Root: React.FC = () => {
  return (
    <>
      {/* Reels — 9:16 portrait, 30fps */}
      {/* Compositions will be added per task */}
    </>
  );
};
```

**Step 6: Add scripts to package.json**

```json
{
  "scripts": {
    "studio": "remotion studio src/index.tsx",
    "render": "remotion render src/index.tsx",
    "render:reel": "remotion render src/index.tsx --height=1920 --width=1080",
    "render:square": "remotion render src/index.tsx --height=1080 --width=1080",
    "render:landscape": "remotion render src/index.tsx --height=1080 --width=1920"
  }
}
```

**Step 7: Verify setup**

```bash
npx remotion studio src/index.tsx
```
Expected: Remotion Studio opens in browser with empty composition list.

**Step 8: Commit**

```bash
cd ~/Desktop/projects/solar/solar-intelligence
git add content/
git commit -m "feat(content): scaffold Remotion pipeline with TM Energy brand tokens"
```

---

## Task 2: Build Reusable Components (Port from Navitas)

**Files:**
- Create: `content/src/components/AnimatedText.tsx`
- Create: `content/src/components/GlassCard.tsx`
- Create: `content/src/components/StatCard.tsx`
- Create: `content/src/components/SceneWrapper.tsx`
- Create: `content/src/components/BrandFooter.tsx`
- Create: `content/src/components/ProgressBar.tsx`

**Step 1: AnimatedText — spring-based text reveal**

```typescript
// content/src/components/AnimatedText.tsx
import { spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { fonts, colors } from '../styles';

interface Props {
  text: string;
  fontSize?: number;
  color?: string;
  delay?: number;
  align?: 'left' | 'center' | 'right';
  fontFamily?: 'heading' | 'body';
}

export const AnimatedText: React.FC<Props> = ({
  text,
  fontSize = 48,
  color = colors.white,
  delay = 0,
  align = 'center',
  fontFamily = 'heading',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 100 } });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [30, 0]);

  return (
    <div
      style={{
        fontSize,
        fontFamily: fonts[fontFamily],
        color,
        textAlign: align,
        opacity,
        transform: `translateY(${translateY}px)`,
        lineHeight: 1.3,
        fontWeight: fontFamily === 'heading' ? 700 : 400,
      }}
    >
      {text}
    </div>
  );
};
```

**Step 2: GlassCard — glassmorphism container**

```typescript
// content/src/components/GlassCard.tsx
import { spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { colors, shadows } from '../styles';

interface Props {
  children: React.ReactNode;
  width?: number;
  delay?: number;
  padding?: number;
}

export const GlassCard: React.FC<Props> = ({
  children,
  width = 800,
  delay = 0,
  padding = 40,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120 } });
  const scale = interpolate(progress, [0, 1], [0.9, 1]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <div
      style={{
        width,
        padding,
        background: colors.card,
        backdropFilter: 'blur(20px)',
        borderRadius: 24,
        border: `1px solid rgba(232, 168, 32, 0.15)`,
        boxShadow: shadows.card,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      {children}
    </div>
  );
};
```

**Step 3: StatCard, SceneWrapper, BrandFooter, ProgressBar**

Follow same spring animation pattern. StatCard shows a number + label + icon. SceneWrapper handles scene enter/exit transitions. BrandFooter shows TM Energy logo + tagline. ProgressBar animates a fill bar.

Reference: `~/Desktop/projects/solar/navitas-promo/src/components/MockUI.tsx` for patterns — adapt colors to TM Energy palette.

**Step 4: Verify in Remotion Studio**

Create a test composition that renders each component. Check visuals match brand.

**Step 5: Commit**

```bash
git add content/src/components/
git commit -m "feat(content): add reusable Remotion components (AnimatedText, GlassCard, StatCard, SceneWrapper)"
```

---

## Task 3: Build Reel #1 — "We Scan Your Roof From Space"

**Files:**
- Create: `content/src/scenes/SatelliteScanScene.tsx`
- Create: `content/src/scenes/DataRevealScene.tsx`
- Create: `content/src/scenes/SavingsScene.tsx`
- Create: `content/src/scenes/CTAScene.tsx`
- Create: `content/src/videos/SatelliteScanReel.tsx`
- Create: `content/scripts/generate_voiceover.py`

**Step 1: Write the voiceover script**

```
content/scripts/reel-01-satellite-scan.txt
---
We scan your roof from space.

Before we ever step on your property, our satellite technology analyzes your roof — size, angle, shading, everything.

In 30 seconds, we know exactly how much energy your roof can produce.

No guesswork. No surprises. Just data.

TM Energy — solar intelligence for Koh Phangan.
```

**Step 2: Create voiceover generation script**

```python
# content/scripts/generate_voiceover.py
import os
from pathlib import Path
from elevenlabs import ElevenLabs
from elevenlabs.types import VoiceSettings

client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

def generate(script_file: str, output_name: str, voice_id: str = "pNInz6obpgDQGcFmaJgB"):
    """Generate voiceover. Default voice: Adam (English, clear, professional)"""
    script = Path(script_file).read_text()

    audio = client.text_to_speech.convert(
        text=script,
        voice_id=voice_id,
        model_id="eleven_multilingual_v2",
        voice_settings=VoiceSettings(stability=0.5, similarity_boost=0.8, speed=0.9),
    )

    out_path = Path(__file__).parent.parent / "public" / "audio" / f"{output_name}.mp3"
    with open(out_path, "wb") as f:
        for chunk in audio:
            f.write(chunk)
    print(f"Saved: {out_path}")

if __name__ == "__main__":
    generate("reel-01-satellite-scan.txt", "reel-01-voiceover")
```

**Step 3: Generate the voiceover**

```bash
cd ~/Desktop/projects/solar/solar-intelligence/content/scripts
python generate_voiceover.py
```
Expected: `content/public/audio/reel-01-voiceover.mp3` created.

**Step 4: Build 4 scenes (each ~7-8 seconds, total ~30s)**

Scene 1 — **SatelliteScanScene** (0-8s): Earth zoom → roof highlight → scan lines
Scene 2 — **DataRevealScene** (8-16s): GlassCard with roof stats (area, angle, shade %)
Scene 3 — **SavingsScene** (16-24s): Animated counter "$400 → $12/month", ROI chart
Scene 4 — **CTAScene** (24-30s): TM Energy logo + "Solar Intelligence for Koh Phangan"

Each scene: full-screen navy bg, centered content, spring animations, gold accents.

**Step 5: Compose into Reel video**

```typescript
// content/src/videos/SatelliteScanReel.tsx
import { Audio, Series, staticFile } from 'remotion';
import { SatelliteScanScene } from '../scenes/SatelliteScanScene';
import { DataRevealScene } from '../scenes/DataRevealScene';
import { SavingsScene } from '../scenes/SavingsScene';
import { CTAScene } from '../scenes/CTAScene';

export const SatelliteScanReel: React.FC = () => (
  <>
    <Audio src={staticFile('audio/reel-01-voiceover.mp3')} />
    <Series>
      <Series.Sequence durationInFrames={240}><SatelliteScanScene /></Series.Sequence>
      <Series.Sequence durationInFrames={240}><DataRevealScene /></Series.Sequence>
      <Series.Sequence durationInFrames={240}><SavingsScene /></Series.Sequence>
      <Series.Sequence durationInFrames={180}><CTAScene /></Series.Sequence>
    </Series>
  </>
);
```

**Step 6: Register in Root.tsx**

```typescript
<Composition
  id="SatelliteScanReel"
  component={SatelliteScanReel}
  durationInFrames={900}
  fps={30}
  width={1080}
  height={1920}
/>
```

**Step 7: Preview in Remotion Studio, iterate on timing**

```bash
cd ~/Desktop/projects/solar/solar-intelligence/content
npx remotion studio src/index.tsx
```

**Step 8: Render**

```bash
npx remotion render src/index.tsx SatelliteScanReel public/output/reel-01-satellite-scan.mp4
```

**Step 9: Commit**

```bash
git add content/src/scenes/ content/src/videos/ content/scripts/
git commit -m "feat(content): Reel #1 — We Scan Your Roof From Space"
```

---

## Task 4: Build Reel #2 — "Thailand Solar Myths" (Myth-Busting)

**Files:**
- Create: `content/src/scenes/MythScene.tsx` (reusable per myth)
- Create: `content/src/videos/SolarMythsReel.tsx`
- Create: `content/scripts/reel-02-myths.txt`

**Step 1: Write script**

```
content/scripts/reel-02-myths.txt
---
Three solar myths that are costing you money.

Myth one: Solar doesn't work in rainy season.
Reality: Thailand gets 1,600 hours of sun per year. Even in monsoon, panels produce 60 to 70 percent of peak output.

Myth two: Solar panels damage your roof.
Reality: Modern mounting systems actually protect your roof from direct sun and heat.

Myth three: The payback takes ten years.
Reality: In Koh Phangan, average payback is 3 to 4 years. After that, it's free electricity.

Stop guessing. Start saving. TM Energy.
```

**Step 2: Build reusable MythScene component**

```typescript
// content/src/scenes/MythScene.tsx
// Props: { myth: string; reality: string; stat?: string }
// Animation: "MYTH" in red with X, then "REALITY" in green with checkmark
// Kinetic text reveal, bold typography, data overlay
```

**Step 3: Compose 5 sequences**

Hook (3s) → Myth 1 (6s) → Myth 2 (6s) → Myth 3 (6s) → CTA (4s) = ~25s

**Step 4: Generate voiceover, preview, render**

Same flow as Task 3.

**Step 5: Commit**

```bash
git commit -m "feat(content): Reel #2 — Thailand Solar Myths"
```

---

## Task 5: Build Carousel Template System

**Files:**
- Create: `content/templates/carousel-base.html`
- Create: `content/templates/carousel-roi.html`
- Create: `content/scripts/render_carousel.py`

**Step 1: Create branded HTML carousel template**

```html
<!-- content/templates/carousel-base.html -->
<!-- 1080x1080 slide, dark bg, Space Grotesk font, gold accents -->
<!-- Slots: {{title}}, {{body}}, {{stat}}, {{slide_number}}, {{total_slides}} -->
<!-- TM Energy logo bottom-right, slide indicator dots bottom-center -->
```

**Step 2: Create ROI carousel — 6 slides**

| Slide | Content |
|-------|---------|
| 1 | Hook: "How much is electricity really costing your resort?" |
| 2 | Average Koh Phangan electricity bill: ฿45,000/month |
| 3 | With TM Energy solar: ฿8,000/month (82% reduction) |
| 4 | System pays for itself in 3.2 years |
| 5 | After payback: ฿444,000/year pure savings |
| 6 | CTA: "Free roof assessment — link in bio" |

**Step 3: Create Playwright screenshot script**

```python
# content/scripts/render_carousel.py
# Opens each HTML slide at 1080x1080 viewport
# Takes screenshot → saves as slide-01.png, slide-02.png, etc.
# Uses playwright to render at 2x for retina quality
```

**Step 4: Render first carousel**

```bash
cd ~/Desktop/projects/solar/solar-intelligence/content
python scripts/render_carousel.py templates/carousel-roi.html output/carousel-01-roi/
```
Expected: 6 PNG files in `output/carousel-01-roi/`

**Step 5: Commit**

```bash
git commit -m "feat(content): carousel template system + ROI carousel #1"
```

---

## Task 6: Create Static/Lifestyle Post Templates

**Files:**
- Create: `content/templates/static-didyouknow.html`
- Create: `content/templates/static-quote.html`
- Create: `content/templates/static-stat.html`

**Step 1: Build 3 branded static templates**

All 1080x1080, dark navy bg, gold/green accents:

1. **"Did you know?"** — Big stat + supporting text + TM Energy logo
2. **Brand quote** — Inspirational/educational quote + minimal design
3. **Single stat** — One massive number + context line (e.g., "1,600 sun hours/year in Thailand")

**Step 2: Create 4 initial posts using templates**

| Post | Template | Content |
|------|----------|---------|
| 1 | Did you know | "Thailand receives 40% more solar radiation than Germany — yet Germany has 10x more solar installations" |
| 2 | Stat | "฿444,000 — Average annual savings for a resort with 50kW solar system" |
| 3 | Quote | "The best time to install solar was 5 years ago. The second best time is today." |
| 4 | Did you know | "Solar panels can reduce your property's roof temperature by up to 5°C" |

**Step 3: Render all to PNG via Playwright**

**Step 4: Commit**

```bash
git commit -m "feat(content): static post templates + 4 initial posts"
```

---

## Task 7: Build Content Calendar + First 2 Weeks

**Files:**
- Create: `content/calendar/week-01.md`
- Create: `content/calendar/week-02.md`
- Create: `content/calendar/README.md`

**Step 1: Write 2-week content calendar**

```markdown
# content/calendar/week-01.md

## Week 1 — Launch Week (Credibility Phase)

### Sunday — Reel
**"We Scan Your Roof From Space"**
- File: output/reel-01-satellite-scan.mp4
- Caption: "Before we step on your property, we already know your roof's solar potential. 🛰️ Our satellite technology analyzes size, angle, and shading in 30 seconds. No guesswork, just data. #SolarThailand #KohPhangan #RenewableEnergy"
- Hashtags: #SolarThailand #KohPhangan #SolarEnergy #RenewableEnergy #SustainableLiving #IslandLife #GreenEnergy

### Tuesday — Carousel
**"How Much Is Electricity Costing Your Resort?"**
- Files: output/carousel-01-roi/slide-01.png to slide-06.png
- Caption: "The real cost of electricity in Koh Phangan might surprise you. Swipe to see how much your resort could save ➡️"

### Thursday — Reel
**"3 Solar Myths Costing You Money"**
- File: output/reel-02-solar-myths.mp4
- Caption: "Rainy season kills solar? Think again. ☀️🌧️ Swipe through the 3 biggest solar myths in Thailand."

### Saturday — Static
**"Did You Know?"**
- File: output/static-01-thailand-radiation.png
- Caption: "Thailand gets 40% more solar radiation than Germany, yet Germany has 10x the installations. The opportunity is massive. 🇹🇭☀️"
```

**Step 2: Write week 2 calendar (similar format)**

Week 2: Reel #3 (bill reveal format), Carousel #2 (PPA vs EPC), Reel #4 (installation timelapse animation), Static #2 (savings stat).

**Step 3: Commit**

```bash
git commit -m "feat(content): content calendar — weeks 1-2"
```

---

## Task 8: FB Page + IG Account Setup Checklist

**Files:**
- Create: `content/SETUP.md`

**Step 1: Document setup steps**

```markdown
# TM Energy Social Media Setup

## Facebook Page
- [ ] Create page: "TM Energy" under category "Solar Energy Company"
- [ ] Profile pic: TM Energy logo (circle crop from brand kit)
- [ ] Cover photo: Render dark hero image (villa + solar + ocean)
- [ ] About: "Solar intelligence for Koh Phangan. We scan your roof from space."
- [ ] CTA button: "Contact Us" → energy-tm.com/contact
- [ ] Location: Koh Phangan, Surat Thani, Thailand

## Instagram
- [ ] Create business account: @tmenergy.th (already exists per CLAUDE.md)
- [ ] Profile pic: Same as FB
- [ ] Bio: "Solar Intelligence for Koh Phangan 🛰️☀️\nWe scan your roof from space.\n📩 Free assessment ↓"
- [ ] Link in bio: energy-tm.com
- [ ] Connect to FB page
- [ ] Switch to Professional Account → Business

## First Actions
- [ ] Upload profile pic + cover
- [ ] Publish first 4 posts (week 1)
- [ ] Join 3 expat Facebook groups (Koh Phangan, Samui, Phuket)
- [ ] Follow 50 relevant accounts (resorts, eco-brands, expat pages)
```

**Step 2: Commit**

```bash
git commit -m "docs(content): social media setup checklist"
```

---

## Summary

| Task | Deliverable | Est. Time |
|------|-------------|-----------|
| 1 | Remotion scaffold + brand tokens | 15 min |
| 2 | 6 reusable components | 30 min |
| 3 | Reel #1 — Satellite Scan | 45 min |
| 4 | Reel #2 — Solar Myths | 30 min |
| 5 | Carousel template + ROI carousel | 30 min |
| 6 | Static templates + 4 posts | 20 min |
| 7 | Content calendar weeks 1-2 | 15 min |
| 8 | Social setup checklist | 10 min |

**Total: ~3 hours for first 2 weeks of content (8 posts)**
