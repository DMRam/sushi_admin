// Add these to your App.tsx
import { SalesProvider } from './context/SalesContext'
import { ExpensesProvider } from './context/ExpensesContext'
import BusinessAnalyticsPage from './pages/BusinessAnalyticsPage'
import { IngredientsProvider } from './context/IngredientsContext'
import { Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar'
import { ProductsProvider } from './context/ProductsContext'
import { PurchasesProvider } from './context/PurchasesContext'
import { CostAnalysisPage } from './pages/CostAnalysisPage'
import IngredientsPage from './pages/IngredientsPage'
import ProductsPage from './pages/ProductsPage'
import PurchasesPage from './pages/PurchasesPage'
import SalesTrackingPage from './pages/SalesTrackingPage'
import StockPage from './pages/StockPage'

// Update your App component to include the new providers
export default function App() {
  return (
    <IngredientsProvider>
      <ProductsProvider>
        <PurchasesProvider>
          <SalesProvider>
            <ExpensesProvider>
              <div className="min-h-screen bg-gray-50">
                <NavBar />
                <main className="container mx-auto p-4">
                  <Routes>
                    <Route path="/sales-tracking" element={<SalesTrackingPage />} />
                    <Route path="/purchases" element={<PurchasesPage />} />
                    <Route path="/ingredients" element={<IngredientsPage />} />
                    <Route path="/stock" element={<StockPage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/cost-analysis" element={<CostAnalysisPage />} />
                    <Route path="/business-analytics" element={<BusinessAnalyticsPage />} />
                    <Route path="/" element={<Navigate to="/ingredients" replace />} />
                  </Routes>
                </main>
              </div>
            </ExpensesProvider>
          </SalesProvider>
        </PurchasesProvider>
      </ProductsProvider>
    </IngredientsProvider>
  )
}