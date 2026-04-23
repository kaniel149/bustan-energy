import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Loader2, Copy, Check, Download, Mail, Package, Save, ExternalLink, Layers, Send } from 'lucide-react'
import { getSession } from '../../lib/admin-auth'
import { useAdminStore } from '../../lib/admin-store'

interface BOMRow {
  category: string
  sku: string
  qty: number
  unit_price_thb: number
  subtotal_thb: number
  note: string
}

interface BOMResponse {
  ok: boolean
  bom: {
    summary: {
      template: string
      template_name: string
      panels: number
      watt: number
      kwp: number
      strings: number
      ac_current_a: number
      battery_kwh: number
    }
    categories: Record<string, { items: BOMRow[]; subtotal: number }>
    totals: {
      materials_thb: number
      vat_7pct_thb: number
      total_with_vat_thb: number
    }
  }
  supplier_email_text: string
  markdown: string
  error?: string
}

const thb = (n: number) => '฿' + n.toLocaleString('en-US')

// Heuristic: map BOM category names to TM Energy supplier names
const CATEGORY_SUPPLIER: Record<string, string> = {
  'Solar Panels':  'Integra Renewable Energy',
  Panels:          'Integra Renewable Energy',
  Inverters:       'Huawei Authorized Distributor Thailand',
  Mounting:        'Antal Solar Mounting',
  Cables:          'Pro Cable Thailand',
  Battery:         'LUNA Energy Storage Thailand',
  Accessories:     'Solar Accessories Bangkok',
}

