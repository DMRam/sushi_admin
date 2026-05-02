import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import PurchaseForm from '../../components/admin/tabs/purchases/PurchaseForm'
import { PurchaseList } from '../../components/admin/tabs/purchases/PurchaseList'
import { PurchaseStats } from '../../components/admin/tabs/purchases/PurchaseStats'

import {
  subscribeToPurchases,
  getIngredientsForMapping,
  updatePurchaseItems,
} from './tabs/purchases/purchaseFirestore'
import { formatMoney, resolvePurchaseLocale } from './tabs/purchases/purchaseLocale'

import type { PurchaseItem, PurchaseRecord } from './tabs/purchases/purchaseTypes'
import type { IngredientOption } from './tabs/purchases/purchaseMappingUtils'
import PurchaseMappingPanel from './tabs/purchases/PurchaseMappingPanel'

interface PurchasesPageProps {
  isMobile?: boolean
}

type PurchaseTabId = 'form' | 'list' | 'stats'

function isSameDay(dateString: string, now: Date) {
  const date = new Date(`${dateString}T00:00:00`)
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function isSameMonth(dateString: string, now: Date) {
  const date = new Date(`${dateString}T00:00:00`)
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  )
}

function getSourceLabel(source: string | undefined, t: TFunction) {
  switch (source) {
    case 'n8n':
      return t('purchases.common.n8n', 'n8n')
    case 'import':
      return t('purchases.common.import', 'Import')
    case 'app':
    default:
      return t('purchases.common.app', 'App')
  }
}

