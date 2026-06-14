import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Sun,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { SEOHead } from '../../components/seo/SEOHead'
import { useLanguage } from '../../i18n/useLanguage'
import { SEO_PAGES, type SeoPage } from '../../content/seoPages'

const WA = 'https://wa.me/66946692011'

/**
 * Generic, content-driven SEO landing page. One component renders every
 * keyword/location page from the `SEO_PAGES` config (EN + TH). Standalone
 * route (own <main>), so it carries its own sticky WhatsApp.
 */
export default function SeoLandingPage({ page }: { page: SeoPage }) {
  const { lang, langPath } = useLanguage()
  const c = lang === 'th' ? page.th : page.en
  const ctaHref = langPath(page.ctaHref)

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: c.metaTitle,
    description: c.metaDescription,
    provider: { '@type': 'LocalBusiness', name: 'Bustan Energy' },
    areaServed: page.areaServed,
    serviceType: page.serviceType,
  }

  return (
    <div className="bustan-home overflow-hidden bg-[var(--bustan-paper)] text-ink">
      <SEOHead
        title={c.metaTitle}
        description={c.metaDescription}
        path={`/${page.slug}`}
        lang={lang}
        ogImage="https://bustan-energy.com/assets/images/strategy-01-aerial.png"
        schema={serviceSchema}
      />

      {/* HERO */}
      <section className="relative isolate px-6 pb-16 pt-24 md:pb-20 md:pt-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_10%,rgba(242,184,75,0.28),transparent_30%),linear-gradient(140deg,var(--bustan-grove),#17362f_56%,#10241f)]" />
        <div
          className="absolute inset-0 -z-10 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,244,226,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,244,226,.3) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
          }}
        />
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold">
            <Sun size={16} strokeWidth={1.5} aria-hidden />
            {c.badge}
          </div>
          <h1 className="mx-auto max-w-3xl font-serif text-4xl leading-[1.05] tracking-[-0.04em] text-shell md:text-6xl">
            {c.h1}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-shell/82">
            {c.sub}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to={ctaHref}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gold px-7 py-4 font-semibold text-grove shadow-xl shadow-gold/20 transition hover:-translate-y-0.5"
            >
              {c.ctaLabel}
              <ArrowRight size={18} strokeWidth={1.5} aria-hidden />
            </Link>
            <a
              href={WA}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-shell/30 bg-shell/10 px-7 py-4 font-semibold text-shell transition hover:bg-shell/16"
            >
              <MessageCircle size={18} strokeWidth={1.5} aria-hidden />
              WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="px-6 py-14 md:py-16">
        <p className="mx-auto max-w-3xl text-center text-lg leading-8 text-ink/75">
          {c.intro}
        </p>
      </section>

      {/* SECTIONS */}
      <section className="px-6 pb-4">
        <div className="mx-auto grid max-w-5xl gap-5">
          {c.sections.map((s) => (
            <div
              key={s.h}
              className="rounded-[2rem] border border-grove/12 bg-white/85 p-7 shadow-sm shadow-grove/5 md:p-9"
            >
              <h2 className="font-serif text-2xl tracking-tight text-grove md:text-3xl">{s.h}</h2>
              <p className="mt-3 leading-8 text-ink/72">{s.p}</p>
              {s.bullets && s.bullets.length > 0 && (
                <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                  {s.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-2 rounded-xl bg-[var(--bustan-paper)] px-4 py-3 text-sm font-medium text-grove"
                    >
                      <CheckCircle2 size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-ocean" aria-hidden />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ (no FAQPage schema — Google restricts rich results to gov/health) */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-center font-serif text-3xl tracking-tight text-grove md:text-4xl">
            {lang === 'th' ? 'คำถามที่พบบ่อย' : 'Frequently asked questions'}
          </h2>
          <div className="grid gap-3">
            {c.faq.map((item, i) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-grove/12 bg-white/90 p-5"
                open={i === 0}
              >
                <summary className="cursor-pointer list-none text-lg font-semibold text-grove">
                  {item.q}
                </summary>
                <p className="mt-3 leading-7 text-ink/68">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* RELATED LINKS — internal linking for crawl + authority flow */}
      <section className="px-6 pb-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-ocean">
            {lang === 'th' ? 'อ่านเพิ่มเติม' : 'Explore more'}
          </h2>
          <div className="flex flex-wrap gap-2">
            {SEO_PAGES.filter((p) => p.slug !== page.slug)
              .slice(0, 6)
              .map((p) => {
                const lc = lang === 'th' ? p.th : p.en
                return (
                  <Link
                    key={p.slug}
                    to={langPath(`/${p.slug}`)}
                    className="rounded-full border border-grove/15 bg-white/80 px-4 py-2 text-sm font-medium text-grove transition hover:bg-white"
                  >
                    {lc.linkLabel}
                  </Link>
                )
              })}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 pb-24 pt-8">
        <div className="mx-auto grid max-w-7xl items-center gap-8 rounded-[2.5rem] bg-[linear-gradient(135deg,var(--bustan-grove),#132d27)] p-8 text-shell md:grid-cols-[1.2fr_.8fr] md:p-12">
          <div>
            <h2 className="font-serif text-3xl leading-tight tracking-tight md:text-5xl">{c.ctaTitle}</h2>
            <p className="mt-4 text-lg leading-8 text-shell/82">{c.ctaSub}</p>
          </div>
          <Link
            to={ctaHref}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gold px-7 py-4 font-semibold text-grove shadow-xl shadow-black/10 transition hover:-translate-y-0.5"
          >
            {c.ctaLabel}
            <ArrowRight size={18} strokeWidth={1.5} aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  )
}
