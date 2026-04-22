import { useState, useRef } from 'react'
import { Upload, Sparkles, Loader2, Image as ImageIcon, X } from 'lucide-react'
import { uploadProposalImage, proposalImagePath, fileToBase64 } from '../../lib/storage'
import { useAdminStore } from '../../lib/admin-store'

interface RoofImageUploaderProps {
  proposalRef: string
  panelCount: number
  originalUrl: string
  panelsUrl: string
  onOriginalChange: (url: string) => void
  onPanelsChange: (url: string) => void
}

export function RoofImageUploader({
  proposalRef,
  panelCount,
  originalUrl,
  panelsUrl,
  onOriginalChange,
  onPanelsChange,
}: RoofImageUploaderProps) {
  const showToast = useAdminStore((s) => s.showToast)
  const [uploadingOriginal, setUploadingOriginal] = useState(false)
  const [generatingPanels, setGeneratingPanels] = useState(false)
  const [aiNotes, setAiNotes] = useState('')
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
      const path = proposalImagePath(proposalRef || 'draft', 'original')
      const url = await uploadProposalImage(file, path)
      onOriginalChange(url)
      showToast('תמונה הועלתה בהצלחה', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה בהעלאה'
      showToast(msg, 'error')
    } finally {
      setUploadingOriginal(false)
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
            הוסף פאנלים עם AI
          </button>
        </div>
      )}
    </div>
  )
}
