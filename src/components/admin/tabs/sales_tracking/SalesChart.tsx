import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSales } from '../../../../context/SalesContext'
import { useProducts } from '../../../../context/ProductsContext'

type ChartLineItem = {
  id: string
  name: string
  quantity: number
  unitPrice: number
  total: number
}

type ChartOrder = {
  id: string
  createdAt: Date
  total: number
  items: ChartLineItem[]
}

type SalesChartProps = {
  orders?: ChartOrder[]
  rangeLabel?: string
}

const money = (value: number, digits = 2) => `$${Number.isFinite(value) ? value.toFixed(digits) : '0.00'}`

const dayKey = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const dayLabel = (key: string) => {
  const date = new Date(`${key}T12:00:00`)
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(date)
}

const fullDayLabel = (key: string) => {
  const date = new Date(`${key}T12:00:00`)
  return new Intl.DateTimeFormat('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export default function SalesChart({ orders, rangeLabel = 'Selected period' }: SalesChartProps) {
  const { t } = useTranslation()
  const { sales } = useSales()
  const { products } = useProducts()

  const chartOrders = useMemo<ChartOrder[]>(() => {
    if (orders) return orders

    return sales.map((sale) => ({
      id: sale.id,
      createdAt: new Date(sale.saleDate),
      total: sale.totalAmount,
      items: sale.products.map((product, index) => ({
        id: product.id || `${sale.id}-${index}`,
        name: product.name,
        quantity: product.quantity,
        unitPrice: product.salePrice,
        total: product.salePrice * product.quantity,
      })),
    }))
  }, [orders, sales])

  const salesData = useMemo(() => {
    const salesByDate = chartOrders.reduce((acc, order) => {
      const key = dayKey(order.createdAt)
      const units = order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
      const revenue = Number(order.total || 0) || order.items.reduce((sum, item) => sum + Number(item.total || 0), 0)

      if (!acc[key]) {
        acc[key] = {
          date: key,
          revenue: 0,
          units: 0,
          transactions: 0,
        }
      }

      acc[key].revenue += revenue
      acc[key].units += units
      acc[key].transactions += 1

      return acc
    }, {} as Record<string, { date: string; revenue: number; units: number; transactions: number }>)

    return Object.values(salesByDate).sort((a, b) => a.date.localeCompare(b.date))
  }, [chartOrders])

  const productSales = useMemo(() => {
    const byProduct = new Map<string, {
      productId: string
      productName: string
      revenue: number
      units: number
      transactions: Set<string>
    }>()

    chartOrders.forEach((order) => {
      order.items.forEach((item) => {
        const key = item.id || item.name.toLowerCase()
        const existing = byProduct.get(key) || {
          productId: key,
          productName: item.name,
          revenue: 0,
          units: 0,
          transactions: new Set<string>(),
        }

        existing.revenue += Number(item.total || item.unitPrice * item.quantity || 0)
        existing.units += Number(item.quantity || 0)
        existing.transactions.add(order.id)
        byProduct.set(key, existing)
      })
    })

    if (!orders && byProduct.size === 0) {
      products.forEach((product) => {
        byProduct.set(product.id, {
          productId: product.id,
          productName: product.name,
          revenue: 0,
          units: 0,
          transactions: new Set<string>(),
        })
      })
    }

    return Array.from(byProduct.values())
      .map((item) => ({
        productId: item.productId,
        productName: item.productName,
        revenue: item.revenue,
        units: item.units,
        transactions: item.transactions.size,
        avgPrice: item.units > 0 ? item.revenue / item.units : 0,
      }))
      .filter((item) => item.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
  }, [chartOrders, orders, products])

  const totalRevenue = salesData.reduce((sum, day) => sum + day.revenue, 0)
  const totalUnits = salesData.reduce((sum, day) => sum + day.units, 0)
  const totalTransactions = salesData.reduce((sum, day) => sum + day.transactions, 0)
  const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
  const avgDailyRevenue = salesData.length > 0 ? totalRevenue / salesData.length : 0

  const BarChart = ({ data, height = 220 }: { data: typeof salesData; height?: number }) => {
    const maxRevenue = Math.max(...data.map((day) => day.revenue), 1)

    return (
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-[720px] items-end gap-2 border-l border-b border-slate-300 px-3 pt-6" style={{ height: `${height}px` }}>
          {data.map((day) => {
            const heightPct = Math.max(3, (day.revenue / maxRevenue) * 100)

            return (
              <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div className="text-[11px] font-semibold text-slate-700">{money(day.revenue, 0)}</div>
                <div
                  className="w-full border border-blue-700 bg-blue-600 transition-colors hover:bg-blue-700"
                  style={{ height: `${heightPct}%` }}
                  title={`${fullDayLabel(day.date)}: ${money(day.revenue)} · ${day.transactions} orders`}
                />
                <div className="h-7 text-[11px] font-medium text-slate-500">{dayLabel(day.date)}</div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('adminDashboard.salesChart.eyebrow', 'Sales analytics')}</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">{t('adminDashboard.salesChart.title', 'Revenue and product performance')}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {t('adminDashboard.salesChart.subtitle', 'Showing {{range}} across website, Clover/POS, and manual sales.', { range: rangeLabel.toLowerCase() })}
            </p>
          </div>
          <div className="border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
            {t('adminDashboard.salesChart.orders', '{{count}} orders', { count: totalTransactions })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          [t('adminDashboard.salesChart.totalRevenue', 'Total revenue'), money(totalRevenue), t('adminDashboard.salesChart.orders', '{{count}} orders', { count: totalTransactions })],
          [t('adminDashboard.salesChart.unitsSold', 'Units sold'), totalUnits.toLocaleString(), t('adminDashboard.salesChart.products', '{{count}} products', { count: productSales.length })],
          [t('adminDashboard.salesChart.avgOrder', 'Avg order'), money(avgOrderValue), t('adminDashboard.salesChart.perTransaction', 'per transaction')],
          [t('adminDashboard.salesChart.avgDaily', 'Avg daily'), money(avgDailyRevenue), t('adminDashboard.salesChart.daysWithSales', '{{count}} days with sales', { count: salesData.length })],
        ].map(([label, value, detail]) => (
          <div key={label} className="border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{detail}</p>
          </div>
        ))}
      </div>

      <div className="border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">{t('adminDashboard.salesChart.revenueTrend', 'Revenue trend')}</h4>
            <p className="mt-1 text-sm text-slate-500">{t('adminDashboard.salesChart.dailyRevenueLabels', 'Daily revenue with amount labels')}</p>
          </div>
          <span className="text-sm font-semibold text-blue-700">{money(totalRevenue)}</span>
        </div>

        {salesData.length > 0 ? (
          <BarChart data={salesData} />
        ) : (
          <div className="border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">
            {t('adminDashboard.salesChart.noSalesPeriod', 'No sales data available for this period')}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">{t('adminDashboard.salesChart.productPerformance', 'Product performance')}</h4>
          <div className="space-y-2">
            {productSales.slice(0, 12).map((product, index) => (
              <div key={product.productId} className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex h-7 w-7 items-center justify-center bg-slate-900 text-xs font-semibold text-white">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-950">{product.productName}</div>
                  <div className="text-xs text-slate-500">
                    {t('adminDashboard.salesChart.productDetail', '{{units}} units · {{orders}} orders', { units: product.units, orders: product.transactions })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-950">{money(product.revenue)}</div>
                  <div className="text-xs text-slate-500">{t('adminDashboard.salesChart.avgPrice', '{{amount}} avg', { amount: money(product.avgPrice) })}</div>
                </div>
              </div>
            ))}

            {productSales.length === 0 && (
              <div className="border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">
                {t('adminDashboard.salesChart.noProductSales', 'No product sales data available')}
              </div>
            )}
          </div>
        </div>

        <div className="border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">{t('adminDashboard.salesChart.dailyBreakdown', 'Daily breakdown')}</h4>
          <div className="space-y-2">
            {salesData.slice(-12).reverse().map((day) => (
              <div key={day.date} className="grid gap-2 border border-slate-200 px-3 py-2 sm:grid-cols-[minmax(120px,1fr)_auto] sm:items-center">
                <div className="text-sm font-semibold text-slate-800">{fullDayLabel(day.date)}</div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="text-slate-500">{t('adminDashboard.salesChart.units', '{{count}} units', { count: day.units })}</span>
                  <span className="text-slate-500">{t('adminDashboard.salesChart.orders', '{{count}} orders', { count: day.transactions })}</span>
                  <span className="font-semibold text-slate-950">{money(day.revenue)}</span>
                </div>
              </div>
            ))}

            {salesData.length === 0 && (
              <div className="border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">
                {t('adminDashboard.salesChart.noDailySales', 'No daily sales data available')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
