# Drone Island Scan — Koh Phangan Solar Mapping
## TM Energy — Master Plan

---

## Mission

סריקת רחפן מלאה של קו פנגן — מיפוי כל גג, חלקה ושטח פנוי באי.
יצירת מפה אינטראקטיבית עם פוטנציאל סולארי, בעלי קרקע, והצעות מחיר אוטומטיות.

**תוצר סופי:** מפה אינטראקטיבית שבה כל חלקה/גג צבועים לפי פוטנציאל סולארי, עם כפתור "קבל הצעה" לכל אחד.

---

## 1. ציוד נדרש

### רחפן
| Option | Model | מחיר | רזולוציה | זמן טיסה | יתרון |
|--------|-------|-------|----------|----------|-------|
| **מומלץ** | DJI Mavic 3 Enterprise | ~฿120,000 ($3,400) | 20MP + RTK | 45 דקות | RTK לדיוק cm, תמהיל מחיר-ביצוע |
| Budget | DJI Mini 4 Pro | ~฿35,000 ($1,000) | 48MP | 34 דקות | קל (<250g), לא צריך רישום בתאילנד |
| Pro | DJI Matrice 350 RTK | ~฿350,000 ($10,000) | P1 camera 45MP | 55 דקות | מקצועי, LiDAR אופציונלי |

### אביזרים
- סוללות נוספות: 6-8 (לטיסה רציפה)
- Charging hub + Power bank (שטח)
- MicroSD 256GB × 4
- Landing pad
- iPad/Tablet למוניטור
- רכב (סקוטר/רכב שטח) לנגישות לכל נקודות ההמראה

### תוכנה
| כלי | שימוש | מחיר |
|-----|-------|------|
| **DJI Pilot 2** | תכנון טיסה אוטומטי (waypoints) | חינם |
| **DroneDeploy** | תכנון מסלולים + עיבוד ענן | $329/חודש |
| **WebODM** | עיבוד orthomosaic (קוד פתוח) | חינם (self-hosted) |
| **OpenDroneMap** | חלופה ל-WebODM | חינם |
| **QGIS** | GIS ניתוח + מיפוי | חינם |
| **Mapbox GL JS** | מפה אינטראקטיבית באינטרנט | Free tier |

---

## 2. רגולציית רחפנים בתאילנד

### CAAT (Civil Aviation Authority of Thailand) — כללי NBTC
| קטגוריה | משקל | דרישות |
|---------|------|---------|
| Cat 1 | ≤2 kg | רישום CAAT + ביטוח בלבד |
| Cat 2 | 2-25 kg | רישום + רישיון טייס + ביטוח |
| Cat 3 | >25 kg | רישום + רישיון + אישור CAAT מיוחד |

### **DJI Mini 4 Pro = פטור מרישום** (<250g)
- יתרון משמעותי: לא צריך רישום, לא צריך רישיון
- מגבלה: גובה מקסימלי 90 מטרים, קו ראייה (VLOS)
- **לא לטוס** מעל: נמל תעופה, מתקנים צבאיים, ארמונות מלכותיים
- **חשוב:** פארק לאומי Than Sadet = ~66% מהאי — **אסור לטוס בתוך גבולות הפארק** ללא אישור DNP

### אישורים נדרשים
1. **רישום CAAT** (אם רחפן >250g): register.caat.or.th — 2-3 שבועות
2. **ביטוח צד ג'**: חובה לכל רחפן — ~฿3,000/שנה
3. **אישור DNP** (אם טסים מעל שטחי פארק לאומי): กรมอุทยานแห่งชาติ
4. **הודעה ל-PEA/רשות מקומית**: לא חובה אבל מומלץ (אנחנו סורקים לטובת אנרגיה ירוקה)

### Restricted Zones on Koh Phangan
- **Than Sadet National Park** (~43 km² / 66% of island): אישור DNP נדרש
- **Thong Sala port area**: זהירות — תנועת מטוסים קלים (seaplanes)
- **Full Moon Party beach** (Haad Rin): צפיפות אנשים — לא לטוס מעל קהל
- **מקדשים/בתי ספר**: רגישות תרבותית — גובה מינימלי 50m

