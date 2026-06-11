import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowUpRight, BarChart2, Map, Compass, Sun, Zap } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'
import { useLanguage } from '../i18n/useLanguage'
import { SEOHead } from '../components/seo/SEOHead'
import { breadcrumbSchema, pageBreadcrumb, webPageSchema } from '../components/seo/schemas'
import { BASE_URL } from '../components/seo/schemas'
import { Badge } from '../components/ui/Badge'
import {
  fadeUp,
  heroStagger,
  revealViewport,
  cardHover,
  arrowSlide,
  Divider,
  IconTile,
  ServiceCTA,
} from './services/shared'

interface Tool {
  icon: React.ElementType
  title: string
  description: string
  href: string
  badge: string
  badgeTone: 'lagoon' | 'sun' | 'grove'
  external?: boolean
}

const TOOLS_EN: Tool[] = [
  {
    icon: BarChart2,
    title: 'Solar Bill Scanner & Proposal Generator',
    description:
      'Upload your PEA electricity bill to instantly calculate your solar savings potential, payback period, and get a custom proposal PDF.',
    href: '/tools/bill-scanner.html',
    badge: 'Free Tool',
    badgeTone: 'lagoon',
    external: true,
  },
  {
    icon: Map,
    title: 'Bustan Energy Atlas',
    description:
      'Interactive drone survey map of Ko Phangan. Explore solar potential zones, land parcels, and completed Bustan Energy installations across the island.',
    href: '/tools/solar-atlas.html',
    badge: 'Map Tool',
    badgeTone: 'grove',
    external: true,
  },
  {
    icon: Compass,
    title: 'Solar Farm & Storage Scout',
    description:
      'Identify optimal land plots for utility-scale solar development. Analyse shading, grid proximity, and ROI for projects up to 9 MW on Ko Phangan.',
    href: '/tools/solar-farm-scout.html',
    badge: 'Advanced',
    badgeTone: 'sun',
    external: true,
  },
  {
    icon: Zap,
    title: 'Ko Phangan Power Grid Map',
    description:
      'Live overlay of PEA substations, transmission lines, and grid connection points across Ko Phangan — essential for solar farm feasibility studies.',
    href: '/tools/power-grid-map.html',
    badge: 'Grid Data',
    badgeTone: 'lagoon',
    external: true,
  },
]

const TOOLS_TH: Tool[] = [
  {
    icon: BarChart2,
    title: 'สแกนบิลไฟฟ้า & สร้างใบเสนอราคา',
    description:
      'อัปโหลดบิลไฟฟ้า กฟภ. ของคุณเพื่อคำนวณการประหยัดพลังงาน ระยะเวลาคืนทุน และรับใบเสนอราคาโซลาร์เซลล์แบบ PDF ทันที',
    href: '/tools/bill-scanner.html',
    badge: 'เครื่องมือฟรี',
    badgeTone: 'lagoon',
    external: true,
  },
  {
    icon: Map,
    title: 'แผนที่โซลาร์เกาะพะงัน',
    description:
      'แผนที่โดรนเชิงโต้ตอบของเกาะพะงัน สำรวจพื้นที่ศักยภาพโซลาร์ แปลงที่ดิน และโครงการที่ Bustan Energy ติดตั้งเสร็จแล้วทั่วเกาะ',
    href: '/tools/solar-atlas.html',
    badge: 'แผนที่',
    badgeTone: 'grove',
    external: true,
  },
  {
    icon: Compass,
    title: 'ค้นหาที่ดินโซลาร์ฟาร์ม',
    description:
      'ระบุแปลงที่ดินที่เหมาะสมสำหรับการพัฒนาโซลาร์ฟาร์มขนาดใหญ่ วิเคราะห์เงาบัง ระยะห่างกริด และ ROI สำหรับโครงการสูงถึง 9 MW บนเกาะพะงัน',
    href: '/tools/solar-farm-scout.html',
    badge: 'ขั้นสูง',
    badgeTone: 'sun',
    external: true,
  },
  {
    icon: Zap,
    title: 'แผนที่โครงข่ายไฟฟ้าเกาะพะงัน',
    description:
      'แสดงสถานีไฟฟ้า กฟภ. สายส่ง และจุดเชื่อมต่อกริดทั่วเกาะพะงัน — สำคัญสำหรับการศึกษาความเป็นไปได้ของโซลาร์ฟาร์ม',
    href: '/tools/power-grid-map.html',
    badge: 'ข้อมูลกริด',
    badgeTone: 'lagoon',
    external: true,
  },
]

