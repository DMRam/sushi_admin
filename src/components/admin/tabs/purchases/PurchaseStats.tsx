import { useMemo } from 'react'
import type {
  PurchaseLocale,
  PurchaseRecord,
} from '../../../../pages/admin/tabs/purchases/purchaseTypes'
import { formatMoney } from '../../../../pages/admin/tabs/purchases/purchaseLocale'

interface PurchaseStatsProps {
  isMobile?: boolean
  locale?: PurchaseLocale
  rows: PurchaseRecord[]
  loading?: boolean
}

export const PurchaseStats = ({
  isMobile = false,
  locale = 'fr-CA',
  rows,
  loading = false,
}: PurchaseStatsProps) => {
  const stats = useMemo(() => {
    const now = new Date()
    const last30Cutoff = new Date()
    last30Cutoff.setDate(now.getDate() - 30)

    const recentPurchases = rows.filter((purchase) => {
      const purchaseDate = new Date(`${purchase.purchaseDate}T00:00:00`)
      return purchaseDate >= last30Cutoff
    })

    const totalSpent = rows.reduce((sum, purchase) => sum + Number(purchase.total ?? 0), 0)
    const recentSpent = recentPurchases.reduce(
      (sum, purchase) => sum + Number(purchase.total ?? 0),
      0
    )

    const spendingByCategory = rows.reduce((acc, purchase) => {
      for (const item of purchase.items ?? []) {
        const category = item.category || 'other'
        if (!acc[category]) acc[category] = 0
        acc[category] += Number(item.lineTotal ?? 0)
      }
      return acc
    }, {} as Record<string, number>)

    const spendingBySupplier = rows.reduce((acc, purchase) => {
      const supplier = String(purchase.supplierName ?? '').trim() || 'Unknown'
      if (!acc[supplier]) acc[supplier] = 0
      acc[supplier] += Number(purchase.total ?? 0)
      return acc
    }, {} as Record<string, number>)

    const monthlySpending = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthLabel = date.toLocaleString(
        locale === 'fr-CA' ? 'fr-CA' : locale === 'es' ? 'es' : 'en-CA',
        { month: 'short', year: 'numeric' }
      )
      const year = date.getFullYear()
      const month = date.getMonth()

      const monthlyTotal = rows
        .filter((purchase) => {
          const purchaseDate = new Date(`${purchase.purchaseDate}T00:00:00`)
          return (
            purchaseDate.getFullYear() === year &&
            purchaseDate.getMonth() === month
          )
        })
        .reduce((sum, purchase) => sum + Number(purchase.total ?? 0), 0)

      return { month: monthLabel, total: monthlyTotal }
    }).reverse()

    const itemAggregation = new Map<
      string,
      {
        name: string
        totalSpent: number
        lastUnitPrice: number
        purchaseCount: number
      }
    >()

    for (const purchase of rows) {
      for (const item of purchase.items ?? []) {
        const key = item.name.trim().toLowerCase()
        const current = itemAggregation.get(key)

        if (current) {
          current.totalSpent += Number(item.lineTotal ?? 0)
          current.purchaseCount += 1
          current.lastUnitPrice = Number(item.unitPrice ?? current.lastUnitPrice ?? 0)
        } else {
          itemAggregation.set(key, {
            name: item.name,
            totalSpent: Number(item.lineTotal ?? 0),
            lastUnitPrice: Number(item.unitPrice ?? 0),
            purchaseCount: 1,
          })
        }
      }
    }

    const topItems = [...itemAggregation.values()]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)

    return {
      totalSpent,
      recentSpent,
      totalPurchases: rows.length,
      recentPurchases: recentPurchases.length,
      spendingByCategory,
      spendingBySupplier,
      monthlySpending,
      topItems,
    }
  }, [rows, locale])

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        Loading purchase statistics...
      </div>
    )
  }

  return (
    <div className={`space-y-${isMobile ? '4' : '6'}`}>
      <div className={`grid gap-${isMobile ? '3' : '6'} ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-4'}`}>
        <div className={`rounded-sm border border-gray-200 bg-white ${isMobile ? 'p-3' : 'p-6'}`}>
          <div className="flex items-center">
            <div className="flex-1">
              <p className={`text-gray-600 ${isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}`}>
                Total spent
              </p>
              <p className={`font-bold text-gray-900 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                {formatMoney(stats.totalSpent, locale)}
              </p>
            </div>
            <div className="text-blue-600">
              <svg className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className={`rounded-sm border border-gray-200 bg-white ${isMobile ? 'p-3' : 'p-6'}`}>
          <div className="flex items-center">
            <div className="flex-1">
              <p className={`text-gray-600 ${isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}`}>
                Last 30 days
              </p>
              <p className={`font-bold text-green-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                {formatMoney(stats.recentSpent, locale)}
              </p>
            </div>
            <div className="text-green-600">
              <svg className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className={`rounded-sm border border-gray-200 bg-white ${isMobile ? 'p-3' : 'p-6'}`}>
          <div className="flex items-center">
            <div className="flex-1">
              <p className={`text-gray-600 ${isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}`}>
                Total purchases
              </p>
              <p className={`font-bold text-purple-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                {stats.totalPurchases}
              </p>
            </div>
            <div className="text-purple-600">
              <svg className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className={`rounded-sm border border-gray-200 bg-white ${isMobile ? 'p-3' : 'p-6'}`}>
          <div className="flex items-center">
            <div className="flex-1">
              <p className={`text-gray-600 ${isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}`}>
                Recent purchases
              </p>
              <p className={`font-bold text-orange-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                {stats.recentPurchases}
              </p>
            </div>
            <div className="text-orange-600">
              <svg className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className={`grid gap-${isMobile ? '4' : '6'} ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        <div className={`rounded-sm border border-gray-200 bg-white ${isMobile ? 'p-4' : 'p-6'}`}>
          <h3 className={`mb-${isMobile ? '3' : '4'} font-semibold text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
            Spending by category
          </h3>
          <div className={`space-y-${isMobile ? '2' : '3'}`}>
            {Object.entries(stats.spendingByCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([category, amount]) => (
                <div key={category} className={`flex items-center justify-between ${isMobile ? 'py-1' : ''}`}>
                  <span className={`capitalize text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}`}>
                    {isMobile && category.length > 12 ? `${category.substring(0, 12)}...` : category}
                  </span>
                  <span className={`font-bold text-green-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    {formatMoney(amount, locale)}
                  </span>
                </div>
              ))}
            {Object.keys(stats.spendingByCategory).length === 0 && (
              <div className={`text-center text-gray-500 ${isMobile ? 'py-3 text-sm' : 'py-4'}`}>
                No purchase data available by category
              </div>
            )}
          </div>
        </div>

        <div className={`rounded-sm border border-gray-200 bg-white ${isMobile ? 'p-4' : 'p-6'}`}>
          <h3 className={`mb-${isMobile ? '3' : '4'} font-semibold text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
            Top items by spending
          </h3>
          <div className={`space-y-${isMobile ? '2' : '3'}`}>
            {stats.topItems.map((item, index) => (
              <div key={item.name} className={`flex items-center justify-between ${isMobile ? 'py-1' : ''}`}>
                <div className={`${isMobile ? 'min-w-0 flex-1' : ''} flex items-center gap-${isMobile ? '2' : '3'}`}>
                  <span className={`text-gray-500 ${isMobile ? 'w-4 text-xs font-medium' : 'w-6 text-xs font-medium'}`}>
                    #{index + 1}
                  </span>
                  <div className={isMobile ? 'min-w-0' : ''}>
                    <div className={`font-medium text-gray-900 ${isMobile ? 'truncate text-xs' : 'text-sm'}`}>
                      {item.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.purchaseCount} purchase{item.purchaseCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                <div className={`${isMobile ? 'ml-2 shrink-0' : ''} text-right`}>
                  <div className={`font-bold text-green-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    {formatMoney(item.totalSpent, locale)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatMoney(item.lastUnitPrice, locale)}
                  </div>
                </div>
              </div>
            ))}
            {stats.topItems.length === 0 && (
              <div className={`text-center text-gray-500 ${isMobile ? 'py-3 text-sm' : 'py-4'}`}>
                No item purchase data available
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`rounded-sm border border-gray-200 bg-white ${isMobile ? 'p-4' : 'p-6'}`}>
        <h3 className={`mb-${isMobile ? '3' : '4'} font-semibold text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
          Monthly spending (last 6 months)
        </h3>

        <div className={`grid gap-${isMobile ? '2' : '4'} ${isMobile ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-6'}`}>
          {stats.monthlySpending.map((monthData) => (
            <div key={monthData.month} className="text-center">
              <div className={`mb-1 font-medium text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                {monthData.month}
              </div>
              <div
                className={`font-bold ${monthData.total > 0 ? 'text-green-600' : 'text-gray-400'
                  } ${isMobile ? 'text-sm' : 'text-lg'}`}
              >
                {formatMoney(monthData.total, locale)}
              </div>

              {monthData.total > 0 && (
                <div className={`mt-1 rounded-full bg-green-100 ${isMobile ? 'h-1.5' : 'h-2'}`}>
                  <div
                    className="h-full rounded-full bg-green-600"
                    style={{
                      width: `${(monthData.total / Math.max(...stats.monthlySpending.map((m) => m.total || 1))) * 100}%`,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={`rounded-sm border border-gray-200 bg-white ${isMobile ? 'p-4' : 'p-6'}`}>
        <h3 className={`mb-${isMobile ? '3' : '4'} font-semibold text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
          Spending by supplier
        </h3>

        <div className={`space-y-${isMobile ? '2' : '3'}`}>
          {Object.entries(stats.spendingBySupplier)
            .sort(([, a], [, b]) => b - a)
            .slice(0, isMobile ? 5 : 10)
            .map(([supplier, amount]) => (
              <div key={supplier} className={`flex items-center justify-between ${isMobile ? 'py-1' : ''}`}>
                <span className={`font-medium text-gray-700 ${isMobile ? 'flex-1 truncate text-xs' : 'text-sm'}`}>
                  {isMobile && supplier.length > 20 ? `${supplier.substring(0, 20)}...` : supplier}
                </span>
                <span className={`font-bold text-green-600 ${isMobile ? 'ml-2 shrink-0 text-xs' : 'text-sm'}`}>
                  {formatMoney(amount, locale)}
                </span>
              </div>
            ))}
          {Object.keys(stats.spendingBySupplier).length === 0 && (
            <div className={`text-center text-gray-500 ${isMobile ? 'py-3 text-sm' : 'py-4'}`}>
              No supplier data available
            </div>
          )}
        </div>
      </div>
    </div>
  )
}