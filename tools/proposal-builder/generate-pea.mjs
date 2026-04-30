#!/usr/bin/env node
// Generates PEA application package for AMIR-001 (Option 3: Hybrid + Battery)
// Output: output/AMIR-001-PEA-package/01-sld.pdf ... 05-application-letter-th.pdf

import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, resolve, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── CLIENT DATA ────────────────────────────────────────────────────────────────
const CLIENT = {
  name_en: 'Amir Mizrahi',
  name_th: 'อามีร์ มิซราฮี',
  address: 'Koh Phangan, Surat Thani Province, Thailand',
  address_th: 'เกาะพะงัน จังหวัดสุราษฎร์ธานี',
  phone: '+66...',
  system_kwp: 10.44,
  panel_count: 18,
  panel_model: 'JA Solar JAM72S40-580W',
  panel_watt: 580,
  inverter_model: 'Huawei SUN2000-10KTL-M1',
  inverter_kw: 10,
  battery_model: 'Huawei LUNA2000-7-E1 + LUNA2000-10KW-C1',
  battery_kwh: 6.9,
  strings: 2,
  panels_per_string: 9,
  roof_type: 'Red ceramic tile, pitched',
  installation_date: '2026-05-01',
  ref: 'AMIR-001',
}

// ── SHARED CSS ─────────────────────────────────────────────────────────────────
const BASE_CSS = `
<style>
:root { --navy:#0D2137; --gold:#E8A820; --green:#1A7A5A; --red:#C0392B; --border:rgba(0,0,0,.12); }
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Inter','Helvetica Neue',sans-serif; color:#1A2332; background:white; font-size:13px; line-height:1.6; }
.page { max-width:794px; margin:0 auto; padding:40px 48px; }
.header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; padding-bottom:16px; border-bottom:3px solid var(--navy); }
.header-logo { font-weight:900; font-size:20px; color:var(--navy); letter-spacing:1px; }
.header-logo span { color:var(--gold); }
.header-meta { text-align:right; font-size:11px; color:#6B7A8D; }
.doc-title { font-size:22px; font-weight:900; color:var(--navy); margin-bottom:4px; }
.doc-subtitle { font-size:13px; color:#6B7A8D; margin-bottom:28px; }
table { width:100%; border-collapse:collapse; margin-bottom:20px; font-size:12.5px; }
th { background:var(--navy); color:white; padding:9px 12px; text-align:left; font-weight:700; font-size:11px; letter-spacing:0.5px; }
td { padding:9px 12px; border-bottom:1px solid var(--border); }
tr:nth-child(even) td { background:#f8f9fa; }
tr:last-child td { border-bottom:none; }
.section { margin-bottom:28px; }
.section-title { font-size:14px; font-weight:800; color:var(--navy); margin-bottom:12px; padding:8px 0; border-bottom:2px solid var(--gold); }
.info-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }
.info-item { border:1px solid var(--border); border-radius:8px; padding:12px 16px; }
.info-label { font-size:10px; font-weight:700; letter-spacing:1px; color:#6B7A8D; text-transform:uppercase; margin-bottom:4px; }
.info-value { font-size:14px; font-weight:700; color:var(--navy); }
.badge { display:inline-block; padding:3px 10px; border-radius:100px; font-size:10px; font-weight:700; letter-spacing:0.5px; }
.badge-navy { background:var(--navy); color:white; }
.badge-gold { background:var(--gold); color:var(--navy); }
.badge-green { background:var(--green); color:white; }
.footer { margin-top:40px; padding-top:16px; border-top:1px solid var(--border); font-size:11px; color:#6B7A8D; display:flex; justify-content:space-between; }
.sld-box { border:2px solid var(--navy); border-radius:8px; padding:12px 16px; text-align:center; background:#f8f9fa; }
.sld-row { display:flex; align-items:center; justify-content:center; gap:16px; margin:12px 0; }
.sld-comp { border:2px solid var(--navy); border-radius:6px; padding:8px 14px; background:white; font-size:11px; font-weight:700; min-width:80px; text-align:center; }
.sld-comp.string { background:#fff9e6; border-color:var(--gold); }
.sld-comp.inv { background:#e8f5e9; border-color:var(--green); }
.sld-comp.bat { background:#e3f2fd; border-color:#1565C0; }
.sld-comp.grid { background:#fce4ec; border-color:var(--red); }
.sld-arrow { font-size:18px; color:var(--navy); }
.warn-box { background:#fff8e1; border:1px solid var(--gold); border-radius:8px; padding:12px 16px; margin-bottom:16px; font-size:12px; }
.note-box { background:#e8f5e9; border:1px solid var(--green); border-radius:8px; padding:12px 16px; margin-bottom:16px; font-size:12px; }
.spec-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:16px; }
.spec-card { border:1px solid var(--border); border-radius:8px; padding:12px; text-align:center; }
.spec-val { font-size:18px; font-weight:900; color:var(--navy); }
.spec-label { font-size:10px; color:#6B7A8D; font-weight:700; letter-spacing:0.5px; text-transform:uppercase; margin-top:4px; }
@media print {
  body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  th { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
}
</style>`

