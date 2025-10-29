import { useState, useMemo } from 'react'
import { useProducts } from '../../../../context/ProductsContext'
import { useSales } from '../../../../context/SalesContext'
import { useUserProfile, UserRole } from '../../../../context/UserProfileContext'

export default function SalesHistory() {
  const { sales, removeSale, loading, error } = useSales()
  const { products } = useProducts()
  const { userProfile } = useUserProfile()

  const [filterProduct, setFilterProduct] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [sortBy, _setSortBy] = useState('date')
  const [sortOrder, _setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [itemsPerPage, _setItemsPerPage] = useState(10)
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

  // =============================
  // FILTERING & STATISTICS
  // =============================
  const { filteredSales, statistics } = useMemo(() => {
    let filtered = sales.filter((sale) => {
      const saleDate = new Date(sale.saleDate)

      // Date filters
      if (dateRange.start && new Date(dateRange.start) > saleDate) return false
      if (dateRange.end && new Date(dateRange.end + 'T23:59:59') < saleDate) return false

      // Product filter
      if (filterProduct) {
        const hasProduct = sale.products.some(p => p.id === filterProduct)
        if (!hasProduct) return false
      }

      // Search by product name
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const found = sale.products.some(p =>
          p.name.toLowerCase().includes(searchLower)
        )
        if (!found) return false
      }

      return true
    })

    // Sort
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'revenue':
          aValue = a.totalAmount
          bValue = b.totalAmount
          break
        case 'profit':
          aValue = a.profitTotal || 0
          bValue = b.profitTotal || 0
          break
        case 'date':
        default:
          aValue = new Date(a.saleDate).getTime()
          bValue = new Date(b.saleDate).getTime()
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
    })

    // Statistics
    const totalRevenue = filtered.reduce((sum, s) => sum + s.totalAmount, 0)
    const totalUnits = filtered.reduce((sum, s) =>
      sum + s.products.reduce((acc, p) => acc + p.quantity, 0), 0)
    const totalProfit = filtered.reduce((sum, s) => sum + (s.profitTotal || 0), 0)
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

  // =============================
  // PAGINATION
  // =============================
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

  // =============================
  // CSV EXPORT (multi-product)
  // =============================
  const exportToCSV = () => {
    const headers = [
      'Order ID',
      'Date',
      'Customer',
      'Product',
      'Quantity',
      'Unit Price',
      'Total (Product)',
      'Order Total',
      'Profit'
    ]

    const csvData = filteredSales.flatMap((sale) => {
      const saleDate = new Date(sale.saleDate)
      return sale.products.map((p) => {
        const total = p.salePrice * p.quantity
        const profit = (p.salePrice - (p.costPrice || 0)) * p.quantity
        return [
          sale.orderId,
          saleDate.toLocaleDateString(),
          sale.customerName,
          p.name,
          p.quantity,
          `$${p.salePrice.toFixed(2)}`,
          `$${total.toFixed(2)}`,
          `$${sale.totalAmount.toFixed(2)}`,
          `$${profit.toFixed(2)}`
        ]
      })
    })

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // =============================
  // RENDER
  // =============================
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
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" color="green" value={`$${statistics.totalRevenue.toFixed(2)}`} />
        <StatCard title="Units Sold" color="blue" value={statistics.totalUnits} subtitle={`${statistics.totalSales} orders`} />
        <StatCard title="Total Profit" color="purple" value={`$${statistics.totalProfit.toFixed(2)}`}
          subtitle={statistics.totalRevenue > 0
            ? `${((statistics.totalProfit / statistics.totalRevenue) * 100).toFixed(1)}% margin`
            : '0% margin'} />
        <StatCard title="Avg. Order Value" color="orange" value={`$${statistics.averageSaleValue.toFixed(2)}`} subtitle="per order" />
      </div>

      {/* Filters */}
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

        {/* Filter Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <FilterInput label="Search Product" value={searchTerm} onChange={setSearchTerm} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <FilterDate label="Start Date" value={dateRange.start} onChange={(v) => setDateRange(prev => ({ ...prev, start: v }))} />
          <FilterDate label="End Date" value={dateRange.end} onChange={(v) => setDateRange(prev => ({ ...prev, end: v }))} />
        </div>
      </div>

      {/* Sales List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">
            Sales Orders ({filteredSales.length})
          </h2>
        </div>

        {paginatedSales.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-lg mb-2">No sales found</div>
            <div className="text-sm">
              {sales.length === 0 ? 'Record your first sale!' : 'No orders match your filters'}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {paginatedSales.map((sale) => (
              <div key={sale.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          Order #{sale.orderId || sale.id}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(sale.saleDate).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          ${sale.totalAmount.toFixed(2)}
                        </div>
                        {!isViewer && sale.profitTotal !== undefined && (
                          <div className="text-sm text-purple-600">
                            Profit: ${sale.profitTotal.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Product breakdown */}
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {sale.products.map((p, idx) => {
                        const product = products.find(prod => prod.id === p.id)
                        const cost = (p.costPrice || product?.costPrice || 0) * p.quantity
                        const revenue = p.salePrice * p.quantity
                        const profit = revenue - cost
                        const margin = revenue > 0 ? (profit / revenue) * 100 : 0

                        return (
                          <div key={idx} className="bg-gray-50 p-3 rounded-lg border">
                            <div className="font-medium text-gray-900 truncate">{p.name}</div>
                            <div className="text-sm text-gray-600">
                              {p.quantity} × ${p.salePrice.toFixed(2)}
                            </div>
                            {!isViewer && (
                              <div className={`text-xs mt-1 ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                Profit: ${profit.toFixed(2)} ({margin.toFixed(1)}%)
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDeleteSale(sale.id)}
                      className="p-2 text-red-600 hover:text-red-800 rounded-lg hover:bg-red-50 transition-colors self-start"
                      title="Delete sale"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between text-sm">
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================
// SMALL COMPONENTS
// =============================
function StatCard({ title, value, color, subtitle }: { title: string; value: any; color: string; subtitle?: string }) {
  return (
    <div className={`bg-gradient-to-br from-${color}-50 to-${color}-100 p-6 rounded-lg border border-${color}-200 shadow-sm`}>
      <h3 className={`text-sm font-medium text-${color}-900 mb-1`}>{title}</h3>
      <p className={`text-2xl font-bold text-${color}-700`}>{value}</p>
      {subtitle && <p className={`text-xs text-${color}-600 mt-1`}>{subtitle}</p>}
    </div>
  )
}

function FilterInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search..."
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

function FilterDate({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
