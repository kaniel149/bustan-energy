import { Copy, ExternalLink, MessageCircle, FilePlus, Check } from 'lucide-react'
import { useState } from 'react'

interface ProposalSuccessModalProps {
  ref: string
  password: string
  clientName: string
  onCreateAnother: () => void
  onClose: () => void
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/60 hover:text-white transition-all"
      aria-label={label}
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? 'הועתק!' : label}
    </button>
  )
}

export function ProposalSuccessModal({
  ref,
  password,
  clientName,
  onCreateAnother,
  onClose,
}: ProposalSuccessModalProps) {
  const url = `https://energy-tm.com/p/${ref}`
  const firstName = clientName.split(' ')[0] ?? clientName

  const waMessage = `היי ${firstName}, הצעת המחיר שלך מ-TM Energy:\n${url}\nסיסמה: ${password}`

  const copyWa = async () => {
    await navigator.clipboard.writeText(waMessage)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="הצעה נוצרה בהצלחה"
    >
      <div
        dir="rtl"
        className="w-full max-w-md bg-[#0D2137] border border-white/10 rounded-2xl p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
            <Check size={24} className="text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold text-white">הצעה נוצרה בהצלחה!</h2>
          <p className="text-sm text-white/40 mt-1">{ref} · {clientName}</p>
        </div>

        {/* URL */}
        <div className="mb-4">
          <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5">קישור להצעה</p>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-xs text-white/60 flex-1 truncate font-mono" dir="ltr">{url}</span>
            <CopyButton text={url} label="העתק" />
          </div>
        </div>

        {/* Password */}
        <div className="mb-6">
          <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5">סיסמה</p>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
            <span
              className="text-3xl font-mono font-bold text-white tracking-[0.3em] flex-1"
              dir="ltr"
            >
              {password}
            </span>
            <CopyButton text={password} label="העתק" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={copyWa}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-semibold text-sm hover:bg-emerald-600/30 transition-colors"
          >
            <MessageCircle size={16} />
            העתק הודעת WhatsApp
          </button>

          <button
            onClick={() => window.open(url, '_blank')}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 font-semibold text-sm hover:bg-white/10 transition-colors"
          >
            <ExternalLink size={16} />
            פתח בחלון חדש
          </button>

          <div className="grid grid-cols-2 gap-2.5 mt-1">
            <button
              onClick={onCreateAnother}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[#E8A820] to-[#E85D3A] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <FilePlus size={14} />
              הצעה נוספת
            </button>
            <button
              onClick={onClose}
              className="py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-colors"
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
