import { SalesProvider } from './context/SalesContext'
import { ExpensesProvider } from './context/ExpensesContext'
import BusinessAnalyticsPage from './pages/admin/BusinessAnalyticsPage'
import { IngredientsProvider } from './context/IngredientsContext'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProductsProvider } from './context/ProductsContext'
import { PurchasesProvider } from './context/PurchasesContext'
import { CostAnalysisPage } from './pages/admin/CostAnalysisPage'
import ProductsPage from './pages/admin/ProductsPage'
import PurchasesPage from './pages/admin/PurchasesPage'
import SalesTrackingPage from './pages/admin/SalesTrackingPage'
import StockPage from './pages/admin/StockPage'
import { SettingsProvider } from './context/SettingContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/admin/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { UserProfileProvider } from './context/UserProfileContext'
import { InvitationProvider } from './context/InvitationContext'
import AdminPage from './pages/AdminPage'
import ProfilePage from './pages/ProfilePage'
import LandingPage from './pages/landing/LandingPage'
import OrderPage from './pages/OrderPage'
import CheckoutPage from './pages/CheckoutPage'
import NavBar from './components/web/NavBar'
import ProtectedRoute from './components/web/ProtectedRoute'

// Main app content that requires authentication
function AppContent() {
  const { user } = useAuth()

  console.log('🎯 AppContent rendering, user:', user?.email)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* NavBar should always show when user is authenticated */}
      {user && <NavBar />}
      <main className="container mx-auto p-4">
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
      <Route path="/admin/*" element={
        <ProtectedRoute>
          <AppContent />
        </ProtectedRoute>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <InvitationProvider>
        <UserProfileProvider>
          <IngredientsProvider>
            <SettingsProvider>
              <ProductsProvider>
                <PurchasesProvider>
                  <SalesProvider>
                    <ExpensesProvider>
                      <PublicRoutes />
                    </ExpensesProvider>
                  </SalesProvider>
                </PurchasesProvider>
              </ProductsProvider>
            </SettingsProvider>
          </IngredientsProvider>
        </UserProfileProvider>
      </InvitationProvider>
    </AuthProvider>
  )
}