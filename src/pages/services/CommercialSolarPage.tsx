import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Building2,
  ArrowRight,
  CheckCircle2,
  Hotel,
  UtensilsCrossed,
  TrendingUp,
  Leaf,
  BarChart3,
  Handshake,
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

const sectors = [
  {
    icon: Hotel,
    title: 'Hotels & Resorts',
    description: 'Resorts on Ko Phangan face some of the highest electricity costs in Thailand due to island tariffs. Solar systems offset daytime cooling, pool pumps, and common area loads. Many of our resort clients see payback in under 5 years.',
    size: '30 kW – 200 kW',
  },
  {
    icon: UtensilsCrossed,
    title: 'Restaurants & Bars',
    description: 'Refrigeration, kitchen equipment, and evening lighting drive high bills for F&B businesses. A well-sized solar system with battery storage keeps costs predictable and operations running through power outages.',
    size: '5 kW – 30 kW',
  },
  {
    icon: Building2,
    title: 'Offices & Retail',
    description: 'Air conditioning dominates daytime electricity use for offices and shops. Solar generation peaks exactly when A/C demand is highest, making rooftop solar an ideal match for commercial buildings on the island.',
    size: '10 kW – 50 kW',
  },
]

const advantages = [
  {
    icon: TrendingUp,
    title: 'Strong ROI',
    text: "Commercial operations on Ko Phangan face elevated electricity tariffs. Solar directly reduces your largest operating expense, delivering returns that outperform most capital investments.",
  },
  {
    icon: Handshake,
    title: 'PPA Option — Zero Upfront',
    text: 'Our Power Purchase Agreement model means TM Energy owns and maintains the system. You simply buy solar electricity at a fixed rate below your current grid tariff. No capital expenditure required.',
  },
  {
    icon: Leaf,
    title: 'Attract Eco-Conscious Guests',
    text: 'Sustainability is a deciding factor for travelers choosing accommodation and dining on Ko Phangan. Solar-powered businesses stand out in booking platforms and attract premium guests.',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Monitoring',
    text: 'Every commercial installation includes a monitoring dashboard. Track generation, consumption, and savings in real-time. Get alerts if anything needs attention.',
  },
]

const included = [
  'LONGi Hi-MO 6 commercial-grade panels (440W, Tier-1)',
  'Huawei SUN2000 commercial inverters (scalable string design)',
  'Optional Huawei LUNA2000 battery storage for backup power',
  'Heavy-duty mounting systems rated for tropical weather',
  'Full PEA permitting and grid connection',
  'Net metering or net billing configuration',
  'Huawei FusionSolar commercial monitoring platform',
  'BOI tax incentive guidance for qualifying businesses',
  'Comprehensive 25-year performance warranty',
  'Ongoing O&M support and annual inspections',
]

