import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  BatteryFull,
  ArrowRight,
  CheckCircle2,
  Unplug,
  ShieldCheck,
  Zap,
  CloudOff,
  Cable,
  Sun,
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

const whyOffGrid = [
  {
    icon: CloudOff,
    title: 'Frequent Power Outages',
    text: 'Ko Phangan experiences regular power outages, especially during storms and peak tourist season. An off-grid or hybrid solar system with battery storage keeps your property running regardless of grid status.',
  },
  {
    icon: Unplug,
    title: 'Remote Locations',
    text: 'Many properties on Ko Phangan are located in areas with unreliable grid connections or no grid access at all. Off-grid solar is the most practical and cost-effective way to electrify these locations.',
  },
  {
    icon: ShieldCheck,
    title: 'Energy Security',
    text: 'Dependence on a single power source is a risk. Battery-backed solar provides a reliable secondary power supply that protects your home or business from grid instability.',
  },
  {
    icon: Zap,
    title: 'Rising Electricity Costs',
    text: 'Island electricity tariffs are among the highest in Thailand. Generating and storing your own power locks in a predictable energy cost and shields you from future rate increases.',
  },
]

const batteryOptions = [
  {
    name: 'Huawei LUNA2000-5',
    capacity: '5 kWh',
    best: 'Small homes, essential load backup',
    note: 'Covers lights, fridge, fans, and internet for hours during outages',
  },
  {
    name: 'Huawei LUNA2000-10',
    capacity: '10 kWh',
    best: 'Medium homes, partial A/C backup',
    note: 'Powers essential loads plus selective air conditioning through the night',
  },
  {
    name: 'Huawei LUNA2000-15+',
    capacity: '15–30 kWh',
    best: 'Large homes, villas, small businesses',
    note: 'Full property backup capable of running an entire household overnight on stored solar energy',
  },
]

const systemTypes = [
  {
    title: 'Grid-Tied with Battery Backup',
    subtitle: 'Most popular',
    description: 'Stay connected to the PEA grid while having battery storage for outages. Solar charges your battery during the day, and the grid fills any gaps. During blackouts, the battery seamlessly takes over your essential loads.',
    benefits: [
      'Net metering — sell excess power back to the grid',
      'Battery backup during outages',
      'Lower cost than fully off-grid',
      'Best of both worlds — grid stability plus independence',
    ],
  },
  {
    title: 'Full Off-Grid System',
    subtitle: 'Complete independence',
    description: 'No grid connection required. Solar panels charge a larger battery bank that powers your property around the clock. Ideal for remote locations where grid connection is impractical or unavailable.',
    benefits: [
      'Total energy independence',
      'No monthly electricity bills',
      'Ideal for remote or hillside properties',
      'Sized to cover 100% of your energy needs',
    ],
  },
  {
    title: 'Hybrid System',
    subtitle: 'Maximum flexibility',
    description: 'Combines solar, battery, and optional generator backup for properties that need guaranteed uptime. The system automatically prioritizes solar, switches to battery, and fires the generator only as a last resort.',
    benefits: [
      'Triple redundancy — solar, battery, generator',
      'Guaranteed power for critical equipment',
      'Smart load management built in',
      'Ideal for resorts and medical facilities',
    ],
  },
]

const included = [
  'LONGi Hi-MO 6 solar panels (440W, Tier-1)',
  'Huawei SUN2000 hybrid inverter (grid and off-grid capable)',
  'Huawei LUNA2000 modular lithium battery storage',
  'Automatic transfer switch for seamless grid/battery switching',
  'Surge protection and battery management system',
  'Full system wiring and weatherproof enclosures',
  'PEA permitting (for grid-tied and hybrid systems)',
  'Remote monitoring via Huawei FusionSolar app',
  'Commissioning, testing, and full system handover',
]