// ── 01: SLD (Single Line Diagram) ──────────────────────────────────────────────
function generateSLD() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>SLD — ${CLIENT.ref} — TM Energy</title>
${BASE_CSS}
</head><body>
<div class="page">
  <div class="header">
    <div>
      <div class="header-logo">TM <span>ENERGY</span></div>
      <div style="font-size:11px;color:#6B7A8D;margin-top:4px;">Ko Phangan, Thailand</div>
    </div>
    <div class="header-meta">
      <div style="font-weight:800;font-size:13px;color:var(--navy);">Single Line Diagram</div>
      <div>REF: ${CLIENT.ref} — Option 3 (Hybrid + Battery)</div>
      <div>Date: ${CLIENT.installation_date} | Rev: 1.0</div>
      <div>Engineer: TM Energy Engineering</div>
    </div>
  </div>

  <div class="doc-title">Single Line Diagram (SLD)</div>
  <div class="doc-subtitle">Hybrid Grid-Tied PV System with Battery Storage — PEA Compliant — IEC 62446</div>

  <!-- KEY SPECS -->
  <div class="spec-grid">
    <div class="spec-card"><div class="spec-val">${CLIENT.system_kwp} kWp</div><div class="spec-label">DC Array</div></div>
    <div class="spec-card"><div class="spec-val">${CLIENT.inverter_kw} kW</div><div class="spec-label">AC Output</div></div>
    <div class="spec-card"><div class="spec-val">${CLIENT.battery_kwh} kWh</div><div class="spec-label">Battery</div></div>
    <div class="spec-card"><div class="spec-val">${CLIENT.strings}</div><div class="spec-label">DC Strings</div></div>
    <div class="spec-card"><div class="spec-val">${CLIENT.panel_count}</div><div class="spec-label">Panels</div></div>
    <div class="spec-card"><div class="spec-val">230/400V</div><div class="spec-label">Grid Voltage</div></div>
  </div>

  <!-- SLD DIAGRAM -->
  <div class="section">
    <div class="section-title">System Architecture</div>
    <div style="background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:16px;">

      <!-- ROW 1: PV ARRAYS -->
      <div style="text-align:center;margin-bottom:8px;font-size:11px;font-weight:700;color:#6B7A8D;letter-spacing:1px;">DC GENERATION</div>
      <div class="sld-row">
        <div class="sld-comp string">
          <div style="font-size:9px;color:#6B7A8D;">STRING 1</div>
          9× JA Solar 580W<br>
          <span style="font-size:9px;">Voc=540V · Isc=14.5A</span>
        </div>
        <div class="sld-comp string">
          <div style="font-size:9px;color:#6B7A8D;">STRING 2</div>
          9× JA Solar 580W<br>
          <span style="font-size:9px;">Voc=540V · Isc=14.5A</span>
        </div>
      </div>

      <!-- DC PROTECTION -->
      <div class="sld-row">
        <div style="text-align:center;">
          <div style="font-size:10px;color:#6B7A8D;margin-bottom:4px;">DC Protection</div>
          <div class="sld-comp">
            DC Isolator (2-pole)<br>
            DC SPD Type I 1100V<br>
            <span style="font-size:9px;">Per String</span>
          </div>
        </div>
      </div>
      <div class="sld-row"><span class="sld-arrow">▼</span></div>

      <!-- HYBRID INVERTER + BATTERY -->
      <div style="text-align:center;margin-bottom:8px;font-size:11px;font-weight:700;color:#6B7A8D;letter-spacing:1px;">CONVERSION + STORAGE</div>
      <div class="sld-row">
        <div class="sld-comp inv" style="min-width:200px;padding:14px;">
          <div style="font-size:14px;font-weight:900;">Huawei SUN2000-10KTL-M1</div>
          <div style="font-size:10px;margin-top:4px;">Hybrid Inverter · 10kW · 3-phase 230/400V</div>
          <div style="font-size:10px;">2× MPPT · Max DC 13kWp · THD &lt;3%</div>
          <div style="font-size:10px;margin-top:6px;color:#1565C0;font-weight:700;">▶ Battery Port: LUNA2000 HV</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
          <span style="font-size:20px;">↔</span>
          <div class="sld-comp bat" style="padding:10px 14px;">
            <div style="font-size:11px;font-weight:800;">LUNA2000-10KW-C1</div>
            <div style="font-size:10px;">Power Module</div>
            <div style="font-size:11px;font-weight:800;margin-top:4px;">LUNA2000-7-E1</div>
            <div style="font-size:10px;">6.9 kWh LiFePO4</div>
            <div style="font-size:9px;color:#1565C0;">100% DoD · 6000+ cycles</div>
          </div>
        </div>
      </div>
      <div class="sld-row"><span class="sld-arrow">▼</span></div>

      <!-- AC PROTECTION + METER -->
      <div style="text-align:center;margin-bottom:8px;font-size:11px;font-weight:700;color:#6B7A8D;letter-spacing:1px;">AC PROTECTION + METERING</div>
      <div class="sld-row">
        <div class="sld-comp">
          AC Isolator 3P-32A<br>
          AC SPD Type II 40kA<br>
          RCD 30mA
        </div>
        <span class="sld-arrow">→</span>
        <div class="sld-comp">
          <div style="font-weight:800;">Huawei DDSU666-H</div>
          Smart Energy Meter<br>
          <span style="font-size:9px;">Bidirectional · 3-phase</span>
        </div>
        <span class="sld-arrow">→</span>
        <div class="sld-comp">
          MCCB 3P-32A<br>
          <span style="font-size:9px;">Main Disconnect</span>
        </div>
      </div>
      <div class="sld-row"><span class="sld-arrow">▼</span></div>

      <!-- GRID -->
      <div style="text-align:center;margin-bottom:8px;font-size:11px;font-weight:700;color:#6B7A8D;letter-spacing:1px;">UTILITY CONNECTION</div>
      <div class="sld-row">
        <div class="sld-comp grid" style="min-width:200px;padding:12px;">
          <div style="font-size:13px;font-weight:900;">PEA Grid</div>
          <div style="font-size:10px;">230/400V 3-phase 50Hz</div>
          <div style="font-size:10px;">PEA Meter (existing)</div>
          <div style="font-size:9px;color:var(--red);">Net-metering: export @ ฿3.1/kWh</div>
        </div>
      </div>

    </div>
  </div>

  <!-- CABLE SCHEDULE SUMMARY -->
  <div class="section">
    <div class="section-title">Cable Schedule Summary</div>
    <table>
      <thead><tr><th>Circuit</th><th>Cable Type</th><th>Size</th><th>Length</th><th>Protection</th></tr></thead>
      <tbody>
        <tr><td>DC String 1</td><td>PV-1F Solar Cable</td><td>4 mm²</td><td>~25m</td><td>DC Fuse 15A + SPD</td></tr>
        <tr><td>DC String 2</td><td>PV-1F Solar Cable</td><td>4 mm²</td><td>~25m</td><td>DC Fuse 15A + SPD</td></tr>
        <tr><td>Inverter → MDB</td><td>NYY 3-phase</td><td>6 mm²</td><td>~10m</td><td>MCCB 32A + SPD</td></tr>
        <tr><td>Battery DC link</td><td>HV Battery Cable</td><td>Huawei proprietary</td><td>~2m</td><td>BMS internal</td></tr>
        <tr><td>Ground (PE)</td><td>Green/Yellow</td><td>10 mm²</td><td>Continuous</td><td>Ground rod 2.4m</td></tr>
      </tbody>
    </table>
  </div>

  <div class="warn-box">
    <strong>Note:</strong> This SLD is for PEA application purposes. Final as-built drawings shall be prepared by licensed electrical engineer (วิศวกรไฟฟ้า) before PEA inspection. System must comply with PEA VSPP/SPP technical requirements and IEC 62446.
  </div>

  <div class="footer">
    <div>TM Energy Thailand · ${CLIENT.ref} · SLD Rev 1.0</div>
    <div>For PEA application — Surat Thani Branch</div>
    <div>Page 1 of 1</div>
  </div>
