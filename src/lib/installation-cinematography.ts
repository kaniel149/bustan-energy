/** Property names match the seven source image sequences. */
export type InstallationProperty =
  | 'concrete'
  | 'villa'
  | 'tropical'
  | 'factory'
  | 'largeroof'
  | 'field'
  | 'parking'

export const CINEMATIC_DURATION_MS = 20_000
/** Chapter starts, in seconds. The fifth chapter continues until 20 seconds. */
export const CHAPTER_TIMES = [0, 3, 6.5, 10.5, 15] as const

const TIMES = [...CHAPTER_TIMES, CINEMATIC_DURATION_MS / 1_000]
const LAST_FRAME = 122
// Zero-based frame indices. Keep this linear retiming aligned with the video.
const RESIDENTIAL_FRAMES = [0, 12, 24, 36, 56, LAST_FRAME]
const COMMERCIAL_FRAMES = [0, 24, 36, 60, 88, LAST_FRAME]

export interface CinematicShot {
  /** Fractional, zero-based source frame in [0, 122]. */
  frame: number
  scale: number
  /** CSS percentages for `transform: translate(x%, y%) scale(scale)`, center origin. */
  x: number
  y: number
  /** Zero-based chapter in [0, 4]. */
  chapter: number
}

interface CameraTrack {
  values: readonly number[]
  tangents: number[]
}

/** NaN and -Infinity select the beginning; +Infinity selects the end. */
function clampFinite(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return value === Infinity ? maximum : minimum
  return Math.min(maximum, Math.max(minimum, value))
}

function frameTargets(type: InstallationProperty): readonly number[] {
  return type === 'concrete' || type === 'villa' || type === 'tropical'
    ? RESIDENTIAL_FRAMES
    : COMMERCIAL_FRAMES
}

/**
 * Shape-preserving cubic Hermite tangents. Adjacent shots share a tangent, so
 * velocity is continuous. Direction changes settle without overshooting, and
 * the complete journey eases from and back to a stationary wide shot.
 */
function cameraTrack(values: readonly number[]): CameraTrack {
  const tangents = values.map(() => 0)
  for (let index = 1; index < values.length - 1; index++) {
    const before = TIMES[index] - TIMES[index - 1]
    const after = TIMES[index + 1] - TIMES[index]
    const incoming = (values[index] - values[index - 1]) / before
    const outgoing = (values[index + 1] - values[index]) / after
    if (incoming * outgoing <= 0) continue
    const firstWeight = 2 * after + before
    const secondWeight = after + 2 * before
    tangents[index] = (firstWeight + secondWeight) / (firstWeight / incoming + secondWeight / outgoing)
  }
  return { values, tangents }
}

function cameraProfile(scales: readonly number[], centerX: readonly number[], centerY: readonly number[]) {
  return {
    scale: cameraTrack(scales),
    centerX: cameraTrack(centerX),
    centerY: cameraTrack(centerY),
  }
}

const concreteCamera = cameraProfile(
  [1, 1.18, 1.55, 1.4, 1.2, 1],
  [0.5, 0.515, 0.55, 0.55, 0.52, 0.5],
  [0.5, 0.465, 0.38, 0.38, 0.46, 0.5],
)
const villaCamera = cameraProfile(
  [1, 1.18, 1.35, 1.3, 1.2, 1],
  [0.5, 0.512, 0.54, 0.54, 0.516, 0.5],
  [0.5, 0.475, 0.42, 0.42, 0.47, 0.5],
)
const commercialCamera = cameraProfile(
  [1, 1.1, 1.25, 1.21, 1.1, 1],
  [0.5, 0.508, 0.515, 0.515, 0.507, 0.5],
  [0.5, 0.48, 0.46, 0.46, 0.48, 0.5],
)
const CAMERAS = {
  concrete: concreteCamera,
  villa: villaCamera,
  tropical: villaCamera,
  factory: commercialCamera,
  largeroof: commercialCamera,
  field: commercialCamera,
  parking: commercialCamera,
} satisfies Record<InstallationProperty, ReturnType<typeof cameraProfile>>

function sampleCamera(track: CameraTrack, chapter: number, fraction: number): number {
  const square = fraction * fraction
  const cube = square * fraction
  const duration = TIMES[chapter + 1] - TIMES[chapter]
  return (2 * cube - 3 * square + 1) * track.values[chapter]
    + (cube - 2 * square + fraction) * duration * track.tangents[chapter]
    + (-2 * cube + 3 * square) * track.values[chapter + 1]
    + (cube - square) * duration * track.tangents[chapter + 1]
}

/** Pure sampling: the video retimes linearly while its camera moves independently. */
export function sampleCinematicShot(type: InstallationProperty, position: number): CinematicShot {
  const seconds = clampFinite(position, 0, 1) * TIMES[TIMES.length - 1]
  const chapter = CHAPTER_TIMES.findLastIndex(start => seconds >= start)
  const fraction = (seconds - TIMES[chapter]) / (TIMES[chapter + 1] - TIMES[chapter])
  const targets = frameTargets(type)
  const frame = targets[chapter] + fraction * (targets[chapter + 1] - targets[chapter])
  const camera = CAMERAS[type]
  const scale = sampleCamera(camera.scale, chapter, fraction)
  const centerX = sampleCamera(camera.centerX, chapter, fraction)
  const centerY = sampleCamera(camera.centerY, chapter, fraction)

  return {
    frame,
    scale,
    // Center the chosen source point: roofs above/right of image center need
    // positive Y and negative X translation after scaling around image center.
    x: (0.5 - centerX) * scale * 100,
    y: (0.5 - centerY) * scale * 100,
    chapter,
  }
}

/** Inverse of shot.frame; input is a fractional zero-based frame, not a filename. */
export function sourceFrameToPosition(type: InstallationProperty, frame: number): number {
  const target = clampFinite(frame, 0, LAST_FRAME)
  const targets = frameTargets(type)
  const chapter = Math.min(CHAPTER_TIMES.length - 1, targets.findLastIndex(value => target >= value))
  const fraction = (target - targets[chapter]) / (targets[chapter + 1] - targets[chapter])
  return (TIMES[chapter] + fraction * (TIMES[chapter + 1] - TIMES[chapter])) / TIMES[TIMES.length - 1]
}