export default function BOMPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const showToast = useAdminStore((s) => s.showToast)

  const [panels, setPanels] = useState(parseInt(params.get('panels') || '157', 10))
  const [watt, setWatt] = useState(parseInt(params.get('watt') || '555', 10))
  const [template, setTemplate] = useState(params.get('template') || 'grid-tied-commercial-metal-roof')
  const [batteryKwh, setBatteryKwh] = useState(parseInt(params.get('battery_kwh') || '20', 10))
  const [acRunM, setAcRunM] = useState(parseInt(params.get('ac_run_m') || '15', 10))
  const [proposalRef, setProposalRef] = useState(params.get('ref') || '')
  const [clientName, setClientName] = useState(params.get('client_name') || '')
  const [clientSite, setClientSite] = useState(params.get('client_site') || 'Koh Phangan, Surat Thani 84280')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedOrderId, setSavedOrderId] = useState<string | null>(null)
  const [result, setResult] = useState<BOMResponse | null>(null)
  const [tab, setTab] = useState<'bom' | 'supplier' | 'markdown'>('bom')
  const [copied, setCopied] = useState('')
  const [leadId] = useState(params.get('lead_id') || '')
  const [groupBySupplier, setGroupBySupplier] = useState(false)
  const [sendingRfq, setSendingRfq] = useState(false)

  const run = async () => {
    setLoading(true)
    setResult(null)
    try {
      const session = await getSession()
      const token = session?.access_token
      if (!token) throw new Error('לא מחובר')

      const res = await fetch('/api/admin-bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          panels,
          watt,
          template,
          battery_kwh: template.includes('hybrid') ? batteryKwh : undefined,
          ac_run_m: acRunM,
          proposal_ref: proposalRef || undefined,
          client_name: clientName || undefined,
          client_site: clientSite || undefined,
        }),
      })

      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Calc failed')
      setResult(data)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'שגיאה', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.get('panels')) run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const download = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const saveBOM = async () => {
    if (!result) return
    setSaving(true)
    try {
      const session = await getSession()
      const token = session?.access_token
      if (!token) throw new Error('לא מחובר')

      const res = await fetch('/api/admin-procurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          proposal_ref: proposalRef || undefined,
          lead_id: leadId || undefined,
          bom_template: template,
          system_kwp: result.bom.summary.kwp,
          panels: result.bom.summary.panels,
          panel_watt: result.bom.summary.watt,
          battery_kwh: result.bom.summary.battery_kwh || 0,
          bom_json: result.bom,
          supplier_email_text: result.supplier_email_text,
          estimated_thb: result.bom.totals.total_with_vat_thb,
        }),
      })

      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'שמירה נכשלה')

      setSavedOrderId(data.order.id)
      const label = data.idempotent ? 'עודכן' : 'נוצר'
      showToast('✅ ' + label + ' · הזמנה #' + (data.order.po_number || data.order.id.slice(0, 8)), 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'שגיאה', 'error')
    } finally {
      setSaving(false)
    }
  }

  const sendEmailClient = () => {
    if (!result) return
    const subject = `Quotation Request — ${result.bom.summary.kwp} kWp PV System${proposalRef ? ` · ${proposalRef}` : ''}`
    const body = result.supplier_email_text
      .split('\n')
      .filter((l) => !l.startsWith('Subject:'))
      .join('\n')
      .trim()
    window.open(
      `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    )
  }

  const sendRfqServer = async () => {
    if (!savedOrderId) {
      showToast('שמור קודם את ה-BOM כהזמנת רכש', 'error')
      return
    }
    setSendingRfq(true)
    try {
      const session = await getSession()
      const token = session?.access_token
      if (!token) throw new Error('לא מחובר')
      const res = await fetch('/api/admin-procurement-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ order_id: savedOrderId }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'שליחה נכשלה')
      showToast('RFQ נשלח (' + data.sent + ' מייל)', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'שגיאה', 'error')
    } finally {
      setSendingRfq(false)
    }
  }

  const supplierGroups = result
    ? Object.entries(result.bom.categories).reduce<Record<string, { items: { cat: string; row: BOMRow }[]; subtotal: number }>>((acc, [cat, data]) => {
        const supplierName = CATEGORY_SUPPLIER[cat] || 'Other Suppliers'
        if (!acc[supplierName]) acc[supplierName] = { items: [], subtotal: 0 }
        for (const row of data.items) {
          acc[supplierName].items.push({ cat, row })
          acc[supplierName].subtotal += row.subtotal_thb
        }
        return acc
      }, {})
    : {}

  return (
    <div dir="rtl" className="p-3 sm:p-6 max-w-[1100px] mx-auto pb-24 sm:pb-16">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white"
            aria-label="חזור"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Package size={18} className="text-[#E8A820]" />
              BOM — רשימת ציוד + בקשה לספק
            </h1>
            <p className="text-sm text-white/40 mt-0.5">
              🔒 כלי פנימי — לא מוצג ללקוח. לשימוש אחרי חתימה על הצעה.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white/5 rounded-2xl border border-white/10 p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">Template</label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-base text-white min-h-[44px]"
              dir="ltr"
            >
              <option value="grid-tied-commercial-metal-roof">Grid-Tied Commercial (metal roof, PEA)</option>
              <option value="hybrid-commercial-with-battery">Hybrid + Battery (backup capable)</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">מספר פאנלים</label>
            <input
              type="number"
              value={panels}
              onChange={(e) => setPanels(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-base text-white min-h-[44px]"
              dir="ltr"
            />
          </div>
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">הספק פאנל (W)</label>
            <select
              value={watt}
              onChange={(e) => setWatt(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-base text-white min-h-[44px]"
              dir="ltr"
            >
              <option value="550">550W</option>
              <option value="555">555W</option>
              <option value="580">580W</option>
              <option value="600">600W</option>
              <option value="620">620W</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">AC run (m)</label>
            <input
              type="number"
              value={acRunM}
              onChange={(e) => setAcRunM(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-base text-white min-h-[44px]"
              dir="ltr"
            />
          </div>

          {template.includes('hybrid') && (
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">סוללה (kWh)</label>
              <input
                type="number"
                value={batteryKwh}
                onChange={(e) => setBatteryKwh(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-base text-white min-h-[44px]"
                dir="ltr"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">Ref הצעה</label>
            <input
              value={proposalRef}
              onChange={(e) => setProposalRef(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-base text-white min-h-[44px]"
              dir="ltr"
              placeholder="TM-2026-XXXX"
            />
          </div>
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">שם לקוח</label>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-base text-white min-h-[44px]"
            />
          </div>
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">אתר (Site)</label>
            <input
              value={clientSite}
              onChange={(e) => setClientSite(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-base text-white min-h-[44px]"
            />
          </div>
        </div>

        <button
          onClick={run}
          disabled={loading || !panels}
          className="mt-5 w-full py-3 rounded-xl bg-gradient-to-r from-[#E8A820] to-[#E85D3A] text-white font-semibold text-sm hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
          {loading ? 'מחשב...' : '🔧 חשב BOM'}
        </button>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <StatCard label="גודל" value={`${result.bom.summary.kwp} kWp`} />
            <StatCard label="פאנלים" value={`${result.bom.summary.panels}× ${result.bom.summary.watt}W`} />
            <StatCard label="Strings" value={`${result.bom.summary.strings}`} />
            <StatCard label="חומרים" value={thb(result.bom.totals.materials_thb)} highlight />
            <StatCard label='סה"כ עם VAT' value={thb(result.bom.totals.total_with_vat_thb)} highlight />
          </div>

          {!savedOrderId && (
            <div className="flex items-center justify-between gap-3 mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
              <div className="flex items-start gap-3">
                <Save size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-300">שמור BOM ל-CRM</p>
                  <p className="text-xs text-emerald-200/70 mt-0.5">
                    יצור הזמנת רכש במערכת — תוכל לעקוב אחריה עד להתקנה, ולראות היסטוריה מלאה.
                  </p>
                </div>
              </div>
              <button
                onClick={saveBOM}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-[#0D1117] font-semibold text-sm hover:bg-emerald-400 disabled:opacity-40 whitespace-nowrap"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? 'שומר...' : '💾 שמור הזמנת רכש'}
              </button>
            </div>
          )}

          {savedOrderId && (
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40">
              <div className="flex items-center gap-3">
                <Check size={18} className="text-emerald-300" />
                <div>
                  <p className="text-sm font-semibold text-emerald-200">
                    ✅ הזמנת רכש נשמרה · #{savedOrderId.slice(0, 8)}
                  </p>
                  <p className="text-xs text-emerald-200/70 mt-0.5">
                    CRM עודכן אוטומטית · תוכל לעקוב בעמוד "רכש"
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={sendRfqServer}
                  disabled={sendingRfq}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300 text-sm font-semibold hover:bg-blue-500/30 disabled:opacity-40"
                >
                  {sendingRfq ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {sendingRfq ? 'שולח...' : 'שלח RFQ לספקים'}
                </button>
                <button
                  onClick={() => navigate('/admin/procurement')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20"
                >
                  <ExternalLink size={14} />
                  לרשימת הזמנות
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex gap-2">
              {(['bom', 'supplier', 'markdown'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    tab === t ? 'bg-[#E8A820] text-[#0D2137]' : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {t === 'bom' ? 'טבלת BOM' : t === 'supplier' ? 'מייל לספק' : 'Markdown'}
                </button>
              ))}
            </div>

            {tab === 'bom' && (
              <button
                onClick={() => setGroupBySupplier((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  groupBySupplier
                    ? 'bg-[#E8A820]/15 border-[#E8A820]/40 text-[#E8A820]'
                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                }`}
              >
                <Layers size={13} />
                קבץ לפי ספק
              </button>
            )}
          </div>

          {tab === 'bom' && !groupBySupplier && (
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden overflow-x-auto">
              {Object.entries(result.bom.categories).map(([cat, data]) => (
                <div key={cat} className="border-b border-white/5 last:border-0">
                  <div className="px-5 py-3 bg-white/5 text-sm font-semibold text-[#E8A820]">{cat}</div>
                  <table className="w-full text-sm">
                    <thead className="text-[11px] text-white/40 uppercase">
                      <tr>
                        <th className="text-right px-5 py-2 font-normal">SKU</th>
                        <th className="text-center px-3 py-2 font-normal">Qty</th>
                        <th className="text-left px-3 py-2 font-normal">Unit</th>
                        <th className="text-left px-5 py-2 font-normal">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((r, i) => (
                        <tr key={i} className="border-t border-white/5">
                          <td className="px-5 py-2 text-white" dir="ltr">{r.sku}</td>
                          <td className="text-center px-3 py-2 text-white/80 font-mono">{r.qty}</td>
                          <td className="text-left px-3 py-2 text-white/60 font-mono" dir="ltr">{thb(r.unit_price_thb)}</td>
                          <td className="text-left px-5 py-2 text-white font-mono" dir="ltr">{thb(r.subtotal_thb)}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-white/10 bg-[#E8A820]/5">
                        <td colSpan={3} className="px-5 py-2 text-white/60 text-xs">Category subtotal</td>
                        <td className="text-left px-5 py-2 text-[#E8A820] font-mono font-semibold" dir="ltr">
                          {thb(Math.round(data.subtotal))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {tab === 'bom' && groupBySupplier && (
            <div className="space-y-4">
              {Object.entries(supplierGroups).map(([supplierName, group]) => (
                <div key={supplierName} className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 bg-white/5 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#E8A820]" />
                      <span className="text-sm font-semibold text-white">{supplierName}</span>
                      <span className="text-xs text-white/40">{group.items.length} items</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-[#E8A820]" dir="ltr">
                        {thb(Math.round(group.subtotal))}
                      </span>
                      {savedOrderId && (
                        <button
                          onClick={sendRfqServer}
                          disabled={sendingRfq}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-medium hover:bg-blue-500/25 disabled:opacity-40"
                        >
                          {sendingRfq ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                          שלח RFQ
                        </button>
                      )}
                    </div>
                  </div>
                  <table className="w-full text-sm overflow-x-auto">
                    <thead className="text-[11px] text-white/40 uppercase">
                      <tr>
                        <th className="text-right px-5 py-2 font-normal">קטגוריה</th>
                        <th className="text-right px-5 py-2 font-normal">SKU</th>
                        <th className="text-center px-3 py-2 font-normal">Qty</th>
                        <th className="text-left px-3 py-2 font-normal">Unit</th>
                        <th className="text-left px-5 py-2 font-normal">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map(({ cat, row }, i) => (
                        <tr key={i} className="border-t border-white/5">
                          <td className="px-5 py-2 text-white/50 text-xs">{cat}</td>
                          <td className="px-5 py-2 text-white" dir="ltr">{row.sku}</td>
                          <td className="text-center px-3 py-2 text-white/80 font-mono">{row.qty}</td>
                          <td className="text-left px-3 py-2 text-white/60 font-mono" dir="ltr">{thb(row.unit_price_thb)}</td>
                          <td className="text-left px-5 py-2 text-white font-mono" dir="ltr">{thb(row.subtotal_thb)}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-white/10 bg-[#E8A820]/5">
                        <td colSpan={4} className="px-5 py-2 text-white/60 text-xs">Supplier subtotal</td>
                        <td className="text-left px-5 py-2 text-[#E8A820] font-mono font-semibold" dir="ltr">
                          {thb(Math.round(group.subtotal))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {tab === 'supplier' && (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-white/40 uppercase tracking-wider">טקסט מוכן לשליחה לספק (אנגלית)</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(result.supplier_email_text, 'email')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/60 hover:text-white"
                  >
                    {copied === 'email' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    {copied === 'email' ? 'הועתק!' : 'העתק'}
                  </button>
                  <button
                    onClick={sendEmailClient}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-xs text-blue-300"
                  >
                    <Mail size={13} />
                    פתח במייל
                  </button>
                  <button
                    onClick={() => download(result.supplier_email_text, `supplier-request-${proposalRef || 'draft'}.txt`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/60"
                  >
                    <Download size={13} />
                  </button>
                </div>
              </div>
              <pre
                dir="ltr"
                className="text-xs text-white/80 font-mono whitespace-pre-wrap break-words bg-black/30 rounded-xl p-4 overflow-x-auto max-h-[600px] overflow-y-auto"
              >
                {result.supplier_email_text}
              </pre>
            </div>
          )}

          {tab === 'markdown' && (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-white/40 uppercase tracking-wider">Markdown (לתיקי פרויקט)</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(result.markdown, 'md')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/60"
                  >
                    {copied === 'md' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    {copied === 'md' ? 'הועתק!' : 'העתק'}
                  </button>
                  <button
                    onClick={() => download(result.markdown, `BOM-${proposalRef || 'draft'}.md`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/60"
                  >
                    <Download size={13} />
                  </button>
                </div>
              </div>
              <pre
                dir="ltr"
                className="text-xs text-white/80 font-mono whitespace-pre-wrap break-words bg-black/30 rounded-xl p-4 overflow-x-auto max-h-[600px] overflow-y-auto"
              >
                {result.markdown}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 border ${highlight ? 'bg-[#E8A820]/5 border-[#E8A820]/20' : 'bg-white/5 border-white/10'}`}>
      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? 'text-[#E8A820]' : 'text-white'}`} dir="ltr">{value}</p>
    </div>
  )
}
