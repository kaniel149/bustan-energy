// ============================================================
// /api/admin-create-proposal
// Creates a proposal from web form data (for Erez + admins)
// ============================================================
export const config = { runtime: 'edge' }

import { escapeHtml } from './_lib/html.js'
import { fmt } from './_lib/fmt.js'
import { sha256hex, random6 } from './_lib/crypto.js'
import { supaUpsert } from './_lib/supa.js'
import { isAllowedAdmin } from './_lib/admin-access.js'
import { calculateSolarFinancials, TM_SOLAR_ASSUMPTIONS } from '../src/lib/solar-financials.js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const isAllowed = isAllowedAdmin

type ProposalLang = 'he' | 'en' | 'th'

function proposalLang(value: unknown): ProposalLang {
  return value === 'en' || value === 'th' || value === 'he' ? value : 'he'
}

const COPY: Record<ProposalLang, Record<string, string>> = {
  he: {
    html_title: 'Bustan Energy — הצעת מחיר סולארית',
    html_description: 'הצעת מחיר למערכת סולארית',
    hero_badge: 'הצעת מחיר',
    hero_title: 'מערכת סולארית',
    hero_subtitle: 'מערכת סולארית מלאה עבור הנכס שלך, עם ציוד Tier-1, תכנון הנדסי, טיפול במסמכי PEA ומודל חיסכון ברור.',
    client_label: 'לקוח',
    location_label: 'מיקום',
    validity_label: 'תוקף',
    validity_value: '30 יום',
    visual_label: 'סימולציה ויזואלית',
    visual_heading: 'איך המערכת תיראה על הגג שלך',
    visual_desc: 'דימוי המבוסס על תמונת הגג ומיקום הפאנלים המתוכנן.',
    before_label: 'לפני',
    after_label: 'אחרי',
    drone_image_label: 'תמונת רחפן',
    panels_tag_suffix: 'פאנלים',
    roof_label: 'ניתוח הגג',
    roof_heading: 'מדידות ותכנון',
    roof_area_label: 'שטח גג',
    active_panels_label: 'פאנלים פעילים',
    orientation_label: 'אוריינטציה',
    roof_type_label: 'סוג גג',
    total_panels_label: 'סה״כ פאנלים',
    system_specs_label: 'מפרט המערכת',
    system_specs_heading: 'רכיבי Tier-1 ותכנון מלא',
    panels_label: 'פאנלים',
    inverter_label: 'אינוורטר',
    battery_label: 'סוללה',
    dc_capacity_label: 'הספק DC',
    connection_label: 'חיבור',
    mounting_label: 'עיגון',
    monitoring_label: 'ניטור',
    protections_label: 'הגנות',
    production_label: 'תחזית ייצור',
    production_heading: 'שעות שמש חודשיות',
    production_desc: 'תחזית הייצור מבוססת על נתוני קרינה אזוריים, ביצועי ציוד והפסדי מערכת.',
    psh_avg_label: 'ממוצע שנתי (PSH)',
    annual_production_label: 'ייצור צפוי שנתי',
    monthly_production_label: 'ייצור ממוצע חודשי',
    options_label: 'בחר את התוכנית שלך',
    options_heading: 'שלוש אפשרויות, מטרה אחת: חשבון חשמל נמוך יותר',
    options_desc: 'בחר את התוכנית שמתאימה לתקציב ולמבנה המימון שלך.',
    option_a_name: 'אופציה א: EPC',
    option_a_desc: 'בעלות מלאה על המערכת',
    option_b_name: 'אופציה ב: PPA',
    option_b_desc: 'אפס מקדמה — אנחנו מתקינים, אתה חוסך',
    option_c_name: 'אופציה ג: EPC + סוללה',
    option_c_desc: 'עצמאות אנרגטית גבוהה יותר',
    recommended_label: 'מומלץ',
    annual_savings_label: 'חיסכון שנתי',
    monthly_savings_label: 'חיסכון חודשי',
    payback_label: 'החזר השקעה',
    choose_option: 'בחר אפשרות זו',
    comparison_label: 'השוואה מלאה',
    comparison_heading: 'השוואה בין כל האפשרויות',
    upfront_cost_label: 'עלות מקדמה',
    monthly_payment_label: 'תשלום חודשי',
    panel_warranty_label: 'אחריות פאנלים',
    inverter_warranty_label: 'אחריות אינוורטר',
    backup_label: 'גיבוי סוללה',
    ownership_label: 'בעלות',
    maintenance_label: 'תחזוקה',
    first_year_included_label: 'שנה ראשונה כלולה',
    included_label: 'כלול',
    immediate_label: 'מיידי',
    customer_owned_label: 'שלך',
    savings_story_label: 'הסיפור שמאחורי המספרים',
    savings_story_heading: 'כמה תחסוך בפועל',
    savings_story_desc: 'השוואה בין עלות החשמל הנוכחית שלך לאחר התקנת מערכת סולארית.',
    without_solar_label: 'ללא סולאר — חשמל שנתי',
    with_solar_label: 'עם סולאר — עלות שנתית חדשה',
    ten_year_savings_label: 'חיסכון ב-10 שנים',
    co2_saved_label: 'CO₂ נחסך בשנה',
    timeline_label: 'לוח זמנים',
    timeline_heading: '4 שלבים עד לחיבור לרשת',
    timeline_desc: 'מרגע אישור ההצעה ועד הדלקת המערכת — תהליך ברור ושקוף.',
    survey_design_label: 'סקר ועיצוב',
    permits_procurement_label: 'היתרים ורכש',
    installation_label: 'התקנה',
    grid_connection_label: 'חיבור לרשת',
    week_1_label: 'שבוע 1',
    weeks_2_3_label: 'שבועות 2-3',
    week_4_label: 'שבוע 4',
    weeks_5_6_label: 'שבועות 5-6',
    legal_docs_label: 'מסמכים חוקיים',
    legal_docs_heading: 'קרא את החוזים המלאים',
    legal_docs_desc: 'שקיפות מלאה — כל תנאי ההסכם זמינים לקריאה לפני החתימה.',
    read_epc_contract: 'קרא חוזה EPC',
    read_ppa_contract: 'קרא חוזה PPA',
    investment_label: 'השקעה והחזר',
    investment_heading: 'תחזית פיננסית',
    turnkey_label: 'Turnkey — הכל כלול',
    turnkey_note: 'מחיר לפני VAT אלא אם צוין אחרת · תשלום: 40% חתימה + 40% הגעת ציוד + 20% הפעלה',
    tariff_label: 'תעריף חשמל ממוצע',
    payback_no_tax_label: 'החזר השקעה (ללא מס)',
    payback_tax_label: 'החזר עם הטבת מס מאושרת',
    savings_25_label: 'חיסכון מצטבר 25 שנה',
    tax_note_label: 'הערת מס · לא ייעוץ מס',
    tax_note_heading: 'הטבת מס — רק אם אושרה ללקוח',
    tax_note_desc: 'הטבות מס תלויות בסוג הלקוח, מבנה הבעלות, חשבוניות, וייעוץ רו״ח/BOI. אין לראות בכך ייעוץ מס או הבטחה לזכאות.',
    bank_label: 'מודל כלכלי למימון בנקאי',
    bank_heading: 'תזרים, חוב ויכולת שירות הלוואה',
    bank_desc: 'מודל אינדיקטיבי לבנק או משקיע. אישור אשראי כפוף לבדיקת הבנק, מסמכי הלקוח ותנאי ההלוואה הסופיים.',
    project_cost_label: 'עלות פרויקט',
    loan_amount_label: 'סכום הלוואה',
    equity_label: 'הון עצמי',
    annual_debt_service_label: 'החזר חוב שנתי',
    annual_om_label: 'O&M שנתי',
    net_operating_benefit_label: 'תועלת תפעולית נטו',
    net_after_debt_label: 'תזרים נטו אחרי חוב',
    dscr_label: 'DSCR',
    equity_payback_label: 'החזר הון עצמי',
    model_assumptions_label: 'הנחות מודל',
    ltv_assumption_label: 'מימון',
    interest_assumption_label: 'ריבית שנתית',
    years_assumption_label: 'תקופת הלוואה',
    om_assumption_label: 'O&M',
    financing_note: 'המודל מבוסס על חיסכון שנה ראשונה, ללא התחייבות לאישור בנקאי.',
    pea_docs_label: 'רשימת מסמכים לאישור PEA',
    pea_docs_heading: 'מה נזדקק ממך לצורך אישור רשת החשמל',
    pea_docs_desc: 'כדי להגיש בקשה ל-PEA לחיבור המערכת הסולארית לרשת, אנחנו זקוקים למסמכים הבאים.',
    cta_heading: 'מוכן להתחיל לחסוך?',
    cta_desc: 'הזמן אותנו לביקור אתר — ללא עלות, ללא התחייבות.',
    footer_validity: 'הצעה זו תקפה 30 יום',
    not_included: 'לא נכלל במודל',
    review_required: 'דורש בדיקה',
    years_unit: 'שנים',
  },
  en: {
    html_title: 'Bustan Energy — Solar Proposal',
    html_description: 'Solar system proposal',
    hero_badge: 'Solar Proposal',
    hero_title: 'Solar PV System',
    hero_subtitle: 'A complete solar system for your property, including Tier-1 equipment, engineering design, PEA documentation support, and a clear savings model.',
    client_label: 'Client',
    location_label: 'Location',
    validity_label: 'Valid for',
    validity_value: '30 days',
    visual_label: 'Visual Simulation',
    visual_heading: 'How the system will look on your roof',
    visual_desc: 'A planned panel layout based on the roof image and system design.',
    before_label: 'Before',
    after_label: 'After',
    drone_image_label: 'Roof image',
    panels_tag_suffix: 'panels',
    roof_label: 'Roof Analysis',
    roof_heading: 'Measurements and Design',
    roof_area_label: 'Roof Area',
    active_panels_label: 'Active Panels',
    orientation_label: 'Orientation',
    roof_type_label: 'Roof Type',
    total_panels_label: 'Total Panels',
    system_specs_label: 'System Specifications',
    system_specs_heading: 'Tier-1 Components and Complete Design',
    panels_label: 'Panels',
    inverter_label: 'Inverter',
    battery_label: 'Battery',
    dc_capacity_label: 'DC Capacity',
    connection_label: 'Connection',
    mounting_label: 'Mounting',
    monitoring_label: 'Monitoring',
    protections_label: 'Protections',
    production_label: 'Production Forecast',
    production_heading: 'Monthly Sun Hours',
    production_desc: 'Production forecast based on regional irradiation, equipment performance, and system losses.',
    psh_avg_label: 'Annual Average (PSH)',
    annual_production_label: 'Expected Annual Production',
    monthly_production_label: 'Average Monthly Production',
    options_label: 'Choose Your Plan',
    options_heading: 'Three options, one goal: a lower electricity bill',
    options_desc: 'Choose the plan that fits your budget and financing structure.',
    option_a_name: 'Option A: EPC',
    option_a_desc: 'Full system ownership',
    option_b_name: 'Option B: PPA',
    option_b_desc: 'Zero upfront — we install, you save',
    option_c_name: 'Option C: EPC + Battery',
    option_c_desc: 'Higher energy independence',
    recommended_label: 'Recommended',
    annual_savings_label: 'Annual Savings',
    monthly_savings_label: 'Monthly Savings',
    payback_label: 'Payback',
    choose_option: 'Choose this option',
    comparison_label: 'Full Comparison',
    comparison_heading: 'Compare all options',
    upfront_cost_label: 'Upfront Cost',
    monthly_payment_label: 'Monthly Payment',
    panel_warranty_label: 'Panel Warranty',
    inverter_warranty_label: 'Inverter Warranty',
    backup_label: 'Battery Backup',
    ownership_label: 'Ownership',
    maintenance_label: 'Maintenance',
    first_year_included_label: 'First year included',
    included_label: 'Included',
    immediate_label: 'Immediate',
    customer_owned_label: 'Yours',
    savings_story_label: 'The Story Behind the Numbers',
    savings_story_heading: 'How much you can save',
    savings_story_desc: 'Compare your current electricity cost with the expected cost after solar.',
    without_solar_label: 'Without solar — annual electricity',
    with_solar_label: 'With solar — new annual cost',
    ten_year_savings_label: '10-Year Savings',
    co2_saved_label: 'CO₂ Saved / Year',
    timeline_label: 'Timeline',
    timeline_heading: '4 steps to grid connection',
    timeline_desc: 'From approval to system activation, the process is clear and transparent.',
    survey_design_label: 'Survey & Design',
    permits_procurement_label: 'Permits & Procurement',
    installation_label: 'Installation',
    grid_connection_label: 'Grid Connection',
    week_1_label: 'Week 1',
    weeks_2_3_label: 'Weeks 2-3',
    week_4_label: 'Week 4',
    weeks_5_6_label: 'Weeks 5-6',
    legal_docs_label: 'Legal Documents',
    legal_docs_heading: 'Read the full contracts',
    legal_docs_desc: 'Full transparency — all agreement terms are available before signing.',
    read_epc_contract: 'Read EPC Contract',
    read_ppa_contract: 'Read PPA Contract',
    investment_label: 'Investment and Return',
    investment_heading: 'Financial Forecast',
    turnkey_label: 'Turnkey — included scope',
    turnkey_note: 'Price before VAT unless stated otherwise · Payment: 40% signing + 40% equipment arrival + 20% commissioning',
    tariff_label: 'Average electricity tariff',
    payback_no_tax_label: 'Payback (before tax incentives)',
    payback_tax_label: 'Payback with approved tax incentive',
    savings_25_label: '25-Year Cumulative Savings',
    tax_note_label: 'Tax note · not tax advice',
    tax_note_heading: 'Tax incentive — only if approved for the client',
    tax_note_desc: 'Tax benefits depend on client type, ownership structure, invoices, and accountant/BOI advice. This is not tax advice or a guarantee of eligibility.',
    bank_label: 'Bank Financing Economic Model',
    bank_heading: 'Cash flow, debt service, and bankability',
    bank_desc: 'Indicative model for a lender or investor. Credit approval remains subject to lender due diligence, client documents, and final loan terms.',
    project_cost_label: 'Project Cost',
    loan_amount_label: 'Loan Amount',
    equity_label: 'Equity',
    annual_debt_service_label: 'Annual Debt Service',
    annual_om_label: 'Annual O&M',
    net_operating_benefit_label: 'Net Operating Benefit',
    net_after_debt_label: 'Net Cash After Debt',
    dscr_label: 'DSCR',
    equity_payback_label: 'Equity Payback',
    model_assumptions_label: 'Model Assumptions',
    ltv_assumption_label: 'Financing',
    interest_assumption_label: 'Annual Interest',
    years_assumption_label: 'Loan Term',
    om_assumption_label: 'O&M',
    financing_note: 'The model uses year-one savings and does not guarantee bank approval.',
    pea_docs_label: 'PEA Approval Documents',
    pea_docs_heading: 'Documents needed for grid approval',
    pea_docs_desc: 'To submit the PEA grid connection request, we need the following documents from the client.',
    cta_heading: 'Ready to start saving?',
    cta_desc: 'Book a site visit with us — no cost, no obligation.',
    footer_validity: 'This proposal is valid for 30 days',
    not_included: 'Not included in the model',
    review_required: 'Review required',
    years_unit: 'years',
  },
  th: {
    html_title: 'Bustan Energy — ข้อเสนอระบบโซลาร์',
    html_description: 'ข้อเสนอระบบโซลาร์',
    hero_badge: 'ข้อเสนอระบบโซลาร์',
    hero_title: 'ระบบโซลาร์เซลล์',
    hero_subtitle: 'ระบบโซลาร์ครบวงจรสำหรับทรัพย์สินของคุณ พร้อมอุปกรณ์ Tier-1 งานออกแบบวิศวกรรม เอกสาร PEA และแบบจำลองการประหยัดที่ชัดเจน',
    client_label: 'ลูกค้า',
    location_label: 'ที่ตั้ง',
    validity_label: 'มีผล',
    validity_value: '30 วัน',
    visual_label: 'ภาพจำลอง',
    visual_heading: 'ระบบจะอยู่บนหลังคาอย่างไร',
    visual_desc: 'ผังแผงที่วางแผนจากภาพหลังคาและการออกแบบระบบ',
    before_label: 'ก่อน',
    after_label: 'หลัง',
    drone_image_label: 'ภาพหลังคา',
    panels_tag_suffix: 'แผง',
    roof_label: 'วิเคราะห์หลังคา',
    roof_heading: 'การวัดและการออกแบบ',
    roof_area_label: 'พื้นที่หลังคา',
    active_panels_label: 'จำนวนแผง',
    orientation_label: 'ทิศทาง',
    roof_type_label: 'ประเภทหลังคา',
    total_panels_label: 'จำนวนแผงรวม',
    system_specs_label: 'รายละเอียดระบบ',
    system_specs_heading: 'อุปกรณ์ Tier-1 และแบบครบถ้วน',
    panels_label: 'แผงโซลาร์',
    inverter_label: 'อินเวอร์เตอร์',
    battery_label: 'แบตเตอรี่',
    dc_capacity_label: 'กำลัง DC',
    connection_label: 'การเชื่อมต่อ',
    mounting_label: 'โครงยึด',
    monitoring_label: 'มอนิเตอร์',
    protections_label: 'อุปกรณ์ป้องกัน',
    production_label: 'คาดการณ์การผลิต',
    production_heading: 'ชั่วโมงแดดรายเดือน',
    production_desc: 'คาดการณ์จากข้อมูลรังสีอาทิตย์ในพื้นที่ ประสิทธิภาพอุปกรณ์ และการสูญเสียของระบบ',
    psh_avg_label: 'ค่าเฉลี่ยรายปี (PSH)',
    annual_production_label: 'ผลิตไฟฟ้าต่อปี',
    monthly_production_label: 'ผลิตไฟฟ้าเฉลี่ยต่อเดือน',
    options_label: 'เลือกแผนของคุณ',
    options_heading: '3 ทางเลือก เป้าหมายเดียว: ลดค่าไฟ',
    options_desc: 'เลือกแผนที่เหมาะกับงบประมาณและรูปแบบเงินทุนของคุณ',
    option_a_name: 'ทางเลือก A: EPC',
    option_a_desc: 'เป็นเจ้าของระบบเต็มรูปแบบ',
    option_b_name: 'ทางเลือก B: PPA',
    option_b_desc: 'ไม่ต้องลงทุนล่วงหน้า — เราติดตั้ง คุณประหยัด',
    option_c_name: 'ทางเลือก C: EPC + แบตเตอรี่',
    option_c_desc: 'เพิ่มความเป็นอิสระด้านพลังงาน',
    recommended_label: 'แนะนำ',
    annual_savings_label: 'ประหยัดต่อปี',
    monthly_savings_label: 'ประหยัดต่อเดือน',
    payback_label: 'คืนทุน',
    choose_option: 'เลือกทางเลือกนี้',
    comparison_label: 'เปรียบเทียบทั้งหมด',
    comparison_heading: 'เปรียบเทียบทุกทางเลือก',
    upfront_cost_label: 'เงินลงทุนเริ่มต้น',
    monthly_payment_label: 'ชำระรายเดือน',
    panel_warranty_label: 'รับประกันแผง',
    inverter_warranty_label: 'รับประกันอินเวอร์เตอร์',
    backup_label: 'สำรองไฟด้วยแบตเตอรี่',
    ownership_label: 'กรรมสิทธิ์',
    maintenance_label: 'บำรุงรักษา',
    first_year_included_label: 'รวมปีแรก',
    included_label: 'รวมแล้ว',
    immediate_label: 'ทันที',
    customer_owned_label: 'ของคุณ',
    savings_story_label: 'ตัวเลขการประหยัด',
    savings_story_heading: 'คุณประหยัดได้เท่าไร',
    savings_story_desc: 'เปรียบเทียบค่าไฟปัจจุบันกับค่าไฟหลังติดตั้งโซลาร์',
    without_solar_label: 'ไม่มีโซลาร์ — ค่าไฟต่อปี',
    with_solar_label: 'มีโซลาร์ — ค่าไฟใหม่ต่อปี',
    ten_year_savings_label: 'ประหยัด 10 ปี',
    co2_saved_label: 'ลด CO₂ ต่อปี',
    timeline_label: 'ระยะเวลา',
    timeline_heading: '4 ขั้นตอนถึงเชื่อมต่อโครงข่าย',
    timeline_desc: 'ตั้งแต่อนุมัติจนถึงเริ่มใช้งาน กระบวนการชัดเจนและโปร่งใส',
    survey_design_label: 'สำรวจและออกแบบ',
    permits_procurement_label: 'เอกสารและจัดซื้อ',
    installation_label: 'ติดตั้ง',
    grid_connection_label: 'เชื่อมต่อโครงข่าย',
    week_1_label: 'สัปดาห์ 1',
    weeks_2_3_label: 'สัปดาห์ 2-3',
    week_4_label: 'สัปดาห์ 4',
    weeks_5_6_label: 'สัปดาห์ 5-6',
    legal_docs_label: 'เอกสารสัญญา',
    legal_docs_heading: 'อ่านสัญญาฉบับเต็ม',
    legal_docs_desc: 'โปร่งใสครบถ้วน — เงื่อนไขสัญญาพร้อมให้ตรวจสอบก่อนลงนาม',
    read_epc_contract: 'อ่านสัญญา EPC',
    read_ppa_contract: 'อ่านสัญญา PPA',
    investment_label: 'เงินลงทุนและผลตอบแทน',
    investment_heading: 'คาดการณ์ทางการเงิน',
    turnkey_label: 'Turnkey — รวมขอบเขตงาน',
    turnkey_note: 'ราคาก่อน VAT เว้นแต่ระบุไว้ · ชำระ 40% เมื่อลงนาม + 40% เมื่ออุปกรณ์มาถึง + 20% เมื่อเปิดใช้งาน',
    tariff_label: 'ค่าไฟเฉลี่ย',
    payback_no_tax_label: 'คืนทุน (ก่อนสิทธิประโยชน์ภาษี)',
    payback_tax_label: 'คืนทุนพร้อมสิทธิประโยชน์ภาษีที่ได้รับอนุมัติ',
    savings_25_label: 'ประหยัดสะสม 25 ปี',
    tax_note_label: 'หมายเหตุภาษี · ไม่ใช่คำแนะนำภาษี',
    tax_note_heading: 'สิทธิประโยชน์ภาษี — เฉพาะเมื่อได้รับอนุมัติ',
    tax_note_desc: 'สิทธิประโยชน์ภาษีขึ้นกับประเภทลูกค้า โครงสร้างกรรมสิทธิ์ ใบกำกับภาษี และคำแนะนำจากบัญชี/BOI ไม่ใช่คำแนะนำภาษีหรือการรับประกันสิทธิ์',
    bank_label: 'แบบจำลองเศรษฐศาสตร์เพื่อขอสินเชื่อธนาคาร',
    bank_heading: 'กระแสเงินสด ความสามารถชำระหนี้ และความเหมาะสมต่อธนาคาร',
    bank_desc: 'แบบจำลองเบื้องต้นสำหรับธนาคารหรือนักลงทุน การอนุมัติสินเชื่อขึ้นกับการตรวจสอบของผู้ให้กู้ เอกสารลูกค้า และเงื่อนไขเงินกู้สุดท้าย',
    project_cost_label: 'ต้นทุนโครงการ',
    loan_amount_label: 'วงเงินกู้',
    equity_label: 'เงินทุนเจ้าของ',
    annual_debt_service_label: 'ชำระหนี้ต่อปี',
    annual_om_label: 'O&M ต่อปี',
    net_operating_benefit_label: 'ผลประโยชน์สุทธิจากการดำเนินงาน',
    net_after_debt_label: 'กระแสเงินสดหลังชำระหนี้',
    dscr_label: 'DSCR',
    equity_payback_label: 'คืนทุนเงินทุนเจ้าของ',
    model_assumptions_label: 'สมมติฐานโมเดล',
    ltv_assumption_label: 'สัดส่วนเงินกู้',
    interest_assumption_label: 'ดอกเบี้ยต่อปี',
    years_assumption_label: 'ระยะเวลากู้',
    om_assumption_label: 'O&M',
    financing_note: 'โมเดลใช้การประหยัดปีแรก และไม่รับประกันการอนุมัติสินเชื่อ',
    pea_docs_label: 'เอกสารสำหรับขออนุมัติ PEA',
    pea_docs_heading: 'เอกสารที่ต้องใช้เพื่อขออนุมัติเชื่อมต่อ',
    pea_docs_desc: 'เพื่อยื่นคำขอเชื่อมต่อกับ PEA เราต้องการเอกสารต่อไปนี้จากลูกค้า',
    cta_heading: 'พร้อมเริ่มประหยัดหรือยัง?',
    cta_desc: 'นัดสำรวจหน้างานกับเรา — ไม่มีค่าใช้จ่าย ไม่มีข้อผูกมัด',
    footer_validity: 'ข้อเสนอนี้มีผล 30 วัน',
    not_included: 'ไม่รวมในโมเดล',
    review_required: 'ต้องตรวจสอบ',
    years_unit: 'ปี',
  },
}

