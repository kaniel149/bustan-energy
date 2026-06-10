import { useState } from 'react'
import {
  ArrowRight,
  BatteryCharging,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  MessageCircle,
  ShieldCheck,
  Sun,
  Waves,
  Zap,
} from 'lucide-react'
import { SEOHead } from '../components/seo/SEOHead'
import { useLanguage } from '../i18n/useLanguage'

const checklistUrl = '/assets/lead-magnets/bustan-resort-solar-battery-checklist.pdf'
const whatsappBase = 'https://wa.me/66946692011'

const benefits = [
  {
    title: 'Know if solar fits your real consumption',
    body: 'Avoid sizing a system around guesses instead of actual bills, daytime loads and operating patterns.',
    icon: Sun,
  },
  {
    title: 'Check whether batteries are worth it',
    body: 'Separate useful backup and resilience from expensive storage that may not pay back.',
    icon: BatteryCharging,
  },
  {
    title: 'Compare proposals with confidence',
    body: 'Ask better questions before accepting an EPC quote or commercial energy structure.',
    icon: ClipboardCheck,
  },
  {
    title: 'Reduce operational surprises',
    body: 'Account for guest experience, critical loads, tropical weather, salt air, monitoring and O&M.',
    icon: ShieldCheck,
  },
]

const assessmentIncludes = [
  'Electricity bill review',
  'Major load and usage-pattern review',
  'Solar fit and preliminary system direction',
  'Battery-fit guidance',
  'ROI and payback assumptions',
  'Site and operational risk checklist',
  'Questions to ask before accepting an EPC quote',
  'Next-step recommendation',
]

const faqItems = [
  {
    q: 'Do I need a full technical survey first?',
    a: 'Not for the first assessment. A final proposal requires a technical survey, but the first step can start with bills, property data and photos.',
  },
  {
    q: 'Is a battery always recommended?',
    a: 'No. Batteries can be valuable for outages and critical loads, but they are not always financially justified. We check fit before recommending them.',
  },
  {
    q: 'Can Bustan review a quote we already received?',
    a: 'Yes. That is one of the strongest uses of the assessment: checking whether the proposal matches your consumption, site, assumptions and risk profile.',
  },
  {
    q: 'Can you guarantee savings?',
    a: 'No responsible provider should guarantee savings without bill data and a site review. Preliminary savings depend on tariff, usage, roof/site conditions, equipment and utility requirements.',
  },
  {
    q: 'What about PEA, export or PPA/ESCO?',
    a: 'Grid connection, export and commercial structures depend on utility requirements and applicable compliance. We frame these as items to verify before final commitments.',
  },
]

type FormState = {
  name: string
  property: string
  contact: string
  email: string
  location: string
  propertyType: string
  billRange: string
  concern: string
}

const initialForm: FormState = {
  name: '',
  property: '',
  contact: '',
  email: '',
  location: '',
  propertyType: '',
  billRange: '',
  concern: '',
}

function buildWhatsappMessage(form: FormState) {
  const lines = [
    "Hi Bustan Energy, I'd like a Solar + Battery Assessment for my property.",
    form.name && `Name: ${form.name}`,
    form.property && `Property: ${form.property}`,
    form.contact && `Phone/WhatsApp: ${form.contact}`,
    form.email && `Email: ${form.email}`,
    form.location && `Location: ${form.location}`,
    form.propertyType && `Property type: ${form.propertyType}`,
    form.billRange && `Monthly bill: ${form.billRange}`,
    form.concern && `Main concern: ${form.concern}`,
  ].filter(Boolean)

  return `${whatsappBase}?text=${encodeURIComponent(lines.join('\n'))}`
}