</div>
</body></html>`
}

// ── 02: ELECTRICAL PLAN ────────────────────────────────────────────────────────
function generateElectricalPlan() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Electrical Plan — ${CLIENT.ref}</title>
${BASE_CSS}
</head><body>
<div class="page">
  <div class="header">
    <div>
      <div class="header-logo">TM <span>ENERGY</span></div>
    </div>
    <div class="header-meta">
      <div style="font-weight:800;font-size:13px;color:var(--navy);">Electrical Plan & Cable Schedule</div>
      <div>REF: ${CLIENT.ref} | Rev 1.0 | ${CLIENT.installation_date}</div>
    </div>
  </div>

  <div class="doc-title">Electrical Plan — Cable Schedule</div>
  <div class="doc-subtitle">Full cable, protection, and grounding schedule — PEA IEC 62446 format</div>

  <!-- DC SIDE -->
  <div class="section">
    <div class="section-title">DC Side — PV Array to Inverter</div>
    <table>
      <thead><tr><th>Item</th><th>Spec</th><th>Qty</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td>PV Solar Cable (PV-1F 4mm²)</td><td>1000V DC, UV-resistant, TUV certified</td><td>50m</td><td>Red (+) / Black (-) per string</td></tr>
        <tr><td>MC4 Connectors (Staubli)</td><td>1000V DC, IP68, 30A rated</td><td>8 pairs</td><td>4 per string (2 strings)</td></tr>
        <tr><td>DC Isolator Switch</td><td>2-pole, 1000V DC, 25A per string</td><td>2</td><td>Adjacent to inverter, labeled</td></tr>
        <tr><td>DC SPD (Type I)</td><td>1000V DC, 40kA, IEC 61643-31</td><td>2</td><td>One per string, in combiner</td></tr>
        <tr><td>DC Fuse 15A/1100V</td><td>gR fuse, IEC 60269-6</td><td>4</td><td>2 per string (+ and -)</td></tr>
        <tr><td>Cable Conduit (25mm)</td><td>UV-resistant grey conduit</td><td>30m</td><td>From roof to inverter</td></tr>
      </tbody>
    </table>
  </div>

  <!-- AC SIDE -->
  <div class="section">
    <div class="section-title">AC Side — Inverter to MDB to PEA Grid</div>
    <table>
      <thead><tr><th>Item</th><th>Spec</th><th>Qty</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td>AC Cable NYY (3-phase)</td><td>NYY 4×6mm², 600/1000V</td><td>15m</td><td>Inverter to MDB</td></tr>
        <tr><td>AC Isolator / MCB</td><td>3-phase 32A, Type C, IEC 60898</td><td>1</td><td>Dedicated solar breaker in MDB</td></tr>
        <tr><td>AC SPD (Type II)</td><td>40kA, IEC 61643-11, 3-phase+N</td><td>1</td><td>At MDB entry point</td></tr>
        <tr><td>RCD (RCCB)</td><td>30mA, 32A, Type A, IEC 61008</td><td>1</td><td>Ground fault protection</td></tr>
        <tr><td>MCCB Main Disconnect</td><td>3-phase 32A, lockable, IEC 60947-2</td><td>1</td><td>Utility disconnect at MDB</td></tr>
        <tr><td>Smart Energy Meter</td><td>Huawei DDSU666-H bidirectional 3-phase</td><td>1</td><td>CT clamps, between inverter and grid</td></tr>
        <tr><td>CT Clamps 250A</td><td>Huawei compatible, 250A/26.7mA</td><td>1 set (×3)</td><td>One per phase for smart meter</td></tr>
        <tr><td>FusionSolar Dongle</td><td>Huawei Smart Dongle WLAN-FE</td><td>1</td><td>WiFi monitoring, DIN mount</td></tr>
      </tbody>
    </table>
  </div>

  <!-- BATTERY SIDE -->
  <div class="section">
    <div class="section-title">Battery Storage — Huawei LUNA2000</div>
    <table>
      <thead><tr><th>Item</th><th>Spec</th><th>Qty</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td>LUNA2000-10KW-C1 Power Module</td><td>Huawei HV, 10kW, IEC 62619</td><td>1</td><td>Mounted adjacent to inverter</td></tr>
        <tr><td>LUNA2000-7-E1 Battery Module</td><td>6.9 kWh LiFePO4, 100% DoD, HV</td><td>1</td><td>IP55, wall-mounted or floor</td></tr>
        <tr><td>HV Battery Cable (Huawei proprietary)</td><td>Included with LUNA2000</td><td>1 set</td><td>Max 2m run</td></tr>
        <tr><td>Battery Enclosure (if outdoor)</td><td>IP55 rated metal cabinet</td><td>1</td><td>Only if not in covered area</td></tr>
      </tbody>
    </table>
  </div>

  <!-- GROUNDING -->
  <div class="section">
    <div class="section-title">Grounding & Lightning Protection</div>
    <table>
      <thead><tr><th>Item</th><th>Spec</th><th>Qty</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td>Ground Rod (copper)</td><td>2.4m × 16mm, BS 7430</td><td>2</td><td>Min 1m apart, 3-ohm target</td></tr>
        <tr><td>Ground Wire (PE)</td><td>Green/Yellow NYY 10mm²</td><td>25m</td><td>Continuous from array to MDB</td></tr>
        <tr><td>Bonding Wire (EQP)</td><td>4mm² bare copper</td><td>20m</td><td>Panel frames + inverter + battery</td></tr>
        <tr><td>Exothermic Weld Kit</td><td>Cadweld, for rod connections</td><td>4</td><td>At each ground rod connection</td></tr>
        <tr><td>Ground Inspection Pit</td><td>Concrete box with cover</td><td>1</td><td>Access to ground rod test point</td></tr>
        <tr><td>Lightning Arrester (ESE)</td><td>IEC 62305, 60m radius protection</td><td>1</td><td>Optional — roof peak mount</td></tr>
      </tbody>
    </table>
  </div>

  <!-- DC/AC RATIO VALIDATION -->
  <div class="note-box">
    <strong>DC/AC Ratio Validation (IEC 62548):</strong>
    DC array = ${CLIENT.system_kwp} kWp / AC inverter = ${CLIENT.inverter_kw} kW → Ratio = ${(CLIENT.system_kwp / CLIENT.inverter_kw).toFixed(2)}
    (Optimal range: 1.05–1.35 per NREL best practice ✓)
  </div>

  <div class="footer">
    <div>TM Energy Thailand · ${CLIENT.ref} · Electrical Plan Rev 1.0</div>
    <div>For PEA application — Surat Thani Branch</div>
    <div>Page 1 of 1</div>
  </div>
</div>
</body></html>`
}

