import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Wrench,
  ArrowRight,
  CheckCircle2,
  Activity,
  Droplets,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  BarChart3,
} from 'lucide-react'
import { useLanguage } from '../../i18n/useLanguage'
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

const services = [
  {
    icon: Activity,
    title: 'Remote System Monitoring',
    text: 'We monitor your solar system 24/7 through the Huawei FusionSolar platform. Our team receives automatic alerts if panel output drops, inverter errors occur, or communication is lost. Most issues are identified and diagnosed before you even notice a change in performance.',
  },
  {
    icon: Droplets,
    title: 'Panel Cleaning',
    text: 'Dust, pollen, bird droppings, and salt spray from the ocean gradually reduce panel efficiency. Our cleaning service uses deionized water and soft brushes to safely clean your panels without damaging the anti-reflective coating. We recommend cleaning every 3-6 months on Ko Phangan.',
  },
  {
    icon: Wrench,
    title: 'Repairs & Troubleshooting',
    text: 'From inverter faults to wiring issues after storms, our technicians diagnose and resolve problems quickly. We keep common service parts for the equipment families we install and document any manufacturer warranty claim.',
  },
  {
    icon: ShieldCheck,
    title: 'Warranty Support',
    text: 'Installations include manufacturer warranty documentation for the selected panels, inverters, and batteries. We help prepare and manage warranty claims so you are not chasing paperwork alone.',
  },
  {
    icon: Calendar,
    title: 'Annual Checkups',
    text: 'Once a year, our engineers perform a comprehensive inspection: panel integrity, wiring connections, inverter performance, mounting hardware torque, and battery health (if applicable). You receive a detailed report with findings and recommendations.',
  },
  {
    icon: BarChart3,
    title: 'Performance Reporting',
    text: 'Monthly and annual performance reports show your system generation, consumption, savings, and comparison to expected output. These reports help identify gradual degradation or emerging issues before they become costly.',
  },
]

const annualChecklistItems = [
  'Visual inspection of all panels for cracks, discoloration, or hotspots',
  'Inverter performance testing and firmware updates',
  'DC and AC wiring connection torque checks',
  'Mounting hardware inspection for corrosion (critical in tropical island climate)',
  'Battery state-of-health check and calibration cycle',
  'PEA meter/export reading verification where the system is approved for export',
  'Cleaning of panels and ventilation around inverter',
  'Monitoring system connectivity and data accuracy check',
  'Written report with photos and recommendations',
]

const whyMaintenance = [
  {
    icon: AlertTriangle,
    title: 'Tropical Climate Demands It',
    description: 'Ko Phangan\'s combination of high humidity, salt air, intense UV, and monsoon storms is harsh on solar equipment. Regular maintenance catches weather-related wear before it causes system failures or safety hazards.',
  },
  {
    icon: BarChart3,
    title: 'Maximize Your Output',
    description: 'Dirty panels alone can reduce output by 15-25%. Combined with loose connections and undiagnosed inverter issues, unmaintained systems often perform well below their rated capacity without the owner realizing it.',
  },
  {
    icon: ShieldCheck,
    title: 'Protect Your Investment',
    description: 'A solar system is a significant investment. Proper maintenance extends equipment life, preserves warranty coverage, and ensures you receive the full financial return over the system\'s 25+ year lifespan.',
  },
]

