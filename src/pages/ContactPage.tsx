import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, Mail, MapPin, Clock, Send, Phone, ChevronDown } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'
import { useLanguage } from '../i18n/useLanguage'
import { SEOHead } from '../components/seo/SEOHead'
import { breadcrumbSchema, pageBreadcrumb } from '../components/seo/schemas'
import { trackEvent, trackLeadConversion, getMetaClickIds, newEventId } from '../lib/analytics'
import { getAttribution } from '../lib/attribution'
import { Button } from '../components/ui/Button'
import {
  fadeUp,
  stagger,
  revealViewport,
  cardHover,
  ServiceHero,
  IconTile,
  WHATSAPP_URL,
} from './services/shared'

interface FormState {
  name: string
  email: string
  phone: string
  propertyType: string
  systemInterest: string
  message: string
}

const emptyForm: FormState = {
  name: '',
  email: '',
  phone: '',
  propertyType: '',
  systemInterest: '',
  message: '',
}

const fieldClasses =
  'w-full rounded-xl border border-grove/20 bg-shell/70 px-4 py-3 text-sm text-ink placeholder:text-ink/40 outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-[var(--bustan-lagoon)]'

function InputField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
}: {
  id: string
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-ink/74 text-sm mb-1.5">
        {label}{required && <span className="text-ocean ml-1">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={fieldClasses}
      />
    </div>
  )
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  placeholder?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-ink/74 text-sm mb-1.5">{label}</label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${fieldClasses} appearance-none cursor-pointer pr-10 ${value ? 'text-ink' : 'text-ink/40'}`}
          style={{ colorScheme: 'light' }}
        >
          <option value="">{placeholder ?? 'Select...'}</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          aria-hidden
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink/45"
        />
      </div>
    </div>
  )
}

