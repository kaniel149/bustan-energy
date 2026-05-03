import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';

const HOUSE_TYPES = [
  { id: 'concrete', label: 'Concrete Roof', labelTh: 'หลังคาคอนกรีต' },
  { id: 'villa', label: 'Tile Roof Villa', labelTh: 'หลังคากระเบื้อง' },
  { id: 'tropical', label: 'Tropical Wood', labelTh: 'หลังคาไม้เขตร้อน' },
] as const;

type HouseType = (typeof HOUSE_TYPES)[number]['id'];

const FRAME_COUNT = 63;

const STAGES = [
  { label: 'Your Roof Today', description: 'Every solar journey starts here' },
  { label: 'Electrical Wiring', description: 'Professional cable routing & conduit' },
  { label: 'Mounting Structure', description: 'Aluminum rail system installation' },
  { label: 'Panel Placement', description: 'Precision panel mounting begins' },
  { label: 'Nearly Complete', description: 'Final panels being secured' },
  { label: 'Fully Installed', description: 'Your complete solar system' },
  { label: 'Front View', description: 'Complete system overview' },
  { label: 'Left Angle', description: 'Clean, professional finish' },
  { label: 'Side View', description: 'Sleek low-profile design' },
  { label: 'Rear Left', description: 'Full coverage from every angle' },
  { label: 'Rear View', description: 'Optimized roof coverage' },
  { label: 'Rear Right', description: 'Inverter & battery placement' },
  { label: 'Right Side', description: 'Built to last 25+ years' },
];

function getFramePath(type: HouseType, frame: number) {
  return `/frames/${type}/${String(frame).padStart(3, '0')}.jpg`;
}

function useFrameSequence(type: HouseType) {
  const [frames, setFrames] = useState<HTMLImageElement[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setLoaded(false);
    setProgress(0);
    let count = 0;
    const images: HTMLImageElement[] = new Array(FRAME_COUNT);

    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new Image();
      img.src = getFramePath(type, i);
      img.onload = () => {
        images[i - 1] = img;
        count++;
        setProgress(count / FRAME_COUNT);
        if (count === FRAME_COUNT) {
          setFrames(images);
          setLoaded(true);
        }
      };
      img.onerror = () => {
        count++;
        setProgress(count / FRAME_COUNT);
        if (count === FRAME_COUNT) {
          setFrames(images);
          setLoaded(true);
        }
      };
    }
  }, [type]);

  return { frames, loaded, progress };
}

export default function SolarInstallationScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeType, setActiveType] = useState<HouseType>('concrete');
  const [currentStage, setCurrentStage] = useState(0);
  const currentFrameRef = useRef(0);

  const { frames, loaded, progress: loadProgress } = useFrameSequence(activeType);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Map scroll → frame index
  const frameIndex = useTransform(scrollYProgress, [0, 1], [0, FRAME_COUNT - 1]);

  // Map scroll → stage index for labels
  const stageIndex = useTransform(scrollYProgress, [0, 1], [0, STAGES.length - 1]);

  // Draw frame to canvas
  const drawFrame = useCallback((index: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !frames[index]) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = frames[index];

    // Set canvas size on first draw
    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }

    ctx.drawImage(img, 0, 0);
  }, [frames]);

  // Draw on scroll
  useEffect(() => {
    const unsubscribe = frameIndex.on('change', (v) => {
      const idx = Math.min(Math.round(v), FRAME_COUNT - 1);
      if (idx !== currentFrameRef.current) {
        currentFrameRef.current = idx;
        drawFrame(idx);
      }
    });
    return unsubscribe;
  }, [frameIndex, drawFrame]);

  // Track stage for labels
  useEffect(() => {
    const unsubscribe = stageIndex.on('change', (v) => {
      setCurrentStage(Math.round(v));
    });
    return unsubscribe;
  }, [stageIndex]);

  // Draw first frame when loaded
  useEffect(() => {
    if (loaded && frames[0]) {
      drawFrame(0);
    }
  }, [loaded, frames, drawFrame]);

  // Preload other types in background
  useEffect(() => {
    HOUSE_TYPES.forEach((type) => {
      if (type.id === activeType) return;
      for (let i = 1; i <= FRAME_COUNT; i++) {
        const img = new Image();
        img.src = getFramePath(type.id, i);
      }
    });
  }, [activeType]);

  const stageProgress = ((currentStage + 1) / STAGES.length) * 100;

  return (
    <section
      ref={containerRef}
      className="relative"
      style={{ height: '500vh' }}
    >
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden bg-[var(--bustan-shell)]">
        {/* House type tabs */}
        <div className="absolute top-6 z-20 flex gap-2">
          {HOUSE_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setActiveType(type.id)}
              className={`
                px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300
                ${activeType === type.id
                  ? 'bg-[var(--bustan-lagoon)] text-[var(--bustan-shell)] shadow-[0_14px_32px_rgba(0,111,107,0.20)]'
                  : 'bg-[rgba(216,236,232,0.72)] text-[rgba(39,52,47,0.68)] hover:bg-[rgba(216,236,232,0.96)]'
                }
              `}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Progress bar */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-64 z-20">
          <div className="h-1 bg-[rgba(36,70,62,0.12)] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[var(--bustan-lagoon)] rounded-full"
              style={{ width: `${stageProgress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {STAGES.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                  i <= currentStage ? 'bg-[var(--bustan-lagoon)]' : 'bg-[rgba(36,70,62,0.18)]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Canvas - frame sequence */}
        <div className="relative w-full max-w-5xl aspect-video mx-auto px-8">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain"
          />

          {/* Loading bar */}
          {!loaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="w-48 h-1.5 bg-[rgba(36,70,62,0.12)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--bustan-lagoon)] rounded-full transition-all duration-200"
                  style={{ width: `${loadProgress * 100}%` }}
                />
              </div>
              <span className="text-[rgba(39,52,47,0.48)] text-xs">
                Loading {Math.round(loadProgress * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Stage label */}
        <div className="absolute bottom-16 text-center z-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-mono text-[rgba(39,52,47,0.46)]">
                  {String(currentStage + 1).padStart(2, '0')}/{String(STAGES.length).padStart(2, '0')}
                </span>
                <h3 className="text-2xl font-semibold text-[var(--bustan-ink)]">
                  {STAGES[currentStage].label}
                </h3>
              </div>
              <p className="text-[rgba(39,52,47,0.58)] text-sm">
                {STAGES[currentStage].description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Scroll hint */}
        {currentStage === 0 && loaded && (
          <motion.div
            className="absolute bottom-6 text-[rgba(39,52,47,0.48)] text-xs flex flex-col items-center gap-1"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span>Scroll to explore</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        )}
      </div>
    </section>
  );
}
