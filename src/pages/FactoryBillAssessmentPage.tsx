import { useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock,
  Factory,
  FileText,
  Gauge,
  MessageCircle,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { SEOHead } from '../components/seo/SEOHead'
import { useLanguage } from '../i18n/useLanguage'

const whatsappBase = 'https://wa.me/66946692011'

const audience = [
  'Factories & manufacturing plants',
  'Warehouses & cold storage',
  'Resorts & large hotels',
  'Commercial & office buildings',
  'Industrial estates in EEC / Rayong / Chonburi',
  'Any site with a high monthly electricity bill',
]

const billOutput = [
  { title: 'Estimated solar size range', body: 'Indicative kWp band based on your bill and roof, before a full survey.', icon: Gauge },
  { title: 'Estimated annual production', body: 'Expected yearly generation for your location and orientation.', icon: TrendingUp },
  { title: 'Possible savings range', body: 'A realistic savings band on your current tariff — not a guarantee.', icon: Receipt },
  { title: 'PPA vs EPC recommendation', body: 'Which model fits your cash position, ownership goals and roof.', icon: BadgeCheck },
]

const promise = [
  'Initial review within 48 hours',
  'No obligation, no pushy sales',
  'Factories, resorts, warehouses & commercial sites',
  'Thai / English support',
]

const faqItems = [
  {
    q: 'What do you need from me to start?',
    a: 'A recent electricity bill (photo or PDF) and your location. Roof size, daytime usage pattern and any existing quote help us be more accurate, but are optional for the first estimate.',
  },
  {
    q: 'Is this really free?',
    a: 'Yes. The initial bill review and savings estimate are free and carry no obligation. A detailed proposal follows only if you want to move to a site survey.',
  },
  {
    q: 'EPC or PPA — which is better?',
    a: 'EPC (you own the system) usually gives the highest long-term return but needs CAPEX. A PPA needs no upfront capital — you pay a discounted rate for the solar power. We recommend the fit after seeing your bill.',
  },
  {
    q: 'How fast can a project move?',
    a: 'Typically: bill review in 48h, site survey within the first week, proposal in the second week, then engineering, PEA/MEA coordination and contract. Timelines depend on site and utility requirements.',
  },
  {
    q: 'Can you review a quote I already have?',
    a: 'Yes. Sending us your bill plus an existing EPC/PPA quote is one of the most valuable checks — we verify whether the sizing, assumptions and pricing match your real consumption.',
  },
]

type FormState = {
  company: string
  contact: string
  phone: string
  email: string
  location: string
  billRange: string
  roof: string
  interest: string
}

const initialForm: FormState = {
  company: '',
  contact: '',
  phone: '',
  email: '',
  location: '',
  billRange: '',
  roof: '',
  interest: '',
}

function buildWhatsappMessage(form: FormState) {
  const lines = [
    "Hi Bustan Energy, I'd like a Solar Savings Estimate from my electricity bill.",
    form.company && `Company: ${form.company}`,
    form.contact && `Contact: ${form.contact}`,
    form.phone && `Phone/Line: ${form.phone}`,
    form.email && `Email: ${form.email}`,
    form.location && `Location: ${form.location}`,
    form.billRange && `Monthly bill: ${form.billRange}`,
    form.roof && `Roof type/area: ${form.roof}`,
    form.interest && `Interest: ${form.interest}`,
    '(I will attach my electricity bill photo/PDF here.)',
  ].filter(Boolean)

  return `${whatsappBase}?text=${encodeURIComponent(lines.join('\n'))}`
}

function BillAuditForm() {
  const [form, setForm] = useState<FormState>(initialForm)
  const update = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))
  const whatsappUrl = buildWhatsappMessage(form)

  return (
    <div
      id="bill-audit"
      className="rounded-[2rem] border border-grove/15 bg-white/90 p-6 shadow-[0_24px_80px_rgba(36,70,62,0.12)] md:p-8"
    >
      <div className="mb-6 flex items-start gap-3">
        <div className="rounded-2xl bg-ocean/10 p-3 text-ocean">
          <Receipt size={24} strokeWidth={1.5} aria-hidden />
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-grove">
            Send your electricity bill
          </h2>
          <p className="mt-1 text-sm leading-6 text-ink/65">
            Fill the key details and send them to Bustan on WhatsApp. You can attach your
            latest bill (photo or PDF) directly in the chat after the first message.
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        <input
          className="rounded-2xl border border-grove/15 bg-white px-4 py-3 outline-none transition focus:border-ocean"
          placeholder="Company name"
          value={form.company}
          onChange={(e) => update('company', e.target.value)}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded-2xl border border-grove/15 bg-white px-4 py-3 outline-none transition focus:border-ocean"
            placeholder="Contact person"
            value={form.contact}
            onChange={(e) => update('contact', e.target.value)}
          />
          <input
            className="rounded-2xl border border-grove/15 bg-white px-4 py-3 outline-none transition focus:border-ocean"
            placeholder="Phone / Line / WhatsApp"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded-2xl border border-grove/15 bg-white px-4 py-3 outline-none transition focus:border-ocean"
            placeholder="Email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
          />
          <input
            className="rounded-2xl border border-grove/15 bg-white px-4 py-3 outline-none transition focus:border-ocean"
            placeholder="Location / province"
            value={form.location}
            onChange={(e) => update('location', e.target.value)}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <select
            className="rounded-2xl border border-grove/15 bg-white px-4 py-3 outline-none transition focus:border-ocean"
            value={form.billRange}
            onChange={(e) => update('billRange', e.target.value)}
          >
            <option value="">Monthly electricity bill</option>
            <option>Under ฿50,000</option>
            <option>฿50,000–฿150,000</option>
            <option>฿150,000–฿500,000</option>
            <option>฿500,000–฿2,000,000</option>
            <option>฿2,000,000+</option>
          </select>
          <select
            className="rounded-2xl border border-grove/15 bg-white px-4 py-3 outline-none transition focus:border-ocean"
            value={form.interest}
            onChange={(e) => update('interest', e.target.value)}
          >
            <option value="">Interest</option>
            <option>EPC (we own the system)</option>
            <option>PPA (no upfront CAPEX)</option>
            <option>Hybrid (solar + battery)</option>
            <option>Not sure yet</option>
          </select>
        </div>
        <input
          className="rounded-2xl border border-grove/15 bg-white px-4 py-3 outline-none transition focus:border-ocean"
          placeholder="Roof type / area (if known)"
          value={form.roof}
          onChange={(e) => update('roof', e.target.value)}
        />
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-ocean px-6 py-3 font-semibold text-shell shadow-lg shadow-ocean/20 transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          <MessageCircle size={18} strokeWidth={1.5} aria-hidden />
          Send bill via WhatsApp
          <ArrowRight size={18} strokeWidth={1.5} aria-hidden />
        </a>
        <p className="text-center text-xs text-ink/50">
          Prefer email? Send your bill to{' '}
          <a className="font-semibold text-ocean" href="mailto:hello@bustan-energy.com">
            hello@bustan-energy.com
          </a>
        </p>
      </div>
    </div>
  )
}

