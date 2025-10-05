import React, { useMemo } from 'react'
import { useProducts } from '../context/ProductsContext'
import { useSales } from '../context/SalesContext'

export default function ProfitabilityChart() {
  const { products } = useProducts()
  const { getRecentSales } = useSales()

  const profitabilityData = useMemo(() => {
    const recentSales = getRecentSales(30) // Last 30 days
    
    return products
      .map(product => {
        const productSales = recentSales.filter(sale => sale.productId === product.id)
        const revenue = productSales.reduce((sum, sale) => sum + (sale.quantity * sale.salePrice), 0)
        const unitsSold = productSales.reduce((sum, sale) => sum + sale.quantity, 0)
        const totalCost = (product.costPrice || 0) * unitsSold
        const profit = revenue - totalCost
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0
        const profitPerUnit = unitsSold > 0 ? profit / unitsSold : 0

        return {
          productId: product.id,
          productName: product.name,
          category: product.category,
          revenue,
          unitsSold,
          totalCost,
          profit,
          margin,
          profitPerUnit,
          costPrice: product.costPrice || 0,
          sellingPrice: product.sellingPrice || 0
        }
      })
      .filter(item => item.revenue > 0)
      .sort((a, b) => b.profit - a.profit)
  }, [products, getRecentSales])

  const summary = useMemo(() => {
    const totalRevenue = profitabilityData.reduce((sum, item) => sum + item.revenue, 0)
    const totalProfit = profitabilityData.reduce((sum, item) => sum + item.profit, 0)
    const totalCost = profitabilityData.reduce((sum, item) => sum + item.totalCost, 0)
    const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
    
    return {
      totalRevenue,
      totalProfit,
      totalCost,
      overallMargin
    }
  }, [profitabilityData])

  // Simple bar chart for profitability
  const ProfitabilityBar = ({ item }: { item: typeof profitabilityData[0] }) => {
    const profitPercentage = Math.max(0, (item.profit / (item.revenue || 1)) * 100)
    const costPercentage = Math.max(0, (item.totalCost / (item.revenue || 1)) * 100)
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">{item.productName}</span>
          <span className={`font-bold ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${item.profit.toFixed(2)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-green-500 h-3 float-left"
            style={{ width: `${profitPercentage}%` }}
            title={`Profit: $${item.profit.toFixed(2)}`}
          />
          <div 
            className="bg-red-500 h-3 float-left"
            style={{ width: `${costPercentage}%` }}
            title={`Cost: $${item.totalCost.toFixed(2)}`}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span>Margin: {item.margin.toFixed(1)}%</span>
          <span>${item.profitPerUnit.toFixed(2)}/unit</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Profitability Analysis</h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">${summary.totalProfit.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Total Profit</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{summary.overallMargin.toFixed(1)}%</div>
          <div className="text-sm text-gray-600">Overall Margin</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">${summary.totalRevenue.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Total Revenue</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-orange-600">${summary.totalCost.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Total Cost</div>
        </div>
      </div>

      {/* Profitability by Product */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Product Profitability</h4>
        <div className="space-y-4">
          {profitabilityData.map(item => (
            <ProfitabilityBar key={item.productId} item={item} />
          ))}
          
          {profitabilityData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No profitability data available. Record some sales first.
            </div>
          )}
        </div>
      </div>

      {/* Profit Leaders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Profitable Products */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 mb-4">🏆 Profit Leaders</h4>
          <div className="space-y-3">
            {profitabilityData
              .filter(item => item.profit > 0)
              .slice(0, 5)
              .map((item, index) => (
                <div key={item.productId} className="flex justify-between items-center p-3 bg-green-50 rounded border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{item.productName}</div>
                      <div className="text-sm text-green-600">{item.margin.toFixed(1)}% margin</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">${item.profit.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">{item.unitsSold} units</div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Margin Leaders */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 mb-4">⭐ Highest Margins</h4>
          <div className="space-y-3">
            {profitabilityData
              .filter(item => item.margin > 0)
              .sort((a, b) => b.margin - a.margin)
              .slice(0, 5)
              .map((item, index) => (
                <div key={item.productId} className="flex justify-between items-center p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{item.productName}</div>
                      <div className="text-sm text-blue-600">${item.profitPerUnit.toFixed(2)}/unit</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600">{item.margin.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">${item.profit.toFixed(2)}</div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Detailed Profitability</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium">Product</th>
                <th className="text-right py-2 font-medium">Units Sold</th>
                <th className="text-right py-2 font-medium">Revenue</th>
                <th className="text-right py-2 font-medium">Cost</th>
                <th className="text-right py-2 font-medium">Profit</th>
                <th className="text-right py-2 font-medium">Margin</th>
                <th className="text-right py-2 font-medium">Profit/Unit</th>
              </tr>
            </thead>
            <tbody>
              {profitabilityData.map(item => (
                <tr key={item.productId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 font-medium">{item.productName}</td>
                  <td className="py-2 text-right">{item.unitsSold}</td>
                  <td className="py-2 text-right">${item.revenue.toFixed(2)}</td>
                  <td className="py-2 text-right">${item.totalCost.toFixed(2)}</td>
                  <td className={`py-2 text-right font-medium ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${item.profit.toFixed(2)}
                  </td>
                  <td className={`py-2 text-right font-medium ${item.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.margin.toFixed(1)}%
                  </td>
                  <td className="py-2 text-right">${item.profitPerUnit.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}