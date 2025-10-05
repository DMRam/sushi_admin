// src/components/SalesHistory.tsx
import React, { useState, useMemo } from 'react'
import { useSales } from '../context/SalesContext'
import { useProducts } from '../context/ProductsContext'

export default function SalesHistory() {
  const { sales, removeSale } = useSales()
  const { products } = useProducts()

  const [filter, setFilter] = useState({
    productId: '',
    dateRange: '7' // 7, 30, 90, all
  })

  const filteredSales = useMemo(() => {
    let filtered = sales

    // Filter by product
    if (filter.productId) {
      filtered = filtered.filter(sale => sale.productId === filter.productId)
    }

    // Filter by date range
    if (filter.dateRange !== 'all') {
      const days = parseInt(filter.dateRange)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      filtered = filtered.filter(sale => new Date(sale.saleDate) >= cutoffDate)
    }

    return filtered.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
  }, [sales, filter])

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Unknown Product'
  }

  const getProductCost = (productId: string) => {
    return products.find(p => p.id === productId)?.costPrice || 0
  }

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.quantity * sale.salePrice), 0)
  const totalUnits = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0)
  const totalProfit = filteredSales.reduce((sum, sale) => {
    const cost = getProductCost(sale.productId)
    return sum + ((sale.salePrice - cost) * sale.quantity)
  }, 0)

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDeleteSale = (saleId: string) => {
    if (confirm('Are you sure you want to delete this sale record?')) {
      removeSale(saleId)
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <select
              value={filter.productId}
              onChange={(e) => setFilter({...filter, productId: e.target.value})}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select
              value={filter.dateRange}
              onChange={(e) => setFilter({...filter, dateRange: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Total Revenue</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{totalUnits}</div>
          <div className="text-sm text-gray-600">Units Sold</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">${totalProfit.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Total Profit</div>
        </div>
      </div>

      {/* Sales List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Sales History ({filteredSales.length} records)
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredSales.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">No sales records found</div>
              <div className="text-sm text-gray-400">
                {sales.length === 0 
                  ? "No sales recorded yet. Record your first sale above."
                  : "No sales match your current filters."
                }
              </div>
            </div>
          ) : (
            filteredSales.map(sale => {
              const productCost = getProductCost(sale.productId)
              const profit = (sale.salePrice - productCost) * sale.quantity
              
              return (
                <div key={sale.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {getProductName(sale.productId)}
                        </h4>
                        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {sale.quantity} {sale.quantity === 1 ? 'unit' : 'units'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Price:</span>
                          <div className="font-medium">${sale.salePrice.toFixed(2)}/unit</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Total:</span>
                          <div className="font-medium text-green-600">
                            ${(sale.quantity * sale.salePrice).toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Profit:</span>
                          <div className={`font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${profit.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Date:</span>
                          <div className="font-medium">{formatDateTime(sale.saleDate)}</div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteSale(sale.id)}
                      className="ml-4 text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 border border-red-200 rounded hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}