# Deal Engine — Roadmap (2026-06-11)

מטרה: להגיע לכל עסקה סולארית בתאילנד — כל גג מסחרי, שדות עד 9MW, ושטחי ענק לדאטה-סנטרים.
מצב נוכחי: Deal Engine v1 חי בפרודקשן (land scan + PV detection + find-contact + triage panel).

---

## 🔴 תיקונים (ידועים, נמצאו היום)

| # | מה | למה | מאמץ |
|---|---|---|---|
| F1 | **Gemini → paid tier** (לחבר billing לקי) | free tier = 20 req/min ⇒ זיהוי PV ל-378 גגות לוקח ~6ש׳ במקום דקות; find-contact נחנק באותו קי | 10 דק׳ ידני |
| F2 | **DBD_API_KEY** — להירשם ל-DBD Open API (רשם החברות התאילנדי) | בלעדיו find-contact מדלג על שלב הרשם — בדיוק החוליה שמביאה שם בעלים רשמי | 30 דק׳ ידני |
| F3 | מועמדים שנבדקו עם confidence 0.1-0.2 ("תמונה לא ברורה") נשארים מסומנים כ"נבדקו" | צריך re-check אוטומטי עם imagery חלופי (Mapbox sat — יש VITE_MAPBOX_TOKEN) | קטן |
| F4 | scan_requests ישנים נשארים ברשימה לנצח | auto-archive ל-done מעל 7 ימים | קטן |
| F5 | migrations 018-020 (פרויקט trvgpgpsqvvdsudpgwpm) עדיין לא הורצו | תלוי במשימה הקודמת (email drip / bill scanner) | 5 דק׳ |

## ⚡ Quick Wins (יום-יומיים)

| # | מה | ערך |
|---|---|---|
| Q1 | **Batch find-contact** — כפתור "מצא אנשי קשר לכל ה-A" + cron שמעשיר אוטומטית leads מאושרים (יש כבר POST endpoint) | מ-1/283 ל-100% כיסוי אנשי קשר |
| Q2 | **גודל מערכת מומלץ + הצעת מחיר אוטומטית** — לחבר את ה-proposal-builder הקיים ל-pipeline: lead מאושר → draft proposal ב-1 קליק (הכל כבר קיים, רק לחווט prefill מ-scan data) | מקצר scan→proposal לדקות |
| Q3 | **WhatsApp outreach מה-CRM** — כפתור "שלח הצעה ב-WA" עם template (GreenAPI כבר מחובר בפרויקט) | סוגר את הלולאה scan→contact→pitch |
| Q4 | **Dashboard funnel** — סריקות → מועמדים → מאושרים → עם איש קשר → הוצעו → נחתמו | רואים איפה הצוואר בקבוק |
| Q5 | **Dedup מול CRM קיים** — מועמד חדש שכבר קיים כ-lead ב-pipeline מסומן | מונע פניות כפולות |
| Q6 | קיבוץ סריקות ארציות: להריץ `queue-thailand-scans` על Chonburi-EEC + Rayong + Bangkok-metro (roof+land) | מילוי ה-pipeline בשבוע של נתונים |

## 🚀 שדרוגי ליבה (שבוע+)

| # | מה | פירוט |
|---|---|---|
| C1 | **כיסוי קרקעות אמיתי** — OSM landuse דליל בתאילנד (ראיונג החזירה רק 9 פוליגונים) | שכבת ESA WorldCover 10m (חינם) או Overture landcover: סריקה raster → פוליגונים של שטח פתוח ≥X ראי ליד כביש+רשת. זה המפתח לשדות 9MW+ |
| C2 | **ניקוד grid ארצי** — נתוני PEA יש רק לסוראט-תאני | לאסוף substations ארצי מ-OSM (power=substation) כ-baseline + מרחק קו מתח גבוה. Utility leads בלי קרבת רשת = חסרי ערך |
| C3 | **PV detection v2** — דיוק | אימות כפול (Esri+Mapbox), panel_coverage_pct כבר חוזר מה-API — להציג "גג מנוצל 40%" (הזדמנות הרחבה!), re-check תקופתי לגגות ישנים |
| C4 | **זיהוי שוכר/בעלים משופר** | Google Places API (יש GOOGLE_SOLAR_API_KEY בסביבה אחרת) לשם עסק מדויק + LinkedIn דרך Firecrawl לתפקידים |
| C5 | **ניקוד lead משוקלל** — score = גודל×תעריף×קרבת רשת×אין PV×איכות איש קשר | ממיין את כל ה-pipeline לפי ₪ צפוי, לא לפי kWp בלבד |
| C6 | **Drone pipeline integration** — לחבר את drone-tiles הקיימים כשכבת אימות ברזולוציה גבוהה לפאנגן/סמוי | אימות 5 ס"מ במקום 30 ס"מ לפני פגישה |

## 🔌 חיבוריות (אינטגרציות)

| # | חיבור | ערך |
|---|---|---|
| I1 | **Proposal Builder** (קיים!) — prefill מלא מ-scan: שטח, kWp, תמונת גג, ROI לפי תעריף PEA | scan→proposal אוטומטי |
| I2 | **GreenAPI/WhatsApp** (קיים בפרויקט) — רצף outreach: הצעה→follow-up×3 | מכירה אוטומטית |
| I3 | **Email drip** (נבנה אתמול!) — lead עם אימייל נכנס לרצף welcome | nurture אוטומטי |
| I4 | **PEA tariff calculator** — טבלת תעריפי PEA לפי סוג צרכן → savings אמיתי בהצעה | אמינות בפגישה |
| I5 | **Google Solar API** — קיים GCP project; לתאילנד יש כיסוי חלקי אבל נותן roof segments+shading איפה שיש | דיוק תכנון |
| I6 | **Telegram/WA התראות אליך** — "נמצא utility site חדש ≥10MW" / "lead ענה" (יש לך מספר 972502213948) | אפס פספוסים |
| I7 | **CRM sync** — scan_candidates מאושרים → crm_pipeline אוטומטית עם stage=new (חצי קיים) | מקור אמת אחד |

## 📈 אסטרטגי (חודש+)

- **S1 — Data-center play**: שכבת מיקוד EEC — שטחי ≥300 ראי בקרבת תשתית 115kV + סיב; דוח PDF "Top 20 DC-ready sites in Thailand" ככלי מכירה ל-hyperscalers/developers.
- **S2 — כיסוי 77 מחוזות**: להריץ סריקה ארצית מתוזמנת (cron שבועי tile-by-tile) — תוך חודש: מפת כל הגגות המסחריים ≥500מ"ר בתאילנד.
- **S3 — מוצר SaaS**: ה-Deal Engine עצמו = מוצר מכירה לחברות EPC אחרות (Solaris CRM כבר multi-tenant) — תאילנד היום, פנמה/ארגנטינה מחר.
- **S4 — DOL land registry**: בדיקת גישה לרשם המקרקעין התאילנדי (חלקות/בעלות) — game changer לאיתור בעלי קרקע.

## סדר מומלץ לביצוע

```
שבוע 1: F1+F2 (ידני, 40 דק׳) → Q1 (batch contacts) → Q6 (סריקות EEC) → Q2 (scan→proposal)
שבוע 2: C5 (scoring) → Q4 (funnel) → Q3+I2 (WA outreach) → F3+F4
שבוע 3: C1 (WorldCover land) → C2 (grid ארצי) → I4 (tariffs)
שבוע 4: S1 (דוח DC sites) → S2 (סריקה ארצית)
```
