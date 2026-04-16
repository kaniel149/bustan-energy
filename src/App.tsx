import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import Layout from './components/layout/Layout'
import { LanguageProvider } from './i18n/LanguageContext'
import { ErrorBoundary } from './components/ErrorBoundary'

const HomePage = lazy(() => import('./pages/HomePage'))
const ServicesPage = lazy(() => import('./pages/ServicesPage'))
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const BlogPage = lazy(() => import('./pages/BlogPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const PlatformPage = lazy(() => import('./pages/PlatformPage'))
const CRMPage = lazy(() => import('./pages/CRMPage'))
const CRMDashboard = lazy(() => import('./components/CRM/Dashboard'))
const CRMPipeline = lazy(() => import('./components/CRM/Pipeline'))
const LeadDetail = lazy(() => import('./components/CRM/LeadDetail'))
const PreviewScroll = lazy(() => import('./pages/PreviewScroll'))
const ResidentialSolarPage = lazy(() => import('./pages/services/ResidentialSolarPage'))
const CommercialSolarPage = lazy(() => import('./pages/services/CommercialSolarPage'))
const OffGridSolarPage = lazy(() => import('./pages/services/OffGridSolarPage'))
const MaintenancePage = lazy(() => import('./pages/services/MaintenancePage'))
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'))
const ToolsPage = lazy(() => import('./pages/ToolsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[var(--color-dark)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
        <span className="text-white/40 text-sm">Loading...</span>
      </div>
    </div>
  )
}

/** Shared page routes — used under both /  and /th */
function PageRoutes() {
  return (
    <>
      <Route index element={<HomePage />} />
      <Route path="services" element={<ServicesPage />} />
      <Route path="services/residential" element={<ResidentialSolarPage />} />
      <Route path="services/commercial" element={<CommercialSolarPage />} />
      <Route path="services/off-grid" element={<OffGridSolarPage />} />
      <Route path="services/maintenance" element={<MaintenancePage />} />
      <Route path="how-it-works" element={<HowItWorksPage />} />
      <Route path="pricing" element={<PricingPage />} />
      <Route path="projects" element={<ProjectsPage />} />
      <Route path="about" element={<AboutPage />} />
      <Route path="blog" element={<BlogPage />} />
      <Route path="blog/:slug" element={<BlogPostPage />} />
      <Route path="contact" element={<ContactPage />} />
      <Route path="tools" element={<ToolsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </>
  )
}

/** Detect if we're on the CRM subdomain */
const isCrmDomain = window.location.hostname === 'crm.energy-tm.com'

export default function App() {
  // crm.energy-tm.com → show platform with integrated views + CRM routes for deep links
  if (isCrmDomain) {
    return (
      <HelmetProvider>
        <BrowserRouter>
          <LanguageProvider>
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route path="/crm" element={<ErrorBoundary><CRMPage /></ErrorBoundary>}>
                  <Route index element={<CRMDashboard />} />
                  <Route path="pipeline" element={<CRMPipeline />} />
                  <Route path="leads/:id" element={<LeadDetail />} />
                </Route>
                <Route path="*" element={<PlatformPage />} />
              </Routes>
            </Suspense>
          </LanguageProvider>
        </BrowserRouter>
      </HelmetProvider>
    )
  }

  // energy-tm.com → marketing website
  return (
    <HelmetProvider>
      <BrowserRouter>
        <LanguageProvider>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              {/* CRM routes (also accessible via /crm on main domain) */}
              <Route path="/crm" element={<ErrorBoundary><CRMPage /></ErrorBoundary>}>
                <Route index element={<CRMDashboard />} />
                <Route path="pipeline" element={<CRMPipeline />} />
                <Route path="leads/:id" element={<LeadDetail />} />
              </Route>

              {/* Preview scroll animation */}
              <Route path="/preview-scroll" element={<PreviewScroll />} />

              {/* Internal platform */}
              <Route path="/platform" element={<PlatformPage />} />

              {/* Thai routes */}
              <Route path="/th" element={<Layout />}>
                {PageRoutes()}
              </Route>

              {/* English routes (default) */}
              <Route path="/" element={<Layout />}>
                {PageRoutes()}
              </Route>
            </Routes>
          </Suspense>
        </LanguageProvider>
      </BrowserRouter>
    </HelmetProvider>
  )
}
