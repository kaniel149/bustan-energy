import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Home,
  ArrowRight,
  CheckCircle2,
  Sun,
  Battery,
  Zap,
  TrendingDown,
  Shield,
} from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext'
import { SEOHead } from '../../components/seo/SEOHead'
import { breadcrumbSchema, serviceSchema } from '../../components/seo/schemas'

const BASE_URL = 'https://energy-tm.com'

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

const systemSizes = [
  {
    size: '3 kW',
    panels: '7 panels',
    best: 'Small homes & apartments',
    covers: 'Basic daytime load — lights, fans, fridge',
    icon: Home,
  },
  {
    size: '5 kW',
    panels: '11 panels',
    best: 'Medium homes & villas',
    covers: 'Full daytime load including A/C units',
    icon: Sun,
  },
  {
    size: '10 kW',
    panels: '22 panels',
    best: 'Large villas & multi-unit homes',
    covers: 'Heavy consumption — pool pump, multiple A/C, EV charger',
    icon: Zap,
  },
]

const benefits = [
  {
    icon: TrendingDown,
    title: 'Lower Electricity Bills',
    text: 'Solar panels dramatically reduce your monthly electricity costs. Most homeowners on Ko Phangan see significant savings from the very first month after installation.',
  },
  {
    icon: Battery,
    title: 'Battery Backup for Outages',
    text: 'Ko Phangan experiences periodic power outages. With a Huawei LUNA2000 battery system, your home stays powered through blackouts — keeping lights, fridges, and internet running.',
  },
  {
    icon: Shield,
    title: '25-Year Equipment Warranty',
    text: 'Every installation comes with a comprehensive manufacturer warranty on panels and inverters. Our LONGi panels are guaranteed to produce at least 84.8% of rated output after 25 years.',
  },
  {
    icon: Sun,
    title: 'Increase Property Value',
    text: 'Homes with solar systems consistently command higher resale and rental prices. For island properties catering to long-term renters and Airbnb guests, solar is a clear differentiator.',
  },
]

const included = [
  'LONGi Hi-MO 6 monocrystalline panels (440W, Tier-1)',
  'Huawei SUN2000 string inverter with built-in monitoring',
  'Professional roof mounting hardware rated for tropical storms',
  'Full DC and AC wiring with surge protection',
  'PEA (Provincial Electricity Authority) application and grid connection',
  'Net metering setup so you earn credit for excess power',
  'Real-time monitoring via Huawei FusionSolar app',
  'Post-installation system commissioning and handover',
]

const processSteps = [
  {
    step: '01',
    title: 'Free Site Assessment',
    text: 'We visit your property, assess roof condition, orientation, and shading. We review your electricity bills to size the system accurately.',
  },
  {
    step: '02',
    title: 'Custom Design & Proposal',
    text: 'Our engineers design a system optimized for your roof and consumption. You receive a detailed proposal with layout, specs, and projected savings.',
  },
  {
    step: '03',
    title: 'Installation',
    text: 'Our certified team installs your system in 1-3 days. We handle all wiring, inverter setup, and PEA paperwork for grid connection.',
  },
  {
    step: '04',
    title: 'Monitor & Save',
    text: 'Your system goes live immediately. Track your production, consumption, and savings in real-time through the FusionSolar mobile app.',
  },
]