export default function ContactPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  const { t, lang } = useTranslation()
  const { langPath } = useLanguage()

  const [form, setForm] = useState<FormState>(emptyForm)
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Stable Meta dedup event id — generated once per page, reused across
  // retries so browser pixel + server CAPI always dedup correctly.
  const eventIdRef = useRef<string>(newEventId())

  function update(field: keyof FormState) {
    return (value: string) => setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    setSending(true)

    try {
      const attribution = getAttribution()
      const { fbc, fbp } = getMetaClickIds()

      const res = await fetch('/api/contact-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          ...attribution,
          event_id: eventIdRef.current,
          fbc: fbc || undefined,
          fbp: fbp || undefined,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'submit_failed')
      }
      trackEvent('contact_form_submit', {
        property_type: form.propertyType || undefined,
        system_interest: form.systemInterest || undefined,
      })
      // GA4 generate_lead + Google Ads Enhanced Conversion + Meta Pixel Lead
      // (each branch no-ops when its env var is missing; never throws)
      void trackLeadConversion({
        eventId: eventIdRef.current,
        email: form.email || null,
        phone: form.phone || null,
        firstName: form.name.trim().split(/\s+/)[0] || null,
        lastName: form.name.trim().split(/\s+/).slice(1).join(' ') || null,
      })
      setSending(false)
      setSubmitted(true)
    } catch {
      setSending(false)
      setSubmitError(lang === 'th'
        ? 'ส่งไม่ได้ในขณะนี้ กรุณาติดต่อทาง WhatsApp'
        : 'Could not send right now. Please contact us on WhatsApp.')
    }
  }

  const hero = t.contact.hero
  const form_ = t.contact.form
  const info = t.contact.info

  // Split hero title: everything up to the last word is plain, last word is accented
  const titleWords = hero.title.split(' ')
  const titleMain = titleWords.slice(0, -1).join(' ')
  const titleAccent = titleWords[titleWords.length - 1]

  // Void langPath to avoid unused-variable warning when not needed for anchor links
  void langPath

  return (
    <div className="min-h-screen bg-[var(--bustan-paper)] text-ink">
      <SEOHead
        title={t.seo.contact.title}
        description={t.seo.contact.description}
        path="/contact"
        lang={lang}
        schema={[breadcrumbSchema(pageBreadcrumb(lang, t.nav.contact, '/contact'))]}
      />

      {/* Hero */}
      <ServiceHero
        icon={<Phone size={14} strokeWidth={1.5} aria-hidden />}
        badge={hero.tag}
        title={titleMain}
        titleAccent={titleAccent}
        subtitle={hero.subtitle}
      />

      {/* Main content */}
      <section className="pb-32">
        <div className="max-w-7xl mx-auto px-6">

          {/* WhatsApp — primary contact path (moved above the form) */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-10">
            <div className="relative overflow-hidden rounded-card border border-[#25D366]/30 bg-shell/82 p-6 sm:p-8 shadow-soft">
              {/* Soft green glow */}
              <div
                aria-hidden
                className="absolute inset-0 rounded-card pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse 60% 90% at 8% 50%, rgba(37,211,102,0.10) 0%, transparent 70%)',
                }}
              />
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 text-[#16a34a]">
                    <MessageCircle size={22} strokeWidth={1.5} aria-hidden />
                  </div>
                  <div>
                    <div className="text-[#16a34a] font-semibold text-sm mb-0.5">{info.whatsapp.label}</div>
                    <div className="text-ink font-medium text-lg">{info.whatsapp.value}</div>
                    <div className="text-ink/60 text-sm mt-0.5">{info.whatsapp.cta}</div>
                  </div>
                </div>
                <Button
                  variant="whatsapp"
                  size="lg"
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto shrink-0"
                >
                  WhatsApp Us
                </Button>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

            {/* Contact Form */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={fadeUp}
              className="lg:col-span-3"
            >
              <div id="contact-form" className="rounded-card border border-grove/14 bg-shell/82 p-8 shadow-soft">
                <h2 className="font-serif text-2xl text-ink mb-6">
                  {form_.submit}
                </h2>

                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-16 h-16 rounded-full border border-ocean/20 bg-mist/72 flex items-center justify-center mx-auto mb-5">
                      <Send className="w-7 h-7 text-ocean" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-ink text-xl font-semibold mb-2">{form_.success.title}</h3>
                    <p className="text-ink/60 text-sm max-w-sm mx-auto mb-6">
                      {form_.success.subtitle}
                    </p>
                    <button
                      onClick={() => { setForm(emptyForm); setSubmitted(false) }}
                      className="text-ocean text-sm hover:underline cursor-pointer"
                    >
                      {form_.success.again}
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {submitError && (
                      <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {submitError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <InputField
                        id="contact-name"
                        label={form_.name}
                        value={form.name}
                        onChange={update('name')}
                        placeholder={form_.namePlaceholder}
                        required
                      />
                      <InputField
                        id="contact-email"
                        label={form_.email}
                        type="email"
                        value={form.email}
                        onChange={update('email')}
                        placeholder={form_.emailPlaceholder}
                        required
                      />
                    </div>

                    <InputField
                      id="contact-phone"
                      label={form_.phone}
                      type="tel"
                      value={form.phone}
                      onChange={update('phone')}
                      placeholder={form_.phonePlaceholder}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <SelectField
                        id="contact-property-type"
                        label={form_.propertyType.label}
                        value={form.propertyType}
                        onChange={update('propertyType')}
                        options={form_.propertyType.options}
                        placeholder={form_.propertyType.placeholder}
                      />
                      <SelectField
                        id="contact-system-interest"
                        label={form_.systemInterest.label}
                        value={form.systemInterest}
                        onChange={update('systemInterest')}
                        options={form_.systemInterest.options}
                        placeholder={form_.systemInterest.placeholder}
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-message" className="block text-ink/74 text-sm mb-1.5">{form_.message}</label>
                      <textarea
                        id="contact-message"
                        value={form.message}
                        onChange={(e) => update('message')(e.target.value)}
                        placeholder={form_.messagePlaceholder}
                        rows={5}
                        className={`${fieldClasses} resize-none`}
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      disabled={sending || !form.name || !form.email}
                      icon={sending ? null : <Send size={16} aria-hidden />}
                      className="w-full"
                    >
                      {sending ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-[var(--bustan-shell)]/40 border-t-[var(--bustan-shell)] rounded-full animate-spin" />
                          {form_.sending}
                        </span>
                      ) : (
                        form_.submit
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </motion.div>

            {/* Contact info */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
              className="lg:col-span-2 space-y-4"
            >
              {/* LINE */}
              <motion.div variants={fadeUp}>
                <a
                  href="https://line.me/R/ti/p/@bustanenergy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex min-h-11 items-start gap-4 rounded-card border border-grove/14 bg-shell/76 p-5 shadow-soft hover:border-ocean/30 ${cardHover}`}
                >
                  <IconTile>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                    </svg>
                  </IconTile>
                  <div>
                    <div className="text-ocean font-semibold text-sm mb-0.5">{info.line.label}</div>
                    <div className="text-ink font-medium">{info.line.value}</div>
                    <div className="text-ink/60 text-xs mt-0.5">{info.line.cta}</div>
                  </div>
                </a>
              </motion.div>

              {/* Contact form (this page) */}
              <motion.div variants={fadeUp}>
                <a
                  href="#contact-form"
                  className={`flex min-h-11 items-start gap-4 rounded-card border border-grove/14 bg-shell/76 p-5 shadow-soft hover:border-ocean/30 ${cardHover}`}
                >
                  <IconTile>
                    <Mail className="w-5 h-5" strokeWidth={1.5} aria-hidden />
                  </IconTile>
                  <div>
                    <div className="text-ocean font-semibold text-sm mb-0.5">{info.email.label}</div>
                    <div className="text-ink font-medium">{info.email.value}</div>
                    <div className="text-ink/60 text-xs mt-0.5">{info.email.cta}</div>
                  </div>
                </a>
              </motion.div>

              {/* Office */}
              <motion.div
                variants={fadeUp}
                className="flex min-h-11 items-start gap-4 rounded-card border border-grove/14 bg-shell/76 p-5 shadow-soft"
              >
                <IconTile>
                  <MapPin className="w-5 h-5" strokeWidth={1.5} aria-hidden />
                </IconTile>
                <div>
                  <div className="text-ocean font-semibold text-sm mb-0.5">{info.office.label}</div>
                  <div className="text-ink font-medium">{info.office.value}</div>
                  <div className="text-ink/60 text-xs mt-0.5">{info.office.sub}</div>
                </div>
              </motion.div>

              {/* Hours */}
              <motion.div
                variants={fadeUp}
                className="flex min-h-11 items-start gap-4 rounded-card border border-grove/14 bg-shell/76 p-5 shadow-soft"
              >
                <IconTile>
                  <Clock className="w-5 h-5" strokeWidth={1.5} aria-hidden />
                </IconTile>
                <div>
                  <div className="text-ocean font-semibold text-sm mb-0.5">{info.hours.label}</div>
                  <div className="text-ink font-medium">{info.hours.value}</div>
                  <div className="text-ink/60 text-xs mt-0.5">{info.hours.sub}</div>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Map placeholder */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={fadeUp}
            className="mt-10 rounded-card overflow-hidden border border-grove/14 bg-mist/35 h-64 flex items-center justify-center relative shadow-soft"
          >
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse 70% 80% at 50% 110%, rgba(0,111,107,0.10) 0%, transparent 70%)',
              }}
            />
            <div className="relative text-center">
              <div className="text-4xl mb-3">📍</div>
              <p className="text-ink font-semibold text-lg">{info.office.value}, Thailand</p>
              <p className="text-ink/60 text-sm mt-1">{info.office.sub}</p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
