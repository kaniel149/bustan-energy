import { Helmet } from 'react-helmet-async'
import { localBusinessSchema } from './schemas'
import type { Lang } from '../../i18n/translations'

const BASE_URL = 'https://energy-tm.com'
const DEFAULT_OG_IMAGE = `${BASE_URL}/assets/images/og-default.jpg`

interface SEOHeadProps {
  /** Page title — will be appended with " | Bustan Energy" */
  title: string
  /** Meta description — aim for 150–160 characters */
  description: string
  /** Path without language prefix, e.g. "/services" or "/" */
  path: string
  /** Active language of this page (he → English meta; not a public SEO locale) */
  lang: Lang
  /**
   * Additional JSON-LD schema objects to inject alongside the always-present
   * LocalBusiness schema.  Pass a single object or an array.
   */
  schema?: object | object[]
  /** Absolute URL to the Open Graph image (1200×630). Falls back to default OG image. */
  ogImage?: string
  /** Set to true on blog post pages to use og:type="article" */
  isArticle?: boolean
  /** Robots directive. Defaults to "index, follow". */
  robots?: string
}

/**
 * SEOHead — drop into any page component to handle all head meta requirements:
 * - Title + description
 * - Canonical + hreflang alternate links (en / th / x-default)
 * - Open Graph + Twitter Card tags
 * - JSON-LD structured data (LocalBusiness always included)
 *
 * @example
 * <SEOHead
 *   title="Solar Panel Installation Ko Phangan"
 *   description="Bustan Energy installs residential and commercial solar..."
 *   path="/services"
 *   lang="en"
 *   schema={serviceSchema('en')}
 * />
 */
export function SEOHead({
  title,
  description,
  path,
  lang,
  schema,
  ogImage,
  isArticle = false,
  robots = 'index, follow',
}: SEOHeadProps) {
  // Canonical is the language-specific URL for this render
  const canonicalUrl = lang === 'th' ? `${BASE_URL}/th${path}` : `${BASE_URL}${path}`
  const enUrl = `${BASE_URL}${path}`
  const thUrl = `${BASE_URL}/th${path}`

  const pageTitle = `${title} | Bustan Energy`
  const ogImageUrl = ogImage ?? DEFAULT_OG_IMAGE
  const ogLocale = lang === 'th' ? 'th_TH' : 'en_US'
  const ogType = isArticle ? 'article' : 'website'

  // Always inject LocalBusiness; merge with any page-specific schemas
  const localBusiness = localBusinessSchema(lang)
  const extraSchemas = Array.isArray(schema) ? schema : schema ? [schema] : []
  const allSchemas = [localBusiness, ...extraSchemas]
  // Single schema → emit as object; multiple → emit as @graph array for cleanliness
  const schemaOutput =
    allSchemas.length === 1
      ? allSchemas[0]
      : {
          '@context': 'https://schema.org',
          '@graph': allSchemas,
        }

  return (
    <Helmet>
      {/* Document language */}
      <html lang={lang === 'th' ? 'th' : 'en'} />

      {/* Core meta */}
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />

      {/* Canonical + hreflang */}
      <link rel="canonical" href={canonicalUrl} />
      <link rel="alternate" hrefLang="en" href={enUrl} />
      <link rel="alternate" hrefLang="th" href={thUrl} />
      <link rel="alternate" hrefLang="x-default" href={enUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="Bustan Energy" />
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />

      {/* Twitter / X Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImageUrl} />

      {/* JSON-LD structured data */}
      <script type="application/ld+json">{JSON.stringify(schemaOutput, null, 0)}</script>
    </Helmet>
  )
}
