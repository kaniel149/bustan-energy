# TM Energy — Value Chain Blueprint
## שרשרת הערך המלאה: מליד ועד O&M

> כל שלב = מודול בתוך Solar OS CRM
> כל מודול = מסך, טפסים, אוטומציות, דוחות

---

## סקירה כללית — 12 שלבים

```
LEAD → SURVEY → ANALYSIS → DESIGN → PROPOSAL → CONTRACT → PROCURE → INSTALL → CONNECT → COMMISSION → HANDOVER → O&M
  1       2        3          4         5          6          7          8          9          10           11       12
```

---

## שלב 1: 📥 Lead Capture — לכידת ליד

### מה קורה
- ליד נכנס מ: WhatsApp, LINE, Facebook, אתר, הפניה, Roof Scanner
- נרשם אוטומטית ב-CRM עם מקור + תאריך + סטטוס

### מה צריך ב-CRM
- **טופס ליד**: שם, טלפון, מייל, סוג עסק, כתובת, מקור
- **אוטומציה**: WhatsApp webhook → ליד חדש
- **תזכורת**: אם לא נענה תוך 2 שעות → התראה למנהל
- **סטטוסים**: New → Contacted → Survey Scheduled → Qualified → Lost

### שדות DB
```sql
leads: id, name, phone, email, business_type, address, lat, lng,
       source (whatsapp/line/facebook/website/referral/scanner),
       status, assigned_to, notes, created_at, updated_at
```

---

## שלב 2: 📸 Site Survey — סקר אתר

### מה קורה
- ביקור פיזי באתר
- צילום: גג (דרון + ידני), ארון חשמל, מונה, סביבה
- מדידות: שטח גג, זווית, כיוון, הצללות, מכשולים
- בדיקת מרחק: גג → ארון חשמל → מונה PEA

### מה צריך ב-CRM
- **מודול סקר** עם טופס מובנה:
  - [ ] צילום גג (מלמעלה — דרון)
  - [ ] צילום גג (מקרוב — סוג רעפים/פח)
  - [ ] צילום ארון חשמל (פנים + חוץ)
  - [ ] צילום מונה PEA (מספר + קריאה)
  - [ ] צילום סביבה (הצללות, עצים, בניינים)
  - [ ] מדידות גג (אורך × רוחב × זווית)
  - [ ] כיוון גג (compass bearing)
  - [ ] מרחק גג → ארון חשמל (מטרים)
  - [ ] מרחק ארון → מונה PEA
  - [ ] סוג גג (בטון/פח/רעפים/עץ)
  - [ ] מצב גג (טוב/בינוני/דורש תיקון)
  - [ ] הצללות (שעות/כיוון)
  - [ ] גישה לגג (סולם/מדרגות/מנוף)
- **מפה**: סימון GPS של המיקום
- **גלריית תמונות**: כל התמונות מקושרות לליד
- **צ'קליסט**: כל הפריטים חייבים להיות מלאים לפני שלב הבא

### שדות DB
```sql
site_surveys: id, lead_id, project_id, survey_date, surveyor,
  -- Roof
  roof_type (concrete/metal/tile/wood), roof_condition (good/fair/poor),
  roof_length_m, roof_width_m, roof_area_m2, roof_usable_area_m2,
  roof_angle_deg, roof_azimuth_deg, roof_direction (N/S/E/W/NE/NW/SE/SW),
  -- Shading
  shading_hours, shading_direction, shading_objects,
  -- Electrical
  electrical_panel_type, panel_distance_m, meter_number, meter_reading,
  meter_distance_m, grid_phase (single/three), main_breaker_amps,
  -- Access
  roof_access (ladder/stairs/crane), crane_needed boolean,
  -- Location
  lat, lng, address,
  -- Status
  status (draft/complete/approved), notes,
  created_at, updated_at

site_survey_photos: id, survey_id, photo_url, photo_type
  (roof_top/roof_close/panel_exterior/panel_interior/meter/
   surroundings/shading/access), caption, created_at
```

---

## שלב 3: ⚡ Electricity Analysis — ניתוח חשמל

### מה קורה
- איסוף 3-12 חשבונות חשמל PEA
- חישוב: צריכה ממוצעת, peak, עונתיות
- זיהוי תעריף (residential/commercial/TOU)
- חישוב עלות שנתית וחיסכון פוטנציאלי

### מה צריך ב-CRM
- **טופס חשבון חשמל**:
  - חודש, kWh, סכום (THB), demand charge, FT surcharge
  - העלאת תמונת חשבון (OCR עתידי)
