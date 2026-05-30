/**
 * owner-resolution.ts — PURE, no network, no I/O.
 *
 * Builds region-aware deep-links that let a sales rep resolve a Thai rooftop
 * owner in seconds using free, legal, public registries.
 *
 * IMPORTANT — LEGAL DESIGN NOTE:
 * Owner NAME resolution is intentionally left as a MANUAL / REGISTRY step.
 * Thailand's Personal Data Protection Act (PDPA, B.E. 2562) restricts
 * automated collection of personal data without consent. The links below
 * open public government registries in the rep's browser; no data is
 * scraped or stored by this module. The rep copies relevant information
 * manually into the CRM fields.
 *
 * Israeli stubs (nadlan/Tabu) are included for future multi-region use but
 * Thailand / Ko Phangan is the default and primary target.
 */

export interface ResearchLink {
  label: string
  url: string
}

export interface OwnerResearchResult {
  /** Human-readable name of the primary registry for this region. */
  registryName: string
  /** Deep-links to open in a new browser tab for the rep to investigate. */
  links: ResearchLink[]
  /** One-line reminder about the manual/PDPA nature of this process. */
  note: string
}

export interface BuildOwnerResearchLinksInput {
  lat?: number
  lng?: number
  /** Known name fragment (company / owner) — used as a search hint in labels. */
  name?: string
  /** Human-readable address fragment, if already known. */
  address?: string
  /** Region identifier — defaults to 'koh_phangan' (Thailand). */
  region?: string
  /** Property type, e.g. 'commercial', 'industrial'. */
  propertyType?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function encodeParam(value: string): string {
  return encodeURIComponent(value)
}

function nominatimSearchUrl(query: string): string {
  return `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeParam(query)}&limit=5`
}

// ---------------------------------------------------------------------------
// Region builders
// ---------------------------------------------------------------------------

/** Thailand / Ko Phangan (default region). */
function buildThailandLinks(input: BuildOwnerResearchLinksInput): OwnerResearchResult {
  const { lat, lng, name, address } = input
  const links: ResearchLink[] = []

  // 1. Google Maps — visual confirmation of the rooftop location.
  if (lat != null && lng != null) {
    links.push({
      label: 'Google Maps — visual confirm rooftop',
      url: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    })
  }

  // 2. DBD (กรมพัฒนาธุรกิจการค้า) Data Warehouse — search juristic persons /
  //    companies by name. This is the primary free registry for company-owned
  //    commercial buildings, which are Bustan's main lead type.
  const dbdLabel = name
    ? `DBD — search company "${name}" (juristic persons)`
    : 'DBD — search juristic persons / companies'
  links.push({
    label: dbdLabel,
    url: 'https://datawarehouse.dbd.go.th/',
  })

  // 3. DBD main portal — alternative entry point with name-search UI.
  links.push({
    label: 'DBD portal (dbd.go.th) — company name search',
    url: 'https://www.dbd.go.th/main.php?filename=index',
  })

  // 4. Thai Land Department (กรมที่ดิน) — land title / parcel ownership.
  //    Manual lookup at district land office; no online parcel-owner API.
  links.push({
    label: 'Land Dept (dol.go.th) — parcel/title lookup (manual)',
    url: 'https://www.dol.go.th',
  })

  // 5. OSM Nominatim reverse-geocode — get the building's address as a
  //    free-text query you can paste into the registries above.
  if (lat != null && lng != null) {
    links.push({
      label: 'Nominatim reverse-geocode — get address for this lat/lng',
      url: `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=th,en`,
    })
  }

  // 6. Nominatim search fallback — use address or name fragment if available.
  const searchQuery = address || name
  if (searchQuery) {
    links.push({
      label: `Nominatim search — "${searchQuery}"`,
      url: nominatimSearchUrl(searchQuery),
    })
  }

  return {
    registryName: 'กรมพัฒนาธุรกิจการค้า (DBD) + กรมที่ดิน (Land Dept)',
    links,
    // PDPA reminder: displayed to the rep on every use.
    note: 'PDPA: ชื่อเจ้าของที่แท้จริงต้องค้นหาด้วยตนเองจากทะเบียนราชการ — ห้ามเก็บข้อมูลส่วนบุคคลโดยไม่ได้รับความยินยอม (Owner names must be resolved manually from public registries; do not collect personal data without consent — PDPA B.E. 2562).',
  }
}

/** Israel stub — nadlan.gov.il + Tabu (Israeli land registry). */
function buildIsraelLinks(input: BuildOwnerResearchLinksInput): OwnerResearchResult {
  const { lat, lng, name, address } = input
  const links: ResearchLink[] = []

  if (lat != null && lng != null) {
    links.push({
      label: 'Google Maps — visual confirm rooftop',
      url: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    })
  }

  // Nadlan — Israeli real-estate government portal (gush/helka lookup).
  links.push({
    label: 'Nadlan (gov.il) — גוש/חלקה parcel search',
    url: 'https://www.nadlan.gov.il/',
  })

  // Tabu (מרשם המקרקעין) — land registry, title deeds.
  links.push({
    label: 'Tabu (מרשם המקרקעין) — title deed / ownership',
    url: 'https://www.gov.il/he/departments/bureaus/land_registry',
  })

  if (lat != null && lng != null) {
    links.push({
      label: 'Nominatim reverse-geocode — get address',
      url: `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=he,en`,
    })
  }

  const searchQuery = address || name
  if (searchQuery) {
    links.push({
      label: `Nominatim search — "${searchQuery}"`,
      url: nominatimSearchUrl(searchQuery),
    })
  }

  return {
    registryName: 'נדל"ן (gov.il) + טאבו (מרשם המקרקעין)',
    links,
    note: 'שם הבעלים חייב להיות מאומת ידנית דרך הטאבו או נדל"ן — אין לאחסן מידע אישי ללא הסכמה.',
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build region-aware owner-research deep-links for a scanned rooftop lead.
 *
 * This function is PURE — no network calls, no side effects.
 * It only constructs URLs; the rep opens them manually in the browser.
 *
 * Owner NAME resolution is a MANUAL step by design:
 *   - Thailand: PDPA (B.E. 2562) gates automated personal data collection.
 *   - Israel: Tabu/Nadlan require authenticated browser access.
 *
 * @param input  Coordinates + optional context (name, address, region).
 * @returns      Registry name, deep-links, and a PDPA/legal reminder note.
 */
export function buildOwnerResearchLinks(input: BuildOwnerResearchLinksInput): OwnerResearchResult {
  const region = (input.region ?? 'koh_phangan').toLowerCase()

  if (region === 'israel' || region === 'il') {
    return buildIsraelLinks(input)
  }

  // Default: Thailand / Ko Phangan (covers koh_phangan, thailand, th, etc.)
  return buildThailandLinks(input)
}
