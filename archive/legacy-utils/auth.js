// TM Energy — Access Control
// PINs: Kaniel=2626, Omer=3636, Yoni=4646
(function() {
  const USERS = {
    '2626': { name: 'Kaniel', he: 'קניאל' },
    '3636': { name: 'Omer', he: 'עומר' },
    '4646': { name: 'Yoni', he: 'יוני' }
  };
  const SESSION_DAYS = 7;
  // After deploying Apps Script, paste the URL here:
  const LOG_SHEET_URL = window.TM_LOG_URL || 'https://script.google.com/macros/s/AKfycbxNKTiczMYnecswhyG_DdZA2MUdrZnBeNAfi8wvKYgE9wmaQ3MrwY6M2Xx00dLzZEI2/exec';
  const WHATSAPP_NOTIFY = true;

  function getAuth() {
    try { return JSON.parse(localStorage.getItem('tm_auth')); } catch { return null; }
  }

  function isValid(auth) {
    if (!auth || !auth.pin || !auth.time) return false;
    if (!USERS[auth.pin]) return false;
    if (Date.now() - auth.time > SESSION_DAYS * 24 * 60 * 60 * 1000) return false;
    return true;
  }

  function logAccess(user, page) {
    const entry = {
      name: user.name,
      page: page,
      time: new Date().toISOString(),
      ua: navigator.userAgent.slice(0, 80)
    };
    // Save to local log
    const log = JSON.parse(localStorage.getItem('tm_access_log') || '[]');
    log.push(entry);
    if (log.length > 200) log.splice(0, log.length - 200);
    localStorage.setItem('tm_access_log', JSON.stringify(log));
    // Send to Google Sheet if configured
    if (LOG_SHEET_URL && !LOG_SHEET_URL.includes('PASTE_')) {
      fetch(LOG_SHEET_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      }).catch(() => {});
    }
  }

  function showGate() {
    document.body.style.overflow = 'hidden';
    const overlay = document.createElement('div');
    overlay.id = 'tm-auth-gate';
    overlay.innerHTML = `
      <style>
        #tm-auth-gate {
          position:fixed;inset:0;z-index:99999;
          background:linear-gradient(160deg,#0D2137,#0A0A0A 60%);
          display:flex;align-items:center;justify-content:center;
          font-family:'Heebo','DM Sans',sans-serif;
        }
        .gate-box {
          background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);
          border-radius:20px;padding:48px 40px;text-align:center;
          max-width:360px;width:90%;backdrop-filter:blur(20px);
        }
        .gate-logo { font-size:32px;font-weight:700;color:#E8A820;margin-bottom:8px; }
        .gate-sub { color:rgba(255,255,255,.4);font-size:13px;margin-bottom:32px; }
        .gate-input {
          width:100%;padding:16px;font-size:24px;text-align:center;letter-spacing:12px;
          background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);
          border-radius:12px;color:#fff;outline:none;font-family:monospace;
          -webkit-text-security:disc;
        }
        .gate-input:focus { border-color:#E8A820; }
        .gate-input::placeholder { letter-spacing:4px;font-size:14px;color:rgba(255,255,255,.2); }
        .gate-btn {
          width:100%;margin-top:16px;padding:14px;font-size:16px;font-weight:600;
          background:linear-gradient(135deg,#E8A820,#D4941A);color:#0A0A0A;
          border:none;border-radius:12px;cursor:pointer;transition:all .2s;
        }
        .gate-btn:hover { transform:translateY(-1px);box-shadow:0 4px 20px rgba(232,168,32,.3); }
        .gate-error { color:#FF6B6B;font-size:13px;margin-top:12px;min-height:20px; }
        .gate-welcome {
          animation:fadeIn .5s ease;color:#2ED89A;font-size:18px;font-weight:600;
          margin-top:12px;
        }
        @keyframes fadeIn { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
      </style>
      <div class="gate-box">
        <div class="gate-logo">TM Energy</div>
        <div class="gate-sub">Ko Phangan Solar Division</div>
        <input class="gate-input" id="gate-pin" type="password" inputmode="numeric"
               pattern="[0-9]*" maxlength="4" placeholder="PIN" autofocus>
        <button class="gate-btn" id="gate-submit">Enter</button>
        <div class="gate-error" id="gate-error"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const pinInput = document.getElementById('gate-pin');
    const errEl = document.getElementById('gate-error');

    function tryLogin() {
      const pin = pinInput.value.trim();
      if (!USERS[pin]) {
        errEl.textContent = 'PIN incorrect';
        pinInput.value = '';
        pinInput.focus();
        pinInput.style.borderColor = '#FF6B6B';
        setTimeout(() => { pinInput.style.borderColor = 'rgba(255,255,255,.15)'; }, 1500);
        return;
      }
      const user = USERS[pin];
      localStorage.setItem('tm_auth', JSON.stringify({ pin, time: Date.now() }));
      logAccess(user, document.title || location.pathname);
      // Welcome animation
      errEl.innerHTML = `<div class="gate-welcome">Welcome, ${user.he}</div>`;
      setTimeout(() => {
        overlay.style.transition = 'opacity .4s';
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.remove();
          document.body.style.overflow = '';
        }, 400);
      }, 800);
    }

    document.getElementById('gate-submit').addEventListener('click', tryLogin);
    pinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') tryLogin();
    });
    // Auto-submit on 4 digits
    pinInput.addEventListener('input', () => {
      if (pinInput.value.length === 4) setTimeout(tryLogin, 200);
    });
  }

  // --- Main ---
  const auth = getAuth();
  if (isValid(auth)) {
    // Valid session — log page view silently
    logAccess(USERS[auth.pin], document.title || location.pathname);
  } else {
    // No valid session — show login gate
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showGate);
    } else {
      showGate();
    }
  }

  // Expose for admin use
  window.tmAuth = {
    logout: () => { localStorage.removeItem('tm_auth'); location.reload(); },
    getLog: () => JSON.parse(localStorage.getItem('tm_access_log') || '[]'),
    who: () => { const a = getAuth(); return a && USERS[a.pin] ? USERS[a.pin].he : null; }
  };
})();
