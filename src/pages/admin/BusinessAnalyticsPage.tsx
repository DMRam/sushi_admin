import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { collection, limit, onSnapshot, orderBy, query, type Unsubscribe } from 'firebase/firestore'
import { useProducts } from '../../context/ProductsContext'
import { useSales } from '../../context/SalesContext'
import { useExpenses } from '../../context/ExpensesContext'
import { useIngredients } from '../../context/IngredientsContext'
import { usePurchases } from '../../context/PurchasesContext'
import { db } from '../../firebase/firebase'
import BreakEvenAnalysis from '../../components/admin/BreakEvenAnalysis'
import ProfitabilityChart from '../../components/admin/tabs/business_analytics/ProfitabilityChart'
import ExpenseBreakdown from '../../components/admin/tabs/business_analytics/ExpenseBreakdown'
import ProfitAllocation from '../../components/admin/tabs/business_analytics/profit_allocations/ProfitAllocation'
import QuickExpenseForm from '../../components/admin/tabs/business_analytics/QuickExpenseForm'
import SalesChart from '../../components/admin/tabs/sales_tracking/SalesChart'

// ------------------------------
// Types & helpers
// ------------------------------

type TabId = 'overview' | 'break-even' | 'sales' | 'profitability' | 'expenses' | 'profit-allocation'
type DatePreset = 'today' | 'yesterday' | '7' | '30' | 'month' | 'custom'

type AnalyticsLineItem = {
    id: string
    name: string
    quantity: number
    unitPrice: number
    total: number
}

type AnalyticsOrder = {
    id: string
    source: 'web' | 'checkout' | 'clover' | 'manual'
    createdAt: Date
    total: number
    items: AnalyticsLineItem[]
}

type UberEatsAnalyticsOrder = {
    id: string
    receivedAt: Date
    total: number
    revenueIncluded: boolean
}

type AnalyticsShift = {
    id: string
    date: string
    clockIn: string
    clockOut: string
    breakMinutes: number
    hourlyRate: number
}

const CLOVER_CASH_EVENTS_PROXY_URL =
    import.meta.env.VITE_CLOVER_CASH_EVENTS_PROXY_URL ||
    import.meta.env.VITE_CLOVER_DASHBOARD_URL ||
    ''

const clamp = (num: number, min = -100, max = 100) => Math.min(Math.max(num, min), max)

const fmtCurrency = (v: number, digits = 0) =>
    `$${Number.isFinite(v) ? v.toFixed(digits) : '0'}`

const fmtFullDate = (date: Date, locale = 'en-CA') =>
    new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    }).format(date)

const fmtShortDate = (date: Date, locale = 'en-CA') =>
    new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date)

const toDateInput = (date: Date) => {
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    return `${year}-${month}-${day}`
}

const startOfDay = (date: Date) => {
    const next = new Date(date)
    next.setHours(0, 0, 0, 0)
    return next
}

const endOfDay = (date: Date) => {
    const next = new Date(date)
    next.setHours(23, 59, 59, 999)
    return next
}

const getPresetRange = (
    preset: DatePreset,
    customStart: string,
    customEnd: string,
    labels: {
        today: string
        yesterday: string
        last7: string
        last30: string
        monthToDate: string
    },
    locale: string
) => {
    const now = new Date()
    const todayStart = startOfDay(now)

    if (preset === 'today') return { start: todayStart, end: endOfDay(now), label: labels.today }

    if (preset === 'yesterday') {
        const yesterday = new Date(todayStart)
        yesterday.setDate(yesterday.getDate() - 1)
        return { start: startOfDay(yesterday), end: endOfDay(yesterday), label: labels.yesterday }
    }

    if (preset === '7' || preset === '30') {
        const days = Number(preset)
        const start = new Date(todayStart)
        start.setDate(start.getDate() - (days - 1))
        return { start, end: endOfDay(now), label: days === 7 ? labels.last7 : labels.last30 }
    }

    if (preset === 'month') {
        return {
            start: new Date(now.getFullYear(), now.getMonth(), 1),
            end: endOfDay(now),
            label: labels.monthToDate,
        }
    }

    const fallbackStart = new Date(todayStart)
    fallbackStart.setDate(fallbackStart.getDate() - 29)
    const start = customStart ? startOfDay(new Date(`${customStart}T00:00:00`)) : fallbackStart
    const end = customEnd ? endOfDay(new Date(`${customEnd}T00:00:00`)) : endOfDay(now)

    return {
        start,
        end,
        label: `${fmtShortDate(start, locale)} - ${fmtShortDate(end, locale)}`,
    }
}

const normalizeDate = (value: any): Date => {
    if (!value) return new Date()
    if (value?.toDate) return value.toDate()
    if (value instanceof Date) return value
    if (typeof value === 'number') return new Date(value > 9999999999 ? value : value * 1000)
    return new Date(value)
}

const parseJSON = (raw: unknown) => {
    if (typeof raw !== 'string') return null
    try {
        return JSON.parse(raw)
    } catch {
        return null
    }
}

const numberFromCents = (value: unknown) => {
    const numeric = Number(value ?? 0)
    return Number.isFinite(numeric) ? numeric / 100 : 0
}

const amountFromMaybeCents = (value: unknown) => {
    const numeric = Number(value ?? 0)
    if (!Number.isFinite(numeric)) return 0
    return Math.abs(numeric) >= 100 ? numeric / 100 : numeric
}

const isLaborExpense = (category: string) => ['salary', 'salaries', 'labor', 'payroll', 'wages'].includes(category.trim().toLowerCase())

const parseTimeToMinutes = (time: string) => {
    if (!time || !time.includes(':')) return 0
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
}