function ResortAssessmentForm() {
  const [form, setForm] = useState<FormState>(initialForm)
  const update = (key: keyof FormState, value: string) => setForm((prev) => ({ ...prev, [key]: value }))
  const whatsappUrl = buildWhatsappMessage(form)

  return (
    <div className="rounded-[2rem] border border-[var(--bustan-grove)]/15 bg-white/90 p-6 shadow-[0_24px_80px_rgba(36,70,62,0.12)] md:p-8">
      <div className="mb-6 flex items-start gap-3">
        <div className="rounded-2xl bg-[var(--bustan-lagoon)]/10 p-3 text-[var(--bustan-lagoon)]">
          <MessageCircle size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--bustan-grove)]">
            Request your assessment
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--bustan-ink)]/65">
            Fill the key details and send them directly to Bustan on WhatsApp. You can attach your latest electricity bill after the first message.
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        <input className="rounded-2xl border border-[var(--bustan-grove)]/15 bg-white px-4 py-3 outline-none transition focus:border-[var(--bustan-lagoon)]" placeholder="Full name" value={form.name} onChange={(e) => update('name', e.target.value)} />
        <input className="rounded-2xl border border-[var(--bustan-grove)]/15 bg-white px-4 py-3 outline-none transition focus:border-[var(--bustan-lagoon)]" placeholder="Business / property name" value={form.property} onChange={(e) => update('property', e.target.value)} />
        <div className="grid gap-3 md:grid-cols-2">
          <input className="rounded-2xl border border-[var(--bustan-grove)]/15 bg-white px-4 py-3 outline-none transition focus:border-[var(--bustan-lagoon)]" placeholder="WhatsApp / phone" value={form.contact} onChange={(e) => update('contact', e.target.value)} />
          <input className="rounded-2xl border border-[var(--bustan-grove)]/15 bg-white px-4 py-3 outline-none transition focus:border-[var(--bustan-lagoon)]" placeholder="Email" value={form.email} onChange={(e) => update('email', e.target.value)} />
        </div>
        <input className="rounded-2xl border border-[var(--bustan-grove)]/15 bg-white px-4 py-3 outline-none transition focus:border-[var(--bustan-lagoon)]" placeholder="Property location" value={form.location} onChange={(e) => update('location', e.target.value)} />
        <div className="grid gap-3 md:grid-cols-2">
          <select className="rounded-2xl border border-[var(--bustan-grove)]/15 bg-white px-4 py-3 outline-none transition focus:border-[var(--bustan-lagoon)]" value={form.propertyType} onChange={(e) => update('propertyType', e.target.value)}>
            <option value="">Property type</option>
            <option>Resort</option>
            <option>Hotel</option>
            <option>Villa estate</option>
            <option>Retreat center</option>
            <option>Restaurant / beach club</option>
            <option>Other</option>
          </select>
          <select className="rounded-2xl border border-[var(--bustan-grove)]/15 bg-white px-4 py-3 outline-none transition focus:border-[var(--bustan-lagoon)]" value={form.billRange} onChange={(e) => update('billRange', e.target.value)}>
            <option value="">Average monthly electricity bill</option>
            <option>Under ฿50,000</option>
            <option>฿50,000–฿150,000</option>
            <option>฿150,000–฿500,000</option>
            <option>฿500,000+</option>
          </select>
        </div>
        <textarea className="min-h-28 rounded-2xl border border-[var(--bustan-grove)]/15 bg-white px-4 py-3 outline-none transition focus:border-[var(--bustan-lagoon)]" placeholder="What are you trying to solve? High bill, outages, battery decision, quote review, new build, ESG, O&M..." value={form.concern} onChange={(e) => update('concern', e.target.value)} />
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--bustan-lagoon)] px-6 py-3 font-semibold text-[var(--bustan-shell)] shadow-lg shadow-[var(--bustan-lagoon)]/20 transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          Send via WhatsApp
          <ArrowRight size={18} />
        </a>
      </div>
    </div>
  )
}

