import { useState, useRef } from 'react'
import { Upload, Sparkles, Loader2, Image as ImageIcon, X, Wand2 } from 'lucide-react'
import { uploadProposalImage, proposalImagePath, fileToBase64 } from '../../lib/storage'
import { useAdminStore } from '../../lib/admin-store'

export interface RoofAnalysisResult {
  roof_area_m2: number
  usable_area_m2: number
  suggested_panel_count: number
  suggested_system_kwp: number
  estimated_annual_kwh: number
  roof_type: string
  orientation: string
  shading: string
  tilt_deg_estimate: number
  confidence: number
  notes: string
}

interface RoofImageUploaderProps {
  proposalRef: string
  panelCount: number
  originalUrl: string
  panelsUrl: string
  onOriginalChange: (url: string) => void
  onPanelsChange: (url: string) => void
  onAnalysis?: (analysis: RoofAnalysisResult) => void
}

export function RoofImageUploader({
  proposalRef,
  panelCount,
  originalUrl,
  panelsUrl,
  onOriginalChange,
  onPanelsChange,
  onAnalysis,
}: RoofImageUploaderProps) {
  const showToast = useAdminStore((s) => s.showToast)
  const [uploadingOriginal, setUploadingOriginal] = useState(false)
  const [generatingPanels, setGeneratingPanels] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiNotes, setAiNotes] = useState('')
  const [lastAnalysis, setLastAnalysis] = useState<RoofAnalysisResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type
    if (!file.type.startsWith('image/')) {
      showToast('יש להעלות קובץ תמונה בלבד', 'error')
      return
    }

    // Validate size (10MB bucket limit)
    if (file.size > 10 * 1024 * 1024) {
      showToast(`הקובץ גדול מדי (${(file.size / 1024 / 1024).toFixed(1)}MB, מקסימום 10MB)`, 'error')
      return
    }

    setUploadingOriginal(true)
    try {
      const path = proposalImagePath(proposalRef || 'draft', 'original')
      const url = await uploadProposalImage(file, path)
      onOriginalChange(url)
      showToast('תמונה הועלתה בהצלחה — לחץ ״נתח גג״ לקבלת המלצות', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // Show detailed error to help debug RLS issues
      console.error('Upload failed:', err)
      showToast(`שגיאה בהעלאה: ${msg}`, 'error')
    } finally {
      setUploadingOriginal(false)
    }
  }

  const handleAnalyze = async () => {
    if (!originalUrl) {
      showToast('יש להעלות תמונה קודם', 'error')
      return
    }
    if (!onAnalysis) return

    setAnalyzing(true)
    try {
      const response = await fetch(originalUrl)
      const blob = await response.blob()
      const file = new File([blob], 'roof.jpg', { type: blob.type || 'image/jpeg' })
      const image_base64 = await fileToBase64(file)

      const session = await import('../../lib/admin-auth').then((m) => m.getSession())
      const token = session?.access_token
      if (!token) {
        throw new Error('לא מחובר — התחבר מחדש לאדמין')
      }

      const res = await fetch('/api/admin-analyze-roof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image_base64 }),
      })

      const data = await res.json() as { ok: boolean; analysis?: RoofAnalysisResult; error?: string; detail?: string }
      if (!data.ok || !data.analysis) {
        throw new Error(data.error || 'ניתוח נכשל')
      }

      setLastAnalysis(data.analysis)
      onAnalysis(data.analysis)
      showToast(
        `✨ ${data.analysis.suggested_panel_count} פאנלים · ${data.analysis.suggested_system_kwp} kWp · ${(data.analysis.confidence * 100).toFixed(0)}% ביטחון`,
        'success'
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('Analyze failed:', err)
      showToast(`שגיאה בניתוח: ${msg}`, 'error')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleGeneratePanels = async () => {
    if (!originalUrl) {
      showToast('יש להעלות תמונה קודם', 'error')
      return
    }

    setGeneratingPanels(true)
    try {
      // Fetch original image and convert to base64
      const response = await fetch(originalUrl)
      const blob = await response.blob()
      const file = new File([blob], 'roof.jpg', { type: 'image/jpeg' })
      const image_base64 = await fileToBase64(file)

      const session = await import('../../lib/admin-auth').then((m) => m.getSession())
      const token = session?.access_token

      const res = await fetch('/api/admin-overlay-panels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          image_base64,
          panel_count: panelCount,
          notes: aiNotes,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(errData.error ?? `HTTP ${res.status}`)
      }

      const data = await res.json() as { ok: boolean; image_base64: string }
      if (!data.ok) throw new Error('API returned not ok')

      // Convert base64 to blob and upload
      const byteChars = atob(data.image_base64)
      const bytes = new Uint8Array(byteChars.length)
      for (let i = 0; i < byteChars.length; i++) {
        bytes[i] = byteChars.charCodeAt(i)
      }
      const panelBlob = new Blob([bytes], { type: 'image/jpeg' })
      const panelFile = new File([panelBlob], 'panels.jpg', { type: 'image/jpeg' })
      const path = proposalImagePath(proposalRef || 'draft', 'panels')
      const panelsUrl = await uploadProposalImage(panelFile, path)
      onPanelsChange(panelsUrl)
      showToast('תמונת פאנלים נוצרה בהצלחה', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה ב-AI'
      showToast(msg, 'error')
    } finally {
      setGeneratingPanels(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Original image upload */}
        <div>
          <p className="text-[11px] text-white/40 uppercase tracking-wider mb-2">תמונת גג מקורית</p>

          {originalUrl ? (
            <div className="relative group rounded-xl overflow-hidden border border-white/10">
              <img src={originalUrl} alt="גג מקורי" className="w-full h-36 object-cover" />
              <button
                onClick={() => { onOriginalChange(''); onPanelsChange('') }}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="הסר תמונה"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingOriginal}
              className="w-full h-36 rounded-xl border-2 border-dashed border-white/15 bg-white/3 hover:border-[#E8A820]/40 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-2 text-white/30 hover:text-white/50"
            >
              {uploadingOriginal ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <Upload size={20} />
                  <span className="text-xs">לחץ להעלאת תמונה</span>
                </>
              )}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            aria-label="העלה תמונת גג"
          />
        </div>

        {/* AI panels image */}
        <div>
          <p className="text-[11px] text-white/40 uppercase tracking-wider mb-2">גג עם פאנלים (AI)</p>

          {panelsUrl ? (
            <div className="relative group rounded-xl overflow-hidden border border-white/10">
              <img src={panelsUrl} alt="גג עם פאנלים" className="w-full h-36 object-cover" />
              <button
                onClick={() => onPanelsChange('')}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="הסר תמונה"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="w-full h-36 rounded-xl border border-dashed border-white/10 bg-white/3 flex items-center justify-center">
              <ImageIcon size={20} className="text-white/20" />
            </div>
          )}
        </div>
      </div>

      {/* AI controls */}
      {originalUrl && (
        <div className="space-y-3">
          {/* Analyze button (suggests system size) */}
          {onAnalysis && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-medium hover:bg-emerald-500/15 transition-colors disabled:opacity-50"
            >
              {analyzing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Wand2 size={14} />
              )}
              {analyzing ? 'מנתח גג...' : '🔍 נתח גג — הצע גודל מערכת אוטומטית'}
            </button>
          )}

          {/* Last analysis summary */}
          {lastAnalysis && (
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3 text-[12px] text-white/70">
              <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                <span>שטח גג: <b className="text-white">{lastAnalysis.roof_area_m2}m²</b></span>
                <span>שמיש: <b className="text-white">{lastAnalysis.usable_area_m2}m²</b></span>
                <span>כיוון: <b className="text-white">{lastAnalysis.orientation}</b></span>
                <span>הצללה: <b className="text-white">{lastAnalysis.shading}</b></span>
                <span>שיפוע: <b className="text-white">{lastAnalysis.tilt_deg_estimate}°</b></span>
              </div>
              {lastAnalysis.notes && <p className="text-white/60 leading-relaxed">{lastAnalysis.notes}</p>}
            </div>
          )}

          {/* Panel overlay controls */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={aiNotes}
              onChange={(e) => setAiNotes(e.target.value)}
              placeholder="הוראות לאיי (אופציונלי)..."
              className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#E8A820]/50 transition-colors"
            />
            <button
              onClick={handleGeneratePanels}
              disabled={generatingPanels}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E8A820]/10 border border-[#E8A820]/20 text-[#E8A820] text-sm font-medium hover:bg-[#E8A820]/15 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {generatingPanels ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              הוסף פאנלים
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