export default function FactoryBillAssessmentPage() {
  const { lang } = useLanguage()

  return (
    <main className="bustan-home overflow-hidden bg-[var(--bustan-paper)] text-ink">
      <SEOHead
        title="Factory Solar Savings Estimate Thailand — Upload Your Electricity Bill"
        description="Send your factory, resort or commercial electricity bill and get an initial solar savings estimate within 48 hours. Compare EPC vs PPA before a full site survey. Bustan Energy, Thailand."
        path="/factory-electricity-bill-solar-assessment"
        lang={lang}
        ogImage="https://bustan-energy.com/assets/images/strategy-01-aerial.png"
        schema={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'Factory Electricity Bill Solar Savings Estimate',
          provider: { '@type': 'LocalBusiness', name: 'Bustan Energy' },
          areaServed: ['Rayong', 'Chonburi', 'Bangkok', 'EEC', 'Thailand'],
          serviceType: 'Commercial & industrial solar savings assessment (PPA / EPC)',
        }}
      />

      {/* HERO */}
      <section className="relative isolate px-6 pb-20 pt-24 md:pb-28 md:pt-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_10%,rgba(242,184,75,0.28),transparent_30%),linear-gradient(140deg,var(--bustan-grove),#17362f_56%,#10241f)]" />
        <div
          className="absolute inset-0 -z-10 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,244,226,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,244,226,.3) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
          }}
        />
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.08fr_.92fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold">
              <Factory size={16} strokeWidth={1.5} aria-hidden />
              For factories, resorts & commercial sites in Thailand
            </div>
            <h1 className="max-w-4xl font-serif text-5xl leading-[0.95] tracking-[-0.055em] text-shell md:text-7xl lg:text-8xl">
              Send your factory electricity bill — get a solar savings estimate.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-shell/82 md:text-xl">
              We review your bill, estimate the right solar system size, compare EPC vs PPA,
              and show your next step — before you spend time on a full site survey.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <a
                href="#bill-audit"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gold px-7 py-4 font-semibold text-grove shadow-xl shadow-gold/20 transition hover:-translate-y-0.5"
              >
                Upload bill / send by WhatsApp
                <ArrowRight size={18} strokeWidth={1.5} aria-hidden />
              </a>
              <a
                href={whatsappBase}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-shell/30 bg-shell/10 px-7 py-4 font-semibold text-shell transition hover:bg-shell/16"
              >
                <MessageCircle size={18} strokeWidth={1.5} aria-hidden />
                Chat on WhatsApp
              </a>
            </div>
            <div className="mt-9 grid max-w-3xl gap-3 sm:grid-cols-2">
              {promise.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-2xl border border-shell/15 bg-shell/8 px-4 py-3 text-sm font-medium text-shell/82"
                >
                  <CheckCircle2 size={16} strokeWidth={2} className="shrink-0 text-gold" aria-hidden />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-shell/15 bg-shell/10 p-5 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="rounded-[1.5rem] bg-shell p-6 text-ink">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-ocean">
                <Clock size={14} strokeWidth={2} aria-hidden /> What you get in 48 hours
              </div>
              <div className="mt-4 grid gap-3">
                {billOutput.map(({ title, body, icon: Icon }) => (
                  <div key={title} className="flex items-start gap-3 rounded-2xl bg-[var(--bustan-paper)] px-4 py-3">
                    <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ocean/10 text-ocean">
                      <Icon size={18} strokeWidth={1.5} aria-hidden />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-grove">{title}</div>
                      <p className="mt-0.5 text-xs leading-5 text-ink/65">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHO THIS IS FOR */}
      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-ocean">Who this is for</div>
            <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight text-grove md:text-6xl">
              If your electricity bill is a major cost, solar probably helps.
            </h2>
          </div>
          <div className="rounded-[2rem] border border-grove/12 bg-white/80 p-8 shadow-lg shadow-grove/5">
            <div className="grid gap-3 sm:grid-cols-2">
              {audience.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl bg-[var(--bustan-paper)] px-4 py-3 text-sm font-semibold text-grove"
                >
                  <Building2 size={18} strokeWidth={1.5} className="shrink-0 text-ocean" aria-hidden />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CHOOSE YOUR MODEL */}
      <section className="bg-shell px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-ocean">Choose your model</div>
            <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight text-grove md:text-6xl">
              EPC, PPA or hybrid — we recommend the fit
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              ['EPC', 'You own the system', 'Highest long-term return. CAPEX required. Best when you have capital and want maximum savings.'],
              ['PPA', 'No upfront CAPEX', 'Bustan funds the system; you pay a discounted rate for the solar power. Best for preserving cash.'],
              ['Hybrid', 'Solar + battery', 'Add storage for peak shaving, backup and resilience against outages and voltage issues.'],
            ].map(([tag, title, body]) => (
              <div key={tag} className="rounded-[2rem] border border-grove/12 bg-white p-7">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-ocean/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-ocean">
                  {tag}
                </div>
                <h3 className="text-xl font-semibold tracking-tight text-grove">{title}</h3>
                <p className="mt-3 leading-7 text-ink/68">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-ocean">Fast feasibility</div>
            <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight text-grove md:text-6xl">From bill to proposal</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-4">
            {[
              ['Day 1', 'Send your bill', 'Share a recent bill, location and any existing quote.'],
              ['48 hours', 'Initial estimate', 'System size band, production, savings range, EPC/PPA fit.'],
              ['Week 1', 'Site survey', 'On-site roof, load and connection review.'],
              ['Week 2', 'Proposal', 'Then engineering, PEA/MEA coordination and contract.'],
            ].map(([num, title, body]) => (
              <div key={num} className="rounded-[2rem] border border-grove/12 bg-white p-7">
                <div className="mb-5 inline-flex items-center rounded-full bg-[var(--bustan-paper)] px-3 py-1 text-sm font-bold text-grove">
                  {num}
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-grove">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink/68">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OFFER + FORM */}
      <section className="bg-shell px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.95fr_1.05fr]">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-ocean">The offer</div>
            <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight text-grove md:text-6xl">
              A free, no-obligation solar savings estimate
            </h2>
            <p className="mt-5 text-lg leading-8 text-ink/70">
              Send your bill and a few details. Within 48 hours you get an indicative system
              size, expected production, a savings range and an EPC/PPA recommendation — before
              committing to anything.
            </p>
            <div className="mt-8 grid gap-3">
              {[
                'Reviewed by solar engineers, not a chatbot',
                'Works for factories, resorts, warehouses & commercial sites',
                'PEA / MEA coordination handled for you',
                'Tier-1 equipment options + O&M and monitoring',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-grove shadow-sm shadow-grove/5"
                >
                  <ShieldCheck size={18} strokeWidth={1.5} className="shrink-0 text-ocean" aria-hidden />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <BillAuditForm />
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-ocean">FAQ</div>
            <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight text-grove md:text-6xl">
              Questions before you send your bill
            </h2>
          </div>
          <div className="grid gap-3">
            {faqItems.map((item, index) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-grove/12 bg-white/90 p-5"
                open={index === 0}
              >
                <summary className="cursor-pointer list-none text-lg font-semibold text-grove">
                  {item.q}
                </summary>
                <p className="mt-3 leading-7 text-ink/68">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 pb-24 pt-8">
        <div className="mx-auto grid max-w-7xl items-center gap-8 rounded-[2.5rem] bg-[linear-gradient(135deg,var(--bustan-grove),#132d27)] p-8 text-shell md:grid-cols-[1.2fr_.8fr] md:p-12">
          <div>
            <h2 className="font-serif text-4xl leading-tight tracking-tight md:text-6xl">
              Find out what solar could save your site.
            </h2>
            <p className="mt-5 text-lg leading-8 text-shell/82">
              Send your electricity bill now — get an initial estimate within 48 hours, with no
              obligation.
            </p>
          </div>
          <a
            href="#bill-audit"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gold px-7 py-4 font-semibold text-grove shadow-xl shadow-black/10 transition hover:-translate-y-0.5"
          >
            <FileText size={18} strokeWidth={1.5} aria-hidden />
            Get my savings estimate
            <Zap size={16} strokeWidth={1.5} aria-hidden />
          </a>
        </div>
      </section>
    </main>
  )
}
