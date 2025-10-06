// App.tsx - Updated version
import { SalesProvider } from './context/SalesContext'
import { ExpensesProvider } from './context/ExpensesContext'
import BusinessAnalyticsPage from './pages/BusinessAnalyticsPage'
import { IngredientsProvider } from './context/IngredientsContext'
import { Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar'
import { ProductsProvider } from './context/ProductsContext'
import { PurchasesProvider } from './context/PurchasesContext'
import { CostAnalysisPage } from './pages/CostAnalysisPage'
import ProductsPage from './pages/ProductsPage'
import PurchasesPage from './pages/PurchasesPage'
import SalesTrackingPage from './pages/SalesTrackingPage'
import StockPage from './pages/StockPage'
import { SettingsProvider } from './context/SettingContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { UserProfileProvider } from './context/UserProfileContext'
import { InvitationProvider } from './context/InvitationContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminPage from './pages/AdminPage'
import ProfilePage from './pages/ProfilePage'

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
                      <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route
                          path="/*"
                          element={
                            <ProtectedRoute>
                              <AppContent />
                            </ProtectedRoute>
                          }
                        />
                      </Routes>
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