import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  BatteryFull,
  CheckCircle2,
  Unplug,
  ShieldCheck,
  Zap,
  CloudOff,
  Cable,
  Sun,
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
      'PEA-approved export/net-billing where available',
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
  'Tier-1 solar panels selected for the site and warranty',
  'Bankable hybrid inverter sized for grid and backup loads',
  'Modular lithium battery storage sized for your outage target',
  'Automatic transfer switch for seamless grid/battery switching',
  'Surge protection and battery management system',
  'Full system wiring and weatherproof enclosures',
  'PEA permitting (for grid-tied and hybrid systems)',
  'Remote monitoring via Huawei FusionSolar app',
  'Commissioning, testing, and full system handover',
]

const systemTypeIcons = [Cable, Unplug, Sun]

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

      <div className="min-h-screen bg-[var(--bustan-paper)] text-ink">
        {/* Hero */}
        <ServiceHero
          icon={<BatteryFull size={14} strokeWidth={1.5} aria-hidden />}
          badge="Off-Grid & Battery"
          title="Off-Grid Solar &"
          titleAccent="Battery Storage"
          subtitle="Energy independence for Ko Phangan. No more blackouts, no more surging electricity bills. Solar and battery systems that keep your power on around the clock."
        >
          <Button variant="primary" size="lg" to={langPath('/contact')} className="w-full sm:w-auto">
            Get Battery Assessment
          </Button>
          <Button variant="secondary" size="lg" to={langPath('/services/residential')} className="w-full sm:w-auto">
            Residential Solar
          </Button>
        </ServiceHero>

        {/* Why Off-Grid */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeader
              title="Why Battery Storage on Ko Phangan?"
              subtitle="Island life comes with unique energy challenges. Battery-backed solar addresses every one of them."
              className="mb-16"
            />

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {whyOffGrid.map((item) => (
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

        {/* Battery Options */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeader
              title="Battery Storage Options"
              subtitle="We install Huawei LUNA2000 modular lithium batteries. Start with the capacity you need and expand as your requirements grow."
              className="mb-16"
            />

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {batteryOptions.map((bat) => (
                <motion.div key={bat.name} variants={fadeUp} className="h-full">
                  <div className={`h-full rounded-card border border-grove/14 bg-shell/76 p-8 text-center shadow-soft hover:border-ocean/30 ${cardHover}`}>
                    <IconTile className="mx-auto mb-5 h-14 w-14">
                      <BatteryFull size={28} strokeWidth={1.5} aria-hidden />
                    </IconTile>
                    <h3 className="text-xl font-semibold text-ink mb-1">{bat.name}</h3>
                    <p className="text-ocean font-serif text-3xl mb-2">{bat.capacity}</p>
                    <p className="text-ink/78 text-sm font-medium mb-3">{bat.best}</p>
                    <p className="text-ink/55 text-xs leading-relaxed">{bat.note}</p>
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
              All LUNA2000 batteries are modular — add capacity anytime without replacing existing units. <Link to={langPath('/pricing')} className="text-ocean hover:underline">View pricing details</Link>.
            </motion.p>
          </div>
        </section>

        <Divider />

        {/* System Types */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeader
              title="Choose Your System Type"
              subtitle="We design three types of battery-integrated solar systems. Each serves a different level of grid independence."
              className="mb-16"
            />

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
              className="space-y-6"
            >
              {systemTypes.map((sys, idx) => {
                const TypeIcon = systemTypeIcons[idx]
                return (
                  <motion.div key={sys.title} variants={fadeUp}>
                    <div className={`rounded-card border border-grove/14 bg-shell/76 p-8 shadow-soft ${cardHover}`}>
                      <div className="flex flex-col lg:flex-row gap-8">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <IconTile className="h-11 w-11">
                              <TypeIcon size={22} strokeWidth={1.5} aria-hidden />
                            </IconTile>
                            <div>
                              <h3 className="text-xl font-semibold text-ink">{sys.title}</h3>
                              <span className="text-ocean text-xs font-semibold uppercase tracking-wider">{sys.subtitle}</span>
                            </div>
                          </div>
                          <p className="text-ink/72 text-sm leading-relaxed">{sys.description}</p>
                        </div>
                        <div className="lg:w-80 flex-shrink-0">
                          <ul className="space-y-2">
                            {sys.benefits.map((b) => (
                              <li key={b} className="flex items-start gap-2">
                                <CheckCircle2 size={16} strokeWidth={1.5} className="text-ocean mt-0.5 flex-shrink-0" aria-hidden />
                                <span className="text-ink/74 text-sm">{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
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
                title="What Every System Includes"
                subtitle="Turnkey installation with premium equipment and full after-sales support."
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

        {/* Related Services */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeader
              title="Explore Related Services"
              subtitle={<>Battery systems pair perfectly with our residential and commercial installations. Browse all <Link to={langPath('/services')} className="text-ocean hover:underline">solar services</Link>.</>}
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
                icon={<Sun size={22} strokeWidth={1.5} aria-hidden />}
                title="Residential Solar"
                desc="Rooftop systems for homes and villas from 3kW to 10kW."
              />
              <RelatedCard
                to={langPath('/services/commercial')}
                icon={<Zap size={22} strokeWidth={1.5} aria-hidden />}
                title="Commercial Solar"
                desc="Hotel, resort, and business systems with PPA financing options."
              />
              <RelatedCard
                to={langPath('/services/maintenance')}
                icon={<ShieldCheck size={22} strokeWidth={1.5} aria-hidden />}
                title="Maintenance & Support"
                desc="Keep your battery and solar system at peak performance."
              />
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <ServiceCTA
          title="Ready for Energy Independence?"
          subtitle="Stop worrying about blackouts and rising electricity costs. Contact us for a free battery and solar assessment tailored to your property."
          primaryLabel="Get Battery Assessment"
          primaryTo={langPath('/contact')}
          secondaryLabel="View Pricing"
          secondaryTo={langPath('/pricing')}
        />
      </div>
    </>
  )
}
