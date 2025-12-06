import { useMemo } from 'react'
import { useIngredients } from '../../../../context/IngredientsContext'
import { usePurchases } from '../../../../context/PurchasesContext'

interface PurchaseStatsProps {
  isMobile?: boolean;
}

export const PurchaseStats = ({ isMobile = false }: PurchaseStatsProps) => {
  const { purchases, getRecentPurchases } = usePurchases()
  const { ingredients } = useIngredients()

  const stats = useMemo(() => {
    const recentPurchases = getRecentPurchases(30) // Last 30 days
    const totalSpent = purchases.reduce((sum, purchase) => sum + purchase.totalCost, 0)
    const recentSpent = recentPurchases.reduce((sum, purchase) => sum + purchase.totalCost, 0)

    // Spending by category
    const spendingByCategory = ingredients.reduce((acc, ingredient) => {
      const categoryPurchases = purchases.filter(p => p.ingredientId === ingredient.id)
      const categoryTotal = categoryPurchases.reduce((sum, p) => sum + p.totalCost, 0)
      
      if (!acc[ingredient.category]) {
        acc[ingredient.category] = 0
      }
      acc[ingredient.category] += categoryTotal
      return acc
    }, {} as Record<string, number>)

    // Spending by supplier
    const spendingBySupplier = purchases.reduce((acc, purchase) => {
      if (!acc[purchase.supplier]) {
        acc[purchase.supplier] = 0
      }
      acc[purchase.supplier] += purchase.totalCost
      return acc
    }, {} as Record<string, number>)

    // Monthly spending (last 6 months)
    const monthlySpending = Array.from({ length: 6 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const month = date.toLocaleString('en-US', { month: 'short', year: 'numeric' })
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      
      const monthlyTotal = purchases
        .filter(p => {
          const purchaseDate = new Date(p.purchaseDate)
          return purchaseDate >= monthStart && purchaseDate <= monthEnd
        })
        .reduce((sum, p) => sum + p.totalCost, 0)
      
      return { month, total: monthlyTotal }
    }).reverse()

    // Top ingredients by spending
    const topIngredients = ingredients.map(ingredient => {
      const ingredientPurchases = purchases.filter(p => p.ingredientId === ingredient.id)
      const totalSpent = ingredientPurchases.reduce((sum, p) => sum + p.totalCost, 0)
      const lastPurchase = ingredientPurchases
        .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())[0]
      
      return {
        name: ingredient.name,
        totalSpent,
        lastPurchasePrice: lastPurchase?.pricePerKg || ingredient.pricePerKg,
        purchaseCount: ingredientPurchases.length
      }
    })
    .filter(ing => ing.totalSpent > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)

    return {
      totalSpent,
      recentSpent,
      totalPurchases: purchases.length,
      recentPurchases: recentPurchases.length,
      spendingByCategory,
      spendingBySupplier,
      monthlySpending,
      topIngredients
    }
  }, [purchases, ingredients, getRecentPurchases])

  return (
    <div className={`space-y-${isMobile ? '4' : '6'}`}>
      {/* Summary Cards */}
      <div className={`grid gap-${isMobile ? '3' : '6'} ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-4'}`}>
        <div className={`bg-white border border-gray-200 rounded-sm ${isMobile ? 'p-3' : 'p-6'}`}>
          <div className="flex items-center">
            <div className="flex-1">
              <p className={`text-gray-600 ${isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}`}>
                Total Spent
              </p>
              <p className={`font-bold text-gray-900 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                ${stats.totalSpent.toFixed(2)}
              </p>
            </div>
            <div className="text-blue-600">
              <svg className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className={`bg-white border border-gray-200 rounded-sm ${isMobile ? 'p-3' : 'p-6'}`}>
          <div className="flex items-center">
            <div className="flex-1">
              <p className={`text-gray-600 ${isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}`}>
                Last 30 Days
              </p>
              <p className={`font-bold text-green-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                ${stats.recentSpent.toFixed(2)}
              </p>
            </div>
            <div className="text-green-600">
              <svg className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className={`bg-white border border-gray-200 rounded-sm ${isMobile ? 'p-3' : 'p-6'}`}>
          <div className="flex items-center">
            <div className="flex-1">
              <p className={`text-gray-600 ${isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}`}>
                Total Purchases
              </p>
              <p className={`font-bold text-purple-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                {stats.totalPurchases}
              </p>
            </div>
            <div className="text-purple-600">
              <svg className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className={`bg-white border border-gray-200 rounded-sm ${isMobile ? 'p-3' : 'p-6'}`}>
          <div className="flex items-center">
            <div className="flex-1">
              <p className={`text-gray-600 ${isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}`}>
                Recent Purchases
              </p>
              <p className={`font-bold text-orange-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                {stats.recentPurchases}
              </p>
            </div>
            <div className="text-orange-600">
              <svg className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className={`grid gap-${isMobile ? '4' : '6'} ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {/* Spending by Category */}
        <div className={`bg-white border border-gray-200 rounded-sm ${isMobile ? 'p-4' : 'p-6'}`}>
          <h3 className={`font-semibold text-gray-900 mb-${isMobile ? '3' : '4'} ${isMobile ? 'text-base' : 'text-lg'}`}>
            Spending by Category
          </h3>
          <div className={`space-y-${isMobile ? '2' : '3'}`}>
            {Object.entries(stats.spendingByCategory)
              .sort(([,a], [,b]) => b - a)
              .map(([category, amount]) => (
                <div key={category} className={`flex items-center justify-between ${isMobile ? 'py-1' : ''}`}>
                  <span className={`text-gray-700 capitalize ${isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}`}>
                    {isMobile && category.length > 12 ? `${category.substring(0, 12)}...` : category}
                  </span>
                  <span className={`font-bold text-green-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    ${amount.toFixed(2)}
                  </span>
                </div>
              ))
            }
            {Object.keys(stats.spendingByCategory).length === 0 && (
              <div className={`text-center text-gray-500 ${isMobile ? 'py-3 text-sm' : 'py-4'}`}>
                No purchase data available by category
              </div>
            )}
          </div>
        </div>

        {/* Top Ingredients */}
        <div className={`bg-white border border-gray-200 rounded-sm ${isMobile ? 'p-4' : 'p-6'}`}>
          <h3 className={`font-semibold text-gray-900 mb-${isMobile ? '3' : '4'} ${isMobile ? 'text-base' : 'text-lg'}`}>
            Top Ingredients by Spending
          </h3>
          <div className={`space-y-${isMobile ? '2' : '3'}`}>
            {stats.topIngredients.map((ingredient, index) => (
              <div key={ingredient.name} className={`flex items-center justify-between ${isMobile ? 'py-1' : ''}`}>
                <div className={`flex items-center gap-${isMobile ? '2' : '3'} ${isMobile ? 'flex-1 min-w-0' : ''}`}>
                  <span className={`text-gray-500 ${isMobile ? 'text-xs font-medium w-4' : 'text-xs font-medium w-6'}`}>
                    #{index + 1}
                  </span>
                  <div className={`${isMobile ? 'min-w-0' : ''}`}>
                    <div className={`font-medium text-gray-900 ${isMobile ? 'text-xs truncate' : 'text-sm'}`}>
                      {ingredient.name}
                    </div>
                    <div className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                      {ingredient.purchaseCount} purchase{ingredient.purchaseCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className={`text-right ${isMobile ? 'shrink-0 ml-2' : ''}`}>
                  <div className={`font-bold text-green-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    ${ingredient.totalSpent.toFixed(2)}
                  </div>
                  <div className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                    ${ingredient.lastPurchasePrice.toFixed(2)}/kg
                  </div>
                </div>
              </div>
            ))}
            {stats.topIngredients.length === 0 && (
              <div className={`text-center text-gray-500 ${isMobile ? 'py-3 text-sm' : 'py-4'}`}>
                No ingredient purchase data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Spending */}
      <div className={`bg-white border border-gray-200 rounded-sm ${isMobile ? 'p-4' : 'p-6'}`}>
        <h3 className={`font-semibold text-gray-900 mb-${isMobile ? '3' : '4'} ${isMobile ? 'text-base' : 'text-lg'}`}>
          Monthly Spending (Last 6 Months)
        </h3>
        <div className={`grid gap-${isMobile ? '2' : '4'} ${isMobile ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-6'}`}>
          {stats.monthlySpending.map((monthData, _index) => (
            <div key={monthData.month} className="text-center">
              <div className={`font-medium text-gray-600 mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                {monthData.month}
              </div>
              <div className={`font-bold ${
                monthData.total > 0 ? 'text-green-600' : 'text-gray-400'
              } ${isMobile ? 'text-sm' : 'text-lg'}`}>
                ${monthData.total.toFixed(2)}
              </div>
              {monthData.total > 0 && (
                <div className={`mt-1 bg-green-100 rounded-full ${isMobile ? 'h-1.5' : 'h-2'}`}>
                  <div 
                    className="bg-green-600 rounded-full h-full"
                    style={{ 
                      width: `${(monthData.total / Math.max(...stats.monthlySpending.map(m => m.total || 1))) * 100}%` 
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Spending by Supplier */}
      <div className={`bg-white border border-gray-200 rounded-sm ${isMobile ? 'p-4' : 'p-6'}`}>
        <h3 className={`font-semibold text-gray-900 mb-${isMobile ? '3' : '4'} ${isMobile ? 'text-base' : 'text-lg'}`}>
          Spending by Supplier
        </h3>
        <div className={`space-y-${isMobile ? '2' : '3'}`}>
          {Object.entries(stats.spendingBySupplier)
            .sort(([,a], [,b]) => b - a)
            .slice(0, isMobile ? 5 : 10)
            .map(([supplier, amount]) => (
              <div key={supplier} className={`flex items-center justify-between ${isMobile ? 'py-1' : ''}`}>
                <span className={`font-medium text-gray-700 ${isMobile ? 'text-xs truncate flex-1' : 'text-sm'}`}>
                  {isMobile && supplier.length > 20 ? `${supplier.substring(0, 20)}...` : supplier}
                </span>
                <span className={`font-bold text-green-600 ${isMobile ? 'text-xs shrink-0 ml-2' : 'text-sm'}`}>
                  ${amount.toFixed(2)}
                </span>
              </div>
            ))
          }
          {Object.keys(stats.spendingBySupplier).length === 0 && (
            <div className={`text-center text-gray-500 ${isMobile ? 'py-3 text-sm' : 'py-4'}`}>
              No supplier data available
            </div>
          )}
        </div>
      </div>
    </div>
  )
}