export default function CommercialSolarPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const { langPath } = useLanguage()
  const lang = 'en'

  const breadcrumbs = [
    { name: 'Home', url: BASE_URL },
    { name: 'Services', url: `${BASE_URL}/services` },
    { name: 'Commercial Solar', url: `${BASE_URL}/services/commercial` },
  ]

  return (
    <>
      <SEOHead
        title="Commercial Solar Installation Ko Phangan | Resort & Business Solar"
        description="Solar energy for Ko Phangan businesses, hotels, and resorts. 30kW to 500kW systems with PPA financing. Lower operating costs and attract eco-conscious guests. Free commercial proposal."
        path="/services/commercial"
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
              backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(10,61,92,0.5), transparent)',
            }}
          />

          <div className="relative max-w-7xl mx-auto px-6 text-center">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
              <motion.div variants={fadeUp}>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase border border-[var(--color-gold)]/30 text-[var(--color-gold)] bg-[var(--color-gold)]/10">
                  <Building2 className="w-3.5 h-3.5" />
                  Commercial Solar
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="font-[family-name:var(--font-serif)] text-5xl md:text-6xl lg:text-7xl text-white max-w-4xl mx-auto leading-tight"
              >
                Commercial Solar for{' '}
                <span className="text-[var(--color-gold)]">Ko Phangan Businesses</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-white/55 text-xl max-w-2xl mx-auto leading-relaxed">
                Lower your operating costs and strengthen your sustainability credentials. Solar energy solutions designed for hotels, resorts, restaurants, and commercial properties on Ko Phangan.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                <Link
                  to={langPath('/contact')}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--color-gold)] text-[var(--color-dark)] font-semibold hover:bg-[var(--color-gold-light)] transition-colors duration-200"
                >
                  Request Commercial Proposal
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to={langPath('/pricing')}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-colors duration-200"
                >
                  View Pricing & PPA Options
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Sectors */}
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
                Solar Solutions by Business Type
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/50 text-lg max-w-2xl mx-auto">
                We have installed solar systems across every major commercial sector on Ko Phangan. Each system is engineered for the specific energy profile of your business.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {sectors.map((sector) => (
                <motion.div
                  key={sector.title}
                  variants={fadeUp}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-colors duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 flex items-center justify-center mb-5">
                    <sector.icon className="w-6 h-6 text-[var(--color-gold)]" />
                  </div>
                  <h3 className="font-[family-name:var(--font-serif)] text-xl text-white mb-3">{sector.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed mb-4">{sector.description}</p>
                  <span className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 text-[var(--color-gold)]">
                    Typical size: {sector.size}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Advantages */}
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
                Why Businesses Choose Solar
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/50 text-lg max-w-2xl mx-auto">
                Solar energy is not just an environmental choice — it is a sound business decision. Here is why commercial operators on Ko Phangan are investing in solar.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {advantages.map((item) => (
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
                Complete Commercial Package
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/50 text-lg max-w-2xl mx-auto text-center mb-12">
                Every commercial installation is a full turnkey solution. We handle everything from system design through to ongoing maintenance.
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
                Complement your commercial system with battery backup or ongoing maintenance. See all our <Link to={langPath('/services')} className="text-[var(--color-gold)] hover:underline">solar services</Link>.
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
                  <Hotel className="w-6 h-6 text-[var(--color-gold)] mb-4" />
                  <h3 className="font-[family-name:var(--font-serif)] text-lg text-white mb-2">Residential Solar</h3>
                  <p className="text-white/45 text-sm leading-relaxed mb-4">Home rooftop systems from 3kW to 10kW with battery backup options.</p>
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
                  <Handshake className="w-6 h-6 text-[var(--color-gold)] mb-4" />
                  <h3 className="font-[family-name:var(--font-serif)] text-lg text-white mb-2">Maintenance & Support</h3>
                  <p className="text-white/45 text-sm leading-relaxed mb-4">Professional O&M services, 24/7 monitoring, and annual inspections.</p>
                  <span className="inline-flex items-center gap-1.5 text-[var(--color-gold)] text-sm font-medium">
                    Learn more <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </motion.div>
              <motion.div variants={fadeUp}>
                <Link
                  to={langPath('/services/off-grid')}
                  className="block bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-[var(--color-gold)]/30 hover:-translate-y-1 transition-all duration-300 h-full"
                >
                  <TrendingUp className="w-6 h-6 text-[var(--color-gold)] mb-4" />
                  <h3 className="font-[family-name:var(--font-serif)] text-lg text-white mb-2">Off-Grid & Battery</h3>
                  <p className="text-white/45 text-sm leading-relaxed mb-4">Energy independence with Huawei LUNA batteries for backup and peak shaving.</p>
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
                Ready to Lower Your Operating Costs?
              </h2>
              <p className="text-white/55 text-lg mb-8 max-w-xl mx-auto">
                Get a custom commercial solar proposal for your business. We will analyze your energy consumption and present a clear ROI timeline — including PPA options with zero upfront cost.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to={langPath('/contact')}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--color-gold)] text-[var(--color-dark)] font-semibold hover:bg-[var(--color-gold-light)] transition-colors duration-200"
                >
                  Request Commercial Proposal
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
