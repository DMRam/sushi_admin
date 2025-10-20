import { useState, useMemo } from 'react'
import { useIngredients } from '../../context/IngredientsContext'
import { UserRole, useUserProfile } from '../../context/UserProfileContext'

export default function StockPage() {
  const { ingredients, loading } = useIngredients()
  const { userProfile } = useUserProfile()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stockStatusFilter, setStockStatusFilter] = useState('all')

  // Get unique categories for filter
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(ingredients.map(ing => ing.category))]
    return uniqueCategories.sort()
  }, [ingredients])

  // Filter ingredients based on search and filters
  const filteredIngredients = useMemo(() => {
    return ingredients.filter(ingredient => {
      const matchesSearch = ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ingredient.category.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = categoryFilter === 'all' || ingredient.category === categoryFilter

      const matchesStockStatus = stockStatusFilter === 'all' ||
        (stockStatusFilter === 'out-of-stock' && ingredient.currentStock === 0) ||
        (stockStatusFilter === 'low-stock' && ingredient.currentStock > 0 && ingredient.currentStock <= ingredient.minimumStock) ||
        (stockStatusFilter === 'in-stock' && ingredient.currentStock > ingredient.minimumStock)

      return matchesSearch && matchesCategory && matchesStockStatus
    })
  }, [ingredients, searchTerm, categoryFilter, stockStatusFilter])

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

  const totalInventoryValue = filteredIngredients.reduce((total, ing) => {
    return total + (ing.currentStock * ing.pricePerKg)
  }, 0)

  const lowStockCount = filteredIngredients.filter(ing => ing.currentStock > 0 && ing.currentStock <= ing.minimumStock).length
  const outOfStockCount = filteredIngredients.filter(ing => ing.currentStock === 0).length

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('')
    setCategoryFilter('all')
    setStockStatusFilter('all')
  }

  if (loading) return <div className="text-center py-8 font-light text-gray-500">Loading inventory...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-light text-gray-900 tracking-wide">Inventory Management</h1>
              <p className="text-gray-500 font-light mt-2">Track stock levels and ingredient values</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 font-light">
              <span className="bg-gray-100 px-2 py-1 rounded-sm">{filteredIngredients.length} items</span>
              {(searchTerm || categoryFilter !== 'all' || stockStatusFilter !== 'all') && (
                <button
                  onClick={clearFilters}
                  className="text-blue-600 hover:text-blue-800 px-2 py-1 rounded-sm hover:bg-blue-50 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <label htmlFor="search" className="block text-sm font-light text-gray-700 mb-2 tracking-wide">
                SEARCH INGREDIENTS
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded-sm px-4 py-3 pl-10 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide"
                  placeholder="Search by name or category..."
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label htmlFor="category" className="block text-sm font-light text-gray-700 mb-2 tracking-wide">
                CATEGORY
              </label>
              <select
                id="category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock Status Filter */}
            <div>
              <label htmlFor="stockStatus" className="block text-sm font-light text-gray-700 mb-2 tracking-wide">
                STOCK STATUS
              </label>
              <select
                id="stockStatus"
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide"
              >
                <option value="all">All Status</option>
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>
            </div>
          </div>
        </div>

        {/* Inventory Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-500 tracking-wide">TOTAL INGREDIENTS</p>
                <p className="text-2xl font-light text-gray-900 mt-2">{filteredIngredients.length}</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-sm flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </div>

          {userProfile?.role === UserRole.ADMIN && (

            <>
              < div className="bg-white border border-gray-200 rounded-lg p-6">
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
            </>
          )

          }

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-light text-gray-900 tracking-wide">CURRENT INVENTORY</h2>
                <p className="text-gray-500 font-light text-sm mt-1">
                  {filteredIngredients.length === ingredients.length
                    ? 'All stock items'
                    : `${filteredIngredients.length} of ${ingredients.length} items shown`}
                </p>
              </div>
              {filteredIngredients.length === 0 && ingredients.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm font-light text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-sm transition-colors"
                >
                  Clear filters to show all items
                </button>
              )}
            </div>
          </div>

          {/* Mobile Cards View */}
          <div className="block lg:hidden">
            {filteredIngredients.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-4 text-lg font-light text-gray-900">No ingredients found</h3>
                <p className="mt-2 text-sm text-gray-500 font-light max-w-sm mx-auto">
                  {ingredients.length === 0
                    ? 'No ingredients in inventory. Record your first purchase to get started.'
                    : 'Try adjusting your search or filters to find what you\'re looking for.'
                  }
                </p>
                {ingredients.length > 0 && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-4 py-2 text-sm font-light text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-sm transition-colors"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {filteredIngredients.map((ingredient) => {
                  const stockValue = ingredient.currentStock * ingredient.pricePerKg
                  const stockStatus = getStockStatus(ingredient)

                  return (
                    <div key={ingredient.id} className="border border-gray-200 rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors">
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
            {filteredIngredients.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-4 text-lg font-light text-gray-900">No ingredients found</h3>
                <p className="mt-2 text-sm text-gray-500 font-light max-w-sm mx-auto">
                  {ingredients.length === 0
                    ? 'No ingredients in inventory. Record your first purchase to get started.'
                    : 'Try adjusting your search or filters to find what you\'re looking for.'
                  }
                </p>
                {ingredients.length > 0 && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-4 py-2 text-sm font-light text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-sm transition-colors"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
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
                  {filteredIngredients.map((ingredient) => {
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
            )}
          </div>
        </div>
      </div>
    </div >
  )
}