/* TM Energy Tri-Lingual Engine v3
   Full-page translation: all text elements, auto lang-bar, no flash */
(function(){
  // --- Core dictionary (common terms across all files) ---
  const CORE = {
    'סה"כ':{en:'Total',th:'รวม'},
    'תקציב':{en:'Budget',th:'งบประมาณ'},
    'הערה':{en:'Note',th:'หมายเหตุ'},
    'הערות':{en:'Notes',th:'หมายเหตุ'},
    'שים לב':{en:'Note',th:'หมายเหตุ'},
    'פרמטר':{en:'Parameter',th:'พารามิเตอร์'},
    'פירוט':{en:'Details',th:'รายละเอียด'},
    'למה':{en:'Why',th:'ทำไม'},
    'מתאים ל-':{en:'Suitable for',th:'เหมาะสำหรับ'},
    'ערך':{en:'Value',th:'ค่า'},
    'יתרון':{en:'Advantage',th:'ข้อดี'},
    'חיסרון':{en:'Disadvantage',th:'ข้อเสีย'},
    'דרישה':{en:'Requirement',th:'ข้อกำหนด'},
    'שלב':{en:'Phase',th:'ขั้นตอน'},
    'זמן':{en:'Time',th:'เวลา'},
    'עלות':{en:'Cost',th:'ต้นทุน'},
    'רווח':{en:'Profit',th:'กำไร'},
    'ריבית':{en:'Interest',th:'ดอกเบี้ย'},
    'תקופה':{en:'Period',th:'ระยะเวลา'},
    'מימון':{en:'Financing',th:'การเงิน'},
    'מטרה':{en:'Goal',th:'เป้าหมาย'},
    'בטחונות':{en:'Collateral',th:'หลักประกัน'},
    'סטטוס':{en:'Status',th:'สถานะ'},
    'מדד':{en:'Metric',th:'ตัวชี้วัด'},
    'תכנון':{en:'Plan',th:'แผน'},
    'ביצוע':{en:'Actual',th:'จริง'},
    'חודש':{en:'Month',th:'เดือน'},
    'שנה':{en:'Year',th:'ปี'},
    'סגמנט':{en:'Segment',th:'กลุ่ม'},
    'כמות':{en:'Quantity',th:'จำนวน'},
    'גודל':{en:'Size',th:'ขนาด'},
    'מצגת':{en:'Presentation',th:'การนำเสนอ'},
    'מדריך':{en:'Guide',th:'คู่มือ'},
    'חוזה':{en:'Contract',th:'สัญญา'},
    'כלי':{en:'Tool',th:'เครื่องมือ'},
    'מימון':{en:'Financing',th:'การเงิน'},
    'מיתוג':{en:'Branding',th:'แบรนด์'},
    'מסמך':{en:'Document',th:'เอกสาร'},
    'הדפסה':{en:'Print',th:'พิมพ์'},
    'קטגוריה':{en:'Category',th:'หมวดหมู่'},
    'תוכן עניינים':{en:'Table of Contents',th:'สารบัญ'},
    'סיכום':{en:'Summary',th:'สรุป'},
    'נתון':{en:'Data',th:'ข้อมูล'},
    'הסבר':{en:'Explanation',th:'คำอธิบาย'},
    'צוות':{en:'Team',th:'ทีม'},
    'עובדים':{en:'Employees',th:'พนักงาน'},
    'לקוח':{en:'Client',th:'ลูกค้า'},
    'לקוחות':{en:'Clients',th:'ลูกค้า'},
    'ספק':{en:'Supplier',th:'ผู้จำหน่าย'},
    'ספק ראשי':{en:'Main Supplier',th:'ผู้จำหน่ายหลัก'},
    'רזורטים גדולים':{en:'Large Resorts',th:'รีสอร์ทขนาดใหญ่'},
    'רזורטים בינוניים':{en:'Medium Resorts',th:'รีสอร์ทขนาดกลาง'},
    'חזרה לנכסים':{en:'Back to Assets',th:'กลับไปที่สินทรัพย์'},
    'הדפס / PDF':{en:'Print / PDF',th:'พิมพ์ / PDF'},
    'חינם!':{en:'Free!',th:'ฟรี!'},
    'מומלץ':{en:'Recommended',th:'แนะนำ'},
    'קריטי':{en:'Critical',th:'สำคัญ'},
    'גבוה':{en:'High',th:'สูง'},
    'בינוני':{en:'Medium',th:'ปานกลาง'},
    'נמוך':{en:'Low',th:'ต่ำ'},
    'שנות אחריות':{en:'Warranty Years',th:'ปีรับประกัน'},
    'על פאנלים':{en:'On Panels',th:'บนแผงโซลาร์'},
    'כל השנה':{en:'All Year',th:'ตลอดปี'},
    'באי':{en:'On the Island',th:'บนเกาะ'},
    'כבר במערכת':{en:'Already in System',th:'อยู่ในระบบแล้ว'},
    'עב':{en:'HE',th:'HE'},
    'לידים מזוהים':{en:'Identified Leads',th:'ลีดที่ระบุแล้ว'},
  };

  let T = {}; // Merged dictionary
  let currentLang = 'he';
  const origMap = new Map();

  // --- Normalize text for matching ---
  function norm(s) {
    if (!s) return '';
    return s
      .replace(/<[^>]*>/g, '')
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '')
      .replace(/[📊📋💰🎯⚡🔧📦⚖️📡📋📊🏦📈🛸🛠️📜🎨💻📢📄👕⛑️💼🏷️🚧🧢☂️🔑🔋🏳️📎🎁✅❌⚠️✓🔴🟢📞✉️🌐📐🏗️🌳⚙️🔌💡📸📝🚨🔍💪🎓🗓️📑🚛🚗☀️🔄🏨🌿🏡🏢🏝️🏅📱⭐📉👷🌅📈🛰️🧾🏥🏫⛩️🍽️🛒🏠🛖🎉🔥🏆👥📒🧪🔬✨🌊💵🗺️⚾🫧🔶🟡]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // --- Find translation ---
  function findTrans(text) {
    const n = norm(text);
    if (!n || n.length < 2) return null;
    // Exact match
    if (T[n]) return T[n];
    // Try without trailing/leading punctuation
    const stripped = n.replace(/^[—\-:·•▸]+\s*/, '').replace(/\s*[—\-:·•]+$/, '').trim();
    if (stripped && T[stripped]) return T[stripped];
    // Substring match: if dict key is contained in text (for compound headers)
    for (const [key, val] of Object.entries(T)) {
      if (key.length > 3 && n === key) return val;
    }
    return null;
  }

  // --- Check if text has Hebrew ---
  function hasHebrew(s) {
    return /[\u0590-\u05FF]/.test(s);
  }

  // --- Selectors for translatable elements ---
  const SEL = [
    'h1','h2','h3','h4','h5','h6',
    'p','li','td','th','dt','dd',
    'label','button','summary','figcaption','caption','legend',
    '.subtitle','.stat-label','.stat-num','.tag','.cover-meta',
    '.card-icon + h3','.card p','.filter-label',
    'a[href]'
  ].join(',');

  // --- Translate individual text nodes within an element ---
  function translateTextNodes(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while (node = walker.nextNode()) {
      let text = node.textContent;
      if (!hasHebrew(text)) continue;
      // Try full node match first
      const trans = findTrans(text);
      if (trans) {
        const translated = currentLang === 'en' ? trans.en : trans.th;
        if (translated) { node.textContent = translated; continue; }
      }
      // Inline replacement: find Hebrew dictionary keys within the text
      let modified = text;
      if (!sortedHebrewKeys) buildSortedKeys();
      for (const [key, val] of sortedHebrewKeys) {
        if (!modified.includes(key)) continue;
        const translated = currentLang === 'en' ? val.en : val.th;
        if (translated) modified = modified.replace(key, translated);
        if (!hasHebrew(modified)) break;
      }
      if (modified !== text) node.textContent = modified;
    }
  }

  // --- Sorted keys cache for inline replacement ---
  let sortedHebrewKeys = null;
  function buildSortedKeys() {
    sortedHebrewKeys = Object.entries(T)
      .filter(([k]) => k.length > 2 && hasHebrew(k))
      .sort((a, b) => b[0].length - a[0].length);
  }

  // --- Translate all elements ---
  function translateAll() {
    document.querySelectorAll(SEL).forEach(el => {
      // Skip elements inside lang-bar or script
      if (el.closest('.lang-bar') || el.closest('.lang-indicator')) return;
      if (['SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName)) return;

      // Store original
      if (!origMap.has(el)) {
        origMap.set(el, el.innerHTML);
      }

      if (currentLang === 'he') {
        el.innerHTML = origMap.get(el);
        return;
      }

      const origHtml = origMap.get(el);
      const origText = el.textContent;

      // Skip if no Hebrew
      if (!hasHebrew(origText)) return;

      const trans = findTrans(origText);
      if (trans) {
        const translated = currentLang === 'en' ? trans.en : trans.th;
        if (translated) {
          // For headers, show Hebrew subtitle
          if (/^H[1-6]$/.test(el.tagName)) {
            const heText = norm(origText);
            el.innerHTML = `<span>${translated}</span><span style="display:block;font-size:0.45em;opacity:0.35;margin-top:2px;font-weight:400">${heText}</span>`;
          } else {
            el.textContent = translated;
          }
        }
      } else {
        // No full-element match — try translating individual text nodes
        // Handles mixed content: <strong>580W</strong> — Hebrew text, or "5-10/שנה"
        translateTextNodes(el);
      }
    });
  }

  // --- Set language ---
  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('tm-lang', lang);

    // Update buttons
    document.querySelectorAll('.lang-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.l === lang);
    });

    // Direction
    const rtl = lang === 'he';
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.body.style.direction = rtl ? 'rtl' : 'ltr';

    // Translate elements
    translateAll();

    // Update containers direction
    document.querySelectorAll('.slide,.container,.card,.grid,.grid-2,.grid-3,.grid-4').forEach(el => {
      el.style.direction = rtl ? 'rtl' : 'ltr';
    });

    // Table alignment
    document.querySelectorAll('th').forEach(th => {
      th.style.textAlign = rtl ? 'right' : 'left';
    });

    // Heading alignment
    document.querySelectorAll('h1,h2,h3,h4,h5,h6,.subtitle,p,li').forEach(el => {
      if (el.closest('.lang-bar')) return;
      el.style.direction = rtl ? 'rtl' : 'ltr';
      el.style.textAlign = rtl ? 'right' : 'left';
    });

    // Show indicator
    showIndicator(lang);

    // Dispatch event
    document.dispatchEvent(new CustomEvent('langchange', {detail:{lang}}));
  }

  // --- Language indicator ---
  function showIndicator(lang) {
    let ind = document.getElementById('tm-lang-indicator');
    if (!ind) {
      ind = document.createElement('div');
      ind.id = 'tm-lang-indicator';
      ind.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;pointer-events:none;transition:opacity .3s;font-family:sans-serif';
      document.body.appendChild(ind);
    }
    const labels = {he:'Hebrew',en:'English',th:'Thai'};
    const flags = {he:'🇮🇱',en:'🇬🇧',th:'🇹🇭'};
    const colors = {he:'rgba(0,56,184,.85)',en:'rgba(0,82,33,.85)',th:'rgba(164,30,30,.85)'};
    ind.textContent = labels[lang] + ' ' + flags[lang];
    ind.style.background = colors[lang];
    ind.style.color = 'white';
    ind.style.opacity = '1';
    clearTimeout(ind._t);
    ind._t = setTimeout(() => { ind.style.opacity = '0'; }, 2500);
  }

  // --- Auto-inject lang-bar if not present ---
  function injectLangBar() {
    if (document.querySelector('.lang-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'lang-bar';
    bar.innerHTML = `
      <button class="lang-btn active" onclick="setLang('he')" data-l="he">עב</button>
      <button class="lang-btn" onclick="setLang('en')" data-l="en">EN</button>
      <button class="lang-btn" onclick="setLang('th')" data-l="th">ไทย</button>`;
    document.body.appendChild(bar);
  }

  // --- Auto-inject CSS ---
  function injectCSS() {
    if (document.getElementById('tm-lang-css')) return;
    const style = document.createElement('style');
    style.id = 'tm-lang-css';
    style.textContent = `
      .lang-bar{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:9999;
        background:rgba(0,0,0,.5);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
        border-radius:24px;padding:3px;display:flex;gap:2px;border:1px solid rgba(255,255,255,.1)}
      .lang-btn{padding:5px 14px;border-radius:20px;border:none;background:transparent;
        color:rgba(255,255,255,.45);font-size:12px;font-weight:600;cursor:pointer;
        transition:all .2s;font-family:'Heebo',sans-serif;letter-spacing:.3px}
      .lang-btn:hover{color:rgba(255,255,255,.7)}
      .lang-btn.active{background:rgba(232,168,32,.25);color:#E8A820}
      @media(max-width:600px){.lang-bar{top:8px;padding:2px}.lang-btn{padding:4px 10px;font-size:11px}}
    `;
    document.head.appendChild(style);
  }

  // --- Merge translations ---
  function merge(obj) {
    for (const [key, val] of Object.entries(obj)) {
      T[norm(key) || key] = val;
    }
    sortedHebrewKeys = null; // reset cache
  }

  // --- Init ---
  function init() {
    // Merge core dictionary
    merge(CORE);

    // Merge per-file translations
    if (window.PAGE_TRANSLATIONS) merge(window.PAGE_TRANSLATIONS);

    // Inject UI
    injectCSS();
    injectLangBar();

    // Restore saved language (no delay — immediate)
    const saved = localStorage.getItem('tm-lang');
    if (saved && saved !== 'he') {
      setLang(saved);
    }
  }

  // Global
  window.setLang = setLang;
  window.tmLangMerge = merge;

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
