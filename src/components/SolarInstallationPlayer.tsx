import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Maximize2, Minimize2, Pause, Play, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../i18n/useLanguage'
import { installationCopy } from '../i18n/installation-copy'
import { CHAPTER_TIMES, CINEMATIC_DURATION_MS, sampleCinematicShot, type InstallationProperty } from '../lib/installation-cinematography'
import './solar-installation-player.css'

const TYPES: InstallationProperty[] = ['concrete', 'villa', 'tropical', 'factory', 'largeroof', 'field', 'parking']
const DURATION = CINEMATIC_DURATION_MS / 1000

function timeLabel(seconds: number) {
  return `00:${String(Math.floor(seconds)).padStart(2, '0')}`
}

function InstallationSequence({ type, onRetry }: { type: InstallationProperty; onRetry: () => void }) {
  const { lang, langPath } = useLanguage()
  const copy = installationCopy[lang]
  const [position, setPosition] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [buffering, setBuffering] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const screenRef = useRef<HTMLDivElement>(null)
  const lastUiPaint = useRef(0)
  const reducedMotion = useReducedMotion()
  const targetScale = useMotionValue(1)
  const targetX = useMotionValue(0)
  const targetY = useMotionValue(0)
  const spring = { stiffness: 85, damping: 24, mass: 0.75 }
  const scale = useSpring(targetScale, spring)
  const cameraX = useSpring(targetX, spring)
  const cameraY = useSpring(targetY, spring)
  const x = useTransform(cameraX, value => `${value}%`)
  const y = useTransform(cameraY, value => `${value}%`)
  const shot = sampleCinematicShot(type, position)
  const chapter = shot.chapter
  const parkingCopy = {
    en: ['Build the support frame', 'Support frame'],
    he: ['בניית מסגרת הנשיאה', 'מסגרת'],
    th: ['ติดตั้งโครงสร้างรองรับ', 'โครงรองรับ'],
  }[lang]
  const steps = copy.steps.map((step, i) => type === 'parking' && i === 1
    ? { ...step, title: parkingCopy[0], short: parkingCopy[1] }
    : step)
  const current = steps[chapter]

  // The native video clock owns playback. Camera motion runs at display refresh
  // rate, while React text/controls update at most ~12 times a second.
  const paintPosition = useCallback((next: number, force = false) => {
    const progress = Math.max(0, Math.min(1, next))
    const camera = sampleCinematicShot(type, progress)
    targetScale.set(reducedMotion ? 1 : camera.scale)
    targetX.set(reducedMotion ? 0 : camera.x)
    targetY.set(reducedMotion ? 0 : camera.y)
    const now = performance.now()
    if (force || now - lastUiPaint.current > 80 || progress === 1) {
      lastUiPaint.current = now
      setPosition(progress)
    }
  }, [type, reducedMotion, targetScale, targetX, targetY])

  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = () => {
      const video = videoRef.current
      if (video) paintPosition(video.currentTime / DURATION)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, paintPosition])

  useEffect(() => {
    const video = videoRef.current
    // Cached media can already be decoded when the player attaches (or when
    // development refresh preserves its DOM). Do not wait for a past event.
    const readyCheck = requestAnimationFrame(() => {
      if (video && video.readyState >= 2) setStatus('ready')
    })
    const pauseWhenHidden = () => { if (document.hidden) video?.pause() }
    document.addEventListener('visibilitychange', pauseWhenHidden)
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.1) video?.pause()
    }, { threshold: 0.1 })
    if (screenRef.current) observer.observe(screenRef.current)
    return () => {
      cancelAnimationFrame(readyCheck)
      observer.disconnect()
      document.removeEventListener('visibilitychange', pauseWhenHidden)
    }
  }, [])

  useEffect(() => {
    if (reducedMotion) {
      videoRef.current?.pause()
      targetScale.jump(1)
      targetX.jump(0)
      targetY.jump(0)
    }
  }, [reducedMotion, targetScale, targetX, targetY])

  function seek(next: number) {
    const video = videoRef.current
    if (!video || status !== 'ready') return
    const progress = Math.max(0, Math.min(1, next))
    video.pause()
    // The last decodable frame starts before the media's duration.
    video.currentTime = Math.min(progress * DURATION, Math.max(0, video.duration - 0.04))
    paintPosition(progress, true)
  }

  function jumpTo(nextChapter: number) {
    seek(CHAPTER_TIMES[nextChapter] / DURATION)
  }

  async function togglePlayback() {
    const video = videoRef.current
    if (!video) return
    if (!video.paused) { video.pause(); return }
    if (video.ended || video.currentTime >= DURATION - 0.05) {
      video.currentTime = 0
      paintPosition(0, true)
    }
    try { await video.play() } catch { setBuffering(false) }
  }

  const playbackLabel = playing ? copy.pause : position >= 0.998 ? copy.replay : copy.play
  const PlaybackIcon = playing ? Pause : position >= 0.998 ? RotateCcw : Play

  return <div className="installation-sequence" data-property={type} data-frame={Math.round(shot.frame) + 1} data-playing={playing} data-camera-scale={shot.scale.toFixed(3)}>
    <div className="installation-main">
      <div ref={screenRef} className="installation-screen">
        <motion.div className="installation-camera" style={reducedMotion ? { scale: 1, x: 0, y: 0 } : { scale, x, y }}>
          <video ref={videoRef} className="installation-film" src={`/videos/cinematic-${type}.mp4`} poster={`/frames-smooth/${type}/001.webp`}
            preload="auto" muted playsInline disablePictureInPicture aria-label={`${copy.types[TYPES.indexOf(type)]}: ${current.title}`}
            onLoadedData={() => { setStatus('ready'); paintPosition(videoRef.current?.currentTime ? videoRef.current.currentTime / DURATION : 0, true) }}
            onError={() => { setStatus('error'); setPlaying(false); setBuffering(false) }}
            onPlay={() => setPlaying(true)} onPlaying={() => setBuffering(false)} onWaiting={() => setBuffering(true)}
            onCanPlay={() => { setStatus('ready'); setBuffering(false) }} onSeeking={() => setBuffering(true)} onSeeked={() => setBuffering(false)}
            onPause={() => { setPlaying(false); setBuffering(false); if (videoRef.current) paintPosition(videoRef.current.currentTime / DURATION, true) }}
            onEnded={() => { setPlaying(false); paintPosition(1, true) }} />
        </motion.div>
        <div className="installation-screen-label"><span className="installation-live-dot" />{copy.types[TYPES.indexOf(type)]}</div>
        <span className="installation-view-number" aria-hidden="true">0{chapter + 1}<span> / 05</span></span>
        <span className="installation-corner installation-corner-tl" aria-hidden="true" />
        <span className="installation-corner installation-corner-br" aria-hidden="true" />
        <div className="installation-shot-label" aria-hidden="true"><span>0{chapter + 1}</span><span>{copy.shots[chapter]}</span></div>
        {position === 0 && !playing && status === 'ready' && !reducedMotion && <button type="button" className="installation-start" onClick={togglePlayback}><Play size={18} fill="currentColor" aria-hidden="true" /><span>{copy.watch}</span><span>00:20</span></button>}
        {(status === 'loading' || buffering) && <div className="installation-loading" role="status"><span className="installation-loading-line" />{copy.loading}</div>}
      </div>

      <div className="installation-controls" dir="ltr">
        <button type="button" className="installation-play" aria-label={playbackLabel} title={playbackLabel} onClick={togglePlayback} disabled={status !== 'ready' || !!reducedMotion}>
          <PlaybackIcon size={19} fill={playing ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
        <span className="installation-time" aria-hidden="true">{timeLabel(position * DURATION)}</span>
        <div className="installation-scrubber">
          <input className="installation-range" type="range" min="0" max="1000" step="1" value={Math.round(position * 1000)} aria-label={copy.timeline}
            aria-valuetext={`${current.title}, ${Math.round(position * 100)}%`} onChange={event => seek(Number(event.target.value) / 1000)}
            disabled={status !== 'ready'} style={{ '--progress': `${position * 100}%` } as CSSProperties} />
          <div className="installation-timeline-ticks" aria-hidden="true">{CHAPTER_TIMES.slice(1).map(time => <i key={time} style={{ left: `${time / DURATION * 100}%` }} />)}</div>
        </div>
        <span className="installation-time installation-duration" aria-hidden="true">00:20</span>
        <button type="button" className="installation-replay" aria-label={copy.restart} title={copy.restart} onClick={() => seek(0)} disabled={status !== 'ready'}><RotateCcw size={17} aria-hidden="true" /></button>
      </div>
      {reducedMotion && <p className="installation-motion-note">{copy.reduced}</p>}
      {status === 'error' && <div className="installation-error" role="alert"><p>{copy.error}</p><button type="button" onClick={onRetry}>{copy.retry}</button></div>}
      <p className="installation-image-note">{copy.illustration}</p>
    </div>

    <div className="installation-story">
      <nav className="installation-chapters" aria-label={copy.chapters}>
        {steps.map((step, i) => <button type="button" key={i} aria-current={chapter === i ? 'step' : undefined} className={`installation-chapter ${chapter === i ? 'is-current' : ''}`} onClick={() => jumpTo(i)} disabled={status !== 'ready'}>
          <span className="installation-chapter-number">{i < chapter ? <Check size={14} aria-hidden="true" /> : `0${i + 1}`}</span><span>{step.short}</span>
          <span className="installation-chapter-time" aria-hidden="true">{timeLabel(CHAPTER_TIMES[i])}</span>
        </button>)}
      </nav>
      <div className="installation-caption" aria-live={playing ? 'off' : 'polite'} aria-atomic="true">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={`${lang}-${chapter}`} initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reducedMotion ? 0 : -6 }} transition={{ duration: reducedMotion ? 0 : 0.28 }}>
            <h3>{current.title}</h3><p>{current.description}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="installation-step-controls">
        <button type="button" onClick={() => jumpTo(chapter - 1)} disabled={chapter === 0 || status !== 'ready'} aria-label={copy.previous}><ArrowLeft size={18} aria-hidden="true" /></button>
        <button type="button" onClick={() => jumpTo(chapter + 1)} disabled={chapter === steps.length - 1 || status !== 'ready'} aria-label={copy.next}><ArrowRight size={18} aria-hidden="true" /></button>
      </div>
      <Link className="installation-cta" to={langPath('/contact')}>{copy.cta}<ArrowRight size={16} aria-hidden="true" /></Link>
    </div>
  </div>
}

