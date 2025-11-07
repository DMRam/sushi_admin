import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { UserProfileProvider } from './context/UserProfileContext'
import { InvitationProvider } from './context/InvitationContext'
import LoginPage from './pages/admin/LoginPage'
import RegisterPage from './pages/RegisterPage'
import LandingPage from './pages/landing/LandingPage'
import OrderPage from './pages/OrderPage'
import CheckoutPage from './pages/CheckoutPage'
import SuccessPage from './pages/SuccessPage'
import ProtectedRoute from './components/web/ProtectedRoute'
import { lazy, Suspense } from 'react'
import ThemePreviewPage from './pages/ThemePreviewPage'
import { ThemeProvider } from './context/ThemeContext'

// Lazy load all admin components (assuming default exports)
const SalesTrackingPage = lazy(() => import('./pages/admin/SalesTrackingPage'))
const PurchasesPage = lazy(() => import('./pages/admin/PurchasesPage'))
const StockPage = lazy(() => import('./pages/admin/StockPage'))
const ProductsPage = lazy(() => import('./pages/admin/ProductsPage'))
const CostAnalysisPage = lazy(() => import('./pages/admin/CostAnalysisPage'))
const BusinessAnalyticsPage = lazy(() => import('./pages/admin/BusinessAnalyticsPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const ProfilePage = lazy(() => import('./pages/admin/ProfilePage'))
const NavBar = lazy(() => import('./components/web/NavBar'))

// Lazy load context providers
const AdminProviders = lazy(() => import('./components/AdminProviders'))

// Lazy load client auth pages
const ClientLogin = lazy(() => import('./pages/client_hub/ClientLoginPage'))
const ClientRegistration = lazy(() => import('./pages/client_hub/ClientRegistrationPage'))
const ClientDashboard = lazy(() => import('./pages/client_hub/ClientDashboard'))

// Loading component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-64">
    <div className="text-lg text-gray-600 font-light">Loading...</div>
  </div>
)

// Main app content that requires authentication
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
            <Route path="/purchases" element={<PurchasesPage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/cost-analysis" element={<CostAnalysisPage />} />
            <Route path="/business-analytics" element={<BusinessAnalyticsPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/" element={<Navigate to="/sales-tracking" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

// Public routes component
function PublicRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/order" element={<OrderPage />} />
      <Route path="/menu" element={<OrderPage />} />
      <Route path="/admin-login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/success" element={<SuccessPage />} />
      <Route path="/theme-preview" element={<ThemePreviewPage />} />


      {/* Client Auth Routes */}
      <Route path="/client-login" element={
        <Suspense fallback={<LoadingSpinner />}>
          <ClientLogin />
        </Suspense>
      } />
      <Route path="/client-register" element={
        <Suspense fallback={<LoadingSpinner />}>
          <ClientRegistration />
        </Suspense>
      } />
      <Route path="/client-dashboard" element={
        <Suspense fallback={<LoadingSpinner />}>
          <ClientDashboard />
        </Suspense>
      } />

      <Route path="/admin/*" element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminProviders>
              <AppContent />
            </AdminProviders>
          </Suspense>
        </ProtectedRoute>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <InvitationProvider>
          <UserProfileProvider>
            <PublicRoutes />
          </UserProfileProvider>
        </InvitationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}