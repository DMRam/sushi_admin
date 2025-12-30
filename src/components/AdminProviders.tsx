import { IngredientsProvider } from '../context/IngredientsContext'
import { SettingsProvider } from '../context/SettingContext'
import { ProductsProvider } from '../context/ProductsContext'
import { PurchasesProvider } from '../context/PurchasesContext'
import { SalesProvider } from '../context/SalesContext'
import { ExpensesProvider } from '../context/ExpensesContext'

interface AdminProvidersProps {
  children: React.ReactNode
}

export default function AdminProviders({ children }: AdminProvidersProps) {
  return (
    <IngredientsProvider>
      <SettingsProvider>
        <ProductsProvider>
          <PurchasesProvider>
            <SalesProvider>
              <ExpensesProvider>
                {children}
              </ExpensesProvider>
            </SalesProvider>
          </PurchasesProvider>
        </ProductsProvider>
      </SettingsProvider>
    </IngredientsProvider>
  )
}