export default function SolarInstallationPlayer() {
  const { lang } = useLanguage()
  const copy = installationCopy[lang]
  const [type, setType] = useState<InstallationProperty>('concrete')
  const [attempt, setAttempt] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const raf = requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' }))
    const onFullscreen = () => setFullscreen(document.fullscreenElement === sectionRef.current)
    document.addEventListener('fullscreenchange', onFullscreen)
    return () => { cancelAnimationFrame(raf); document.removeEventListener('fullscreenchange', onFullscreen) }
  }, [])

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await sectionRef.current?.requestFullscreen()
    } catch { /* Fullscreen may be unavailable in an embedded browser. */ }
  }

  return <section ref={sectionRef} className="installation-player" aria-labelledby="installation-player-title">
    <header className="installation-header">
      <div><p className="installation-eyebrow">{copy.tag}</p><h2 id="installation-player-title">{copy.title}</h2><p className="installation-intro">{copy.intro}</p></div>
      <div className="installation-header-actions"><span className="installation-duration-tag"><Play size={12} aria-hidden="true" />{copy.duration}</span>
        {document.fullscreenEnabled && <button type="button" className="installation-fullscreen" onClick={toggleFullscreen} aria-label={fullscreen ? copy.exitFullscreen : copy.fullscreen} title={fullscreen ? copy.exitFullscreen : copy.fullscreen}>{fullscreen ? <Minimize2 size={17} aria-hidden="true" /> : <Maximize2 size={17} aria-hidden="true" />}</button>}
      </div>
    </header>
    <InstallationSequence key={`${type}-${attempt}`} type={type} onRetry={() => setAttempt(value => value + 1)} />
    <div className="installation-properties" role="group" aria-label={copy.choose}>
      <p>{copy.choose}</p>
      <div className="installation-property-list">
        {TYPES.map((item, i) => <button type="button" key={item} className={`installation-property ${item === type ? 'is-selected' : ''}`} aria-pressed={item === type} onClick={() => setType(item)}>
          <img src={`/frames-smooth/${item}/089.webp`} alt="" width="160" height="90" loading="lazy" />
          <span>{copy.types[i]}</span>{item === type && <Check size={13} aria-hidden="true" />}
        </button>)}
      </div>
    </div>
  </section>
}
