import jsPDF from 'jspdf'
import type { Property } from '../types'
import type { FinancialAnalysis } from './financial-calc'
import type { NasaPowerData } from './nasa-power'
import { computePanelLayout, layoutToSvg } from './panel-layout'

export interface ProposalData {
  property: Property
  financial: FinancialAnalysis
  nasaData?: NasaPowerData
  regionName: string
  /** URL of the on-roof panel overlay image (preferred). Fetched and embedded as a data URI. */
  roof_panels_url?: string
  /** URL of the original satellite roof image (fallback when panels URL is unavailable). */
  roof_original_url?: string
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Fetch a remote URL and return it as a base64 data URI. Returns null on any failure. */
async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function generateProposal(data: ProposalData): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4')
  const { property, financial, nasaData, regionName } = data
  const pageWidth = 210
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let y = margin

  // ---- Helper functions ----

  const addTitle = (text: string, size = 18) => {
    doc.setFontSize(size)
    doc.setTextColor(13, 33, 55)
    doc.setFont('helvetica', 'bold')
    doc.text(text, margin, y)
    y += size * 0.5
  }

  const addSubtitle = (text: string) => {
    doc.setFontSize(12)
    doc.setTextColor(232, 168, 32)
    doc.setFont('helvetica', 'bold')
    doc.text(text, margin, y)
    y += 7
  }

  const addText = (text: string, bold = false) => {
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.text(text, margin, y)
    y += 5
  }

  const addKeyValue = (key: string, value: string) => {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text(key, margin, y)
    doc.setTextColor(13, 33, 55)
    doc.setFont('helvetica', 'bold')
    doc.text(value, margin + 70, y)
    y += 6
  }

  const addDivider = () => {
    doc.setDrawColor(232, 168, 32)
    doc.setLineWidth(0.5)
    doc.line(margin, y, pageWidth - margin, y)
    y += 5
  }

  const addBox = (
    x: number,
    w: number,
    label: string,
    value: string,
    color: [number, number, number],
  ) => {
    doc.setFillColor(color[0], color[1], color[2])
    doc.roundedRect(x, y, w, 20, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'normal')
    doc.text(label, x + 4, y + 7)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(value, x + 4, y + 16)
  }

  // ---- PAGE 1: COVER + OVERVIEW ----

  // Header bar
  doc.setFillColor(13, 33, 55)
  doc.rect(0, 0, pageWidth, 50, 'F')
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('Solar Assessment Report', margin, 25)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(232, 168, 32)
  doc.text('Bustan Energy — Solar Intelligence Platform', margin, 35)
  doc.setFontSize(9)
  doc.setTextColor(180, 180, 180)
  const reportDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  doc.text(reportDate, pageWidth - margin - 50, 35)

  y = 60

  // Property Info
  addTitle(property.title || 'Solar Assessment', 16)
  y += 3

  addKeyValue('Location', property.location || regionName)
  addKeyValue('Type', property.type === 'roof' ? 'Rooftop Solar' : 'Community Solar (Land)')
  addKeyValue('Coordinates', `${property.lat.toFixed(5)}, ${property.lng.toFixed(5)}`)
  if (property.area) addKeyValue('Roof Area', `${property.area.toFixed(0)} m\u00B2`)
  if (property.sizeM2)
    addKeyValue(
      'Land Area',
      `${property.sizeM2.toFixed(0)} m\u00B2 (${(property.sizeM2 / 1600).toFixed(2)} rai)`,
    )
  if (property.priority) addKeyValue('Solar Priority', `Grade ${property.priority}`)
  if (property.category) addKeyValue('Category', property.category)
  y += 5

  addDivider()