---

## 3. תכנון טיסה — Grid Pattern

### פרמטרים
```
שטח האי: 65 km²
שטח ניתן לסריקה (בלי פארק לאומי): ~22 km² (34%)
שטח פארק לאומי (צריך אישור): ~43 km² (66%)

גובה טיסה: 80-120 מטרים AGL
רזולוציה קרקע (GSD): 2-3 cm/pixel (ב-80m עם Mavic 3E)
חפיפה: 80% forward, 70% side (לאורתומוזאיקה)

רוחב רצועה בגובה 100m: ~120 מטרים (70% overlap = 36m מרווח)
```

### חלוקה ל-Zones (11 אזורים)

| Zone | אזור | שטח (km²) | גגות מוערכים | עדיפות |
|------|-------|-----------|-------------|--------|
| **Z1** | Thong Sala (עיר + נמל) | 2.5 | 800+ | 🔴 גבוהה |
| **Z2** | Ban Tai (חופים + מלונות) | 3.0 | 500+ | 🔴 גבוהה |
| **Z3** | Haad Rin (Full Moon area) | 1.5 | 300+ | 🟡 בינונית |
| **Z4** | Sri Thanu (קהילות wellness) | 2.0 | 200+ | 🟡 בינונית |
| **Z5** | Chaloklum (כפר דייגים + resorts) | 2.0 | 250+ | 🟡 בינונית |
| **Z6** | Wok Tum / Hin Kong | 1.5 | 150+ | 🟡 בינונית |
| **Z7** | Ban Khai / Thong Nai Pan | 2.0 | 200+ | 🟢 נמוכה |
| **Z8** | Mae Haad / Koh Ma | 1.0 | 100+ | 🟢 נמוכה |
| **Z9** | Sadet / Thaan Prawet (פארק) | 15.0 | 50 | ⚪ אישור DNP |
| **Z10** | הרים מרכז (פארק) | 20.0 | 20 | ⚪ אישור DNP |
| **Z11** | שטחים חקלאיים פנימיים | 3.0 | 100+ | 🟡 בינונית |

### לוח זמנים לסריקה

**Phase 1: אזורים עירוניים (Z1-Z2)** — שבוע 1-2
- 5.5 km² / ~45 טיסות / ~3 טיסות ליום
- **תוצר:** מפה מלאה של Thong Sala + Ban Tai עם כל הגגות

**Phase 2: חופים + resorts (Z3-Z6)** — שבוע 3-4
- 7 km² / ~58 טיסות / ~3 טיסות ליום
- **תוצר:** Haad Rin, Sri Thanu, Chaloklum, Wok Tum

**Phase 3: אזורים מרוחקים (Z7-Z8, Z11)** — שבוע 5-6
- 6 km² / ~50 טיסות / ~3 טיסות ליום
- **תוצר:** כל השטח הנגיש ממופה

**Phase 4: פארק לאומי (Z9-Z10)** — שבוע 7-8 (אחרי אישור DNP)
- 35 km² / ~290 טיסות (רק אזורי עניין)
- **תוצר:** מפה מלאה של האי

### סיכום טיסות
```
Total flights Phase 1-3: ~153 טיסות
Battery changes: ~150 (סוללה לטיסה)
Flight days: ~18-20 ימים (3 שעות בוקר + 3 שעות אחה"צ)
Total flight time: ~115 שעות
Storage: ~2-3 TB תמונות raw
```

---

## 4. עיבוד נתונים — Pipeline

### שלב A: Orthomosaic (יום 1-3 per zone)
```
Raw images → WebODM/OpenDroneMap → Orthomosaic + DSM + Point Cloud
- Orthomosaic: תמונה אחידה ברזולוציה גבוהה
- DSM (Digital Surface Model): גובה כל נקודה (לחישוב שיפוע גג)
- Point Cloud: ענן נקודות 3D
```

