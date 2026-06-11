import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Building2,
  CheckCircle2,
  Hotel,
  UtensilsCrossed,
  TrendingUp,
  Leaf,
  BarChart3,
  Handshake,
} from 'lucide-react'
import { useLanguage } from '../../i18n/useLanguage'
import { SEOHead } from '../../components/seo/SEOHead'
import { breadcrumbSchema, serviceSchema } from '../../components/seo/schemas'
import { Button } from '../../components/ui/Button'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Badge } from '../../components/ui/Badge'
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

const sectors = [
  {
    icon: Hotel,
    title: 'Hotels & Resorts',
    description: 'Resorts on Ko Phangan often carry large daytime loads from cooling, pool pumps, kitchens, and common areas. Solar can offset those daytime loads, with payback depending on the actual PEA tariff, self-consumption, roof layout, and financing structure.',
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
    text: 'Our Power Purchase Agreement model means Bustan Energy owns and maintains the system. You simply buy solar electricity at a fixed rate below your current grid tariff. No capital expenditure required.',
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
  'Tier-1 solar modules selected per project availability and warranty',
  'Huawei, Sungrow, or equivalent bankable commercial inverters',
  'Optional Huawei LUNA2000 battery storage for backup power',
  'Heavy-duty mounting systems rated for tropical weather',
  'Full PEA permitting and grid connection',
  'PEA-compliant self-consumption and net-billing/export configuration where approved',
  'Huawei FusionSolar commercial monitoring platform',
  'Tax and BOI documentation support for qualifying businesses, coordinated with your accountant',
  'Manufacturer performance warranties plus Bustan Energy workmanship warranty',
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

      <div className="min-h-screen bg-[var(--bustan-paper)] text-ink">
        {/* Hero */}
        <ServiceHero
          icon={<Building2 size={14} strokeWidth={1.5} aria-hidden />}
          badge="Commercial Solar"
          title="Commercial Solar for"
          titleAccent="Ko Phangan Businesses"
          subtitle="Lower your operating costs and strengthen your sustainability credentials. Solar energy solutions designed for hotels, resorts, restaurants, and commercial properties on Ko Phangan."
        >
          <Button variant="primary" size="lg" to={langPath('/contact')} className="w-full sm:w-auto">
            Request Commercial Proposal
          </Button>
          <Button variant="secondary" size="lg" to={langPath('/pricing')} className="w-full sm:w-auto">
            View Pricing & PPA Options
          </Button>
        </ServiceHero>

        {/* Sectors */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeader
              title="Solar Solutions by Business Type"
              subtitle="We design each commercial system around the load profile, roof conditions, PEA requirements, and financing model of the business."
              className="mb-16"
            />

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {sectors.map((sector) => (
                <motion.div key={sector.title} variants={fadeUp} className="h-full">
                  <div className={`flex h-full flex-col rounded-card border border-grove/14 bg-shell/76 p-8 shadow-soft ${cardHover}`}>
                    <IconTile className="mb-5">
                      <sector.icon size={24} strokeWidth={1.5} aria-hidden />
                    </IconTile>
                    <h3 className="text-xl font-semibold text-ink mb-3">{sector.title}</h3>
                    <p className="text-ink/72 text-sm leading-relaxed mb-4">{sector.description}</p>
                    <div className="mt-auto">
                      <Badge tone="sun">Typical size: {sector.size}</Badge>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <Divider />

        {/* Advantages */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeader
              title="Why Businesses Choose Solar"
              subtitle="Solar energy is not just an environmental choice — it is a sound business decision. Here is why commercial operators on Ko Phangan are investing in solar."
              className="mb-16"
            />

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {advantages.map((item) => (
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
                title="Complete Commercial Package"
                subtitle="Every commercial installation is a full turnkey solution. We handle everything from system design through to ongoing maintenance."
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
              subtitle={<>Complement your commercial system with battery backup or ongoing maintenance. See all our <Link to={langPath('/services')} className="text-ocean hover:underline">solar services</Link>.</>}
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
                icon={<Hotel size={22} strokeWidth={1.5} aria-hidden />}
                title="Residential Solar"
                desc="Home rooftop systems from 3kW to 10kW with battery backup options."
              />
              <RelatedCard
                to={langPath('/services/maintenance')}
                icon={<Handshake size={22} strokeWidth={1.5} aria-hidden />}
                title="Maintenance & Support"
                desc="Professional O&M services, 24/7 monitoring, and annual inspections."
              />
              <RelatedCard
                to={langPath('/services/off-grid')}
                icon={<TrendingUp size={22} strokeWidth={1.5} aria-hidden />}
                title="Off-Grid & Battery"
                desc="Energy independence with Huawei LUNA batteries for backup and peak shaving."
              />
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <ServiceCTA
          title="Ready to Lower Your Operating Costs?"
          subtitle="Get a custom commercial solar proposal for your business. We will analyze your energy consumption and present a clear ROI timeline — including PPA options with zero upfront cost."
          primaryLabel="Request Commercial Proposal"
          primaryTo={langPath('/contact')}
          secondaryLabel="View Pricing"
          secondaryTo={langPath('/pricing')}
        />
      </div>
    </>
  )
}
