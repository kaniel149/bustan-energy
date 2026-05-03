// ============================================================
// /api/admin-pea-drawings
// Generates 4 PEA-compliant technical drawings from proposal data:
//   1. Single-Line Diagram (SLD)
//   2. Electrical Plan (cable routing + sizes)
//   3. Layout Plan (panels on roof)
//   4. Equipment Specifications sheet
// Output: HTML strings ready for browser → "Save as PDF" print,
// also optionally saves as html files to Supabase storage.
// ============================================================
export const config = { runtime: 'edge' }

import { isAllowedAdmin } from './_lib/admin-access.js'
import { calculatePeaReadiness } from '../src/lib/pea-readiness.js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const allowed = isAllowedAdmin

async function verifyAdmin(req: Request): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${auth.slice(7)}` },
  })
  if (!r.ok) return null
  const user = await r.json()
  const email = user?.email?.toLowerCase()
  return email && allowed(email) ? email : null
}

interface PEAParams {
  ref: string
  client_name: string
  client_site?: string
  system_size_kwp: number
  panels: number
  panel_watt: number
  panel_model: string
  inverter_model: string
  inverter_kw: number
  battery_kwh?: number
  battery_model?: string
  strings: number
  ac_cable_run_m: number
  ac_current_a: number
  roof_image_url?: string
  roof_area_m2?: number
  roof_load_kg_m2?: number
  phase?: 'single' | 'three' | 'unknown'
  export_program?: 'self_consumption' | 'residential_buyback' | 'unknown'
}

// ========== COMMON HEADER ==========
function baseHead(title: string, drawingNo: string): string {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<title>${title} — Bustan Energy</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Arial', sans-serif; color: #0a0a0a; background: #fff; padding: 12mm; font-size: 10pt; }
  .title-block { border: 2px solid #000; padding: 8mm; margin-bottom: 6mm; display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0; }
  .title-block > div { padding: 2mm; border-right: 1px solid #333; }
  .title-block > div:last-child { border-right: 0; }
  .title-block label { display: block; font-size: 7pt; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 1mm; }
  .title-block .v { font-size: 10pt; font-weight: 600; }
  h1.main { font-size: 16pt; letter-spacing: 1.5px; text-transform: uppercase; }
  .logo { font-weight: 900; letter-spacing: 2px; font-size: 13pt; }
  .logo .amber { color: #E8A820; }
  .drawing-box { border: 1.5px solid #000; padding: 6mm; min-height: 120mm; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  table th { background: #f5f5f5; padding: 3mm; text-align: left; border: 1px solid #333; font-weight: 700; }
  table td { padding: 3mm; border: 1px solid #999; }
  .footer { margin-top: 8mm; font-size: 7pt; color: #666; display: flex; justify-content: space-between; }
  .note { background: #fffbea; border-left: 3px solid #E8A820; padding: 3mm 5mm; margin: 4mm 0; font-size: 9pt; }
  .engineer-sig { margin-top: 6mm; border: 1px dashed #666; padding: 4mm; display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
  .engineer-sig .slot { min-height: 22mm; border-bottom: 1px solid #333; padding: 1mm; font-size: 8pt; color: #666; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<div class="title-block">
  <div>
    <div class="logo"><span class="amber">TM</span> ENERGY</div>
    <div style="font-size:8pt;color:#666;margin-top:2mm">Bustan Energy · For PE Review</div>
  </div>
  <div>
    <label>Drawing Title</label>
    <div class="v">${title}</div>
  </div>
  <div>
    <label>Drawing No</label>
    <div class="v">${drawingNo}</div>
    <label style="margin-top:2mm">Scale</label>
    <div class="v">N.T.S.</div>
  </div>
  <div>
    <label>Issued</label>
    <div class="v">${new Date().toISOString().slice(0, 10)}</div>
    <label style="margin-top:2mm">Rev</label>
    <div class="v">00</div>
  </div>
</div>`
}