- **גרף צריכה**: חודשי, מגמות, peak vs off-peak
- **חישוב אוטומטי**:
  - צריכה ממוצעת חודשית (kWh)
  - עלות ממוצעת per kWh (effective rate)
  - גודל מערכת מומלץ (kWp)
  - חיסכון שנתי צפוי (THB)
  - CO₂ reduction

### שדות DB
```sql
electricity_bills: id, project_id, month, year, kwh_consumed,
  amount_thb, demand_charge, ft_surcharge, tariff_type,
  bill_photo_url, notes, created_at

electricity_analysis: id, project_id,
  avg_monthly_kwh, avg_monthly_cost, peak_month_kwh,
  effective_rate_per_kwh, annual_cost, annual_kwh,
  recommended_system_kwp, estimated_savings_annual,
  co2_reduction_kg, self_consumption_ratio,
  created_at, updated_at
```

---

## שלב 4: 🎨 System Design — עיצוב מערכת

### מה קורה
- עיצוב פריסת פאנלים על הגג
- בחירת ציוד: פאנלים, ממיר, סוללה, מרכבים
- חישוב: כמות פאנלים, ייצור צפוי, self-consumption
- PVsyst simulation (אם זמין)

### מה צריך ב-CRM
- **Panel Layout Designer** (מבוסס על Roof Scanner):
  - גרירת פאנלים על תמונת גג/מפה
  - חישוב אוטומטי של כמות + הספק
  - הצגת אזורי הצללה
  - מרחק בין שורות
- **בחירת ציוד** (dropdown מהמלאי):
  - Panel: LONGi Hi-MO X6 580W / 550W / 400W
  - Inverter: Huawei SUN2000 5/8/10/15/20KTL
  - Battery: Huawei LUNA2000 5/10/15 kWh
  - Mounting: Roof/Ground/Ballast
- **חישוב ביצועים**:
  - Total kWp, annual kWh production
  - Specific yield (kWh/kWp)
  - Self-consumption ratio
  - Grid export ratio
  - Performance ratio

### שדות DB
```sql
system_designs: id, project_id, version, status (draft/final/approved),
  -- Panels
  panel_model, panel_watt, panel_count, total_kwp,
  panel_layout_json, -- coordinates on roof
  -- Inverter
  inverter_model, inverter_count, inverter_kw,
  -- Battery
  battery_model, battery_kwh, battery_count,
  -- Mounting
  mounting_type, mounting_model,
  -- Performance
  annual_kwh_production, specific_yield, self_consumption_pct,
  grid_export_pct, performance_ratio,
  -- Files
  layout_image_url, pvsyst_report_url,
  designer, notes, created_at, updated_at
```

---

## שלב 5: 📐 Single-Line Diagram — תוכנית חד-קווית

### מה קורה
- תוכנית חשמלית חד-קווית (SLD) נדרשת ע"י PEA
- מראה: פאנלים → String → Inverter → AC Panel → Meter → Grid
- כוללת: cable sizes, breakers, grounding, surge protection
- נשלחת ל-PEA כחלק מבקשת חיבור

### מה צריך ב-CRM
- **SLD Generator** (אוטומטי/חצי-אוטומטי):
  - Input: system design (panels, inverter, battery)
  - Output: SVG/PDF single-line diagram
  - כולל: DC/AC cable sizing, breaker ratings, SPD
  - Template-based: residential / commercial / hybrid
- **סטטוס PEA**: draft → submitted → approved → connected
- **מעקב**: תאריך שליחה, מספר בקשה, מועד תשובה צפוי

### שדות DB
```sql
sld_documents: id, project_id, design_id, version,
  template_type (residential/commercial/hybrid),
  -- Cable sizing
  dc_cable_size_mm2, ac_cable_size_mm2,
  dc_breaker_amps, ac_breaker_amps,
  -- Protection
  spd_model, grounding_type, rcd_rating,
  -- PEA
  pea_status (draft/submitted/approved/rejected),
  pea_submission_date, pea_reference_number,
  pea_expected_response, pea_approval_date,
  -- Files
  sld_svg_url, sld_pdf_url,
  engineer, notes, created_at, updated_at
```

---

## שלב 6: 💰 Proposal — הצעת מחיר

### מה קורה
- הצעת מחיר דיגיטלית ללקוח
- כוללת: ציוד, עלויות, ROI, חזותי
- שני מסלולים: EPC (מכירה) / PPA (שכירות חשמל)
- שליחה ב-WhatsApp/Email עם לינק

