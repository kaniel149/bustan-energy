import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

interface ToastState {
  toast: { message: string; type: ToastType } | null
  showToast: (message: string, type?: ToastType) => void
  clearToast: () => void
}

/** Lightweight global toast for the platform (CRM writes, etc.). */
export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  showToast: (message, type = 'info') => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),
}))
