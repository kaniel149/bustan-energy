import { useRef, type ReactNode, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from 'react'

/**
 * Horizontal drag-to-scroll wrapper. Grab anywhere and drag side to side; a
 * genuine click (movement under the threshold) still passes through to children,
 * so buttons inside keep working. Used for the region selector pill group, which
 * holds more tabs than fit on screen.
 */
export function DragScroll({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const state = useRef({ down: false, dragging: false, startX: 0, scrollLeft: 0, moved: false })
  const THRESHOLD = 6 // px before a press becomes a drag

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    state.current = { down: true, dragging: false, startX: e.clientX, scrollLeft: el.scrollLeft, moved: false }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current
    const s = state.current
    if (!el || !s.down) return
    const dx = e.clientX - s.startX
    if (!s.dragging && Math.abs(dx) > THRESHOLD) {
      s.dragging = true
      s.moved = true
      try { el.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    }
    if (s.dragging) el.scrollLeft = s.scrollLeft - dx
  }

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = state.current
    if (s.dragging) { try { ref.current?.releasePointerCapture(e.pointerId) } catch { /* ignore */ } }
    s.down = false
    s.dragging = false
  }

  // Suppress the click that follows a drag so dragging never selects a region.
  const onClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (state.current.moved) {
      e.preventDefault()
      e.stopPropagation()
      state.current.moved = false
    }
  }

  return (
    <div
      ref={ref}
      className={`overflow-x-auto scrollbar-none cursor-grab active:cursor-grabbing ${className}`}
      style={{ touchAction: 'pan-x' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onClickCapture={onClickCapture}
    >
      {children}
    </div>
  )
}
