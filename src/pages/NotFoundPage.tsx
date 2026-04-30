import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Home, Sun, Phone } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage'
import { SEOHead } from '../components/seo/SEOHead'

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

export default function NotFoundPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const { langPath } = useLanguage()

  return (
    <>
      <SEOHead
        title="Page Not Found"
        description="The page you are looking for does not exist. Return to TM Energy homepage or explore our solar energy services on Ko Phangan."
        path="/404"
        lang="en"
        robots="noindex, nofollow"
      />

      <div className="min-h-screen bg-[var(--color-dark)] flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-6 text-center py-32">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="space-y-8"
          >
            <motion.div variants={fadeUp}>
              <span className="text-[var(--color-gold)] font-bold text-8xl md:text-9xl font-[family-name:var(--font-serif)]">
                404
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-[family-name:var(--font-serif)] text-3xl md:text-4xl text-white"
            >
              Page Not Found
            </motion.h1>

            <motion.p variants={fadeUp} className="text-white/50 text-lg leading-relaxed max-w-lg mx-auto">
              The page you are looking for does not exist or has been moved. Let us help you find what you need.
            </motion.p>

            <motion.div
              variants={stagger}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4"
            >
              <motion.div variants={fadeUp}>
                <Link
                  to={langPath('/')}
                  className="flex flex-col items-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-[var(--color-gold)]/30 hover:-translate-y-1 transition-all duration-300"
                >
                  <Home className="w-6 h-6 text-[var(--color-gold)]" />
                  <span className="text-white text-sm font-semibold">Homepage</span>
                </Link>
              </motion.div>
              <motion.div variants={fadeUp}>
                <Link
                  to={langPath('/services')}
                  className="flex flex-col items-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-[var(--color-gold)]/30 hover:-translate-y-1 transition-all duration-300"
                >
                  <Sun className="w-6 h-6 text-[var(--color-gold)]" />
                  <span className="text-white text-sm font-semibold">Our Services</span>
                </Link>
              </motion.div>
              <motion.div variants={fadeUp}>
                <Link
                  to={langPath('/contact')}
                  className="flex flex-col items-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-[var(--color-gold)]/30 hover:-translate-y-1 transition-all duration-300"
                >
                  <Phone className="w-6 h-6 text-[var(--color-gold)]" />
                  <span className="text-white text-sm font-semibold">Contact Us</span>
                </Link>
              </motion.div>
            </motion.div>

            <motion.div variants={fadeUp} className="pt-4">
              <Link
                to={langPath('/')}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--color-gold)] text-[var(--color-dark)] font-semibold hover:bg-[var(--color-gold-light)] transition-colors duration-200"
              >
                Go to Homepage
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </>
  )
}