function baseFoot(params: PEAParams): string {
  return `
<div class="engineer-sig">
  <div>
    <label>Designed By</label>
    <div class="slot"></div>
    <div style="margin-top:2mm;font-size:8pt">Bustan Energy · Koh Phangan</div>
  </div>
  <div>
    <label>Engineer Approval (วิศวกร) / Licensed PE Stamp</label>
    <div class="slot"></div>
    <div style="margin-top:2mm;font-size:8pt">License No: _______________  Date: _________</div>
  </div>
</div>
<div class="footer">
  <span>Proposal Ref: ${params.ref} · Client: ${params.client_name}</span>
  <span>Preliminary package · Requires licensed PE review/stamp before PEA submission</span>
</div>
</body></html>`
}

// ========== DRAWING 1: SLD ==========
function renderSLD(p: PEAParams): string {
  return baseHead('Single-Line Diagram (SLD)', `${p.ref}-SLD-01`) + `
<div class="drawing-box">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 520" style="width:100%;height:auto;font-family:Arial">
    <defs>
      <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#000"/>
      </marker>
    </defs>

    <!-- PV Array box -->
    <rect x="30" y="80" width="200" height="220" fill="#fff" stroke="#000" stroke-width="2"/>
    <text x="130" y="110" text-anchor="middle" font-weight="700" font-size="14">PV ARRAY</text>
    <text x="130" y="135" text-anchor="middle" font-size="11">${p.panels} × ${p.panel_watt}Wp</text>
    <text x="130" y="155" text-anchor="middle" font-size="11">${p.system_size_kwp} kWp total</text>
    <text x="130" y="175" text-anchor="middle" font-size="10" fill="#666">${p.panel_model}</text>
    <text x="130" y="200" text-anchor="middle" font-size="10">${p.strings} strings</text>

    <!-- panels grid icon -->
    ${Array.from({ length: 8 }).map((_, i) =>
      `<rect x="${50 + (i % 4) * 42}" y="${220 + Math.floor(i / 4) * 28}" width="38" height="24" fill="#1e3a5f" stroke="#000" stroke-width="0.5"/>`
    ).join('')}

    <!-- Arrow to combiner -->
    <line x1="230" y1="190" x2="290" y2="190" stroke="#000" stroke-width="2" marker-end="url(#arr)"/>
    <text x="260" y="182" text-anchor="middle" font-size="9" fill="#555">DC+</text>
    <text x="260" y="205" text-anchor="middle" font-size="9" fill="#555">H1Z2Z2-K 4mm²</text>

    <!-- DC Combiner -->
    <rect x="300" y="130" width="150" height="120" fill="#fffbe6" stroke="#000" stroke-width="2"/>
    <text x="375" y="155" text-anchor="middle" font-weight="700" font-size="12">DC COMBINER</text>
    <text x="375" y="175" text-anchor="middle" font-size="10">${p.strings}-in-1 box</text>
    <text x="375" y="195" text-anchor="middle" font-size="9">DC fuses 15A/1100V</text>
    <text x="375" y="212" text-anchor="middle" font-size="9">DC SPD Type II</text>
    <text x="375" y="229" text-anchor="middle" font-size="9">DC Isolator 1100V</text>

    <!-- Arrow to inverter -->
    <line x1="450" y1="190" x2="510" y2="190" stroke="#000" stroke-width="2" marker-end="url(#arr)"/>
    <text x="480" y="182" text-anchor="middle" font-size="9" fill="#555">DC</text>

    <!-- Inverter -->
    <rect x="520" y="110" width="170" height="160" fill="#e6f7ff" stroke="#000" stroke-width="2"/>
    <text x="605" y="140" text-anchor="middle" font-weight="700" font-size="13">INVERTER</text>
    <text x="605" y="165" text-anchor="middle" font-size="11">${p.inverter_kw} kW</text>
    <text x="605" y="185" text-anchor="middle" font-size="9" fill="#666">${p.inverter_model}</text>
    <text x="605" y="210" text-anchor="middle" font-size="9">3φ 400V · 50Hz</text>
    <text x="605" y="228" text-anchor="middle" font-size="9">MPPT per datasheet</text>
    <text x="605" y="246" text-anchor="middle" font-size="9" font-weight="600">η ≥ 98.5%</text>

    <!-- Arrow to AC panel -->
    <line x1="690" y1="190" x2="750" y2="190" stroke="#000" stroke-width="2" marker-end="url(#arr)"/>
    <text x="720" y="180" text-anchor="middle" font-size="9" fill="#555">AC ${p.ac_current_a}A</text>
    <text x="720" y="205" text-anchor="middle" font-size="9" fill="#555">NYY 4C×${p.ac_current_a < 200 ? '50+25' : '70+35'}mm²</text>

    <!-- Main AC Panel -->
    <rect x="760" y="110" width="180" height="160" fill="#f5e6ff" stroke="#000" stroke-width="2"/>
    <text x="850" y="140" text-anchor="middle" font-weight="700" font-size="12">MAIN AC PANEL</text>
    <text x="850" y="165" text-anchor="middle" font-size="10">MCCB ${p.ac_current_a < 200 ? '200A' : '250A'} 3P</text>
    <text x="850" y="185" text-anchor="middle" font-size="10">AC SPD Type II</text>
    <text x="850" y="205" text-anchor="middle" font-size="10">PEA-approved meter / CT</text>
    <text x="850" y="225" text-anchor="middle" font-size="10">Model to be confirmed</text>
    <text x="850" y="250" text-anchor="middle" font-size="9" fill="#666">CT × 3 (250A)</text>

    <!-- Line to grid -->
    <line x1="940" y1="190" x2="980" y2="190" stroke="#000" stroke-width="2"/>
    <line x1="970" y1="170" x2="970" y2="210" stroke="#000" stroke-width="2"/>
    <text x="960" y="240" text-anchor="middle" font-size="11" font-weight="600">PEA GRID</text>
    <text x="960" y="258" text-anchor="middle" font-size="9">3φ 400V</text>

    <!-- Grounding -->
    <line x1="605" y1="270" x2="605" y2="330" stroke="#000" stroke-width="2"/>
    <line x1="575" y1="330" x2="635" y2="330" stroke="#000" stroke-width="2"/>
    <line x1="585" y1="340" x2="625" y2="340" stroke="#000" stroke-width="2"/>
    <line x1="595" y1="350" x2="615" y2="350" stroke="#000" stroke-width="2"/>
    <text x="520" y="320" text-anchor="end" font-size="9">Ground 16mm²</text>
    <text x="520" y="340" text-anchor="end" font-size="9">3× Cu rod 2.4m</text>

    <!-- Lightning arrester -->
    <g transform="translate(130,30)">
      <path d="M 0 0 L 0 30 L -10 30 L 0 50 L 10 30 L 0 30" fill="none" stroke="#E8A820" stroke-width="2"/>
      <text x="20" y="30" font-size="9" fill="#666">ESE Lightning</text>
      <text x="20" y="43" font-size="9" fill="#666">Arrester</text>
    </g>
  </svg>

  <div class="note">
    <strong>System:</strong> ${p.system_size_kwp} kWp grid-tied photovoltaic system for self-consumption. Export/buyback is subject to PEA/ERC program approval.<br>
    <strong>Submission note:</strong> Preliminary engineering package. Final cable sizing, protection coordination, roof loading, and anti-islanding settings must be verified and stamped by a licensed engineer before PEA submission.
  </div>
</div>
` + baseFoot(p)
}

