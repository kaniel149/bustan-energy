import { bustanSupabase } from './bustan-supabase'
import type { Property } from '../types'

/**
 * Fire-and-forget: kick off owner / decision-maker discovery for a just-approved
 * lead. Non-blocking — the find-contact pipeline (Nominatim/Overpass → DBD →
 * Firecrawl → Gemini) takes 10–25 s and persists to bustan.owner_decision when
 * done. If it fails (quota, no auth), the cron-enrich-contacts job picks the
 * lead up later, so this is best-effort and never surfaces an error to the user.
 */
export function triggerFindContact(property: Property): void {
  void (async () => {
    try {
      const sessionData = await bustanSupabase?.auth.getSession()
      const token = sessionData?.data?.session?.access_token
      if (!token) return
      const body: Record<string, unknown> = { lat: property.lat, lng: property.lng }
      if (property.id) body.propertyId = property.id
      if (property.title) body.name = property.title
      if (property.website) body.website = property.website
      await fetch('/api/admin-find-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
    } catch {
      /* non-fatal — cron-enrich-contacts will enrich this lead on its next pass */
    }
  })()
}
