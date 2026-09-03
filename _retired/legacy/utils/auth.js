// Bustan Energy legacy access notice.
//
// This file used to contain client-side PINs and a logging webhook. Those values
// were public by design once this script was served, so the legacy gate is now
// disabled. Use the Supabase/Vercel-authenticated admin surfaces for internal
// documents instead of protecting sensitive pages with browser JavaScript.
(function () {
  window.tmAuth = {
    logout: function () {
      localStorage.removeItem('tm_auth')
      localStorage.removeItem('bustan_auth')
      location.reload()
    },
    getLog: function () {
      return []
    },
    who: function () {
      return null
    },
  }
})()