  // Key metrics boxes
  const boxW = (contentWidth - 10) / 3
  addBox(margin, boxW, 'CAPACITY', `${financial.capacityKwp.toFixed(1)} kWp`, [46, 216, 154])
  addBox(
    margin + boxW + 5,
    boxW,
    'ANNUAL YIELD',
    `${(financial.annualKwhYear1 / 1000).toFixed(1)} MWh`,
    [232, 168, 32],
  )
  addBox(
    margin + (boxW + 5) * 2,
    boxW,
    'PAYBACK',
    `${financial.paybackYears.toFixed(1)} yrs`,
    [232, 93, 58],
  )
  y += 28

  // Solar Irradiance (NASA data section)
  if (nasaData) {
    addSubtitle('Solar Irradiance Data (NASA POWER)')
    addKeyValue('Annual GHI', `${nasaData.annualGHI.toFixed(2)} kWh/m\u00B2/day`)
    addKeyValue('Best Month', nasaData.bestMonth)
    addKeyValue('Lowest Month', nasaData.worstMonth)
    addKeyValue('Average Temperature', `${nasaData.annualTemp.toFixed(1)}\u00B0C`)

    // Monthly irradiance mini bar chart
    y += 3
    const barMaxH = 20
    const barW = contentWidth / 12 - 1
    const maxGHI = Math.max(...nasaData.monthlyGHI)
    for (let i = 0; i < 12; i++) {
      const barH = maxGHI > 0 ? (nasaData.monthlyGHI[i] / maxGHI) * barMaxH : 0
      const x = margin + i * (barW + 1)
      doc.setFillColor(232, 168, 32)
      doc.rect(x, y + barMaxH - barH, barW, barH, 'F')
      doc.setFontSize(6)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120, 120, 120)
      doc.text(MONTH_SHORT[i], x + 1, y + barMaxH + 5)
    }
    y += barMaxH + 10
  }

  addDivider()

  // ---- FINANCIAL ANALYSIS ----
  addSubtitle('Financial Analysis')

  addKeyValue(
    'System Capacity',
    `${financial.capacityKwp.toFixed(1)} kWp (${financial.panelCount} panels)`,
  )
  addKeyValue(
    'Annual Production (Year 1)',
    `${financial.annualKwhYear1.toLocaleString()} kWh`,
  )
  addKeyValue('EPC Installation Cost', `\u0E3F${financial.epcCost.toLocaleString()}`)
  addKeyValue('Annual O&M Cost', `\u0E3F${financial.annualOMCost.toLocaleString()}`)
  y += 2
  addKeyValue(
    'Annual Savings (Year 1)',
    `\u0E3F${financial.annualSavingsYear1.toLocaleString()}`,
  )
  addKeyValue(
    'Monthly Revenue',
    `\u0E3F${(financial.monthlyRevenue[0] ?? 0).toLocaleString()}`,
  )
  y += 2
  addKeyValue('Simple Payback', `${financial.paybackYears.toFixed(1)} years`)
  addKeyValue('25-Year ROI', `${financial.roi25Year.toFixed(0)}%`)
  addKeyValue('Internal Rate of Return (IRR)', `${(financial.irr * 100).toFixed(1)}%`)
  addKeyValue('Net Present Value (NPV)', `\u0E3F${financial.npv.toLocaleString()}`)
  addKeyValue('LCOE', `\u0E3F${financial.lcoe.toFixed(2)}/kWh`)

  y += 5
  addDivider()

  // ---- ENVIRONMENTAL IMPACT ----
  addSubtitle('Environmental Impact')
  addKeyValue(
    '25-Year Energy Production',
    `${(financial.lifetimeKwh / 1000000).toFixed(1)} GWh`,
  )
  addKeyValue(
    '25-Year Financial Savings',
    `\u0E3F${financial.lifetimeSavings.toLocaleString()}`,
  )
  addKeyValue(
    'CO\u2082 Emissions Avoided',
    `${financial.co2Avoided.toFixed(0)} tons CO\u2082`,
  )
  addKeyValue(
    'Equivalent Trees Planted',
    `${(financial.co2Avoided * 45).toFixed(0)} trees`,
  )

  // Grid proximity (if available)
  if (property.gridProximity) {
    y += 5
    addDivider()
    addSubtitle('Grid Connection')
    addKeyValue(
      'Grid Grade',
      `${property.gridProximity.grade} \u2014 ${property.gridProximity.distanceMeters.toFixed(0)}m`,
    )
    addKeyValue('Nearest Infrastructure', property.gridProximity.nearestFeatureName)
    addKeyValue(
      'Est. Connection Cost',
      `\u0E3F${property.gridProximity.estimatedConnectionCost.toLocaleString()}`,
    )
  }

  // ---- YOUR ROOF / PANEL LAYOUT PAGE ----
  // Attempt to embed a roof visual. Priority order:
  //   1. roof_panels_url (panel overlay image — fetch as data URI, addImage)
  //   2. roof_original_url (satellite image — same path)
  //   3. property.roofGeom (compute layout → SVG → addSvgAsImage)
  // If none are available the section is silently skipped.

  let roofImageEmbedded = false

  // Helper: try to embed a remote image URL
  const tryEmbedUrl = async (url: string, caption: string): Promise<boolean> => {
    if (!url) return false
    const dataUrl = await urlToDataUrl(url)
    if (!dataUrl) return false
    try {
      doc.addPage()
      y = margin  // reset cursor to top of new page
      addSubtitle('Proposed Panel Layout on Your Roof')
      const imgW = contentWidth
      const imgH = Math.min(120, imgW * 0.6) // max 120mm tall, ~3:5 ratio
      doc.addImage(dataUrl, 'JPEG', margin, y + 2, imgW, imgH)
      y = y + 2 + imgH + 4
      doc.setFontSize(8)
      doc.setTextColor(120, 120, 120)
      doc.setFont('helvetica', 'normal')
      doc.text(caption, margin, y)
      return true
    } catch {
      return false
    }
  }

  if (data.roof_panels_url) {
    roofImageEmbedded = await tryEmbedUrl(
      data.roof_panels_url,
      'On-roof panel placement — generated from roof polygon survey',
    )
  }

  if (!roofImageEmbedded && data.roof_original_url) {
    roofImageEmbedded = await tryEmbedUrl(
      data.roof_original_url,
      'Satellite image of roof — panel overlay not available',
    )
  }

  if (!roofImageEmbedded && property.roofGeom) {
    // Generate SVG schematic from the drawn polygon
    try {
      const layout = computePanelLayout(property.roofGeom)
      if (layout.count > 0) {
        const svgStr = layoutToSvg(layout, { width: 560, height: 360 })
        doc.addPage()
        y = margin  // reset cursor to top of new page
        addSubtitle('Proposed Panel Layout on Your Roof')
        const svgW = contentWidth
        const svgH = svgW * (360 / 560)
        // addSvgAsImage(svg, x, y, w, h) — dimensions in mm
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(doc as any).addSvgAsImage(svgStr, margin, y + 2, svgW, svgH)
        y = y + 2 + svgH + 6
        doc.setFontSize(8)
        doc.setTextColor(120, 120, 120)
        doc.setFont('helvetica', 'normal')
        doc.text(
          `Panel layout schematic: ${layout.count} panels · ${layout.capacityKwp.toFixed(2)} kWp · derived from drawn roof polygon`,
          margin,
          y,
        )
      }
    } catch {
      // no roof visual available — skip gracefully
    }
  }

  // ---- FOOTER ----
  const footerY = 280
  doc.setFillColor(13, 33, 55)
  doc.rect(0, footerY, pageWidth, 17, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 180, 180)
  doc.text('Generated by Bustan Energy Solar Intelligence Platform', margin, footerY + 7)
  doc.text(`Report Date: ${new Date().toISOString().slice(0, 10)}`, margin, footerY + 12)
  doc.setTextColor(232, 168, 32)
  doc.text('www.tmenergy.co | k@kanielt.com', pageWidth - margin - 60, footerY + 7)

  // Suppress unused variable warning
  void addText

  // Save
  const filename = `solar-report-${property.id}-${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
}
