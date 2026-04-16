import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { MapPin, Zap, TrendingUp, ArrowRight, Award } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'
import { useLanguage } from '../i18n/LanguageContext'
import { SEOHead } from '../components/seo/SEOHead'
import { breadcrumbSchema, pageBreadcrumb } from '../components/seo/schemas'

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

// Static assets and descriptions not in translations
const projectAssets = [
  {
    image: '/assets/images/bizplan-05-villa.png',
    description: 'Complete rooftop system for a luxury private villa with battery backup.',
  },
  {
    image: '/assets/images/strategy-03-resort.png',
    description: 'Full EPC installation powering pool pumps, AC units, and common areas.',
  },
  {
    image: '/assets/images/strategy-01-aerial.png',
    description: 'Aerial-optimized ground and rooftop hybrid system with PPA financing.',
  },
  {
    image: '/assets/images/install-06-panel.png',
    description: 'Precision install on a tiered tropical roof with shading analysis.',
  },
  {
    image: '/assets/images/sales-10-happy.png',
    description: 'Large commercial system with dedicated monitoring portal for operations team.',
  },
  {
    image: '/assets/images/monitor-02-app.png',
    description: 'Off-grid capable system with Huawei FusionSolar real-time monitoring.',
  },
]

interface ProjectItem {
  name: string
  location: string
  size: string
  savings: string
  type: string
  image: string
  description: string
}

function ProjectCard({ project, index }: { project: ProjectItem; index: number }) {
  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      className="group rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden">
        <img
          src={project.image}
          alt={`${project.name} — ${project.size} solar installation in ${project.location}, Ko Phangan`}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D1117]/80 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-4 left-4 flex gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-gold)]/20 border border-[var(--color-gold)]/40 text-[var(--color-gold)] backdrop-blur-sm">
            {project.type}
          </span>
        </div>

        {/* Savings badge */}
        <div className="absolute top-4 right-4">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 border border-green-500/40 backdrop-blur-sm">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-green-400 text-xs font-bold">{project.savings} saved</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-white font-bold text-lg mb-2 group-hover:text-[var(--color-gold)] transition-colors duration-200">
          {project.name}
        </h3>

        <p className="text-white/45 text-sm mb-4 leading-relaxed">{project.description}</p>

        <div className="flex items-center justify-between pt-4 border-t border-white/8">
          <div className="flex items-center gap-1.5 text-white/40">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-xs">{project.location}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--color-gold)]">
            <Zap className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">{project.size}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function ProjectsPage() {
  const { t, lang } = useTranslation()
  const { langPath } = useLanguage()
  const p = t.projects

  useEffect(() => { window.scrollTo(0, 0) }, [])

  const projects: ProjectItem[] = p.items.map((item, i) => ({
    ...item,
    image: projectAssets[i]?.image ?? '',
    description: projectAssets[i]?.description ?? '',
  }))

  const stats = [
    p.stats.totalInstalled,
    p.stats.projectsCompleted,
    p.stats.averageSavings,
  ]

  return (
    <div className="min-h-screen bg-[var(--color-dark)]">
      <SEOHead
        title={t.seo.projects.title}
        description={t.seo.projects.description}
        path="/projects"
        lang={lang}
        schema={breadcrumbSchema(pageBreadcrumb(lang, p.hero.tag, '/projects'))}
      />

      {/* Hero */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-navy)] via-[var(--color-dark)] to-[var(--color-dark)]" />
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(10,61,92,0.8), transparent)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase border border-[var(--color-gold)]/30 text-[var(--color-gold)] bg-[var(--color-gold)]/10">
                <Award className="w-3.5 h-3.5" />
                {p.hero.tag}
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-[family-name:var(--font-serif)] text-5xl md:text-6xl lg:text-7xl text-white max-w-3xl mx-auto leading-tight"
            >
              {p.hero.title}{' '}
              <span className="text-[var(--color-gold)]">for Itself</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-white/55 text-xl max-w-2xl mx-auto leading-relaxed">
              {p.hero.subtitle}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 rounded-2xl overflow-hidden"
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                className="bg-[var(--color-dark)] px-8 py-8 text-center"
              >
                <div className="font-[family-name:var(--font-serif)] text-4xl md:text-5xl text-[var(--color-gold)] mb-2">
                  {stat.value}
                </div>
                <div className="text-white/40 text-sm uppercase tracking-wider">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Projects grid */}
      <section className="py-8 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {projects.map((project, index) => (
              <ProjectCard key={project.name} project={project} index={index} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="rounded-3xl overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-navy)] to-[var(--color-ocean)]" />
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'radial-gradient(ellipse 50% 60% at 70% 50%, rgba(232,168,32,0.25), transparent)',
              }}
            />
            <div className="relative p-12 md:p-16 text-center">
              <h3 className="font-[family-name:var(--font-serif)] text-3xl md:text-4xl lg:text-5xl text-white mb-4">
                {p.cta.title}
              </h3>
              <p className="text-white/50 text-lg mb-8 max-w-xl mx-auto">
                {p.cta.subtitle}
              </p>
              <Link
                to={langPath('/contact')}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--color-gold)] text-[var(--color-dark)] font-semibold text-base hover:bg-[var(--color-gold-light)] transition-colors duration-200"
              >
                {p.cta.button}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