export default function ResidentialSolarPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const { langPath } = useLanguage()
  const lang = 'en'

  const breadcrumbs = [
    { name: 'Home', url: BASE_URL },
    { name: 'Services', url: `${BASE_URL}/services` },
    { name: 'Residential Solar', url: `${BASE_URL}/services/residential` },
  ]

  return (
    <>
      <SEOHead
        title="Residential Solar Installation Ko Phangan | Home Solar Panels"
        description="Install solar panels on your Ko Phangan home. 3kW to 10kW rooftop systems with battery backup. Reduce electricity bills with LONGi panels and Huawei inverters. Free site assessment."
        path="/services/residential"
        lang={lang}
        schema={[
          serviceSchema(lang),
          breadcrumbSchema(breadcrumbs),
        ]}
      />

      <div className="min-h-screen bg-[var(--color-dark)]">
        {/* Hero */}
        <section className="relative pt-32 pb-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-navy)] via-[var(--color-dark)] to-[var(--color-dark)]" />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(232,168,32,0.3), transparent)',
            }}
          />

          <div className="relative max-w-7xl mx-auto px-6 text-center">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
              <motion.div variants={fadeUp}>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase border border-[var(--color-gold)]/30 text-[var(--color-gold)] bg-[var(--color-gold)]/10">
                  <Home className="w-3.5 h-3.5" />
                  Residential Solar
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="font-[family-name:var(--font-serif)] text-5xl md:text-6xl lg:text-7xl text-white max-w-4xl mx-auto leading-tight"
              >
                Residential Solar for{' '}
                <span className="text-[var(--color-gold)]">Ko Phangan Homes</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-white/55 text-xl max-w-2xl mx-auto leading-relaxed">
                Power your home with clean, reliable solar energy. Reduce your electricity bills and gain energy independence with a system designed specifically for island living.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                <Link
                  to={langPath('/contact')}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--color-gold)] text-[var(--color-dark)] font-semibold hover:bg-[var(--color-gold-light)] transition-colors duration-200"
                >
                  Get Free Home Assessment
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to={langPath('/pricing')}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-colors duration-200"
                >
                  View Pricing
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
              className="text-center mb-16"
            >
              <motion.h2
                variants={fadeUp}
                className="font-[family-name:var(--font-serif)] text-4xl md:text-5xl text-white mb-4"
              >
                Why Go Solar at Home?
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/50 text-lg max-w-2xl mx-auto">
                Ko Phangan homeowners are making the switch to solar for good reasons. Here is what a residential solar system delivers for your household.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {benefits.map((item) => (
                <motion.div
                  key={item.title}
                  variants={fadeUp}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-colors duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 flex items-center justify-center mb-5">
                    <item.icon className="w-6 h-6 text-[var(--color-gold)]" />
                  </div>
                  <h3 className="font-[family-name:var(--font-serif)] text-xl text-white mb-3">{item.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{item.text}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* System Sizes */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
              className="text-center mb-16"
            >
              <motion.h2
                variants={fadeUp}
                className="font-[family-name:var(--font-serif)] text-4xl md:text-5xl text-white mb-4"
              >
                Choose the Right System Size
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/50 text-lg max-w-2xl mx-auto">
                We design every system based on your actual electricity consumption. Here are our most popular residential configurations for Ko Phangan homes.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {systemSizes.map((sys) => (
                <motion.div
                  key={sys.size}
                  variants={fadeUp}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-[var(--color-gold)]/30 transition-colors duration-300 text-center"
                >
                  <div className="w-14 h-14 rounded-xl bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 flex items-center justify-center mx-auto mb-5">
                    <sys.icon className="w-7 h-7 text-[var(--color-gold)]" />
                  </div>
                  <h3 className="font-[family-name:var(--font-serif)] text-3xl text-white mb-1">{sys.size}</h3>
                  <p className="text-[var(--color-gold)] text-sm font-semibold mb-4">{sys.panels}</p>
                  <p className="text-white/70 text-sm font-medium mb-2">{sys.best}</p>
                  <p className="text-white/40 text-xs leading-relaxed">{sys.covers}</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="text-center text-white/30 text-sm mt-8"
            >
              Not sure which size? Our engineers will recommend the optimal system during your free site assessment. <Link to={langPath('/pricing')} className="text-[var(--color-gold)] hover:underline">View full pricing</Link>.
            </motion.p>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* What's Included */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
            >
              <motion.h2
                variants={fadeUp}
                className="font-[family-name:var(--font-serif)] text-4xl md:text-5xl text-white mb-4 text-center"
              >
                What's Included in Every Installation
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/50 text-lg max-w-2xl mx-auto text-center mb-12">
                Every residential solar installation from TM Energy is a complete, turnkey solution. No hidden costs, no surprises.
              </motion.p>

              <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {included.map((item) => (
                  <motion.div key={item} variants={fadeUp} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[var(--color-gold)] mt-0.5 flex-shrink-0" />
                    <span className="text-white/70 text-base">{item}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Process */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
              className="text-center mb-16"
            >
              <motion.h2
                variants={fadeUp}
                className="font-[family-name:var(--font-serif)] text-4xl md:text-5xl text-white mb-4"
              >
                Our Installation Process
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/50 text-lg max-w-2xl mx-auto">
                Going solar is straightforward with TM Energy. We handle everything from assessment through to commissioning. <Link to={langPath('/how-it-works')} className="text-[var(--color-gold)] hover:underline">Learn more about how it works</Link>.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {processSteps.map((s) => (
                <motion.div
                  key={s.step}
                  variants={fadeUp}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors duration-300"
                >
                  <span className="text-[var(--color-gold)] font-bold text-xs tracking-widest uppercase">Step {s.step}</span>
                  <h3 className="font-[family-name:var(--font-serif)] text-lg text-white mt-2 mb-3">{s.title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{s.text}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Related Services */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-7xl mx-auto px-6 mb-6">
              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
              className="text-center mb-12"
            >
              <motion.h2
                variants={fadeUp}
                className="font-[family-name:var(--font-serif)] text-3xl md:text-4xl text-white mb-4"
              >
                Explore Related Services
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/50 text-lg max-w-2xl mx-auto">
                Pair your residential system with battery backup, or explore our full <Link to={langPath('/services')} className="text-[var(--color-gold)] hover:underline">range of solar services</Link>.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <motion.div variants={fadeUp}>
                <Link
                  to={langPath('/services/off-grid')}
                  className="block bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-[var(--color-gold)]/30 hover:-translate-y-1 transition-all duration-300 h-full"
                >
                  <Battery className="w-6 h-6 text-[var(--color-gold)] mb-4" />
                  <h3 className="font-[family-name:var(--font-serif)] text-lg text-white mb-2">Off-Grid & Battery</h3>
                  <p className="text-white/45 text-sm leading-relaxed mb-4">Add battery storage for blackout protection and energy independence.</p>
                  <span className="inline-flex items-center gap-1.5 text-[var(--color-gold)] text-sm font-medium">
                    Learn more <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </motion.div>
              <motion.div variants={fadeUp}>
                <Link
                  to={langPath('/services/commercial')}
                  className="block bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-[var(--color-gold)]/30 hover:-translate-y-1 transition-all duration-300 h-full"
                >
                  <Zap className="w-6 h-6 text-[var(--color-gold)] mb-4" />
                  <h3 className="font-[family-name:var(--font-serif)] text-lg text-white mb-2">Commercial Solar</h3>
                  <p className="text-white/45 text-sm leading-relaxed mb-4">Own a business? See our commercial solar solutions with PPA financing.</p>
                  <span className="inline-flex items-center gap-1.5 text-[var(--color-gold)] text-sm font-medium">
                    Learn more <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </motion.div>
              <motion.div variants={fadeUp}>
                <Link
                  to={langPath('/services/maintenance')}
                  className="block bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-[var(--color-gold)]/30 hover:-translate-y-1 transition-all duration-300 h-full"
                >
                  <Shield className="w-6 h-6 text-[var(--color-gold)] mb-4" />
                  <h3 className="font-[family-name:var(--font-serif)] text-lg text-white mb-2">Maintenance & Support</h3>
                  <p className="text-white/45 text-sm leading-relaxed mb-4">Keep your system at peak performance with professional O&M services.</p>
                  <span className="inline-flex items-center gap-1.5 text-[var(--color-gold)] text-sm font-medium">
                    Learn more <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-12 text-center"
            >
              <h2 className="font-[family-name:var(--font-serif)] text-3xl md:text-4xl text-white mb-4">
                Ready to Power Your Home with Solar?
              </h2>
              <p className="text-white/55 text-lg mb-8 max-w-xl mx-auto">
                Get a free, no-obligation site assessment. We will visit your home, analyze your roof, and provide a custom solar proposal within days.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to={langPath('/contact')}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--color-gold)] text-[var(--color-dark)] font-semibold hover:bg-[var(--color-gold-light)] transition-colors duration-200"
                >
                  Get Free Assessment
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to={langPath('/pricing')}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-colors duration-200"
                >
                  View Pricing
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  )
}
