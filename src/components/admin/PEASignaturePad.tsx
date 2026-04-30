import { useRef, useState, useEffect, useCallback } from 'react'
import { X, RotateCcw, Check, Loader2 } from 'lucide-react'
import { getSession } from '../../lib/admin-auth'

interface PEASignaturePadProps {
  documentId: string
  signerRole: 'owner' | 'engineer' | 'witness'
  onClose: () => void
  onSigned: (signatureId: string) => void
}

export default function PEASignaturePad({
  documentId,
  signerRole,
  onClose,
  onSigned,
}: PEASignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasStrokes, setHasStrokes] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [signerName, setSignerName] = useState('')
  const [signerIdNumber, setSignerIdNumber] = useState('')
  const [signerPeLicense, setSignerPeLicense] = useState('')

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Retina support
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: t.clientX - rect.left, y: t.clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setDrawing(true)
  }, [])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e, canvas)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasStrokes(true)
  }, [drawing])

  const endDraw = useCallback(() => setDrawing(false), [])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    setHasStrokes(false)
  }

  const handleSave = async () => {
    if (!signerName.trim()) { setError('Name is required'); return }
    if (signerRole === 'engineer' && !signerPeLicense.trim()) { setError('PE license required for engineer'); return }
    if (!hasStrokes) { setError('Please draw your signature'); return }

    const canvas = canvasRef.current
    if (!canvas) return

    // Export to PNG data URL
    const signatureData = canvas.toDataURL('image/png')

    setSaving(true)
    setError(null)

    try {
      const session = await getSession()
      const token = session?.access_token
      if (!token) throw new Error('Not authenticated')

      const res = await fetch('/api/admin-pea-sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          document_id: documentId,
          signer_role: signerRole,
          signer_name: signerName.trim(),
          signer_id_number: signerIdNumber.trim() || undefined,
          signer_pe_license: signerRole === 'engineer' ? signerPeLicense.trim() : undefined,
          signature_data: signatureData,
        }),
      })

      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Signature failed')

      onSigned(data.signature_id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save signature')
    } finally {
      setSaving(false)
    }
  }

  const roleLabel =
    signerRole === 'owner' ? 'Owner / Property Owner' :
    signerRole === 'engineer' ? 'Licensed Engineer (PE)' : 'Witness'

  const roleColor =
    signerRole === 'owner' ? 'text-amber-400' :
    signerRole === 'engineer' ? 'text-blue-400' : 'text-white/60'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      <div className="bg-[#0f1923] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-0.5">PEA Document Signature</p>
            <p className={`text-sm font-semibold ${roleColor}`}>{roleLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form fields */}
        <div className="px-5 pt-4 space-y-3">
          <div>
            <label className="block text-xs text-white/40 mb-1">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder={signerRole === 'engineer' ? 'Engineer full name' : 'Owner full name'}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#E8A820]/50 min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs text-white/40 mb-1">
              {signerRole === 'engineer' ? 'Thai ID / Passport (optional)' : 'Thai ID / Passport (13 digits)'}
            </label>
            <input
              type="text"
              value={signerIdNumber}
              onChange={(e) => setSignerIdNumber(e.target.value)}
              placeholder={signerRole === 'owner' ? '1-2345-67890-12-3' : 'Optional'}
              maxLength={20}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#E8A820]/50 min-h-[44px] font-mono tracking-wider"
            />
          </div>

          {signerRole === 'engineer' && (
            <div>
              <label className="block text-xs text-white/40 mb-1">
                PE License Number <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={signerPeLicense}
                onChange={(e) => setSignerPeLicense(e.target.value)}
                placeholder="e.g. EE-12345"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#E8A820]/50 min-h-[44px]"
              />
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="px-5 pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-white/40">
              Signature <span className="text-red-400">*</span>
              <span className="ml-2 text-white/20">(draw with finger or mouse)</span>
            </label>
            <button
              onClick={clearCanvas}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              <RotateCcw size={12} />
              Clear
            </button>
          </div>
          <div
            className="rounded-xl border-2 overflow-hidden"
            style={{
              borderColor: hasStrokes ? 'rgba(232,168,32,0.4)' : 'rgba(255,255,255,0.1)',
              background: '#fff',
            }}
          >
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: '140px', display: 'block', touchAction: 'none', cursor: 'crosshair' }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
          </div>
          {!hasStrokes && (
            <p className="mt-1.5 text-xs text-white/20 text-center">Sign above</p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mt-3 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="px-5 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm hover:bg-white/10 hover:text-white transition-all min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasStrokes || !signerName.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#E8A820] text-[#0D2137] text-sm font-semibold hover:bg-[#d4961c] transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Saving...</>
              : <><Check size={14} /> Save Signature</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