### שלב B: Roof Detection (AI)
```
Orthomosaic → Roof Detection Model → Polygons per roof
- Segment Anything Model (SAM) / RoofPedia
- סיווג: מתכת (trapezoidal), בטון, רעפים, שטוח
- שטח כל גג (m²)
- כיוון וזווית (מ-DSM)
- מצב גג (הצללה, עצים, מכשולים)
```

### שלב C: Solar Analysis (per roof/parcel)
```
לכל גג/חלקה:
- שטח שמיש (m²) × 0.7 (usable ratio)
- kWp = שטח / 5.5
- ייצור שנתי = kWp × 1,350 kWh
- חיסכון שנתי = ייצור × ฿5.50/kWh (ממוצע)
- עלות מערכת = kWp × ฿32,500
- ROI = עלות / חיסכון שנתי
- PPA rate: ฿4.50/kWh
```

### שלב D: Owner Identification
```
מקורות:
1. Land Registry (กรมที่ดิน) — ตำบล/อำเภอ office
2. Google Maps business listings
3. Booking.com / Agoda listings (resorts/hotels)
4. Facebook business pages
5. Physical signage (from drone photos)
6. Local contacts (TM Developers network)
```

### שלב E: Interactive Map
```
Mapbox GL JS / Leaflet map with:
- Orthomosaic as base layer (our drone photos!)
- Color-coded roof polygons:
  🟢 Green: >10 kWp potential, flat/metal roof, no shading
  🟡 Yellow: 5-10 kWp, moderate potential
  🟠 Orange: 2-5 kWp, small roof or partial shading
  🔴 Red: <2 kWp or unsuitable (shade/orientation)
  ⬜ White: unclassified / need inspection
- Click any roof → popup with:
  - Aerial photo
  - System size (kWp)
  - Estimated monthly savings
  - ROI (years)
  - "Get Proposal" button (WhatsApp CTA)
  - Owner info (if available)
- Filter by: zone, potential, roof type, owner status
```

---

## 5. Auto-Proposal Generator

כל חלקה/גג שמזוהה → הצעת מחיר אוטומטית:

### Input (per roof)
```json
{
  "roof_id": "Z1-0042",
  "address": "123/4 Moo 1, Thong Sala",
  "owner": "Santhiya Resort",
  "roof_area_m2": 450,
  "usable_area_m2": 315,
  "roof_type": "metal_trapezoidal",
  "roof_angle": 15,
  "orientation": "south",
  "shading_factor": 0.95,
  "aerial_photo_url": "https://..."
}
```

### Output
```
System: 57 kWp
Panels: 98 × LONGi Hi-MO X6 580W
Inverters: 4 × Huawei SUN2000-15KTL
Annual production: 77,000 kWh
Annual savings: ฿423,500

Option A (EPC): ฿1,852,500 — payback 4.4 years
Option B (PPA): ฿0 upfront, ฿4.50/kWh — save 25% immediately
Option C (EPC+Storage): ฿2,402,500 — payback 5.2 years
```

→ Auto-generates PDF proposal (Beamtech template)
→ Auto-generates WhatsApp message link
→ Auto-adds to CRM pipeline

---

## 6. תקציב

| פריט | עלות |
|------|------|
| DJI Mavic 3 Enterprise | ฿120,000 |
| 6 extra batteries | ฿36,000 |
| MicroSD cards (4×256GB) | ฿6,000 |
| Landing pad + accessories | ฿3,000 |
| Insurance (yearly) | ฿3,000 |
| CAAT registration | ฿1,000 |
| DroneDeploy (2 months) | ฿24,000 |
| SSD storage 4TB | ฿5,000 |
| Mac Mini processing time | ฿0 (existing) |
| **סה"כ ציוד** | **฿198,000 (~$5,500)** |
| | |
| Drone pilot (TM Dev crew, 6 weeks) | ฿60,000 |
| Data processing (G + cloud) | ฿15,000 |
| Map development | ฿0 (G builds) |
| **סה"כ תפעול** | **฿75,000 (~$2,100)** |
| | |
| **סה"כ פרויקט** | **฿273,000 (~$7,600)** |