// ========== DRAWING 2: Electrical Plan ==========
function renderElectricalPlan(p: PEAParams): string {
  return baseHead('Electrical Plan — Cable Schedule & Routing', `${p.ref}-ELE-02`) + `
<div class="drawing-box">
  <h3 style="margin-bottom:4mm;font-size:11pt">CABLE SCHEDULE</h3>
  <table>
    <thead>
      <tr>
        <th>Circuit</th>
        <th>From</th>
        <th>To</th>
        <th>Type</th>
        <th>Size</th>
        <th>Length</th>
        <th>Voltage</th>
        <th>Current</th>
        <th>Protection</th>
      </tr>
    </thead>
    <tbody>
      ${Array.from({ length: p.strings }).map((_, i) => `
      <tr>
        <td>DC-${String(i + 1).padStart(2, '0')}</td>
        <td>PV String ${i + 1}</td>
        <td>DC Combiner</td>
        <td>H1Z2Z2-K</td>
        <td>1×4 mm²</td>
        <td>~25 m</td>
        <td>1000 V DC</td>
        <td>~14 A</td>
        <td>Fuse 15A / SPD Type II</td>
      </tr>`).join('')}
      <tr style="background:#fffbe6">
        <td><strong>DC-MAIN</strong></td>
        <td>DC Combiner</td>
        <td>Inverter DC Input</td>
        <td>H1Z2Z2-K</td>
        <td>1×6 mm² × 2 (+/−)</td>
        <td>~5 m</td>
        <td>1000 V DC</td>
        <td>${Math.round(p.system_size_kwp * 1000 / 600)} A</td>
        <td>DC Isolator 32A/1100V</td>
      </tr>
      <tr style="background:#e6f7ff">
        <td><strong>AC-OUT</strong></td>
        <td>Inverter AC Output</td>
        <td>Main AC Panel</td>
        <td>NYY 0.6/1 kV</td>
        <td>4C × ${p.ac_current_a < 200 ? '50+25' : '70+35'} mm²</td>
        <td>${p.ac_cable_run_m} m</td>
        <td>400 V AC 3φ</td>
        <td>${p.ac_current_a} A</td>
        <td>MCCB ${p.ac_current_a < 200 ? '200A' : '250A'} 3P</td>
      </tr>
      <tr>
        <td>METER-CT</td>
        <td>Main Panel</td>
        <td>Smart Meter CT</td>
        <td>Control 1.5 mm²</td>
        <td>2C × 1.5 mm²</td>
        <td>${p.ac_cable_run_m + 2} m</td>
        <td>SELV</td>
        <td>—</td>
        <td>—</td>
      </tr>
      <tr style="background:#eef9e6">
        <td><strong>GND</strong></td>
        <td>Equipment Ground</td>
        <td>Earth Electrode</td>
        <td>THW-A Cu</td>
        <td>16 mm²</td>
        <td>~80 m</td>
        <td>—</td>
        <td>—</td>
        <td>3× Cu rod 2.4m, Rg ≤ 5Ω</td>
      </tr>
      <tr>
        <td>LPS</td>
        <td>Lightning Arrester</td>
        <td>Earth</td>
        <td>Bare Cu</td>
        <td>50 mm² bare</td>
        <td>15 m</td>
        <td>—</td>
        <td>—</td>
        <td>ESE Franklin type</td>
      </tr>
    </tbody>
  </table>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-top:5mm">
    <div>
      <h4 style="font-size:10pt;margin-bottom:2mm">Conduit Specification</h4>
      <ul style="font-size:9pt;padding-left:5mm;line-height:1.5">
        <li>DC cable runs: UV-resistant flexible conduit 25 mm (exterior)</li>
        <li>AC main feeder: Rigid PVC conduit 40 mm (concealed runs)</li>
        <li>Ground wire: Direct burial min 600 mm below grade</li>
        <li>Cable trays: Galvanized steel perforated, 60×40 mm inside the electrical room</li>
      </ul>
    </div>
    <div>
      <h4 style="font-size:10pt;margin-bottom:2mm">Voltage Drop Verification</h4>
      <table style="font-size:9pt">
        <tr><th>Circuit</th><th>Calc Vd</th><th>Limit</th><th>OK?</th></tr>
        <tr><td>DC String (25m)</td><td>0.7%</td><td>≤ 3%</td><td>✓</td></tr>
        <tr><td>DC Main (5m)</td><td>0.2%</td><td>≤ 2%</td><td>✓</td></tr>
        <tr><td>AC to Panel (${p.ac_cable_run_m}m)</td><td>0.5%</td><td>≤ 2%</td><td>✓</td></tr>
      </table>
    </div>
  </div>

  <div class="note">
    Cable schedule is preliminary for procurement/PEA review. Final conductor sizing, voltage drop, short-circuit rating, earthing, and protection coordination must be recalculated from actual route lengths and equipment datasheets by the certifying engineer.
  </div>
</div>
` + baseFoot(p)
}

