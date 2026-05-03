#!/usr/bin/env node
// ============================================================
// Bustan Energy -- 3-Option Proposal Generator (multi-language)
// Usage:
//   node generate-3opt.mjs --data clients/amir-3options.json --lang he
//   node generate-3opt.mjs --data clients/amir-3options.json --lang en
//   node generate-3opt.mjs --data clients/amir-3options.json --lang th
// ============================================================

import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'fs'
import { createHash } from 'crypto'
import { dirname, resolve, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function fmt(num) {
  if (num == null) return '--'
  return Number(num).toLocaleString('en-US')
}

function sha256(input) {
  return createHash('sha256').update(input).digest('hex')
}

// ---- TRANSLATIONS ----
const T = {
  he: {
    dir: 'rtl',
    lang: 'he',
    font: "'Heebo', 'Inter', sans-serif",
    nav_brand: 'BUSTAN ENERGY · PHANGAN',
    proposal_label: 'הצעת מחיר',
    hero_title: 'מערכת סולארית',
    hero_subtitle: 'kWp — קופנגן, תאילנד',
    hero_client_label: 'לקוח',
    hero_location_label: 'מיקום',
    hero_validity_label: 'תוקף',
    hero_validity_value: '30 יום',
    hero_desc: 'בחר מבין שלוש אפשרויות — אותם רכיבי פרמיום, רמות שונות של עצמאות אנרגטית.',
    visual_label: 'סימולציה ויזואלית',
    visual_heading: 'הגג שלך עם המערכת',
    visual_before: 'לפני',
    visual_tag_before: 'תמונת רחפן',
    visual_after: 'אחרי',
    roof_label: 'ניתוח הגג',
    roof_heading: 'מדידות ותכנון',
    roof_area: 'שטח גג',
    roof_panels_label: 'פאנלים',
    roof_orient: 'אוריינטציה',
    roof_type: 'רעפים אדומים',
    roof_type_label: 'סוג גג',
    production_label: 'תחזית ייצור',
    production_heading: 'שעות שמש חודשיות · קופנגן',
    production_desc: 'נתוני קרינה NASA SSE · תיקון חום טרופי PR=0.7469 · בדיקת הצללה 5-8%',
    psh_avg: 'ממוצע שנתי',
    psh_unit: 'שעות / יום',
    annual_kwh_label: 'ייצור שנתי',
    monthly_kwh_label: 'ייצור חודשי',
    months: ['ינו','פבר','מרץ','אפר','מאי','יונ','יול','אוג','ספט','אוק','נוב','דצמ'],
    options_label: 'האפשרויות שלך',
    options_heading: 'בחר את הרמה שמתאימה לך',
    options_desc: 'כל האפשרויות כוללות 18 פאנלים JA Solar 580W, כבלאות, הגנות, מד חכם PEA, וניטור FusionSolar.',
    price_label: 'מחיר',
    monthly_savings: 'חיסכון חודשי',
    annual_savings: 'חיסכון שנתי',
    payback_label: 'החזר השקעה (מהוון)',
    payback_unit: 'שנים',
    savings_25yr: 'חיסכון 25 שנה',
    co2_label: 'CO₂ נחסך (25 שנה)',
    co2_unit: 'טון',
    choose_btn: 'בחר אפשרות זו',
    compare_label: 'השוואה מלאה',
    compare_heading: 'אחד ליד השני',
    compare_upfront: 'עלות מקדמה',
    compare_inverter: 'אינוורטר',
    compare_battery: 'סוללה',
    compare_annual_savings: 'חיסכון שנתי',
    compare_payback: 'החזר השקעה',
    compare_savings_25: 'חיסכון 25 שנה',
    compare_backup: 'גיבוי בהפסקות',
    compare_warranty: 'אחריות',
    yes: 'כן',
    no: 'לא',
    warranty_val: '25 שנה פאנלים / 10 שנה אינוורטר',
    warranty_batt: '25 שנה פאנלים / 10 שנה אינוורטר + סוללה',
    savings_label: 'חיסכון בחשבון החשמל',
    pea_vs_solar: 'PEA לעומת סולאר',
    pea_bill: 'חשבון PEA חודשי (ממוצע)',
    solar_bill: 'חשבון אחרי סולאר',
    env_label: 'השפעה סביבתית',
    env_heading: 'ב-25 שנה',
    trees_equivalent: 'עצים שתולים (שווה ערך)',
    cars_off_road: 'שנות נסיעת רכב שנחסכות',
    houses_powered: 'חודשי-בית מכוסים',
    timeline_label: 'לוח זמנים',
    timeline_heading: 'מחתימה עד הפעלה',
    t1_title: 'חתימת חוזה',
    t1_period: 'שבוע 1',
    t2_title: 'הגשת PEA',
    t2_period: 'שבועות 1-2',
    t3_title: 'התקנה',
    t3_period: 'ימים 3-5',
    t4_title: 'הפעלה',
    t4_period: 'שבוע 4',
    cta_heading: 'מוכן להתחיל לחסוך?',
    cta_desc: 'צרו קשר עכשיו ונתקדם לחתימה.',
    cta_whatsapp: 'WhatsApp עם Erez',
    footer_ref: 'הצעה תקפה ל-30 יום ממועד ההנפקה',
    footer_brand: 'Bustan Energy Thailand',
    featured_tag: 'הכי מומלץ',
    includes_label: 'כולל:',
    no_battery: 'ללא סוללה',
    battery_backup_label: 'גיבוי חשמל'
  },
  en: {
    dir: 'ltr',
    lang: 'en',
    font: "'Inter', sans-serif",
    nav_brand: 'BUSTAN ENERGY · PHANGAN',
    proposal_label: 'Solar Proposal',
    hero_title: 'Solar System',
    hero_subtitle: 'kWp — Ko Phangan, Thailand',
    hero_desc: 'Choose from three options — the same premium components, different levels of energy independence.',
    hero_client_label: 'Client',
    hero_location_label: 'Location',
    hero_validity_label: 'Valid',
    hero_validity_value: '30 days',
    visual_label: 'Visual Simulation',
    visual_heading: 'Your Roof With Panels',
    visual_before: 'Before',
    visual_tag_before: 'Drone photo',
    visual_after: 'After',
    roof_label: 'Roof Analysis',
    roof_heading: 'Measurements & Planning',
    roof_area: 'Roof area',
    roof_panels_label: 'Panels',
    roof_orient: 'Orientation',
    roof_type: 'Red ceramic tiles',
    roof_type_label: 'Roof type',
    production_label: 'Production Forecast',
    production_heading: 'Monthly Peak Sun Hours · Ko Phangan',
    production_desc: 'NASA SSE irradiance data · Tropical heat correction PR=0.7469 · 5-8% shading adjustment',
    psh_avg: 'Annual average',
    psh_unit: 'hours / day',
    annual_kwh_label: 'Annual production',
    monthly_kwh_label: 'Monthly production',
    months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    options_label: 'Your Options',
    options_heading: 'Choose Your Level',
    options_desc: 'All options include 18× JA Solar 580W panels, cabling, protection, PEA smart meter, and FusionSolar monitoring.',
    price_label: 'Price',
    monthly_savings: 'Monthly savings',
    annual_savings: 'Annual savings',
    payback_label: 'Payback period (discounted)',
    payback_unit: 'years',
    savings_25yr: '25-year savings',
    co2_label: 'CO₂ avoided (25 years)',
    co2_unit: 'tons',
    choose_btn: 'Select this option',
    compare_label: 'Full Comparison',
    compare_heading: 'Side by Side',
    compare_upfront: 'Upfront cost',
    compare_inverter: 'Inverter',
    compare_battery: 'Battery',
    compare_annual_savings: 'Annual savings',
    compare_payback: 'Payback period',
    compare_savings_25: '25-yr savings',
    compare_backup: 'Backup during outages',
    compare_warranty: 'Warranty',
    yes: 'Yes',
    no: 'No',
    warranty_val: '25yr panels / 10yr inverter',
    warranty_batt: '25yr panels / 10yr inverter + battery',
    savings_label: 'Electricity Bill Savings',
    pea_vs_solar: 'PEA vs Solar',
    pea_bill: 'Monthly PEA bill (avg)',
    solar_bill: 'Bill after solar',
    env_label: 'Environmental Impact',
    env_heading: 'Over 25 Years',
    trees_equivalent: 'Equivalent trees planted',
    cars_off_road: 'Car-years of driving avoided',
    houses_powered: 'Home-months powered',
    timeline_label: 'Timeline',
    timeline_heading: 'Sign to Switch-On',
    t1_title: 'Contract signed',
    t1_period: 'Week 1',
    t2_title: 'PEA application',
    t2_period: 'Weeks 1-2',
    t3_title: 'Installation',
    t3_period: 'Days 3-5',
    t4_title: 'Go Live',
    t4_period: 'Week 4',
    cta_heading: 'Ready to start saving?',
    cta_desc: 'Contact us now and we will proceed to sign.',
    cta_whatsapp: 'WhatsApp Erez',
    footer_ref: 'Proposal valid for 30 days from issue date',
    footer_brand: 'Bustan Energy Thailand',
    featured_tag: 'Most Popular',
    includes_label: 'Includes:',
    no_battery: 'No battery',
    battery_backup_label: 'Power backup'
  },
  th: {
    dir: 'ltr',
    lang: 'th',
    font: "'Noto Sans Thai', 'Inter', sans-serif",
    nav_brand: 'BUSTAN ENERGY · เกาะพะงัน',
    proposal_label: 'ใบเสนอราคาโซลาร์เซลล์',
    hero_title: 'ระบบโซลาร์เซลล์',
    hero_subtitle: 'kWp — เกาะพะงัน, ประเทศไทย',
    hero_desc: 'เลือกจาก 3 ตัวเลือก — อุปกรณ์คุณภาพสูงเหมือนกัน ระดับความเป็นอิสระด้านพลังงานที่แตกต่าง',
    hero_client_label: 'ลูกค้า',
    hero_location_label: 'สถานที่',
    hero_validity_label: 'ระยะเวลา',
    hero_validity_value: '30 วัน',
    visual_label: 'จำลองภาพ',
    visual_heading: 'หลังคาของคุณพร้อมแผง',
    visual_before: 'ก่อน',
    visual_tag_before: 'ภาพโดรน',
    visual_after: 'หลัง',
    roof_label: 'วิเคราะห์หลังคา',
    roof_heading: 'การวัดและการวางแผน',
    roof_area: 'พื้นที่หลังคา',
    roof_panels_label: 'แผง',
    roof_orient: 'ทิศทาง',
    roof_type: 'กระเบื้องเซรามิกสีแดง',
    roof_type_label: 'ประเภทหลังคา',
    production_label: 'การผลิตไฟฟ้า',
    production_heading: 'ชั่วโมงแสงอาทิตย์รายเดือน · เกาะพะงัน',
    production_desc: 'ข้อมูล NASA SSE · ปรับค่า PR=0.7469 สภาพอากาศร้อนชื้น',
    psh_avg: 'ค่าเฉลี่ยรายปี',
    psh_unit: 'ชั่วโมง / วัน',
    annual_kwh_label: 'การผลิตรายปี',
    monthly_kwh_label: 'การผลิตรายเดือน',
    months: ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'],
    options_label: 'ตัวเลือกของคุณ',
    options_heading: 'เลือกระดับที่เหมาะกับคุณ',
    options_desc: 'ทุกตัวเลือกรวมแผง 18 แผง JA Solar 580W, สายเคเบิล, อุปกรณ์ป้องกัน, มิเตอร์อัจฉริยะ PEA และการติดตาม FusionSolar',
    price_label: 'ราคา',
    monthly_savings: 'ประหยัดต่อเดือน',
    annual_savings: 'ประหยัดต่อปี',
    payback_label: 'ระยะคืนทุน (คิดลด 8%)',
    payback_unit: 'ปี',
    savings_25yr: 'ประหยัด 25 ปี',
    co2_label: 'CO₂ ที่ลดได้ (25 ปี)',
    co2_unit: 'ตัน',
    choose_btn: 'เลือกตัวเลือกนี้',
    compare_label: 'เปรียบเทียบทั้งหมด',
    compare_heading: 'เปรียบเทียบเคียงข้าง',
    compare_upfront: 'ค่าใช้จ่ายล่วงหน้า',
    compare_inverter: 'อินเวอร์เตอร์',
    compare_battery: 'แบตเตอรี่',
    compare_annual_savings: 'ประหยัดต่อปี',
    compare_payback: 'ระยะคืนทุน',
    compare_savings_25: 'ประหยัด 25 ปี',
    compare_backup: 'สำรองไฟฟ้า',
    compare_warranty: 'การรับประกัน',
    yes: 'ใช่',
    no: 'ไม่',
    warranty_val: '25 ปีแผง / 10 ปีอินเวอร์เตอร์',
    warranty_batt: '25 ปีแผง / 10 ปีอินเวอร์เตอร์+แบตเตอรี่',
    savings_label: 'ประหยัดค่าไฟฟ้า',
    pea_vs_solar: 'PEA vs โซลาร์',
    pea_bill: 'ค่าไฟ PEA ต่อเดือน (เฉลี่ย)',
    solar_bill: 'ค่าไฟหลังติดโซลาร์',
    env_label: 'ผลกระทบต่อสิ่งแวดล้อม',
    env_heading: 'ใน 25 ปี',
    trees_equivalent: 'เทียบเท่าปลูกต้นไม้',
    cars_off_road: 'ลดการขับรถ (ปี-คัน)',
    houses_powered: 'บ้านเดือนที่ใช้พลังงานได้',
    timeline_label: 'ตารางเวลา',
    timeline_heading: 'จากลงนามถึงเปิดใช้งาน',
    t1_title: 'ลงนามสัญญา',
    t1_period: 'สัปดาห์ที่ 1',
    t2_title: 'ยื่น PEA',
    t2_period: 'สัปดาห์ 1-2',
    t3_title: 'ติดตั้ง',
    t3_period: 'วันที่ 3-5',
    t4_title: 'เปิดใช้งาน',
    t4_period: 'สัปดาห์ที่ 4',
    cta_heading: 'พร้อมเริ่มประหยัดแล้วหรือยัง?',
    cta_desc: 'ติดต่อเราตอนนี้เพื่อดำเนินการต่อ',
    cta_whatsapp: 'WhatsApp Erez',
    footer_ref: 'ใบเสนอราคามีผล 30 วันนับจากวันออก',
    footer_brand: 'Bustan Energy Thailand',
    featured_tag: 'แนะนำมากที่สุด',
    includes_label: 'รวมถึง:',
    no_battery: 'ไม่มีแบตเตอรี่',
    battery_backup_label: 'สำรองไฟฟ้า'
  }
}

function generateHTML(data, lang) {
  const t = T[lang] || T.he
  const passwordHash = sha256(data.password || '603485')
  const ref = data.ref
  const opts = data.options
  const o1 = opts[0], o2 = opts[1], o3 = opts[2]

  // Estimated PEA bill (annual_kwh * tariff / 12)
  const annualKwh = data.annual_kwh
  const monthlyKwh = data.monthly_kwh
  const peaBillMonthly = Math.round(annualKwh * 4.4 / 12)
  const solarBillOpt3 = Math.round(o3.monthly_savings_thb * 0.15)

  // Env stats
  const co2Tons = data.co2_tons_avoided
  const treesEquiv = Math.round(co2Tons * 45)
  const carYears = Math.round(co2Tons / 4.6)
  const homeMonths = Math.round(annualKwh * 25 / 400)

  // Savings bar widths
  const solarBarPct = Math.round((o3.annual_savings_thb / (peaBillMonthly * 12)) * 100)

  const clientNameDisplay = lang === 'he' ? (data.client_name_he || data.client_name) : data.client_name

  function optionCard(o, t) {
    const isFeatured = o.featured
    const featuredClass = isFeatured ? 'featured' : ''
    const tagHTML = isFeatured ? `<div class="option-tag">${t.featured_tag}</div>` : ''
    const iconMap = { sun: '⚡', hybrid: '🔆', battery: '🔋' }
    const icon = iconMap[o.icon] || '☀️'
    const nameKey = `name_${lang}` in o ? `name_${lang}` : 'name_he'
    const taglineKey = `tagline_${lang}` in o ? `tagline_${lang}` : 'tagline_he'
    const labelKey = `label_${lang}` in o ? `label_${lang}` : 'label_he'
    const featuresKey = `features_${lang}` in o ? `features_${lang}` : 'features_he'
    const name = o[nameKey] || o.name_he || o.name || ''
    const tagline = o[taglineKey] || o.tagline_he || ''
    const label = o[labelKey] || o.label_he || ''
    const features = o[featuresKey] || o.features_he || []
    const batteryInfo = o.battery_kwh
      ? `${o.battery_model} · ${o.battery_kwh} kWh LiFePO4`
      : t.no_battery
    const btmClass = isFeatured ? 'gold' : 'green'
    const btmValClass = isFeatured ? 'gold-text' : 'green-text'
    return `
      <div class="option-card ${featuredClass}" id="optCard_${o.id}">
        ${tagHTML}
        <div class="option-icon">${icon}</div>
        <div class="option-name">${label}</div>
        <div class="option-name" style="font-size:15px;margin-top:2px;">${name}</div>
        <div class="option-desc">${tagline}</div>
        <div class="option-price">
          ฿${fmt(o.price_thb)}
          <span class="option-price-note">${t.price_label}</span>
        </div>
        <div class="option-features">
          ${features.map(f => `<div class="option-feature"><span class="check-icon">✓</span> ${f}</div>`).join('\n          ')}
        </div>
        <div class="option-bottom ${btmClass}">
          <div class="option-bottom-label">${t.annual_savings}</div>
          <div class="option-bottom-value ${btmValClass}">฿${fmt(o.annual_savings_thb)}</div>
          <div class="option-bottom-sub">${t.payback_label}: <strong>${o.payback_years} ${t.payback_unit}</strong></div>
        </div>
        <button class="option-choose-btn" onclick="selectOption('${o.id}')">${t.choose_btn}</button>
      </div>`
  }

  const pshMonths = [5.7,6.1,6.3,6.0,4.8,4.4,4.2,4.0,4.2,3.8,4.8,5.4]
  const pshMax = Math.max(...pshMonths)
  const pshBars = pshMonths.map((v, i) =>
    `<div class="psh-bar"><div class="psh-bar-fill" style="height:${Math.round(v/pshMax*100)}%;"><span class="psh-bar-value">${v}</span></div><span class="psh-bar-label">${t.months[i]}</span></div>`
  ).join('\n        ')

  const htmlDir = t.dir
  const htmlLang = t.lang

  const html = `<!DOCTYPE html>
<html lang="${htmlLang}" dir="${htmlDir}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bustan Energy — ${t.proposal_label} · ${clientNameDisplay}</title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#9728;</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&family=Noto+Sans+Thai:wght@400;700;900&display=swap" rel="stylesheet">
<style>
:root {
  --navy: #0D2137;
  --navy-light: #132D4A;
  --gold: #E8A820;
  --gold-soft: rgba(232,168,32,.08);
  --green: #1A7A5A;
  --green-soft: rgba(26,122,90,.08);
  --white: #FFFFFF;
  --bg: #F7F8FA;
  --text: #1A2332;
  --text-secondary: #6B7A8D;
  --border: rgba(0,0,0,.08);
  --shadow-sm: 0 1px 3px rgba(0,0,0,.04);
  --shadow-md: 0 4px 20px rgba(0,0,0,.06);
  --shadow-lg: 0 12px 40px rgba(0,0,0,.1);
  --radius: 16px;
  --radius-sm: 10px;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: ${t.font};
  background: var(--bg);
  color: var(--text);
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
  direction: ${htmlDir};
}
h1,h2,h3 { font-weight: 900; }
.container { max-width: 1080px; margin: 0 auto; padding: 0 24px; }
section { padding: 72px 0; }
.section-label { font-size: 11px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: var(--gold); margin-bottom: 12px; }
.section-heading { font-size: clamp(28px,4vw,38px); font-weight: 900; color: var(--navy); line-height: 1.3; margin-bottom: 8px; }
.section-desc { font-size: 16px; color: var(--text-secondary); max-width: 560px; margin-bottom: 40px; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: rgba(13,33,55,.97); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(232,168,32,.15); padding: 0 24px; height: 56px; display: flex; align-items: center; justify-content: space-between; }
.nav-brand { font-weight: 800; font-size: 13px; color: var(--gold); letter-spacing: 2.5px; }
.nav-logo-img { width: 38px; height: 38px; margin-left: 10px; margin-right: 10px; vertical-align: middle; border-radius: 50%; }
.nav-ref { font-size: 12px; color: rgba(255,255,255,.6); font-family: 'Inter', monospace; }
.hero { background: linear-gradient(135deg,var(--navy) 0%,var(--navy-light) 100%); color: white; padding: 140px 0 100px; position: relative; overflow: hidden; }
.hero::before { content:''; position:absolute; top:-50%; left:-20%; width:80%; height:200%; background:radial-gradient(circle,rgba(232,168,32,.08) 0%,transparent 60%); pointer-events:none; }
.hero-ref { display:inline-block; padding:6px 14px; background:rgba(232,168,32,.12); border:1px solid rgba(232,168,32,.3); border-radius:100px; color:var(--gold); font-size:11px; font-weight:700; letter-spacing:1.5px; margin-bottom:24px; }
.hero h1 { font-size:clamp(36px,6vw,60px); font-weight:900; line-height:1.1; margin-bottom:20px; letter-spacing:-0.5px; }
.hero h1 span { color:var(--gold); }
.hero p { font-size:18px; color:rgba(255,255,255,.75); max-width:620px; margin-bottom:40px; }
.hero-meta { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; max-width:600px; position:relative; z-index:2; }
.hero-meta-item { border-right:1px solid rgba(232,168,32,.3); padding-right:20px; }
.hero-meta-item:last-child { border-right:none; }
.hero-meta-label { font-size:11px; color:rgba(255,255,255,.5); font-weight:600; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:6px; }
.hero-meta-value { font-size:20px; font-weight:800; color:white; }
.visual-compare { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:40px 0; }
.visual-card { background:white; border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow-md); border:1px solid var(--border); }
.visual-card img { width:100%; height:auto; display:block; }
.visual-caption { padding:14px 18px; font-size:13px; font-weight:700; color:var(--navy); border-top:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
.visual-tag { background:var(--gold-soft); color:var(--gold); padding:3px 10px; border-radius:100px; font-size:10px; letter-spacing:1px; }
.visual-tag.green { background:var(--green-soft); color:var(--green); }
.stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-top:24px; }
.stat { background:white; border:1px solid var(--border); border-radius:var(--radius); padding:28px 20px; text-align:center; box-shadow:var(--shadow-sm); }
.stat-value { font-size:clamp(28px,4vw,38px); font-weight:900; color:var(--navy); line-height:1; margin-bottom:8px; }
.stat-label { font-size:12px; color:var(--text-secondary); font-weight:600; letter-spacing:0.5px; text-transform:uppercase; }
.spec-table { background:white; border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow-sm); border:1px solid var(--border); }
.spec-row { display:grid; grid-template-columns:1fr 2fr; padding:18px 28px; border-bottom:1px solid var(--border); font-size:15px; }
.spec-row:last-child { border-bottom:none; }
.spec-row:nth-child(odd) { background:rgba(13,33,55,.015); }
.spec-label { font-weight:700; color:var(--text-secondary); }
.spec-value { color:var(--navy); font-weight:600; }
.psh-chart { background:white; border-radius:var(--radius); padding:28px; box-shadow:var(--shadow-sm); border:1px solid var(--border); margin-top:24px; }
.psh-bars { display:grid; grid-template-columns:repeat(12,1fr); gap:8px; align-items:end; height:160px; margin-top:20px; }
.psh-bar { display:flex; flex-direction:column; align-items:center; gap:6px; }
.psh-bar-fill { width:100%; background:linear-gradient(180deg,var(--gold) 0%,#D49010 100%); border-radius:6px 6px 0 0; min-height:8px; position:relative; }
.psh-bar-value { font-size:10px; font-weight:800; color:var(--navy); position:absolute; top:-18px; left:50%; transform:translateX(-50%); }
.psh-bar-label { font-size:10px; color:var(--text-secondary); font-weight:600; }
.psh-summary { display:flex; justify-content:space-between; padding-top:20px; margin-top:20px; border-top:1px solid var(--border); }
.psh-summary-label { font-size:11px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:1px; font-weight:700; }
.psh-summary-value { font-size:22px; font-weight:900; color:var(--navy); margin-top:4px; }
.options-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-top:8px; }
.option-card { background:white; border-radius:var(--radius); border:2px solid var(--border); padding:28px 24px 24px; display:flex; flex-direction:column; box-shadow:var(--shadow-sm); position:relative; transition:box-shadow .2s,border-color .2s; }
.option-card:hover { box-shadow:var(--shadow-md); }
.option-card.featured { border-color:var(--gold); box-shadow:0 8px 32px rgba(232,168,32,.18); }
.option-tag { position:absolute; top:-13px; right:50%; transform:translateX(50%); background:var(--gold); color:var(--navy); font-size:10px; font-weight:800; letter-spacing:1px; padding:4px 12px; border-radius:100px; white-space:nowrap; }
.option-icon { font-size:36px; margin-bottom:12px; }
.option-name { font-size:17px; font-weight:900; color:var(--navy); margin-bottom:4px; }
.option-desc { font-size:13px; color:var(--text-secondary); margin-bottom:16px; }
.option-price { font-size:26px; font-weight:900; color:var(--navy); margin-bottom:4px; line-height:1.2; }
.option-price-note { display:block; font-size:12px; font-weight:600; color:var(--text-secondary); margin-top:2px; }
.option-features { flex:1; margin:16px 0; }
.option-feature { display:flex; align-items:flex-start; gap:8px; font-size:13px; color:var(--text); padding:5px 0; border-bottom:1px solid var(--border); }
.option-feature:last-child { border-bottom:none; }
.check-icon { color:var(--green); font-weight:900; flex-shrink:0; }
.option-bottom { margin-top:16px; padding:14px 16px; border-radius:var(--radius-sm); }
.option-bottom.green { background:var(--green-soft); }
.option-bottom.gold { background:var(--gold-soft); }
.option-bottom-label { font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:var(--text-secondary); margin-bottom:4px; }
.option-bottom-value { font-size:22px; font-weight:900; }
.option-bottom-value.green-text { color:var(--green); }
.option-bottom-value.gold-text { color:var(--gold); }
.option-bottom-sub { font-size:12px; color:var(--text-secondary); margin-top:4px; }
.option-choose-btn { display:block; width:100%; margin-top:16px; padding:10px; border-radius:var(--radius-sm); border:2px solid var(--navy); background:transparent; color:var(--navy); font-weight:700; font-size:13px; cursor:pointer; text-align:center; transition:all .15s; }
.option-choose-btn:hover,.option-card.featured .option-choose-btn { background:var(--navy); color:white; }
.option-card.featured .option-choose-btn { background:var(--gold); border-color:var(--gold); color:var(--navy); }
.compare-table { width:100%; border-collapse:collapse; background:white; border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow-md); font-size:14px; }
.compare-table th { padding:16px 20px; font-weight:700; font-size:14px; }
.compare-table td { padding:14px 20px; border-bottom:1px solid var(--border); }
.compare-table tr:last-child td { border-bottom:none; }
.compare-table tr:nth-child(even) td { background:rgba(13,33,55,.015); }
.compare-table td:first-child { font-weight:700; color:var(--text-secondary); }
.compare-table td:not(:first-child) { text-align:center; }
.compare-col-rec { background:var(--gold-soft) !important; }
.compare-table th.compare-col-rec { background:rgba(232,168,32,.18) !important; }
.savings-section { margin-top:32px; }
.savings-bar-group { margin-bottom:20px; }
.savings-bar-group h4 { font-size:14px; font-weight:700; color:var(--text-secondary); margin-bottom:8px; }
.savings-bar { height:44px; border-radius:var(--radius-sm); display:flex; align-items:center; padding:0 16px; font-weight:800; font-size:15px; color:white; position:relative; min-width:80px; }
.savings-bar.bar-pea { background:linear-gradient(90deg,#C0392B,#E74C3C); width:100%; }
.savings-bar.bar-solar { background:linear-gradient(90deg,var(--green),#2ECC71); }
.savings-badge { display:inline-block; margin-top:10px; background:var(--green); color:white; font-size:13px; font-weight:800; padding:6px 14px; border-radius:8px; }
.env-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-top:8px; }
.env-stat { background:white; border:1px solid var(--border); border-radius:var(--radius); padding:28px 20px; text-align:center; box-shadow:var(--shadow-sm); }
.env-stat-value { font-size:clamp(22px,3vw,32px); font-weight:900; color:var(--green); line-height:1; margin-bottom:8px; }
.env-stat-value.gold { color:var(--gold); }
.env-stat-label { font-size:12px; color:var(--text-secondary); font-weight:600; letter-spacing:0.5px; text-transform:uppercase; }
.timeline-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-top:16px; position:relative; }
.timeline-grid::before { content:''; position:absolute; top:36px; right:10%; left:10%; height:2px; background:linear-gradient(90deg,var(--gold),var(--green)); z-index:0; }
.timeline-card { background:white; border:1px solid var(--border); border-radius:var(--radius); padding:24px 18px; text-align:center; position:relative; z-index:1; box-shadow:var(--shadow-sm); }
.timeline-num { width:36px; height:36px; border-radius:50%; background:var(--navy); color:var(--gold); font-weight:900; font-size:15px; display:flex; align-items:center; justify-content:center; margin:0 auto 12px; }
.timeline-icon { font-size:28px; margin-bottom:10px; }
.timeline-title { font-size:14px; font-weight:800; color:var(--navy); margin-bottom:4px; }
.timeline-period { font-size:12px; color:var(--gold); font-weight:700; }
.cta { background:linear-gradient(135deg,var(--gold) 0%,#D49010 100%); color:white; border-radius:var(--radius); padding:60px 40px; text-align:center; margin-top:40px; box-shadow:var(--shadow-lg); }
.cta h2 { font-size:clamp(26px,4vw,34px); color:white; margin-bottom:12px; }
.cta p { font-size:16px; color:rgba(255,255,255,.9); margin-bottom:28px; }
.cta-btn { display:inline-block; padding:16px 36px; background:var(--navy); color:white; text-decoration:none; font-weight:800; border-radius:100px; font-size:15px; letter-spacing:0.5px; transition:transform .2s; }
.cta-btn:hover { transform:translateY(-2px); }
footer { background:var(--navy); color:rgba(255,255,255,.6); padding:40px 0; text-align:center; font-size:13px; }
footer strong { color:var(--gold); }
@media (max-width:768px) {
  section { padding:48px 0; }
  .hero { padding:110px 0 70px; }
  .hero-meta { grid-template-columns:1fr; gap:16px; }
  .hero-meta-item { border-right:none; border-bottom:1px solid rgba(232,168,32,.2); padding:0 0 12px 0; }
  .hero-meta-item:last-child { border-bottom:none; }
  .stats-grid { grid-template-columns:repeat(2,1fr); }
  .visual-compare { grid-template-columns:1fr; }
  .spec-row { grid-template-columns:1fr; gap:4px; padding:14px 20px; }
  .options-grid { grid-template-columns:1fr; }
  .env-stats-grid { grid-template-columns:repeat(2,1fr); }
  .timeline-grid { grid-template-columns:repeat(2,1fr); }
  .timeline-grid::before { display:none; }
  .compare-table { font-size:12px; }
  .compare-table th,.compare-table td { padding:10px 12px; }
  .container { padding:0 16px; }
}
</style>
</head>
<body>

<nav class="nav">
  <div>
    <img class="nav-logo-img" src="tm-energy-logo.png" alt="Bustan Energy">
    <span class="nav-brand">${t.nav_brand}</span>
  </div>
  <div class="nav-ref">REF &middot; ${ref} &middot; 2026</div>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="container" style="position:relative;z-index:2;">
    <span class="hero-ref">${t.proposal_label} &middot; ${data.month_year_he || 'April 2026'}</span>
    <h1>${t.hero_title}<br><span>${data.system_size_kwp} ${t.hero_subtitle}</span></h1>
    <p>${t.hero_desc}</p>
    <div class="hero-meta">
      <div class="hero-meta-item">
        <div class="hero-meta-label">${t.hero_client_label}</div>
        <div class="hero-meta-value">${clientNameDisplay}</div>
      </div>
      <div class="hero-meta-item">
        <div class="hero-meta-label">${t.hero_location_label}</div>
        <div class="hero-meta-value">${data.location_short || 'Ko Phangan'}</div>
      </div>
      <div class="hero-meta-item">
        <div class="hero-meta-label">${t.hero_validity_label}</div>
        <div class="hero-meta-value">${t.hero_validity_value}</div>
      </div>
    </div>
  </div>
</section>

<!-- VISUAL -->
<section style="background:white;">
  <div class="container">
    <div class="section-label">${t.visual_label}</div>
    <h2 class="section-heading">${t.visual_heading}</h2>
    <div class="visual-compare">
      <div class="visual-card">
        <img src="amir-mizrahi-001-roof-original.jpeg" alt="Before" loading="lazy">
        <div class="visual-caption">
          <span>${t.visual_before}</span>
          <span class="visual-tag">${t.visual_tag_before}</span>
        </div>
      </div>
      <div class="visual-card">
        <img src="amir-mizrahi-001-roof-with-panels.png" alt="After" loading="lazy">
        <div class="visual-caption">
          <span>${t.visual_after}</span>
          <span class="visual-tag green">${data.panel_count} panels &middot; ${data.system_size_kwp} kWp</span>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ROOF ANALYSIS -->
<section>
  <div class="container">
    <div class="section-label">${t.roof_label}</div>
    <h2 class="section-heading">${t.roof_heading}</h2>
    <div class="stats-grid">
      <div class="stat">
        <div class="stat-value">120</div>
        <div class="stat-label">m&sup2; ${t.roof_area}</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.panel_count}</div>
        <div class="stat-label">${t.roof_panels_label}</div>
      </div>
      <div class="stat">
        <div class="stat-value">N-S</div>
        <div class="stat-label">${t.roof_orient}</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="font-size:20px;">${t.roof_type}</div>
        <div class="stat-label">${t.roof_type_label}</div>
      </div>
    </div>
  </div>
</section>

<!-- PRODUCTION / PSH -->
<section style="background:white;">
  <div class="container">
    <div class="section-label">${t.production_label}</div>
    <h2 class="section-heading">${t.production_heading}</h2>
    <p class="section-desc">${t.production_desc}</p>
    <div class="psh-chart">
      <div class="psh-bars">
        ${pshBars}
      </div>
      <div class="psh-summary">
        <div>
          <div class="psh-summary-label">${t.psh_avg}</div>
          <div class="psh-summary-value">5.0 ${t.psh_unit}</div>
        </div>
        <div>
          <div class="psh-summary-label">${t.annual_kwh_label}</div>
          <div class="psh-summary-value">${fmt(annualKwh)} kWh</div>
        </div>
        <div>
          <div class="psh-summary-label">${t.monthly_kwh_label}</div>
          <div class="psh-summary-value">~${fmt(monthlyKwh)} kWh</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- THREE OPTIONS -->
<section>
  <div class="container">
    <div class="section-label">${t.options_label}</div>
    <h2 class="section-heading">${t.options_heading}</h2>
    <p class="section-desc">${t.options_desc}</p>
    <div class="options-grid">
      ${optionCard(o1, t)}
      ${optionCard(o2, t)}
      ${optionCard(o3, t)}
    </div>
  </div>
</section>

<!-- COMPARISON TABLE -->
<section style="background:white;">
  <div class="container">
    <div class="section-label">${t.compare_label}</div>
    <h2 class="section-heading">${t.compare_heading}</h2>
    <div style="overflow-x:auto;">
      <table class="compare-table">
        <thead>
          <tr style="background:var(--navy);color:#fff;">
            <th style="text-align:${htmlDir === 'rtl' ? 'right' : 'left'};min-width:160px;"></th>
            <th>&#9889; ${lang === 'he' ? o1.label_he : (lang === 'th' ? 'ตัวเลือก 1' : 'Option 1')}</th>
            <th>&#128390; ${lang === 'he' ? o2.label_he : (lang === 'th' ? 'ตัวเลือก 2' : 'Option 2')}</th>
            <th class="compare-col-rec">&#128267; ${lang === 'he' ? o3.label_he + ' &#9733;' : (lang === 'th' ? 'ตัวเลือก 3 &#9733;' : 'Option 3 &#9733;')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${t.compare_upfront}</td>
            <td>&#3647;${fmt(o1.price_thb)}</td>
            <td>&#3647;${fmt(o2.price_thb)}</td>
            <td class="compare-col-rec" style="font-weight:700;">&#3647;${fmt(o3.price_thb)}</td>
          </tr>
          <tr>
            <td>${t.compare_inverter}</td>
            <td>Huawei SUN2000-10KTL</td>
            <td>SUN2000-10KTL-M1</td>
            <td class="compare-col-rec">SUN2000-10KTL-M1</td>
          </tr>
          <tr>
            <td>${t.compare_battery}</td>
            <td style="color:var(--text-secondary);">${t.no_battery}</td>
            <td style="color:var(--text-secondary);">${t.no_battery}</td>
            <td class="compare-col-rec" style="font-weight:700;color:var(--green);">LUNA2000-7-E1<br><small>6.9 kWh LiFePO4</small></td>
          </tr>
          <tr>
            <td>${t.compare_annual_savings}</td>
            <td>&#3647;${fmt(o1.annual_savings_thb)}</td>
            <td>&#3647;${fmt(o2.annual_savings_thb)}</td>
            <td class="compare-col-rec" style="font-weight:700;color:var(--green);">&#3647;${fmt(o3.annual_savings_thb)}</td>
          </tr>
          <tr>
            <td>${t.compare_payback}</td>
            <td>${o1.payback_years} ${t.payback_unit}</td>
            <td>${o2.payback_years} ${t.payback_unit}</td>
            <td class="compare-col-rec">${o3.payback_years} ${t.payback_unit}</td>
          </tr>
          <tr>
            <td>${t.compare_savings_25}</td>
            <td>&#3647;${fmt(o1.savings_25yr_thb)}</td>
            <td>&#3647;${fmt(o2.savings_25yr_thb)}</td>
            <td class="compare-col-rec" style="font-weight:700;color:var(--green);">&#3647;${fmt(o3.savings_25yr_thb)}</td>
          </tr>
          <tr>
            <td>${t.compare_backup}</td>
            <td style="color:#C0392B;">&#10008; ${t.no}</td>
            <td style="color:#C0392B;">&#10008; ${t.no}</td>
            <td class="compare-col-rec" style="color:var(--green);font-weight:700;">&#10004; ${t.yes}</td>
          </tr>
          <tr>
            <td>${t.compare_warranty}</td>
            <td style="font-size:12px;">${t.warranty_val}</td>
            <td style="font-size:12px;">${t.warranty_val}</td>
            <td class="compare-col-rec" style="font-size:12px;font-weight:700;">${t.warranty_batt}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</section>

<!-- SAVINGS VISUALIZATION -->
<section>
  <div class="container">
    <div class="section-label">${t.savings_label}</div>
    <h2 class="section-heading">${t.pea_vs_solar}</h2>
    <div class="savings-section">
      <div class="savings-bar-group">
        <h4>${t.pea_bill} · &#3647;${fmt(peaBillMonthly)}/month</h4>
        <div class="savings-bar bar-pea">&#3647;${fmt(peaBillMonthly)}</div>
      </div>
      <div class="savings-bar-group">
        <h4>${t.solar_bill} (${lang === 'he' ? o3.label_he : 'Option 3'}) · &#3647;${fmt(peaBillMonthly - o3.monthly_savings_thb)}/month</h4>
        <div class="savings-bar bar-solar" style="width:${Math.round((peaBillMonthly - o3.monthly_savings_thb) / peaBillMonthly * 100)}%;">&#3647;${fmt(peaBillMonthly - o3.monthly_savings_thb)}</div>
        <div class="savings-badge">&#3647;${fmt(o3.monthly_savings_thb)}/month saved (${lang === 'he' ? 'אפציה 3' : 'Option 3'})</div>
      </div>
    </div>
  </div>
</section>

<!-- ENVIRONMENTAL IMPACT -->
<section style="background:white;">
  <div class="container">
    <div class="section-label">${t.env_label}</div>
    <h2 class="section-heading">${t.env_heading}</h2>
    <div class="env-stats-grid">
      <div class="env-stat">
        <div class="env-stat-value">${fmt(co2Tons)}</div>
        <div class="env-stat-label">${t.co2_label}</div>
      </div>
      <div class="env-stat">
        <div class="env-stat-value gold">${fmt(treesEquiv)}</div>
        <div class="env-stat-label">${t.trees_equivalent}</div>
      </div>
      <div class="env-stat">
        <div class="env-stat-value">${fmt(carYears)}</div>
        <div class="env-stat-label">${t.cars_off_road}</div>
      </div>
      <div class="env-stat">
        <div class="env-stat-value gold">${fmt(homeMonths)}</div>
        <div class="env-stat-label">${t.houses_powered}</div>
      </div>
    </div>
  </div>
</section>

<!-- TIMELINE -->
<section>
  <div class="container">
    <div class="section-label">${t.timeline_label}</div>
    <h2 class="section-heading">${t.timeline_heading}</h2>
    <div class="timeline-grid">
      <div class="timeline-card">
        <div class="timeline-num">1</div>
        <div class="timeline-icon">&#128221;</div>
        <div class="timeline-title">${t.t1_title}</div>
        <div class="timeline-period">${t.t1_period}</div>
      </div>
      <div class="timeline-card">
        <div class="timeline-num">2</div>
        <div class="timeline-icon">&#128196;</div>
        <div class="timeline-title">${t.t2_title}</div>
        <div class="timeline-period">${t.t2_period}</div>
      </div>
      <div class="timeline-card">
        <div class="timeline-num">3</div>
        <div class="timeline-icon">&#128295;</div>
        <div class="timeline-title">${t.t3_title}</div>
        <div class="timeline-period">${t.t3_period}</div>
      </div>
      <div class="timeline-card">
        <div class="timeline-num">4</div>
        <div class="timeline-icon">&#9889;</div>
        <div class="timeline-title">${t.t4_title}</div>
        <div class="timeline-period">${t.t4_period}</div>
      </div>
    </div>
  </div>
</section>

<!-- CTA -->
<section style="padding:72px 0;">
  <div class="container">
    <div class="cta">
      <h2>${t.cta_heading}</h2>
      <p>${t.cta_desc}</p>
      <a href="https://wa.me/66864434951" class="cta-btn" target="_blank">&#128241; ${t.cta_whatsapp}</a>
    </div>
  </div>
</section>

<footer>
  <div class="container">
    <p><strong>${t.footer_brand}</strong></p>
    <p style="margin-top:8px;">${t.footer_ref} &middot; REF: ${ref}</p>
  </div>
</footer>

<!-- SELECTION STATE -->
<script>
function selectOption(id) {
  document.querySelectorAll('.option-card').forEach(c => c.classList.remove('featured'))
  document.querySelectorAll('.option-tag').forEach(t => t.remove())
  const card = document.getElementById('optCard_' + id)
  if (card) {
    card.classList.add('featured')
    const tag = document.createElement('div')
    tag.className = 'option-tag'
    tag.textContent = '${lang === 'he' ? 'נבחר' : (lang === 'th' ? 'เลือกแล้ว' : 'Selected')}'
    card.insertBefore(tag, card.firstChild)
  }
}
</script>

<!-- PASS GATE -->
<style id="gate-style">
body { overflow: hidden !important; }
.pg-overlay { position:fixed; inset:0; z-index:99999; background:linear-gradient(135deg,#0D2137 0%,#132D4A 100%); display:flex; align-items:center; justify-content:center; color:white; font-family:${t.font}; direction:${htmlDir}; }
.pg-box { background:rgba(255,255,255,.05); border:1px solid rgba(232,168,32,.2); border-radius:20px; padding:48px 40px; max-width:400px; width:90%; text-align:center; backdrop-filter:blur(20px); }
.pg-logo { width:80px; height:80px; margin:0 auto 20px; border-radius:50%; display:block; }
.pg-brand { color:#E8A820; font-weight:800; font-size:13px; letter-spacing:2.5px; margin-bottom:8px; }
.pg-title { font-size:22px; font-weight:900; margin-bottom:8px; }
.pg-desc { color:rgba(255,255,255,.6); font-size:14px; margin-bottom:28px; line-height:1.6; }
.pg-input { width:100%; padding:14px 16px; border-radius:12px; background:rgba(255,255,255,.08); border:1px solid rgba(232,168,32,.25); color:white; font-size:18px; text-align:center; letter-spacing:8px; font-weight:700; margin-bottom:16px; direction:ltr; }
.pg-input:focus { outline:none; border-color:#E8A820; background:rgba(255,255,255,.12); }
.pg-btn { width:100%; padding:14px; background:#E8A820; color:#0D2137; border:none; border-radius:100px; font-weight:800; font-size:15px; cursor:pointer; }
.pg-btn:hover { background:#D49010; }
.pg-btn:disabled { opacity:.6; cursor:wait; }
.pg-error { color:#ff6b6b; font-size:13px; margin-top:12px; min-height:18px; }
.pg-ref { color:rgba(255,255,255,.4); font-size:11px; margin-top:24px; letter-spacing:1.5px; font-family:monospace; }
</style>
<div class="pg-overlay" id="pgOverlay">
  <div class="pg-box">
    <img src="tm-energy-logo.png" alt="Bustan Energy" class="pg-logo">
    <div class="pg-brand">BUSTAN ENERGY</div>
    <h1 class="pg-title">${lang === 'he' ? 'הצעת מחיר אישית' : (lang === 'th' ? 'ใบเสนอราคาส่วนตัว' : 'Personal Quote')}</h1>
    <p class="pg-desc">${lang === 'he' ? 'הכנס את הסיסמה שנשלחה אליך ב-WhatsApp' : (lang === 'th' ? 'กรุณาใส่รหัสผ่านที่ส่งให้ทาง WhatsApp' : 'Enter the password sent to you via WhatsApp')}</p>
    <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" class="pg-input" id="pgInput" placeholder="* * * * * *" autocomplete="off" autofocus>
    <button class="pg-btn" id="pgBtn">${lang === 'he' ? 'פתח הצעה' : (lang === 'th' ? 'เปิดใบเสนอราคา' : 'Open Proposal')}</button>
    <div class="pg-error" id="pgError"></div>
    <div class="pg-ref">REF &middot; ${ref}</div>
  </div>
</div>
<script>
(function(){
  const HASH = "${passwordHash}";
  const unlockedKey = 'tm_unlocked_${ref}';
  async function sha256hex(str){ const buf=new TextEncoder().encode(str); const hash=await crypto.subtle.digest('SHA-256',buf); return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
  function unlock(){ document.getElementById('gate-style').remove(); document.getElementById('pgOverlay').remove(); document.body.style.overflow=''; }
  async function tryUnlock(pw){ const h=await sha256hex(pw.trim()); if(h===HASH){ localStorage.setItem(unlockedKey,'1'); unlock(); return true; } return false; }
  const input=document.getElementById('pgInput'); const btn=document.getElementById('pgBtn'); const err=document.getElementById('pgError');
  const wrongPassMsg = "${lang === 'he' ? 'סיסמה שגויה' : (lang === 'th' ? 'รหัสผ่านไม่ถูกต้อง' : 'Incorrect password')}";
  const openBtnText = "${lang === 'he' ? 'פתח' : (lang === 'th' ? 'เปิด' : 'Open')}";
  async function handle(){ err.textContent=""; btn.disabled=true; btn.textContent="..."; const ok=await tryUnlock(input.value); if(!ok){ err.textContent=wrongPassMsg; btn.disabled=false; btn.textContent=openBtnText; input.value=""; input.focus(); } }
  btn.addEventListener("click",handle);
  input.addEventListener("keydown",function(e){ if(e.key==="Enter") handle(); });
  if(localStorage.getItem(unlockedKey)==="1") unlock();
})();
</script>

</body>
</html>`

  return html
}

// ---- MAIN ----
async function main() {
  const args = {}
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i].replace(/^--/, '')
    args[key] = process.argv[i + 1]
  }

  const dataPath = args.data || 'clients/amir-3options.json'
  const lang = args.lang || 'he'
  const skipPDF = args['skip-pdf']

  const data = JSON.parse(readFileSync(join(__dirname, dataPath), 'utf8'))
  const ref = data.ref

  const outDir = join(__dirname, 'output')
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

  // Copy assets
  const assets = ['tm-energy-logo.png', ...(data.images || [])]
  for (const asset of assets) {
    const src = join(__dirname, 'assets', asset)
    if (existsSync(src)) copyFileSync(src, join(outDir, asset))
    const src2 = join(__dirname, asset)
    if (existsSync(src2)) copyFileSync(src2, join(outDir, asset))
  }

  const html = generateHTML(data, lang)
  const htmlPath = join(outDir, `${ref}-${lang}.html`)
  writeFileSync(htmlPath, html)
  console.log(`HTML: ${htmlPath}`)

  if (!skipPDF) {
    try {
      const { chromium } = await import('playwright')
      const browser = await chromium.launch()
      const page = await browser.newPage()
      await page.goto(`file://${resolve(htmlPath)}`)
      await page.evaluate(() => {
        document.getElementById('gate-style')?.remove()
        document.getElementById('pgOverlay')?.remove()
        document.body.style.overflow = ''
      })
      await page.waitForTimeout(2000)
      const pdfPath = join(outDir, `${ref}-${lang}.pdf`)
      await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' } })
      await browser.close()
      console.log(`PDF: ${pdfPath}`)
    } catch (e) {
      console.warn('Playwright error:', e.message)
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