export default function MaintenancePage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const { langPath } = useLanguage()
  const lang = 'en'

  const breadcrumbs = [
    { name: 'Home', url: BASE_URL },
    { name: 'Services', url: `${BASE_URL}/services` },
    { name: 'Maintenance & Support', url: `${BASE_URL}/services/maintenance` },
  ]

  return (
    <>
      <SEOHead
        title="Solar System Maintenance & Support Ko Phangan | O&M Services"
        description="Professional solar system maintenance on Ko Phangan. 24/7 monitoring, panel cleaning, repairs, annual inspections, and warranty support. Protect your solar investment with Bustan Energy."
        path="/services/maintenance"
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
              backgroundImage: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(232,168,32,0.25), transparent)',
            }}
          />

          <div className="relative max-w-7xl mx-auto px-6 text-center">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
              <motion.div variants={fadeUp}>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase border border-[var(--color-gold)]/30 text-[var(--color-gold)] bg-[var(--color-gold)]/10">
                  <Wrench className="w-3.5 h-3.5" />
                  Maintenance & Support
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="font-[family-name:var(--font-serif)] text-5xl md:text-6xl lg:text-7xl text-white max-w-4xl mx-auto leading-tight"
              >
                Solar System{' '}
                <span className="text-[var(--color-gold)]">Maintenance & Support</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-white/55 text-xl max-w-2xl mx-auto leading-relaxed">
                Protect your solar investment with professional monitoring, cleaning, and maintenance. We keep your system performing at its best for decades.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                <Link
                  to={langPath('/contact')}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--color-gold)] text-[var(--color-dark)] font-semibold hover:bg-[var(--color-gold-light)] transition-colors duration-200"
                >
                  Schedule Maintenance
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to={langPath('/services')}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-colors duration-200"
                >
                  View All Services
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Why Maintenance */}
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
                Why Maintenance Matters
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/50 text-lg max-w-2xl mx-auto">
                Solar panels are built to last, but they are not maintenance-free. On an island like Ko Phangan, proper care is essential for peak performance and longevity.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {whyMaintenance.map((item) => (
                <motion.div
                  key={item.title}
                  variants={fadeUp}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-colors duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 flex items-center justify-center mb-5">
                    <item.icon className="w-6 h-6 text-[var(--color-gold)]" />
                  </div>
                  <h3 className="font-[family-name:var(--font-serif)] text-xl text-white mb-3">{item.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{item.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Our Services */}
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
                Our Maintenance Services
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/50 text-lg max-w-2xl mx-auto">
                Comprehensive operations and maintenance for every solar system we install — and for third-party systems that need professional care.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {services.map((item) => (
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

        {/* Annual Checklist */}
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
                Annual Inspection Checklist
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/50 text-lg max-w-2xl mx-auto text-center mb-12">
                Here is what our engineers check during every annual inspection. Every item is documented with photos and a written report.
              </motion.p>

              <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {annualChecklistItems.map((item) => (
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
                Need a new system or an upgrade? Check out our installation services or browse all <Link to={langPath('/services')} className="text-[var(--color-gold)] hover:underline">solar solutions</Link>.
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
                  <Activity className="w-6 h-6 text-[var(--color-gold)] mb-4" />
                  <h3 className="font-[family-name:var(--font-serif)] text-lg text-white mb-2">Residential Solar</h3>
                  <p className="text-white/45 text-sm leading-relaxed mb-4">Rooftop solar systems for homes and villas from 3kW to 10kW.</p>
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
                  <BarChart3 className="w-6 h-6 text-[var(--color-gold)] mb-4" />
                  <h3 className="font-[family-name:var(--font-serif)] text-lg text-white mb-2">Commercial Solar</h3>
                  <p className="text-white/45 text-sm leading-relaxed mb-4">Solar for hotels, resorts, and businesses with PPA financing.</p>
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
                  <ShieldCheck className="w-6 h-6 text-[var(--color-gold)] mb-4" />
                  <h3 className="font-[family-name:var(--font-serif)] text-lg text-white mb-2">Off-Grid & Battery</h3>
                  <p className="text-white/45 text-sm leading-relaxed mb-4">Huawei LUNA battery storage for blackout protection and energy independence.</p>
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
                Keep Your System Performing at Its Best
              </h2>
              <p className="text-white/55 text-lg mb-8 max-w-xl mx-auto">
                Whether you need a one-time cleaning, an annual checkup, or a full O&M contract — we are here to help. Contact us to schedule a service visit or discuss a maintenance plan.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to={langPath('/contact')}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--color-gold)] text-[var(--color-dark)] font-semibold hover:bg-[var(--color-gold-light)] transition-colors duration-200"
                >
                  Schedule Maintenance
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
