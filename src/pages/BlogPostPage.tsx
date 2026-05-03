import { useEffect } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Clock, Tag } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage'
import { useTranslation } from '../i18n/useTranslation'
import { SEOHead } from '../components/seo/SEOHead'
import { breadcrumbSchema, pageBreadcrumb, articleSchema } from '../components/seo/schemas'
import { blogPostsBySlug } from '../data/blogPosts'

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

const tagColors: Record<string, { bg: string; border: string; text: string }> = {
  Regulations: { bg: 'rgba(10,61,92,0.4)', border: 'rgba(10,61,92,0.8)', text: '#60B4FF' },
  Finance: { bg: 'rgba(232,168,32,0.15)', border: 'rgba(232,168,32,0.4)', text: '#E8A820' },
  Guide: { bg: 'rgba(46,125,50,0.2)', border: 'rgba(46,125,50,0.5)', text: '#66BB6A' },
  Technology: { bg: 'rgba(103,58,183,0.2)', border: 'rgba(103,58,183,0.5)', text: '#CE93D8' },
  Tips: { bg: 'rgba(0,150,136,0.2)', border: 'rgba(0,150,136,0.5)', text: '#4DB6AC' },
  Business: { bg: 'rgba(230,81,0,0.2)', border: 'rgba(230,81,0,0.5)', text: '#FFB74D' },
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const { langPath } = useLanguage()
  const { t, lang } = useTranslation()

  useEffect(() => { window.scrollTo(0, 0) }, [slug])

  const post = slug ? blogPostsBySlug.get(slug) : undefined

  // If no full-content post found, redirect to blog listing
  if (!post) {
    return <Navigate to={langPath('/blog')} replace />
  }

  const colors = tagColors[post.category] ?? tagColors['Guide']

  return (
    <div className="min-h-screen bg-[var(--color-dark)]">
      <SEOHead
        title={`${post.title} | Bustan Energy Blog`}
        description={post.excerpt}
        path={`/blog/${post.slug}`}
        lang={lang}
        schema={[
          breadcrumbSchema([
            ...pageBreadcrumb(lang, t.nav.blog, '/blog'),
            {
              name: post.title,
              url: `https://energy-tm.com${lang === 'th' ? '/th' : ''}/blog/${post.slug}`,
            },
          ]),
          articleSchema({
            title: post.title,
            description: post.excerpt,
            slug: post.slug,
            datePublished: post.date,
            lang,
          }),
        ]}
      />

      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-navy)] via-[var(--color-dark)] to-[var(--color-dark)]" />
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(103,58,183,0.3), transparent)',
          }}
        />

        <div className="relative max-w-4xl mx-auto px-6">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
            {/* Back link */}
            <motion.div variants={fadeUp}>
              <Link
                to={langPath('/blog')}
                className="inline-flex items-center gap-2 text-white/40 text-sm hover:text-white/70 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {lang === 'th' ? 'กลับไปบทความ' : 'Back to Blog'}
              </Link>
            </motion.div>

            {/* Tag */}
            <motion.div variants={fadeUp}>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
              >
                <Tag className="w-3 h-3" />
                {post.category}
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              variants={fadeUp}
              className="font-[family-name:var(--font-serif)] text-4xl md:text-5xl lg:text-6xl text-white leading-tight"
            >
              {post.title}
            </motion.h1>

            {/* Meta */}
            <motion.div variants={fadeUp} className="flex items-center gap-6 text-white/40 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{post.dateDisplay}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{post.readTime}</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="pb-24">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="blog-content"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="pb-32">
        <div className="max-w-4xl mx-auto px-6">
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
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
