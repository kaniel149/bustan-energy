import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, Search, SlidersHorizontal, Tags } from 'lucide-react'
import { SUPPLIER_PRICES, SUPPLIER_PRICE_CAPTURED_AT } from '../../data/supplier-prices'
import { BOM_TO_SUPPLIER_SKU, isSupplierPriceExpired, getSupplierPriceBySku } from '../../lib/supplier-pricing'

const thb = (n: number) => '฿' + n.toLocaleString('en-US')

export default function SuppliersPage() {
  const [query, setQuery] = useState('')
  const [supplier, setSupplier] = useState('all')
  const [status, setStatus] = useState<'all' | 'live' | 'expired'>('all')

  const suppliers = useMemo(
    () => Array.from(new Set(SUPPLIER_PRICES.map((price) => price.supplier))).sort(),
    [],
  )

  const stats = useMemo(() => {
    const expired = SUPPLIER_PRICES.filter((price) => isSupplierPriceExpired(price)).length
    return {
      total: SUPPLIER_PRICES.length,
      live: SUPPLIER_PRICES.length - expired,
      expired,
      mapped: Object.keys(BOM_TO_SUPPLIER_SKU).length,
      value: SUPPLIER_PRICES.reduce((sum, price) => sum + price.cost_thb, 0),
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SUPPLIER_PRICES.filter((price) => {
      const expired = isSupplierPriceExpired(price)
      if (supplier !== 'all' && price.supplier !== supplier) return false
      if (status === 'live' && expired) return false
      if (status === 'expired' && !expired) return false
      if (!q) return true
      return [
        price.supplier,
        price.source,
        price.category,
        price.sku,
        price.name,
        price.notes || '',
      ].join(' ').toLowerCase().includes(q)
    })
  }, [query, supplier, status])

  const mappings = useMemo(
    () => Object.entries(BOM_TO_SUPPLIER_SKU).map(([bomSku, match]) => ({
      bomSku,
      match,
      supplierPrice: getSupplierPriceBySku(match.sku),
    })),
    [],
  )

  return (
    <div dir="rtl" className="p-3 sm:p-6 max-w-[1200px] mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Tags size={18} className="text-emerald-300" />
          ספקים ומחירונים
        </h1>
        <p className="text-sm text-white/40 mt-1">
          מקור אמת פנימי למחירי ציוד, תוקף מחירון, ומיפוי BOM לספקים.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Stat label="פריטים" value={String(stats.total)} />
        <Stat label="Live" value={String(stats.live)} tone="emerald" />
        <Stat label="פג תוקף" value={String(stats.expired)} tone="amber" />
        <Stat label="מיפויי BOM" value={String(stats.mapped)} />
        <Stat label="שווי מחירון" value={thb(Math.round(stats.value))} highlight />
      </div>

      {stats.expired > 0 && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25">
          <AlertTriangle size={18} className="text-amber-300 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-200">יש מחירונים שדורשים רענון</p>
            <p className="text-xs text-amber-100/70 mt-0.5">
              מחירון QES תקף עד 2026-03-31 ולכן מסומן כפג תוקף. לפני PO יש לאשר מחיר מחדש מול הספק.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white/5 rounded-2xl border border-white/10 p-4 sm:p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_160px] gap-3">
          <label className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש לפי SKU, שם מוצר, ספק או קטגוריה"
              className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/25 min-h-[44px]"
            />
          </label>
          <select
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white min-h-[44px]"
          >
            <option value="all">כל הספקים</option>
            {suppliers.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'all' | 'live' | 'expired')}
            className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white min-h-[44px]"
          >
            <option value="all">כל הסטטוסים</option>
            <option value="live">Live בלבד</option>
            <option value="expired">פג תוקף</option>
          </select>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-white/35">
          <SlidersHorizontal size={13} />
          נלכד בתאריך {SUPPLIER_PRICE_CAPTURED_AT} · מוצגים {filtered.length} פריטים
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] text-white/40 uppercase bg-white/5">
              <tr>
                <th className="text-right px-4 py-3 font-normal">מוצר</th>
                <th className="text-right px-4 py-3 font-normal">ספק</th>
                <th className="text-right px-4 py-3 font-normal">קטגוריה</th>
                <th className="text-left px-4 py-3 font-normal">מחיר</th>
                <th className="text-center px-4 py-3 font-normal">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((price) => {
                const expired = isSupplierPriceExpired(price)
                return (
                  <tr key={`${price.supplier}-${price.sku}`} className="border-t border-white/5">
                    <td className="px-4 py-3">
                      <div className="text-white font-medium" dir="ltr">{price.sku}</div>
                      <div className="text-xs text-white/45 mt-0.5">{price.name}</div>
                      {price.url && (
                        <a href={price.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-300/80 hover:text-blue-200 mt-1">
                          <ExternalLink size={11} />
                          מקור
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/70">{price.supplier}</td>
                    <td className="px-4 py-3 text-white/50">{price.category}</td>
                    <td className="px-4 py-3 text-left text-white font-mono" dir="ltr">{thb(price.cost_thb)}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge expired={expired} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-3">מיפוי BOM → ספק</p>
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {mappings.map(({ bomSku, match, supplierPrice }) => (
                <div key={bomSku} className="rounded-xl border border-white/10 bg-black/15 p-3">
                  <div className="text-xs text-white font-mono" dir="ltr">{bomSku}</div>
                  <div className="mt-1 text-[11px] text-white/45 font-mono" dir="ltr">{match.sku}</div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-white/55">{supplierPrice?.supplier || 'Missing'}</span>
                    <span className="text-xs text-[#E8A820] font-mono" dir="ltr">
                      {supplierPrice ? thb(supplierPrice.cost_thb) : '—'}
                    </span>
                  </div>
                  {match.note && <p className="text-[11px] text-amber-200/65 mt-2">{match.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Stat({ label, value, highlight, tone }: { label: string; value: string; highlight?: boolean; tone?: 'emerald' | 'amber' }) {
  const color = tone === 'emerald' ? 'text-emerald-300' : tone === 'amber' ? 'text-amber-300' : highlight ? 'text-[#E8A820]' : 'text-white'
  return (
    <div className={`rounded-xl p-3 border ${highlight ? 'bg-[#E8A820]/5 border-[#E8A820]/20' : 'bg-white/5 border-white/10'}`}>
      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm font-semibold ${color}`} dir="ltr">{value}</p>
    </div>
  )
}

function StatusBadge({ expired }: { expired: boolean }) {
  return expired ? (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-amber-500/30 bg-amber-500/15 text-amber-300 text-[11px]">
      <AlertTriangle size={11} />
      Expired
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 text-[11px]">
      <CheckCircle2 size={11} />
      Live
    </span>
  )
}