### מה צריך ב-CRM (כבר יש proposal.html — לשלב ב-CRM)
- **Proposal Builder**:
  - Auto-fill מהעיצוב + ניתוח חשמל
  - מודל EPC: מחיר, תשלומים, payback, ROI
  - מודל PPA: הנחה מ-PEA, חיסכון חודשי, חוזה שנים
  - השוואה: EPC vs PPA side-by-side
  - תמונת layout על הגג
  - Branding: TM Energy
- **מודלים כלכליים**:
  - EPC: Total cost, margin, payback years, NPV, IRR
  - PPA: Monthly rate, escalation, contract years, IRR, NPV
  - Sensitivity: best/base/worst case
- **חתימה דיגיטלית**: לקוח חותם על ההצעה אונליין
- **סטטוסים**: Draft → Sent → Viewed → Accepted → Rejected

### שדות DB
```sql
proposals: id, project_id, version, model_type (epc/ppa/both),
  -- EPC pricing
  epc_total_cost, epc_margin_pct, epc_payment_terms,
  epc_payback_years, epc_npv, epc_irr,
  -- PPA pricing
  ppa_rate_per_kwh, ppa_discount_pct, ppa_escalation_pct,
  ppa_contract_years, ppa_monthly_payment,
  ppa_irr, ppa_npv, ppa_payback_years,
  -- Status
  status (draft/sent/viewed/accepted/rejected/expired),
  sent_date, viewed_date, accepted_date,
  -- Signature
  customer_signature_url, signed_date,
  -- Files
  proposal_url, proposal_pdf_url,
  valid_until, notes, created_at, updated_at
```

---

## שלב 7: 📝 Contract — חוזה

### מה קורה
- חתימת חוזה: EPC / PPA / O&M
- תנאי תשלום, אחריות, SLA
- אבני דרך (milestones) לתשלום

### מה צריך ב-CRM
- **Template חוזה**: auto-fill מ-proposal
- **מעקב תשלומים**: milestone-based (30/40/30 ל-EPC)
- **סטטוס חוזה**: Draft → Signed → Active → Complete
- **מעקב אחריות**: start/end dates, claims

### שדות DB
```sql
contracts: id, project_id, proposal_id, contract_type (epc/ppa/om),
  contract_number, signed_date, start_date, end_date,
  total_value, payment_terms,
  warranty_years, warranty_start, warranty_end,
  status (draft/signed/active/completed/terminated),
  contract_pdf_url, signed_pdf_url,
  notes, created_at, updated_at

contract_milestones: id, contract_id, milestone_name,
  amount, due_date, paid_date, status (pending/invoiced/paid),
  invoice_number, notes
```

---

## שלב 8: 📦 Procurement — רכש ומלאי

### מה קורה
- הזמנת ציוד מספקים (Solaris Green, BayWa, ישירות)
- ניהול מלאי: מה במחסן, מה בדרך, מה חסר
- שיוך ציוד לפרויקט

### מה צריך ב-CRM
- **מלאי**: פאנלים, ממירים, סוללות, מרכבים, כבלים, מגנים
  - כמות במחסן
  - כמות בהזמנה (in transit)
  - כמות משויכת לפרויקטים (allocated)
  - כמות זמינה = במחסן - משויך
- **הזמנת רכש (PO)**:
  - ספק, פריטים, כמויות, מחיר, תאריך אספקה צפוי
  - סטטוס: Draft → Sent → Confirmed → Shipped → Received
  - מעקב משלוח (מעבורת לאי)
- **שיוך לפרויקט**: Pull מהמחסן → assign לפרויקט
- **התראות**: מלאי מינימלי → הזמנה אוטומטית

### שדות DB
```sql
inventory_items: id, sku, name, category (panel/inverter/battery/mounting/cable/protection),
  brand, model, unit_cost, unit (piece/meter/kg),
  qty_in_stock, qty_in_transit, qty_allocated, qty_available,
  min_stock_level, warehouse_location, notes

purchase_orders: id, supplier_id, po_number, order_date,
  expected_delivery, actual_delivery,
  total_amount, currency, status (draft/sent/confirmed/shipped/received/cancelled),
  tracking_number, notes

po_items: id, po_id, inventory_item_id, qty, unit_price, total_price

project_materials: id, project_id, inventory_item_id,
  qty_allocated, qty_used, serial_numbers,
  pulled_date, pulled_by, notes

suppliers: id, name, contact_person, phone, email,
  address, payment_terms, lead_time_days, notes
```