// Uniform tool card. External tools open in a new tab ("Open Tool" +
// ArrowUpRight); internal tools navigate in-app ("View"). Hover transforms
// live on the plain link element nested inside the motion wrapper.
function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon
  const isExternal = tool.external

  const cardInner = (
    <>
      {/* Icon + Badge row */}
      <div className="flex items-start justify-between mb-5">
        <IconTile>
          <Icon size={20} strokeWidth={1.5} aria-hidden />
        </IconTile>
        <Badge tone={tool.badgeTone}>{tool.badge}</Badge>
      </div>

      {/* Title */}
      <h3 className="font-serif text-xl text-ink mb-3 leading-snug transition-colors duration-[var(--duration-fast)] ease-out-soft group-hover:text-ocean">
        {tool.title}
      </h3>

      {/* Description */}
      <p className="text-ink/60 text-sm leading-relaxed flex-1 mb-6">
        {tool.description}
      </p>

      {/* CTA */}
      <span className="inline-flex items-center gap-1.5 text-ocean text-sm font-medium">
        {isExternal ? 'Open Tool' : 'View'}
        <ArrowUpRight size={14} className={arrowSlide} aria-hidden />
      </span>
    </>
  )

  const cardClasses = `group flex h-full flex-col rounded-card border border-grove/14 bg-shell/76 p-7 shadow-soft hover:border-ocean/30 ${cardHover}`

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={revealViewport}
      variants={fadeUp}
      className="h-full"
    >
      {isExternal ? (
        <a href={tool.href} target="_blank" rel="noopener noreferrer" className={cardClasses}>
          {cardInner}
        </a>
      ) : (
        <Link to={tool.href} className={cardClasses}>
          {cardInner}
        </Link>
      )}
    </motion.div>
  )
}

export default function ToolsPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const { lang } = useTranslation()
  const { langPath } = useLanguage()
  // SEO stays EN/TH (Hebrew is operator-facing, not a public SEO target).
  const seoLang: 'en' | 'th' = lang === 'th' ? 'th' : 'en'

  const tools = lang === 'th' ? TOOLS_TH : TOOLS_EN

  const title = lang === 'th'
    ? 'เครื่องมือโซลาร์เซลล์ฟรี — คำนวณ วางแผน วิเคราะห์ | Bustan Energy'
    : 'Free Solar Tools — Calculate, Plan & Analyse | Bustan Energy Ko Phangan'
  const description = lang === 'th'
    ? 'เครื่องมือโซลาร์เซลล์ฟรีจาก Bustan Energy: สแกนบิลไฟฟ้า แผนที่โซลาร์เกาะพะงัน ค้นหาที่ดินโซลาร์ฟาร์ม และแผนที่โครงข่ายไฟฟ้า เริ่มวางแผนโซลาร์ของคุณวันนี้'
    : 'Free solar tools from Bustan Energy: electricity bill scanner, Ko Phangan solar atlas, solar farm site finder, and power grid map. Start planning your solar installation today.'

  const pageUrl = `${BASE_URL}${lang === 'th' ? '/th' : ''}/tools`

  return (
    <>
      <SEOHead
        title={title}
        description={description}
        path="/tools"
        lang={seoLang}
        schema={[
          webPageSchema({ name: title, description, url: pageUrl, lang: seoLang }),
          breadcrumbSchema(pageBreadcrumb(seoLang, lang === 'th' ? 'เครื่องมือ' : 'Tools', '/tools')),
        ]}
      />

      <div className="min-h-screen bg-[var(--bustan-paper)] text-ink">
        {/* Hero — mount-animated; mid-title accent requires inline markup
            (ServiceHero only supports a trailing accent). */}
        <section className="relative overflow-hidden px-6 pt-32 pb-20">
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-mist/55 via-mist/20 to-transparent"
          />
          <div className="relative max-w-4xl mx-auto text-center">
            <motion.div variants={heroStagger} initial="hidden" animate="visible" className="space-y-6">
              <motion.div variants={fadeUp}>
                <span className="inline-flex items-center gap-2 rounded-full border border-ocean/20 bg-shell/70 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-ocean">
                  <Sun size={14} strokeWidth={1.5} aria-hidden />
                  {lang === 'th' ? 'เครื่องมือฟรี' : 'Free Tools'}
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="font-serif text-display-md sm:text-display-lg md:text-display-xl leading-[1.05] tracking-tight text-ink"
              >
                {lang === 'th' ? (
                  <>เครื่องมือ<span className="text-ocean">โซลาร์เซลล์</span>ฟรี</>
                ) : (
                  <>Solar <span className="text-ocean">Tools</span> &amp; Resources</>
                )}
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="text-lg md:text-xl text-ink/74 max-w-2xl mx-auto leading-relaxed"
              >
                {lang === 'th'
                  ? 'เครื่องมือที่ทีมงาน Bustan Energy ใช้จริงในการสำรวจ วางแผน และนำเสนอโครงการโซลาร์เซลล์บนเกาะพะงัน — เปิดให้ใช้ฟรีสำหรับเจ้าของบ้านและนักลงทุน'
                  : 'The same tools our team uses to survey, plan, and pitch solar projects on Ko Phangan — open and free for homeowners and investors.'}
              </motion.p>
            </motion.div>
          </div>
        </section>

        <Divider />

        {/* Tools grid */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tools.map((tool) => (
                <ToolCard key={tool.href} tool={tool} />
              ))}
            </div>
          </div>
        </section>

        <Divider />

        {/* CTA */}
        <ServiceCTA
          title={lang === 'th' ? 'พร้อมติดตั้งโซลาร์แล้วหรือยัง?' : 'Ready to Go Solar?'}
          subtitle={lang === 'th'
            ? 'ใช้เครื่องมือด้านบนเพื่อประเมินศักยภาพ แล้วติดต่อทีมงานของเราเพื่อรับใบเสนอราคาฟรี'
            : 'Use the tools above to assess your potential, then let our team give you a free, no-obligation quote.'}
          primaryLabel={lang === 'th' ? 'ขอใบเสนอราคาฟรี' : 'Get Free Quote'}
          primaryTo={langPath('/contact')}
        />
      </div>
    </>
  )
}