const calculateShiftPay = (shift: AnalyticsShift) => {
    const start = parseTimeToMinutes(shift.clockIn)
    let end = parseTimeToMinutes(shift.clockOut)
    if (end <= start) end += 24 * 60

    const workedHours = Math.max(0, end - start - Number(shift.breakMinutes || 0)) / 60
    const overtimeHours = Math.max(0, workedHours - 8)
    const regularHours = workedHours - overtimeHours

    return (regularHours * Number(shift.hourlyRate || 0)) + (overtimeHours * Number(shift.hourlyRate || 0) * 1.5)
}

const isExpenseInMonth = (expense: { date: string; recurring?: boolean }, month = new Date()) => {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0)
    const expenseDate = new Date(expense.date)

    return (expenseDate >= monthStart && expenseDate <= monthEnd) || Boolean(expense.recurring)
}

const isOrderInRange = (order: AnalyticsOrder, start: Date, end: Date) =>
    order.createdAt >= start && order.createdAt <= end

const isUberOrderInRange = (order: UberEatsAnalyticsOrder, start: Date, end: Date) =>
    order.receivedAt >= start && order.receivedAt <= end

const normalizeUnitPrice = (raw: any) => {
    if (raw.priceCents !== undefined) return numberFromCents(raw.priceCents)
    if (raw.unitPriceCents !== undefined) return numberFromCents(raw.unitPriceCents)

    const numeric = Number(raw.price ?? raw.unitPrice ?? raw.sellingPrice ?? raw.amount ?? 0)
    if (!Number.isFinite(numeric)) return 0

    return Number.isInteger(numeric) && Math.abs(numeric) >= 100 ? numeric / 100 : numeric
}

const normalizeQuantity = (value: unknown) => {
    const numeric = Number(value ?? 1)
    if (!Number.isFinite(numeric) || numeric <= 0) return 1
    return numeric >= 1000 ? numeric / 1000 : numeric
}

const arrayFromElements = (value: any): any[] => {
    if (Array.isArray(value)) return value
    if (Array.isArray(value?.elements)) return value.elements
    return []
}

const readOrderTotal = (data: any) => {
    const metadata = data.metadata || {}
    const metadataTotals = parseJSON(metadata.totals) || metadata.totals || {}
    const totals = data.totals || metadataTotals || {}
    const directTotal = totals.finalTotal ?? totals.total ?? metadataTotals.finalTotal ?? data.finalTotal ?? data.total

    return Number((directTotal ?? numberFromCents(data.expectedTotalCents)) || numberFromCents(metadata.expectedTotalCents) || 0)
}

const normalizeWebOrder = (id: string, data: any, source: 'web' | 'checkout'): AnalyticsOrder => {
    const rawItems = Array.isArray(data.items) ? data.items : []
    const items = rawItems.map((item: any, index: number) => {
        const quantity = normalizeQuantity(item.quantity ?? item.unitQty ?? item.qty ?? 1)
        const unitPrice = normalizeUnitPrice(item)
        const total = Number(item.total ?? item.lineTotal ?? 0) || unitPrice * quantity

        return {
            id: item.id || item.productId || `${id}-${index}`,
            name: item.name || item.itemName || 'Product',
            quantity,
            unitPrice,
            total,
        }
    })

    return {
        id,
        source,
        createdAt: normalizeDate(data.createdAt || data.updatedAt || data.paidAt),
        total: readOrderTotal(data) || items.reduce((sum: number, item: AnalyticsLineItem) => sum + item.total, 0),
        items,
    }
}

const normalizeUberEatsOrder = (id: string, data: any): UberEatsAnalyticsOrder => ({
    id,
    receivedAt: normalizeDate(data.receivedAt || data.updatedAt || data.createdAt),
    total: Number(data.total || data.orderTotal || data.totalAmount || 0),
    revenueIncluded: Boolean(data.revenueIncluded),
})

const normalizeCloverLineItems = (raw: any): AnalyticsLineItem[] => {
    const directLineItems = arrayFromElements(raw.lineItems)
    const orderLineItems = arrayFromElements(raw.orderDetails?.lineItems || raw.order?.lineItems)
    const paymentOrderLineItems = arrayFromElements(raw.paymentDetails?.order?.lineItems || raw.payment?.order?.lineItems)
    const sourceItems = directLineItems.length ? directLineItems : orderLineItems.length ? orderLineItems : paymentOrderLineItems

    return sourceItems.map((item: any, index: number) => {
        const quantity = normalizeQuantity(item.quantity ?? item.quantitySold ?? item.unitQty ?? item.qty ?? 1)
        const unitPrice = amountFromMaybeCents(item.price ?? item.unitPrice ?? item.amount ?? item.item?.price)
        const explicitTotal = item.total ?? item.lineItemTotal ?? item.priceWithModifiersAndItemAndOrderDiscounts ?? item.amount
        const total = explicitTotal !== undefined ? amountFromMaybeCents(explicitTotal) : unitPrice * quantity

        return {
            id: item.id || item.item?.id || `clover-line-${index}`,
            name: item.name || item.item?.name || item.itemName || 'Clover product',
            quantity,
            unitPrice,
            total,
        }
    }).filter((item) => item.name !== 'Clover product' || item.total > 0)
}

const normalizeCloverOrder = (raw: any, index: number): AnalyticsOrder => {
    const payments = arrayFromElements(raw.payments)
    const paymentTotal = payments.reduce((sum, payment) => sum + amountFromMaybeCents(payment.amount), 0)
    const items = normalizeCloverLineItems(raw)

    return {
        id: raw.id || raw.orderId || `clover-order-${index}`,
        source: 'clover',
        createdAt: normalizeDate(raw.clientCreatedTime || raw.createdTime || raw.modifiedTime || raw.createdAt),
        total: amountFromMaybeCents(raw.total || raw.paymentTotal) || paymentTotal || items.reduce((sum, item) => sum + item.total, 0),
        items,
    }
}