---

## שלב 9: 🔨 Installation — התקנה

### מה קורה
- תיאום צוות + לוגיסטיקה
- ביצוע התקנה: מרכבים → פאנלים → DC → ממיר → AC
- תיעוד: תמונות, בדיקות, חתימות

### מה צריך ב-CRM
- **לוח זמנים**: Gantt פשוט — שלבי התקנה
- **צ'קליסט התקנה**:
  - [ ] הכנת גג (ניקוי, חיזוק אם צריך)
  - [ ] התקנת מרכבים
  - [ ] הנחת פאנלים
  - [ ] חיווט DC (strings)
  - [ ] התקנת ממיר
  - [ ] חיווט AC
  - [ ] התקנת סוללה (אם יש)
  - [ ] Grounding + SPD
  - [ ] בדיקות DC: Voc, Isc, polarity
  - [ ] בדיקות AC: voltage, frequency
  - [ ] בדיקת בידוד
  - [ ] תיעוד תמונות כל שלב
- **צוות**: מי עובד, שעות, הוצאות
- **בעיות**: דיווח בעיות באתר + פתרון

### שדות DB
```sql
installations: id, project_id, start_date, end_date,
  status (planned/in_progress/paused/completed/failed),
  team_lead, crew_size, total_hours,
  weather_notes, site_notes

installation_tasks: id, installation_id, task_name,
  sequence, planned_date, completed_date,
  status (pending/in_progress/done/skipped),
  assigned_to, photos_json, notes

installation_issues: id, installation_id, issue_type,
  severity (low/medium/high/critical),
  description, resolution, resolved_date,
  photos_json, reported_by
```

---

## שלב 10: 🔌 Grid Connection — חיבור PEA

### מה קורה
- הגשת בקשה ל-PEA (30 יום הודעה)
- התקנת מונה דו-כיווני
- בדיקת PEA
- אישור חיבור

### מה צריך ב-CRM
- **מעקב PEA**:
  - תאריך הגשה
  - מספר בקשה
  - מועד בדיקה
  - תוצאת בדיקה
  - תאריך אישור
  - מספר מונה חדש
- **מסמכים**: SLD, ID copy, house book, PEA form
- **סטטוסים**: Preparing → Submitted → Inspection → Approved → Connected

### שדות DB
```sql
pea_connections: id, project_id, sld_id,
  submission_date, reference_number,
  inspection_date, inspector_name,
  inspection_result (pass/fail/conditional),
  approval_date, connection_date,
  new_meter_number, meter_type (bidirectional/net_metering),
  net_metering_approved boolean,
  status (preparing/submitted/inspection_scheduled/inspected/approved/connected/rejected),
  documents_json, notes, created_at, updated_at
```

---

## שלב 11: ✅ Commissioning — הפעלה ומסירה

### מה קורה
- הפעלת מערכת לראשונה
- בדיקות ביצועים
- הדרכת לקוח
- חתימה על פרוטוקול מסירה

### מה צריך ב-CRM
- **צ'קליסט הפעלה**:
  - [ ] בדיקת ייצור (kW actual vs expected)
  - [ ] בדיקת monitoring (Huawei FusionSolar / Sungrow iSolarCloud)
  - [ ] הדרכת לקוח (app, חשבון, מה לעשות בהפסקה)
  - [ ] מסירת מסמכים (אחריות, SLD, manual)
  - [ ] חתימת פרוטוקול מסירה
  - [ ] צילום תיעוד סופי
- **ביצועים ביום 1**: kWh produced, peak kW, PR%
- **פרוטוקול מסירה**: חתימה דיגיטלית

### שדות DB
```sql
commissioning: id, project_id, installation_id,
  commissioning_date, commissioned_by,
  -- Performance
  first_day_kwh, peak_kw, performance_ratio,
  -- Monitoring
  monitoring_platform, monitoring_account,
  monitoring_plant_id, monitoring_configured boolean,
  -- Customer training
  customer_trained boolean, training_date,
  -- Handover
  handover_signed boolean, handover_date,
  handover_document_url, customer_signature_url,
  -- Status
  status (planned/in_progress/completed/issues),
  notes, created_at, updated_at
```

---

## שלב 12: 🔧 O&M — תחזוקה שוטפת

### מה קורה
- ניטור 24/7 דרך FusionSolar/iSolarCloud
- ניקוי פאנלים (כל 3-6 חודשים)
- תחזוקה מונעת (שנתי)
- תיקונים
- דוחות ביצועים ללקוח

