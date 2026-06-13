import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  AnimatePresence,
  useReducedMotion,
} from 'framer-motion';

const HOUSE_TYPES = [
  { id: 'concrete', label: 'Concrete Roof', labelTh: 'หลังคาคอนกรีต' },
  { id: 'villa', label: 'Tile Roof Villa', labelTh: 'หลังคากระเบื้อง' },
  { id: 'tropical', label: 'Tropical Wood', labelTh: 'หลังคาไม้เขตร้อน' },
] as const;

type HouseType = (typeof HOUSE_TYPES)[number]['id'];

/** 6 narrative beats (Apple-style), each owns a slice of scroll progress. */
const BEATS = [
  {
    label: 'Your Roof Today',
    description: 'Every system starts with the roof you already own.',
    side: 'left',
    until: 0.12,
  },
  {
    label: 'Wiring & Safety',
    description: 'Conduit, surge protection and routing — done right, hidden well.',
    side: 'right',
    until: 0.27,
  },
  {
    label: 'Mounting Structure',
    description: 'Marine-grade aluminum rails, engineered for island wind loads.',
    side: 'left',
    until: 0.45,
  },
  {
    label: 'Panels Go On',
    description: 'Tier-1 panels, precision-placed for maximum yield.',
    side: 'right',
    until: 0.62,
  },
  {
    label: 'Fully Installed',
    description: 'Producing from day one — cutting your PEA bill every month.',
    side: 'left',
    until: 0.78,
  },
  {
    label: 'Built To Last',
    description: 'Walk around it — clean from every angle, engineered for 25+ years.',
    side: 'right',
    until: 1,
  },
] as const;

type Manifest = { ext: string } & Record<HouseType, number>;

const LEGACY: Manifest = { ext: 'jpg', concrete: 63, villa: 63, tropical: 63 };

function framePath(type: HouseType, frame: number, ext: string) {
  const dir = ext === 'webp' ? 'frames-smooth' : 'frames';
  return `/${dir}/${type}/${String(frame).padStart(3, '0')}.${ext}`;
}

/** Load order: coarse pass (every 4th frame) then fine fill — canvas always has
 *  a nearby frame to show long before the full set arrives. */
function loadOrder(count: number): number[] {
  const coarse: number[] = [];
  const fine: number[] = [];
  for (let i = 1; i <= count; i++) (i % 4 === 1 ? coarse : fine).push(i);
  return [...coarse, ...fine];
}

function useFrameSequence(type: HouseType, manifest: Manifest) {
  const cache = useRef<Partial<Record<string, (HTMLImageElement | undefined)[]>>>({});
  const [, bump] = useState(0); // re-render signal as frames decode
  const count = manifest[type];
  const key = `${type}-${manifest.ext}`;

  useEffect(() => {
    let cancelled = false;
    const store = (cache.current[key] ??= new Array(count));
    const queue = loadOrder(count).filter((i) => !store[i - 1]);
    let inFlight = 0;
    const CONCURRENCY = 8;

    const next = () => {
      if (cancelled) return;
      while (inFlight < CONCURRENCY && queue.length) {
        const i = queue.shift()!;
        inFlight++;
        const img = new Image();
        img.src = framePath(type, i, manifest.ext);
        img
          .decode()
          .catch(() => undefined) // decode errors: keep going
          .finally(() => {
            inFlight--;
            if (!cancelled) {
              store[i - 1] = img;
              bump((n) => n + 1);
              next();
            }
          });
      }
    };
    next();
    return () => {
      cancelled = true;
    };
  }, [key, type, count, manifest.ext]);

  const frames = cache.current[key] ?? [];
  const loadedCount = frames.filter(Boolean).length;
  return { frames, count, loadedCount };
}

/** Nearest decoded frame to the requested index (so scrubbing never blanks). */
function nearestLoaded(frames: (HTMLImageElement | undefined)[], idx: number) {
  if (frames[idx]) return idx;
  for (let d = 1; d < frames.length; d++) {
    if (idx - d >= 0 && frames[idx - d]) return idx - d;
    if (idx + d < frames.length && frames[idx + d]) return idx + d;
  }
  return -1;
}

