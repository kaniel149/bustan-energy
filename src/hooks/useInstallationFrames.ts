import { useEffect, useState } from 'react'

export interface InstallationFrames {
  frames: (HTMLImageElement | undefined)[]
  count: number
  loadedCount: number
  status: 'loading' | 'ready' | 'error'
}

interface SequenceSnapshot extends InstallationFrames {
  type: string
}

const DEFAULT_COUNT = 123
const CONCURRENCY = 6
const REQUEST_TIMEOUT_MS = 12_000
const SNAPSHOT_INTERVAL_MS = 40
const pendingSequence: InstallationFrames = {
  frames: Array.from({ length: DEFAULT_COUNT }),
  count: DEFAULT_COUNT,
  loadedCount: 0,
  status: 'loading',
}

function frameOrder(count: number): number[] {
  const coarse: number[] = []
  const remaining: number[] = []
  for (let index = 0; index < count; index++) {
    ;(index % 4 === 0 ? coarse : remaining).push(index)
  }
  return [...coarse, ...remaining]
}

/** A failed, timed-out or cancelled image never enters the decoded frame set. */
function decodeFrame(src: string, signal: AbortSignal): Promise<HTMLImageElement | undefined> {
  if (signal.aborted) return Promise.resolve(undefined)

  return new Promise((resolve) => {
    const image = new Image()
    image.decoding = 'async'
    let settled = false

    function settle(value?: HTMLImageElement) {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      signal.removeEventListener('abort', cancel)
      image.onerror = null
      if (!value) image.removeAttribute('src')
      resolve(value)
    }

    function cancel() {
      settle()
    }

    const timeout = window.setTimeout(cancel, REQUEST_TIMEOUT_MS)
    signal.addEventListener('abort', cancel, { once: true })
    image.onerror = cancel
    image.src = src
    void image.decode().then(() => {
      settle(image.complete && image.naturalWidth > 0 && image.naturalHeight > 0 ? image : undefined)
    }).catch(cancel)
  })
}

/** Returns the nearest decoded frame; ties prefer the preceding frame. */
export function getNearestInstallationFrame(
  frames: (HTMLImageElement | undefined)[],
  index: number,
): HTMLImageElement | undefined {
  if (frames.length === 0) return undefined
  const target = Math.min(frames.length - 1, Math.max(0, Math.round(Number.isFinite(index) ? index : 0)))
  for (let distance = 0; distance < frames.length; distance++) {
    const previous = frames[target - distance]
    if (previous) return previous
    const next = frames[target + distance]
    if (next) return next
  }
  return undefined
}

/** Loads one local WebP sequence. Only immutable snapshots are exposed to React. */
export function useInstallationFrames(type: string): InstallationFrames {
  const [snapshot, setSnapshot] = useState<SequenceSnapshot>(() => ({ type, ...pendingSequence }))

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    let publishTimeout: number | undefined
    const manifestTimeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    async function load() {
      let count = DEFAULT_COUNT
      try {
        const response = await fetch('/frames-smooth/manifest.json', { signal: controller.signal })
        if (!response.ok) throw new Error('manifest_unavailable')
        const manifest: unknown = await response.json()
        window.clearTimeout(manifestTimeout)
        if (cancelled) return

        if (!/^[a-z0-9_-]+$/i.test(type) || !manifest || typeof manifest !== 'object') {
          throw new Error('invalid_sequence')
        }
        const record = manifest as Record<string, unknown>
        const frameCount = Object.hasOwn(record, type) ? record[type] : undefined
        if (record.ext !== 'webp' || typeof frameCount !== 'number' || !Number.isInteger(frameCount) || frameCount < 1 || frameCount > 2_000) {
          throw new Error('invalid_sequence')
        }

        count = frameCount
        const frames: (HTMLImageElement | undefined)[] = Array.from({ length: count })
        const queue = frameOrder(count)
        let cursor = 0
        let loadedCount = 0
        let attemptedCount = 0

        function publish() {
          publishTimeout = undefined
          if (cancelled) return
          setSnapshot({
            type,
            frames: [...frames],
            count,
            loadedCount,
            status: attemptedCount < count ? 'loading' : loadedCount > 0 ? 'ready' : 'error',
          })
        }

        function schedulePublish() {
          if (publishTimeout === undefined) {
            publishTimeout = window.setTimeout(publish, SNAPSHOT_INTERVAL_MS)
          }
        }

        publish()

        async function worker() {
          while (!cancelled && cursor < queue.length) {
            const index = queue[cursor++]
            const frame = await decodeFrame(`/frames-smooth/${type}/${String(index + 1).padStart(3, '0')}.webp`, controller.signal)
            if (cancelled) return
            attemptedCount++
            if (frame) {
              frames[index] = frame
              loadedCount++
            }
            schedulePublish()
          }
        }

        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, count) }, () => worker()))
        window.clearTimeout(publishTimeout)
        publish()
      } catch {
        if (!cancelled) {
          setSnapshot({ type, frames: Array.from({ length: count }), count, loadedCount: 0, status: 'error' })
        }
      } finally {
        window.clearTimeout(manifestTimeout)
      }
    }

    void load()
    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(manifestTimeout)
      window.clearTimeout(publishTimeout)
    }
  }, [type])

  // A changed type must never expose the previous roof's frames while its
  // effect and manifest request are starting. No mutable refs are read here.
  return snapshot.type === type ? snapshot : pendingSequence
}
