import type { Property } from '../types'
import type { CrmProject } from '../types/crm'

export function exportBuildingsCSV(properties: Property[]) {
  const headers = [
    'ID', 'Title', 'Type', 'Status', 'Region', 'Location',
    'Lat', 'Lng', 'Area_sqm', 'Area_Rai', 'Usable_Area', 'Capacity_kWp', 'Capacity_MWp',
    'Tier', 'Panel_Count', 'Annual_kWh', 'Annual_Savings_THB', 'EPC_Cost_THB',
    'Solar_Score', 'Priority', 'Category',
    'Owner', 'Phone', 'Website', 'Email',
  ]

  const rows = properties.map(p => {
    const capacityMwp = p.type === 'land' && p.capacityKwp ? (p.capacityKwp / 1000).toFixed(2) : ''
    return [
      p.id, p.title, p.type, p.status, p.region, p.location,
      p.lat, p.lng, p.area || p.sizeM2 || '', p.sizeRai || '', p.usableArea || '',
      p.capacityKwp || '', capacityMwp,
      p.tier || '', p.panelCount || '', p.annualKwh || '',
      p.annualSavings || '', p.epcCost || '', p.solarScore || '',
      p.priority || '', p.category || '',
      p.ownerName || '', p.phone || '', p.website || '', p.email || '',
    ]
  })

  downloadCSV(headers, rows, `buildings_${new Date().toISOString().slice(0, 10)}`)
}

export function exportLeadsCSV(projects: CrmProject[]) {
  const headers = [
    'ID', 'Client_Name', 'Business_Type', 'Phone', 'Email', 'LINE_ID',
    'Status', 'Priority', 'System_kWp', 'Deal_Value', 'Source', 'Created',
  ]

  const rows = projects.map(p => [
    p.id, p.client_name, p.business_type || '', p.client_phone || '',
    p.client_email || '', p.client_line_id || '', p.status, p.priority || '',
    p.system_size_kwp || '', p.deal_value || '', p.source || '',
    p.created_at || '',
  ])

  downloadCSV(headers, rows, `leads_${new Date().toISOString().slice(0, 10)}`)
}

function downloadCSV(headers: string[], rows: (string | number)[][], filename: string) {
  const escape = (v: string | number) => {
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }

  const csv = [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
