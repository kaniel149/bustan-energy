import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Calendar, Tag } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'
import { useLanguage } from '../i18n/useLanguage'
import { SEOHead } from '../components/seo/SEOHead'
import { breadcrumbSchema, pageBreadcrumb } from '../components/seo/schemas'
import { Badge } from '../components/ui/Badge'
import {
  fadeUp,
  revealViewport,
  cardHover,
  arrowSlide,
  ServiceHero,
  ServiceCTA,
} from './services/shared'

// Category → Badge tone (EN + Thai equivalents share the same tone).
const tagTones: Record<string, 'lagoon' | 'sun' | 'grove'> = {
  Regulations: 'lagoon',
  Finance: 'sun',
  Guide: 'grove',
  Technology: 'lagoon',
  Tips: 'grove',
  Business: 'sun',
  // Thai tag equivalents
  'กฎระเบียบ': 'lagoon',
  'การเงิน': 'sun',
  'คู่มือ': 'grove',
  'เทคโนโลยี': 'lagoon',
  'เคล็ดลับ': 'grove',
  'ธุรกิจ': 'sun',
}

type PostItem = {
  slug: string
  tag: string
  title: string
  excerpt: string
  date: string
  readTime: string
}

// Each card carries its own whileInView trigger so the grid can never be
// hidden by a single failed container intersection (matches ProjectsPage).
function PostCard({ post, readMore, langPath }: { post: PostItem; readMore: string; langPath: (p: string) => string }) {
  const tone = tagTones[post.tag] ?? 'grove'

  return (
    <motion.article
      initial="hidden"
      whileInView="visible"
      viewport={revealViewport}
      variants={fadeUp}
      className="h-full"
    >
      {/* Hover transforms live on this plain inner div (never the motion element) */}
      <div
        className={`group flex h-full flex-col rounded-card border border-grove/14 bg-shell/76 p-6 shadow-soft hover:border-ocean/30 ${cardHover}`}
      >
        {/* Tag + Date */}
        <div className="flex items-center justify-between mb-4">
          <Badge tone={tone}>
            <Tag size={12} strokeWidth={1.5} aria-hidden />
            {post.tag}
          </Badge>
          <div className="flex items-center gap-1.5 text-ink/45">
            <Calendar size={14} strokeWidth={1.5} aria-hidden />
            <span className="text-xs">{post.date}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-serif text-xl text-ink mb-3 leading-snug transition-colors duration-[var(--duration-fast)] ease-out-soft group-hover:text-ocean">
          {post.title}
        </h3>

        {/* Excerpt */}
        <p className="text-ink/60 text-sm leading-relaxed flex-1 mb-6">{post.excerpt}</p>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-grove/14 pt-4">
          <span className="text-ink/45 text-xs">{post.readTime}</span>
          <Link
            to={langPath(`/blog/${post.slug}`)}
            className="inline-flex items-center gap-1.5 text-ocean text-sm font-medium"
          >
            {readMore}
            <ArrowRight size={14} className={arrowSlide} aria-hidden />
          </Link>
        </div>
      </div>
    </motion.article>
  )
}

export default function BlogPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  const { t, lang } = useTranslation()
  const { langPath } = useLanguage()

  const hero = t.blog.hero
  // Split title: everything before " & " is plain, " & " + rest is the ocean accent
  const titleParts = hero.title.split(' & ')
  const titleMain = titleParts[0]
  const titleAccent = titleParts.length > 1 ? `& ${titleParts.slice(1).join(' & ')}` : undefined

  return (
    <div className="min-h-screen bg-[var(--bustan-paper)] text-ink">
      <SEOHead
        title={t.seo.blog.title}
        description={t.seo.blog.description}
        path="/blog"
        lang={lang}
        schema={[breadcrumbSchema(pageBreadcrumb(lang, t.nav.blog, '/blog'))]}
      />

      {/* Hero — mount-animated, never scroll-gated */}
      <ServiceHero
        icon={<BookOpen size={14} strokeWidth={1.5} aria-hidden />}
        badge={hero.tag}
        title={titleMain}
        titleAccent={titleAccent}
        subtitle={hero.subtitle}
      />

      {/* Posts grid */}
      <section className="py-8 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {t.blog.posts.map((post) => (
              <PostCard key={post.slug} post={post} readMore={t.blog.readMore} langPath={langPath} />
            ))}
          </div>

          {/* Load more placeholder */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={fadeUp}
            className="mt-12 text-center"
          >
            <p className="text-ink/45 text-sm">{t.blog.more}</p>
          </motion.div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <ServiceCTA
        title={t.blog.cta.title}
        subtitle={t.blog.cta.subtitle}
        primaryLabel={t.blog.cta.button}
        primaryTo={langPath('/contact')}
      />
    </div>
  )
}
