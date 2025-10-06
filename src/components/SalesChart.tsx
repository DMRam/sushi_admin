import  { useState, useMemo } from 'react'
import { useSales } from '../context/SalesContext'
import { useProducts } from '../context/ProductsContext'

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
      {/* Controls */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Sales Analytics</h3>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last 365 days</option>
        </select>
      </div>

      {/* Summary Cards */}
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
          <div className="text-2xl font-bold text-purple-600">${avgDailyRevenue.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Avg Daily Revenue</div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Revenue Trend</h4>
        {salesData.length > 0 ? (
          <BarChart data={salesData} />
        ) : (
          <div className="text-center py-8 text-gray-500">
            No sales data available for the selected period
          </div>
        )}
      </div>

      {/* Product Performance */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Product Performance</h4>
        <div className="space-y-3">
          {productSales.map((product, index) => (
            <div key={product.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{product.productName}</div>
                  <div className="text-sm text-gray-600">
                    {product.units} units • {product.transactions} sales
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600">${product.revenue.toFixed(2)}</div>
                <div className="text-sm text-gray-600">
                  ${product.avgPrice.toFixed(2)} avg
                </div>
              </div>
            </div>
          ))}
          
          {productSales.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No product sales data available
            </div>
          )}
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Daily Breakdown</h4>
        <div className="space-y-2">
          {salesData.slice(-10).reverse().map((day, index) => (
            <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
              <div className="font-medium text-gray-700">{day.date}</div>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-600">{day.units} units</span>
                <span className="text-gray-600">{day.transactions} transactions</span>
                <span className="font-bold text-green-600">${day.revenue.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}