export default function ResortSolarAssessmentPage() {
  const { lang } = useLanguage()

  return (
    <main className="bustan-home overflow-hidden bg-[var(--bustan-paper)] text-[var(--bustan-ink)]">
      <SEOHead
        title="Solar + Battery Assessment for Thailand Resorts"
        description="Find out if solar + battery is worth it for your Thailand resort before investing. Bustan reviews bills, solar fit, battery fit, ROI assumptions and next steps."
        path="/resort-solar-assessment"
        lang={lang}
        ogImage="https://bustan-energy.com/assets/images/strategy-03-resort.png"
        schema={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'Solar + Battery Assessment for Resorts in Thailand',
          provider: { '@type': 'LocalBusiness', name: 'Bustan Energy' },
          areaServed: ['Koh Phangan', 'Koh Samui', 'Surat Thani', 'Thailand'],
          serviceType: 'Commercial solar and battery assessment',
        }}
      />

      <section className="relative isolate px-6 pb-20 pt-24 md:pb-28 md:pt-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_10%,rgba(242,184,75,0.28),transparent_30%),linear-gradient(140deg,var(--bustan-grove),#17362f_56%,#10241f)]" />
        <div className="absolute inset-0 -z-10 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,244,226,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,244,226,.3) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.08fr_.92fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--bustan-sun)]/40 bg-[var(--bustan-sun)]/10 px-4 py-2 text-sm font-semibold text-[var(--bustan-sun)]">
              <Waves size={16} />
              For resorts, villas and hospitality businesses in Thailand
            </div>
            <h1 className="max-w-4xl text-5xl leading-[0.95] tracking-[-0.055em] text-[var(--bustan-shell)] md:text-7xl lg:text-8xl" style={{ fontFamily: 'var(--font-serif)' }}>
              Know if solar + battery is worth it before you invest.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--bustan-shell)]/75 md:text-xl">
              Bustan Energy reviews your electricity bill, property profile, solar potential, battery needs, ROI assumptions and next steps — before you commit to an EPC quote or long-term energy contract.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <a href="#assessment" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--bustan-sun)] px-7 py-4 font-semibold text-[var(--bustan-grove)] shadow-xl shadow-[var(--bustan-sun)]/20 transition hover:-translate-y-0.5">
                Get a Solar Savings Check
                <ArrowRight size={18} />
              </a>
              <a href={checklistUrl} download className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--bustan-shell)]/30 bg-[var(--bustan-shell)]/10 px-7 py-4 font-semibold text-[var(--bustan-shell)] transition hover:bg-[var(--bustan-shell)]/16">
                Download the Resort Solar Checklist
                <Download size={18} />
              </a>
            </div>
            <div className="mt-9 grid max-w-3xl gap-3 sm:grid-cols-2">
              {['Assessment-first: no generic panel sizing', 'Solar, battery, backup, monitoring and O&M', 'Built for tropical coastal hospitality', 'Local-execution friendly planning'].map((item) => (
                <div key={item} className="rounded-2xl border border-[var(--bustan-shell)]/15 bg-[var(--bustan-shell)]/8 px-4 py-3 text-sm font-medium text-[var(--bustan-shell)]/82">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[var(--bustan-shell)]/15 bg-[var(--bustan-shell)]/10 p-5 shadow-2xl shadow-black/20 backdrop-blur">
            <img src="/assets/images/strategy-03-resort.png" alt="Thailand resort property with solar opportunity" className="h-72 w-full rounded-[1.5rem] object-cover md:h-96" />
            <div className="mt-5 rounded-[1.5rem] bg-[var(--bustan-shell)] p-6 text-[var(--bustan-ink)]">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--bustan-lagoon)]">What we clarify</div>
              <div className="mt-2 text-4xl font-semibold tracking-tight text-[var(--bustan-grove)]" style={{ fontFamily: 'var(--font-serif)' }}>Solar fit</div>
              <p className="mt-3 text-sm leading-6 text-[var(--bustan-ink)]/70">Bill impact, battery value, payback assumptions, project risks and the right next step.</p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                {['Bill review', 'Battery check', 'Quote review', 'O&M lens'].map((item) => (
                  <div key={item} className="rounded-2xl bg-[var(--bustan-paper)] px-4 py-3 font-semibold text-[var(--bustan-grove)]">{item}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--bustan-lagoon)]">The real problem</div>
            <h2 className="mt-4 text-4xl leading-tight tracking-tight text-[var(--bustan-grove)] md:text-6xl" style={{ fontFamily: 'var(--font-serif)' }}>
              Your electricity bill is not just another expense.
            </h2>
          </div>
          <div className="rounded-[2rem] border border-[var(--bustan-grove)]/12 bg-white/80 p-8 shadow-lg shadow-[var(--bustan-grove)]/5">
            <p className="text-lg leading-8 text-[var(--bustan-ink)]/75">
              Air-conditioning, kitchens, pools, laundry, pumps, refrigeration, lighting, Wi‑Fi and guest comfort can turn electricity into one of your largest operating costs. Solar can help. Batteries can help. But only when the project is designed around the way your property actually uses energy.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {['Seasonal usage spikes', 'Outages or voltage issues', 'Unclear battery payback', 'Quote risk before analysis'].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-[var(--bustan-paper)] px-4 py-3 text-sm font-semibold text-[var(--bustan-grove)]">
                  <CheckCircle2 size={18} className="text-[var(--bustan-lagoon)]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--bustan-shell)] px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2">
          <div className="rounded-[2rem] bg-[var(--bustan-grove)] p-8 text-[var(--bustan-shell)] md:p-10">
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--bustan-sun)]">Our philosophy</div>
            <h2 className="mt-4 text-4xl leading-tight tracking-tight md:text-6xl" style={{ fontFamily: 'var(--font-serif)' }}>Assess first. Install second.</h2>
            <p className="mt-5 text-lg leading-8 text-[var(--bustan-shell)]/75">The most expensive mistake is starting with equipment before understanding the business case.</p>
          </div>
          <div className="rounded-[2rem] border border-[var(--bustan-grove)]/12 bg-white p-8 md:p-10">
            <h3 className="text-2xl font-semibold tracking-tight text-[var(--bustan-grove)]">Bustan helps hospitality owners make smarter solar decisions.</h3>
            <p className="mt-4 leading-7 text-[var(--bustan-ink)]/70">We start with your bill, property, operating loads, business goals and local constraints — not with a panel count. Bustan supports transparent planning, local partner enablement, practical O&M and monitoring.</p>
          </div>
        </div>
      </section>

      <section id="assessment" className="px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.95fr_1.05fr]">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--bustan-lagoon)]">The offer</div>
            <h2 className="mt-4 text-4xl leading-tight tracking-tight text-[var(--bustan-grove)] md:text-6xl" style={{ fontFamily: 'var(--font-serif)' }}>
              Solar + Battery Assessment for hospitality businesses
            </h2>
            <p className="mt-5 text-lg leading-8 text-[var(--bustan-ink)]/70">A focused review that gives you a clearer view of solar fit, battery fit, savings potential, risk areas and recommended next steps.</p>
            <div className="mt-8 grid gap-3">
              {assessmentIncludes.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--bustan-grove)] shadow-sm shadow-[var(--bustan-grove)]/5">
                  <CheckCircle2 size={18} className="shrink-0 text-[var(--bustan-lagoon)]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <ResortAssessmentForm />
        </div>
      </section>

      <section className="bg-[var(--bustan-shell)] px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--bustan-lagoon)]">Simple path</div>
            <h2 className="mt-4 text-4xl leading-tight tracking-tight text-[var(--bustan-grove)] md:text-6xl" style={{ fontFamily: 'var(--font-serif)' }}>How it works</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              ['1', 'Send your bill and property details', 'Share a recent electricity bill, location, business type, major loads and any existing solar proposal.'],
              ['2', 'Get a focused solar + battery review', 'We review consumption, savings potential, battery need, assumptions, risks and practical project path.'],
              ['3', 'Move forward with clarity', 'Proceed, phase the project, request a survey, compare quotes, structure a commercial option — or pause.'],
            ].map(([num, title, body]) => (
              <div key={num} className="rounded-[2rem] border border-[var(--bustan-grove)]/12 bg-white p-7">
                <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--bustan-paper)] text-lg font-bold text-[var(--bustan-grove)]">{num}</div>
                <h3 className="text-xl font-semibold tracking-tight text-[var(--bustan-grove)]">{title}</h3>
                <p className="mt-3 leading-7 text-[var(--bustan-ink)]/68">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--bustan-lagoon)]">Benefits</div>
            <h2 className="mt-4 text-4xl leading-tight tracking-tight text-[var(--bustan-grove)] md:text-6xl" style={{ fontFamily: 'var(--font-serif)' }}>Better decisions before bigger commitments</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {benefits.map(({ title, body, icon: Icon }) => (
              <div key={title} className="rounded-[2rem] border border-[var(--bustan-grove)]/12 bg-white/85 p-6 shadow-sm shadow-[var(--bustan-grove)]/5">
                <div className="mb-5 inline-grid h-12 w-12 place-items-center rounded-2xl bg-[var(--bustan-lagoon)]/10 text-[var(--bustan-lagoon)]"><Icon size={22} /></div>
                <h3 className="text-lg font-semibold tracking-tight text-[var(--bustan-grove)]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--bustan-ink)]/68">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-8 rounded-[2.5rem] bg-[var(--bustan-grove)] p-8 text-[var(--bustan-shell)] md:grid-cols-[1.1fr_.9fr] md:p-12">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--bustan-sun)]/12 px-4 py-2 text-sm font-bold uppercase tracking-[0.14em] text-[var(--bustan-sun)]"><FileText size={16} /> Free checklist</div>
            <h2 className="text-4xl leading-tight tracking-tight md:text-6xl" style={{ fontFamily: 'var(--font-serif)' }}>7 Solar + Battery Mistakes Resorts in Thailand Should Avoid</h2>
            <p className="mt-5 text-lg leading-8 text-[var(--bustan-shell)]/75">Learn why a quote should not be the first step, when batteries can become an expensive mistake, and which hospitality loads change the ROI calculation.</p>
          </div>
          <a href={checklistUrl} download className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--bustan-sun)] px-7 py-4 font-semibold text-[var(--bustan-grove)] shadow-xl shadow-black/10 transition hover:-translate-y-0.5">
            Download the Checklist
            <Download size={18} />
          </a>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--bustan-lagoon)]">FAQ</div>
            <h2 className="mt-4 text-4xl leading-tight tracking-tight text-[var(--bustan-grove)] md:text-6xl" style={{ fontFamily: 'var(--font-serif)' }}>Questions buyers ask before moving forward</h2>
          </div>
          <div className="grid gap-3">
            {faqItems.map((item, index) => (
              <details key={item.q} className="group rounded-2xl border border-[var(--bustan-grove)]/12 bg-white/90 p-5" open={index === 0}>
                <summary className="cursor-pointer list-none text-lg font-semibold text-[var(--bustan-grove)]">{item.q}</summary>
                <p className="mt-3 leading-7 text-[var(--bustan-ink)]/68">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 pt-8">
        <div className="mx-auto grid max-w-7xl items-center gap-8 rounded-[2.5rem] bg-[linear-gradient(135deg,var(--bustan-grove),#132d27)] p-8 text-[var(--bustan-shell)] md:grid-cols-[1.2fr_.8fr] md:p-12">
          <div>
            <h2 className="text-4xl leading-tight tracking-tight md:text-6xl" style={{ fontFamily: 'var(--font-serif)' }}>Want to know if solar + battery is right for your property?</h2>
            <p className="mt-5 text-lg leading-8 text-[var(--bustan-shell)]/75">Send your bill and property details. Bustan Energy will help you understand the opportunity, risks and next step before you invest.</p>
          </div>
          <a href="#assessment" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--bustan-sun)] px-7 py-4 font-semibold text-[var(--bustan-grove)] shadow-xl shadow-black/10 transition hover:-translate-y-0.5">
            Get a Solar Savings Check
            <Zap size={18} />
          </a>
        </div>
      </section>
    </main>
  )
}
