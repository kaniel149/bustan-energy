import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import type { Proposal } from '../types/proposals'

interface AdminState {
  adminUser: User | null
  setAdminUser: (user: User | null) => void

  proposals: Proposal[]
  setProposals: (proposals: Proposal[]) => void
  proposalsLoading: boolean
  setProposalsLoading: (loading: boolean) => void

  // Toast notifications
  toast: { message: string; type: 'success' | 'error' | 'info' } | null
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
  clearToast: () => void
}

export const useAdminStore = create<AdminState>((set) => ({
  adminUser: null,
  setAdminUser: (user) => set({ adminUser: user }),

  proposals: [],
  setProposals: (proposals) => set({ proposals }),
  proposalsLoading: false,
  setProposalsLoading: (loading) => set({ proposalsLoading: loading }),

  toast: null,
  showToast: (message, type = 'info') => {
    set({ toast: { message, type } })
    setTimeout(() => set({ toast: null }), 4000)
  },
  clearToast: () => set({ toast: null }),
}))
