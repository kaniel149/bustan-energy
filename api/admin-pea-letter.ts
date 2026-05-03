// ============================================================
// /api/admin-pea-letter
// Generates a PEA grid-connection application letter (Thai / English / both).
// Accepts proposal_ref OR project_id — fetches data from DB when available,
// falls back to URL params for standalone use.
// ============================================================
export const config = { runtime: 'edge' }

import { isAllowedAdmin } from './_lib/admin-access.js'

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

// ── PEA branch table ──────────────────────────────────
const BRANCHES: Record<string, { nameLocal: string; address: string; addressLocal: string; phone: string; authority: string }> = {
  surat_thani: {
    nameLocal: 'การไฟฟ้าส่วนภูมิภาค สาขาสุราษฎร์ธานี',
    address: '235 Talat Mai Road, Talat, Mueang, Surat Thani 84000',
    addressLocal: '235 ถนนตลาดใหม่ ตำบลตลาด อำเภอเมือง สุราษฎร์ธานี 84000',
    phone: '+66-77-272-888',
    authority: 'PEA',
  },
  phuket: {
    nameLocal: 'การไฟฟ้าส่วนภูมิภาค สาขาภูเก็ต',
    address: '95 Wichit Songkhram Road, Wichit, Mueang, Phuket 83000',
    addressLocal: '95 ถนนวิชิตสงคราม ตำบลวิชิต อำเภอเมือง ภูเก็ต 83000',
    phone: '+66-76-232-888',
    authority: 'PEA',
  },
  chiang_mai: {
    nameLocal: 'การไฟฟ้าส่วนภูมิภาค สาขาเชียงใหม่',
    address: '221 Charoen Mueang Road, Chang Phueak, Mueang, Chiang Mai 50300',
    addressLocal: '221 ถนนเจริญเมือง ตำบลช้างเผือก อำเภอเมือง เชียงใหม่ 50300',
    phone: '+66-53-242-888',
    authority: 'PEA',
  },
  chonburi: {
    nameLocal: 'การไฟฟ้าส่วนภูมิภาค สาขาชลบุรี',
    address: '62/1 Sukhumvit Road, Bang Plasoi, Mueang, Chonburi 20000',
    addressLocal: '62/1 ถนนสุขุมวิท ตำบลบางปลาสร้อย อำเภอเมือง ชลบุรี 20000',
    phone: '+66-38-282-888',
    authority: 'PEA',
  },
  bangkok_mea: {
    nameLocal: 'การไฟฟ้านครหลวง (กฟน.)',
    address: '30 Chakraphong Road, Ban Phan Thom, Phra Nakhon, Bangkok 10200',
    addressLocal: '30 ถนนจักรพงษ์ แขวงบ้านพานถม เขตพระนคร กรุงเทพมหานคร 10200',
    phone: '+66-2-220-0000',
    authority: 'MEA',
  },
}

interface LetterParams {
  proposal_ref?: string
  project_id?: string
  language: 'th' | 'en' | 'both'
  // Owner
  owner_name: string
  owner_name_th?: string
  owner_id_number?: string
  owner_address?: string
  owner_phone?: string
  // System
  system_size_kwp: number
  panel_count: number
  panel_model: string
  inverter_model: string
  inverter_kw: number
  battery_kwh?: number
  // Branch
  pea_branch?: string // branch id, default surat_thani
  pea_reference_number?: string
  // Meta
  date?: string // ISO date string, defaults to today
}

function esc(s: string | undefined | null): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function thaiDate(isoDate?: string): string {
  const d = isoDate ? new Date(isoDate) : new Date()
  const day = d.getDate()
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ]
  const month = thaiMonths[d.getMonth()]
  const year = d.getFullYear() + 543 // Buddhist calendar
  return `${day} ${month} ${year}`
}

