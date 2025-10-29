import { useMemo } from 'react'
import { useProducts } from '../../../../context/ProductsContext'
import { useSales } from '../../../../context/SalesContext'

export default function ProfitabilityChart() {
  const { products } = useProducts()
  const { getRecentSales } = useSales()

  const profitabilityData = useMemo(() => {
    const recentSales = getRecentSales(30) // Last 30 days

    return products
      .map(product => {
        // Filter sales for this product and calculate totals
        const productSales = recentSales.filter(sale =>
          sale.products.some(p => p.id === product.id)
        )

        // Calculate totals from all products in sales records
        const productSalesDetails = productSales.flatMap(sale =>
          sale.products.filter(p => p.id === product.id)
        )

        const revenue = productSalesDetails.reduce((sum, product) =>
          sum + (product.quantity * product.salePrice), 0
        )
        const unitsSold = productSalesDetails.reduce((sum, product) =>
          sum + product.quantity, 0
        )
        const totalCost = productSalesDetails.reduce((sum, product) =>
          sum + ((product.costPrice || 0) * product.quantity), 0
        )
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
        <div className="flex justify-between items-start gap-2">
          <span className="font-light text-gray-900 text-sm flex-1 pr-2 truncate">{item.productName}</span>
          <span className={`font-light text-sm flex-shrink-0 ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${item.profit.toFixed(2)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-green-500 h-2 float-left"
            style={{ width: `${profitPercentage}%` }}
            title={`Profit: $${item.profit.toFixed(2)}`}
          />
          <div
            className="bg-red-500 h-2 float-left"
            style={{ width: `${costPercentage}%` }}
            title={`Cost: $${item.totalCost.toFixed(2)}`}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span className="font-light">Margin: {item.margin.toFixed(1)}%</span>
          <span className="font-light">${item.profitPerUnit.toFixed(2)}/unit</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
        <h3 className="text-lg sm:text-xl font-light text-gray-900">Profitability Analysis</h3>
        <p className="text-gray-500 font-light text-xs sm:text-sm mt-1">Product performance and margin analysis</p>
      </div>

      {/* Summary Cards - Fixed layout */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-light text-gray-500 truncate">Total Profit</p>
              <p className="text-base sm:text-lg font-light text-green-600 mt-1 truncate">${summary.totalProfit.toFixed(2)}</p>
            </div>
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-sm flex items-center justify-center flex-shrink-0 ml-2">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-light text-gray-500 truncate">Overall Margin</p>
              <p className="text-base sm:text-lg font-light text-blue-600 mt-1 truncate">{summary.overallMargin.toFixed(1)}%</p>
            </div>
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-sm flex items-center justify-center flex-shrink-0 ml-2">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-light text-gray-500 truncate">Total Revenue</p>
              <p className="text-base sm:text-lg font-light text-purple-600 mt-1 truncate">${summary.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 rounded-sm flex items-center justify-center flex-shrink-0 ml-2">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-light text-gray-500 truncate">Total Cost</p>
              <p className="text-base sm:text-lg font-light text-orange-600 mt-1 truncate">${summary.totalCost.toFixed(2)}</p>
            </div>
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-100 rounded-sm flex items-center justify-center flex-shrink-0 ml-2">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Profitability by Product */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
        <h4 className="text-base sm:text-lg font-light text-gray-900 mb-3">Product Profitability</h4>
        <div className="space-y-3">
          {profitabilityData.map(item => (
            <ProfitabilityBar key={item.productId} item={item} />
          ))}

          {profitabilityData.length === 0 && (
            <div className="text-center py-4 text-gray-500 font-light text-sm">
              No profitability data available
            </div>
          )}
        </div>
      </div>

      {/* Profit Leaders - Stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Most Profitable Products */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <h4 className="text-base sm:text-lg font-light text-gray-900 mb-3">Profit Leaders</h4>
          <div className="space-y-2">
            {profitabilityData
              .filter(item => item.profit > 0)
              .slice(0, 5)
              .map((item, index) => (
                <div key={item.productId} className="flex justify-between items-center p-2 bg-green-50 rounded-sm border border-green-200">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-5 h-5 bg-green-500 rounded-sm flex items-center justify-center text-white text-xs font-light flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-light text-gray-900 text-sm truncate">{item.productName}</div>
                      <div className="text-xs text-green-600 font-light">{item.margin.toFixed(1)}% margin</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="font-light text-green-600 text-sm">${item.profit.toFixed(2)}</div>
                    <div className="text-xs text-gray-600 font-light">{item.unitsSold} units</div>
                  </div>
                </div>
              ))
            }
            {profitabilityData.filter(item => item.profit > 0).length === 0 && (
              <div className="text-center py-3 text-gray-500 font-light text-xs">
                No profitable products
              </div>
            )}
          </div>
        </div>

        {/* Margin Leaders */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <h4 className="text-base sm:text-lg font-light text-gray-900 mb-3">Highest Margins</h4>
          <div className="space-y-2">
            {profitabilityData
              .filter(item => item.margin > 0)
              .sort((a, b) => b.margin - a.margin)
              .slice(0, 5)
              .map((item, index) => (
                <div key={item.productId} className="flex justify-between items-center p-2 bg-blue-50 rounded-sm border border-blue-200">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-5 h-5 bg-blue-500 rounded-sm flex items-center justify-center text-white text-xs font-light flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-light text-gray-900 text-sm truncate">{item.productName}</div>
                      <div className="text-xs text-blue-600 font-light">${item.profitPerUnit.toFixed(2)}/unit</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="font-light text-blue-600 text-sm">{item.margin.toFixed(1)}%</div>
                    <div className="text-xs text-gray-600 font-light">${item.profit.toFixed(2)}</div>
                  </div>
                </div>
              ))
            }
            {profitabilityData.filter(item => item.margin > 0).length === 0 && (
              <div className="text-center py-3 text-gray-500 font-light text-xs">
                No positive margins
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
        <h4 className="text-base sm:text-lg font-light text-gray-900 mb-3">Detailed View</h4>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-1 font-light text-gray-500">Product</th>
                <th className="text-right py-2 px-1 font-light text-gray-500">Units</th>
                <th className="text-right py-2 px-1 font-light text-gray-500">Revenue</th>
                <th className="text-right py-2 px-1 font-light text-gray-500">Cost</th>
                <th className="text-right py-2 px-1 font-light text-gray-500">Profit</th>
                <th className="text-right py-2 px-1 font-light text-gray-500">Margin</th>
              </tr>
            </thead>
            <tbody>
              {profitabilityData.map(item => (
                <tr key={item.productId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-1 font-light text-gray-900 truncate max-w-[80px]">{item.productName}</td>
                  <td className="py-2 px-1 text-right font-light text-gray-900">{item.unitsSold}</td>
                  <td className="py-2 px-1 text-right font-light text-gray-900">${item.revenue.toFixed(0)}</td>
                  <td className="py-2 px-1 text-right font-light text-gray-900">${item.totalCost.toFixed(0)}</td>
                  <td className={`py-2 px-1 text-right font-light ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${item.profit.toFixed(0)}
                  </td>
                  <td className={`py-2 px-1 text-right font-light ${item.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.margin.toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {profitabilityData.length === 0 && (
            <div className="text-center py-4 text-gray-500 font-light text-xs">
              No data available
            </div>
          )}
        </div>
      </div>
    </div>
  )
}