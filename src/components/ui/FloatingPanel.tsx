/**
 * FloatingPanel — reusable draggable / minimizable / closeable panel wrapper.
 *
 * Desktop (≥768px):
 *   - Draggable via grip header (pointer-events drag, clamped to viewport).
 *   - Minimize:  chevron → collapses body, leaves a compact header chip.
 *   - Close:     ✕ → unmounts panel body; a small reopen chip appears in a
 *                fixed "panel dock" (bottom-right column of pills).
 *
 * Mobile (<768px):
 *   - No drag.
 *   - Minimize / close still work.
 *   - Callers with their own bottom-sheet layout (CandidateReviewPanel) should
 *     pass `mobileBehavior="passthrough"` — FloatingPanel renders children
 *     as-is and doesn't inject any desktop wrapper on mobile.
 *
 * State is persisted in useAppStore.panelStates keyed by `id`.
 * No localStorage — state is session-only.
 */
import { useRef, useCallback, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, X, GripHorizontal } from 'lucide-react'
import { useAppStore } from '../../lib/store'

export interface FloatingPanelProps {
  /** Unique key for state persistence in the store. */
  id: string
  /** Short label shown in the header and in the dock chip when closed. */
  title: string
  /** Optional count badge shown next to the title (e.g. candidate count). */
  badge?: number
  /**
   * Default position when no stored position exists.
   * Values are CSS pixel offsets from the top-left of the positioned ancestor.
   */
  defaultPosition?: { x: number; y: number }
  /**
   * When "passthrough" the component skips the desktop wrapper and renders
   * children directly — intended for panels that manage their own mobile
   * layout (e.g. CandidateReviewPanel's bottom-sheet).
   */
  mobileBehavior?: 'passthrough'
  /** Panel body content. */
  children: ReactNode
  /** Extra Tailwind classes on the outer wrapper div. */
  className?: string
  /** Min width (px) applied as inline style on the panel. */
  minWidth?: number
}

/** The dock that holds "reopen" chips for closed panels. Rendered once. */
export function PanelDock() {
  const panelStates = useAppStore((s) => s.panelStates)
  const setPanelState = useAppStore((s) => s.setPanelState)

  const closed = Object.entries(panelStates).filter(([, v]) => v.closed)
  if (closed.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-1.5 pointer-events-none">
      {closed.map(([id, state]) => (
        <button
          key={id}
          onClick={() => setPanelState(id, { closed: false })}
          className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl
            bg-[#0D2137]/95 backdrop-blur-xl border border-white/15
            text-white/70 text-[11px] font-medium
            hover:text-white hover:border-white/30 hover:bg-[#0D2137]
            shadow-lg transition-colors"
          title={`Reopen ${id}`}
        >
          {/* title is not stored here — callers register the dock label as a data attribute */}
          {(state as { dockLabel?: string }).dockLabel ?? id}
        </button>
      ))}
    </div>
  )
}

export function FloatingPanel({
  id,
  title,
  badge,
  defaultPosition = { x: 16, y: 72 },
  mobileBehavior,
  children,
  className = '',
  minWidth,
}: FloatingPanelProps) {
  const rawState = useAppStore((s) => s.panelStates[id])
  const setPanelState = useAppStore((s) => s.setPanelState)

  // Merge with defaults so first render has sane coords
  const state = rawState ?? {
    x: defaultPosition.x,
    y: defaultPosition.y,
    minimized: false,
    closed: false,
  }

  // Drag state — stored in refs (not state) to avoid re-renders while dragging
  const dragOrigin = useRef<{ mx: number; my: number; px: number; py: number } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Only primary pointer, only on the grip element itself
      if (e.button !== 0) return
      e.currentTarget.setPointerCapture(e.pointerId)
      dragOrigin.current = { mx: e.clientX, my: e.clientY, px: state.x, py: state.y }
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'grabbing'
    },
    [state.x, state.y],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragOrigin.current) return
      const dx = e.clientX - dragOrigin.current.mx
      const dy = e.clientY - dragOrigin.current.my
      const panel = panelRef.current
      const vw = window.innerWidth
      const vh = window.innerHeight
      const pw = panel?.offsetWidth ?? 280
      const ph = panel?.offsetHeight ?? 100

      const rawX = dragOrigin.current.px + dx
      const rawY = dragOrigin.current.py + dy

      // Clamp so the panel stays within the viewport with 8px margin
      const x = Math.max(8, Math.min(vw - pw - 8, rawX))
      const y = Math.max(8, Math.min(vh - ph - 8, rawY))

      setPanelState(id, { x, y })
    },
    [id, setPanelState],
  )

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOrigin.current) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragOrigin.current = null
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  }, [])

  const toggleMinimize = useCallback(
    () => setPanelState(id, { minimized: !state.minimized }),
    [id, state.minimized, setPanelState],
  )

  const close = useCallback(
    () => setPanelState(id, { closed: true, dockLabel: badge != null ? `${title} (${badge})` : title } as Parameters<typeof setPanelState>[1]),
    [id, title, badge, setPanelState],
  )

  // Panel is closed — nothing to render (dock handles the reopen chip)
  if (state.closed) return null

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  // On mobile with passthrough: just render children directly
  if (isMobile && mobileBehavior === 'passthrough') {
    return <>{children}</>
  }

  return (
    <div
      ref={panelRef}
      className={`fixed z-20 flex flex-col bg-[#0D2137]/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl ${className}`}
      style={{
        left: state.x,
        top: state.y,
        minWidth: minWidth ?? 240,
        maxWidth: 'min(calc(100vw - 32px), 360px)',
      }}
    >
      {/* Grip / header row */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 border-b border-white/10 bg-white/[0.03] select-none"
      >
        {/* Drag grip — desktop only */}
        <div
          className="hidden md:flex items-center shrink-0 cursor-grab active:cursor-grabbing text-white/20 hover:text-white/50 transition-colors touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <GripHorizontal size={14} />
        </div>

        {/* Title + badge */}
        <span className="flex-1 text-[11px] font-semibold text-white/60 truncate">
          {title}
          {badge != null && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/10 text-white/70 text-[9px] font-bold">
              {badge}
            </span>
          )}
        </span>

        {/* Minimize */}
        <button
          onClick={toggleMinimize}
          className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors shrink-0"
          title={state.minimized ? 'Expand' : 'Minimize'}
        >
          {state.minimized ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>

        {/* Close */}
        <button
          onClick={close}
          className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors shrink-0"
          title="Close"
        >
          <X size={12} />
        </button>
      </div>

      {/* Panel body — hidden when minimized */}
      {!state.minimized && (
        <div className="flex flex-col overflow-hidden flex-1">
          {children}
        </div>
      )}
    </div>
  )
}