### מה צריך ב-CRM
- **Dashboard ניטור**: ייצור, התראות, ביצועים per site
- **לוח תחזוקה**:
  - ניקוי פאנלים (scheduled)
  - בדיקה תקופתית (שנתי)
  - החלפת ציוד
- **Tickets**: תקלה → פתיחת ticket → שיוך לטכנאי → פתרון
- **דוחות חודשיים**: ייצור, חיסכון, CO₂, ביצועים
  - נשלחים אוטומטית ללקוח ב-WhatsApp/Email
- **חיוב O&M**: חודשי, invoice אוטומטי

### שדות DB
```sql
om_contracts: id, project_id, contract_id,
  package_type (basic/standard/premium),
  monthly_fee, start_date, end_date,
  cleaning_frequency_months, inspection_frequency_months,
  response_time_hours, includes_parts boolean

om_tasks: id, project_id, om_contract_id,
  task_type (cleaning/inspection/repair/replacement),
  scheduled_date, completed_date,
  technician, duration_hours, cost,
  status (scheduled/in_progress/completed/cancelled),
  photos_json, report_notes

om_tickets: id, project_id, om_contract_id,
  ticket_number, priority (low/medium/high/critical),
  issue_type, description,
  reported_date, assigned_to, resolved_date,
  resolution, photos_json,
  status (open/assigned/in_progress/resolved/closed)

om_reports: id, project_id, report_month, report_year,
  kwh_produced, kwh_expected, performance_ratio,
  savings_thb, co2_reduction_kg,
  issues_count, cleaning_done boolean,
  report_pdf_url, sent_to_customer boolean,
  sent_date, created_at
```

---

## סיכום ארכיטקטורה

### טבלאות חדשות (18):
1. `site_surveys` — סקר אתר
2. `site_survey_photos` — תמונות סקר
3. `electricity_bills` — חשבונות חשמל
4. `electricity_analysis` — ניתוח חשמל
5. `system_designs` — עיצוב מערכת
6. `sld_documents` — תוכניות חד-קוויות
7. `proposals` — הצעות מחיר (קיים — להרחיב)
8. `contracts` — חוזים
9. `contract_milestones` — אבני דרך תשלום
10. `inventory_items` — מלאי
11. `purchase_orders` — הזמנות רכש
12. `po_items` — פריטי הזמנה
13. `project_materials` — חומרים לפרויקט
14. `suppliers` — ספקים
15. `installations` — התקנות
16. `installation_tasks` — משימות התקנה
17. `installation_issues` — בעיות התקנה
18. `pea_connections` — חיבור PEA
19. `commissioning` — הפעלה ומסירה
20. `om_contracts` — חוזי תחזוקה
21. `om_tasks` — משימות תחזוקה
22. `om_tickets` — קריאות שירות
23. `om_reports` — דוחות חודשיים

### מסכים חדשים ב-CRM (12):
1. **Site Survey Form** — טופס סקר + upload תמונות
2. **Electricity Analyzer** — הזנת חשבונות + גרפים
3. **System Designer** — פריסת פאנלים על גג
4. **SLD Generator** — תוכנית חד-קווית אוטומטית
5. **Proposal Builder** — הצעת מחיר EPC/PPA
6. **Financial Calculator** — מודלים כלכליים
7. **Contract Manager** — חוזים + milestones
8. **Inventory & Procurement** — מלאי + הזמנות
9. **Installation Tracker** — צ'קליסט + צוות + timeline
10. **PEA Connection Manager** — מעקב חיבור
11. **Commissioning Checklist** — הפעלה + מסירה
12. **O&M Dashboard** — ניטור + תחזוקה + tickets + דוחות

### Pipeline View
```
Lead (57) → Survey (0) → Design (0) → Proposal (0) → Contract (0) → Install (0) → Live (0)
```

---

## סדר בנייה מומלץ

### Phase 1 — Core (שבוע 1-2)
1. Site Survey Form + Photos
2. Electricity Analyzer
3. Pipeline View (Kanban)

### Phase 2 — Design & Sales (שבוע 2-3)
4. System Designer (basic)
5. Proposal Builder (EPC + PPA)
6. Financial Calculator

### Phase 3 — Operations (שבוע 3-4)
7. Contract Manager
8. Inventory & Procurement
9. Installation Tracker

### Phase 4 — Post-Install (שבוע 4-5)
10. PEA Connection Manager
11. Commissioning Checklist
12. O&M Dashboard