function monthYear(date: Date, lang: ProposalLang) {
  const months: Record<ProposalLang, string[]> = {
    he: ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'],
    en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    th: ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'],
  }
  return `${months[lang][date.getMonth()]} ${date.getFullYear()}`
}

function monthlyLoanPayment(principal: number, annualInterestPct: number, years: number): number {
  const months = Math.max(1, Math.round(years * 12))
  const monthlyRate = Math.max(0, annualInterestPct) / 100 / 12
  if (principal <= 0) return 0
  if (monthlyRate === 0) return principal / months
  const factor = (1 + monthlyRate) ** months
  return principal * monthlyRate * factor / (factor - 1)
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

async function verifyAdmin(req: Request): Promise<{ email: string } | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)

  // Verify token with Supabase
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
    },
  })
  if (!r.ok) return null
  const user = await r.json()
  const email = user?.email?.toLowerCase()
  if (!email || !isAllowed(email)) return null
  return { email }
}

// ── TEMPLATE FETCH (from GitHub raw or embedded) ──
// For Edge, we need the template inline or fetch it
// Simplest: fetch from Vercel's own public folder
async function loadTemplate(origin: string): Promise<string> {
  const r = await fetch(`${origin}/proposal-templates/template-dynamic.html`, {
    cache: 'force-cache',
  })
  if (!r.ok) throw new Error(`Template fetch failed: ${r.status}`)
  return r.text()
}