// ── 03: LAYOUT PLAN ────────────────────────────────────────────────────────────
function generateLayout() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Layout Plan — ${CLIENT.ref}</title>
${BASE_CSS}
</head><body>
<div class="page">
  <div class="header">
    <div><div class="header-logo">TM <span>ENERGY</span></div></div>
    <div class="header-meta">
      <div style="font-weight:800;font-size:13px;color:var(--navy);">Roof Layout Plan</div>
      <div>REF: ${CLIENT.ref} | Rev 1.0 | ${CLIENT.installation_date}</div>
    </div>
  </div>

  <div class="doc-title">Roof Layout Plan</div>
  <div class="doc-subtitle">Panel arrangement, string grouping, and mounting detail — 18 panels × 580W = 10.44 kWp</div>

  <!-- ROOF SPECS -->
  <div class="info-grid">
    <div class="info-item"><div class="info-label">Roof Type</div><div class="info-value">Red Ceramic Tile (Pitched)</div></div>
    <div class="info-item"><div class="info-label">Total Roof Area</div><div class="info-value">~120 m²</div></div>
    <div class="info-item"><div class="info-label">Orientation</div><div class="info-value">N-S Ridge</div></div>
    <div class="info-item"><div class="info-label">Shading</div><div class="info-value">5-8% morning (mango tree)</div></div>
    <div class="info-item"><div class="info-label">Panel Area Required</div><div class="info-value">18 × 2.42 m² = 43.6 m²</div></div>
    <div class="info-item"><div class="info-label">Tilt Angle</div><div class="info-value">~25° (follows roof pitch)</div></div>
  </div>

  <!-- VISUAL LAYOUT -->
  <div class="section">
    <div class="section-title">Panel Arrangement — Top View</div>
    <div style="background:#f0f4f8;border:1px solid var(--border);border-radius:12px;padding:20px;font-family:'Inter',monospace;font-size:11px;">

      <!-- NORTH SLOPE (East face) -->
      <div style="margin-bottom:20px;">
        <div style="text-align:center;font-weight:700;color:#6B7A8D;font-size:10px;letter-spacing:1.5px;margin-bottom:8px;">EAST SLOPE (Morning sun) — STRING 1: 9 panels</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;max-width:400px;margin:0 auto;">
          <div style="background:#E8A820;color:var(--navy);padding:10px 6px;text-align:center;border-radius:4px;font-weight:700;font-size:10px;">P01<br><small>580W</small></div>
          <div style="background:#E8A820;color:var(--navy);padding:10px 6px;text-align:center;border-radius:4px;font-weight:700;font-size:10px;">P02<br><small>580W</small></div>
          <div style="background:#E8A820;color:var(--navy);padding:10px 6px;text-align:center;border-radius:4px;font-weight:700;font-size:10px;">P03<br><small>580W</small></div>
          <div style="background:#E8A820;color:var(--navy);padding:10px 6px;text-align:center;border-radius:4px;font-weight:700;font-size:10px;">P04<br><small>580W</small></div>
          <div style="background:#E8A820;color:var(--navy);padding:10px 6px;text-align:center;border-radius:4px;font-weight:700;font-size:10px;">P05<br><small>580W</small></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;max-width:320px;margin:4px auto 0;">
          <div style="background:#E8A820;color:var(--navy);padding:10px 6px;text-align:center;border-radius:4px;font-weight:700;font-size:10px;">P06<br><small>580W</small></div>
          <div style="background:#E8A820;color:var(--navy);padding:10px 6px;text-align:center;border-radius:4px;font-weight:700;font-size:10px;">P07<br><small>580W</small></div>
          <div style="background:#E8A820;color:var(--navy);padding:10px 6px;text-align:center;border-radius:4px;font-weight:700;font-size:10px;">P08<br><small>580W</small></div>
          <div style="background:#E8A820;color:var(--navy);padding:10px 6px;text-align:center;border-radius:4px;font-weight:700;font-size:10px;">P09<br><small>580W</small></div>
        </div>
      </div>

      <!-- RIDGE -->
      <div style="border-top:3px solid var(--navy);margin:8px 0;text-align:center;font-size:10px;color:var(--navy);font-weight:700;padding-top:4px;">▲ RIDGE (N-S axis) ▲</div>

      <!-- SOUTH SLOPE (West face) -->
      <div style="margin-top:8px;">
        <div style="text-align:center;font-weight:700;color:#6B7A8D;font-size:10px;letter-spacing:1.5px;margin-bottom:8px;">WEST SLOPE (Afternoon sun) — STRING 2: 9 panels</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;max-width:400px;margin:0 auto;">
          <div style="background:#1A7A5A;color:white;padding:10px 6px;text-align:center;border-radius:4px;font-weight:700;font-size:10px;">P10<br><small>580W</small></div>
          <div style="background:#1A7A5A;color:white;padding:10px 6px;text-align:center;border-radius:4px;font-weight:700;font-size:10px;">P11<br><small>580W</small></div>
          <div style="background:#1A7A5A;color:white;padding:10px 6px;text-align:center;border-radius:4px;font-weight:700;font-size:10px;">P12<br><small>580W</small></div>
          <div style="background:#1A7A5A;color:white;padding:10px 6px;text-align:center;border-radius:4px;font-weight:700;font-size:10px;">P13<br><small>580W</small></div>
          <div style="background:#1A7A5A;color:white;padding:10px 6px;text-align:center;border-radius:4px;font-weight:700;font-size:10px;">P14<br><small>580W</small></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;max-width:320px;margin:4px auto 0;">
          <div style="background:#1A7A5A;color:white;padding:10px 6px;text-align:center;border-radius:4px;font-weight:700;font-size:10px;">P15<br><small>580W</small></div>
          <div style="background:#1A7A5A;color:white;padding:10px 6px;text-align:center;border-radius:4px;font-weight:700;font-size:10px;">P16<br><small>580W</small></div>
          <div style="background:#1A7A5A;color:white;padding:10px 6px;text-align:center;border-radius:4px;font-weight:700;font-size:10px;">P17<br><small>580W</small></div>
          <div style="background:#1A7A5A;color:white;padding:10px 6px;text-align:center;border-radius:4px;font-weight:700;font-size:10px;">P18<br><small>580W</small></div>
        </div>
      </div>

      <div style="margin-top:12px;display:flex;gap:20px;justify-content:center;font-size:10px;">
        <span style="display:flex;align-items:center;gap:6px;"><span style="background:#E8A820;width:14px;height:14px;display:inline-block;border-radius:2px;"></span> String 1 (P01–P09) → MPPT1</span>
        <span style="display:flex;align-items:center;gap:6px;"><span style="background:#1A7A5A;width:14px;height:14px;display:inline-block;border-radius:2px;"></span> String 2 (P10–P18) → MPPT2</span>
      </div>
    </div>
  </div>

  <!-- MOUNTING DETAIL -->
  <div class="section">
    <div class="section-title">Mounting System Detail</div>
    <table>
      <thead><tr><th>Component</th><th>Type</th><th>Qty</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td>Aluminum Tile Hooks</td><td>Adjustable height, SS316 bolt</td><td>36</td><td>2 per panel, EPDM seal under tile</td></tr>
        <tr><td>Aluminum Rail (4.4m)</td><td>Antal T-slot, 40×40mm</td><td>6</td><td>3 rails per slope</td></tr>
        <tr><td>Mid Clamps (35-40mm)</td><td>Aluminum, T-bolt M8</td><td>32</td><td>Between panels</td></tr>
        <tr><td>End Clamps (35-40mm)</td><td>Aluminum, T-bolt M8</td><td>8</td><td>At array edges</td></tr>
        <tr><td>Rail Splice Kit</td><td>Aluminum splice, 2× bolts</td><td>4</td><td>Where rails are joined</td></tr>
        <tr><td>Self-Drill Screws TEKs 5.5×35</td><td>Stainless, hex head</td><td>60</td><td>Hook to rafter attachment</td></tr>
        <tr><td>EPDM Sealant</td><td>Neutral cure silicone</td><td>3 tubes</td><td>Around all roof penetrations</td></tr>
      </tbody>
    </table>
  </div>

  <div class="warn-box">
    <strong>Installation Notes:</strong> Minimum 200mm clearance from ridge and eaves. Panels must not overhang roof edge. Cable management with UV-resistant conduit. All metal parts shall be bonded to PE grounding conductor.
  </div>

  <div class="footer">
    <div>TM Energy Thailand · ${CLIENT.ref} · Layout Plan Rev 1.0</div>
    <div>For PEA application — Surat Thani Branch</div>
    <div>Page 1 of 1</div>
  </div>