export default function PurchasesPage({ isMobile = false }: PurchasesPageProps) {
  const { t, i18n } = useTranslation()
  const locale = resolvePurchaseLocale(i18n.language)

  const [activeTab, setActiveTab] = useState<PurchaseTabId>('form')
  const [rows, setRows] = useState<PurchaseRecord[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRecord | null>(null)
  const [ingredients, setIngredients] = useState<IngredientOption[]>([])
  const [loadingIngredients, setLoadingIngredients] = useState(false)

  const mappingPanelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToPurchases(
      (nextRows) => {
        setRows(nextRows)
        setLoading(false)
      },
      (error) => {
        console.error('Failed to subscribe to purchases', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadIngredients() {
      try {
        setLoadingIngredients(true)
        const data = await getIngredientsForMapping()
        if (mounted) setIngredients(data)
      } catch (error) {
        console.error('Failed to load ingredients for mapping', error)
      } finally {
        if (mounted) setLoadingIngredients(false)
      }
    }

    loadIngredients()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedPurchase) return

    const refreshed = rows.find((row) => row.id === selectedPurchase.id)
    if (refreshed) {
      setSelectedPurchase(refreshed)
    } else {
      setSelectedPurchase(null)
    }
  }, [rows, selectedPurchase])

  useEffect(() => {
    if (!selectedPurchase) return

    const timer = window.setTimeout(() => {
      mappingPanelRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 50)

    return () => window.clearTimeout(timer)
  }, [selectedPurchase])

  function handleSelectPurchase(purchase: PurchaseRecord) {
    setActiveTab('list')
    setSelectedPurchase(purchase)
  }

  const stats = useMemo(() => {
    const now = new Date()

    const todayRows = rows.filter((row) => isSameDay(row.purchaseDate, now))
    const monthRows = rows.filter((row) => isSameMonth(row.purchaseDate, now))
    const validTotals = rows
      .map((row) => Number(row.total ?? 0))
      .filter((value) => Number.isFinite(value))

    const uniqueSuppliers = new Set(
      rows.map((row) => String(row.supplierName ?? '').trim()).filter(Boolean)
    )

    const todayTotal = todayRows.reduce((sum, row) => sum + Number(row.total ?? 0), 0)
    const monthTotal = monthRows.reduce((sum, row) => sum + Number(row.total ?? 0), 0)

    const averageCost =
      validTotals.length > 0
        ? validTotals.reduce((sum, value) => sum + value, 0) / validTotals.length
        : 0

    const monthBySupplier = new Map<string, number>()
    for (const row of monthRows) {
      const key = String(row.supplierName ?? '').trim()
      if (!key) continue
      monthBySupplier.set(key, (monthBySupplier.get(key) ?? 0) + Number(row.total ?? 0))
    }

    const topSupplierEntry = [...monthBySupplier.entries()].sort((a, b) => b[1] - a[1])[0]

    const monthlyAverage =
      monthRows.length > 0
        ? monthRows.reduce((sum, row) => sum + Number(row.total ?? 0), 0) / monthRows.length
        : 0

    const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonthRows = rows.filter((row) => isSameMonth(row.purchaseDate, previousMonthDate))
    const previousMonthTotal = previousMonthRows.reduce((sum, row) => sum + Number(row.total ?? 0), 0)

    let trendLabel = t('purchases.statsCards.noTrend', 'No trend')
    if (monthTotal > previousMonthTotal) {
      trendLabel = t('purchases.statsCards.up', 'Up')
    } else if (monthTotal < previousMonthTotal) {
      trendLabel = t('purchases.statsCards.down', 'Down')
    } else if (monthTotal > 0 || previousMonthTotal > 0) {
      trendLabel = t('purchases.statsCards.stable', 'Stable')
    }

    return {
      todayTotal,
      monthTotal,
      averageCost,
      suppliersCount: uniqueSuppliers.size,
      topSupplier: topSupplierEntry?.[0] ?? t('purchases.common.noData', 'No data'),
      monthlyAverage,
      trendLabel,
      recentSources: rows
        .slice(0, 8)
        .map((row) => row.source)
        .filter(Boolean) as string[],
    }
  }, [rows, t])

  const tabs: Array<{ id: PurchaseTabId; label: string }> = [
    { id: 'form', label: t('purchases.tabs.form', 'Record') },
    { id: 'list', label: t('purchases.tabs.list', 'History') },
    { id: 'stats', label: t('purchases.tabs.stats', 'Statistics') },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className={`mx-auto max-w-7xl ${isMobile ? 'px-3 py-4 sm:py-6' : 'px-4 py-6 sm:px-6 lg:px-8 lg:py-8'
          }`}
      >
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-light tracking-wide text-gray-900 sm:text-3xl">
            {t('purchases.title', 'Purchases')}
          </h1>
          <p className="mt-1 text-sm font-light text-gray-500 sm:text-base">
            {t('purchases.subtitle', 'Track purchases and supplier costs')}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <SummaryCard
            label={t('purchases.cards.today', "Today's purchases")}
            value={formatMoney(stats.todayTotal, locale)}
          />
          <SummaryCard
            label={t('purchases.cards.month', 'This month')}
            value={formatMoney(stats.monthTotal, locale)}
          />
          <SummaryCard
            label={t('purchases.cards.average', 'Average cost')}
            value={formatMoney(stats.averageCost, locale)}
          />
          <SummaryCard
            label={t('purchases.cards.suppliers', 'Suppliers')}
            value={String(stats.suppliersCount)}
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-5 overflow-x-auto px-4 sm:px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    'whitespace-nowrap border-b-2 px-1 py-4 text-sm font-light tracking-wide transition-all duration-300',
                    activeTab === tab.id
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === 'form' && (
              <div className="animate-fade-in">
                <div className="mb-4 sm:mb-6">
                  <h2 className="mb-1 text-lg font-light tracking-wide text-gray-900 sm:text-xl">
                    {t('purchases.sections.newPurchase', 'New purchase')}
                  </h2>
                  <p className="text-xs font-light text-gray-500 sm:text-sm">
                    {t('purchases.sections.newPurchaseHint', 'Quickly add items or invoice data')}
                  </p>
                </div>

                <PurchaseForm isMobile={isMobile} locale={locale} />
              </div>
            )}

            {activeTab === 'list' && (
              <div className="animate-fade-in">
                <div className="mb-4 sm:mb-6">
                  <h2 className="mb-1 text-lg font-light tracking-wide text-gray-900 sm:text-xl">
                    {t('purchases.sections.history', 'Purchase history')}
                  </h2>
                  <p className="text-xs font-light text-gray-500 sm:text-sm">
                    {t('purchases.sections.historyHint', 'View and manage recorded purchases')}
                  </p>
                </div>

                <PurchaseList
                  isMobile={isMobile}
                  locale={locale}
                  rows={rows}
                  loading={loading}
                  onSelect={handleSelectPurchase}
                />

                {selectedPurchase && (
                  <div
                    ref={mappingPanelRef}
                    className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-light tracking-wide text-gray-900 sm:text-xl">
                          Map purchase items
                        </h3>
                        <p className="text-xs font-light text-gray-500 sm:text-sm">
                          Review invoice image and map items to ingredients
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedPurchase(null)}
                        className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Close
                      </button>
                    </div>

                    {loadingIngredients ? (
                      <div className="py-8 text-center text-sm text-gray-500">
                        Loading ingredients...
                      </div>
                    ) : (
                      <PurchaseMappingPanel
                        purchase={selectedPurchase}
                        ingredients={ingredients}
                        onSave={async (items: PurchaseItem[]) => {
                          await updatePurchaseItems(selectedPurchase.id, items)
                          setSelectedPurchase(null)
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="animate-fade-in">
                <div className="mb-4 sm:mb-6">
                  <h2 className="mb-1 text-lg font-light tracking-wide text-gray-900 sm:text-xl">
                    {t('purchases.sections.stats', 'Analytics')}
                  </h2>
                  <p className="text-xs font-light text-gray-500 sm:text-sm">
                    {t('purchases.sections.statsHint', 'Analyze spending and suppliers')}
                  </p>
                </div>

                <PurchaseStats
                  isMobile={isMobile}
                  locale={locale}
                  rows={rows}
                  loading={loading}
                />

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  <InfoCard
                    tone="blue"
                    title={t('purchases.statsCards.topSupplier', 'Top supplier')}
                    value={stats.topSupplier}
                    subtitle={t(
                      'purchases.statsCards.topSupplierHint',
                      'Highest spending this month'
                    )}
                  />

                  <InfoCard
                    tone="green"
                    title={t('purchases.statsCards.monthlyAverage', 'Monthly average')}
                    value={formatMoney(stats.monthlyAverage, locale)}
                    subtitle={t(
                      'purchases.statsCards.monthlyAverageHint',
                      'Average purchase amount this month'
                    )}
                  />

                  <InfoCard
                    tone="purple"
                    title={t('purchases.statsCards.costTrend', 'Cost trend')}
                    value={stats.trendLabel}
                    subtitle={t(
                      'purchases.statsCards.costTrendHint',
                      'Compared with previous month'
                    )}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                {t('purchases.realtime.title', 'Live intake')}
              </h3>
              <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                {t(
                  'purchases.realtime.subtitle',
                  'Records created from the app or from n8n POST will appear here automatically.'
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(stats.recentSources)).map((source, index) => (
                <span
                  key={`${source}-${index}`}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                >
                  {getSourceLabel(source, t)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .overflow-x-auto::-webkit-scrollbar {
          display: none;
        }
        .overflow-x-auto {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-light uppercase tracking-wide text-gray-500 sm:text-sm">
        {label}
      </p>
      <p className="mt-2 text-xl font-light text-gray-900 sm:text-2xl">{value}</p>
    </div>
  )
}

function InfoCard({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string
  value: string
  subtitle: string
  tone: 'blue' | 'green' | 'purple'
}) {
  const toneClass = {
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    green: 'border-green-200 bg-green-50 text-green-900',
    purple: 'border-purple-200 bg-purple-50 text-purple-900',
  }[tone]

  const subtitleClass = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
  }[tone]

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs font-light uppercase tracking-wide">{title}</p>
      <p className="mt-2 text-xl font-light sm:text-2xl">{value}</p>
      <p className={`mt-1 text-xs ${subtitleClass}`}>{subtitle}</p>
    </div>
  )
}