function render(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = data[k]
    return v === undefined || v === null ? '' : escapeHtml(String(v))
  })
}

// ── MAIN HANDLER ──
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const admin = await verifyAdmin(req)
    if (!admin) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      ref,
      client_name,
      client_phone,
      client_email,
      location_he = 'תאילנד',
      location_en = 'Thailand',
      location_short = 'TH',
      location_psh = 'Thailand 13°N',
      system_size_kwp,
      panel_count,
      panel_watt = 580,
      panel_model = 'Jinko N-Type 580W',
      inverter_model = 'Huawei SUN2000-12KTL-M2',
      battery_model = 'Huawei LUNA2000-10-S0',
      battery_kwh = 10,
      annual_kwh: annual_kwh_submitted,
      monthly_kwh: monthly_kwh_submitted,
      monthly_savings_thb: monthly_savings_thb_submitted,
      annual_savings_thb: annual_savings_thb_submitted,
      total_price_thb,
      payback_no_tax: payback_no_tax_submitted,
      payback_with_tax: payback_with_tax_submitted,
      savings_25yr_thb: savings_25yr_thb_submitted,
      roof_original_url,
      roof_panels_url,
      logo_url = 'https://energy-tm.com/assets/logo/bustan-energy.svg',
      language: language_raw = 'he',
      password,
      psh = TM_SOLAR_ASSUMPTIONS.pshAnnual,
      pr = TM_SOLAR_ASSUMPTIONS.performanceRatio * TM_SOLAR_ASSUMPTIONS.soilingFactor,
      tariff_thb = TM_SOLAR_ASSUMPTIONS.retailRateThb,
      tax_deduction_thb = 0,
      // v3 deal options
      ppa_rate_thb_per_kwh = 4.20,
      ppa_years = 15,
      battery_price_thb = 150000,
      battery_kwh_extra = 10,
      co2_factor = TM_SOLAR_ASSUMPTIONS.co2KgPerKwh,
      monthly_bill_thb = 0,
      financing_enabled = true,
      financing_ltv_pct = 70,
      financing_interest_pct = 6.5,
      financing_years = 10,
      financing_om_pct = 1,
      bom_cost_thb = 0,
      price_markup = null,
      bom_price_snapshot = null,
      ai_analysis = null,
    } = body

    if (!ref || !client_name || !system_size_kwp || !total_price_thb) {
      return Response.json({ ok: false, error: 'missing_required' }, { status: 400 })
    }

    const language = proposalLang(language_raw)
    const copy = COPY[language]

    const financials = calculateSolarFinancials({
      systemSizeKwp: Number(system_size_kwp),
      panelCount: Number(panel_count || 0),
      panelWatt: Number(panel_watt || 580),
      pshAvg: Number(psh || TM_SOLAR_ASSUMPTIONS.pshAnnual),
      performanceRatio: Number(pr || TM_SOLAR_ASSUMPTIONS.performanceRatio),
      soilingFactor: 1,
      retailRateThb: Number(tariff_thb || TM_SOLAR_ASSUMPTIONS.retailRateThb),
      batteryKwh: Number(battery_kwh || 0),
      totalPriceThb: Number(total_price_thb || 0),
      taxDeductionThb: Number(tax_deduction_thb || 0),
    })
    const annual_kwh = financials.annual_kwh || annual_kwh_submitted
    const monthly_kwh = financials.monthly_kwh || monthly_kwh_submitted
    const monthly_savings_thb = financials.monthly_savings_thb || monthly_savings_thb_submitted
    const annual_savings_thb = financials.annual_savings_thb || annual_savings_thb_submitted
    const payback_no_tax = financials.payback_discounted_years || payback_no_tax_submitted
    const payback_with_tax = financials.payback_with_tax_years || payback_with_tax_submitted || 0
    const savings_25yr_thb = financials.savings_25yr_thb || savings_25yr_thb_submitted

    // Check if this proposal already exists before rendering the password gate.
    // Edits must preserve the existing password unless an admin explicitly passes a new one.
    const existingRes = await fetch(
      `${SUPABASE_URL}/rest/v1/proposals?ref_number=eq.${encodeURIComponent(ref)}&select=sent_at,status,view_count,first_viewed_at,signed_at,password_hash`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
    const existing = existingRes.ok ? (await existingRes.json())[0] : null
    const isNewProposal = !existing

    const pw = password || (isNewProposal || !existing?.password_hash ? random6() : null)
    const password_hash = pw ? await sha256hex(pw) : existing.password_hash

    // Build render data
    const now = new Date()
    const month_year = monthYear(now, language)

    // Cumulative savings (simple linear)
    const y5 = Math.round(annual_savings_thb * 5 / 1000)
    const y10 = Math.round(annual_savings_thb * 10 / 1000)
    const y15 = Math.round(annual_savings_thb * 15 / 1000)
    const y20 = Math.round(annual_savings_thb * 20 / 1000)

    // v3 computations
    const price_battery = (total_price_thb || 0) + (battery_price_thb || 0)
    const co2_saved_kg = Math.round((annual_kwh || 0) * co2_factor)
    const savings_10yr = (annual_savings_thb || 0) * 10
    const annual_bill = (monthly_bill_thb || 0) * 12
    const annual_bill_with_solar = Math.max(0, annual_bill - (annual_savings_thb || 0))
    // bar width percentage for savings viz (solar bar vs total bill)
    const solar_bar_pct = annual_bill > 0
      ? Math.max(2, Math.round((annual_bill_with_solar / annual_bill) * 100))
      : 2

    const financingEnabled = Boolean(financing_enabled)
    const financingLtvPct = Math.min(100, Math.max(0, Number(financing_ltv_pct || 0)))
    const financingInterestPct = Math.max(0, Number(financing_interest_pct || 0))
    const financingYears = Math.max(1, Number(financing_years || 1))
    const financingOmPct = Math.max(0, Number(financing_om_pct || 0))
    const loanAmount = Math.round((total_price_thb || 0) * (financingLtvPct / 100))
    const equityAmount = Math.max(0, Math.round((total_price_thb || 0) - loanAmount))
    const monthlyDebtService = monthlyLoanPayment(loanAmount, financingInterestPct, financingYears)
    const annualDebtService = Math.round(monthlyDebtService * 12)
    const annualOm = Math.round((total_price_thb || 0) * (financingOmPct / 100))
    const netOperatingBenefit = Math.round(Math.max(0, (annual_savings_thb || 0) - annualOm))
    const netAfterDebt = Math.round(netOperatingBenefit - annualDebtService)
    const dscr = annualDebtService > 0 ? netOperatingBenefit / annualDebtService : 0
    const equityPaybackYears = netAfterDebt > 0 ? equityAmount / netAfterDebt : 0
    const equityPaybackDisplay = equityPaybackYears > 0
      ? `${round(equityPaybackYears, 1)} ${copy.years_unit}`
      : copy.review_required

    const renderData = {
      ...copy,
      ref,
      client_name,
      html_lang: language === 'he' ? 'he' : language === 'th' ? 'th' : 'en',
      html_dir: language === 'he' ? 'rtl' : 'ltr',
      system_size_kwp,
      panel_count,
      panel_watt,
      panel_model,
      inverter_model,
      battery_model,
      battery_kwh,
      annual_kwh_fmt: fmt(annual_kwh),
      monthly_kwh_fmt: fmt(monthly_kwh),
      monthly_savings_fmt: fmt(monthly_savings_thb),
      annual_savings_fmt: fmt(annual_savings_thb),
      price_fmt: fmt(total_price_thb),
      payback_no_tax,
      payback_with_tax,
      payback_with_tax_display: payback_with_tax ? `${payback_with_tax} ${copy.years_unit}` : copy.not_included,
      savings_25yr_fmt: `${(savings_25yr_thb / 1000000).toFixed(1)}M`,
      cum_5yr: `${y5}K`,
      cum_10yr: `${y10}K`,
      cum_15yr: `${(y15/1000).toFixed(1)}M`,
      cum_20yr: `${(y20/1000).toFixed(1)}M`,
      cum_25yr: `${(savings_25yr_thb / 1000000).toFixed(1)}M`,
      location_he,
      location_en,
      location_short,
      location_psh,
      location_display: language === 'he' ? location_he : location_en,
      logo_url,
      roof_original_url: roof_original_url || logo_url,
      roof_panels_url: roof_panels_url || logo_url,
      month_year,
      // v3 deal options
      ppa_rate: String(ppa_rate_thb_per_kwh),
      ppa_years: String(ppa_years),
      price_battery_fmt: fmt(price_battery),
      battery_kwh_extra: String(battery_kwh_extra),
      co2_saved_kg: String(co2_saved_kg),
      savings_10yr_fmt: fmt(savings_10yr),
      annual_bill_fmt: fmt(annual_bill),
      annual_bill_with_solar_fmt: fmt(annual_bill_with_solar),
      solar_bar_pct: String(solar_bar_pct),
      tariff_thb: String(Number(tariff_thb || 0).toFixed(2)),
      financing_section_display: financingEnabled ? 'block' : 'none',
      financing_ltv_pct: String(financingLtvPct),
      financing_interest_pct: String(financingInterestPct),
      financing_years: String(financingYears),
      financing_om_pct: String(financingOmPct),
      financing_loan_fmt: fmt(loanAmount),
      financing_equity_fmt: fmt(equityAmount),
      financing_debt_service_fmt: fmt(annualDebtService),
      financing_monthly_debt_fmt: fmt(Math.round(monthlyDebtService)),
      financing_om_fmt: fmt(annualOm),
      financing_net_operating_fmt: fmt(netOperatingBenefit),
      financing_net_after_debt_fmt: fmt(netAfterDebt),
      financing_dscr: dscr > 0 ? dscr.toFixed(2) : '—',
      financing_equity_payback_display: equityPaybackDisplay,
      language,
    }

    // Load + render template
    const origin = new URL(req.url).origin
    const template = await loadTemplate(origin)
    const rendered = render(template, renderData)

    // Inject the contract UI only. Password access is enforced server-side by /api/proposal-serve.
    const contractRes = await fetch(`${origin}/proposal-templates/contract-snippet.html`)
    const contractTmpl = contractRes.ok ? await contractRes.text() : ''
    const contract = render(contractTmpl, { ref })

    const finalHtml = rendered.replace('</body>', `${contract}\n</body>`)

    const nowIso = new Date().toISOString()
    // 30-day expiry (needed by schedule_followups_on_send trigger)
    const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // Build upsert payload — only set sent_at on first send
    const upsertBody: Record<string, unknown> = {
      ref_number: ref,
      client_name,
      client_phone: client_phone || null,
      client_email: client_email || null,
      location: location_en,
      system_size_kwp,
      panel_count,
      panel_watt,
      panel_model,
      inverter_model,
      battery_kwh,
      total_price_thb,
      monthly_savings_thb,
      annual_savings_thb,
      payback_years: payback_no_tax,
      monthly_production_kwh: monthly_kwh,
      annual_production_kwh: annual_kwh,
      password_hash,
      language,
      html_url: `https://energy-tm.com/p/${ref}`,
      expires_at,
      metadata: {
        rendered_html: finalHtml,
        created_by: admin.email,
        tax_deduction_thb,
        psh,
        pr,
        tariff_thb,
        financial_assumptions: financials,
        location_he,
        location_short,
        location_psh,
        last_edited_at: nowIso,
        last_edited_by: admin.email,
        // v3
        ppa_rate_thb_per_kwh,
        ppa_years,
        battery_price_thb,
        battery_kwh_extra,
        co2_factor,
        monthly_bill_thb,
        financing: {
          enabled: financingEnabled,
          ltv_pct: financingLtvPct,
          interest_pct: financingInterestPct,
          years: financingYears,
          om_pct: financingOmPct,
          loan_amount_thb: loanAmount,
          equity_amount_thb: equityAmount,
          annual_debt_service_thb: annualDebtService,
          monthly_debt_service_thb: Math.round(monthlyDebtService),
          annual_om_thb: annualOm,
          net_operating_benefit_thb: netOperatingBenefit,
          net_cash_after_debt_thb: netAfterDebt,
          dscr: round(dscr, 2),
          equity_payback_years: equityPaybackYears > 0 ? round(equityPaybackYears, 1) : null,
        },
        pricing: {
          bom_cost_thb: Number(bom_cost_thb || 0),
          price_markup: price_markup === null ? null : Number(price_markup || 0),
          client_price_thb: Number(total_price_thb || 0),
          gross_profit_thb: Math.round(Number(total_price_thb || 0) - Number(bom_cost_thb || 0)),
          gross_margin_pct: Number(total_price_thb || 0) > 0
            ? Math.round((1 - Number(bom_cost_thb || 0) / Number(total_price_thb || 1)) * 1000) / 10
            : null,
          bom_price_snapshot: bom_price_snapshot || undefined,
        },
        // AI roof analysis (if ran)
        ai_analysis: ai_analysis || undefined,
      },
    }

    if (isNewProposal) {
      // First time — mark as sent now
      upsertBody.status = 'sent'
      upsertBody.sent_at = nowIso
    } else {
      // Edit — preserve existing lifecycle state
      upsertBody.sent_at = existing.sent_at || nowIso
      // Don't downgrade status (viewed/signed should stay)
      if (!existing.status || existing.status === 'draft') {
        upsertBody.status = 'sent'
      }
    }

    await supaUpsert('proposals', upsertBody, 'ref_number')

    // Emit analytics event
    fetch(`${SUPABASE_URL}/rest/v1/proposal_events`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        proposal_ref: ref,
        event_type: isNewProposal ? 'sent' : 'edited',
        event_data: { by: admin.email },
      }),
    }).catch(() => {})

    return Response.json({
      ok: true,
      ref,
      password: pw,
      url: `https://energy-tm.com/p/${ref}`,
      created_by: admin.email,
      is_new: isNewProposal,
    })
  } catch (e: unknown) {
    console.error('create error:', e)
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
