import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowUpRight, BarChart2, Map, Compass, Sun, Zap } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'
import { useLanguage } from '../i18n/LanguageContext'
import { SEOHead } from '../components/seo/SEOHead'
import { breadcrumbSchema, pageBreadcrumb, webPageSchema } from '../components/seo/schemas'
import { BASE_URL } from '../components/seo/schemas'

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

interface Tool {
  icon: React.ElementType
  title: string
  description: string
  href: string
  badge: string
  badgeColor: string
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
    badgeColor: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
    external: true,
  },
  {
    icon: Map,
    title: 'Ko Phangan Solar Atlas',
    description:
      'Interactive drone survey map of Ko Phangan. Explore solar potential zones, land parcels, and completed TM Energy installations across the island.',
    href: '/tools/solar-atlas.html',
    badge: 'Map Tool',
    badgeColor: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    external: true,
  },
  {
    icon: Compass,
    title: 'Solar Farm & Storage Scout',
    description:
      'Identify optimal land plots for utility-scale solar development. Analyse shading, grid proximity, and ROI for projects up to 9 MW on Ko Phangan.',
    href: '/tools/solar-farm-scout.html',
    badge: 'Advanced',
    badgeColor: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
    external: true,
  },
  {
    icon: Zap,
    title: 'Ko Phangan Power Grid Map',
    description:
      'Live overlay of PEA substations, transmission lines, and grid connection points across Ko Phangan — essential for solar farm feasibility studies.',
    href: '/tools/power-grid-map.html',
    badge: 'Grid Data',
    badgeColor: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
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
    badgeColor: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
    external: true,
  },
  {
    icon: Map,
    title: 'แผนที่โซลาร์เกาะพะงัน',
    description:
      'แผนที่โดรนเชิงโต้ตอบของเกาะพะงัน สำรวจพื้นที่ศักยภาพโซลาร์ แปลงที่ดิน และโครงการที่ TM Energy ติดตั้งเสร็จแล้วทั่วเกาะ',
    href: '/tools/solar-atlas.html',
    badge: 'แผนที่',
    badgeColor: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    external: true,
  },
  {
    icon: Compass,
    title: 'ค้นหาที่ดินโซลาร์ฟาร์ม',
    description:
      'ระบุแปลงที่ดินที่เหมาะสมสำหรับการพัฒนาโซลาร์ฟาร์มขนาดใหญ่ วิเคราะห์เงาบัง ระยะห่างกริด และ ROI สำหรับโครงการสูงถึง 9 MW บนเกาะพะงัน',
    href: '/tools/solar-farm-scout.html',
    badge: 'ขั้นสูง',
    badgeColor: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
    external: true,
  },
  {
    icon: Zap,
    title: 'แผนที่โครงข่ายไฟฟ้าเกาะพะงัน',
    description:
      'แสดงสถานีไฟฟ้า กฟภ. สายส่ง และจุดเชื่อมต่อกริดทั่วเกาะพะงัน — สำคัญสำหรับการศึกษาความเป็นไปได้ของโซลาร์ฟาร์ม',
    href: '/tools/power-grid-map.html',
    badge: 'ข้อมูลกริด',
    badgeColor: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    external: true,
  },
]

