import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Wrench,
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
import { Button } from '../../components/ui/Button'
import { SectionHeader } from '../../components/ui/SectionHeader'
import {
  fadeUp,
  stagger,
  revealViewport,
  cardHover,
  ServiceHero,
  Divider,
  IconTile,
  RelatedCard,
  ServiceCTA,
} from './shared'

const BASE_URL = 'https://bustan-energy.com'

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

      <div className="min-h-screen bg-[var(--bustan-paper)] text-ink">
        {/* Hero */}
        <ServiceHero
          icon={<Wrench size={14} strokeWidth={1.5} aria-hidden />}
          badge="Maintenance & Support"
          title="Solar System"
          titleAccent="Maintenance & Support"
          subtitle="Protect your solar investment with professional monitoring, cleaning, and maintenance. We keep your system performing at its best for decades."
        >
          <Button variant="primary" size="lg" to={langPath('/contact')} className="w-full sm:w-auto">
            Schedule Maintenance
          </Button>
          <Button variant="secondary" size="lg" to={langPath('/services')} className="w-full sm:w-auto">
            View All Services
          </Button>
        </ServiceHero>

        {/* Why Maintenance */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeader
              title="Why Maintenance Matters"
              subtitle="Solar panels are built to last, but they are not maintenance-free. On an island like Ko Phangan, proper care is essential for peak performance and longevity."
              className="mb-16"
            />

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {whyMaintenance.map((item) => (
                <motion.div key={item.title} variants={fadeUp} className="h-full">
                  <div className={`h-full rounded-card border border-grove/14 bg-shell/76 p-8 shadow-soft ${cardHover}`}>
                    <IconTile className="mb-5">
                      <item.icon size={24} strokeWidth={1.5} aria-hidden />
                    </IconTile>
                    <h3 className="text-xl font-semibold text-ink mb-3">{item.title}</h3>
                    <p className="text-ink/72 text-sm leading-relaxed">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <Divider />

        {/* Our Services */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeader
              title="Our Maintenance Services"
              subtitle="Comprehensive operations and maintenance for every solar system we install — and for third-party systems that need professional care."
              className="mb-16"
            />

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {services.map((item) => (
                <motion.div key={item.title} variants={fadeUp} className="h-full">
                  <div className={`h-full rounded-card border border-grove/14 bg-shell/76 p-8 shadow-soft ${cardHover}`}>
                    <IconTile className="mb-5">
                      <item.icon size={24} strokeWidth={1.5} aria-hidden />
                    </IconTile>
                    <h3 className="text-xl font-semibold text-ink mb-3">{item.title}</h3>
                    <p className="text-ink/72 text-sm leading-relaxed">{item.text}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Annual Checklist */}
        <section className="py-24 bg-mist/35">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
            >
              <SectionHeader
                title="Annual Inspection Checklist"
                subtitle="Here is what our engineers check during every annual inspection. Every item is documented with photos and a written report."
                className="mb-12"
              />

              <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {annualChecklistItems.map((item) => (
                  <motion.div key={item} variants={fadeUp} className="flex items-start gap-3">
                    <CheckCircle2 size={20} strokeWidth={1.5} className="text-ocean mt-0.5 flex-shrink-0" aria-hidden />
                    <span className="text-ink/78 text-base">{item}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Related Services */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeader
              title="Explore Related Services"
              subtitle={<>Need a new system or an upgrade? Check out our installation services or browse all <Link to={langPath('/services')} className="text-ocean hover:underline">solar solutions</Link>.</>}
              className="mb-12"
            />

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <RelatedCard
                to={langPath('/services/residential')}
                icon={<Activity size={22} strokeWidth={1.5} aria-hidden />}
                title="Residential Solar"
                desc="Rooftop solar systems for homes and villas from 3kW to 10kW."
              />
              <RelatedCard
                to={langPath('/services/commercial')}
                icon={<BarChart3 size={22} strokeWidth={1.5} aria-hidden />}
                title="Commercial Solar"
                desc="Solar for hotels, resorts, and businesses with PPA financing."
              />
              <RelatedCard
                to={langPath('/services/off-grid')}
                icon={<ShieldCheck size={22} strokeWidth={1.5} aria-hidden />}
                title="Off-Grid & Battery"
                desc="Huawei LUNA battery storage for blackout protection and energy independence."
              />
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <ServiceCTA
          title="Keep Your System Performing at Its Best"
          subtitle="Whether you need a one-time cleaning, an annual checkup, or a full O&M contract — we are here to help. Contact us to schedule a service visit or discuss a maintenance plan."
          primaryLabel="Schedule Maintenance"
          primaryTo={langPath('/contact')}
          secondaryLabel="View Pricing"
          secondaryTo={langPath('/pricing')}
        />
      </div>
    </>
  )
}
