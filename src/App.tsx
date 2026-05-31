import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { UserProfileProvider } from './context/UserProfileContext'
import { InvitationProvider } from './context/InvitationContext'
import LoginPage from './pages/admin/LoginPage'
import RegisterPage from './pages/RegisterPage'
import LandingPage from './pages/landing/LandingPage'
import SuccessPage from './pages/SuccessPage'
import ProtectedRoute from './components/web/ProtectedRoute'
import { lazy, Suspense } from 'react'
import OrderPage from './pages/orders/OrderPage'
import CheckoutPage from './pages/orders/CheckoutPage'
import CookieBanner from './components/web/CookieBanner'
import { CateringPage } from './pages/catering/CateringPage'
import { TermsConditions } from './pages/legal/TermsConditions'
import { PrivacyPolicy } from './pages/legal/PrivacyPolicy'
import { CookiesPolicy } from './pages/legal/CookiesPolicy'
import { EULA } from './components/web/EULAPolicies'
import { GlobalPromoBanner } from './pages/landing/components/GlobalPromoBanner'
import GiftCardBalancePage from './pages/GiftCardBalancePage'

const BookingPage = lazy(() => import('./pages/booking/BookingPage'))
const SalesTrackingPage = lazy(() => import('./pages/admin/SalesTrackingPage'))
const PurchasesPage = lazy(() => import('./pages/admin/PurchasesPage'))
const StockPage = lazy(() => import('./pages/admin/StockPage'))
const ProductsPage = lazy(() => import('./pages/admin/ProductsPage'))
const CostAnalysisPage = lazy(() => import('./pages/admin/CostAnalysisPage'))
const BusinessAnalyticsPage = lazy(() => import('./pages/admin/BusinessAnalyticsPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const ProfilePage = lazy(() => import('./pages/admin/ProfilePage'))
const NavBar = lazy(() => import('./components/web/NavBar'))
const AdminProviders = lazy(() => import('./components/AdminProviders'))
const ClientLogin = lazy(() => import('./pages/client_hub/ClientLoginPage'))
const ClientRegistration = lazy(() => import('./pages/client_hub/ClientRegistrationPage'))
const ClientDashboard = lazy(() => import('./pages/client_hub/ClientDashboard'))
const PayrollPage = lazy(() => import('./pages/admin/PayrollPage'))
const BookingsPage = lazy(() => import('./pages/admin/BookingsPage'))
const GiftCardsPage = lazy(() => import('./pages/admin/GiftCardsPage'))
const RewardsPage = lazy(() => import('./pages/admin/RewardsPage'))
const ClientsPage = lazy(() => import('./pages/admin/ClientsPage'))

const LoadingSpinner = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="text-lg font-light text-gray-600">Loading...</div>
  </div>
)

function AppContent() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {user && (
        <Suspense fallback={<div>Loading navigation...</div>}>
          <NavBar />
        </Suspense>
      )}

      <main className="container mx-auto p-4">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/sales-tracking" element={<SalesTrackingPage />} />
            <Route path="/dashboard" element={<SalesTrackingPage />} />
            <Route path="/purchases" element={<PurchasesPage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/cost-analysis" element={<CostAnalysisPage />} />
            <Route path="/business-analytics" element={<BusinessAnalyticsPage />} />
            <Route path="/payroll" element={<PayrollPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/gift-cards" element={<GiftCardsPage />} />
            <Route path="/rewards" element={<RewardsPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/kitchen" element={<Navigate to="/dashboard" replace />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

function PublicRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/order" element={<OrderPage />} />
      <Route path="/menu" element={<OrderPage />} />
      <Route
        path="/booking"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <BookingPage />
          </Suspense>
        }
      />
      <Route path="/reservations" element={<Navigate to="/booking" replace />} />
      <Route path="/admin-login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/checkout/success" element={<SuccessPage />} />
      <Route path="/gift-card/:code" element={<GiftCardBalancePage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/catering" element={<CateringPage />} />
      <Route path="/eula" element={<EULA />} />
      <Route path="/policies" element={<PrivacyPolicy />} />

      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/cookies" element={<CookiesPolicy />} />
      <Route path="/cookies-policy" element={<CookiesPolicy />} />
      <Route path="/terms" element={<TermsConditions />} />
      <Route path="/terms-conditions" element={<TermsConditions />} />

      <Route
        path="/client-login"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <ClientLogin />
          </Suspense>
        }
      />

      <Route
        path="/client-register"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <ClientRegistration />
          </Suspense>
        }
      />

      <Route
        path="/client-dashboard"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <ClientDashboard />
          </Suspense>
        }
      />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <AdminProviders>
                <AppContent />
              </AdminProviders>
            </Suspense>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function AppShell() {
  const location = useLocation()

  const hidePromoBanner =
    location.pathname.startsWith('/admin') ||
    location.pathname === '/admin-login' ||
    location.pathname === '/register' ||
    location.pathname === '/checkout/success'

  return (
    <>
      {!hidePromoBanner && <GlobalPromoBanner />}
      <PublicRoutes />
      <CookieBanner />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <InvitationProvider>
        <UserProfileProvider>
          <AppShell />
        </UserProfileProvider>
      </InvitationProvider>
    </AuthProvider>
  )
}