function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon
  const isExternal = tool.external

  const cardContent = (
    <motion.div
      variants={fadeUp}
      className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-7 hover:border-[var(--color-gold)]/30 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
    >
      {/* Icon + Badge row */}
      <div className="flex items-start justify-between mb-5">
        <div className="w-12 h-12 rounded-xl bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-[var(--color-gold)]" />
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${tool.badgeColor}`}>
          {tool.badge}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-[family-name:var(--font-serif)] text-xl text-white mb-3 leading-snug group-hover:text-[var(--color-gold)] transition-colors duration-200">
        {tool.title}
      </h3>

      {/* Description */}
      <p className="text-white/50 text-sm leading-relaxed flex-1 mb-6">
        {tool.description}
      </p>

      {/* CTA */}
      <div className="flex items-center gap-1.5 text-[var(--color-gold)] text-sm font-medium group-hover:gap-2.5 transition-all duration-200">
        {isExternal ? 'Open Tool' : 'View'}
        <ArrowUpRight className="w-3.5 h-3.5" />
      </div>

      {/* Subtle glow on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(232,168,32,0.15)' }}
      />
    </motion.div>
  )

  if (isExternal) {
    return (
      <a href={tool.href} target="_blank" rel="noopener noreferrer" className="block h-full">
        {cardContent}
      </a>
    )
  }
  return (
    <Link to={tool.href} className="block h-full">
      {cardContent}
    </Link>
  )
}

export default function ToolsPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const { lang } = useTranslation()
  const { langPath } = useLanguage()

  const tools = lang === 'th' ? TOOLS_TH : TOOLS_EN

  const title = lang === 'th'
    ? 'เครื่องมือโซลาร์เซลล์ฟรี — คำนวณ วางแผน วิเคราะห์ | TM Energy'
    : 'Free Solar Tools — Calculate, Plan & Analyse | TM Energy Ko Phangan'
  const description = lang === 'th'
    ? 'เครื่องมือโซลาร์เซลล์ฟรีจาก TM Energy: สแกนบิลไฟฟ้า แผนที่โซลาร์เกาะพะงัน ค้นหาที่ดินโซลาร์ฟาร์ม และแผนที่โครงข่ายไฟฟ้า เริ่มวางแผนโซลาร์ของคุณวันนี้'
    : 'Free solar tools from TM Energy: electricity bill scanner, Ko Phangan solar atlas, solar farm site finder, and power grid map. Start planning your solar installation today.'

  const pageUrl = `${BASE_URL}${lang === 'th' ? '/th' : ''}/tools`

  return (
    <>
      <SEOHead
        title={title}
        description={description}
        path="/tools"
        lang={lang}
        schema={[
          webPageSchema({ name: title, description, url: pageUrl, lang }),
          breadcrumbSchema(pageBreadcrumb(lang, lang === 'th' ? 'เครื่องมือ' : 'Tools', '/tools')),
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
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="space-y-6"
            >
              <motion.div variants={fadeUp}>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase border border-[var(--color-gold)]/30 text-[var(--color-gold)] bg-[var(--color-gold)]/10">
                  <Sun className="w-3.5 h-3.5" />
                  {lang === 'th' ? 'เครื่องมือฟรี' : 'Free Tools'}
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="font-[family-name:var(--font-serif)] text-5xl md:text-6xl lg:text-7xl text-white max-w-4xl mx-auto leading-tight"
              >
                {lang === 'th' ? (
                  <>เครื่องมือ<span className="text-[var(--color-gold)]">โซลาร์เซลล์</span>ฟรี</>
                ) : (
                  <>Solar <span className="text-[var(--color-gold)]">Tools</span> &amp; Resources</>
                )}
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="text-white/55 text-xl max-w-2xl mx-auto leading-relaxed"
              >
                {lang === 'th'
                  ? 'เครื่องมือที่ทีมงาน TM Energy ใช้จริงในการสำรวจ วางแผน และนำเสนอโครงการโซลาร์เซลล์บนเกาะพะงัน — เปิดให้ใช้ฟรีสำหรับเจ้าของบ้านและนักลงทุน'
                  : 'The same tools our team uses to survey, plan, and pitch solar projects on Ko Phangan — open and free for homeowners and investors.'}
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Tools grid */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {tools.map((tool) => (
                <ToolCard key={tool.href} tool={tool} />
              ))}
            </motion.div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

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
              <h3 className="font-[family-name:var(--font-serif)] text-3xl md:text-4xl text-white mb-4">
                {lang === 'th' ? 'พร้อมติดตั้งโซลาร์แล้วหรือยัง?' : 'Ready to Go Solar?'}
              </h3>
              <p className="text-white/55 text-lg mb-8 max-w-xl mx-auto">
                {lang === 'th'
                  ? 'ใช้เครื่องมือด้านบนเพื่อประเมินศักยภาพ แล้วติดต่อทีมงานของเราเพื่อรับใบเสนอราคาฟรี'
                  : "Use the tools above to assess your potential, then let our team give you a free, no-obligation quote."}
              </p>
              <Link
                to={langPath('/contact')}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--color-gold)] text-[var(--color-dark)] font-semibold hover:bg-[var(--color-gold-light)] transition-colors duration-200"
              >
                {lang === 'th' ? 'ขอใบเสนอราคาฟรี' : 'Get Free Quote'}
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  )
}