const normalizeCloverPayment = (raw: any, index: number): AnalyticsOrder => {
    const order = raw.order || {}
    const items = normalizeCloverLineItems(order)

    return {
        id: order.id || raw.orderId || raw.id || `clover-payment-${index}`,
        source: 'clover',
        createdAt: normalizeDate(raw.clientCreatedTime || raw.createdTime || raw.modifiedTime || raw.createdAt),
        total: amountFromMaybeCents(raw.amount || order.total || raw.total) || items.reduce((sum, item) => sum + item.total, 0),
        items,
    }
}

const foodCostColor = (pct: number) => {
    if (pct <= 30) return 'text-green-600'
    if (pct <= 35) return 'text-yellow-600'
    return 'text-red-600'
}

const badgeColorByNet = (net: number) => (net >= 0 ? 'text-green-600' : 'text-red-600')

const barWidthPct = (pct: number) => `${Math.max(0, Math.min(100, pct))}%`

// ------------------------------
// Overview subcomponents
// ------------------------------

interface Metrics {
    totalRevenue: number
    webRevenue: number
    cloverRevenue: number
    manualRevenue: number
    totalUnitsSold: number
    ordersCount: number
    monthlyExpenses: number
    ingredientCosts: number
    grossProfit: number
    netProfit: number
    grossMargin: number
    netMargin: number
    avgSaleValue: number
    avgDailyRevenue: number
    inventoryValue: number
    totalPurchases: number
    foodCostPercentage: number
    dailyBreakEvenDishes: number
    monthlyBreakEvenDishes: number
}

interface CloverSummary {
    connected: boolean
    loading: boolean
    error: string | null
    orders: number
    revenue: number
    webOrders: number
    webRevenue: number
    manualRevenue: number
}

interface UberSummary {
    events: number
    orders: number
    revenue: number
}

