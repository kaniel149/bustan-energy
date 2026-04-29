import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, Mail, MapPin, Clock, Send, Phone } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'
import { useLanguage } from '../i18n/useLanguage'
import { SEOHead } from '../components/seo/SEOHead'
import { breadcrumbSchema, pageBreadcrumb } from '../components/seo/schemas'
import { trackEvent } from '../lib/analytics'

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

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
      <label htmlFor={id} className="block text-white/60 text-sm mb-1.5">
        {label}{required && <span className="text-[var(--color-gold)] ml-1">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[var(--color-gold)]/50 focus:bg-white/8 transition-all duration-200"
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
      <label htmlFor={id} className="block text-white/60 text-sm mb-1.5">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--color-gold)]/50 transition-all duration-200 appearance-none cursor-pointer"
        style={{ colorScheme: 'dark' }}
      >
        <option value="" className="bg-[#0D1117] text-white/40">{placeholder ?? 'Select...'}</option>
        {options.map((o) => (
          <option key={o} value={o} className="bg-[#0D1117] text-white">{o}</option>
        ))}
      </select>
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

  function update(field: keyof FormState) {
    return (value: string) => setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    setSending(true)

    try {
      const res = await fetch('/api/contact-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'submit_failed')
      }
      trackEvent('contact_form_submit', {
        property_type: form.propertyType || undefined,
        system_interest: form.systemInterest || undefined,
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

  // Split hero title: everything up to the last word is plain, last word is gold
  const titleWords = hero.title.split(' ')
  const titleMain = titleWords.slice(0, -1).join(' ')
  const titleAccent = titleWords[titleWords.length - 1]

  // Void langPath to avoid unused-variable warning when not needed for anchor links
  void langPath

  return (
    <div className="min-h-screen bg-[var(--color-dark)]">
      <SEOHead
        title={t.seo.contact.title}
        description={t.seo.contact.description}
        path="/contact"
        lang={lang}
        schema={[breadcrumbSchema(pageBreadcrumb(lang, t.nav.contact, '/contact'))]}
      />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-navy)] via-[var(--color-dark)] to-[var(--color-dark)]" />
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(46,125,50,0.3), transparent)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase border border-[var(--color-gold)]/30 text-[var(--color-gold)] bg-[var(--color-gold)]/10">
                <Phone className="w-3.5 h-3.5" />
                {hero.tag}
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-[family-name:var(--font-serif)] text-5xl md:text-6xl lg:text-7xl text-white max-w-3xl mx-auto leading-tight"
            >
              {titleMain}{' '}
              <span className="text-[var(--color-gold)]">{titleAccent}</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-white/55 text-xl max-w-xl mx-auto leading-relaxed">
              {hero.subtitle}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Main content */}
      <section className="py-8 pb-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

            {/* Contact Form */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="lg:col-span-3"
            >
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                <h2 className="font-[family-name:var(--font-serif)] text-2xl text-white mb-6">
                  {form_.submit}
                </h2>

                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-16 h-16 rounded-full bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/30 flex items-center justify-center mx-auto mb-5">
                      <Send className="w-7 h-7 text-[var(--color-gold)]" />
                    </div>
                    <h3 className="text-white text-xl font-semibold mb-2">{form_.success.title}</h3>
                    <p className="text-white/50 text-sm max-w-sm mx-auto mb-6">
                      {form_.success.subtitle}
                    </p>
                    <button
                      onClick={() => { setForm(emptyForm); setSubmitted(false) }}
                      className="text-[var(--color-gold)] text-sm hover:underline"
                    >
                      {form_.success.again}
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {submitError && (
                      <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
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
                      <label htmlFor="contact-message" className="block text-white/60 text-sm mb-1.5">{form_.message}</label>
                      <textarea
                        id="contact-message"
                        value={form.message}
                        onChange={(e) => update('message')(e.target.value)}
                        placeholder={form_.messagePlaceholder}
                        rows={5}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[var(--color-gold)]/50 focus:bg-white/8 transition-all duration-200 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={sending || !form.name || !form.email}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[var(--color-gold)] text-[var(--color-dark)] font-semibold text-sm hover:bg-[var(--color-gold-light)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {sending ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-[var(--color-dark)]/30 border-t-[var(--color-dark)] rounded-full animate-spin" />
                          {form_.sending}
                        </span>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          {form_.submit}
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>

            {/* Contact info */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
              className="lg:col-span-2 space-y-4"
            >
              {/* WhatsApp */}
              <motion.a
                variants={fadeUp}
                href="https://wa.me/66946692011"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-4 bg-green-500/10 border border-green-500/25 rounded-2xl p-5 hover:border-green-500/50 transition-colors duration-300 group"
              >
                <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <div className="text-green-400 font-semibold text-sm mb-0.5">{info.whatsapp.label}</div>
                  <div className="text-white font-medium">{info.whatsapp.value}</div>
                  <div className="text-white/40 text-xs mt-0.5">{info.whatsapp.cta}</div>
                </div>
              </motion.a>

              {/* LINE */}
              <motion.a
                variants={fadeUp}
                href="https://line.me/ti/p/@tmenergy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-4 bg-green-500/10 border border-green-500/25 rounded-2xl p-5 hover:border-green-500/50 transition-colors duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                </div>
                <div>
                  <div className="text-green-400 font-semibold text-sm mb-0.5">{info.line.label}</div>
                  <div className="text-white font-medium">{info.line.value}</div>
                  <div className="text-white/40 text-xs mt-0.5">{info.line.cta}</div>
                </div>
              </motion.a>

              {/* Email */}
              <motion.a
                variants={fadeUp}
                href={`mailto:${info.email.value}`}
                className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/30 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-[var(--color-gold)]" />
                </div>
                <div>
                  <div className="text-[var(--color-gold)] font-semibold text-sm mb-0.5">{info.email.label}</div>
                  <div className="text-white font-medium">{info.email.value}</div>
                  <div className="text-white/40 text-xs mt-0.5">{info.email.cta}</div>
                </div>
              </motion.a>

              {/* Office */}
              <motion.div
                variants={fadeUp}
                className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-2xl p-5"
              >
                <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/15 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-white/50" />
                </div>
                <div>
                  <div className="text-white/50 font-semibold text-sm mb-0.5">{info.office.label}</div>
                  <div className="text-white font-medium">{info.office.value}</div>
                  <div className="text-white/40 text-xs mt-0.5">{info.office.sub}</div>
                </div>
              </motion.div>

              {/* Hours */}
              <motion.div
                variants={fadeUp}
                className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-2xl p-5"
              >
                <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/15 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-white/50" />
                </div>
                <div>
                  <div className="text-white/50 font-semibold text-sm mb-0.5">{info.hours.label}</div>
                  <div className="text-white font-medium">{info.hours.value}</div>
                  <div className="text-white/40 text-xs mt-0.5">{info.hours.sub}</div>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Map placeholder */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mt-10 rounded-2xl overflow-hidden bg-white/5 border border-white/10 h-64 flex items-center justify-center relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-navy)]/60 to-[var(--color-ocean)]/40" />
            <div className="relative text-center">
              <div className="text-4xl mb-3">📍</div>
              <p className="text-white font-semibold text-lg">{info.office.value}, Thailand</p>
              <p className="text-white/40 text-sm mt-1">{info.office.sub}</p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
