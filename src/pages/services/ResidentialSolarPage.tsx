import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Home,
  CheckCircle2,
  Sun,
  Battery,
  Zap,
  TrendingDown,
  Shield,
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
    text: 'Every installation includes manufacturer warranty documentation for the selected panels, inverter, and battery, plus Bustan Energy workmanship coverage for the installation.',
  },
  {
    icon: Sun,
    title: 'Increase Property Value',
    text: 'Homes with solar systems consistently command higher resale and rental prices. For island properties catering to long-term renters and Airbnb guests, solar is a clear differentiator.',
  },
]

const included = [
  'Tier-1 monocrystalline panels selected per project availability and warranty',
  'Huawei, Sungrow, or equivalent string inverter with monitoring',
  'Professional roof mounting hardware rated for tropical storms',
  'Full DC and AC wiring with surge protection',
  'PEA (Provincial Electricity Authority) application and grid connection',
  'PEA-compliant self-consumption and net-billing/export setup where approved',
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
        description="Install solar panels on your Ko Phangan home. 3kW to 10kW rooftop systems with optional battery backup, PEA coordination, and equipment selected for your site. Free site assessment."
        path="/services/residential"
        lang={lang}
        schema={[
          serviceSchema(lang),
          breadcrumbSchema(breadcrumbs),
        ]}
      />

      <div className="min-h-screen bg-[var(--bustan-paper)] text-ink">
        {/* Hero */}
        <ServiceHero
          icon={<Home size={14} strokeWidth={1.5} aria-hidden />}
          badge="Residential Solar"
          title="Residential Solar for"
          titleAccent="Ko Phangan Homes"
          subtitle="Power your home with clean, reliable solar energy. Reduce your electricity bills and gain energy independence with a system designed specifically for island living."
        >
          <Button variant="primary" size="lg" to={langPath('/contact')} className="w-full sm:w-auto">
            Get Free Home Assessment
          </Button>
          <Button variant="secondary" size="lg" to={langPath('/pricing')} className="w-full sm:w-auto">
            View Pricing
          </Button>
        </ServiceHero>

        {/* Benefits */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeader
              title="Why Go Solar at Home?"
              subtitle="Ko Phangan homeowners are making the switch to solar for good reasons. Here is what a residential solar system delivers for your household."
              className="mb-16"
            />

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {benefits.map((item) => (
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

        <Divider />

        {/* System Sizes */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeader
              title="Choose the Right System Size"
              subtitle="We design every system based on your actual electricity consumption. Here are our most popular residential configurations for Ko Phangan homes."
              className="mb-16"
            />

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {systemSizes.map((sys) => (
                <motion.div key={sys.size} variants={fadeUp} className="h-full">
                  <div className={`h-full rounded-card border border-grove/14 bg-shell/76 p-8 text-center shadow-soft hover:border-ocean/30 ${cardHover}`}>
                    <IconTile className="mx-auto mb-5 h-14 w-14">
                      <sys.icon size={28} strokeWidth={1.5} aria-hidden />
                    </IconTile>
                    <h3 className="font-serif text-3xl text-ink mb-1">{sys.size}</h3>
                    <p className="text-ocean text-sm font-semibold mb-4">{sys.panels}</p>
                    <p className="text-ink/78 text-sm font-medium mb-2">{sys.best}</p>
                    <p className="text-ink/55 text-xs leading-relaxed">{sys.covers}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="text-center text-ink/55 text-sm mt-8"
            >
              Not sure which size? Our engineers will recommend the optimal system during your free site assessment. <Link to={langPath('/pricing')} className="text-ocean hover:underline">View full pricing</Link>.
            </motion.p>
          </div>
        </section>

        {/* What's Included */}
        <section className="py-24 bg-mist/35">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
            >
              <SectionHeader
                title="What's Included in Every Installation"
                subtitle="Every residential solar installation from Bustan Energy is a complete, turnkey solution. No hidden costs, no surprises."
                className="mb-12"
              />

              <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {included.map((item) => (
                  <motion.div key={item} variants={fadeUp} className="flex items-start gap-3">
                    <CheckCircle2 size={20} strokeWidth={1.5} className="text-ocean mt-0.5 flex-shrink-0" aria-hidden />
                    <span className="text-ink/78 text-base">{item}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Process */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeader
              title="Our Installation Process"
              subtitle={<>Going solar is straightforward with Bustan Energy. We handle everything from assessment through to commissioning. <Link to={langPath('/how-it-works')} className="text-ocean hover:underline">Learn more about how it works</Link>.</>}
              className="mb-16"
            />

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {processSteps.map((s) => (
                <motion.div key={s.step} variants={fadeUp} className="h-full">
                  <div className={`h-full rounded-card border border-grove/14 bg-shell/76 p-6 shadow-soft ${cardHover}`}>
                    <span className="text-ocean font-bold text-xs tracking-widest uppercase">Step {s.step}</span>
                    <h3 className="text-lg font-semibold text-ink mt-2 mb-3">{s.title}</h3>
                    <p className="text-ink/60 text-sm leading-relaxed">{s.text}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <Divider />

        {/* Related Services */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeader
              title="Explore Related Services"
              subtitle={<>Pair your residential system with battery backup, or explore our full <Link to={langPath('/services')} className="text-ocean hover:underline">range of solar services</Link>.</>}
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
                to={langPath('/services/off-grid')}
                icon={<Battery size={22} strokeWidth={1.5} aria-hidden />}
                title="Off-Grid & Battery"
                desc="Add battery storage for blackout protection and energy independence."
              />
              <RelatedCard
                to={langPath('/services/commercial')}
                icon={<Zap size={22} strokeWidth={1.5} aria-hidden />}
                title="Commercial Solar"
                desc="Own a business? See our commercial solar solutions with PPA financing."
              />
              <RelatedCard
                to={langPath('/services/maintenance')}
                icon={<Shield size={22} strokeWidth={1.5} aria-hidden />}
                title="Maintenance & Support"
                desc="Keep your system at peak performance with professional O&M services."
              />
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <ServiceCTA
          title="Ready to Power Your Home with Solar?"
          subtitle="Get a free, no-obligation site assessment. We will visit your home, analyze your roof, and provide a custom solar proposal within days."
          primaryLabel="Get Free Assessment"
          primaryTo={langPath('/contact')}
          secondaryLabel="View Pricing"
          secondaryTo={langPath('/pricing')}
        />
      </div>
    </>
  )
}
