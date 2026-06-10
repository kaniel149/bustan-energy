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
const CollierPortfolioPage = lazy(() => import('./pages/CollierPortfolioPage'))
const ResortSolarAssessmentPage = lazy(() => import('./pages/ResortSolarAssessmentPage'))

// Admin pages — lazy loaded, separate auth context
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const NewProposalPage = lazy(() => import('./pages/admin/NewProposalPage'))
const ProposalsListPage = lazy(() => import('./pages/admin/ProposalsListPage'))
const ProposalDetailPage = lazy(() => import('./pages/admin/ProposalDetailPage'))
const BOMPage = lazy(() => import('./pages/admin/BOMPage'))
const ProcurementPage = lazy(() => import('./pages/admin/ProcurementPage'))
const PEADrawingsPage = lazy(() => import('./pages/admin/PEADrawingsPage'))
const SuppliersPage = lazy(() => import('./pages/admin/SuppliersPage'))
const MonitoringPage = lazy(() => import('./pages/admin/MonitoringPage'))

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
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboardPage />} />
                  <Route path="proposals" element={<ProposalsListPage />} />
                  <Route path="proposals/new" element={<NewProposalPage />} />
                  <Route path="proposals/:ref/edit" element={<NewProposalPage />} />
                  <Route path="proposals/:ref" element={<ProposalDetailPage />} />
                  <Route path="bom" element={<BOMPage />} />
                  <Route path="procurement" element={<ProcurementPage />} />
                  <Route path="suppliers" element={<SuppliersPage />} />
                  <Route path="pea" element={<PEADrawingsPage />} />
                  <Route path="monitoring" element={<MonitoringPage />} />
                </Route>
                <Route path="/crm" element={<ErrorBoundary><CRMPage /></ErrorBoundary>}>
                  <Route index element={<CRMDashboard />} />
                  <Route path="pipeline" element={<CRMPipeline />} />
                  <Route path="leads/:id" element={<LeadDetail />} />
                </Route>
                {/* Colliers Thailand Solar Portfolio — read-only sales demo, no auth */}
                <Route path="/colliers" element={<CollierPortfolioPage />} />
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
              {/* Admin routes */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="proposals" element={<ProposalsListPage />} />
                <Route path="proposals/new" element={<NewProposalPage />} />
                <Route path="proposals/:ref/edit" element={<NewProposalPage />} />
                <Route path="proposals/:ref" element={<ProposalDetailPage />} />
                <Route path="bom" element={<BOMPage />} />
                <Route path="procurement" element={<ProcurementPage />} />
                <Route path="suppliers" element={<SuppliersPage />} />
                <Route path="pea" element={<PEADrawingsPage />} />
                <Route path="monitoring" element={<MonitoringPage />} />
              </Route>

              {/* CRM routes (also accessible via /crm on main domain) */}
              <Route path="/crm" element={<ErrorBoundary><CRMPage /></ErrorBoundary>}>
                <Route index element={<CRMDashboard />} />
                <Route path="pipeline" element={<CRMPipeline />} />
                <Route path="leads/:id" element={<LeadDetail />} />
              </Route>

              {/* Preview scroll animation */}
              <Route path="/preview-scroll" element={<PreviewScroll />} />

              {/* Colliers Thailand Solar Portfolio — read-only sales demo, no auth */}
              <Route path="/colliers" element={<CollierPortfolioPage />} />

              {/* Bustan resort lead magnet funnel */}
              <Route path="/resort-solar-assessment" element={<ResortSolarAssessmentPage />} />
              <Route path="/th/resort-solar-assessment" element={<ResortSolarAssessmentPage />} />

              {/* Internal platform — language set by URL prefix (en/th/he, RTL for he) */}
              <Route path="/platform" element={<PlatformPage />} />
              <Route path="/th/platform" element={<PlatformPage />} />
              <Route path="/he/platform" element={<PlatformPage />} />

              {/* Thai routes */}
              <Route path="/th" element={<Layout />}>
                {PageRoutes()}
              </Route>

              {/* Hebrew routes (RTL; marketing falls back to English where untranslated) */}
              <Route path="/he" element={<Layout />}>
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