function englishDate(isoDate?: string): string {
  const d = isoDate ? new Date(isoDate) : new Date()
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function renderLetterThai(p: LetterParams, branch: typeof BRANCHES[string]): string {
  return `
<div class="letter-section" lang="th">
  <!-- Recipient header -->
  <div class="recipient">
    <p class="branch-name">${esc(branch.nameLocal)}</p>
    <p>${esc(branch.addressLocal)}</p>
    <p>โทรศัพท์: ${esc(branch.phone)}</p>
  </div>

  <div class="subject-line">
    <strong>เรื่อง:</strong> หนังสือขออนุญาตเชื่อมต่อระบบผลิตไฟฟ้าพลังงานแสงอาทิตย์
  </div>

  <div class="salutation">เรียน ผู้จัดการ${esc(branch.nameLocal)}</div>

  <div class="body-text">
    <p>
      ข้าพเจ้า <strong>${esc(p.owner_name_th || p.owner_name)}</strong>
      ${p.owner_id_number ? `เลขประจำตัวประชาชน/พาสปอร์ต ${esc(p.owner_id_number)}` : ''}
      ${p.owner_address ? `ที่อยู่ ${esc(p.owner_address)}` : ''}
      ขอยื่นคำขอเชื่อมต่อระบบผลิตไฟฟ้าแบบติดตั้งบนหลังคา
      (Solar Rooftop) เพื่อใช้ไฟฟ้าร่วมกับระบบของ${branch.authority === 'MEA' ? 'การไฟฟ้านครหลวง' : 'การไฟฟ้าส่วนภูมิภาค'}
      โดยมีรายละเอียดดังนี้:
    </p>

    <table class="specs-table">
      <tr><th>รายการ</th><th>รายละเอียด</th></tr>
      <tr><td>ขนาดระบบ</td><td>${esc(String(p.system_size_kwp))} kWp</td></tr>
      <tr><td>จำนวนแผงโซลาร์เซลล์</td><td>${esc(String(p.panel_count))} แผง</td></tr>
      <tr><td>รุ่นแผงโซลาร์เซลล์</td><td>${esc(p.panel_model)}</td></tr>
      <tr><td>อินเวอร์เตอร์</td><td>${esc(p.inverter_model)} (${esc(String(p.inverter_kw))} kW)</td></tr>
      ${p.battery_kwh ? `<tr><td>แบตเตอรี่</td><td>${esc(String(p.battery_kwh))} kWh</td></tr>` : ''}
      <tr><td>ประเภทการเชื่อมต่อ</td><td>ระบบผูกกับสายส่ง (Grid-tied) เพื่อใช้เองเป็นหลัก; การส่งออก/ขายไฟส่วนเกินขึ้นอยู่กับการอนุมัติของหน่วยงาน</td></tr>
    </table>

    <p style="margin-top:12mm">
      ระบบขนาด ${esc(String(p.system_size_kwp))} kWp
      ดังกล่าว ข้าพเจ้าได้แนบเอกสารประกอบคำขอมาพร้อมนี้ครบถ้วนแล้ว
      หากมีข้อสงสัยประการใด กรุณาติดต่อข้าพเจ้าได้ที่ ${esc(p.owner_phone || 'เบอร์โทรศัพท์ตามเอกสารแนบ')}
    </p>

    <p>จึงเรียนมาเพื่อโปรดพิจารณาดำเนินการ ขอขอบพระคุณเป็นอย่างยิ่ง</p>
  </div>

  <div class="signature-block th">
    <div class="sig-left">
      <p style="margin-bottom:18mm"></p>
      <p class="sig-line">ลายมือชื่อ ___________________________</p>
      <p>(${esc(p.owner_name_th || p.owner_name)})</p>
      <p>วันที่ ${thaiDate(p.date)}</p>
    </div>
  </div>
</div>
`
}

function renderLetterEnglish(p: LetterParams, branch: typeof BRANCHES[string]): string {
  return `
<div class="letter-section" lang="en">
  <div class="recipient">
    <p class="branch-name">${esc(branch.nameLocal)} (${branch.authority})</p>
    <p>${esc(branch.address)}</p>
    <p>Tel: ${esc(branch.phone)}</p>
  </div>

  <div class="date-line">${englishDate(p.date)}</div>

  <div class="subject-line">
    <strong>Re:</strong> Application for Solar Rooftop Grid-Connection Permit
    ${p.pea_reference_number ? `<br><strong>Ref No.:</strong> ${esc(p.pea_reference_number)}` : ''}
  </div>

  <div class="salutation">Dear Manager,</div>

  <div class="body-text">
    <p>
      I, <strong>${esc(p.owner_name)}</strong>
      ${p.owner_id_number ? `, ID/Passport No. <strong>${esc(p.owner_id_number)}</strong>` : ''},
      ${p.owner_address ? `of ${esc(p.owner_address)},` : ''}
      hereby apply for permission to connect a solar photovoltaic rooftop system
      to the ${branch.authority === 'MEA' ? 'Metropolitan Electricity Authority (MEA)' : 'Provincial Electricity Authority (PEA)'} grid,
      with details as follows:
    </p>

    <table class="specs-table">
      <tr><th>Item</th><th>Specification</th></tr>
      <tr><td>System Capacity</td><td>${esc(String(p.system_size_kwp))} kWp</td></tr>
      <tr><td>PV Module Quantity</td><td>${esc(String(p.panel_count))} modules</td></tr>
      <tr><td>PV Module Model</td><td>${esc(p.panel_model)}</td></tr>
      <tr><td>Inverter</td><td>${esc(p.inverter_model)} (${esc(String(p.inverter_kw))} kW)</td></tr>
      ${p.battery_kwh ? `<tr><td>Battery Storage</td><td>${esc(String(p.battery_kwh))} kWh</td></tr>` : ''}
      <tr><td>Connection Type</td><td>Grid-tied self-consumption; export/buyback only where approved by the authority</td></tr>
      <tr><td>Proposal Reference</td><td>${esc(p.proposal_ref || '—')}</td></tr>
    </table>

    <p style="margin-top:12mm">
      All required supporting documents are enclosed with this application.
      For any enquiries, please contact me at ${esc(p.owner_phone || 'the contact details provided in attachments')}.
    </p>

    <p>I respectfully request your approval of this application.</p>
    <p>Yours faithfully,</p>
  </div>

  <div class="signature-block en">
    <div class="sig-left">
      <p style="margin-bottom:18mm"></p>
      <p class="sig-line">Signature: ___________________________</p>
      <p>(${esc(p.owner_name)})</p>
      <p>Date: ${englishDate(p.date)}</p>
    </div>
  </div>
</div>
`
}

function renderAttachments(p: LetterParams, lang: 'th' | 'en' | 'both'): string {
  const items = [
    { th: 'สำเนาบัตรประชาชน / สำเนาหนังสือเดินทาง (เจ้าของ)', en: 'Copy of ID card / passport (owner)' },
    { th: 'สำเนาทะเบียนบ้าน', en: 'Copy of house registration' },
    { th: 'สำเนาโฉนดที่ดิน หรือหนังสือยินยอม', en: 'Copy of land deed or written consent from landowner' },
    { th: 'หนังสือมอบอำนาจ (ถ้าผู้ยื่นไม่ใช่เจ้าของ)', en: 'Power of attorney / consent if applicant is not the owner' },
    { th: 'บิลค่าไฟฟ้า PEA ล่าสุด (เลข CA และเลขมิเตอร์)', en: 'Recent PEA bill with CA/customer number and meter number' },
    { th: 'แบบ Single-Line Diagram (SLD)', en: 'Single-Line Diagram (SLD)' },
    { th: 'แบบแปลนไฟฟ้า (Electrical Plan)', en: 'Electrical Plan with cable schedule' },
    { th: 'แบบแปลนจัดวางแผง (Layout Plan)', en: 'Layout Plan (roof panel arrangement)' },
    { th: 'เอกสารข้อมูลอุปกรณ์ (Equipment Specifications)', en: 'Equipment Specifications sheet' },
    { th: 'ใบรับรองผลิตภัณฑ์อินเวอร์เตอร์ (IEC 62109)', en: 'Inverter product certificate (IEC 62109)' },
    { th: 'ใบรับรองผลิตภัณฑ์แผงโซลาร์เซลล์ (IEC 61215)', en: 'PV module product certificate (IEC 61215)' },
    ...(p.battery_kwh ? [
      { th: 'เอกสารแบตเตอรี่ / ใบรับรอง UL 9540A', en: 'Battery documentation / UL 9540A certificate' },
    ] : []),
  ]

  if (lang === 'th') {
    return `
<div class="attachments">
  <p><strong>เอกสารแนบ (Attachments):</strong></p>
  <ol>
    ${items.map((i) => `<li><label><input type="checkbox"> ${esc(i.th)}</label></li>`).join('\n    ')}
  </ol>
</div>`
  }
  if (lang === 'en') {
    return `
<div class="attachments">
  <p><strong>Attachments:</strong></p>
  <ol>
    ${items.map((i) => `<li><label><input type="checkbox"> ${esc(i.en)}</label></li>`).join('\n    ')}
  </ol>
</div>`
  }
  // both
  return `
<div class="attachments">
  <p><strong>เอกสารแนบ / Attachments:</strong></p>
  <ol>
    ${items.map((i) => `<li><label><input type="checkbox"> ${esc(i.th)}<br><span class="en-sub">${esc(i.en)}</span></label></li>`).join('\n    ')}
  </ol>
</div>`
}

function renderEngineerBlock(lang: 'th' | 'en' | 'both'): string {
  const th = lang === 'th' || lang === 'both'
  const en = lang === 'en' || lang === 'both'
  return `
<div class="engineer-block">
  <table class="sig-table">
    <tr>
      <td class="sig-cell">
        ${th ? '<p>ผู้รับรอง (วิศวกรผู้ออกแบบ / Licensed PE)</p>' : ''}
        ${en ? '<p>Certifying Engineer (Licensed PE)</p>' : ''}
        <div class="sig-space"></div>
        <p class="sig-line">___________________________</p>
        ${th ? '<p>ชื่อวิศวกร: ___________________________</p>' : ''}
        ${en ? '<p>Engineer Name: ___________________________</p>' : ''}
        <p>${th ? 'ใบอนุญาต' : ''}${th && en ? ' / ' : ''}${en ? 'License' : ''} No.: ___________________________</p>
        <p>${th ? 'วันที่' : ''}${th && en ? ' / ' : ''}${en ? 'Date' : ''}: ___________________________</p>
      </td>
      <td class="stamp-cell">
        <p style="font-size:10pt;color:#999">${th ? 'ประทับตรา PE' : ''}${th && en ? ' / ' : ''}${en ? 'PE Stamp Here' : ''}</p>
        <div class="stamp-box"></div>
      </td>
    </tr>
  </table>
</div>`
}

function buildHTML(p: LetterParams, branch: typeof BRANCHES[string]): string {
  const lang = p.language
  const showTh = lang === 'th' || lang === 'both'
  const showEn = lang === 'en' || lang === 'both'
  const title = showTh
    ? 'หนังสือขออนุญาตเชื่อมต่อระบบผลิตไฟฟ้า'
    : 'PEA Grid Connection Application'

  return `<!DOCTYPE html>
<html lang="${showTh ? 'th' : 'en'}" dir="ltr">
<head>
<meta charset="UTF-8">
<title>${title} — Bustan Energy / ${esc(p.proposal_ref || p.project_id || 'Draft')}</title>
<style>
  @page { size: A4 portrait; margin: 20mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Sarabun', 'Arial', sans-serif;
    color: #0a0a0a;
    background: #fff;
    padding: 20mm;
    font-size: 11pt;
    line-height: 1.65;
  }
  .letterhead {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 8mm;
    align-items: center;
    border-bottom: 2px solid #E8A820;
    padding-bottom: 6mm;
    margin-bottom: 8mm;
  }
  .letterhead .logo { font-weight: 900; font-size: 20pt; letter-spacing: 2px; }
  .letterhead .logo .amber { color: #E8A820; }
  .letterhead .company-info { font-size: 9pt; color: #555; line-height: 1.5; }
  .letter-section { margin-bottom: 8mm; }
  .recipient { margin-bottom: 6mm; line-height: 1.8; }
  .branch-name { font-weight: 700; font-size: 12pt; }
  .date-line { text-align: right; margin-bottom: 6mm; }
  .subject-line { margin-bottom: 5mm; font-weight: 600; border-left: 3px solid #E8A820; padding-left: 4mm; }
  .salutation { margin-bottom: 5mm; }
  .body-text p { margin-bottom: 5mm; }
  .specs-table { width: 100%; border-collapse: collapse; margin: 5mm 0; font-size: 10pt; }
  .specs-table th { background: #f5f5f5; padding: 2.5mm 4mm; text-align: left; border: 1px solid #ccc; font-weight: 700; }
  .specs-table td { padding: 2.5mm 4mm; border: 1px solid #ccc; }
  .signature-block { margin-top: 12mm; display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; }
  .sig-line { border-bottom: 1px solid #333; width: 220px; padding-top: 2mm; font-size: 10pt; }
  .attachments { margin-top: 8mm; border: 1px solid #ccc; padding: 5mm; background: #fafafa; font-size: 10pt; }
  .attachments ol { padding-left: 6mm; margin-top: 3mm; }
  .attachments li { margin-bottom: 2mm; }
  .attachments input[type="checkbox"] { margin-right: 2mm; }
  .en-sub { font-size: 9pt; color: #555; }
  .separator { border: none; border-top: 2px dashed #ddd; margin: 10mm 0; }
  .engineer-block { margin-top: 10mm; border-top: 1px solid #ccc; padding-top: 6mm; }
  .sig-table { width: 100%; border-collapse: collapse; }
  .sig-cell { width: 65%; vertical-align: top; padding-right: 8mm; font-size: 10pt; line-height: 1.8; }
  .stamp-cell { width: 35%; vertical-align: top; text-align: center; }
  .stamp-box {
    width: 80px; height: 80px;
    border: 2px dashed #aaa;
    margin: 3mm auto;
    display: flex; align-items: center; justify-content: center;
  }
  .sig-space { height: 20mm; }
  .footer-note { margin-top: 8mm; font-size: 8pt; color: #888; border-top: 1px solid #eee; padding-top: 3mm; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>

<!-- Letterhead -->
<div class="letterhead">
  <div class="logo"><span class="amber">TM</span> ENERGY</div>
  <div class="company-info">
    Bustan Energy Co., Ltd. · Koh Phangan, Surat Thani 84280 · Thailand<br>
    Tel: +66 94 669 2011 · contracts@energy-tm.com · energy-tm.com<br>
    ${showTh ? `วันที่: ${thaiDate(p.date)}` : `Date: ${englishDate(p.date)}`}
    ${p.pea_reference_number ? `&nbsp;|&nbsp; Ref: ${esc(p.pea_reference_number)}` : ''}
  </div>
</div>

${showTh ? renderLetterThai(p, branch) : ''}
${showTh && showEn ? '<hr class="separator">' : ''}
${showEn ? renderLetterEnglish(p, branch) : ''}

${renderAttachments(p, lang)}
${renderEngineerBlock(lang)}

<div class="footer-note">
  Document generated by Bustan Energy system · Proposal Ref: ${esc(p.proposal_ref || '—')} ·
  Preliminary package only — confirm local branch requirements and obtain owner + licensed engineer signatures before submission to ${branch.authority}.
</div>

</body>
</html>`
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const email = await verifyAdmin(req)
  if (!email) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  try {
    const body = (await req.json()) as Partial<LetterParams>

    // Resolve from DB if proposal_ref provided
    let resolved: Partial<LetterParams> = { ...body }

    if (body.proposal_ref) {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/proposals?ref_number=eq.${encodeURIComponent(body.proposal_ref)}&select=*&limit=1`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
      )
      if (r.ok) {
        const rows = await r.json()
        const p = Array.isArray(rows) && rows[0] ? rows[0] : null
        if (p) {
          resolved = {
            owner_name: p.client_name || body.owner_name,
            owner_phone: p.client_phone || body.owner_phone,
            system_size_kwp: p.system_size_kwp ?? body.system_size_kwp,
            panel_count: p.panel_count ?? body.panel_count,
            panel_model: p.panel_model || body.panel_model,
            inverter_model: p.inverter_model || body.inverter_model,
            inverter_kw: p.inverter_kw ?? body.inverter_kw,
            battery_kwh: p.battery_kwh ?? body.battery_kwh,
            ...body, // body overrides DB values when explicitly provided
          }
        }
      }
    }

    // Also resolve from projects if project_id provided
    if (body.project_id) {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/projects?id=eq.${encodeURIComponent(body.project_id)}&select=*&limit=1`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
      )
      if (r.ok) {
        const rows = await r.json()
        const p = Array.isArray(rows) && rows[0] ? rows[0] : null
        if (p) {
          resolved = {
            pea_branch: p.pea_branch || resolved.pea_branch,
            pea_reference_number: p.pea_reference_number || resolved.pea_reference_number,
            ...resolved,
          }
        }
      }
    }

    const params = resolved as LetterParams

    // Validate required fields
    if (!params.owner_name) {
      return Response.json({ ok: false, error: 'owner_name is required' }, { status: 400 })
    }
    if (!params.system_size_kwp || !params.panel_count) {
      return Response.json({ ok: false, error: 'system_size_kwp and panel_count are required' }, { status: 400 })
    }
    if (!['th', 'en', 'both'].includes(params.language)) {
      return Response.json({ ok: false, error: 'language must be th, en, or both' }, { status: 400 })
    }

    const branchId = params.pea_branch || 'surat_thani'
    const branch = BRANCHES[branchId] ?? BRANCHES['surat_thani']

    const html = buildHTML(params, branch)

    return Response.json({
      ok: true,
      ref: params.proposal_ref || params.project_id,
      language: params.language,
      branch: branchId,
      generated_at: new Date().toISOString(),
      html,
      filename: `${params.proposal_ref || params.project_id || 'letter'}-PEA-LETTER-${params.language.toUpperCase()}.html`,
    })
  } catch (e: unknown) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
