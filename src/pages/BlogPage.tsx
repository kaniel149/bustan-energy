import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Calendar, Tag } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'
import { useLanguage } from '../i18n/useLanguage'
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

const tagColors: Record<string, { bg: string; border: string; text: string }> = {
  Regulations: { bg: 'rgba(10,61,92,0.4)', border: 'rgba(10,61,92,0.8)', text: '#60B4FF' },
  Finance: { bg: 'rgba(232,168,32,0.15)', border: 'rgba(232,168,32,0.4)', text: '#E8A820' },
  Guide: { bg: 'rgba(46,125,50,0.2)', border: 'rgba(46,125,50,0.5)', text: '#66BB6A' },
  Technology: { bg: 'rgba(103,58,183,0.2)', border: 'rgba(103,58,183,0.5)', text: '#CE93D8' },
  Tips: { bg: 'rgba(0,150,136,0.2)', border: 'rgba(0,150,136,0.5)', text: '#4DB6AC' },
  Business: { bg: 'rgba(230,81,0,0.2)', border: 'rgba(230,81,0,0.5)', text: '#FFB74D' },
  // Thai tag equivalents
  'กฎระเบียบ': { bg: 'rgba(10,61,92,0.4)', border: 'rgba(10,61,92,0.8)', text: '#60B4FF' },
  'การเงิน': { bg: 'rgba(232,168,32,0.15)', border: 'rgba(232,168,32,0.4)', text: '#E8A820' },
  'คู่มือ': { bg: 'rgba(46,125,50,0.2)', border: 'rgba(46,125,50,0.5)', text: '#66BB6A' },
  'เทคโนโลยี': { bg: 'rgba(103,58,183,0.2)', border: 'rgba(103,58,183,0.5)', text: '#CE93D8' },
  'เคล็ดลับ': { bg: 'rgba(0,150,136,0.2)', border: 'rgba(0,150,136,0.5)', text: '#4DB6AC' },
  'ธุรกิจ': { bg: 'rgba(230,81,0,0.2)', border: 'rgba(230,81,0,0.5)', text: '#FFB74D' },
}

type PostItem = {
  slug: string
  tag: string
  title: string
  excerpt: string
  date: string
  readTime: string
}

function PostCard({ post, readMore, langPath }: { post: PostItem; readMore: string; langPath: (p: string) => string }) {
  const colors = tagColors[post.tag] ?? tagColors['Guide']

  return (
    <motion.article
      variants={fadeUp}
      className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 hover:-translate-y-1 transition-all duration-300 flex flex-col"
    >
      {/* Tag + Date */}
      <div className="flex items-center justify-between mb-4">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
        >
          <Tag className="w-3 h-3" />
          {post.tag}
        </span>
        <div className="flex items-center gap-1.5 text-white/30">
          <Calendar className="w-3.5 h-3.5" />
          <span className="text-xs">{post.date}</span>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-[family-name:var(--font-serif)] text-xl text-white mb-3 leading-snug group-hover:text-[var(--color-gold)] transition-colors duration-200">
        {post.title}
      </h3>

      {/* Excerpt */}
      <p className="text-white/45 text-sm leading-relaxed flex-1 mb-6">{post.excerpt}</p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/8">
        <span className="text-white/25 text-xs">{post.readTime}</span>
        <Link
          to={langPath(`/blog/${post.slug}`)}
          className="inline-flex items-center gap-1.5 text-[var(--color-gold)] text-sm font-medium hover:gap-2.5 transition-all duration-200"
        >
          {readMore}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </motion.article>
  )
}

export default function BlogPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  const { t, lang } = useTranslation()
  const { langPath } = useLanguage()

  const hero = t.blog.hero
  // Split title: everything before " & " is plain, " & " + rest is gold
  const titleParts = hero.title.split(' & ')
  const titleMain = titleParts[0]
  const titleAccent = titleParts.length > 1 ? `& ${titleParts.slice(1).join(' & ')}` : null

  return (
    <div className="min-h-screen bg-[var(--color-dark)]">
      <SEOHead
        title={t.seo.blog.title}
        description={t.seo.blog.description}
        path="/blog"
        lang={lang}
        schema={[breadcrumbSchema(pageBreadcrumb(lang, t.nav.blog, '/blog'))]}
      />

      {/* Hero */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-navy)] via-[var(--color-dark)] to-[var(--color-dark)]" />
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(103,58,183,0.3), transparent)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase border border-[var(--color-gold)]/30 text-[var(--color-gold)] bg-[var(--color-gold)]/10">
                <BookOpen className="w-3.5 h-3.5" />
                {hero.tag}
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-[family-name:var(--font-serif)] text-5xl md:text-6xl lg:text-7xl text-white max-w-3xl mx-auto leading-tight"
            >
              {titleMain}{titleAccent && (
                <>{' '}<span className="text-[var(--color-gold)]">{titleAccent}</span></>
              )}
            </motion.h1>

            <motion.p variants={fadeUp} className="text-white/55 text-xl max-w-2xl mx-auto leading-relaxed">
              {hero.subtitle}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Posts grid */}
      <section className="py-8 pb-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {t.blog.posts.map((post) => (
              <PostCard key={post.slug} post={post} readMore={t.blog.readMore} langPath={langPath} />
            ))}
          </motion.div>

          {/* Load more placeholder */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mt-12 text-center"
          >
            <p className="text-white/25 text-sm">{t.blog.more}</p>
          </motion.div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="pb-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-12 text-center"
          >
            <h3 className="font-[family-name:var(--font-serif)] text-3xl md:text-4xl text-white mb-4">
              {t.blog.cta.title}
            </h3>
            <p className="text-white/50 text-lg mb-8 max-w-xl mx-auto">
              {t.blog.cta.subtitle}
            </p>
            <Link
              to={langPath('/contact')}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--color-gold)] text-[var(--color-dark)] font-semibold hover:bg-[var(--color-gold-light)] transition-colors duration-200"
            >
              {t.blog.cta.button}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