const OverviewMetrics: React.FC<{
    metrics: Metrics
    ingredientCount: number
    showQuickExpense: boolean
    clover: CloverSummary
    uber: UberSummary
    rangeLabel: string
}> = ({
    metrics,
    ingredientCount,
    showQuickExpense,
    clover,
    uber,
    rangeLabel,
}) => (
    <div className="space-y-6">
        {showQuickExpense && <QuickExpenseForm />}

        <div className="border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Live sales source</p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-950">
                        Website + Clover/POS revenue is included in this analytics view
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                        Web orders come from Firestore `webOrders`; POS revenue uses the Clover backend proxy when configured. Uber Eats is shown as a pending source and is not counted until credentials and order-detail sync are connected.
                    </p>
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4 lg:min-w-[680px]">
                    <div className="border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Web</p>
                        <p className="mt-1 font-semibold text-slate-950">{fmtCurrency(clover.webRevenue)} · {clover.webOrders} orders</p>
                    </div>
                    <div className="border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Clover/POS</p>
                        <p className="mt-1 font-semibold text-slate-950">{fmtCurrency(clover.revenue)} · {clover.orders} orders</p>
                    </div>
                    <div className="border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Uber Eats</p>
                        <p className={`mt-1 font-semibold ${uber.orders ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {uber.orders ? `${uber.orders} webhook orders` : 'Waiting for webhook'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{fmtCurrency(uber.revenue)} included · {uber.events} events</p>
                    </div>
                    <div className="border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Clover status</p>
                        <p className={`mt-1 font-semibold ${clover.connected ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {clover.loading ? 'Loading' : clover.connected ? 'Connected' : 'Proxy missing'}
                        </p>
                    </div>
                </div>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                <div className="border border-dashed border-slate-200 bg-slate-50/70 p-3">
                    <p className="font-semibold text-slate-900">Uber setup needed</p>
                    <p className="mt-1 leading-5">Production access, access token details, store ID, and a completed-order payload sample.</p>
                </div>
                <div className="border border-dashed border-slate-200 bg-slate-50/70 p-3">
                    <p className="font-semibold text-slate-900">Analytics requirement</p>
                    <p className="mt-1 leading-5">Import item lines, tax, tips, discounts, platform fees, and payout status separately from Clover/POS.</p>
                </div>
                <div className="border border-dashed border-slate-200 bg-slate-50/70 p-3">
                    <p className="font-semibold text-slate-900">Why separate</p>
                    <p className="mt-1 leading-5">Keeping Uber as its own source prevents double counting and makes real restaurant revenue easier to reconcile.</p>
                </div>
            </div>
            {clover.error && (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {clover.error}
                </p>
            )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            <div className="bg-white border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">{rangeLabel} revenue</p>
                        <p className="text-lg sm:text-xl font-semibold text-slate-950 mt-1">{fmtCurrency(metrics.totalRevenue)}</p>
                        <p className="text-xs text-slate-500 mt-1">{metrics.ordersCount} orders · {metrics.totalUnitsSold} items</p>
                    </div>
                    <div className="w-8 h-8 bg-slate-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-light text-gray-500 tracking-wide">FOOD COST %</p>
                        <p className={`text-lg sm:text-xl font-light ${foodCostColor(metrics.foodCostPercentage)} mt-1`}>
                            {metrics.foodCostPercentage.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1 font-light">
                            {metrics.foodCostPercentage <= 30 ? 'Excellent' : metrics.foodCostPercentage <= 35 ? 'Good' : 'High'}
                        </p>
                    </div>
                    <div className="w-8 h-8 bg-red-100 rounded-sm flex items-center justify-center">
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-light text-gray-500 tracking-wide">GROSS MARGIN</p>
                        <p className="text-lg sm:text-xl font-light text-blue-600 mt-1">{metrics.grossMargin.toFixed(0)}%</p>
                        <p className="text-xs text-gray-500 mt-1 font-light">{fmtCurrency(metrics.grossProfit)}</p>
                    </div>
                    <div className="w-8 h-8 bg-blue-100 rounded-sm flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-light text-gray-500 tracking-wide">NET PROFIT</p>
                        <p className="text-lg sm:text-xl font-light text-purple-600 mt-1">{fmtCurrency(metrics.netProfit)}</p>
                        <p className="text-xs text-gray-500 mt-1 font-light">{metrics.netMargin.toFixed(0)}% margin</p>
                    </div>
                    <div className="w-8 h-8 bg-purple-100 rounded-sm flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-light text-gray-500 tracking-wide">AVG DAILY</p>
                        <p className="text-lg sm:text-xl font-light text-orange-600 mt-1">{fmtCurrency(metrics.avgDailyRevenue)}</p>
                        <p className="text-xs text-gray-500 mt-1 font-light">Last 30 days</p>
                    </div>
                    <div className="w-8 h-8 bg-orange-100 rounded-sm flex items-center justify-center">
                        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-light text-gray-500 tracking-wide">INVENTORY VALUE</p>
                        <p className="text-lg sm:text-xl font-light text-indigo-600 mt-1">{fmtCurrency(metrics.inventoryValue)}</p>
                        <p className="text-xs text-gray-500 mt-1 font-light">{ingredientCount} items</p>
                    </div>
                    <div className="w-8 h-8 bg-indigo-100 rounded-sm flex items-center justify-center">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    </div>
)

const PerformanceInsights: React.FC<{ metrics: Metrics }> = ({ metrics }) => {
    const netColor = metrics.netMargin >= 15 ? 'bg-green-50 border-green-200' : metrics.netMargin >= 10 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
    const netText = metrics.netMargin >= 15 ? 'text-green-600' : metrics.netMargin >= 10 ? 'text-yellow-600' : 'text-red-600'

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Restaurant Performance */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">RESTAURANT PERFORMANCE</h3>
                <div className="space-y-3">
                    {/* Food Cost Insight */}
                    <div className={`p-3 rounded-sm border ${metrics.foodCostPercentage <= 30 ? 'bg-green-50 border-green-200' : metrics.foodCostPercentage <= 35 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex justify-between items-center">
                            <span className="font-light text-gray-900">Food Cost Percentage</span>
                            <span className={`font-light ${foodCostColor(metrics.foodCostPercentage)}`}>
                                {metrics.foodCostPercentage.toFixed(1)}%
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 font-light">
                            {metrics.foodCostPercentage <= 30
                                ? 'Excellent! Your food costs are well managed'
                                : metrics.foodCostPercentage <= 35
                                    ? 'Good - industry average is 28-35%'
                                    : 'High - review ingredient costs and portion sizes'}
                        </p>
                    </div>

                    {/* Profitability Insight */}
                    <div className={`p-3 rounded-sm border ${netColor}`}>
                        <div className="flex justify-between items-center">
                            <span className="font-light text-gray-900">Net Profitability</span>
                            <span className={`font-light ${netText}`}>{metrics.netMargin.toFixed(1)}%</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 font-light">
                            {metrics.netMargin >= 15
                                ? 'Excellent profitability!'
                                : metrics.netMargin >= 10
                                    ? 'Good performance for restaurant industry'
                                    : 'Below target - review expenses and pricing'}
                        </p>
                    </div>

                    {/* Break-Even Insight */}
                    <div className="p-3 rounded-sm bg-blue-50 border border-blue-200">
                        <div className="flex justify-between items-center">
                            <span className="font-light text-gray-900">Daily Break-Even</span>
                            <span className="font-light text-blue-600">
                                {metrics.dailyBreakEvenDishes > 0
                                    ? `${metrics.dailyBreakEvenDishes} dishes/day`
                                    : 'N/A'}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 font-light">
                            {metrics.monthlyBreakEvenDishes > 0
                                ? `Need to sell ${metrics.monthlyBreakEvenDishes} dishes monthly to break even`
                                : 'No sales or price data available yet'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">COST BREAKDOWN</h3>
                <div className="space-y-4">
                    {/* Ingredient Costs */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-light text-gray-600">Ingredient Costs</span>
                            <span className="font-light text-gray-900">{fmtCurrency(metrics.ingredientCosts, 2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-red-500 rounded-full h-2" style={{ width: barWidthPct(metrics.foodCostPercentage) }} />
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between font-light">
                            <span>Food Cost</span>
                            <span>
                                {metrics.foodCostPercentage.toFixed(1)}% of revenue
                                {metrics.foodCostPercentage > 35 && ' ⚠️ High'}
                            </span>
                        </div>
                    </div>

                    {/* Operating Expenses */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-light text-gray-600">Operating Expenses</span>
                            <span className="font-light text-gray-900">{fmtCurrency(metrics.monthlyExpenses, 2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-orange-500 rounded-full h-2"
                                style={{
                                    width: barWidthPct(
                                        metrics.totalRevenue > 0
                                            ? (metrics.monthlyExpenses / metrics.totalRevenue) * 100
                                            : metrics.monthlyExpenses > 0
                                                ? 100
                                                : 0,
                                    ),
                                }}
                            />
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between font-light">
                            <span>Rent, Labor, Utilities</span>
                            <span>
                                {metrics.totalRevenue > 0
                                    ? metrics.monthlyExpenses / metrics.totalRevenue > 1
                                        ? `Expenses are ${(metrics.monthlyExpenses / metrics.totalRevenue).toFixed(1)}x revenue`
                                        : `${((metrics.monthlyExpenses / metrics.totalRevenue) * 100).toFixed(0)}% of revenue`
                                    : metrics.monthlyExpenses > 0
                                        ? `${fmtCurrency(metrics.monthlyExpenses)}/month fixed costs`
                                        : 'No expenses recorded'}
                                {metrics.monthlyExpenses > metrics.totalRevenue && metrics.totalRevenue > 0 && ' 🔴'}
                            </span>
                        </div>
                    </div>

                    {/* Net Profit */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-light text-gray-600">Net Profit</span>
                            <span className="font-light text-gray-900">{fmtCurrency(metrics.netProfit, 2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-500 rounded-full h-2" style={{ width: barWidthPct(clamp(metrics.netMargin)) }} />
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between font-light">
                            <span>Your Take Home</span>
                            <span>
                                {metrics.netMargin.toFixed(1)}% of revenue
                                {metrics.netMargin < 0 && ' 🔴 Operating at loss'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cost Structure & Financial Health combined section */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 lg:col-span-2">
                <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">COST STRUCTURE</h3>
                <div className="space-y-4">
                    {/* Fixed Costs */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-light text-gray-600">Fixed Costs (Rent, etc.)</span>
                            <span className="font-light text-gray-900">{fmtCurrency(metrics.monthlyExpenses, 2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-orange-500 rounded-full h-2"
                                style={{
                                    width: barWidthPct(
                                        metrics.totalRevenue > 0 ? (metrics.monthlyExpenses / metrics.totalRevenue) * 100 : 100,
                                    ),
                                }}
                            />
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between font-light">
                            <span>Monthly overhead</span>
                            <span>
                                {metrics.totalRevenue > 0
                                    ? `Covers ${Math.ceil(metrics.monthlyExpenses / (metrics.avgSaleValue || 1)).toLocaleString()} dishes`
                                    : 'No sales to cover costs'}
                            </span>
                        </div>
                    </div>

                    {/* Ingredient Costs */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-light text-gray-600">Ingredient Costs</span>
                            <span className="font-light text-gray-900">{fmtCurrency(metrics.ingredientCosts, 2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-red-500 rounded-full h-2" style={{ width: barWidthPct(metrics.foodCostPercentage) }} />
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between font-light">
                            <span>Food Cost %</span>
                            <span className={foodCostColor(metrics.foodCostPercentage)}>
                                {metrics.foodCostPercentage.toFixed(1)}% (
                                {metrics.foodCostPercentage <= 30 ? 'Good' : metrics.foodCostPercentage <= 35 ? 'Average' : 'High'})
                            </span>
                        </div>
                    </div>

                    {/* Net Profit/Loss */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-light text-gray-600">Net {metrics.netProfit >= 0 ? 'Profit' : 'Loss'}</span>
                            <span className={`font-light ${badgeColorByNet(metrics.netProfit)}`}>
                                {fmtCurrency(Math.abs(metrics.netProfit), 2)}
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={`rounded-full h-2 ${metrics.netProfit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{
                                    width: barWidthPct(
                                        metrics.totalRevenue > 0 ? (Math.abs(metrics.netProfit) / metrics.totalRevenue) * 100 : 0,
                                    ),
                                }}
                            />
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between font-light">
                            <span>Monthly Result</span>
                            <span>
                                {metrics.netProfit >= 0
                                    ? `${metrics.netMargin.toFixed(1)}% profit margin`
                                    : `${Math.abs(metrics.netMargin).toFixed(1)}% loss margin`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Financial Status */}
                <div className={`mt-6 p-4 rounded-sm border ${metrics.netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-light text-gray-900">Current Financial Status</span>
                        <span className={`font-light ${badgeColorByNet(metrics.netProfit)}`}>
                            {metrics.netProfit >= 0 ? '✅ Profitable' : '⚠️ Operating at Loss'}
                        </span>
                    </div>
                    <div className="text-sm text-gray-600 font-light">
                        {metrics.netProfit >= 0
                            ? `You're making ${fmtCurrency(metrics.netProfit)} profit monthly`
                            : `You need ${fmtCurrency(Math.abs(metrics.netProfit))} more in monthly revenue to break even`}
                    </div>
                </div>
            </div>

            {/* Industry Benchmarks */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 lg:col-span-2">
                <h4 className="font-light text-gray-900 mb-3 tracking-wide">INDUSTRY BENCHMARKS</h4>
                <div className="text-sm text-gray-600 grid grid-cols-1 sm:grid-cols-3 gap-3 font-light">
                    <div className="flex justify-between"><span>Ideal Food Cost:</span><span>25-30%</span></div>
                    <div className="flex justify-between"><span>Avg. Net Profit (industry):</span><span>3-5%</span></div>
                    <div className="flex justify-between"><span>Healthy Net Profit:</span><span>10-15%</span></div>
                </div>
            </div>
        </div>
    )
}

// ------------------------------
// Main component
// ------------------------------

export default function BusinessAnalyticsPage() {
    const { t, i18n } = useTranslation()
    const { products, loading: productsLoading } = useProducts()
    const { sales, loading: salesLoading } = useSales()
    const { expenses, loading: expensesLoading } = useExpenses()
    const { ingredients, loading: ingredientsLoading } = useIngredients()
    const { purchases, loading: purchasesLoading } = usePurchases()

    const [activeTab, setActiveTab] = useState<TabId>('overview')
    const [webOrders, setWebOrders] = useState<AnalyticsOrder[]>([])
    const [checkoutOrders, setCheckoutOrders] = useState<AnalyticsOrder[]>([])
    const [cloverOrders, setCloverOrders] = useState<AnalyticsOrder[]>([])
    const [uberEatsOrders, setUberEatsOrders] = useState<UberEatsAnalyticsOrder[]>([])
    const [uberEatsEventCount, setUberEatsEventCount] = useState(0)
    const [employeeShifts, setEmployeeShifts] = useState<AnalyticsShift[]>([])
    const [cloverLoading, setCloverLoading] = useState(false)
    const [cloverError, setCloverError] = useState<string | null>(null)
    const [datePreset, setDatePreset] = useState<DatePreset>('30')
    const [customStart, setCustomStart] = useState(() => {
        const start = new Date()
        start.setDate(start.getDate() - 29)
        return toDateInput(start)
    })
    const [customEnd, setCustomEnd] = useState(() => toDateInput(new Date()))

    const loading = productsLoading || salesLoading || expensesLoading || ingredientsLoading || purchasesLoading
    const dateRangeLabels = useMemo(() => ({
        today: t('adminDashboard.filters.today', 'Today'),
        yesterday: t('adminDashboard.filters.yesterday', 'Yesterday'),
        last7: t('adminDashboard.filters.last7', 'Last 7 days'),
        last30: t('adminDashboard.filters.last30', 'Last 30 days'),
        monthToDate: t('adminDashboard.filters.monthToDate', 'Month to date'),
    }), [t])
    const dateRange = useMemo(
        () => getPresetRange(datePreset, customStart, customEnd, dateRangeLabels, i18n.language || 'en-CA'),
        [datePreset, customStart, customEnd, dateRangeLabels, i18n.language]
    )
    const todayLabel = useMemo(() => fmtFullDate(new Date(), i18n.language || 'en-CA'), [i18n.language])

    useEffect(() => {
        const unsubscribers: Unsubscribe[] = []

        unsubscribers.push(onSnapshot(
            query(collection(db, 'webOrders'), orderBy('createdAt', 'desc'), limit(240)),
            (snapshot) => {
                setWebOrders(snapshot.docs.map((docSnap) => normalizeWebOrder(docSnap.id, docSnap.data(), 'web')))
            },
            (error) => {
                console.error('Failed to load web order analytics', error)
            }
        ))

        unsubscribers.push(onSnapshot(
            query(collection(db, 'cloverCheckoutSessions'), orderBy('createdAt', 'desc'), limit(240)),
            (snapshot) => {
                setCheckoutOrders(snapshot.docs.map((docSnap) => normalizeWebOrder(docSnap.id, docSnap.data(), 'checkout')))
            },
            (error) => {
                console.error('Failed to load checkout analytics', error)
            }
        ))

        unsubscribers.push(onSnapshot(
            query(collection(db, 'uberEatsOrders'), limit(240)),
            (snapshot) => {
                setUberEatsOrders(snapshot.docs.map((docSnap) => normalizeUberEatsOrder(docSnap.id, docSnap.data())))
            },
            (error) => {
                console.error('Failed to load Uber Eats analytics', error)
            }
        ))

        unsubscribers.push(onSnapshot(
            query(collection(db, 'uberEatsWebhookEvents'), limit(300)),
            (snapshot) => {
                setUberEatsEventCount(snapshot.size)
            },
            (error) => {
                console.error('Failed to load Uber Eats webhook analytics', error)
            }
        ))

        unsubscribers.push(onSnapshot(
            query(collection(db, 'employeeShifts'), orderBy('date', 'desc'), limit(300)),
            (snapshot) => {
                setEmployeeShifts(snapshot.docs.map((docSnap) => {
                    const data = docSnap.data()
                    return {
                        id: docSnap.id,
                        date: data.date || new Date().toISOString().slice(0, 10),
                        clockIn: data.clockIn || '00:00',
                        clockOut: data.clockOut || '00:00',
                        breakMinutes: Number(data.breakMinutes || 0),
                        hourlyRate: Number(data.hourlyRate || 0),
                    }
                }))
            },
            (error) => {
                console.error('Failed to load payroll analytics', error)
            }
        ))

        return () => {
            unsubscribers.forEach((unsubscribe) => unsubscribe())
        }
    }, [])

    useEffect(() => {
        let cancelled = false

        async function loadCloverOrders() {
            if (!CLOVER_CASH_EVENTS_PROXY_URL) {
                setCloverOrders([])
                setCloverError(null)
                return
            }

            setCloverLoading(true)
            setCloverError(null)

            try {
                const url = new URL(CLOVER_CASH_EVENTS_PROXY_URL)
                url.searchParams.set('limit', '20')
                url.searchParams.set('detailLimit', '8')
                url.searchParams.set('orderLimit', '60')

                const response = await fetch(url.toString(), { headers: { accept: 'application/json' } })
                const payload = await response.json().catch(() => null)

                if (!response.ok) {
                    throw new Error(payload?.error || `Clover proxy returned ${response.status}`)
                }

                const rawOrders = Array.isArray(payload?.recentOrders) ? payload.recentOrders : []
                const rawPayments = Array.isArray(payload?.recentPayments) ? payload.recentPayments : []
                const byId = new Map<string, AnalyticsOrder>()

                rawOrders.map(normalizeCloverOrder).forEach((order: AnalyticsOrder) => {
                    byId.set(order.id, order)
                })
                rawPayments.map(normalizeCloverPayment).forEach((order: AnalyticsOrder) => {
                    const existing = byId.get(order.id)
                    if (!existing || (!existing.items.length && order.items.length)) byId.set(order.id, order)
                })

                if (!cancelled) {
                    setCloverOrders(Array.from(byId.values()))
                }
            } catch (error: any) {
                console.error('Failed to load Clover analytics', error)
                if (!cancelled) {
                    setCloverOrders([])
                    setCloverError(error?.message || 'Unable to load Clover analytics.')
                }
            } finally {
                if (!cancelled) setCloverLoading(false)
            }
        }

        loadCloverOrders()

        return () => {
            cancelled = true
        }
    }, [])

    const onlineOrders = useMemo(() => {
        const byId = new Map<string, AnalyticsOrder>()
        checkoutOrders.forEach((order) => byId.set(order.id, order))
        webOrders.forEach((order) => byId.set(order.id, order))
        return Array.from(byId.values())
    }, [checkoutOrders, webOrders])

    const manualOrders = useMemo<AnalyticsOrder[]>(() => (
        sales.map((sale) => ({
            id: sale.id,
            source: 'manual',
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
    ), [sales])

    const filteredOnlineOrders = useMemo(
        () => onlineOrders.filter((order) => isOrderInRange(order, dateRange.start, dateRange.end)),
        [onlineOrders, dateRange]
    )

    const filteredCloverOrders = useMemo(
        () => cloverOrders.filter((order) => isOrderInRange(order, dateRange.start, dateRange.end)),
        [cloverOrders, dateRange]
    )

    const filteredManualOrders = useMemo(
        () => manualOrders.filter((order) => isOrderInRange(order, dateRange.start, dateRange.end)),
        [manualOrders, dateRange]
    )

    const filteredUberEatsOrders = useMemo(
        () => uberEatsOrders.filter((order) => isUberOrderInRange(order, dateRange.start, dateRange.end)),
        [uberEatsOrders, dateRange]
    )

    const uberSummary = useMemo<UberSummary>(() => ({
        events: uberEatsEventCount,
        orders: filteredUberEatsOrders.length,
        revenue: filteredUberEatsOrders
            .filter((order) => order.revenueIncluded)
            .reduce((sum, order) => sum + order.total, 0),
    }), [filteredUberEatsOrders, uberEatsEventCount])

    const filteredCombinedOrders = useMemo(
        () => [...filteredOnlineOrders, ...filteredCloverOrders, ...filteredManualOrders]
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
        [filteredOnlineOrders, filteredCloverOrders, filteredManualOrders]
    )

    const productCostByName = useMemo(() => {
        const map = new Map<string, number>()
        products.forEach((product) => {
            map.set(product.name.trim().toLowerCase(), Number(product.costPrice || 0))
        })
        return map
    }, [products])

    const actualLineItems = useMemo(() => {
        return filteredCombinedOrders.flatMap((order) => order.items)
    }, [filteredCombinedOrders])

    const actualLaborCost = useMemo(() => {
        const now = new Date()
        return employeeShifts
            .filter((shift) => {
                const shiftDate = new Date(`${shift.date}T12:00:00`)
                return shiftDate.getFullYear() === now.getFullYear() && shiftDate.getMonth() === now.getMonth()
            })
            .reduce((sum, shift) => sum + calculateShiftPay(shift), 0)
    }, [employeeShifts])

    const expenseLaborFallback = useMemo(() => {
        return expenses
            .filter((expense) => isExpenseInMonth(expense) && isLaborExpense(expense.category))
            .reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
    }, [expenses])

    const nonLaborMonthlyExpenses = useMemo(() => {
        return expenses
            .filter((expense) => isExpenseInMonth(expense) && !isLaborExpense(expense.category))
            .reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
    }, [expenses])

    const adjustedMonthlyExpenses = useMemo(() => {
        return nonLaborMonthlyExpenses + (actualLaborCost > 0 ? actualLaborCost : expenseLaborFallback)
    }, [nonLaborMonthlyExpenses, actualLaborCost, expenseLaborFallback])

    // Business metrics calculations
    const metrics = useMemo((): Metrics => {
        if (loading) {
            return {
                totalRevenue: 0,
                webRevenue: 0,
                cloverRevenue: 0,
                manualRevenue: 0,
                totalUnitsSold: 0,
                ordersCount: 0,
                monthlyExpenses: 0,
                ingredientCosts: 0,
                grossProfit: 0,
                netProfit: 0,
                grossMargin: 0,
                netMargin: 0,
                avgSaleValue: 0,
                avgDailyRevenue: 0,
                inventoryValue: 0,
                totalPurchases: 0,
                foodCostPercentage: 0,
                dailyBreakEvenDishes: 0,
                monthlyBreakEvenDishes: 0
            }
        }

        const combinedOrders = filteredCombinedOrders

        const totalRevenue = combinedOrders.reduce((sum, order) => sum + order.total, 0)
        const webRevenue = filteredOnlineOrders.reduce((sum, order) => sum + order.total, 0)
        const cloverRevenue = filteredCloverOrders.reduce((sum, order) => sum + order.total, 0)
        const manualRevenue = filteredManualOrders.reduce((sum, order) => sum + order.total, 0)

        const totalUnitsSold = combinedOrders.reduce((sum, order) =>
            sum + order.items.reduce((productSum, product) => productSum + product.quantity, 0), 0
        )

        const monthlyExpenses = adjustedMonthlyExpenses

        const manualCosts = sales
            .filter((sale) => {
                const saleDate = new Date(sale.saleDate)
                return saleDate >= dateRange.start && saleDate <= dateRange.end
            })
            .reduce((sum, sale) => sum + Number(sale.costTotal || 0), 0)
        const realOrderCosts = [...filteredOnlineOrders, ...filteredCloverOrders]
            .reduce((sum, order) => {
                return sum + order.items.reduce((productSum, item) => {
                    const cost = productCostByName.get(item.name.trim().toLowerCase()) || 0
                    return productSum + (cost * item.quantity)
                }, 0)
            }, 0)
        const ingredientCosts = manualCosts + realOrderCosts

        // Calculate inventory value
        const inventoryValue = ingredients.reduce((total, ingredient) => {
            return total + (ingredient.currentStock * ingredient.pricePerKg)
        }, 0)

        // Calculate break-even dishes
        const avgSaleValue = totalUnitsSold > 0 ? totalRevenue / totalUnitsSold : 0
        const avgContributionMargin = avgSaleValue > 0 ? avgSaleValue - (ingredientCosts / totalUnitsSold) : 0
        const monthlyBreakEvenDishes = avgContributionMargin > 0 ? Math.ceil(monthlyExpenses / avgContributionMargin) : 0
        const dailyBreakEvenDishes = avgSaleValue > 0 ? Math.ceil(monthlyBreakEvenDishes / 30) : 0

        const grossProfit = totalRevenue - ingredientCosts
        const netProfit = grossProfit - monthlyExpenses
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
        const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
        const foodCostPercentage = totalRevenue > 0 ? (ingredientCosts / totalRevenue) * 100 : 0

        // Average metrics
        const rangeDays = Math.max(1, Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / 86400000))
        const avgDailyRevenue = totalRevenue > 0 ? totalRevenue / rangeDays : 0

        return {
            totalRevenue,
            webRevenue,
            cloverRevenue,
            manualRevenue,
            totalUnitsSold,
            ordersCount: combinedOrders.length,
            monthlyExpenses,
            ingredientCosts,
            grossProfit,
            netProfit,
            grossMargin,
            netMargin,
            avgSaleValue,
            avgDailyRevenue,
            inventoryValue,
            totalPurchases: 0,
            foodCostPercentage,
            dailyBreakEvenDishes,
            monthlyBreakEvenDishes
        }
    }, [
        filteredCombinedOrders,
        filteredOnlineOrders,
        filteredCloverOrders,
        filteredManualOrders,
        productCostByName,
        sales,
        products,
        expenses,
        ingredients,
        purchases,
        loading,
        adjustedMonthlyExpenses,
        dateRange,
    ])

    const cloverSummary = useMemo<CloverSummary>(() => ({
        connected: Boolean(CLOVER_CASH_EVENTS_PROXY_URL),
        loading: cloverLoading,
        error: cloverError,
        orders: filteredCloverOrders.length,
        revenue: filteredCloverOrders.reduce((sum, order) => sum + order.total, 0),
        webOrders: filteredOnlineOrders.length,
        webRevenue: filteredOnlineOrders.reduce((sum, order) => sum + order.total, 0),
        manualRevenue: metrics.manualRevenue,
    }), [cloverLoading, cloverError, filteredCloverOrders, filteredOnlineOrders, metrics.manualRevenue])

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-lg text-gray-600 font-light">Loading business analytics...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-6 border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                {t('adminDashboard.todayIs', 'Today is {{date}}', { date: todayLabel })}
                            </p>
                            <h1 className="mt-2 text-2xl font-semibold text-slate-950 tracking-tight">Business Analytics</h1>
                            <p className="text-slate-500 mt-1 text-sm">
                                {t('adminDashboard.analyticsSubtitle', 'Track performance, costs, and profitability for {{range}}.', { range: dateRange.label.toLowerCase() })}
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[minmax(180px,220px)_repeat(2,minmax(145px,1fr))]">
                            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                                {t('adminDashboard.filters.period', 'Period')}
                                <select
                                    value={datePreset}
                                    onChange={(event) => setDatePreset(event.target.value as DatePreset)}
                                    className="mt-1 block w-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                                >
                                    <option value="today">{t('adminDashboard.filters.todayOnly', 'Today only')}</option>
                                    <option value="yesterday">{t('adminDashboard.filters.yesterdayOnly', 'Yesterday only')}</option>
                                    <option value="7">{dateRangeLabels.last7}</option>
                                    <option value="30">{dateRangeLabels.last30}</option>
                                    <option value="month">{dateRangeLabels.monthToDate}</option>
                                    <option value="custom">{t('adminDashboard.filters.customRange', 'Custom range')}</option>
                                </select>
                            </label>

                            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                                {t('adminDashboard.filters.from', 'From')}
                                <input
                                    type="date"
                                    value={customStart}
                                    onChange={(event) => {
                                        setCustomStart(event.target.value)
                                        setDatePreset('custom')
                                    }}
                                    className="mt-1 block w-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                                />
                            </label>

                            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                                {t('adminDashboard.filters.to', 'To')}
                                <input
                                    type="date"
                                    value={customEnd}
                                    onChange={(event) => {
                                        setCustomEnd(event.target.value)
                                        setDatePreset('custom')
                                    }}
                                    className="mt-1 block w-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                                />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 shadow-sm">
                    {/* Navigation Tabs */}
                    <div className="border-b border-slate-200 bg-slate-100/70">
                        <nav className="flex overflow-x-auto">
                            {[
                                { id: 'overview', name: t('adminDashboard.tabs.overview', 'Overview') },
                                { id: 'break-even', name: t('adminDashboard.tabs.breakEven', 'Break-even') },
                                { id: 'sales', name: t('adminDashboard.tabs.sales', 'Sales') },
                                { id: 'profitability', name: t('adminDashboard.tabs.profitability', 'Profitability') },
                                { id: 'expenses', name: t('adminDashboard.tabs.expenses', 'Expenses') },
                                { id: 'profit-allocation', name: t('adminDashboard.tabs.profitDistribution', 'Profit distribution') }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as TabId)}
                                    className={`border-r border-slate-200 px-4 py-3 text-xs font-semibold tracking-[0.12em] whitespace-nowrap transition ${activeTab === tab.id
                                        ? 'bg-white text-slate-950 shadow-[inset_0_3px_0_#0f62fe]'
                                        : 'text-slate-500 hover:bg-white/70 hover:text-slate-900'
                                        }`}
                                >
                                    {tab.name}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-4 sm:p-6">
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <OverviewMetrics
                                    metrics={metrics}
                                    ingredientCount={ingredients.length}
                                    showQuickExpense={metrics.monthlyExpenses === 0}
                                    clover={cloverSummary}
                                    uber={uberSummary}
                                    rangeLabel={dateRange.label}
                                />
                                <PerformanceInsights metrics={metrics} />
                            </div>
                        )}

                        {/* Other Tabs */}
                        {activeTab === 'break-even' && (
                            <BreakEvenAnalysis
                                actualRevenue={metrics.totalRevenue}
                                actualUnitsSold={metrics.totalUnitsSold}
                                actualOrders={metrics.ordersCount}
                                monthlyExpenses={metrics.monthlyExpenses}
                                estimatedIngredientCosts={metrics.ingredientCosts}
                            />
                        )}
                        {activeTab === 'sales' && <SalesChart orders={filteredCombinedOrders} rangeLabel={dateRange.label} />}
                        {activeTab === 'profitability' && <ProfitabilityChart actualItems={actualLineItems} />}
                        {activeTab === 'expenses' && (
                            <ExpenseBreakdown
                                actualLaborCost={actualLaborCost}
                                adjustedMonthlyExpenses={adjustedMonthlyExpenses}
                                laborFallbackAmount={expenseLaborFallback}
                            />
                        )}
                        {activeTab === 'profit-allocation' && (
                            <ProfitAllocation
                                actualFinancials={{
                                    totalRevenue: metrics.totalRevenue,
                                    monthlyExpenses: metrics.monthlyExpenses,
                                    cogs: metrics.ingredientCosts,
                                    grossProfit: metrics.grossProfit,
                                    netProfit: metrics.netProfit,
                                    salesCount: metrics.ordersCount,
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
