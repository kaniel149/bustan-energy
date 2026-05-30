import { useState, useRef } from 'react'
import { Upload, Sparkles, Loader2, Image as ImageIcon, X, Wand2 } from 'lucide-react'
import { uploadProposalImage, proposalImagePath, resizeImage } from '../../lib/storage'
import { useAdminStore } from '../../lib/admin-store'
import { saveRoofMeta } from '../../lib/bustan-crm-service'
import { generatePanelOverlay } from '../../lib/roof-overlay'

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
  panelWatt?: number
  originalUrl: string
  panelsUrl: string
  onOriginalChange: (url: string) => void
  onPanelsChange: (url: string) => void
  onAnalysis?: (analysis: RoofAnalysisResult) => void
  /** bustan.properties uuid — when provided, analysis is persisted best-effort
   *  via saveRoofMeta() (requires 005_roof_meta migration to be applied). */
  propertyId?: string
}

export function RoofImageUploader({
  proposalRef,
  panelCount,
  panelWatt = 580,
  originalUrl,
  panelsUrl,
  onOriginalChange,
  onPanelsChange,
  onAnalysis,
  propertyId,
}: RoofImageUploaderProps) {
  const showToast = useAdminStore((s) => s.showToast)
  const [uploadingOriginal, setUploadingOriginal] = useState(false)
  const [generatingPanels, setGeneratingPanels] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiNotes, setAiNotes] = useState('')
  const [lastAnalysis, setLastAnalysis] = useState<RoofAnalysisResult | null>(null)
  const [metaSaveStatus, setMetaSaveStatus] = useState<'idle' | 'saved' | 'failed'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type
    if (!file.type.startsWith('image/')) {
      showToast('יש להעלות קובץ תמונה בלבד', 'error')
      return
    }

    setUploadingOriginal(true)
    try {
      // Resize drone photos (often 12-48MP / 10-30MB) down to 2048px / ~1MB
      const originalSizeMB = (file.size / 1024 / 1024).toFixed(1)
      const resized = await resizeImage(file, 2048, 0.85)
      const resizedSizeMB = (resized.size / 1024 / 1024).toFixed(1)
      if (resized !== file) {
        console.log(`Resized ${originalSizeMB}MB → ${resizedSizeMB}MB`)
      }

      const path = proposalImagePath(proposalRef || 'draft', 'original')
      const url = await uploadProposalImage(resized, path)
      onOriginalChange(url)
      showToast(
        resized !== file
          ? `תמונה דחוסה ל-${resizedSizeMB}MB והועלתה — לחץ ״נתח גג״`
          : 'תמונה הועלתה בהצלחה — לחץ ״נתח גג״',
        'success'
      )
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
      const session = await import('../../lib/admin-auth').then((m) => m.getSession())
      const token = session?.access_token
      if (!token) {
        throw new Error('לא מחובר — התחבר מחדש לאדמין')
      }

      // Send the image URL — server fetches it (avoids 4.5MB client body limit)
      const res = await fetch('/api/admin-analyze-roof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image_url: originalUrl,
          panel_watt: panelWatt,
          usable_pct: 80, // commercial-friendly default
        }),
      })

      // Handle non-JSON responses (e.g. 413 returns "Request Entity Too Large")
      const raw = await res.text()
      let data: { ok: boolean; analysis?: RoofAnalysisResult; error?: string; detail?: string }
      try {
        data = JSON.parse(raw)
      } catch {
        throw new Error(`HTTP ${res.status}: ${raw.slice(0, 120)}`)
      }
      if (!data.ok || !data.analysis) {
        throw new Error(data.error || data.detail || `ניתוח נכשל (HTTP ${res.status})`)
      }

      setLastAnalysis(data.analysis)
      onAnalysis(data.analysis)
      showToast(
        `✨ ${data.analysis.suggested_panel_count} פאנלים · ${data.analysis.suggested_system_kwp} kWp · ${(data.analysis.confidence * 100).toFixed(0)}% ביטחון`,
        'success'
      )

      // Best-effort persistence — non-blocking, does not affect the UI flow.
      // Requires propertyId prop + 005_roof_meta migration applied to ygoiaabzkuvdsyyduvhv.
      if (propertyId) {
        setMetaSaveStatus('idle')
        saveRoofMeta(propertyId, data.analysis).then((result) => {
          if (result.ok) {
            setMetaSaveStatus('saved')
          } else {
            setMetaSaveStatus('failed')
            console.warn('[RoofImageUploader] saveRoofMeta failed (migration pending?):', result.error)
          }
        }).catch((err) => {
          setMetaSaveStatus('failed')
          console.warn('[RoofImageUploader] saveRoofMeta threw (migration pending?):', err)
        })
      }
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
      const panelsStorageUrl = await generatePanelOverlay({
        imageUrl: originalUrl,
        proposalRef,
        panelCount,
        notes: aiNotes,
      })
      onPanelsChange(panelsStorageUrl)
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
            <div className="relative rounded-xl overflow-hidden border border-white/10">
              <img src={originalUrl} alt="גג מקורי" className="w-full h-40 object-cover" />
              <button
                onClick={() => { onOriginalChange(''); onPanelsChange('') }}
                className="absolute top-2 right-2 w-10 h-10 rounded-full bg-black/70 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                aria-label="הסר תמונה"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingOriginal}
              className="w-full h-40 rounded-xl border-2 border-dashed border-white/15 bg-white/3 active:bg-white/8 hover:border-[#E8A820]/40 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-2 text-white/30 hover:text-white/50"
            >
              {uploadingOriginal ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  <Upload size={24} />
                  <span className="text-sm">צלם גג או העלה תמונה</span>
                </>
              )}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
            aria-label="העלה תמונת גג"
          />
        </div>

        {/* AI panels image */}
        <div>
          <p className="text-[11px] text-white/40 uppercase tracking-wider mb-2">גג עם פאנלים (AI)</p>

          {panelsUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-white/10">
              <img src={panelsUrl} alt="גג עם פאנלים" className="w-full h-40 object-cover" />
              <button
                onClick={() => onPanelsChange('')}
                className="absolute top-2 right-2 w-10 h-10 rounded-full bg-black/70 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                aria-label="הסר תמונה"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="w-full h-40 rounded-xl border border-dashed border-white/10 bg-white/3 flex items-center justify-center">
              <ImageIcon size={24} className="text-white/20" />
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
              {propertyId && metaSaveStatus === 'saved' && (
                <p className="mt-1.5 text-emerald-400/70">ניתוח נשמר בסיס הנתונים</p>
              )}
              {propertyId && metaSaveStatus === 'failed' && (
                <p className="mt-1.5 text-amber-400/70">שמירה נכשלה (migration pending)</p>
              )}
            </div>
          )}

          {/* Panel overlay controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="text"
              value={aiNotes}
              onChange={(e) => setAiNotes(e.target.value)}
              placeholder="הוראות לאיי (אופציונלי)..."
              className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-base text-white placeholder:text-white/30 focus:outline-none focus:border-[#E8A820]/50 transition-colors min-h-[44px]"
            />
            <button
              onClick={handleGeneratePanels}
              disabled={generatingPanels}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#E8A820]/10 border border-[#E8A820]/20 text-[#E8A820] text-sm font-medium hover:bg-[#E8A820]/15 active:bg-[#E8A820]/20 transition-colors disabled:opacity-50 whitespace-nowrap min-h-[44px]"
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
