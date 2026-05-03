/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase REST payloads here are schemaless until generated DB types are wired in. */
// ============================================================
// /api/admin-pea-package
// POST { project_id } → assembles PEA submission package.
// Generates all 4 technical drawings + application letter,
// stores each HTML in pea-documents bucket + logs in pea_documents table,
// updates project pea_status = 'package_ready',
// returns signed URLs manifest (client downloads individual files).
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

const BUCKET = 'pea-documents'

async function supaGet(path: string): Promise<any | null> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  if (!r.ok) return null
  const arr = await r.json()
  return Array.isArray(arr) && arr.length ? arr[0] : null
}

async function supaPost(table: string, body: any): Promise<any> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const txt = await r.text()
    throw new Error(`supaPost ${table}: ${r.status} ${txt}`)
  }
  return r.json()
}

async function supaPatch(path: string, body: any): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  })
}

/** Upload HTML blob to storage, return public path */
async function uploadToStorage(path: string, html: string): Promise<{ path: string; error?: string }> {
  const blob = new Blob([html], { type: 'text/html; charset=utf-8' })
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'text/html; charset=utf-8',
      'x-upsert': 'true',
    },
    body: blob,
  })
  if (!r.ok) {
    const txt = await r.text()
    return { path, error: `upload failed ${r.status}: ${txt}` }
  }
  return { path }
}

/** Create a signed URL (1 hour TTL) */
async function signedUrl(storagePath: string): Promise<string | null> {
  const r = await fetch(
    `${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${storagePath}`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: 3600 }),
    },
  )
  if (!r.ok) return null
  const data = await r.json()
  // Supabase returns { signedURL: '/storage/v1/object/sign/...' }
  if (data?.signedURL) return `${SUPABASE_URL}${data.signedURL}`
  if (data?.signedUrl) return data.signedUrl
  return null
}

/** Simple SHA-256 hash of a string (browser SubtleCrypto) */
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ── Inline drawing generators (mirror admin-pea-drawings.ts logic) ──────────
// We duplicate the minimal generator here to avoid cross-function imports
// in the Edge runtime. For full fidelity the drawings call is delegated to
// admin-pea-drawings endpoint internally.

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
  pea_branch?: string
}

function baseHead(title: string, drawingNo: string): string {
  return `<!DOCTYPE html><html lang="en" dir="ltr"><head><meta charset="UTF-8"><title>${title}</title>
<style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;color:#0a0a0a;background:#fff;padding:12mm;font-size:10pt}.title-block{border:2px solid #000;padding:8mm;margin-bottom:6mm;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0}.title-block>div{padding:2mm;border-right:1px solid #333}.title-block>div:last-child{border-right:0}.title-block label{display:block;font-size:7pt;text-transform:uppercase;letter-spacing:1px;color:#666;margin-bottom:1mm}.title-block .v{font-size:10pt;font-weight:600}.logo{font-weight:900;letter-spacing:2px;font-size:13pt}.logo .amber{color:#E8A820}.drawing-box{border:1.5px solid #000;padding:6mm;min-height:120mm}table{width:100%;border-collapse:collapse;font-size:9pt}table th{background:#f5f5f5;padding:3mm;text-align:left;border:1px solid #333;font-weight:700}table td{padding:3mm;border:1px solid #999}.footer{margin-top:8mm;font-size:7pt;color:#666;display:flex;justify-content:space-between}.note{background:#fffbea;border-left:3px solid #E8A820;padding:3mm 5mm;margin:4mm 0;font-size:9pt}.engineer-sig{margin-top:6mm;border:1px dashed #666;padding:4mm;display:grid;grid-template-columns:1fr 1fr;gap:8mm}.engineer-sig .slot{min-height:22mm;border-bottom:1px solid #333;padding:1mm;font-size:8pt;color:#666}@media print{body{padding:0}}</style></head><body>
<div class="title-block"><div><div class="logo"><span class="amber">Bustan</span> Energy</div><div style="font-size:8pt;color:#666;margin-top:2mm">Solar · For PE Review</div></div><div><label>Drawing Title</label><div class="v">${title}</div></div><div><label>Drawing No</label><div class="v">${drawingNo}</div><label style="margin-top:2mm">Scale</label><div class="v">N.T.S.</div></div><div><label>Issued</label><div class="v">${new Date().toISOString().slice(0, 10)}</div><label style="margin-top:2mm">Rev</label><div class="v">00</div></div></div>`
}