export default function SolarInstallationScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeType, setActiveType] = useState<HouseType>('concrete');
  const [manifest, setManifest] = useState<Manifest>(LEGACY);
  const [beat, setBeat] = useState(0);
  const drawnRef = useRef(-1);
  const everDrawnRef = useRef(false);
  const reducedMotion = useReducedMotion();

  // Smooth frame manifest (falls back to legacy 63-frame JPEGs)
  useEffect(() => {
    fetch('/frames-smooth/manifest.json')
      .then((r) => (r.ok ? r.json() : LEGACY))
      .then((m: Manifest) => setManifest(m && m.ext ? m : LEGACY))
      .catch(() => setManifest(LEGACY));
  }, []);

  const { frames, count, loadedCount } = useFrameSequence(activeType, manifest);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Physical glide: spring between scroll and frame index
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.0001,
  });
  const progressSource = reducedMotion ? scrollYProgress : smoothProgress;
  const frameIndex = useTransform(progressSource, [0, 1], [0, count - 1]);

  const drawFrame = useCallback(
    (idx: number) => {
      const canvas = canvasRef.current;
      const target = nearestLoaded(frames, idx);
      if (!canvas || target < 0) return;
      const img = frames[target]!;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      }
      ctx.drawImage(img, 0, 0);
      drawnRef.current = target;
      everDrawnRef.current = true;
    },
    [frames]
  );

  // Scroll → frame
  useEffect(() => {
    const unsub = frameIndex.on('change', (v) => {
      const idx = Math.max(0, Math.min(Math.round(v), count - 1));
      if (idx !== drawnRef.current) drawFrame(idx);
    });
    return unsub;
  }, [frameIndex, drawFrame, count]);

  // Scroll → beat
  useEffect(() => {
    const unsub = progressSource.on('change', (v) => {
      const b = BEATS.findIndex((s) => v <= s.until);
      setBeat(b === -1 ? BEATS.length - 1 : b);
    });
    return unsub;
  }, [progressSource]);

  // First paint + type-switch continuity: redraw current position as soon as
  // frames decode — previous type's pixels stay on canvas until then.
  useEffect(() => {
    if (loadedCount === 0) return;
    const idx = Math.max(0, Math.min(Math.round(frameIndex.get()), count - 1));
    drawFrame(idx);
  }, [loadedCount, drawFrame, frameIndex, count]);

  // Preload inactive types after the active one is fully decoded
  useEffect(() => {
    if (loadedCount < count) return;
    HOUSE_TYPES.forEach((t) => {
      if (t.id === activeType) return;
      for (let i = 1; i <= manifest[t.id]; i++) {
        const img = new Image();
        img.src = framePath(t.id, i, manifest.ext);
      }
    });
  }, [loadedCount, count, activeType, manifest]);

  const switching = loadedCount === 0;
  const active = useMemo(() => BEATS[beat], [beat]);

  return (
    <section ref={containerRef} className="relative" style={{ height: '500vh' }}>
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden bg-[var(--bustan-shell)]">
        {/* House type tabs */}
        <div className="absolute top-6 z-20 flex gap-2">
          {HOUSE_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setActiveType(type.id)}
              className={`
                px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300
                ${
                  activeType === type.id
                    ? 'bg-[var(--bustan-lagoon)] text-[var(--bustan-shell)] shadow-[0_14px_32px_rgba(0,111,107,0.20)]'
                    : 'bg-[rgba(216,236,232,0.72)] text-[rgba(39,52,47,0.68)] hover:bg-[rgba(216,236,232,0.96)]'
                }
              `}
            >
              {type.label}
              {activeType === type.id && switching && (
                <span className="ml-2 inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin align-middle" />
              )}
            </button>
          ))}
        </div>

        {/* Vertical progress rail (desktop) */}
        <div className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 z-20 flex-col items-center">
          <div className="relative w-px h-64 bg-[rgba(36,70,62,0.14)]">
            <motion.div
              className="absolute top-0 left-0 w-px bg-[var(--bustan-lagoon)]"
              animate={{ height: `${((beat + 1) / BEATS.length) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
            {BEATS.map((_, i) => (
              <div
                key={i}
                className={`absolute -left-[3px] w-[7px] h-[7px] rounded-full transition-colors duration-300 ${
                  i <= beat ? 'bg-[var(--bustan-lagoon)]' : 'bg-[rgba(36,70,62,0.2)]'
                }`}
                style={{ top: `${(i / (BEATS.length - 1)) * 100}%` }}
              />
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="relative w-full max-w-5xl aspect-video mx-auto px-8">
          <canvas ref={canvasRef} className="w-full h-full object-contain" />

          {/* Beat card — alternates sides on desktop */}
          <AnimatePresence mode="wait">
            <motion.div
              key={beat}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className={`
                hidden md:block absolute top-1/2 -translate-y-1/2 max-w-[260px] z-10
                ${active.side === 'left' ? 'left-0 lg:-left-10' : 'right-0 lg:-right-10'}
              `}
            >
              <div className="bg-[rgba(255,255,255,0.78)] backdrop-blur-md rounded-2xl p-5 shadow-[0_18px_44px_rgba(20,45,40,0.10)] border border-[rgba(36,70,62,0.08)]">
                <span className="text-[11px] font-mono text-[var(--bustan-lagoon)]">
                  {String(beat + 1).padStart(2, '0')} / {String(BEATS.length).padStart(2, '0')}
                </span>
                <h3 className="text-xl font-semibold text-[var(--bustan-ink)] mt-1 mb-1.5">
                  {active.label}
                </h3>
                <p className="text-[13px] leading-relaxed text-[rgba(39,52,47,0.62)]">
                  {active.description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* First-visit loading shimmer (only while canvas is still empty) */}
          {switching && !everDrawnRef.current && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-44 h-1.5 bg-[rgba(36,70,62,0.12)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full w-1/3 bg-[var(--bustan-lagoon)] rounded-full"
                  animate={{ x: ['-100%', '300%'] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Beat card — mobile (docked bottom) */}
        <div className="md:hidden absolute bottom-10 left-4 right-4 z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={beat}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="bg-[rgba(255,255,255,0.82)] backdrop-blur-md rounded-xl px-4 py-3 text-center shadow-[0_12px_30px_rgba(20,45,40,0.10)]"
            >
              <span className="text-[10px] font-mono text-[var(--bustan-lagoon)]">
                {String(beat + 1).padStart(2, '0')}/{String(BEATS.length).padStart(2, '0')}
              </span>
              <h3 className="text-base font-semibold text-[var(--bustan-ink)]">{active.label}</h3>
              <p className="text-xs text-[rgba(39,52,47,0.6)] mt-0.5">{active.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Scroll hint */}
        {beat === 0 && !switching && (
          <motion.div
            className="absolute bottom-3 text-[rgba(39,52,47,0.48)] text-xs flex flex-col items-center gap-1"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span>Scroll to explore</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 3v10M4 9l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        )}
      </div>
    </section>
  );
}