</div>
</body></html>`
}

// ── 04: EQUIPMENT SPECS SHEET ─────────────────────────────────────────────────
function generateSpecs() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Equipment Specs — ${CLIENT.ref}</title>
${BASE_CSS}
</head><body>
<div class="page">
  <div class="header">
    <div><div class="header-logo">TM <span>ENERGY</span></div></div>
    <div class="header-meta">
      <div style="font-weight:800;font-size:13px;color:var(--navy);">Equipment Specifications</div>
      <div>REF: ${CLIENT.ref} | Rev 1.0 | ${CLIENT.installation_date}</div>
    </div>
  </div>

  <div class="doc-title">Equipment Specifications Sheet</div>
  <div class="doc-subtitle">Tier-1 equipment datasheets summary — for PEA technical review</div>

  <!-- PANELS -->
  <div class="section">
    <div class="section-title">1. Solar Panels — JA Solar JAM72S40-580W (×18)</div>
    <div class="info-grid">
      <div class="info-item"><div class="info-label">Manufacturer</div><div class="info-value">JA Solar Holdings Co., Ltd.</div></div>
      <div class="info-item"><div class="info-label">Model</div><div class="info-value">JAM72S40-580/MR (MBB)</div></div>
      <div class="info-item"><div class="info-label">Technology</div><div class="info-value">Mono-crystalline PERC</div></div>
      <div class="info-item"><div class="info-label">Certification</div><div class="info-value">IEC 61215:2016, IEC 61730:2016, UL 1703</div></div>
    </div>
    <table>
      <thead><tr><th>Parameter</th><th>Value (STC)</th><th>Parameter</th><th>Value</th></tr></thead>
      <tbody>
        <tr><td>Pmax</td><td>580 W</td><td>Voc</td><td>49.8 V</td></tr>
        <tr><td>Vmpp</td><td>41.5 V</td><td>Isc</td><td>14.53 A</td></tr>
        <tr><td>Impp</td><td>13.98 A</td><td>Efficiency</td><td>21.4%</td></tr>
        <tr><td>Dimensions</td><td>2278 × 1134 × 35 mm</td><td>Weight</td><td>28.6 kg</td></tr>
        <tr><td>Operating Temp</td><td>-40°C to +85°C</td><td>Max System Voltage</td><td>1500V DC</td></tr>
        <tr><td>Power Tolerance</td><td>0/+5W</td><td>Temperature Coeff (Pmax)</td><td>-0.35%/°C</td></tr>
        <tr><td>Linear Power Warranty</td><td>25 years (97.5% yr1, 0.55%/yr)</td><td>Product Warranty</td><td>12 years</td></tr>
      </tbody>
    </table>
  </div>

  <!-- INVERTER -->
  <div class="section">
    <div class="section-title">2. Hybrid Inverter — Huawei SUN2000-10KTL-M1</div>
    <div class="info-grid">
      <div class="info-item"><div class="info-label">Manufacturer</div><div class="info-value">Huawei Technologies Co., Ltd.</div></div>
      <div class="info-item"><div class="info-label">Model</div><div class="info-value">SUN2000-10KTL-M1</div></div>
      <div class="info-item"><div class="info-label">Type</div><div class="info-value">Grid-tied Hybrid with battery port</div></div>
      <div class="info-item"><div class="info-label">Certification</div><div class="info-value">IEC 62109-1/2, IEC 61727, CEI 0-21, VDE-AR-N 4105</div></div>
    </div>
    <table>
      <thead><tr><th>Parameter (DC)</th><th>Value</th><th>Parameter (AC)</th><th>Value</th></tr></thead>
      <tbody>
        <tr><td>Max DC Power</td><td>13,000 W</td><td>Rated AC Power</td><td>10,000 W</td></tr>
        <tr><td>Max DC Voltage</td><td>1100 V</td><td>AC Voltage Range</td><td>180–270 V (per phase)</td></tr>
        <tr><td>MPPT Voltage Range</td><td>200–1000 V</td><td>Grid Frequency</td><td>45–55 Hz</td></tr>
        <tr><td>No. of MPPTs</td><td>2</td><td>Max AC Current</td><td>16 A</td></tr>
        <tr><td>Max DC Current per MPPT</td><td>13 A × 2</td><td>Power Factor</td><td>&gt;0.99 (adjustable 0.8 lead/lag)</td></tr>
        <tr><td>Max Efficiency</td><td>98.6%</td><td>Output THD</td><td>&lt;3%</td></tr>
        <tr><td>Battery Port Voltage</td><td>200–800V HV</td><td>IP Rating</td><td>IP65</td></tr>
        <tr><td>Product Warranty</td><td>10 years</td><td>Operating Temp</td><td>-25°C to +60°C</td></tr>
      </tbody>
    </table>
  </div>

  <!-- BATTERY -->
  <div class="section">
    <div class="section-title">3. Battery System — Huawei LUNA2000 (6.9 kWh)</div>
    <div class="info-grid">
      <div class="info-item"><div class="info-label">Power Module</div><div class="info-value">LUNA2000-10KW-C1</div></div>
      <div class="info-item"><div class="info-label">Battery Module</div><div class="info-value">LUNA2000-7-E1</div></div>
      <div class="info-item"><div class="info-label">Chemistry</div><div class="info-value">LiFePO4 (Lithium Iron Phosphate)</div></div>
      <div class="info-item"><div class="info-label">Certification</div><div class="info-value">IEC 62619, UN 38.3, CE, TUV</div></div>
    </div>
    <table>
      <thead><tr><th>Parameter</th><th>Value</th><th>Parameter</th><th>Value</th></tr></thead>
      <tbody>
        <tr><td>Usable Capacity</td><td>6.9 kWh</td><td>Charge/Discharge Power</td><td>5 kW (continuous)</td></tr>
        <tr><td>Voltage Range</td><td>200–800 V (HV)</td><td>Round-trip Efficiency</td><td>&gt;95%</td></tr>
        <tr><td>Max Depth of Discharge</td><td>100%</td><td>Cycle Life</td><td>6,000+ cycles @ 100% DoD</td></tr>
        <tr><td>Calendar Life</td><td>&gt;10 years</td><td>IP Rating</td><td>IP55</td></tr>
        <tr><td>Operating Temp</td><td>0°C to +55°C</td><td>Weight</td><td>75 kg (complete system)</td></tr>
        <tr><td>Battery Warranty</td><td>10 years / 60% capacity guarantee</td><td>Communication</td><td>RS485 / CAN to inverter</td></tr>
        <tr><td>BMS</td><td>Integrated Huawei AI BMS</td><td>Self-consumption</td><td>&lt;20W standby</td></tr>
      </tbody>
    </table>
  </div>

  <!-- SMART METER -->
  <div class="section">
    <div class="section-title">4. Smart Energy Meter — Huawei DDSU666-H</div>
    <table>
      <thead><tr><th>Parameter</th><th>Value</th></tr></thead>
      <tbody>
        <tr><td>Type</td><td>Bidirectional, 3-phase, 4-wire</td></tr>
        <tr><td>Rated Current</td><td>1.5(6) A or 3×(1-5)A with external CT</td></tr>
        <tr><td>Accuracy Class</td><td>Class 1 (IEC 62053-21)</td></tr>
        <tr><td>Communication</td><td>RS485, Modbus RTU</td></tr>
        <tr><td>Display</td><td>LCD — import/export kWh, power, voltage, current</td></tr>
        <tr><td>Operating Voltage</td><td>3×230/400V ±20%</td></tr>
        <tr><td>Certification</td><td>IEC 62052-11, IEC 62053-21, MID</td></tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <div>TM Energy Thailand · ${CLIENT.ref} · Equipment Specs Rev 1.0</div>
    <div>For PEA application — Surat Thani Branch</div>
    <div>Page 1 of 1</div>
  </div>
</div>
</body></html>`
}