function baseFoot(p: PEAParams): string {
  return `<div class="engineer-sig"><div><label>Designed By</label><div class="slot"></div><div style="margin-top:2mm;font-size:8pt">Bustan Energy · Koh Phangan</div></div><div><label>Engineer Approval (วิศวกร) / Licensed PE Stamp</label><div class="slot"></div><div style="margin-top:2mm;font-size:8pt">License No: _______________&nbsp;&nbsp;Date: _________</div></div></div><div class="footer"><span>Ref: ${p.ref} · Client: ${p.client_name}</span><span>Preliminary package · Requires licensed PE review/stamp before PEA submission</span></div></body></html>`
}

function renderSLD(p: PEAParams): string {
  return baseHead('Single-Line Diagram (SLD)', `${p.ref}-SLD-01`) + `<div class="drawing-box"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 520" style="width:100%;height:auto"><defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#000"/></marker></defs><rect x="30" y="80" width="200" height="220" fill="#fff" stroke="#000" stroke-width="2"/><text x="130" y="110" text-anchor="middle" font-weight="700" font-size="14">PV ARRAY</text><text x="130" y="135" text-anchor="middle" font-size="11">${p.panels} x ${p.panel_watt}Wp</text><text x="130" y="155" text-anchor="middle" font-size="11">${p.system_size_kwp} kWp total</text><text x="130" y="175" text-anchor="middle" font-size="10" fill="#666">${p.panel_model}</text><text x="130" y="200" text-anchor="middle" font-size="10">${p.strings} strings</text>${Array.from({length:8}).map((_,i)=>`<rect x="${50+(i%4)*42}" y="${220+Math.floor(i/4)*28}" width="38" height="24" fill="#1e3a5f" stroke="#000" stroke-width="0.5"/>`).join('')}<line x1="230" y1="190" x2="290" y2="190" stroke="#000" stroke-width="2" marker-end="url(#arr)"/><text x="260" y="182" text-anchor="middle" font-size="9" fill="#555">DC+</text><rect x="300" y="130" width="150" height="120" fill="#fffbe6" stroke="#000" stroke-width="2"/><text x="375" y="155" text-anchor="middle" font-weight="700" font-size="12">DC COMBINER</text><text x="375" y="175" text-anchor="middle" font-size="10">${p.strings}-in-1</text><text x="375" y="195" text-anchor="middle" font-size="9">DC fuses 15A/1100V</text><text x="375" y="212" text-anchor="middle" font-size="9">DC SPD Type II</text><line x1="450" y1="190" x2="510" y2="190" stroke="#000" stroke-width="2" marker-end="url(#arr)"/><rect x="520" y="110" width="170" height="160" fill="#e6f7ff" stroke="#000" stroke-width="2"/><text x="605" y="140" text-anchor="middle" font-weight="700" font-size="13">INVERTER</text><text x="605" y="165" text-anchor="middle" font-size="11">${p.inverter_kw} kW</text><text x="605" y="185" text-anchor="middle" font-size="9" fill="#666">${p.inverter_model}</text><text x="605" y="210" text-anchor="middle" font-size="9">3ph 400V 50Hz</text><line x1="690" y1="190" x2="750" y2="190" stroke="#000" stroke-width="2" marker-end="url(#arr)"/><rect x="760" y="110" width="180" height="160" fill="#f5e6ff" stroke="#000" stroke-width="2"/><text x="850" y="140" text-anchor="middle" font-weight="700" font-size="12">MAIN AC PANEL</text><text x="850" y="165" text-anchor="middle" font-size="10">MCCB ${p.ac_current_a < 200 ? '200A' : '250A'} 3P</text><text x="850" y="185" text-anchor="middle" font-size="10">AC SPD Type II</text><text x="850" y="205" text-anchor="middle" font-size="10">PEA-approved meter / CT</text><line x1="940" y1="190" x2="980" y2="190" stroke="#000" stroke-width="2"/><line x1="970" y1="170" x2="970" y2="210" stroke="#000" stroke-width="2"/><text x="960" y="240" text-anchor="middle" font-size="11" font-weight="600">PEA GRID</text></svg><div class="note"><strong>System:</strong> ${p.system_size_kwp} kWp grid-tied photovoltaic system for self-consumption. Export/buyback is subject to PEA/ERC approval. Final engineering review required before submission.</div></div>` + baseFoot(p)
}