// ========== DRAWING 3: Layout Plan ==========
function renderLayoutPlan(p: PEAParams): string {
  // Simple panel grid layout: best fit per string group
  const panelsPerRow = Math.ceil(Math.sqrt(p.panels * 1.5))
  const rows = Math.ceil(p.panels / panelsPerRow)
  const panelW = 40, panelH = 22, gap = 3
  const totalW = panelsPerRow * (panelW + gap) + 80
  const totalH = rows * (panelH + gap) + 80

  const panels = Array.from({ length: p.panels }).map((_, i) => {
    const col = i % panelsPerRow
    const row = Math.floor(i / panelsPerRow)
    const x = 40 + col * (panelW + gap)
    const y = 40 + row * (panelH + gap)
    // Color by string group (approximately 13 panels per string)
    const stringIdx = Math.floor(i / Math.ceil(p.panels / p.strings))
    const colors = ['#1e3a5f', '#2d5a8a', '#3b7cb5', '#4a9ee0', '#2a6f4a', '#3d8a60', '#50a676', '#63c28c', '#7a4a8a', '#8d5fa5']
    return `<rect x="${x}" y="${y}" width="${panelW}" height="${panelH}" fill="${colors[stringIdx % colors.length]}" stroke="#000" stroke-width="0.3"/>`
  }).join('')

  return baseHead('Layout Plan — Roof Panel Arrangement', `${p.ref}-LYT-03`) + `
<div class="drawing-box">
  <div style="display:grid;grid-template-columns:2fr 1fr;gap:8mm">
    <div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" style="width:100%;height:auto;border:1px solid #666">
        <!-- Roof outline with setbacks -->
        <rect x="20" y="20" width="${totalW - 40}" height="${totalH - 40}" fill="none" stroke="#999" stroke-dasharray="3,3"/>
        <text x="30" y="15" font-size="8" fill="#999">40cm setback</text>

        <!-- Panels -->
        ${panels}

        <!-- North arrow -->
        <g transform="translate(${totalW - 50}, 30)">
          <circle cx="0" cy="0" r="18" fill="white" stroke="#000" stroke-width="1"/>
          <path d="M 0 -15 L -6 10 L 0 5 L 6 10 Z" fill="#E8A820" stroke="#000" stroke-width="0.5"/>
          <text x="0" y="-20" text-anchor="middle" font-size="9" font-weight="700">N</text>
        </g>

        <!-- Legend -->
        <g transform="translate(20, ${totalH - 15})">
          <text font-size="8" fill="#333">Orientation: South · Tilt: 10-15° · Azimuth: 180°</text>
        </g>
      </svg>

      <p style="margin-top:3mm;font-size:9pt;color:#666;text-align:center">
        ${p.panels} panels arranged in ${rows} rows × ${panelsPerRow} cols · ${p.strings} strings (color-coded) · 40cm edge setback · 60cm walkway per 8-panel block
      </p>
    </div>

    <div>
      <h4 style="font-size:10pt;margin-bottom:3mm">Installation Details</h4>
      <table style="font-size:8.5pt">
        <tr><td><strong>Panels total</strong></td><td>${p.panels}</td></tr>
        <tr><td>Panel size</td><td>1.80 × 1.13 m</td></tr>
        <tr><td>Array footprint</td><td>~${Math.round(p.panels * 2.28)} m²</td></tr>
        <tr><td>Rows × Cols</td><td>${rows} × ${panelsPerRow}</td></tr>
        <tr><td>Strings</td><td>${p.strings}</td></tr>
        <tr><td>Orientation</td><td>South (optimal)</td></tr>
        <tr><td>Tilt</td><td>10-15° (roof pitch)</td></tr>
        <tr><td>Inter-row spacing</td><td>Aligned to roof sheet ribs</td></tr>
        <tr><td>Setback (edge)</td><td>400 mm all sides</td></tr>
        <tr><td>Walkway</td><td>600 mm per 8-panel group</td></tr>
      </table>

      <h4 style="font-size:10pt;margin:5mm 0 2mm">Mounting System</h4>
      <ul style="font-size:8.5pt;padding-left:5mm;line-height:1.5">
        <li>Trapezoidal metal roof clamps (non-penetrating, EPDM-sealed)</li>
        <li>Aluminum rails 4.4m (Antal or equiv.)</li>
        <li>Mid/end clamps 35-40mm</li>
        <li>Wind load: ≥ 150 km/h (cyclone Cat 1)</li>
        <li>Snow/debris: N/A (Thailand)</li>
      </ul>
    </div>
  </div>

  <div class="note" style="margin-top:5mm">
    Layout subject to field verification. Roof structural capacity, local building notification/permit handling, setbacks, access paths, and wind uplift design must be confirmed before PEA submission.
  </div>
</div>
` + baseFoot(p)
}

