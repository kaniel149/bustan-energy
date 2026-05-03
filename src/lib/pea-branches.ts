// ── PEA / MEA branch definitions ─────────────────────────────────────────────
// Used across: application letter generator, drawings, UI dropdown.

export interface PEABranch {
  id: string
  name: string
  authority: 'PEA' | 'MEA'
  nameLocal: string // Thai
  address: string
  addressLocal: string // Thai
  phone: string
  email: string
  covers: string[]
  // Rough bounding box for auto-detection [minLat, maxLat, minLng, maxLng]
  bbox: [number, number, number, number]
}

export const PEA_BRANCHES: PEABranch[] = [
  {
    id: 'surat_thani',
    name: 'Surat Thani (Ko Phangan)',
    authority: 'PEA',
    nameLocal: 'การไฟฟ้าส่วนภูมิภาค สาขาสุราษฎร์ธานี',
    address: '235 Talat Mai Road, Talat, Mueang, Surat Thani 84000',
    addressLocal: '235 ถนนตลาดใหม่ ตำบลตลาด อำเภอเมือง สุราษฎร์ธานี 84000',
    phone: '+66-77-272-888',
    email: 'pea.suratthani@pea.co.th',
    covers: ['Ko Phangan', 'Ko Samui', 'Surat Thani', 'Ko Tao'],
    bbox: [8.5, 10.5, 98.5, 100.5],
  },
  {
    id: 'phuket',
    name: 'Phuket',
    authority: 'PEA',
    nameLocal: 'การไฟฟ้าส่วนภูมิภาค สาขาภูเก็ต',
    address: '95 Wichit Songkhram Road, Wichit, Mueang, Phuket 83000',
    addressLocal: '95 ถนนวิชิตสงคราม ตำบลวิชิต อำเภอเมือง ภูเก็ต 83000',
    phone: '+66-76-232-888',
    email: 'pea.phuket@pea.co.th',
    covers: ['Phuket', 'Phang Nga', 'Krabi'],
    bbox: [7.5, 8.5, 98.0, 98.8],
  },
  {
    id: 'chiang_mai',
    name: 'Chiang Mai',
    authority: 'PEA',
    nameLocal: 'การไฟฟ้าส่วนภูมิภาค สาขาเชียงใหม่',
    address: '221 Charoen Mueang Road, Chang Phueak, Mueang, Chiang Mai 50300',
    addressLocal: '221 ถนนเจริญเมือง ตำบลช้างเผือก อำเภอเมือง เชียงใหม่ 50300',
    phone: '+66-53-242-888',
    email: 'pea.chiangmai@pea.co.th',
    covers: ['Chiang Mai', 'Chiang Rai', 'Lamphun', 'Lampang'],
    bbox: [18.0, 20.5, 98.5, 101.5],
  },
  {
    id: 'chonburi',
    name: 'Chonburi (Eastern Seaboard)',
    authority: 'PEA',
    nameLocal: 'การไฟฟ้าส่วนภูมิภาค สาขาชลบุรี',
    address: '62/1 Sukhumvit Road, Bang Plasoi, Mueang, Chonburi 20000',
    addressLocal: '62/1 ถนนสุขุมวิท ตำบลบางปลาสร้อย อำเภอเมือง ชลบุรี 20000',
    phone: '+66-38-282-888',
    email: 'pea.chonburi@pea.co.th',
    covers: ['Chonburi', 'Pattaya', 'Rayong', 'Chachoengsao', 'Prachinburi'],
    bbox: [12.5, 14.0, 100.5, 102.0],
  },
  {
    id: 'bangkok_mea',
    name: 'MEA Bangkok',
    authority: 'MEA',
    nameLocal: 'การไฟฟ้านครหลวง (กฟน.)',
    address: '30 Chakraphong Road, Ban Phan Thom, Phra Nakhon, Bangkok 10200',
    addressLocal: '30 ถนนจักรพงษ์ แขวงบ้านพานถม เขตพระนคร กรุงเทพมหานคร 10200',
    phone: '+66-2-220-0000',
    email: 'callcenter@mea.or.th',
    covers: ['Bangkok', 'Nonthaburi', 'Samut Prakan'],
    bbox: [13.5, 14.0, 100.3, 100.9],
  },
]

/**
 * Detect PEA/MEA branch from GPS coordinates.
 * Falls back to Surat Thani (Bustan Energy's primary branch).
 */
export function detectBranch(lat: number, lng: number): PEABranch {
  const match = PEA_BRANCHES.find(
    (b) =>
      lat >= b.bbox[0] &&
      lat <= b.bbox[1] &&
      lng >= b.bbox[2] &&
      lng <= b.bbox[3],
  )
  return match ?? PEA_BRANCHES[0] // default: Surat Thani
}

/**
 * Look up branch by id (from project.pea_branch column).
 * Falls back to Surat Thani.
 */
export function getBranchById(id: string): PEABranch {
  return PEA_BRANCHES.find((b) => b.id === id) ?? PEA_BRANCHES[0]
}

/** Return human-readable label for pea_status enum value */
export const PEA_STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  package_ready: 'Package Ready',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  objected: 'Objected',
  resubmit_needed: 'Resubmit Needed',
  meter_installed: 'Meter Installed',
  commercial_operation: 'Commercial Operation',
}

export const PEA_STATUS_COLORS: Record<string, string> = {
  not_started: '#6b7280',
  package_ready: '#3b82f6',
  submitted: '#8b5cf6',
  under_review: '#f59e0b',
  approved: '#10b981',
  objected: '#ef4444',
  resubmit_needed: '#f97316',
  meter_installed: '#06b6d4',
  commercial_operation: '#22c55e',
}
