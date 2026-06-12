import { useEffect } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Clock, Tag } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage'
import { useTranslation } from '../i18n/useTranslation'
import { SEOHead } from '../components/seo/SEOHead'
import { breadcrumbSchema, pageBreadcrumb, articleSchema } from '../components/seo/schemas'
import { blogPostsBySlug } from '../data/blogPosts'
import { Badge } from '../components/ui/Badge'
import { fadeUp, heroStagger, ServiceCTA } from './services/shared'

// Category → Badge tone (same mapping as the blog index).
const tagTones: Record<string, 'lagoon' | 'sun' | 'grove'> = {
  Regulations: 'lagoon',
  Finance: 'sun',
  Guide: 'grove',
  Technology: 'lagoon',
  Tips: 'grove',
  Business: 'sun',
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

  const tone = tagTones[post.category] ?? 'grove'

  return (
    <div className="min-h-screen bg-[var(--bustan-paper)] text-ink">
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
              url: `https://bustan-energy.com${lang === 'th' ? '/th' : ''}/blog/${post.slug}`,
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

      {/* Hero — mount-animated serif post header on a soft mist wash */}
      <section className="relative overflow-hidden pt-32 pb-16">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-mist/55 via-mist/20 to-transparent"
        />

        <div className="relative max-w-4xl mx-auto px-6">
          <motion.div initial="hidden" animate="visible" variants={heroStagger} className="space-y-6">
            {/* Back link */}
            <motion.div variants={fadeUp}>
              <Link
                to={langPath('/blog')}
                className="inline-flex items-center gap-2 text-ink/55 text-sm transition-colors duration-[var(--duration-fast)] ease-out-soft hover:text-ocean"
              >
                <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
                {lang === 'th' ? 'กลับไปบทความ' : 'Back to Blog'}
              </Link>
            </motion.div>

            {/* Tag */}
            <motion.div variants={fadeUp}>
              <Badge tone={tone}>
                <Tag size={12} strokeWidth={1.5} aria-hidden />
                {post.category}
              </Badge>
            </motion.div>

            {/* Title */}
            <motion.h1
              variants={fadeUp}
              className="font-serif text-display-md sm:text-display-lg md:text-[4rem] leading-[1.08] tracking-tight text-ink"
            >
              {post.title}
            </motion.h1>

            {/* Meta */}
            <motion.div variants={fadeUp} className="flex items-center gap-6 text-ink/55 text-sm">
              <div className="flex items-center gap-2">
                <Calendar size={16} strokeWidth={1.5} aria-hidden />
                <span>{post.dateDisplay}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} strokeWidth={1.5} aria-hidden />
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
      <ServiceCTA
        title={t.blog.cta.title}
        subtitle={t.blog.cta.subtitle}
        primaryLabel={t.blog.cta.button}
        primaryTo={langPath('/contact')}
      />
    </div>
  )
}