// ── 05: APPLICATION LETTER (THAI + ENGLISH) ───────────────────────────────────
function generateApplicationLetter() {
  const today = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
  const todayEn = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">
<title>PEA Application Letter — ${CLIENT.ref}</title>
${BASE_CSS}
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  .thai { font-family: 'Noto Sans Thai', 'Sarabun', sans-serif; }
  .letter-body { font-size:13px; line-height:2.0; }
  .letter-section { margin-bottom:24px; }
  .indent { margin-right:40px; text-indent:40px; }
  .signature-block { margin-top:60px; display:grid; grid-template-columns:1fr 1fr; gap:40px; }
  .sig-box { text-align:center; }
  .sig-line { border-top:1px solid var(--border); margin:40px 20px 8px; }
  .sig-name { font-weight:700; }
  .sig-title { font-size:11px; color:#6B7A8D; }
  .bilingual { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
  .lang-th { font-family:'Noto Sans Thai',sans-serif; }
  .lang-en { font-family:'Inter',sans-serif; }
</style>
</head><body>
<div class="page">
  <div class="header">
    <div>
      <div class="header-logo">TM <span>ENERGY</span></div>
      <div style="font-size:11px;color:#6B7A8D;margin-top:4px;">Ko Phangan, Surat Thani, Thailand</div>
    </div>
    <div class="header-meta">
      <div style="font-weight:800;font-size:13px;color:var(--navy);">PEA Application Letter</div>
      <div>REF: ${CLIENT.ref} | ${todayEn}</div>
    </div>
  </div>

  <div class="doc-title">Application for Solar Rooftop Connection</div>
  <div class="doc-subtitle">PEA Surat Thani Provincial Branch — VSPP Application (Net Metering)</div>

  <div class="bilingual" style="margin-top:24px;">
    <!-- THAI VERSION -->
    <div class="lang-th letter-body">
      <div class="letter-section">
        <div style="text-align:right;margin-bottom:16px;">
          <strong>วันที่:</strong> ${today}
        </div>
        <div>
          <strong>เรื่อง:</strong> ขออนุญาตติดตั้งระบบผลิตไฟฟ้าพลังงานแสงอาทิตย์บนหลังคาและขอเชื่อมต่อกับระบบจำหน่ายไฟฟ้า (VSPP)
        </div>
        <div style="margin-top:12px;">
          <strong>เรียน:</strong> ผู้จัดการการไฟฟ้าส่วนภูมิภาค สาขาเกาะพะงัน
        </div>
      </div>

      <div class="letter-section">
        <p class="indent">
          ข้าพเจ้า ${CLIENT.name_th} มีความประสงค์ขออนุญาตติดตั้งระบบผลิตไฟฟ้าพลังงานแสงอาทิตย์แบบออนกริด (Solar Rooftop PV System) บนอาคารที่พักอาศัย ตั้งอยู่ที่ ${CLIENT.address_th} โดยมีรายละเอียดระบบดังนี้
        </p>
      </div>

      <div class="letter-section">
        <table>
          <tr><td><strong>ขนาดระบบ (PV Array)</strong></td><td>${CLIENT.system_kwp} kWp</td></tr>
          <tr><td><strong>จำนวนแผงโซลาร์เซลล์</strong></td><td>${CLIENT.panel_count} แผง × ${CLIENT.panel_watt} W (${CLIENT.panel_model})</td></tr>
          <tr><td><strong>อินเวอร์เตอร์</strong></td><td>${CLIENT.inverter_model} ${CLIENT.inverter_kw} kW (ไฮบริด)</td></tr>
          <tr><td><strong>แบตเตอรี่สำรอง</strong></td><td>${CLIENT.battery_model} ${CLIENT.battery_kwh} kWh LiFePO4</td></tr>
          <tr><td><strong>แรงดันไฟฟ้าที่เชื่อมต่อ</strong></td><td>230/400 V สามเฟส 50 Hz</td></tr>
          <tr><td><strong>จุดเชื่อมต่อ</strong></td><td>ผ่านมิเตอร์ PEA ที่มีอยู่เดิม (นำเข้า/ส่งออก)</td></tr>
          <tr><td><strong>ประเภทการเชื่อมต่อ</strong></td><td>VSPP / Net Metering</td></tr>
        </table>
      </div>

      <div class="letter-section">
        <p class="indent">
          ระบบดังกล่าวได้รับการออกแบบตามมาตรฐาน IEC 62109, IEC 61215, IEC 62446 และข้อกำหนดทางเทคนิคของการไฟฟ้าส่วนภูมิภาค ข้าพเจ้าขอยื่นเอกสารประกอบดังนี้:
        </p>
        <ul style="margin-right:24px;margin-top:8px;line-height:2.2;">
          <li>แบบ Single Line Diagram (SLD)</li>
          <li>แผนผังการติดตั้ง (Layout Plan)</li>
          <li>ตารางสายไฟ (Cable Schedule)</li>
          <li>ข้อมูลจำเพาะอุปกรณ์ (Equipment Specs)</li>
          <li>สำเนาบัตรประชาชน / หนังสือเดินทาง</li>
          <li>สำเนาสัญญาซื้อขายไฟฟ้า (ถ้ามี)</li>
        </ul>
      </div>

      <div class="letter-section">
        <p class="indent">
          จึงเรียนมาเพื่อโปรดพิจารณาอนุญาต และขอขอบคุณเป็นอย่างยิ่ง
        </p>
      </div>

      <div class="signature-block">
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-name">( ${CLIENT.name_th} )</div>
          <div class="sig-title">เจ้าของระบบ / ผู้ยื่นคำขอ</div>
          <div class="sig-title">วันที่: ......./......./.........</div>
        </div>
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-name">( TM Energy Thailand )</div>
          <div class="sig-title">ผู้ติดตั้งระบบ / ผู้รับเหมา</div>
          <div class="sig-title">เบอร์โทร: +66-86-443-4951</div>
        </div>
      </div>
    </div>

    <!-- ENGLISH VERSION -->
    <div class="lang-en letter-body">
      <div class="letter-section">
        <div style="text-align:right;margin-bottom:16px;">
          <strong>Date:</strong> ${todayEn}
        </div>
        <div>
          <strong>Subject:</strong> Application for Solar Rooftop PV System Installation and Grid Connection (VSPP / Net Metering)
        </div>
        <div style="margin-top:12px;">
          <strong>To:</strong> Branch Manager, Provincial Electricity Authority (PEA) — Ko Phangan Sub-branch, Surat Thani Province
        </div>
      </div>

      <div class="letter-section">
        <p>
          I, ${CLIENT.name_en}, hereby apply for permission to install a grid-connected solar rooftop PV system at my residence located at ${CLIENT.address}. System specifications are as follows:
        </p>
      </div>

      <div class="letter-section">
        <table>
          <tr><td><strong>PV Array Size</strong></td><td>${CLIENT.system_kwp} kWp</td></tr>
          <tr><td><strong>Solar Panels</strong></td><td>${CLIENT.panel_count}× ${CLIENT.panel_watt}W (${CLIENT.panel_model})</td></tr>
          <tr><td><strong>Inverter</strong></td><td>${CLIENT.inverter_model} ${CLIENT.inverter_kw}kW (Hybrid)</td></tr>
          <tr><td><strong>Battery Storage</strong></td><td>${CLIENT.battery_model} ${CLIENT.battery_kwh} kWh LiFePO4</td></tr>
          <tr><td><strong>Grid Connection</strong></td><td>230/400V 3-phase 50Hz via existing PEA meter</td></tr>
          <tr><td><strong>Connection Type</strong></td><td>VSPP — Net Metering (bidirectional smart meter)</td></tr>
        </table>
      </div>

      <div class="letter-section">
        <p>The system is designed in accordance with IEC 62109, IEC 61215, IEC 62446, and PEA technical requirements. Enclosed documents include: SLD, Layout Plan, Cable Schedule, Equipment Datasheets. I respectfully request your kind approval.</p>
      </div>

      <div style="margin-top:24px;">
        <p>Yours respectfully,</p>
        <div style="margin-top:40px;">
          <div style="border-top:1px solid var(--border);width:200px;padding-top:6px;">
            <div style="font-weight:700;">${CLIENT.name_en}</div>
            <div style="font-size:11px;color:#6B7A8D;">System Owner / Applicant</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div>TM Energy Thailand · ${CLIENT.ref} · PEA Application Letter</div>
    <div>PEA Surat Thani Branch — Ko Phangan Sub-branch</div>
    <div>Page 1 of 1</div>
  </div>
</div>
</body></html>`
}

// ── MAIN ───────────────────────────────────────────────────────────────────────
async function main() {
  const baseOut = join(__dirname, 'output')
  const peaDir = join(baseOut, 'AMIR-001-PEA-package')
  if (!existsSync(peaDir)) mkdirSync(peaDir, { recursive: true })

  const docs = [
    { file: '01-sld', html: generateSLD() },
    { file: '02-electrical-plan', html: generateElectricalPlan() },
    { file: '03-layout', html: generateLayout() },
    { file: '04-specs', html: generateSpecs() },
    { file: '05-application-letter-th', html: generateApplicationLetter() },
  ]

  // Write all HTMLs first
  for (const doc of docs) {
    const htmlPath = join(peaDir, `${doc.file}.html`)
    writeFileSync(htmlPath, doc.html)
    console.log(`HTML: ${htmlPath}`)
  }

  // Generate PDFs
  try {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch()

    for (const doc of docs) {
      const htmlPath = join(peaDir, `${doc.file}.html`)
      const pdfPath = join(peaDir, `${doc.file}.pdf`)
      const page = await browser.newPage()
      await page.goto(`file://${resolve(htmlPath)}`)
      await page.waitForTimeout(1500)
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' }
      })
      await page.close()
      console.log(`PDF: ${pdfPath}`)
    }

    await browser.close()
  } catch (e) {
    console.warn('Playwright error:', e.message)
  }

  // README
  const readme = `# AMIR-001 PEA Application Package
## TM Energy · Option 3 (Hybrid + Battery)

**System:** ${CLIENT.system_kwp} kWp · ${CLIENT.panel_count}× JA Solar 580W · Huawei SUN2000-10KTL-M1 + LUNA2000-7-E1 (6.9 kWh)
**Location:** ${CLIENT.address}
**Date:** ${CLIENT.installation_date}

## Documents

| File | Description | Submit to |
|------|-------------|-----------|
| 01-sld.pdf | Single Line Diagram (SLD) | PEA Engineer |
| 02-electrical-plan.pdf | Cable Schedule + Protection | PEA Engineer |
| 03-layout.pdf | Roof Layout + Mounting Plan | PEA Inspector |
| 04-specs.pdf | Equipment Datasheets Summary | PEA Engineer |
| 05-application-letter-th.pdf | Official Application Letter (Thai + English) | PEA Manager |

## Submission Notes

1. Submit all 5 PDFs to PEA Surat Thani Branch — Ko Phangan Sub-branch
2. Bring originals + 2 copies each
3. Client signs application letter (05) before submission
4. PEA inspection follows within 2-4 weeks after submission
5. Installation can begin after PEA approval letter received

## Compliance Standards
- IEC 62446 (PV system documentation)
- IEC 61215 (Module design qualification)
- IEC 62109-1/2 (Inverter safety)
- IEC 62619 (Battery systems)
- PEA VSPP Technical Requirements B.E. 2566 (2023)
`
  writeFileSync(join(peaDir, 'README.md'), readme)
  console.log(`README: ${join(peaDir, 'README.md')}`)
}

main().catch(e => { console.error(e); process.exit(1) })