function renderSpecs(p: PEAParams): string {
  return baseHead('Equipment Specifications Sheet', `${p.ref}-SPC-04`) + `<div class="drawing-box"><div style="display:grid;grid-template-columns:1fr 1fr;gap:5mm"><div><h3 style="font-size:11pt;color:#E8A820;margin-bottom:2mm">PV MODULE</h3><table style="font-size:9pt"><tr><td><strong>Model</strong></td><td>${p.panel_model}</td></tr><tr><td>Pmax</td><td>${p.panel_watt} Wp</td></tr><tr><td>Count</td><td>${p.panels} modules</td></tr><tr><td>Total</td><td>${p.system_size_kwp} kWp</td></tr><tr><td>Cell Type</td><td>Mono N-type / TOPCon</td></tr><tr><td>Max Sys Voltage</td><td>1500 VDC</td></tr><tr><td>Warranty</td><td>12y product / 30y power</td></tr></table></div><div><h3 style="font-size:11pt;color:#E8A820;margin-bottom:2mm">INVERTER</h3><table style="font-size:9pt"><tr><td><strong>Model</strong></td><td>${p.inverter_model}</td></tr><tr><td>AC Output</td><td>${p.inverter_kw} kW</td></tr><tr><td>Output</td><td>400V / 3ph / 50Hz</td></tr><tr><td>Max Efficiency</td><td>98.6%</td></tr><tr><td>Protection</td><td>IP66</td></tr><tr><td>Certifications</td><td>IEC 62109 / CE / G99</td></tr></table></div></div><div class="note">All equipment installed by licensed electricians per PEA regulations. Pre-commissioning tests per IEC 62446.</div></div>` + baseFoot(p)
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const email = await verifyAdmin(req)
  if (!email) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  try {
    const body = (await req.json()) as { project_id?: string; proposal_ref?: string }

    if (!body.project_id && !body.proposal_ref) {
      return Response.json({ ok: false, error: 'project_id or proposal_ref required' }, { status: 400 })
    }

    // ── Fetch project/proposal data ───────────────────────────
    let project: any = null
    let proposal: any = null

    if (body.project_id) {
      project = await supaGet(`projects?id=eq.${encodeURIComponent(body.project_id)}&select=*&limit=1`)
    }

    const ref = body.proposal_ref || project?.proposal_ref || project?.ref_number
    if (ref) {
      proposal = await supaGet(`proposals?ref_number=eq.${encodeURIComponent(ref)}&select=*&limit=1`)
    }

    if (!project && !proposal) {
      return Response.json({ ok: false, error: 'project or proposal not found' }, { status: 404 })
    }

    const src = proposal || project
    const proposalRef = ref || body.project_id || 'PKG'
    const peaBranch = project?.pea_branch || 'surat_thani'

    // Build drawing params
    const panelCount = src.panel_count || 157
    const systemKwp = src.system_size_kwp || Math.round(panelCount * (src.panel_watt || 555) / 1000 * 10) / 10
    const inverterKw = src.inverter_kw || Math.ceil(systemKwp * 0.95)
    const acCurrentA = Math.round(systemKwp * 1000 / (1.732 * 400 * 0.95))
    const strings = Math.ceil(panelCount / 13)

    const peaParams: PEAParams = {
      ref: proposalRef,
      client_name: src.client_name || 'Client',
      client_site: src.location || 'Koh Phangan, Surat Thani 84280',
      system_size_kwp: systemKwp,
      panels: panelCount,
      panel_watt: src.panel_watt || 555,
      panel_model: src.panel_model || 'JA Solar JAM72S30-555/MR',
      inverter_model: src.inverter_model || 'Huawei SUN2000-100KTL-M1',
      inverter_kw: inverterKw,
      battery_kwh: src.battery_kwh,
      strings,
      ac_cable_run_m: 15,
      ac_current_a: acCurrentA,
      pea_branch: peaBranch,
    }

    const readiness = calculatePeaReadiness({
      authority: peaBranch === 'bangkok_mea' ? 'MEA' : 'PEA',
      system_size_kwp: systemKwp,
      inverter_kw: inverterKw,
      panel_count: panelCount,
      panel_watt: src.panel_watt || 555,
      phase: project?.phase || 'unknown',
      export_program: project?.export_program || 'self_consumption',
    })

    // Generate the same four drawings as the standalone PEA drawings page.
    let drawingConfigs: Array<{ key: string; type: string; title: string; filename: string; html: string }> = []
    const drawingsReq = await fetch(`${new URL(req.url).origin}/api/admin-pea-drawings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.get('authorization') || '',
      },
      body: JSON.stringify({
        ...peaParams,
        project_id: body.project_id,
        pea_branch: peaBranch,
        phase: project?.phase || 'unknown',
        export_program: project?.export_program || 'self_consumption',
      }),
    })
    if (drawingsReq.ok) {
      const drawingsData = await drawingsReq.json()
      drawingConfigs = Object.entries(drawingsData.drawings || {}).map(([key, value]) => {
        const drawing = value as { title: string; filename: string; html: string }
        return { key, type: key, title: drawing.title, filename: drawing.filename, html: drawing.html }
      })
    }

    if (!drawingConfigs.length) {
      drawingConfigs = [
        {
          key: 'sld',
          type: 'sld',
          title: 'Single-Line Diagram',
          filename: `${proposalRef}-SLD-01.html`,
          html: renderSLD(peaParams),
        },
        {
          key: 'specs',
          type: 'specs',
          title: 'Equipment Specifications',
          filename: `${proposalRef}-SPC-04.html`,
          html: renderSpecs(peaParams),
        },
      ]
    }

    // Application letter (Thai)
    const letterReq = await fetch(`${new URL(req.url).origin}/api/admin-pea-letter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.get('authorization') || '',
      },
      body: JSON.stringify({
        proposal_ref: proposalRef,
        project_id: body.project_id,
        language: 'both',
        owner_name: src.client_name || 'Owner',
        owner_phone: src.client_phone,
        system_size_kwp: systemKwp,
        panel_count: panelCount,
        panel_model: peaParams.panel_model,
        inverter_model: peaParams.inverter_model,
        inverter_kw: inverterKw,
        battery_kwh: src.battery_kwh,
        pea_branch: peaBranch,
        pea_reference_number: project?.pea_reference_number,
      }),
    })

    let letterHtml = ''
    if (letterReq.ok) {
      const letterData = await letterReq.json()
      letterHtml = letterData.html || ''
    }

    // ── Upload all documents to storage ──────────────────────
    const documents: any[] = []
    const now = new Date().toISOString()
    const projectId = body.project_id

    // Upload drawings
    for (const d of drawingConfigs) {
      const storagePath = `${proposalRef}/${d.filename}`
      const { error: uploadErr } = await uploadToStorage(storagePath, d.html)
      const fileHash = await sha256(d.html)
      const url = uploadErr ? null : await signedUrl(storagePath)

      const row = await supaPost('pea_documents', {
        project_id: projectId || null,
        proposal_ref: proposalRef,
        document_type: d.type,
        version: 1,
        file_url: url,
        file_hash: fileHash,
        language: 'en',
        generated_at: now,
        notes: uploadErr || null,
        metadata: { storage_path: storagePath, generator: 'admin-pea-package', readiness },
      }).catch(() => null)

      documents.push({
        type: d.type,
        title: d.title,
        filename: d.filename,
        url,
        document_id: Array.isArray(row) && row[0] ? row[0].id : null,
        error: uploadErr || null,
      })
    }

    // Upload application letter
    if (letterHtml) {
      const letterFilename = `${proposalRef}-PEA-LETTER-TH-EN.html`
      const storagePath = `${proposalRef}/${letterFilename}`
      const { error: uploadErr } = await uploadToStorage(storagePath, letterHtml)
      const fileHash = await sha256(letterHtml)
      const url = uploadErr ? null : await signedUrl(storagePath)

      const row = await supaPost('pea_documents', {
        project_id: projectId || null,
        proposal_ref: proposalRef,
        document_type: 'application_letter',
        version: 1,
        file_url: url,
        file_hash: fileHash,
        language: 'both',
        generated_at: now,
        notes: uploadErr || null,
        metadata: { storage_path: storagePath, generator: 'admin-pea-package', readiness },
      }).catch(() => null)

      documents.push({
        type: 'application_letter',
        title: 'PEA Application Letter (TH/EN)',
        filename: letterFilename,
        url,
        document_id: Array.isArray(row) && row[0] ? row[0].id : null,
        error: uploadErr || null,
      })
    }

    // ── Update project pea_status ─────────────────────────────
    if (projectId) {
      await supaPatch(`projects?id=eq.${encodeURIComponent(projectId)}`, {
        pea_status: 'package_ready',
        pea_branch: peaBranch,
      })
    }

    return Response.json({
      ok: true,
      ref: proposalRef,
      project_id: projectId || null,
      document_count: documents.length,
      pea_status: 'package_ready',
      generated_at: now,
      readiness,
      documents,
    })
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}
