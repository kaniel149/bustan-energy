import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Handshake, Sun } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'
import { useLanguage } from '../i18n/useLanguage'
import { SEOHead } from '../components/seo/SEOHead'
import { organizationSchema, breadcrumbSchema, pageBreadcrumb } from '../components/seo/schemas'
import { SectionHeader } from '../components/ui/SectionHeader'
import { Button } from '../components/ui/Button'
import { fadeUp, stagger, heroStagger, revealViewport, Divider, IconTile, WHATSAPP_URL } from './services/shared'
import { INVESTOR_FACTS, VALIDATED_AT, hasPendingFacts, type FactKey } from '../data/investor-facts'
import { getAttribution } from '../lib/attribution'
import { getMetaClickIds, newEventId, trackEvent } from '../lib/analytics'

const FACT_ORDER: FactKey[] = ['peaTariff', 'ppaTariff', 'installedCostPerKwp', 'salePricePerKwp', 'yieldKwhPerKwp', 'sunHours', 'netBillingExport', 'taxDeduction', 'loanRate', 'loanTermYears']
const fmt = (v: number) => v.toLocaleString('en-US')

// Same field treatment as ContactPage (kept in sync by hand — not exported there).
const fieldClasses =
  'w-full rounded-xl border border-grove/20 bg-shell/70 px-4 py-3 text-sm text-ink placeholder:text-ink/40 outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-[var(--bustan-lagoon)]'

// Every number comes from src/data/investor-facts.ts; `pending` facts carry a badge
// until Kaniel closes VALIDATION.md §4.
function FactsGrid() {
  const { t } = useTranslation()
  const f = t.partners.facts
  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeader title={f.title} className="mb-6" />
        {hasPendingFacts() && (
          <div
            data-testid="facts-review-badge"
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold text-ink"
            title={f.badgeHint}
          >
            ⚠︎ {f.badge} · {f.validated} {VALIDATED_AT}
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FACT_ORDER.map((k) => {
            const x = INVESTOR_FACTS[k]
            return (
              <div key={k} title={x.note} className="rounded-card border border-grove/14 bg-shell/76 p-5 shadow-soft">
                <div className="text-xs uppercase tracking-widest text-ink/45 mb-1">{f.labels[k]}</div>
                <div className="font-serif text-3xl text-ink">
                  {fmt(x.value)} <span className="text-base text-ink/60">{x.unit}</span>
                </div>
                {x.pending && (
                  <span className="mt-2 inline-block rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-ink/80" title={x.note}>
                    {f.badge}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function DataRoomForm() {
  const { t } = useTranslation()
  const c = t.partners.form
  const [form, setForm] = useState({ name: '', email: '', company: '', role: 'investor', message: '', website: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const eventId = useRef(newEventId())
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setState('sending')
    try {
      const { fbc, fbp } = getMetaClickIds()
      const res = await fetch('/api/contact-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          propertyType: form.company,
          systemInterest: `data-room:${form.role}`,
          message: form.message,
          website: form.website,
          source: 'partners',
          ...getAttribution(),
          event_id: eventId.current,
          fbc: fbc || undefined,
          fbp: fbp || undefined,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'submit_failed')
      trackEvent('data_room_request', { role: form.role })
      setState('sent')
    } catch {
      setState('error')
    }
  }

  if (state === 'sent') return <p role="status" className="text-ink text-lg">{c.sent}</p>
  return (
    <form onSubmit={submit} className="space-y-4" aria-label={c.title}>
      <input className={fieldClasses} required placeholder={c.name} aria-label={c.name} value={form.name} onChange={set('name')} />
      <input className={fieldClasses} required type="email" placeholder={c.email} aria-label={c.email} value={form.email} onChange={set('email')} />
      <input className={fieldClasses} placeholder={c.company} aria-label={c.company} value={form.company} onChange={set('company')} />
      <select className={fieldClasses} aria-label={c.role} value={form.role} onChange={set('role')}>
        {Object.entries(c.roles).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <textarea className={fieldClasses} rows={4} placeholder={c.message} aria-label={c.message} value={form.message} onChange={set('message')} />
      {/* Honeypot — contact-lead drops submissions that fill it */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" value={form.website} onChange={set('website')} />
      <Button variant="primary" size="lg" type="submit" disabled={state === 'sending'}>{c.submit}</Button>
      {state === 'error' && <p role="alert" className="text-sm text-red-700">{c.error}</p>}
    </form>
  )
}

export default function PartnersPage() {
  const { t, lang } = useTranslation()
  const { langPath } = useLanguage()
  const p = t.partners
  return (
    <div className="min-h-screen bg-[var(--bustan-paper)] text-ink">
      <SEOHead
        title={t.seo.partners.title}
        description={t.seo.partners.description}
        path="/partners"
        lang={lang}
        schema={[organizationSchema(), breadcrumbSchema(pageBreadcrumb(lang, p.hero.tag, '/partners'))]}
      />

      <section className="relative overflow-hidden px-6 pt-32 pb-16">
        <motion.div variants={heroStagger} initial="hidden" animate="visible" className="relative max-w-4xl mx-auto text-center space-y-6">
          <motion.span variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-ocean/20 bg-shell/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-ocean">
            <Handshake size={14} aria-hidden />
            {p.hero.tag}
          </motion.span>
          <motion.h1 variants={fadeUp} className="font-serif text-display-md md:text-display-xl leading-[1.05] tracking-tight">
            {p.hero.title}
          </motion.h1>
          <motion.p variants={fadeUp} className="text-ink/74 text-lg leading-relaxed">{p.hero.subtitle}</motion.p>
        </motion.div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={revealViewport} variants={stagger} className="grid md:grid-cols-3 gap-6">
            {p.why.map((w) => (
              <motion.div key={w.title} variants={fadeUp} className="rounded-card border border-grove/14 bg-shell/76 p-6 shadow-soft">
                <IconTile className="mb-4"><Sun size={22} strokeWidth={1.5} aria-hidden /></IconTile>
                <h3 className="text-lg font-semibold mb-2">{w.title}</h3>
                <p className="text-ink/60 text-sm leading-relaxed">{w.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <Divider />
      <FactsGrid />
      <Divider />

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader title={p.deck.title} className="mb-6" />
          <iframe
            src="/bustan-financing-deck.html"
            title={p.deck.title}
            loading="lazy"
            className="w-full aspect-video rounded-card border border-grove/14 bg-black shadow-lift"
          />
          <a href="/bustan-financing-deck.html" target="_blank" rel="noopener" className="mt-3 inline-block text-sm text-ocean hover:underline">
            {p.deck.open} ↗
          </a>
        </div>
      </section>

      <section id="data-room" className="py-20">
        <div className="max-w-2xl mx-auto px-6">
          <SectionHeader title={p.form.title} subtitle={p.form.subtitle} className="mb-8" />
          <DataRoomForm />
          <p className="mt-6 text-xs text-ink/45">
            <a href={langPath('/about')} className="hover:underline">{t.nav.about}</a> · <a href={WHATSAPP_URL}>WhatsApp</a>
          </p>
        </div>
      </section>
    </div>
  )
}