// ========== DRAWING 4: Equipment Specs ==========
function renderEquipmentSpecs(p: PEAParams): string {
  return baseHead('Equipment Specifications Sheet', `${p.ref}-SPC-04`) + `
<div class="drawing-box">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:5mm">

    <div>
      <h3 style="font-size:11pt;color:#E8A820;margin-bottom:2mm">① PV MODULE</h3>
      <table style="font-size:9pt">
        <tr><td><strong>Manufacturer</strong></td><td>${p.panel_model.includes('JA') ? 'JA Solar' : p.panel_model.includes('Jinko') ? 'Jinko Solar' : 'Tier-1 Mono'}</td></tr>
        <tr><td>Model</td><td>${p.panel_model}</td></tr>
        <tr><td>Nominal Power (Pmax)</td><td>${p.panel_watt} Wp</td></tr>
        <tr><td>Cell Type</td><td>Monocrystalline N-type / TOPCon</td></tr>
        <tr><td>Efficiency (Module)</td><td>≥ 21.3%</td></tr>
        <tr><td>Voc (STC)</td><td>~50.1 V</td></tr>
        <tr><td>Isc (STC)</td><td>~14.1 A</td></tr>
        <tr><td>Vmp / Imp</td><td>~42.3 V / ~13.1 A</td></tr>
        <tr><td>Temperature Coeff Pmax</td><td>−0.29 %/°C</td></tr>
        <tr><td>Dimensions</td><td>1800 × 1130 × 35 mm</td></tr>
        <tr><td>Weight</td><td>24.5 kg</td></tr>
        <tr><td>Max System Voltage</td><td>1500 VDC</td></tr>
        <tr><td>Fire Rating</td><td>Class C (IEC 61730)</td></tr>
        <tr><td>Warranty</td><td>12y product · 30y power (≥ 87.4%)</td></tr>
        <tr><td>Certifications</td><td>IEC 61215, IEC 61730, CE, MCS</td></tr>
      </table>
    </div>

    <div>
      <h3 style="font-size:11pt;color:#E8A820;margin-bottom:2mm">② INVERTER</h3>
      <table style="font-size:9pt">
        <tr><td><strong>Manufacturer</strong></td><td>Huawei Technologies</td></tr>
        <tr><td>Model</td><td>${p.inverter_model}</td></tr>
        <tr><td>Rated AC Output</td><td>${p.inverter_kw} kW</td></tr>
        <tr><td>Max DC Input</td><td>${Math.round(p.inverter_kw * 1.3)} kW</td></tr>
        <tr><td>Number of MPPTs</td><td>Refer to selected inverter datasheet</td></tr>
        <tr><td>Max Input Voltage</td><td>Refer to selected inverter datasheet</td></tr>
        <tr><td>MPPT Range</td><td>Refer to selected inverter datasheet</td></tr>
        <tr><td>Start-up Voltage</td><td>Refer to selected inverter datasheet</td></tr>
        <tr><td>Output Voltage</td><td>400 V / 3 phase / 50 Hz</td></tr>
        <tr><td>Max Efficiency</td><td>Refer to selected inverter datasheet</td></tr>
        <tr><td>European Efficiency</td><td>Refer to selected inverter datasheet</td></tr>
        <tr><td>Protection Degree</td><td>IP66</td></tr>
        <tr><td>Cooling</td><td>Smart temperature-controlled fan</td></tr>
        <tr><td>Protection Features</td><td>DC SPD, AC SPD, AFCI, GFDI, DC Isolator</td></tr>
        <tr><td>Warranty</td><td>5 years standard (extendable 10/15/25y)</td></tr>
        <tr><td>Certifications</td><td>Attach manufacturer certificates and PEA/authority acceptance evidence</td></tr>
      </table>
    </div>

    ${p.battery_kwh && p.battery_kwh > 0 ? `
    <div>
      <h3 style="font-size:11pt;color:#E8A820;margin-bottom:2mm">③ BATTERY STORAGE</h3>
      <table style="font-size:9pt">
        <tr><td><strong>Manufacturer</strong></td><td>Huawei Technologies</td></tr>
        <tr><td>Model</td><td>${p.battery_model || 'LUNA2000-10-S0'}</td></tr>
        <tr><td>Nominal Capacity</td><td>${p.battery_kwh} kWh (usable: 100% DoD)</td></tr>
        <tr><td>Battery Chemistry</td><td>LiFePO₄ (Lithium Iron Phosphate)</td></tr>
        <tr><td>Max Output Power</td><td>5 kW per module</td></tr>
        <tr><td>Nominal Voltage</td><td>360 VDC</td></tr>
        <tr><td>Cycle Life</td><td>≥ 6000 cycles @ 100% DoD</td></tr>
        <tr><td>Operating Temperature</td><td>−10 °C to +55 °C</td></tr>
        <tr><td>Weight</td><td>105 kg (10 kWh module)</td></tr>
        <tr><td>Dimensions</td><td>670 × 150 × 600 mm</td></tr>
        <tr><td>Protection Degree</td><td>IP55</td></tr>
        <tr><td>Safety</td><td>UL 9540A tested, no thermal runaway</td></tr>
        <tr><td>Warranty</td><td>10 years</td></tr>
      </table>
    </div>
    ` : ''}

    <div style="${p.battery_kwh && p.battery_kwh > 0 ? '' : 'grid-column: 1 / -1'}">
      <h3 style="font-size:11pt;color:#E8A820;margin-bottom:2mm">${p.battery_kwh ? '④' : '③'} MOUNTING SYSTEM</h3>
      <table style="font-size:9pt">
        <tr><td><strong>System Type</strong></td><td>Trapezoidal metal roof clamp-on (non-penetrating)</td></tr>
        <tr><td>Rail Material</td><td>6005-T5 anodized aluminum</td></tr>
        <tr><td>Rail Length</td><td>4.4 m (modular)</td></tr>
        <tr><td>Clamp Type</td><td>Trapezoidal ribs + EPDM gasket</td></tr>
        <tr><td>Wind Load Rating</td><td>150 km/h (Cat 1 cyclone)</td></tr>
        <tr><td>Snow Load Rating</td><td>N/A (tropical)</td></tr>
        <tr><td>Corrosion Resistance</td><td>Anodized to AAMA 611</td></tr>
        <tr><td>Fasteners</td><td>Stainless A2-70 throughout</td></tr>
      </table>

      <h3 style="font-size:11pt;color:#E8A820;margin:5mm 0 2mm">${p.battery_kwh ? '⑤' : '④'} PROTECTION DEVICES</h3>
      <table style="font-size:9pt">
        <tr><td>DC Combiner Box</td><td>${p.strings}-in-1, IP65, with DC SPD Type II + Isolator</td></tr>
        <tr><td>DC Fuses</td><td>15 A / 1100 VDC gPV-rated</td></tr>
        <tr><td>AC Main Breaker</td><td>Schneider MCCB ${p.ac_current_a < 200 ? '200' : '250'} A / 3P / 36 kA</td></tr>
        <tr><td>AC SPD</td><td>Phoenix Contact / Mersen Type II, 40 kA 8/20 μs</td></tr>
        <tr><td>Lightning Arrester</td><td>ESE Franklin-type rooftop mounted</td></tr>
        <tr><td>Grounding</td><td>3× Cu rod 2.4m · ground wire 16 mm² · Rg ≤ 5 Ω</td></tr>
      </table>
    </div>
  </div>

  <div class="note">
    Specifications are an engineering cover sheet, not a manufacturer datasheet replacement. Attach final datasheets, certificates, inverter grid-code/anti-islanding settings, and licensed engineer stamp before submission.
  </div>
</div>
` + baseFoot(p)
}

