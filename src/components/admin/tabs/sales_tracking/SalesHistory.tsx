import { useState, useMemo } from 'react'
import { useProducts } from '../../../../context/ProductsContext'
import { useSales } from '../../../../context/SalesContext'
import { useUserProfile, UserRole } from '../../../../context/UserProfileContext'

interface SalesHistoryProps {
  isMobile?: boolean
}

export default function SalesHistory({ isMobile = false }: SalesHistoryProps) {
  const { sales, removeSale, loading, error } = useSales()
  const { products } = useProducts()
  const { userProfile } = useUserProfile()

  const [filterProduct, setFilterProduct] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [sortBy, _setSortBy] = useState('date')
  const [sortOrder, _setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [itemsPerPage, _setItemsPerPage] = useState(isMobile ? 5 : 10)
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(!isMobile) // Hide filters on mobile by default

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
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Stats - Responsive */}
      <div className={`grid gap-3 sm:gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
        <StatCard title="Total Revenue" color="green" value={`$${statistics.totalRevenue.toFixed(2)}`} isMobile={isMobile} />
        <StatCard title="Units Sold" color="blue" value={statistics.totalUnits} 
          subtitle={`${statistics.totalSales} orders`} isMobile={isMobile} />
        {!isMobile && (
          <>
            <StatCard title="Total Profit" color="purple" value={`$${statistics.totalProfit.toFixed(2)}`}
              subtitle={statistics.totalRevenue > 0
                ? `${((statistics.totalProfit / statistics.totalRevenue) * 100).toFixed(1)}% margin`
                : '0% margin'} isMobile={isMobile} />
            <StatCard title="Avg. Order Value" color="orange" value={`$${statistics.averageSaleValue.toFixed(2)}`} 
              subtitle="per order" isMobile={isMobile} />
          </>
        )}
      </div>

      {/* Mobile Stats Summary */}
      {isMobile && statistics.totalSales > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Profit: </span>
              <span className="font-medium text-purple-700">${statistics.totalProfit.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600">Avg. Order: </span>
              <span className="font-medium text-orange-700">${statistics.averageSaleValue.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters Toggle for Mobile */}
      {isMobile && (
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-center text-blue-600 hover:text-blue-800 text-sm font-medium bg-blue-50 py-2 rounded-lg"
        >
          <span className="mr-2">{showFilters ? '▼' : '▶'}</span>
          {showFilters ? 'Hide Filters' : 'Show Filters & Export'}
        </button>
      )}

      {/* Filters */}
      {(showFilters || !isMobile) && (
        <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className={`flex flex-col ${isMobile ? '' : 'lg:flex-row lg:items-center lg:justify-between'} gap-3 sm:gap-4 mb-3 sm:mb-4`}>
            <h3 className={`font-semibold text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
              Filters & Controls
            </h3>
            <div className={`flex flex-wrap gap-2 ${isMobile ? 'justify-center' : ''}`}>
              <button
                onClick={clearFilters}
                className={`border border-gray-300 rounded-md hover:bg-gray-50 transition-colors ${isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'}`}
              >
                Clear Filters
              </button>
              {!isViewer && (
                <button
                  onClick={exportToCSV}
                  className={`bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-1 sm:gap-2 ${isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'}`}
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {isMobile ? 'Export' : 'Export CSV'}
                </button>
              )}
            </div>
          </div>

          {/* Filter Inputs */}
          <div className={`grid gap-3 sm:gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
            <FilterInput 
              label="Search Product" 
              value={searchTerm} 
              onChange={setSearchTerm} 
              isMobile={isMobile} 
            />
            <div>
              <label className={`block font-medium text-gray-700 mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Product
              </label>
              <select
                value={filterProduct}
                onChange={(e) => setFilterProduct(e.target.value)}
                className={`w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'}`}
              >
                <option value="">All Products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {isMobile && p.name.length > 20 ? `${p.name.substring(0, 20)}...` : p.name}
                  </option>
                ))}
              </select>
            </div>
            <FilterDate 
              label="Start Date" 
              value={dateRange.start} 
              onChange={(v) => setDateRange(prev => ({ ...prev, start: v }))} 
              isMobile={isMobile} 
            />
            <FilterDate 
              label="End Date" 
              value={dateRange.end} 
              onChange={(v) => setDateRange(prev => ({ ...prev, end: v }))} 
              isMobile={isMobile} 
            />
          </div>
        </div>
      )}

      {/* Sales List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className={`border-b border-gray-200 bg-gray-50 ${isMobile ? 'p-3' : 'p-6'}`}>
          <div className="flex justify-between items-center">
            <h2 className={`font-semibold text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
              Sales Orders ({filteredSales.length})
            </h2>
            {isMobile && filteredSales.length > 0 && (
              <span className="text-xs text-gray-600">
                Page {currentPage}/{totalPages}
              </span>
            )}
          </div>
        </div>

        {paginatedSales.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-gray-500">
            <div className={`mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>No sales found</div>
            <div className={`${isMobile ? 'text-xs' : 'text-sm'}`}>
              {sales.length === 0 ? 'Record your first sale!' : 'No orders match your filters'}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {paginatedSales.map((sale) => (
              <div key={sale.id} className={`hover:bg-gray-50 transition-colors ${isMobile ? 'p-3' : 'p-6'}`}>
                <div className={`flex ${isMobile ? 'flex-col gap-3' : 'lg:flex-row lg:items-start lg:justify-between gap-4'}`}>
                  <div className="flex-1">
                    <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-between mb-2'}`}>
                      <div>
                        <h3 className={`font-semibold text-gray-900 ${isMobile ? 'text-sm' : 'text-lg'}`}>
                          {isMobile ? `#${sale.orderId || sale.id.substring(0, 8)}` : `Order #${sale.orderId || sale.id}`}
                        </h3>
                        <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          {isMobile 
                            ? new Date(sale.saleDate).toLocaleDateString()
                            : new Date(sale.saleDate).toLocaleString()
                          }
                        </p>
                        {isMobile && sale.customerName && sale.customerName !== 'Walk-in Customer' && (
                          <p className="text-xs text-gray-500 mt-1">
                            {sale.customerName}
                          </p>
                        )}
                      </div>
                      <div className={`${isMobile ? 'flex justify-between items-center' : 'text-right'}`}>
                        <div className={`font-bold text-green-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                          ${sale.totalAmount.toFixed(2)}
                        </div>
                        {!isViewer && sale.profitTotal !== undefined && (
                          <div className={`text-purple-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            Profit: ${sale.profitTotal.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Product breakdown */}
                    <div className={`mt-2 grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'}`}>
                      {sale.products.map((p, idx) => {
                        const product = products.find(prod => prod.id === p.id)
                        const cost = (p.costPrice || product?.costPrice || 0) * p.quantity
                        const revenue = p.salePrice * p.quantity
                        const profit = revenue - cost
                        const margin = revenue > 0 ? (profit / revenue) * 100 : 0

                        return (
                          <div key={idx} className="bg-gray-50 p-2 sm:p-3 rounded-lg border">
                            <div className={`font-medium text-gray-900 truncate ${isMobile ? 'text-sm' : ''}`}>
                              {p.name}
                            </div>
                            <div className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                              {p.quantity} × ${p.salePrice.toFixed(2)}
                            </div>
                            {!isViewer && (
                              <div className={`mt-1 ${profit >= 0 ? 'text-green-600' : 'text-red-600'} ${isMobile ? 'text-xs' : 'text-xs'}`}>
                                Profit: ${profit.toFixed(2)} ({margin.toFixed(1)}%)
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Customer info for desktop */}
                    {!isMobile && sale.customerName && sale.customerName !== 'Walk-in Customer' && (
                      <div className="mt-3 text-sm text-gray-600">
                        Customer: {sale.customerName}
                        {sale.customerEmail && ` • ${sale.customerEmail}`}
                      </div>
                    )}
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDeleteSale(sale.id)}
                      className={`text-red-600 hover:text-red-800 rounded-lg hover:bg-red-50 transition-colors self-start ${
                        isMobile ? 'p-1.5 text-lg absolute top-3 right-3' : 'p-2'
                      }`}
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
          <div className={`border-t border-gray-200 bg-gray-50 flex ${isMobile ? 'flex-col gap-3 p-3' : 'justify-between px-6 py-4'} text-sm`}>
            {!isMobile && <span>Page {currentPage} of {totalPages}</span>}
            <div className={`flex gap-1 ${isMobile ? 'justify-center' : ''}`}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50 ${isMobile ? 'px-3 py-1.5 flex-1' : 'px-3 py-1'}`}
              >
                {isMobile ? '← Previous' : 'Previous'}
              </button>
              {!isMobile && (
                <div className="flex items-center px-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1
                    if (totalPages <= 5) return pageNum
                    
                    // Show pages around current page
                    if (pageNum >= currentPage - 2 && pageNum <= currentPage + 2) {
                      return (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 mx-1 rounded ${currentPage === pageNum ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
                        >
                          {pageNum}
                        </button>
                      )
                    }
                    return null
                  })}
                  {totalPages > 5 && (
                    <span className="px-2">...</span>
                  )}
                </div>
              )}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50 ${isMobile ? 'px-3 py-1.5 flex-1' : 'px-3 py-1'}`}
              >
                {isMobile ? 'Next →' : 'Next'}
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
interface StatCardProps {
  title: string
  value: any
  color: string
  subtitle?: string
  isMobile?: boolean
}

function StatCard({ title, value, color, subtitle, isMobile = false }: StatCardProps) {
  const colorClasses = {
    green: 'from-green-50 to-green-100 border-green-200 text-green-900',
    blue: 'from-blue-50 to-blue-100 border-blue-200 text-blue-900',
    purple: 'from-purple-50 to-purple-100 border-purple-200 text-purple-900',
    orange: 'from-orange-50 to-orange-100 border-orange-200 text-orange-900'
  }

  const colorClassesDark = {
    green: 'text-green-700',
    blue: 'text-blue-700',
    purple: 'text-purple-700',
    orange: 'text-orange-700'
  }

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} p-3 sm:p-4 rounded-lg border shadow-sm`}>
      <h3 className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'} mb-1`}>{title}</h3>
      <p className={`font-bold ${isMobile ? 'text-lg sm:text-xl' : 'text-2xl'} ${colorClassesDark[color as keyof typeof colorClassesDark]}`}>
        {value}
      </p>
      {subtitle && (
        <p className={`mt-1 ${isMobile ? 'text-xs' : 'text-xs'} opacity-80`}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

interface FilterInputProps {
  label: string
  value: string
  onChange: (v: string) => void
  isMobile?: boolean
}

function FilterInput({ label, value, onChange, isMobile = false }: FilterInputProps) {
  return (
    <div>
      <label className={`block font-medium text-gray-700 mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search..."
        className={`w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'}`}
      />
    </div>
  )
}

interface FilterDateProps {
  label: string
  value: string
  onChange: (v: string) => void
  isMobile?: boolean
}

function FilterDate({ label, value, onChange, isMobile = false }: FilterDateProps) {
  return (
    <div>
      <label className={`block font-medium text-gray-700 mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'}`}
      />
    </div>
  )
}