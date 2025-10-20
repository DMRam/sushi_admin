import { useState, useMemo } from 'react'
import { useSales } from '../../../../context/SalesContext'
import { useProducts } from '../../../../context/ProductsContext'


export default function SalesChart() {
  const { sales, getRecentSales } = useSales()
  const { products } = useProducts()

  const [timeRange, setTimeRange] = useState<'7' | '30' | '90' | '365'>('30')

  const salesData = useMemo(() => {
    const recentSales = getRecentSales(parseInt(timeRange))

    // Group sales by date
    const salesByDate = recentSales.reduce((acc, sale) => {
      const date = new Date(sale.saleDate).toLocaleDateString()
      if (!acc[date]) {
        acc[date] = {
          revenue: 0,
          units: 0,
          transactions: 0
        }
      }
      acc[date].revenue += sale.quantity * sale.salePrice
      acc[date].units += sale.quantity
      acc[date].transactions += 1
      return acc
    }, {} as Record<string, { revenue: number; units: number; transactions: number }>)

    // Convert to array and sort by date
    return Object.entries(salesByDate)
      .map(([date, data]) => ({
        date,
        ...data
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [sales, timeRange, getRecentSales])

  const productSales = useMemo(() => {
    const recentSales = getRecentSales(parseInt(timeRange))

    return products
      .map(product => {
        const productSales = recentSales.filter(sale => sale.productId === product.id)
        const revenue = productSales.reduce((sum, sale) => sum + (sale.quantity * sale.salePrice), 0)
        const units = productSales.reduce((sum, sale) => sum + sale.quantity, 0)

        return {
          productId: product.id,
          productName: product.name,
          revenue,
          units,
          transactions: productSales.length,
          avgPrice: units > 0 ? revenue / units : 0
        }
      })
      .filter(item => item.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
  }, [sales, products, timeRange, getRecentSales])

  const totalRevenue = salesData.reduce((sum, day) => sum + day.revenue, 0)
  const totalUnits = salesData.reduce((sum, day) => sum + day.units, 0)
  const avgDailyRevenue = salesData.length > 0 ? totalRevenue / salesData.length : 0

  // Simple bar chart component
  const BarChart = ({ data, height = 200 }: { data: { date: string; revenue: number }[], height?: number }) => {
    const maxRevenue = Math.max(...data.map(d => d.revenue), 1)

    return (
      <div className="flex items-end justify-between gap-1" style={{ height: `${height}px` }}>
        {data.map((day, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div
              className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
              style={{ height: `${(day.revenue / maxRevenue) * 100}%` }}
              title={`${day.date}: $${day.revenue.toFixed(2)}`}
            />
            <div className="text-xs text-gray-500 mt-1 rotate-45 origin-top-left whitespace-nowrap">
              {new Date(day.date).getDate()}/{new Date(day.date).getMonth() + 1}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h3 className="text-xl font-light text-gray-900 tracking-wide">SALES ANALYTICS</h3>
            <p className="text-gray-500 font-light text-sm mt-1">Track revenue trends and product performance</p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="border border-gray-300 rounded-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light w-full sm:w-auto"
          >
            <option value="7">LAST 7 DAYS</option>
            <option value="30">LAST 30 DAYS</option>
            <option value="90">LAST 90 DAYS</option>
            <option value="365">LAST 365 DAYS</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-light text-gray-500 tracking-wide">TOTAL REVENUE</p>
              <p className="text-xl sm:text-2xl font-light text-green-600 mt-2">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-sm flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-light text-gray-500 tracking-wide">UNITS SOLD</p>
              <p className="text-xl sm:text-2xl font-light text-blue-600 mt-2">{totalUnits}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-sm flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-light text-gray-500 tracking-wide">AVG DAILY REVENUE</p>
              <p className="text-xl sm:text-2xl font-light text-purple-600 mt-2">${avgDailyRevenue.toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-sm flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <h4 className="text-lg font-light text-gray-900 tracking-wide mb-4">REVENUE TREND</h4>
        {salesData.length > 0 ? (
          <div className="space-y-4">
            <BarChart data={salesData} height={160} />
            <div className="flex justify-center text-xs text-gray-500 font-light">
              Daily revenue over the selected period
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 font-light">
            No sales data available for the selected period
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Performance */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h4 className="text-lg font-light text-gray-900 tracking-wide mb-4">PRODUCT PERFORMANCE</h4>
          <div className="space-y-3">
            {productSales.map((product, index) => (
              <div key={product.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-sm border border-gray-200">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-6 h-6 bg-blue-500 rounded-sm flex items-center justify-center text-white text-xs font-light flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-light text-gray-900 truncate">{product.productName}</div>
                    <div className="text-xs text-gray-600 font-light">
                      {product.units} units • {product.transactions} sales
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <div className="font-light text-green-600">${product.revenue.toFixed(2)}</div>
                  <div className="text-xs text-gray-600 font-light">
                    ${product.avgPrice.toFixed(2)} avg
                  </div>
                </div>
              </div>
            ))}

            {productSales.length === 0 && (
              <div className="text-center py-4 text-gray-500 font-light">
                No product sales data available
              </div>
            )}
          </div>
        </div>

        {/* Daily Breakdown */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h4 className="text-lg font-light text-gray-900 tracking-wide mb-4">DAILY BREAKDOWN</h4>
          <div className="space-y-2">
            {salesData.slice(-10).reverse().map((day, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 hover:bg-gray-50 rounded-sm border border-gray-200 gap-2">
                <div className="font-light text-gray-700 text-sm">{day.date}</div>
                <div className="flex gap-3 text-xs sm:text-sm">
                  <span className="text-gray-600 font-light">{day.units} units</span>
                  <span className="text-gray-600 font-light">{day.transactions} sales</span>
                  <span className="font-light text-green-600">${day.revenue.toFixed(2)}</span>
                </div>
              </div>
            ))}

            {salesData.length === 0 && (
              <div className="text-center py-4 text-gray-500 font-light">
                No daily sales data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      {productSales.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h4 className="text-lg font-light text-gray-900 tracking-wide mb-4">PERFORMANCE SUMMARY</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="text-center p-3 bg-gray-50 rounded-sm border border-gray-200">
              <div className="font-light text-gray-500">TOP PRODUCT</div>
              <div className="font-light text-gray-900 mt-1 truncate">{productSales[0]?.productName}</div>
              <div className="text-green-600 font-light">${productSales[0]?.revenue.toFixed(2)}</div>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-sm border border-gray-200">
              <div className="font-light text-gray-500">AVG SALE VALUE</div>
              <div className="font-light text-gray-900 mt-1">
                ${totalUnits > 0 ? (totalRevenue / totalUnits).toFixed(2) : '0.00'}
              </div>
              <div className="text-blue-600 font-light">per unit</div>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-sm border border-gray-200">
              <div className="font-light text-gray-500">DAYS WITH SALES</div>
              <div className="font-light text-gray-900 mt-1">{salesData.length}</div>
              <div className="text-purple-600 font-light">out of {timeRange}</div>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-sm border border-gray-200">
              <div className="font-light text-gray-500">PRODUCTS SOLD</div>
              <div className="font-light text-gray-900 mt-1">{productSales.length}</div>
              <div className="text-orange-600 font-light">active products</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}