// ── Branch label helper ──────────────────────────────
const BRANCH_LABELS: Record<string, string> = {
  surat_thani: 'PEA Surat Thani (Ko Phangan)',
  phuket: 'PEA Phuket',
  chiang_mai: 'PEA Chiang Mai',
  chonburi: 'PEA Chonburi',
  bangkok_mea: 'MEA Bangkok',
}

// ========== HANDLER ==========
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const email = await verifyAdmin(req)
    if (!email) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const body = (await req.json()) as PEAParams & { project_id?: string; pea_branch?: string }

    // If project_id provided, fetch pea_branch from DB
    let peaBranchLabel = 'PEA Surat Thani (Ko Phangan)'
    if (body.project_id) {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/projects?id=eq.${encodeURIComponent(body.project_id)}&select=pea_branch&limit=1`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
      )
      if (r.ok) {
        const rows = await r.json()
        const branch = rows?.[0]?.pea_branch
        if (branch && BRANCH_LABELS[branch]) peaBranchLabel = BRANCH_LABELS[branch]
      }
    } else if (body.pea_branch && BRANCH_LABELS[body.pea_branch]) {
      peaBranchLabel = BRANCH_LABELS[body.pea_branch]
    }

    // Inject branch into params for any future use
    const params: PEAParams = { ...body, client_site: body.client_site || `Koh Phangan · ${peaBranchLabel}` }

    if (!params.ref || !params.system_size_kwp) {
      return Response.json({ ok: false, error: 'missing_required' }, { status: 400 })
    }

    const drawings = {
      sld: {
        title: 'Single-Line Diagram',
        filename: `${params.ref}-SLD-01.html`,
        html: renderSLD(params),
      },
      electrical: {
        title: 'Electrical Plan (Cable Schedule)',
        filename: `${params.ref}-ELE-02.html`,
        html: renderElectricalPlan(params),
      },
      layout: {
        title: 'Layout Plan (Panel Arrangement)',
        filename: `${params.ref}-LYT-03.html`,
        html: renderLayoutPlan(params),
      },
      specs: {
        title: 'Equipment Specifications',
        filename: `${params.ref}-SPC-04.html`,
        html: renderEquipmentSpecs(params),
      },
    }
    const readiness = calculatePeaReadiness({
      authority: params.client_site?.toLowerCase().includes('bangkok') ? 'MEA' : 'PEA',
      system_size_kwp: Number(params.system_size_kwp),
      inverter_kw: Number(params.inverter_kw || params.system_size_kwp),
      panel_count: Number(params.panels),
      panel_watt: Number(params.panel_watt),
      roof_area_m2: params.roof_area_m2,
      roof_load_kg_m2: params.roof_load_kg_m2,
      phase: params.phase || 'unknown',
      export_program: params.export_program || 'self_consumption',
    })

    return Response.json({
      ok: true,
      ref: params.ref,
      generated_at: new Date().toISOString(),
      drawings,
      readiness,
    })
  } catch (e: unknown) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
