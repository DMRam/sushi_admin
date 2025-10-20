import { useIngredients } from '../../context/IngredientsContext'
import { UserRole, useUserProfile } from '../../context/UserProfileContext'

export default function StockPage() {
  const { ingredients, loading } = useIngredients()
  const { userProfile } = useUserProfile()

  if (loading) return <div className="text-center py-8 font-light text-gray-500">Loading inventory...</div>

  // Format numbers to avoid scientific notation
  const formatStockQuantity = (quantity: number, unit: string): string => {
    if (quantity === 0) return `0 ${unit}`

    // If it's a very large number, format it properly
    if (quantity >= 1000) {
      return `${quantity.toLocaleString()} ${unit}`
    }

    // For normal numbers, show 2 decimal places
    return `${quantity.toFixed(2)} ${unit}`
  }

  const formatCurrency = (amount: number): string => {
    if (amount === 0) return '$0.00'
    if (amount >= 1000) {
      return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return `$${amount.toFixed(2)}`
  }

  const getStockStatus = (ingredient: any) => {
    if (ingredient.currentStock === 0) return { status: 'out-of-stock', color: 'bg-red-100 text-red-800 border border-red-200' }
    if (ingredient.currentStock <= ingredient.minimumStock) return { status: 'low-stock', color: 'bg-yellow-100 text-yellow-800 border border-yellow-200' }
    return { status: 'in-stock', color: 'bg-green-100 text-green-800 border border-green-200' }
  }

  const totalInventoryValue = ingredients.reduce((total, ing) => {
    return total + (ing.currentStock * ing.pricePerKg)
  }, 0)

  const lowStockCount = ingredients.filter(ing => ing.currentStock > 0 && ing.currentStock <= ing.minimumStock).length
  const outOfStockCount = ingredients.filter(ing => ing.currentStock === 0).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-gray-900 tracking-wide">Inventory Management</h1>
          <p className="text-gray-500 font-light mt-2">Track stock levels and ingredient values</p>
        </div>

        {/* Inventory Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-500 tracking-wide">TOTAL INGREDIENTS</p>
                <p className="text-2xl font-light text-gray-900 mt-2">{ingredients.length}</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-sm flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-500 tracking-wide">INVENTORY VALUE</p>
                <p className="text-2xl font-light text-green-600 mt-2">{formatCurrency(totalInventoryValue)}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-sm flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-500 tracking-wide">LOW STOCK</p>
                <p className="text-2xl font-light text-yellow-600 mt-2">{lowStockCount}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-sm flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-500 tracking-wide">OUT OF STOCK</p>
                <p className="text-2xl font-light text-red-600 mt-2">{outOfStockCount}</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-sm flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Ingredients Stock List */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-light text-gray-900 tracking-wide">CURRENT INVENTORY</h2>
            <p className="text-gray-500 font-light text-sm mt-1">Stock levels based on recent purchases and sales</p>
          </div>

          {/* Mobile Cards View */}
          <div className="block lg:hidden">
            {ingredients.length === 0 ? (
              <div className="text-center py-8 text-gray-500 font-light">
                No ingredients in inventory. Record your first purchase to get started.
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {ingredients.map((ingredient) => {
                  const stockValue = ingredient.currentStock * ingredient.pricePerKg
                  const stockStatus = getStockStatus(ingredient)

                  return (
                    <div key={ingredient.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      {/* Header */}
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-light text-gray-900 text-lg">{ingredient.name}</h3>
                          <p className="text-sm text-gray-500 font-light capitalize">{ingredient.category}</p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-light rounded-sm ${stockStatus.color}`}>
                          {stockStatus.status === 'out-of-stock' ? 'OUT OF STOCK' :
                            stockStatus.status === 'low-stock' ? 'LOW STOCK' : 'IN STOCK'}
                        </span>
                      </div>

                      {/* Stock Information */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 font-light">Current Stock</p>
                          <p className="font-light text-gray-900">{formatStockQuantity(ingredient.currentStock, ingredient.unit)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-light">Min Stock</p>
                          <p className="font-light text-gray-900">{formatStockQuantity(ingredient.minimumStock, ingredient.unit)}</p>
                        </div>
                      </div>

                      {/* Pricing Information - Conditionally shown */}
                      {userProfile?.role !== UserRole.VIEWER && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 font-light">Price/kg</p>
                            <p className="font-light text-gray-900">{formatCurrency(ingredient.pricePerKg)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-light">Stock Value</p>
                            <p className="font-light text-gray-900">{formatCurrency(stockValue)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                    Ingredient
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                    Min Stock
                  </th>
                  {userProfile?.role !== UserRole.VIEWER && (
                    <>
                      <th className="px-6 py-4 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                        Price/kg
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                        Stock Value
                      </th>
                    </>
                  )}
                  <th className="px-6 py-4 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ingredients.map((ingredient) => {
                  const stockValue = ingredient.currentStock * ingredient.pricePerKg
                  const stockStatus = getStockStatus(ingredient)

                  return (
                    <tr key={ingredient.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-light text-gray-900">{ingredient.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 font-light capitalize">{ingredient.category}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-light text-gray-900">
                          {formatStockQuantity(ingredient.currentStock, ingredient.unit)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 font-light">
                          {formatStockQuantity(ingredient.minimumStock, ingredient.unit)}
                        </div>
                      </td>
                      {userProfile?.role !== UserRole.VIEWER && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-light text-gray-900">
                              {formatCurrency(ingredient.pricePerKg)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-light text-gray-900">
                              {formatCurrency(stockValue)}
                            </div>
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-light tracking-wide rounded-sm ${stockStatus.color}`}>
                          {stockStatus.status === 'out-of-stock' ? 'OUT OF STOCK' :
                            stockStatus.status === 'low-stock' ? 'LOW STOCK' : 'IN STOCK'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {ingredients.length === 0 && (
              <div className="text-center py-8 text-gray-500 font-light">
                No ingredients in inventory. Record your first purchase to get started.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}