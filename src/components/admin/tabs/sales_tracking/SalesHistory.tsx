import { useState, useMemo } from 'react'
import { useProducts } from '../../../../context/ProductsContext'
import { useSales } from '../../../../context/SalesContext'
import { useUserProfile, UserRole } from '../../../../context/UserProfileContext'


export default function SalesHistory() {
  const { sales, removeSale, loading, error } = useSales()
  const { products } = useProducts()
  const { userProfile } = useUserProfile()

  const [filterProduct, setFilterProduct] = useState('')
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, _setSortOrder] = useState('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const isViewer = userProfile?.role === UserRole.VIEWER
  const canDelete = userProfile?.role && ([UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN] as UserRole[]).includes(userProfile.role)

  const handleDeleteSale = async (saleId: string) => {
    if (confirm('Are you sure you want to delete this sale record? This action cannot be undone.')) {
      try {
        await removeSale(saleId)
      } catch (error) {
        alert('Failed to delete sale record. Please try again.')
      }
    }
  }

  // Memoized filtered and sorted sales
  const { filteredSales, statistics } = useMemo(() => {
    let filtered = sales.filter(sale => {
      const saleDate = new Date(sale.saleDate)
      const product = products.find(p => p.id === sale.productId)

      // Product filter
      if (filterProduct && sale.productId !== filterProduct) {
        return false
      }

      // Date range filter
      if (dateRange.start && new Date(dateRange.start) > saleDate) {
        return false
      }

      if (dateRange.end && new Date(dateRange.end + 'T23:59:59') < saleDate) {
        return false
      }

      // Search filter
      if (searchTerm) {
        const productName = product?.name.toLowerCase() || ''
        const searchLower = searchTerm.toLowerCase()
        if (!productName.includes(searchLower)) {
          return false
        }
      }

      return true
    })

    // Sort sales
    filtered.sort((a, b) => {
      let aValue, bValue

      switch (sortBy) {
        case 'product':
          const productA = products.find(p => p.id === a.productId)?.name || ''
          const productB = products.find(p => p.id === b.productId)?.name || ''
          aValue = productA
          bValue = productB
          break
        case 'quantity':
          aValue = a.quantity
          bValue = b.quantity
          break
        case 'revenue':
          aValue = a.salePrice * a.quantity
          bValue = b.salePrice * b.quantity
          break
        case 'date':
        default:
          aValue = new Date(a.saleDate).getTime()
          bValue = new Date(b.saleDate).getTime()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    // Calculate statistics
    const totalRevenue = filtered.reduce((sum, sale) => sum + (sale.salePrice * sale.quantity), 0)
    const totalUnits = filtered.reduce((sum, sale) => sum + sale.quantity, 0)
    const totalProfit = filtered.reduce((sum, sale) => {
      const product = products.find(p => p.id === sale.productId)
      if (product && product.costPrice) {
        const cost = product.costPrice * sale.quantity
        const revenue = sale.salePrice * sale.quantity
        return sum + (revenue - cost)
      }
      return sum
    }, 0)
    const averageSaleValue = filtered.length > 0 ? totalRevenue / filtered.length : 0

    return {
      filteredSales: filtered,
      statistics: {
        totalRevenue,
        totalUnits,
        totalProfit,
        averageSaleValue,
        totalSales: filtered.length
      }
    }
  }, [sales, products, filterProduct, dateRange, searchTerm, sortBy, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage)
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const clearFilters = () => {
    setFilterProduct('')
    setDateRange({ start: '', end: '' })
    setSearchTerm('')
    setCurrentPage(1)
  }

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Product', 'Quantity', 'Unit Price', 'Total Revenue', 'Profit']
    const csvData = filteredSales.map(sale => {
      const product = products.find(p => p.id === sale.productId)
      const saleDate = new Date(sale.saleDate)
      const totalAmount = sale.salePrice * sale.quantity
      const cost = product?.costPrice ? product.costPrice * sale.quantity : 0
      const profit = totalAmount - cost

      return [
        saleDate.toLocaleDateString(),
        saleDate.toLocaleTimeString(),
        product?.name || 'Unknown',
        sale.quantity,
        `$${sale.salePrice.toFixed(2)}`,
        `$${totalAmount.toFixed(2)}`,
        `$${profit.toFixed(2)}`
      ]
    })

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-lg text-gray-600">Loading sales history...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-700 font-medium">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-green-900 mb-1">Total Revenue</h3>
              <p className="text-2xl font-bold text-green-700">${statistics.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="text-green-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        {!isViewer && (
          <>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-blue-900 mb-1">Units Sold</h3>
                  <p className="text-2xl font-bold text-blue-700">{statistics.totalUnits}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    {statistics.totalSales} transactions
                  </p>
                </div>
                <div className="text-blue-600">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-purple-900 mb-1">Total Profit</h3>
                  <p className="text-2xl font-bold text-purple-700">${statistics.totalProfit.toFixed(2)}</p>
                  <p className="text-xs text-purple-600 mt-1">
                    {statistics.totalRevenue > 0 ?
                      `${((statistics.totalProfit / statistics.totalRevenue) * 100).toFixed(1)}% margin` :
                      '0% margin'
                    }
                  </p>
                </div>
                <div className="text-purple-600">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-orange-900 mb-1">Avg. Sale</h3>
                  <p className="text-2xl font-bold text-orange-700">${statistics.averageSaleValue.toFixed(2)}</p>
                  <p className="text-xs text-orange-600 mt-1">
                    per transaction
                  </p>
                </div>
                <div className="text-orange-600">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Enhanced Filters and Controls */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filters & Controls</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
            {!isViewer && (
              <button
                onClick={exportToCSV}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Product</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Products</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Date</option>
              <option value="product">Product</option>
              <option value="quantity">Quantity</option>
              <option value="revenue">Revenue</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Items Per Page</label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Enhanced Sales List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Sales History ({filteredSales.length} records)
            </h2>
            {totalPages > 1 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Page {currentPage} of {totalPages}</span>
              </div>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {paginatedSales.map((sale) => {
            const product = products.find(p => p.id === sale.productId)
            const saleDate = new Date(sale.saleDate)
            const totalAmount = sale.salePrice * sale.quantity
            const cost = product?.costPrice ? product.costPrice * sale.quantity : 0
            const profit = totalAmount - cost
            const profitMargin = totalAmount > 0 ? (profit / totalAmount) * 100 : 0

            return (
              <div key={sale.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {product?.name || 'Unknown Product'}
                        </h3>
                        {sale.lowStockFlag && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            ⚠️ Low Stock
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          ${totalAmount.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {saleDate.toLocaleDateString()} at {saleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-gray-600 mb-1">Quantity</div>
                        <div className="font-semibold text-gray-900">{sale.quantity} units</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-gray-600 mb-1">Unit Price</div>
                        <div className="font-semibold text-gray-900">${sale.salePrice.toFixed(2)}</div>
                      </div>
                      {!isViewer && (
                        <>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-gray-600 mb-1">Profit</div>
                            <div className={`font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${profit.toFixed(2)}
                            </div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-gray-600 mb-1">Margin</div>
                            <div className={`font-semibold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {profitMargin.toFixed(1)}%
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {canDelete && (
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => handleDeleteSale(sale.id)}
                        className="p-2 text-red-600 hover:text-red-800 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete sale record"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredSales.length)} of {filteredSales.length} results
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 border text-sm rounded-md ${currentPage === page
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {filteredSales.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-lg mb-2">No sales records found</div>
            <div className="text-sm">
              {sales.length === 0
                ? 'Record your first sale to see it here!'
                : 'No sales match your current filters'
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
}