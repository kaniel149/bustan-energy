import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Home, Sun, Phone } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage'
import { SEOHead } from '../components/seo/SEOHead'
import { Button } from '../components/ui/Button'
import { fadeUp, heroStagger, cardHover, arrowSlide, IconTile, WHATSAPP_URL } from './services/shared'

const quickLinks = [
  { to: '/', icon: Home, label: 'Homepage' },
  { to: '/services', icon: Sun, label: 'Our Services' },
  { to: '/contact', icon: Phone, label: 'Contact Us' },
]

export default function NotFoundPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const { langPath } = useLanguage()

  return (
    <>
      <SEOHead
        title="Page Not Found"
        description="The page you are looking for does not exist. Return to Bustan Energy homepage or explore our solar energy services on Ko Phangan."
        path="/404"
        lang="en"
        robots="noindex, nofollow"
      />

      <div className="relative min-h-screen overflow-hidden bg-[var(--bustan-paper)] text-ink flex items-center justify-center">
        {/* Soft lagoon-mist wash, fading into the warm paper canvas */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-mist/55 via-mist/20 to-transparent"
        />

        <div className="relative max-w-2xl mx-auto px-6 text-center py-32">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={heroStagger}
            className="space-y-8"
          >
            <motion.div variants={fadeUp}>
              <span className="font-serif text-8xl md:text-9xl leading-none text-ocean">
                404
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-serif text-display-sm md:text-display-md tracking-tight text-ink"
            >
              Page Not Found
            </motion.h1>

            <motion.p variants={fadeUp} className="text-ink/74 text-lg leading-relaxed max-w-lg mx-auto">
              The page you are looking for does not exist or has been moved. Let us help you find what you need.
            </motion.p>

            <motion.div
              variants={heroStagger}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4"
            >
              {quickLinks.map(({ to, icon: Icon, label }) => (
                <motion.div key={to} variants={fadeUp}>
                  {/* Hover transforms live on the plain Link (never the motion element) */}
                  <Link
                    to={langPath(to)}
                    className={`group flex flex-col items-center gap-3 rounded-card border border-grove/14 bg-shell/76 p-6 shadow-soft hover:border-ocean/30 ${cardHover}`}
                  >
                    <IconTile className="h-11 w-11">
                      <Icon size={20} strokeWidth={1.5} aria-hidden />
                    </IconTile>
                    <span className="text-ink text-sm font-semibold">{label}</span>
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button variant="primary" size="lg" to={langPath('/')} className="group w-full sm:w-auto">
                Go to Homepage
                <ArrowRight size={18} className={arrowSlide} aria-hidden />
              </Button>
              <Button
                variant="whatsapp"
                size="lg"
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
              >
                WhatsApp Us
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </>
  )
}
