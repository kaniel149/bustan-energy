import { create } from 'zustand'
import type { BustanLead } from './bustan-crm-service'
import type { Role } from './bustan-permissions'

interface BustanState {
  /** Enriched leads keyed by property id (source of truth for CRM edits). */
  leadsById: Record<string, BustanLead>
  /** Current user's role (read from bustan.app_users). */
  role: Role
  setLeads: (leads: BustanLead[]) => void
  setRole: (role: Role) => void
  /** Optimistically patch a lead's crm layer after a successful write. */
  patchCrm: (propertyId: string, patch: Partial<BustanLead['crm']>) => void
}

export const useBustanStore = create<BustanState>((set) => ({
  leadsById: {},
  role: 'viewer',
  setLeads: (leads) => set({ leadsById: Object.fromEntries(leads.map((l) => [l.property.id, l])) }),
  setRole: (role) => set({ role }),
  patchCrm: (propertyId, patch) =>
    set((state) => {
      const lead = state.leadsById[propertyId]
      if (!lead) return state
      return {
        leadsById: {
          ...state.leadsById,
          [propertyId]: { ...lead, crm: { ...lead.crm, ...patch } },
        },
      }
    }),
}))
