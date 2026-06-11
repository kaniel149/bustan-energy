import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Zap, TrendingUp, Award } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'
import { useLanguage } from '../i18n/useLanguage'
import { SEOHead } from '../components/seo/SEOHead'
import { breadcrumbSchema, pageBreadcrumb } from '../components/seo/schemas'
import { Badge } from '../components/ui/Badge'
import {
  fadeUp,
  stagger,
  revealViewport,
  cardHover,
  ServiceHero,
  Divider,
  ServiceCTA,
} from './services/shared'

// Static assets and descriptions not in translations.
// Intrinsic dimensions verified via sips (CLS prevention).
const projectAssets = [
  {
    image: '/assets/images/bizplan-05-villa.png',
    width: 1024,
    height: 510,
    description: 'Complete rooftop system for a luxury private villa with battery backup.',
  },
  {
    image: '/assets/images/strategy-03-resort.png',
    width: 1024,
    height: 681,
    description: 'Full EPC installation powering pool pumps, AC units, and common areas.',
  },
  {
    image: '/assets/images/strategy-01-aerial.png',
    width: 1024,
    height: 574,
    description: 'Aerial-optimized ground and rooftop hybrid system with PPA financing.',
  },
  {
    image: '/assets/images/install-06-panel.png',
    width: 1024,
    height: 508,
    description: 'Precision install on a tiered tropical roof with shading analysis.',
  },
  {
    image: '/assets/images/sales-10-happy.png',
    width: 1024,
    height: 574,
    description: 'Large commercial system with dedicated monitoring portal for operations team.',
  },
  {
    image: '/assets/images/monitor-02-app.png',
    width: 1024,
    height: 678,
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
  imgWidth: number
  imgHeight: number
  description: string
}

// Image-led project card. Each card carries its own whileInView trigger so the
// grid can never be hidden by a single failed container intersection (the old
// dark page showed zero cards on mobile load because the whole grid was gated
// on one container observer).
function ProjectCard({ project }: { project: ProjectItem }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={revealViewport}
      variants={fadeUp}
      className="h-full"
    >
      {/* Hover transforms live on this plain inner div (never the motion.div) */}
      <div
        className={`group relative flex h-full flex-col overflow-hidden rounded-card border border-grove/14 bg-shell/82 shadow-soft hover:border-ocean/30 ${cardHover}`}
      >
        {/* Image — zoom on hover applies to the image only */}
        <div className="relative h-52 overflow-hidden">
          <img
            src={project.image}
            alt={`${project.name} — ${project.size} solar installation in ${project.location}, Ko Phangan`}
            width={project.imgWidth}
            height={project.imgHeight}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-[var(--duration-slow)] ease-out-soft group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-grove/5 to-grove/55" />

          {/* Type chip — light shell on photo */}
          <div className="absolute top-4 left-4 rounded-full border border-shell/30 bg-shell/15 px-3 py-1 text-xs font-medium text-shell backdrop-blur-md">
            {project.type}
          </div>

          {/* Savings chip — gold reserved for photo chips */}
          <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-gold/90 px-3 py-1 text-xs font-semibold text-grove">
            <TrendingUp size={12} strokeWidth={1.5} aria-hidden />
            {project.savings} saved
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-6">
          <h3 className="text-lg font-semibold text-ink mb-2">{project.name}</h3>
          <p className="text-ink/60 text-sm leading-relaxed mb-5">{project.description}</p>

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-grove/14 pt-4">
            <Badge tone="lagoon">
              <MapPin size={12} strokeWidth={1.5} aria-hidden />
              {project.location}
            </Badge>
            <span className="inline-flex items-center gap-1.5 text-base font-semibold text-ocean">
              <Zap size={15} strokeWidth={1.5} aria-hidden />
              {project.size}
            </span>
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
    imgWidth: projectAssets[i]?.width ?? 1024,
    imgHeight: projectAssets[i]?.height ?? 574,
    description: projectAssets[i]?.description ?? '',
  }))

  const stats = [
    p.stats.totalInstalled,
    p.stats.projectsCompleted,
    p.stats.averageSavings,
  ]

  return (
    <div className="min-h-screen bg-[var(--bustan-paper)] text-ink">
      <SEOHead
        title={t.seo.projects.title}
        description={t.seo.projects.description}
        path="/projects"
        lang={lang}
        schema={breadcrumbSchema(pageBreadcrumb(lang, p.hero.tag, '/projects'))}
      />

      {/* Hero — mount-animated, never scroll-gated */}
      <ServiceHero
        icon={<Award size={14} strokeWidth={1.5} aria-hidden />}
        badge={p.hero.tag}
        title={p.hero.title}
        titleAccent="for Itself"
        subtitle={p.hero.subtitle}
      />

      {/* Stats bar */}
      <section className="pb-16">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-grove/14 overflow-hidden rounded-card border border-grove/14 bg-shell/70 shadow-soft"
          >
            {stats.map((stat) => (
              <motion.div key={stat.label} variants={fadeUp} className="px-8 py-8 text-center">
                <div className="font-serif text-3xl md:text-4xl text-ocean mb-2">
                  {stat.value}
                </div>
                <div className="text-ink/60 text-sm uppercase tracking-wider">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <Divider />

      {/* Projects grid */}
      <section className="py-16 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.name} project={project} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <ServiceCTA
        title={p.cta.title}
        subtitle={p.cta.subtitle}
        primaryLabel={p.cta.button}
        primaryTo={langPath('/contact')}
      />
    </div>
  )
}
