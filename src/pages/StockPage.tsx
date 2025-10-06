
import { useIngredients } from '../context/IngredientsContext'
import { UserRole, useUserProfile } from '../context/UserProfileContext'

// In your StockPage, add better number formatting
export default function StockPage() {
  const { ingredients, loading } = useIngredients()
  const { userProfile } = useUserProfile()


  if (loading) return <div className="text-center py-8">Loading inventory...</div>

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
    if (ingredient.currentStock === 0) return { status: 'out-of-stock', color: 'bg-red-100 text-red-800' }
    if (ingredient.currentStock <= ingredient.minimumStock) return { status: 'low-stock', color: 'bg-yellow-100 text-yellow-800' }
    return { status: 'in-stock', color: 'bg-green-100 text-green-800' }
  }

  const totalInventoryValue = ingredients.reduce((total, ing) => {
    return total + (ing.currentStock * ing.pricePerKg)
  }, 0)

  return (
    <div className="space-y-6">
      {/* Inventory Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Total Ingredients</h3>
          <p className="text-2xl font-bold text-gray-900">{ingredients.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Inventory Value</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(totalInventoryValue)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Low Stock</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {ingredients.filter(ing => ing.currentStock > 0 && ing.currentStock <= ing.minimumStock).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Out of Stock</h3>
          <p className="text-2xl font-bold text-red-600">
            {ingredients.filter(ing => ing.currentStock === 0).length}
          </p>
        </div>
      </div>

      {/* Ingredients Stock List */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-medium text-gray-900">Current Inventory</h2>
          <p className="text-sm text-gray-600 mt-1">Stock levels based on recent purchases and sales</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ingredient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Min Stock
                </th>
                {
                  (userProfile?.role != UserRole.VIEWER && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price/kg
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock Value
                      </th>

                    </>
                  ))
                }
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ingredients.map((ingredient) => {
                const stockValue = ingredient.currentStock * ingredient.pricePerKg
                const stockStatus = getStockStatus(ingredient)

                return (
                  <tr key={ingredient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{ingredient.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 capitalize">{ingredient.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatStockQuantity(ingredient.currentStock, ingredient.unit)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatStockQuantity(ingredient.minimumStock, ingredient.unit)}
                      </div>
                    </td>
                    {(userProfile?.role != UserRole.VIEWER && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatCurrency(ingredient.pricePerKg)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(stockValue)}
                          </div>
                        </td>
                      </>))}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                        {stockStatus.status === 'out-of-stock' ? 'Out of Stock' :
                          stockStatus.status === 'low-stock' ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {ingredients.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No ingredients in inventory. Record your first purchase to get started.
          </div>
        )}
      </div>
    </div>
  )
}