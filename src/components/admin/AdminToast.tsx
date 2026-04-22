import { useEffect } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { useAdminStore } from '../../lib/admin-store'

export function AdminToast() {
  const toast = useAdminStore((s) => s.toast)
  const clearToast = useAdminStore((s) => s.clearToast)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(clearToast, 4000)
    return () => clearTimeout(id)
  }, [toast, clearToast])

  if (!toast) return null

  const iconMap = {
    success: <CheckCircle size={16} className="text-emerald-400 shrink-0" />,
    error: <XCircle size={16} className="text-red-400 shrink-0" />,
    info: <Info size={16} className="text-blue-400 shrink-0" />,
  }

  const borderMap = {
    success: 'border-emerald-500/30',
    error: 'border-red-500/30',
    info: 'border-blue-500/30',
  }

  return (
    <div
      role="alert"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0D2137] border ${borderMap[toast.type]} shadow-2xl max-w-sm`}
    >
      {iconMap[toast.type]}
      <p className="text-sm text-white flex-1">{toast.message}</p>
      <button
        onClick={clearToast}
        className="text-white/30 hover:text-white/60 transition-colors"
        aria-label="סגור"
      >
        <X size={14} />
      </button>
    </div>
  )
}