### ROI of the Scan
```
עלות סריקה: ฿273,000
אם מהסריקה נסגרים 5 פרויקטים × ฿30,000 רווח = ฿150,000
+ 5 PPA × ฿5,000/חודש recurring = ฿25,000/חודש

ROI on scan: 1.8 חודשים
```

---

## 7. Output — מה נקבל

### 7.1 Orthomosaic Map
- תמונה אחידה של כל האי ברזולוציה 2-3 cm/pixel
- שכבת base layer למפה האינטראקטיבית
- **ערך:** אף חברת סולאר באי אין כזה — competitive moat

### 7.2 Digital Surface Model (DSM)
- מודל 3D של כל מבנה ועץ
- שיפוע גגות, גובה מבנים, הצללה
- קלט לניתוח סולארי מדויק

### 7.3 Roof Database
- כל גג מזוהה עם polygon, סיווג, שטח, כיוון
- ~2,500-3,000 גגות צפויים
- מדורג לפי פוטנציאל סולארי

### 7.4 Interactive Solar Map
- URL ציבורי: tmenergy.asia/map (לאחר רכישת domain)
- כל גג לחיץ → הצעה אוטומטית
- שכבות: אורתומוזאיקה, פוטנציאל סולארי, בעלים, סטטוס

### 7.5 Auto-Generated Proposals
- PDF לכל גג/חלקה (Beamtech template)
- 3 אופציות: EPC / PPA / EPC+Storage
- מוכנות לשליחה ב-WhatsApp

### 7.6 CRM Integration
- כל חלקה = ליד ב-CRM
- Pipeline מלא מ-scan → proposal → close
- ניתוח geo: איזה אזור הכי רווחי

---

## 8. Timeline

```
שבוע 0:     רכישת ציוד + רישום CAAT + אישורים
שבוע 1-2:   Phase 1 — סריקת Thong Sala + Ban Tai
שבוע 2-3:   עיבוד Phase 1 + בניית pipeline
שבוע 3-4:   Phase 2 — חופים + resorts
שבוע 4-5:   עיבוד Phase 2 + Roof Detection AI
שבוע 5-6:   Phase 3 — אזורים מרוחקים
שבוע 6-7:   עיבוד Phase 3 + Owner Identification
שבוע 7-8:   Phase 4 (אם DNP אישר) + Map Build
שבוע 8-9:   Auto-Proposal Generator + CRM Integration
שבוע 9-10:  QA + Launch Map + Start Outreach
```

**First proposals out: שבוע 3** (מ-Phase 1 data)

---

## 9. שימוש שיווקי

### "Solar Atlas of Koh Phangan"
- שם למותג: **KP Solar Atlas** / **מפת השמש של קו פנגן**
- כלי שיווקי חזק: "אנחנו מיפינו כל גג באי"
- Social proof: "2,847 גגות נסרקו, 18.5 MWp פוטנציאל"
- Landing page: "מצא את הגג שלך על המפה"

### Lead Generation
- בעל גג רואה את המבנה שלו על המפה → CTA "קבל הצעה חינם"
- WhatsApp: "ראינו שהגג שלך ב-Ban Tai מתאים ל-15kWp סולארי..."
- Facebook/Instagram ads עם תמונת רחפן של האזור

### PR & Authority
- "חברת הסולאר הראשונה שמיפתה אי שלם בתאילנד"
- Press release → Koh Phangan community groups
- YouTube: "We Scanned Every Roof on Koh Phangan" (viral potential)

---

## 10. Next Steps

- [ ] אישור תקציב ציוד (฿198K)
- [ ] בחירת רחפן (Mini 4 Pro לבאדג'ט / Mavic 3E למקצועי)
- [ ] רישום CAAT (אם >250g)
- [ ] אישור DNP לפארק לאומי
- [ ] גיוס טייס רחפן מצוות TM Dev
- [ ] הגדרת WebODM על Mac Mini
- [ ] בניית Auto-Proposal Generator (G)
- [ ] בניית Interactive Map framework (G)
- [ ] התחלת Phase 1 סריקה

---

*Prepared by G — TM Energy — March 2026*