export default function OffGridSolarPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const { langPath } = useLanguage()
  const lang = 'en'

  const breadcrumbs = [
    { name: 'Home', url: BASE_URL },
    { name: 'Services', url: `${BASE_URL}/services` },
    { name: 'Off-Grid Solar & Battery', url: `${BASE_URL}/services/off-grid` },
  ]

  return (
    <>
      <SEOHead
        title="Off-Grid Solar & Battery Storage Ko Phangan | Energy Independence"
        description="Off-grid solar systems and battery storage for Ko Phangan homes and businesses. Huawei LUNA2000 batteries, hybrid systems, and full off-grid solutions. No more blackouts."
        path="/services/off-grid"
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
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(46,125,50,0.4), transparent)',
            }}
          />

          <div className="relative max-w-7xl mx-auto px-6 text-center">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
              <motion.div variants={fadeUp}>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase border border-[var(--color-gold)]/30 text-[var(--color-gold)] bg-[var(--color-gold)]/10">
                  <BatteryFull className="w-3.5 h-3.5" />
                  Off-Grid & Battery
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="font-[family-name:var(--font-serif)] text-5xl md:text-6xl lg:text-7xl text-white max-w-4xl mx-auto leading-tight"
              >
                Off-Grid Solar &{' '}
                <span className="text-[var(--color-gold)]">Battery Storage</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-white/55 text-xl max-w-2xl mx-auto leading-relaxed">
                Energy independence for Ko Phangan. No more blackouts, no more surging electricity bills. Solar and battery systems that keep your power on around the clock.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                <Link
                  to={langPath('/contact')}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--color-gold)] text-[var(--color-dark)] font-semibold hover:bg-[var(--color-gold-light)] transition-colors duration-200"
                >
                  Get Battery Assessment
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to={langPath('/services/residential')}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-colors duration-200"
                >
                  Residential Solar
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Why Off-Grid */}
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
                Why Battery Storage on Ko Phangan?
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/50 text-lg max-w-2xl mx-auto">
                Island life comes with unique energy challenges. Battery-backed solar addresses every one of them.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {whyOffGrid.map((item) => (
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

        {/* Battery Options */}
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
                Battery Storage Options
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/50 text-lg max-w-2xl mx-auto">
                We install Huawei LUNA2000 modular lithium batteries. Start with the capacity you need and expand as your requirements grow.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {batteryOptions.map((bat) => (
                <motion.div
                  key={bat.name}
                  variants={fadeUp}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-[var(--color-gold)]/30 transition-colors duration-300 text-center"
                >
                  <div className="w-14 h-14 rounded-xl bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 flex items-center justify-center mx-auto mb-5">
                    <BatteryFull className="w-7 h-7 text-[var(--color-gold)]" />
                  </div>
                  <h3 className="font-[family-name:var(--font-serif)] text-xl text-white mb-1">{bat.name}</h3>
                  <p className="text-[var(--color-gold)] text-2xl font-bold mb-2">{bat.capacity}</p>
                  <p className="text-white/70 text-sm font-medium mb-3">{bat.best}</p>
                  <p className="text-white/40 text-xs leading-relaxed">{bat.note}</p>
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
              All LUNA2000 batteries are modular — add capacity anytime without replacing existing units. <Link to={langPath('/pricing')} className="text-[var(--color-gold)] hover:underline">View pricing details</Link>.
            </motion.p>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* System Types */}
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
                Choose Your System Type
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/50 text-lg max-w-2xl mx-auto">
                We design three types of battery-integrated solar systems. Each serves a different level of grid independence.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={stagger}
              className="space-y-6"
            >
              {systemTypes.map((sys, idx) => (
                <motion.div
                  key={sys.title}
                  variants={fadeUp}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-colors duration-300"
                >
                  <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 flex items-center justify-center">
                          {idx === 0 && <Cable className="w-5 h-5 text-[var(--color-gold)]" />}
                          {idx === 1 && <Unplug className="w-5 h-5 text-[var(--color-gold)]" />}
                          {idx === 2 && <Sun className="w-5 h-5 text-[var(--color-gold)]" />}
                        </div>
                        <div>
                          <h3 className="font-[family-name:var(--font-serif)] text-xl text-white">{sys.title}</h3>
                          <span className="text-[var(--color-gold)] text-xs font-semibold uppercase tracking-wider">{sys.subtitle}</span>
                        </div>
                      </div>
                      <p className="text-white/50 text-sm leading-relaxed">{sys.description}</p>
                    </div>
                    <div className="lg:w-80 flex-shrink-0">
                      <ul className="space-y-2">
                        {sys.benefits.map((b) => (
                          <li key={b} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[var(--color-gold)] mt-0.5 flex-shrink-0" />
                            <span className="text-white/65 text-sm">{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
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
                What Every System Includes
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/50 text-lg max-w-2xl mx-auto text-center mb-12">
                Turnkey installation with premium equipment and full after-sales support.
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
                Battery systems pair perfectly with our residential and commercial installations. Browse all <Link to={langPath('/services')} className="text-[var(--color-gold)] hover:underline">solar services</Link>.
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
                  to={langPath('/services/residential')}
                  className="block bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-[var(--color-gold)]/30 hover:-translate-y-1 transition-all duration-300 h-full"
                >
                  <Sun className="w-6 h-6 text-[var(--color-gold)] mb-4" />
                  <h3 className="font-[family-name:var(--font-serif)] text-lg text-white mb-2">Residential Solar</h3>
                  <p className="text-white/45 text-sm leading-relaxed mb-4">Rooftop systems for homes and villas from 3kW to 10kW.</p>
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
                  <p className="text-white/45 text-sm leading-relaxed mb-4">Hotel, resort, and business systems with PPA financing options.</p>
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
                  <ShieldCheck className="w-6 h-6 text-[var(--color-gold)] mb-4" />
                  <h3 className="font-[family-name:var(--font-serif)] text-lg text-white mb-2">Maintenance & Support</h3>
                  <p className="text-white/45 text-sm leading-relaxed mb-4">Keep your battery and solar system at peak performance.</p>
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
                Ready for Energy Independence?
              </h2>
              <p className="text-white/55 text-lg mb-8 max-w-xl mx-auto">
                Stop worrying about blackouts and rising electricity costs. Contact us for a free battery and solar assessment tailored to your property.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to={langPath('/contact')}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--color-gold)] text-[var(--color-dark)] font-semibold hover:bg-[var(--color-gold-light)] transition-colors duration-200"
                >
                  Get Battery Assessment
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
