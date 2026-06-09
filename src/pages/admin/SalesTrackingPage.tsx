import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  Boxes,
  CalendarDays,
  ChevronRight,
  CheckCircle2,
  Clock,
  CreditCard,
  DatabaseZap,
  ExternalLink,
  Package,
  PartyPopper,
  RefreshCw,
  ShoppingBag,
  Star,
  Trophy,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import { collection, limit, onSnapshot, orderBy, query, type Unsubscribe } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useProducts } from '../../context/ProductsContext'
import { useIngredients } from '../../context/IngredientsContext'
import { usePurchases } from '../../context/PurchasesContext'
import { useSales } from '../../context/SalesContext'
import { supabase } from '../../lib/supabase'
import type { TableOrder } from '../../components/admin/service/serviceTypes'

type CheckoutSession = {
  id: string
  createdAt: Date
  customerName: string
  customerEmail: string
  total: number
  subtotal: number
  paymentStatus: string
  deliveryMethod: string
  pickupTime: string
  orderNotes: string
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
}

type UberEatsOrder = {
  id: string
  receivedAt: Date
  orderId: string
  status: string
  eventType: string
  detailsStatus: string
  revenueIncluded: boolean
  total: number
}

type LoyaltyStats = {
  customers: number
  pointsIssued: number
}

type CloverLineItem = {
  id: string
  name: string
  quantity: number
  price: number
  total: number
}

type CloverCashEvent = {
  id: string
  createdAt: Date
  amount: number
  eventType: string
  orderId: string
  paymentId: string
  employeeId: string
  deviceId: string
  employeeName: string
  note: string
  lineItems: CloverLineItem[]
  raw: any
}

type CloverRecentOrder = {
  id: string
  source: 'clover' | 'web'
  createdAt: Date
  total: number
  paymentState: string
  employeeName: string
  customerName: string
  customerEmail: string
  customerPhone: string
  lineItems: CloverLineItem[]
  raw: any
}

type DashboardEmployeeShift = {
  id: string
  date: string
  employeeName: string
  clockIn: string
  clockOut: string
  breakMinutes: number
  hourlyRate: number
  source?: string
  approved?: boolean
}

type DashboardDatePreset = 'today' | 'yesterday' | '7' | '30' | 'custom'

const CLOVER_CASH_EVENTS_PROXY_URL =
  import.meta.env.VITE_CLOVER_CASH_EVENTS_PROXY_URL ||
  import.meta.env.VITE_CLOVER_DASHBOARD_URL ||
  ''

function money(value: number) {
  return `$${(Number.isFinite(value) ? value : 0).toFixed(2)}`
}

function dateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function fullDateLabel(date: Date, locale = 'en-CA') {
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function shortDateLabel(date: Date, locale = 'en-CA') {
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function quantityLabel(value: number) {
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function normalizeDate(value: any): Date {
  if (!value) return new Date()
  if (value?.toDate) return value.toDate()
  if (value instanceof Date) return value
  if (typeof value === 'number') return new Date(value > 9999999999 ? value : value * 1000)
  return new Date(value)
}

function normalizeDashboardShift(id: string, raw: any): DashboardEmployeeShift {
  return {
    id,
    date: String(raw.date || dateInputValue(normalizeDate(raw.createdAt))),
    employeeName: raw.employeeName || raw.name || raw.employee?.name || 'Unknown',
    clockIn: String(raw.clockIn || raw.startTime || '00:00'),
    clockOut: String(raw.clockOut || raw.endTime || '00:00'),
    breakMinutes: Number(raw.breakMinutes || raw.break || 0),
    hourlyRate: Number(raw.hourlyRate || raw.rate || 0),
    source: raw.source || 'manual',
    approved: raw.approved === true,
  }
}

function parseClockMinutes(value: string) {
  const [hourRaw, minuteRaw] = String(value || '00:00').split(':')
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw)

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0
  return (hour * 60) + minute
}

function calculateShiftHours(shift: Pick<DashboardEmployeeShift, 'clockIn' | 'clockOut' | 'breakMinutes'>) {
  const start = parseClockMinutes(shift.clockIn)
  let end = parseClockMinutes(shift.clockOut)
  if (end < start) end += 24 * 60
  return Math.max(0, end - start - Number(shift.breakMinutes || 0)) / 60
}

function parseJSON(raw: unknown) {
  if (typeof raw !== 'string') return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function numberFromCents(value: unknown) {
  const numeric = Number(value ?? 0)
  return Number.isFinite(numeric) ? numeric / 100 : 0
}

function normalizeUnitPrice(raw: any) {
  if (raw.priceCents !== undefined) return numberFromCents(raw.priceCents)
  if (raw.unitPriceCents !== undefined) return numberFromCents(raw.unitPriceCents)

  const numeric = Number(raw.price ?? raw.unitPrice ?? raw.sellingPrice ?? 0)
  if (!Number.isFinite(numeric)) return 0

  // Website orders sometimes carry item prices as cents in `price`.
  return Number.isInteger(numeric) && Math.abs(numeric) >= 100 ? numeric / 100 : numeric
}

function arrayFromElements(value: any): any[] {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.elements)) return value.elements
  return []
}

function amountFromMaybeCents(value: unknown) {
  const numeric = Number(value ?? 0)
  if (!Number.isFinite(numeric)) return 0
  return Math.abs(numeric) >= 100 ? numeric / 100 : numeric
}

function normalizeCloverQuantity(value: unknown) {
  const numeric = Number(value ?? 1)
  if (!Number.isFinite(numeric) || numeric <= 0) return 1

  // Clover can return quantity in thousandths, where 1000 means one item.
  if (numeric >= 1000) return numeric / 1000

  return numeric
}

function readSessionTotal(data: any) {
  const metadata = data.metadata || {}
  const metadataTotals = parseJSON(metadata.totals) || metadata.totals || {}
  const totals = data.totals || metadataTotals || {}
  const directTotal = totals.finalTotal ?? totals.total ?? metadataTotals.finalTotal ?? data.finalTotal ?? data.total

  return Number((directTotal ?? numberFromCents(data.expectedTotalCents)) || numberFromCents(metadata.expectedTotalCents) || 0)
}

function readSessionSubtotal(data: any) {
  const metadata = data.metadata || {}
  const metadataTotals = parseJSON(metadata.totals) || metadata.totals || {}
  const totals = data.totals || metadataTotals || {}
  const directSubtotal = totals.subtotal ?? metadataTotals.subtotal ?? data.subtotal

  return Number((directSubtotal ?? numberFromCents(metadata.subtotalCents)) || 0)
}

function normalizeCheckoutSession(id: string, data: any): CheckoutSession {
  const metadata = data.metadata || {}
  const fullForm = typeof data.fullForm === 'string' ? parseJSON(data.fullForm) || {} : data.fullForm || {}
  const metadataFullForm = typeof metadata.fullForm === 'string' ? parseJSON(metadata.fullForm) || {} : metadata.fullForm || {}
  const customerInfo = typeof metadata.customerInfo === 'string' ? parseJSON(metadata.customerInfo) || {} : metadata.customerInfo || {}
  const directCustomerInfo = typeof data.customerInfo === 'string' ? parseJSON(data.customerInfo) || {} : data.customerInfo || {}
  const rawItems = Array.isArray(data.items) ? data.items : []

  return {
    id,
    createdAt: normalizeDate(data.createdAt || metadata.createdAt),
    customerName: data.customerName || directCustomerInfo.name || metadata.customerName || customerInfo.name || fullForm.firstName || 'Guest',
    customerEmail: data.customerEmail || directCustomerInfo.email || metadata.customerEmail || customerInfo.email || fullForm.email || '',
    total: readSessionTotal(data),
    subtotal: readSessionSubtotal(data),
    paymentStatus: data.paymentStatus || data.status || metadata.paymentStatus || 'unknown',
    deliveryMethod: fullForm.deliveryMethod || metadataFullForm.deliveryMethod || metadata.deliveryMethod || 'pickup',
    pickupTime: fullForm.pickupTime || metadataFullForm.pickupTime || metadata.pickupTime || '',
    orderNotes: fullForm.orderNotes || metadataFullForm.orderNotes || metadata.orderNotes || '',
    items: rawItems.map((item: any) => ({
      name: item.name || 'Product',
      quantity: Number(item.quantity ?? item.unitQty ?? 1) || 1,
      price: normalizeUnitPrice(item),
    })),
  }
}

function normalizeUberEatsOrder(id: string, data: any): UberEatsOrder {
  return {
    id,
    receivedAt: normalizeDate(data.receivedAt || data.updatedAt || data.createdAt),
    orderId: data.orderId || id,
    status: data.status || 'NEW',
    eventType: data.eventType || 'unknown',
    detailsStatus: data.detailsStatus || 'pending_credentials',
    revenueIncluded: Boolean(data.revenueIncluded),
    total: Number(data.total || data.orderTotal || data.totalAmount || 0),
  }
}

function normalizeCloverLineItems(raw: any): CloverLineItem[] {
  const directLineItems = arrayFromElements(raw.lineItems)
  const orderLineItems = arrayFromElements(raw.orderDetails?.lineItems || raw.order?.lineItems)
  const paymentOrderLineItems = arrayFromElements(raw.paymentDetails?.order?.lineItems || raw.payment?.order?.lineItems)
  const sourceItems = directLineItems.length ? directLineItems : orderLineItems.length ? orderLineItems : paymentOrderLineItems

  return sourceItems
    .map((item: any, index: number) => {
      const rawQuantity = item.quantity ?? item.quantitySold ?? item.unitQty ?? item.qty ?? 1
      const quantity = normalizeCloverQuantity(rawQuantity)
      const unitPrice = amountFromMaybeCents(item.price ?? item.unitPrice ?? item.amount ?? item.item?.price)
      const explicitTotal = item.total ?? item.lineItemTotal ?? item.priceWithModifiersAndItemAndOrderDiscounts ?? item.amount
      const explicitTotalValue = explicitTotal !== undefined ? amountFromMaybeCents(explicitTotal) : 0
      const calculatedTotal = unitPrice * quantity
      const total = calculatedTotal > 0 ? calculatedTotal : explicitTotalValue

      return {
        id: item.id || item.item?.id || `clover-line-${index}`,
        name: item.name || item.item?.name || item.itemName || 'Clover product',
        quantity,
        price: unitPrice,
        total,
      }
    })
    .filter((item) => item.name && item.name !== 'Clover product' || item.total > 0)
}

function normalizeCashEvent(raw: any, index: number): CloverCashEvent {
  const employee = raw.employee || raw.employeeRef || raw.employeeInfo || {}
  const device = raw.device || raw.deviceRef || {}
  const amountCents = raw.amountChange ?? raw.amount ?? raw.cashAmount ?? raw.total ?? raw.netAmount ?? raw.value
  const note = raw.note || raw.notes || raw.reason || raw.description || ''
  const orderMatch = String(note).match(/Order ID:\s*([A-Z0-9]+)/i)
  const paymentMatch = String(note).match(/Payment ID:\s*([A-Z0-9]+)/i)
  const refundedPaymentMatch = String(note).match(/paiement[^A-Z0-9]*([A-Z0-9]{8,})/i)

  return {
    id: raw.id || raw.uuid || `cash-event-${index}`,
    createdAt: normalizeDate(raw.timestamp || raw.createdTime || raw.clientCreatedTime || raw.createdAt || raw.date),
    amount: Math.abs(Number(amountCents || 0)) >= 100 ? numberFromCents(amountCents) : Number(amountCents || 0),
    eventType: raw.eventType || raw.type || raw.event || raw.reason || 'cash_event',
    orderId: raw.order?.id || raw.orderId || orderMatch?.[1] || '',
    paymentId: raw.payment?.id || raw.paymentId || paymentMatch?.[1] || refundedPaymentMatch?.[1] || '',
    employeeId: employee.id || raw.employeeId || '',
    deviceId: device.id || raw.deviceId || '',
    employeeName: employee.name || employee.displayName || raw.employeeName || raw.cashierName || employee.id || 'Unknown',
    note,
    lineItems: normalizeCloverLineItems(raw),
    raw,
  }
}

function normalizeCloverCustomer(raw: any) {
  const customers = arrayFromElements(raw.customers || raw.customer)
  const customer = customers[0] || raw.customer || {}
  const email = arrayFromElements(customer.emailAddresses || customer.emails)[0]
  const phone = arrayFromElements(customer.phoneNumbers || customer.phones)[0]
  const firstName = customer.firstName || customer.givenName || ''
  const lastName = customer.lastName || customer.familyName || ''
  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  return {
    name: customer.name || customer.fullName || fullName || raw.customerName || 'Walk-in customer',
    email: email?.emailAddress || email?.address || raw.customerEmail || '',
    phone: phone?.phoneNumber || phone?.number || raw.customerPhone || '',
  }
}

function normalizeRecentOrder(raw: any, index: number): CloverRecentOrder {
  const customer = normalizeCloverCustomer(raw)
  const payments = arrayFromElements(raw.payments)
  const paymentTotal = payments.reduce((sum, payment) => sum + amountFromMaybeCents(payment.amount), 0)
  const employee = raw.employee || raw.employeeRef || {}

  return {
    id: raw.id || `clover-order-${index}`,
    source: 'clover',
    createdAt: normalizeDate(raw.clientCreatedTime || raw.createdTime || raw.modifiedTime || raw.createdAt),
    total: amountFromMaybeCents(raw.total || raw.paymentTotal) || paymentTotal,
    paymentState: raw.paymentState || raw.state || raw.payType || 'unknown',
    employeeName: employee.name || employee.displayName || employee.id || raw.employeeName || 'Unknown',
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    lineItems: normalizeCloverLineItems(raw),
    raw,
  }
}

function normalizePaymentAsOrder(raw: any, index: number): CloverRecentOrder {
  const order = raw.order || {}
  const employee = raw.employee || order.employee || {}
  const customer = normalizeCloverCustomer(order)

  return {
    id: order.id || raw.orderId || raw.id || `clover-payment-${index}`,
    source: 'clover',
    createdAt: normalizeDate(raw.clientCreatedTime || raw.createdTime || raw.modifiedTime || raw.createdAt),
    total: amountFromMaybeCents(raw.amount || order.total || raw.total),
    paymentState: raw.result || raw.state || order.paymentState || 'paid',
    employeeName: employee.name || employee.displayName || employee.id || 'Unknown',
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    lineItems: normalizeCloverLineItems(order),
    raw,
  }
}

function normalizeWebSessionAsOrder(session: CheckoutSession): CloverRecentOrder {
  return {
    id: session.id,
    source: 'web',
    createdAt: session.createdAt,
    total: session.total,
    paymentState: session.paymentStatus,
    employeeName: 'Website checkout',
    customerName: session.customerName,
    customerEmail: session.customerEmail,
    customerPhone: '',
    lineItems: session.items.map((item, index) => ({
      id: `${session.id}-${index}`,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity,
    })),
    raw: session,
  }
}

function isSameDay(date: Date, compare = new Date()) {
  return date.getFullYear() === compare.getFullYear()
    && date.getMonth() === compare.getMonth()
    && date.getDate() === compare.getDate()
}

function isWithinDays(date: Date, days: number) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  cutoff.setHours(0, 0, 0, 0)
  return date >= cutoff
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function dashboardDateRange(
  preset: DashboardDatePreset,
  customStart: string,
  customEnd: string,
  labels: { today: string; yesterday: string; last7: string; last30: string },
  locale: string
) {
  const now = new Date()
  const today = startOfDay(now)

  if (preset === 'today') return { start: today, end: endOfDay(now), label: labels.today }

  if (preset === 'yesterday') {
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    return { start: startOfDay(yesterday), end: endOfDay(yesterday), label: labels.yesterday }
  }

  if (preset === '7' || preset === '30') {
    const days = Number(preset)
    const start = new Date(today)
    start.setDate(start.getDate() - (days - 1))
    return { start, end: endOfDay(now), label: days === 7 ? labels.last7 : labels.last30 }
  }

  const fallbackStart = new Date(today)
  fallbackStart.setDate(fallbackStart.getDate() - 6)
  const start = customStart ? startOfDay(new Date(`${customStart}T00:00:00`)) : fallbackStart
  const end = customEnd ? endOfDay(new Date(`${customEnd}T00:00:00`)) : endOfDay(now)

  return {
    start,
    end,
    label: `${shortDateLabel(start, locale)} - ${shortDateLabel(end, locale)}`,
  }
}

function isInRange(date: Date, start: Date, end: Date) {
  return date >= start && date <= end
}

function isOperationalProductName(name: string) {
  return !/^test\b/i.test(name.trim())
}

function startOfDayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function dayLabel(date: Date) {
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function mergeCloverRecentOrders(orders: CloverRecentOrder[], payments: CloverRecentOrder[]) {
  const byKey = new Map<string, CloverRecentOrder>()

  ;[...orders, ...payments].forEach((order) => {
    const key = order.id || `${order.source}-${order.createdAt.getTime()}-${order.total}`
    const existing = byKey.get(key)

    if (!existing || (!existing.lineItems.length && order.lineItems.length)) {
      byKey.set(key, order)
    }
  })

  return Array.from(byKey.values())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

function toTimestampMs(value: any) {
  if (!value) return Date.now()
  if (value?.toDate) return value.toDate().getTime()
  if (value instanceof Date) return value.getTime()
  return new Date(value).getTime()
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'dark',
  loading = false,
}: {
  label: string
  value: string
  detail: string
  icon: ComponentType<{ className?: string }>
  tone?: 'dark' | 'green' | 'orange' | 'blue' | 'amber'
  loading?: boolean
}) {
  const toneClass = {
    dark: 'bg-slate-950 text-white',
    green: 'bg-emerald-700 text-white',
    orange: 'bg-slate-700 text-white',
    blue: 'bg-blue-600 text-white',
    amber: 'bg-amber-600 text-white',
  }[tone]

  return (
    <div className="admin-dashboard-card group relative overflow-hidden border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-400">
      {loading && <span className="admin-loading-bar absolute inset-x-0 top-0 h-1" />}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-2 text-sm leading-5 text-slate-500">{detail}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center ${toneClass} transition group-hover:scale-[1.03]`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function StatusPill({
  label,
  state,
  loading = false,
}: {
  label: string
  state: string
  loading?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 border border-slate-200 bg-white px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
        <span className={`h-2.5 w-2.5 ${loading ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'}`} />
        {state}
      </span>
    </div>
  )
}

function OwnerCommandCenter({
  loading,
  totalRevenue,
  totalOrders,
  webRevenue,
  posRevenue,
  attentionCount,
  payrollCost,
  lowStockCount,
  pendingPayments,
  catalogGaps,
  onNavigate,
}: {
  loading: boolean
  totalRevenue: number
  totalOrders: number
  webRevenue: number
  posRevenue: number
  attentionCount: number
  payrollCost: number
  lowStockCount: number
  pendingPayments: number
  catalogGaps: number
  onNavigate: (path: string) => void
}) {
  const { t } = useTranslation()
  const posShare = totalRevenue > 0 ? Math.round((posRevenue / totalRevenue) * 100) : 0
  const webShare = totalRevenue > 0 ? Math.round((webRevenue / totalRevenue) * 100) : 0

  return (
    <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
      <div className="admin-dashboard-card relative overflow-hidden border border-slate-200 bg-white p-5 shadow-sm">
        {loading && <span className="admin-loading-bar absolute inset-x-0 top-0 h-1" />}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              {t('adminDashboard.commandCenter.label', 'Owner console')}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {t('adminDashboard.commandCenter.title', 'What matters right now')}
            </h2>
          </div>
          <div className={`border px-3 py-2 text-sm font-semibold ${attentionCount ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-emerald-300 bg-emerald-50 text-emerald-700'}`}>
            {attentionCount ? t('adminDashboard.commandCenter.reviewCount', '{{count}} to review', { count: attentionCount }) : t('adminDashboard.commandCenter.clear', 'All clear')}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t('adminDashboard.commandCenter.sales', 'Sales')}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{money(totalRevenue)}</p>
            <p className="mt-1 text-sm text-slate-500">{totalOrders} {t('adminDashboard.ordersShort', 'orders')}</p>
          </div>
          <div className="border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t('adminDashboard.commandCenter.payroll', 'Payroll')}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{money(payrollCost)}</p>
            <p className="mt-1 text-sm text-slate-500">{t('adminDashboard.commandCenter.selectedPeriod', 'selected period')}</p>
          </div>
          <div className="border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t('adminDashboard.commandCenter.risk', 'Risk')}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{attentionCount}</p>
            <p className="mt-1 text-sm text-slate-500">{t('adminDashboard.commandCenter.ownerItems', 'owner actions')}</p>
          </div>
        </div>

        <div className="mt-5 border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
            <span>{t('adminDashboard.commandCenter.revenuePath', 'Revenue source')}</span>
            <span>{webShare}% web · {posShare}% POS</span>
          </div>
          <div className="mt-3 flex h-3 overflow-hidden bg-slate-100">
            <div className="bg-blue-600 transition-all duration-700" style={{ width: `${webShare}%` }} />
            <div className="bg-slate-950 transition-all duration-700" style={{ width: `${posShare}%` }} />
          </div>
        </div>
      </div>

      <div className="admin-dashboard-card border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t('adminDashboard.commandCenter.nextActions', 'Next actions')}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {t('adminDashboard.commandCenter.preventTitle', 'Prevent service problems before they happen')}
            </h2>
          </div>
          <div className="grid min-w-[220px] gap-2">
            <StatusPill label="Orders" state={loading ? 'Loading' : 'Live'} loading={loading} />
            <StatusPill label="Clover" state="Synced" loading={false} />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            {
              title: t('adminDashboard.commandCenter.stockAction', 'Stock before dinner'),
              detail: t('adminDashboard.commandCenter.stockActionDetail', '{{count}} ingredients need a look.', { count: lowStockCount }),
              path: '/admin/stock',
              urgent: lowStockCount > 0,
            },
            {
              title: t('adminDashboard.commandCenter.paymentAction', 'Payment follow-up'),
              detail: t('adminDashboard.commandCenter.paymentActionDetail', '{{count}} table orders pending.', { count: pendingPayments }),
              path: '/admin/sales-tracking',
              urgent: pendingPayments > 0,
            },
            {
              title: t('adminDashboard.commandCenter.catalogAction', 'Online catalog'),
              detail: t('adminDashboard.commandCenter.catalogActionDetail', '{{count}} missing images or prices.', { count: catalogGaps }),
              path: '/admin/products',
              urgent: catalogGaps > 0,
            },
            {
              title: t('adminDashboard.commandCenter.payrollAction', 'Payroll review'),
              detail: t('adminDashboard.commandCenter.payrollActionDetail', 'Validate hours and pending approvals.'),
              path: '/admin/payroll',
              urgent: false,
            },
          ].map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => onNavigate(item.path)}
              className="group flex min-h-[96px] items-center justify-between gap-4 border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-600 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-base font-semibold text-slate-950">
                  <span className={`h-2.5 w-2.5 ${item.urgent ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'}`} />
                  {item.title}
                </span>
                <span className="mt-1 block text-sm leading-5 text-slate-500">{item.detail}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700" />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function RevenueChart({
  data,
  title = 'Revenue',
  subtitle = 'Selected period',
}: {
  data: Array<{ label: string; web: number; pos: number; webOrders: number; posOrders: number }>
  title?: string
  subtitle?: string
}) {
  const { t } = useTranslation()
  const maxDailyTotal = Math.max(...data.map((item) => item.web + item.pos), 1)
  const webTotal = data.reduce((sum, item) => sum + item.web, 0)
  const posTotal = data.reduce((sum, item) => sum + item.pos, 0)
  const webOrderTotal = data.reduce((sum, item) => sum + item.webOrders, 0)
  const posOrderTotal = data.reduce((sum, item) => sum + item.posOrders, 0)
  const daysWithActivity = data.filter((item) => item.web > 0 || item.pos > 0).length
  const peakDay = data.reduce((current, item) => (item.web + item.pos > current.web + current.pos ? item : current), data[0] || { label: '-', web: 0, pos: 0, webOrders: 0, posOrders: 0 })
  const chartMinWidth = Math.max(780, data.length * 92)

  return (
    <div className="admin-dashboard-card min-w-0 overflow-hidden border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('adminDashboard.salesChart.trend', 'Trend')}</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {t('adminDashboard.salesChart.rangeSummary', '{{range}} · {{activeDays}}/{{totalDays}} active days · peak {{peakLabel}} {{peakValue}}', {
              range: subtitle,
              activeDays: daysWithActivity,
              totalDays: data.length,
              peakLabel: peakDay.label,
              peakValue: money(peakDay.web + peakDay.pos),
            })}
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 text-xs font-semibold text-slate-600 sm:min-w-[360px]">
          <span className="inline-flex items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="h-2.5 w-2.5 bg-blue-600" />
            {t('adminDashboard.web', 'Web')} {money(webTotal)} · {webOrderTotal}
          </span>
          <span className="inline-flex items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="h-2.5 w-2.5 bg-slate-900" />
            {t('adminDashboard.pos', 'POS')} {money(posTotal)} · {posOrderTotal}
          </span>
          <span className="col-span-2 inline-flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-slate-500">
            <BarChart3 className="h-4 w-4 text-blue-700" />
            {t('adminDashboard.salesChart.scaleNote', 'Daily bars are scaled by true daily total. Peak day: {{max}}', { max: money(maxDailyTotal) })}
          </span>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto overscroll-x-contain pb-3">
        <div className="flex h-[300px] items-end gap-4" style={{ minWidth: chartMinWidth }}>
          {data.map((item) => {
            const total = item.web + item.pos
            const totalHeight = total > 0 ? Math.max(2, (total / maxDailyTotal) * 100) : 0
            const webShare = total > 0 ? (item.web / total) * 100 : 0
            const posShare = total > 0 ? (item.pos / total) * 100 : 0
            const orderTotal = item.webOrders + item.posOrders

            return (
              <div key={item.label} className="flex w-[76px] shrink-0 flex-col items-center gap-3">
                <div className="relative h-48 w-full border border-slate-100 bg-slate-50 px-2 py-2">
                  <div className="absolute inset-x-0 top-1/4 border-t border-dashed border-slate-200" />
                  <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200" />
                  <div className="absolute inset-x-0 top-3/4 border-t border-dashed border-slate-200" />
                  <div className="absolute inset-x-3 bottom-2 top-2 flex items-end">
                    <div
                      className="relative z-[1] flex w-full flex-col-reverse overflow-hidden border border-slate-950/20 bg-white"
                      style={{ height: `${totalHeight}%` }}
                      title={`${item.label}: ${money(total)} · ${t('adminDashboard.web', 'Web')} ${money(item.web)} · ${t('adminDashboard.pos', 'POS')} ${money(item.pos)}`}
                    >
                      {item.web > 0 && (
                        <div
                          className="w-full bg-blue-600 transition-all hover:bg-blue-700"
                          style={{ height: `${webShare}%` }}
                        />
                      )}
                      {item.pos > 0 && (
                        <div
                          className="w-full bg-slate-900 transition-all hover:bg-slate-800"
                          style={{ height: `${posShare}%` }}
                        />
                      )}
                    </div>
                  </div>
                  {total === 0 && (
                    <div className="absolute inset-x-3 bottom-2 h-px bg-slate-300" />
                  )}
                </div>
                <div className="w-full text-center">
                  <p className="text-xs font-semibold leading-4 text-slate-800">{item.label}</p>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-950" title={money(total)}>{money(total)}</p>
                  <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] font-semibold leading-4">
                    <span className="truncate text-blue-700" title={`${t('adminDashboard.web', 'Web')} ${money(item.web)}`}>{money(item.web)}</span>
                    <span className="truncate text-slate-600" title={`${t('adminDashboard.pos', 'POS')} ${money(item.pos)}`}>{money(item.pos)}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
                    {orderTotal} {t('adminDashboard.ordersShort', 'orders')}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function OwnerFocusPanel({
  activeKitchen,
  readyPickup,
  paymentPending,
  lowStockCount,
  catalogGapCount,
  payrollHours,
  payrollCost,
  pendingShiftCount,
  upcomingShiftDays,
  loyaltyCustomers,
  onNavigate,
}: {
  activeKitchen: number
  readyPickup: number
  paymentPending: number
  lowStockCount: number
  catalogGapCount: number
  payrollHours: number
  payrollCost: number
  pendingShiftCount: number
  upcomingShiftDays: number
  loyaltyCustomers: number
  onNavigate: (path: string) => void
}) {
  const { t } = useTranslation()
  const issues = lowStockCount + catalogGapCount + paymentPending + pendingShiftCount

  return (
    <section className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.75fr)]">
      <div className="admin-dashboard-card border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              {t('adminDashboard.ownerFocus.label', 'Manager overview')}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              {t('adminDashboard.ownerFocus.title', 'What needs attention before service')}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {t('adminDashboard.ownerFocus.subtitle', 'Fast checks for orders, payroll, inventory, catalog, and loyalty.')}
            </p>
          </div>
          <div className={`inline-flex w-fit items-center gap-2 border px-3 py-2 text-sm font-semibold ${issues ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            <CheckCircle2 className="h-4 w-4" />
            {issues ? t('adminDashboard.ownerFocus.openItems', '{{count}} items to review', { count: issues }) : t('adminDashboard.ownerFocus.allClear', 'No urgent blockers')}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <FocusTile
            icon={ShoppingBag}
            label={t('adminDashboard.ownerFocus.service', 'Service')}
            value={`${activeKitchen}`}
            detail={t('adminDashboard.ownerFocus.serviceDetail', '{{ready}} ready · {{pending}} payment pending', { ready: readyPickup, pending: paymentPending })}
            action={t('adminDashboard.ownerFocus.reviewFlow', 'Review flow')}
            onClick={() => onNavigate('/admin/sales-tracking')}
          />
          <FocusTile
            icon={AlertTriangle}
            label={t('adminDashboard.ownerFocus.stock', 'Stock')}
            value={`${lowStockCount}`}
            detail={t('adminDashboard.ownerFocus.stockDetail', 'Ingredients below minimum')}
            action={t('adminDashboard.ownerFocus.openStock', 'Review stock')}
            onClick={() => onNavigate('/admin/stock')}
            warning={lowStockCount > 0}
          />
          <FocusTile
            icon={WalletCards}
            label={t('adminDashboard.ownerFocus.payroll', 'Payroll')}
            value={money(payrollCost)}
            detail={t('adminDashboard.ownerFocus.payrollDetail', '{{hours}} h scheduled/worked · {{pending}} pending approvals', { hours: payrollHours.toFixed(1), pending: pendingShiftCount })}
            action={t('adminDashboard.ownerFocus.openPayroll', 'Review payroll')}
            onClick={() => onNavigate('/admin/payroll')}
            warning={pendingShiftCount > 0}
          />
          <FocusTile
            icon={Package}
            label={t('adminDashboard.ownerFocus.catalog', 'Catalog')}
            value={`${catalogGapCount}`}
            detail={t('adminDashboard.ownerFocus.catalogDetail', 'Products missing image or price')}
            action={t('adminDashboard.ownerFocus.openProducts', 'Fix products')}
            onClick={() => onNavigate('/admin/products')}
            warning={catalogGapCount > 0}
          />
          <FocusTile
            icon={Trophy}
            label={t('adminDashboard.ownerFocus.loyalty', 'Loyalty')}
            value={`${loyaltyCustomers}`}
            detail={t('adminDashboard.ownerFocus.loyaltyDetail', 'Customer accounts to bring back')}
            action={t('adminDashboard.ownerFocus.openClients', 'View clients')}
            onClick={() => onNavigate('/admin/clients')}
          />
        </div>
      </div>

      <div className="admin-dashboard-card border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {t('adminDashboard.ownerFocus.riskLabel', 'Coming days')}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">
          {t('adminDashboard.ownerFocus.riskTitle', 'Prevent small issues early')}
        </h2>
        <div className="mt-5 grid gap-3">
          {[
            {
              label: t('adminDashboard.ownerFocus.shiftCoverage', 'Shift coverage'),
              value: t('adminDashboard.ownerFocus.shiftCoverageValue', '{{days}} upcoming days', { days: upcomingShiftDays }),
              tone: upcomingShiftDays < 3 ? 'amber' : 'green',
            },
            {
              label: t('adminDashboard.ownerFocus.stockRisk', 'Low stock'),
              value: t('adminDashboard.ownerFocus.stockRiskValue', '{{count}} items', { count: lowStockCount }),
              tone: lowStockCount > 0 ? 'amber' : 'green',
            },
            {
              label: t('adminDashboard.ownerFocus.paymentRisk', 'Payment follow-up'),
              value: t('adminDashboard.ownerFocus.paymentRiskValue', '{{count}} pending', { count: paymentPending }),
              tone: paymentPending > 0 ? 'amber' : 'green',
            },
            {
              label: t('adminDashboard.ownerFocus.catalogRisk', 'Online catalog'),
              value: t('adminDashboard.ownerFocus.catalogRiskValue', '{{count}} gaps', { count: catalogGapCount }),
              tone: catalogGapCount > 0 ? 'amber' : 'green',
            },
          ].map((item, index) => (
            <div key={item.label} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border border-slate-200 bg-slate-50 px-3 py-3">
              <span className={`flex h-7 w-7 items-center justify-center text-xs font-semibold ${item.tone === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>{index + 1}</span>
              <span className="text-sm font-medium text-slate-700">{item.label}</span>
              <span className="text-sm font-semibold text-slate-950">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FocusTile({
  icon: Icon,
  label,
  value,
  detail,
  action,
  onClick,
  warning = false,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  detail: string
  action: string
  onClick: () => void
  warning?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative min-w-0 overflow-hidden border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-600 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 active:translate-y-0"
    >
      <span className="absolute inset-x-0 top-0 h-1 bg-transparent transition group-hover:bg-blue-600" />
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center ${warning ? 'bg-amber-100 text-amber-700' : 'bg-white text-blue-700'} border border-slate-200`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-2xl font-semibold text-slate-950">{value}</span>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 min-h-[40px] text-sm leading-5 text-slate-600">{detail}</p>
      <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 transition group-hover:text-blue-800">
        {action}
        <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </p>
    </button>
  )
}

function MixChart({
  pickup,
  delivery,
}: {
  pickup: number
  delivery: number
}) {
  const total = Math.max(pickup + delivery, 1)
  const pickupPct = Math.round((pickup / total) * 100)
  const deliveryPct = 100 - pickupPct

  return (
    <div className="admin-dashboard-card min-w-0 border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Fulfillment mix</p>
      <h2 className="mt-1 text-xl font-semibold text-gray-950">Pickup vs delivery</h2>
      <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div
          className="grid h-36 w-36 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(#f26350 0 ${pickupPct}%, #111827 ${pickupPct}% 100%)`,
          }}
        >
          <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center">
            <div>
              <p className="text-3xl font-semibold text-gray-950">{pickupPct}%</p>
              <p className="text-xs font-medium text-gray-400">pickup</p>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <MixLegend color="bg-[#f26350]" label="Pickup" value={`${pickup} orders`} percent={pickupPct} />
          <MixLegend color="bg-gray-950" label="Delivery" value={`${delivery} orders`} percent={deliveryPct} />
        </div>
      </div>
    </div>
  )
}

function UberSalesSourcePanel({
  orders,
  events,
  revenue,
}: {
  orders: number
  events: number
  revenue: number
}) {
  const hasWebhookTraffic = events > 0 || orders > 0

  return (
    <div className="admin-dashboard-card min-w-0 border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sales source</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Uber Eats integration</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Uber Eats is planned for revenue accuracy, but it is not included in dashboard totals yet. Once credentials are available, sales from Uber should be imported beside Web and Clover/POS so total restaurant sales, product demand, and analytics are complete.
          </p>
        </div>
        <div className="grid w-full gap-2 text-sm sm:grid-cols-3 lg:max-w-[520px]">
          <div className="border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Status</p>
            <p className={`mt-1 font-semibold ${hasWebhookTraffic ? 'text-emerald-700' : 'text-amber-700'}`}>
              {hasWebhookTraffic ? 'Webhook receiving' : 'Waiting for webhook'}
            </p>
          </div>
          <div className="border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Events</p>
            <p className="mt-1 font-semibold text-slate-950">{events} received · {orders} orders</p>
          </div>
          <div className="border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Revenue</p>
            <p className="mt-1 font-semibold text-slate-950">{money(revenue)} · excluded</p>
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-sm text-slate-600 lg:grid-cols-3">
        <div className="border border-dashed border-slate-200 bg-slate-50/70 p-3">
          <p className="font-semibold text-slate-900">1. Order import</p>
          <p className="mt-1 leading-5">Pull accepted/completed Uber orders with totals, fees, taxes, tips, and item lines.</p>
        </div>
        <div className="border border-dashed border-slate-200 bg-slate-50/70 p-3">
          <p className="font-semibold text-slate-900">2. Product mapping</p>
          <p className="mt-1 leading-5">Match Uber item names to MaiSushi products so demand and food-cost analytics stay useful.</p>
        </div>
        <div className="border border-dashed border-slate-200 bg-slate-50/70 p-3">
          <p className="font-semibold text-slate-900">3. Reconciliation</p>
          <p className="mt-1 leading-5">Keep Uber separate from POS/web while still rolling it into total restaurant revenue.</p>
        </div>
      </div>
    </div>
  )
}

function EventsOpsPanel({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="admin-dashboard-card min-w-0 border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Event channel</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Sushi Island, 15th birthdays, office trays</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Event requests have their own internal lane while public promotion is paused. Staff can refine Sushi Island, 15-year-old birthday parties, office/team trays, private sushi nights, and karaoke packages before publishing the customer view.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-10 items-center justify-center gap-2 border border-slate-900 bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <PartyPopper className="h-4 w-4" />
          Open events
        </button>
      </div>
      <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
        <div className="border border-slate-200 bg-slate-50 p-3">
          <CalendarDays className="mb-2 h-4 w-4 text-[#f26350]" />
          <p className="font-semibold text-slate-900">Requests</p>
          <p className="mt-1 leading-5">Collected through contact until the event-request table is finalized.</p>
        </div>
        <div className="border border-slate-200 bg-slate-50 p-3">
          <Users className="mb-2 h-4 w-4 text-[#f26350]" />
          <p className="font-semibold text-slate-900">Good leads</p>
          <p className="mt-1 leading-5">Teen birthdays, office trays, team meals, and private nights can become repeatable packages.</p>
        </div>
        <div className="border border-slate-200 bg-slate-50 p-3">
          <ClipboardListIcon />
          <p className="font-semibold text-slate-900">Next</p>
          <p className="mt-1 leading-5">Add persistent lead tracking, package pricing, deposits, and reminders.</p>
        </div>
      </div>
    </div>
  )
}

function ClipboardListIcon() {
  return (
    <div className="mb-2 flex h-4 w-4 items-center justify-center text-[#f26350]">
      <span className="h-3.5 w-3 rounded-sm border border-current" />
    </div>
  )
}

function MixLegend({
  color,
  label,
  value,
  percent,
}: {
  color: string
  label: string
  value: string
  percent: number
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 font-semibold text-gray-800">
          <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
          {label}
        </div>
        <span className="text-gray-500">{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={`${color} h-full rounded-full`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function HorizontalBars({
  title,
  label,
  icon: Icon,
  items,
  emptyTitle,
  headerAction,
  onItemClick,
}: {
  title: string
  label: string
  icon: ComponentType<{ className?: string }>
  items: Array<{ name: string; value: number; detail: string }>
  emptyTitle: string
  headerAction?: ReactNode
  onItemClick?: (name: string) => void
}) {
  const max = Math.max(...items.map((item) => item.value), 1)

  return (
    <div className="admin-dashboard-card max-h-[520px] overflow-hidden border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {headerAction}
          <Icon className="h-5 w-5 text-blue-700" />
        </div>
      </div>

      <div className="mt-5 max-h-[395px] space-y-3 overflow-y-auto pr-1">
        {items.length ? items.map((item, index) => (
          <button
            key={item.name}
            type="button"
            onClick={() => onItemClick?.(item.name)}
            className="block w-full border border-transparent p-2 text-left transition hover:border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-950/15"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">{index + 1}. {item.name}</p>
                <p className="text-xs text-slate-500">{item.detail}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-950">
                {quantityLabel(item.value)}
                <ExternalLink className="h-3.5 w-3.5 text-slate-300" />
              </div>
            </div>
            <div className="h-2 overflow-hidden bg-slate-100">
              <div
                className="h-full bg-blue-600"
                style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }}
              />
            </div>
          </button>
        )) : (
          <EmptyState icon={ShoppingBag} title={emptyTitle} description="Data will appear as Clover/web orders are processed." />
        )}
      </div>
    </div>
  )
}

function CloverCashEventsPanel({
  events,
  orders,
  payments,
  loading,
  error,
  connected,
  onSelectOrder,
}: {
  events: CloverCashEvent[]
  orders: CloverRecentOrder[]
  payments: CloverRecentOrder[]
  loading: boolean
  error: string | null
  connected: boolean
  onSelectOrder: (order: CloverRecentOrder) => void
}) {
  const mergedOrders = useMemo(() => mergeCloverRecentOrders(orders, payments), [orders, payments])

  const todayEvents = events.filter((event) => isSameDay(event.createdAt))
  const todayCash = todayEvents.reduce((sum, event) => sum + event.amount, 0)
  const todayOrders = mergedOrders.filter((order) => isSameDay(order.createdAt))
  const todayOrderRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0)

  return (
    <div className="admin-dashboard-card max-h-[520px] overflow-hidden border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Clover API</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Recent orders</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Live Clover order feed with date, customer details, totals, and items sold.
          </p>
        </div>
        <span className={`inline-flex w-fit items-center gap-2 border px-3 py-1.5 text-xs font-semibold ${connected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
          {connected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {connected ? 'Connected' : 'Proxy needed'}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MiniMetric label="Today orders" value={`${todayOrders.length}`} />
        <MiniMetric label="Today POS sales" value={money(todayOrderRevenue || todayCash)} />
        <MiniMetric label="Orders with items" value={`${mergedOrders.filter((order) => order.lineItems.length > 0).length}`} />
      </div>

      {!connected && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Add a backend endpoint in `VITE_CLOVER_CASH_EVENTS_PROXY_URL` that calls
          `GET /v3/merchants/Q6HHXE6KXRQB1/cash_events` with the Clover token on the server.
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 max-h-[300px] space-y-3 overflow-y-auto pr-1">
        {loading ? (
          <SkeletonRows />
        ) : mergedOrders.length ? mergedOrders.slice(0, 8).map((order) => (
          <button
            key={order.id}
            type="button"
            onClick={() => onSelectOrder(order)}
            className="block w-full border border-slate-100 bg-slate-50 px-4 py-3 text-left transition hover:border-slate-300 hover:bg-white hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-950/15"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-950">
                  {order.customerName}
                </p>
                <p className="text-xs text-gray-500">
                  {order.createdAt.toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {' '}· {order.source === 'web' ? 'web' : 'POS'} · {order.paymentState}
                  {order.employeeName !== 'Unknown' ? ` · ${order.employeeName}` : ''}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-gray-950">{money(order.total)}</p>
            </div>

            {(order.customerPhone || order.customerEmail) && (
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <DetailPill label="Phone" value={order.customerPhone || 'No phone'} />
                <DetailPill label="Email" value={order.customerEmail || 'No email'} />
              </div>
            )}

            {order.lineItems.length > 0 ? (
              <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-gray-100">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Items</p>
                  <p className="text-[11px] font-semibold text-gray-500">
                    {quantityLabel(order.lineItems.reduce((sum, item) => sum + item.quantity, 0))} sold
                  </p>
                </div>
                <div className="space-y-2">
                  {order.lineItems.slice(0, 3).map((item) => (
                    <div key={`${order.id}-${item.id}`} className="flex items-center justify-between gap-3 text-xs">
                      <p className="min-w-0 truncate font-semibold text-gray-800">
                        {quantityLabel(item.quantity)}x {item.name}
                      </p>
                      <p className="shrink-0 font-semibold text-gray-950">{money(item.total || item.price * item.quantity)}</p>
                    </div>
                  ))}
                  {order.lineItems.length > 3 && (
                    <p className="text-xs font-medium text-gray-400">+{order.lineItems.length - 3} more items</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs leading-5 text-gray-400 ring-1 ring-gray-100">
                No line items returned for this Clover order yet.
              </p>
            )}
          </button>
        )) : events.length ? events.slice(0, 5).map((event) => (
          <div key={event.id} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-950">{event.eventType}</p>
                <p className="text-xs text-gray-500">
                  {event.employeeName} · {event.createdAt.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <p className={`shrink-0 text-sm font-semibold ${event.amount < 0 ? 'text-red-600' : 'text-gray-950'}`}>
                {money(event.amount)}
              </p>
            </div>

            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <DetailPill label="Order" value={event.orderId || 'No order id'} />
              <DetailPill label="Payment" value={event.paymentId || 'No payment id'} />
              <DetailPill label="Employee" value={event.employeeId || event.employeeName} />
              <DetailPill label="Device" value={event.deviceId || 'No device id'} />
            </div>

            {event.note && (
              <p className="mt-3 whitespace-pre-line rounded-xl bg-white px-3 py-2 text-xs leading-5 text-gray-500">
                {event.note}
              </p>
            )}

            {event.lineItems.length > 0 ? (
              <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-gray-100">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Products sold</p>
                  <p className="text-[11px] font-semibold text-gray-500">
                    {event.lineItems.reduce((sum, item) => sum + item.quantity, 0)} items
                  </p>
                </div>
                <div className="space-y-2">
                  {event.lineItems.slice(0, 4).map((item) => (
                    <div key={`${event.id}-${item.id}`} className="flex items-center justify-between gap-3 text-xs">
                      <p className="min-w-0 truncate font-semibold text-gray-800">
                        {item.quantity}x {item.name}
                      </p>
                      <p className="shrink-0 font-semibold text-gray-950">{money(item.total || item.price * item.quantity)}</p>
                    </div>
                  ))}
                  {event.lineItems.length > 4 && (
                    <p className="text-xs font-medium text-gray-400">+{event.lineItems.length - 4} more products</p>
                  )}
                </div>
              </div>
            ) : event.orderId ? (
              <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs leading-5 text-gray-400 ring-1 ring-gray-100">
                Product details are not included yet. Enrich this event with Clover order line items for order {event.orderId}.
              </p>
            ) : null}
          </div>
        )) : (
          <EmptyState icon={DatabaseZap} title="No Clover orders loaded" description="Recent Clover orders will appear here once the proxy returns order data." />
        )}
      </div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-gray-950">{value}</p>
    </div>
  )
}

function OrderDetailsPanel({
  order,
  onClose,
}: {
  order: CloverRecentOrder | null
  onClose: () => void
}) {
  if (!order) return null

  const totalItems = order.lineItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="fixed inset-0 z-[80] bg-gray-950/35 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true">
      <div className="ml-auto flex h-full w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                {order.source === 'web' ? 'Website order' : 'POS order'}
              </p>
              <h2 className="mt-1 truncate text-2xl font-semibold tracking-tight text-gray-950">
                {order.customerName}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {order.createdAt.toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {' '}· {order.paymentState} · {order.employeeName}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-950"
              aria-label="Close order details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniMetric label="Total" value={money(order.total)} />
            <MiniMetric label="Items" value={quantityLabel(totalItems)} />
            <MiniMetric label="Source" value={order.source === 'web' ? 'Web' : 'POS'} />
          </div>

          {(order.customerPhone || order.customerEmail) && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <DetailPill label="Phone" value={order.customerPhone || 'No phone'} />
              <DetailPill label="Email" value={order.customerEmail || 'No email'} />
            </div>
          )}

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Items</p>
            <div className="mt-3 divide-y divide-gray-100 rounded-2xl border border-gray-100">
              {order.lineItems.length ? order.lineItems.map((item) => (
                <div key={`${order.id}-detail-${item.id}`} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-950">{item.name}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {quantityLabel(item.quantity)} x {money(item.price)}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-gray-950">
                    {money(item.total || item.price * item.quantity)}
                  </p>
                </div>
              )) : (
                <p className="px-4 py-5 text-sm text-gray-500">No item details were returned for this order.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-white px-3 py-2 ring-1 ring-gray-100">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">{label}</p>
      <p className="mt-1 truncate font-mono text-[11px] font-semibold text-gray-700" title={value}>
        {value}
      </p>
    </div>
  )
}

function InsightCard({
  icon: Icon,
  label,
  title,
  details,
  loading = false,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  title: string
  details: string[]
  loading?: boolean
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-950 text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{label}</p>
          <h3 className="mt-2 text-lg font-semibold text-gray-950">{loading ? 'Loading...' : title}</h3>
          <div className="mt-3 space-y-1">
            {details.map((detail) => (
              <p key={detail} className="text-sm text-gray-500">{detail}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center">
      <Icon className="mx-auto h-6 w-6 text-gray-300" />
      <p className="mt-3 text-sm font-semibold text-gray-700">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-16 animate-pulse rounded-2xl bg-gray-100" />
      ))}
    </div>
  )
}

export default function SalesTrackingPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [checkoutSessions, setCheckoutSessions] = useState<CheckoutSession[]>([])
  const [webOrderSessions, setWebOrderSessions] = useState<CheckoutSession[]>([])
  const [uberEatsOrders, setUberEatsOrders] = useState<UberEatsOrder[]>([])
  const [uberEatsEventCount, setUberEatsEventCount] = useState(0)
  const [tableOrders, setTableOrders] = useState<TableOrder[]>([])
  const [employeeShifts, setEmployeeShifts] = useState<DashboardEmployeeShift[]>([])
  const [loyalty, setLoyalty] = useState<LoyaltyStats>({ customers: 0, pointsIssued: 0 })
  const [cashEvents, setCashEvents] = useState<CloverCashEvent[]>([])
  const [recentCloverOrders, setRecentCloverOrders] = useState<CloverRecentOrder[]>([])
  const [recentCloverPayments, setRecentCloverPayments] = useState<CloverRecentOrder[]>([])
  const [selectedOrder, setSelectedOrder] = useState<CloverRecentOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [cashEventsLoading, setCashEventsLoading] = useState(false)
  const [cashEventsError, setCashEventsError] = useState<string | null>(null)
  const [dataError, setDataError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [demandDays, setDemandDays] = useState<7 | 14 | 30>(14)
  const [datePreset, setDatePreset] = useState<DashboardDatePreset>('today')
  const [customStart, setCustomStart] = useState(() => dateInputValue(new Date()))
  const [customEnd, setCustomEnd] = useState(() => dateInputValue(new Date()))

  const { products, loading: productsLoading } = useProducts()
  const { ingredients, loading: ingredientsLoading } = useIngredients()
  const { purchases } = usePurchases()
  const { sales } = useSales()
  const dateRangeLabels = useMemo(() => ({
    today: t('adminDashboard.filters.today', 'Today'),
    yesterday: t('adminDashboard.filters.yesterday', 'Yesterday'),
    last7: t('adminDashboard.filters.last7', 'Last 7 days'),
    last30: t('adminDashboard.filters.last30', 'Last 30 days'),
  }), [t])
  const todayLabel = useMemo(() => fullDateLabel(new Date(), i18n.language || 'en-CA'), [i18n.language])
  const selectedRange = useMemo(
    () => dashboardDateRange(datePreset, customStart, customEnd, dateRangeLabels, i18n.language || 'en-CA'),
    [datePreset, customStart, customEnd, dateRangeLabels, i18n.language]
  )

  useEffect(() => {
    setLoading(true)
    setDataError(null)

    const unsubscribers: Unsubscribe[] = []

    const checkoutQuery = query(
      collection(db, 'cloverCheckoutSessions'),
      orderBy('createdAt', 'desc'),
      limit(1000)
    )

    const webOrdersQuery = query(
      collection(db, 'webOrders'),
      orderBy('createdAt', 'desc'),
      limit(1000)
    )

    const tableOrderQuery = query(
      collection(db, 'tableOrders'),
      orderBy('createdAt', 'desc'),
      limit(400)
    )

    const employeeShiftQuery = query(
      collection(db, 'employeeShifts'),
      orderBy('date', 'desc'),
      limit(500)
    )

    const uberEatsOrderQuery = query(
      collection(db, 'uberEatsOrders'),
      limit(180)
    )

    const uberEatsEventQuery = query(
      collection(db, 'uberEatsWebhookEvents'),
      limit(240)
    )

    unsubscribers.push(onSnapshot(
      checkoutQuery,
      (snapshot) => {
        setCheckoutSessions(snapshot.docs.map((docSnap) => normalizeCheckoutSession(docSnap.id, docSnap.data())))
        setLoading(false)
      },
      (error) => {
        console.error('Failed to load checkout sessions', error)
        setDataError('Checkout session metrics are unavailable.')
        setLoading(false)
      }
    ))

    unsubscribers.push(onSnapshot(
      webOrdersQuery,
      (snapshot) => {
        setWebOrderSessions(snapshot.docs.map((docSnap) => normalizeCheckoutSession(docSnap.id, docSnap.data())))
        setLoading(false)
      },
      (error) => {
        console.error('Failed to load web orders', error)
        setDataError('Website order metrics are unavailable.')
        setLoading(false)
      }
    ))

    unsubscribers.push(onSnapshot(
      tableOrderQuery,
      (snapshot) => {
        setTableOrders(snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<TableOrder, 'id'>),
        })))
      },
      (error) => {
        console.error('Failed to load table orders', error)
      }
    ))

    unsubscribers.push(onSnapshot(
      employeeShiftQuery,
      (snapshot) => {
        setEmployeeShifts(snapshot.docs.map((docSnap) => normalizeDashboardShift(docSnap.id, docSnap.data())))
      },
      (error) => {
        console.error('Failed to load payroll shifts', error)
      }
    ))

    unsubscribers.push(onSnapshot(
      uberEatsOrderQuery,
      (snapshot) => {
        setUberEatsOrders(snapshot.docs.map((docSnap) => normalizeUberEatsOrder(docSnap.id, docSnap.data())))
      },
      (error) => {
        console.error('Failed to load Uber Eats orders', error)
      }
    ))

    unsubscribers.push(onSnapshot(
      uberEatsEventQuery,
      (snapshot) => {
        setUberEatsEventCount(snapshot.size)
      },
      (error) => {
        console.error('Failed to load Uber Eats webhook events', error)
      }
    ))

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [refreshKey])

  const onlineSessions = useMemo(() => {
    const byId = new Map<string, CheckoutSession>()

    checkoutSessions.forEach((session) => byId.set(session.id, session))
    webOrderSessions.forEach((session) => byId.set(session.id, session))

    return Array.from(byId.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }, [checkoutSessions, webOrderSessions])

  const filteredOnlineSessions = useMemo(
    () => onlineSessions.filter((session) => isInRange(session.createdAt, selectedRange.start, selectedRange.end)),
    [onlineSessions, selectedRange]
  )

  const cloverOrders = useMemo(
    () => mergeCloverRecentOrders(recentCloverOrders, recentCloverPayments),
    [recentCloverOrders, recentCloverPayments]
  )

  const filteredCloverOrders = useMemo(
    () => cloverOrders.filter((order) => isInRange(order.createdAt, selectedRange.start, selectedRange.end)),
    [cloverOrders, selectedRange]
  )

  const filteredUberEatsOrders = useMemo(
    () => uberEatsOrders.filter((order) => isInRange(order.receivedAt, selectedRange.start, selectedRange.end)),
    [uberEatsOrders, selectedRange]
  )

  const uberEatsIncludedRevenue = useMemo(
    () => filteredUberEatsOrders
      .filter((order) => order.revenueIncluded)
      .reduce((sum, order) => sum + order.total, 0),
    [filteredUberEatsOrders]
  )

  useEffect(() => {
    let cancelled = false

    async function loadLoyalty() {
      const [profilesResult, pointsResult] = await Promise.all([
        supabase.from('client_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_points').select('points'),
      ])

      if (cancelled) return

      const pointsIssued = Array.isArray(pointsResult.data)
        ? pointsResult.data.reduce((sum, row: any) => sum + Number(row.points || 0), 0)
        : 0

      setLoyalty({
        customers: profilesResult.count || 0,
        pointsIssued,
      })
    }

    loadLoyalty().catch((error) => {
      console.warn('Failed to load loyalty stats', error)
    })

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  useEffect(() => {
    let cancelled = false

    async function loadCashEvents() {
      if (!CLOVER_CASH_EVENTS_PROXY_URL) {
        setCashEvents([])
        setCashEventsError(null)
        return
      }

      setCashEventsLoading(true)
      setCashEventsError(null)

      try {
        const url = new URL(CLOVER_CASH_EVENTS_PROXY_URL)
        url.searchParams.set('limit', '250')
        url.searchParams.set('detailLimit', '60')
        url.searchParams.set('orderLimit', '500')
        url.searchParams.set('start', selectedRange.start.toISOString())
        url.searchParams.set('end', selectedRange.end.toISOString())

        const response = await fetch(url.toString(), {
          headers: { accept: 'application/json' },
        })

        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(payload?.error || `Clover proxy returned ${response.status}`)
        }

        const rawEvents = payload.elements || payload.data || payload.cash_events || payload.events || []
        const rawOrders = payload.recentOrders || payload.orders || []
        const rawPayments = payload.recentPayments || payload.payments || []

        if (!cancelled) {
          setCashEvents(
            rawEvents
              .map((event: any, index: number) => normalizeCashEvent(event, index))
              .sort((a: CloverCashEvent, b: CloverCashEvent) => b.createdAt.getTime() - a.createdAt.getTime())
          )
          setRecentCloverOrders(
            rawOrders
              .map((order: any, index: number) => normalizeRecentOrder(order, index))
              .sort((a: CloverRecentOrder, b: CloverRecentOrder) => b.createdAt.getTime() - a.createdAt.getTime())
          )
          setRecentCloverPayments(
            rawPayments
              .map((payment: any, index: number) => normalizePaymentAsOrder(payment, index))
              .sort((a: CloverRecentOrder, b: CloverRecentOrder) => b.createdAt.getTime() - a.createdAt.getTime())
          )
        }
      } catch (error: any) {
        console.error('Failed to load Clover cash events', error)
        if (!cancelled) {
          setCashEventsError(error?.message || 'Unable to load Clover cash events.')
          setRecentCloverOrders([])
          setRecentCloverPayments([])
        }
      } finally {
        if (!cancelled) {
          setCashEventsLoading(false)
        }
      }
    }

    loadCashEvents()

    return () => {
      cancelled = true
    }
  }, [refreshKey, selectedRange.start, selectedRange.end])

  const metrics = useMemo(() => {
    const todaySessions = filteredOnlineSessions
    const weekSessions = onlineSessions.filter((session) => isWithinDays(session.createdAt, 7))
    const todayRevenue = todaySessions.reduce((sum, session) => sum + session.total, 0)
    const weekRevenue = weekSessions.reduce((sum, session) => sum + session.total, 0)
    const todayAverage = todaySessions.length ? todayRevenue / todaySessions.length : 0
    const activeKitchen = tableOrders.filter((order) =>
      ['sent_to_kitchen', 'preparing', 'ready_for_pickup'].includes(order.status)
    )
    const readyPickup = tableOrders.filter((order) => order.status === 'ready_for_pickup')
    const paymentPending = tableOrders.filter((order) => order.status === 'delivered' && order.paymentStatus === 'pending')
    const paidTableOrdersToday = tableOrders.filter(
      (order) => order.paymentStatus === 'paid' && isSameDay(new Date(toTimestampMs(order.paidAt || order.updatedAt || order.createdAt)))
    )
    const pickup = filteredOnlineSessions.filter((session) => session.deliveryMethod !== 'delivery').length
    const delivery = filteredOnlineSessions.filter((session) => session.deliveryMethod === 'delivery').length
    const selectedPosRevenue = filteredCloverOrders.reduce((sum, order) => sum + order.total, 0)
    const selectedPosAverage = filteredCloverOrders.length ? selectedPosRevenue / filteredCloverOrders.length : 0

    return {
      todaySessions,
      weekSessions,
      todayRevenue,
      weekRevenue,
      todayAverage,
      selectedPosRevenue,
      selectedPosAverage,
      activeKitchen,
      readyPickup,
      paymentPending,
      paidTableOrdersToday,
      pickup,
      delivery,
    }
  }, [onlineSessions, filteredOnlineSessions, filteredCloverOrders, tableOrders])

  const payrollOverview = useMemo(() => {
    const periodShifts = employeeShifts.filter((shift) => {
      const shiftDate = new Date(`${shift.date}T12:00:00`)
      return isInRange(shiftDate, selectedRange.start, selectedRange.end)
    })
    const today = new Date()
    const nextSeven = new Date(today)
    nextSeven.setDate(today.getDate() + 7)
    const upcomingShifts = employeeShifts.filter((shift) => {
      const shiftDate = new Date(`${shift.date}T12:00:00`)
      return shiftDate >= new Date(`${dateInputValue(today)}T00:00:00`) && shiftDate <= nextSeven
    })
    const upcomingDays = new Set(upcomingShifts.map((shift) => shift.date)).size
    const hours = periodShifts.reduce((sum, shift) => sum + calculateShiftHours(shift), 0)
    const wages = periodShifts.reduce((sum, shift) => sum + (calculateShiftHours(shift) * Number(shift.hourlyRate || 0)), 0)
    const pending = periodShifts.filter((shift) => shift.approved !== true).length

    return {
      hours,
      wages,
      pending,
      upcomingDays,
      shiftCount: periodShifts.length,
    }
  }, [employeeShifts, selectedRange])

  const selectedRevenue = useMemo(() => {
    const days = Math.max(1, Math.ceil((selectedRange.end.getTime() - selectedRange.start.getTime()) / 86400000))
    return Array.from({ length: Math.min(days, 31) }, (_, index) => {
      const date = new Date(selectedRange.start)
      date.setDate(date.getDate() + index)
      const key = startOfDayKey(date)
      const sessions = filteredOnlineSessions.filter((session) => startOfDayKey(session.createdAt) === key)
      const posOrders = filteredCloverOrders.filter((order) => startOfDayKey(order.createdAt) === key)

      return {
        label: dayLabel(date),
        web: sessions.reduce((sum, session) => sum + session.total, 0),
        pos: posOrders.reduce((sum, order) => sum + order.total, 0),
        webOrders: sessions.length,
        posOrders: posOrders.length,
      }
    })
  }, [filteredOnlineSessions, filteredCloverOrders, selectedRange])

  const topProducts = useMemo(() => {
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>()
    const combinedOrders = [
      ...recentCloverOrders,
      ...recentCloverPayments,
      ...onlineSessions.map(normalizeWebSessionAsOrder),
    ]
    const recentOrderIds = new Set(combinedOrders.map((order) => order.id))

    combinedOrders
      .filter((order) => isWithinDays(order.createdAt, demandDays))
      .forEach((order) => {
        order.lineItems.forEach((item) => {
          if (!isOperationalProductName(item.name)) return

          const current = productMap.get(item.name) || { name: item.name, quantity: 0, revenue: 0 }
          current.quantity += item.quantity
          current.revenue += item.total || item.price * item.quantity
          productMap.set(item.name, current)
        })
      })

    cashEvents
      .filter((event) => isWithinDays(event.createdAt, demandDays))
      .forEach((event) => {
        if (event.orderId && recentOrderIds.has(event.orderId)) return

        event.lineItems.forEach((item) => {
          if (!isOperationalProductName(item.name)) return

          const current = productMap.get(item.name) || { name: item.name, quantity: 0, revenue: 0 }
          current.quantity += item.quantity
          current.revenue += item.total || item.price * item.quantity
          productMap.set(item.name, current)
        })
      })

    return Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8)
  }, [onlineSessions, cashEvents, recentCloverOrders, recentCloverPayments, demandDays])

  const lowStock = useMemo(() => {
    return ingredients
      .filter((ingredient) => {
        const current = Number(ingredient.currentStock || ingredient.stockGrams || 0)
        const minimum = Number(ingredient.minimumStock || 0)
        return minimum > 0 && current <= minimum
      })
      .sort((a, b) => Number(a.currentStock || a.stockGrams || 0) - Number(b.currentStock || b.stockGrams || 0))
      .slice(0, 7)
  }, [ingredients])

  const catalogHealth = useMemo(() => {
    const active = products.filter((product) => product.isActive !== false)
    const hidden = products.length - active.length
    const noImage = products.filter((product) => !product.imageUrls?.length)
    const noPrice = products.filter((product) => !Number(product.sellingPrice || 0))

    return {
      active: active.length,
      hidden,
      noImage: noImage.length,
      noPrice: noPrice.length,
      featured: products.filter((product) => product.featured).length,
    }
  }, [products])

  const recentActivity = onlineSessions.slice(0, 8)
  const lastPurchase = purchases[0]
  const manualSalesThisMonth = sales.filter((sale) => {
    const date = new Date(sale.saleDate)
    const now = new Date()
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  })
  const dashboardLoading = loading || cashEventsLoading || productsLoading || ingredientsLoading || refreshing
  const totalSelectedRevenue = metrics.todayRevenue + metrics.selectedPosRevenue
  const totalSelectedOrders = metrics.todaySessions.length + filteredCloverOrders.length
  const attentionCount = metrics.paymentPending.length + lowStock.length + catalogHealth.noImage + catalogHealth.noPrice + payrollOverview.pending

  const handleRefresh = () => {
    setRefreshing(true)
    setRefreshKey((current) => current + 1)
  }

  useEffect(() => {
    if (!refreshing) return
    const timeout = window.setTimeout(() => setRefreshing(false), 900)
    return () => window.clearTimeout(timeout)
  }, [refreshing, refreshKey])

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50">
      <div className="mx-auto w-full max-w-[1760px] space-y-4 px-2 pb-8 sm:px-4 lg:px-5 2xl:px-8">
        <section className="admin-dashboard-card border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(620px,auto)] 2xl:items-end">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {t('adminDashboard.todayIs', 'Today is {{date}}', { date: todayLabel })}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl lg:text-[2rem]">
                {t('adminDashboard.operationsTitle', 'Service snapshot')}
              </h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
                {t(
                  'adminDashboard.operationsSubtitle',
                  'Showing {{range}}. Web orders, POS activity, stock alerts, and pickup flow in one place.',
                  { range: selectedRange.label.toLowerCase() }
                )}
              </p>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(160px,220px)_repeat(2,minmax(140px,1fr))_auto]">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {t('adminDashboard.filters.period', 'Period')}
                <select
                  value={datePreset}
                  onChange={(event) => setDatePreset(event.target.value as DashboardDatePreset)}
                  className="mt-1 block w-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                >
                  <option value="today">{t('adminDashboard.filters.todayOnly', 'Today only')}</option>
                  <option value="yesterday">{t('adminDashboard.filters.yesterdayOnly', 'Yesterday only')}</option>
                  <option value="7">{dateRangeLabels.last7}</option>
                  <option value="30">{dateRangeLabels.last30}</option>
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

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex h-[40px] w-full items-center justify-center gap-2 self-end border border-slate-900 bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-80 sm:col-span-2 lg:col-span-1 lg:w-fit"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? t('adminDashboard.refreshing', 'Refreshing') : t('adminDashboard.refresh', 'Refresh')}
              </button>
            </div>
          </div>
        </section>

        {dataError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {dataError}
          </div>
        )}

        <OwnerCommandCenter
          loading={dashboardLoading}
          totalRevenue={totalSelectedRevenue}
          totalOrders={totalSelectedOrders}
          webRevenue={metrics.todayRevenue}
          posRevenue={metrics.selectedPosRevenue}
          attentionCount={attentionCount}
          payrollCost={payrollOverview.wages}
          lowStockCount={lowStock.length}
          pendingPayments={metrics.paymentPending.length}
          catalogGaps={catalogHealth.noImage + catalogHealth.noPrice}
          onNavigate={navigate}
        />

        <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4">
          <StatCard
            label={t('adminDashboard.webSalesForRange', '{{range}} web sales', { range: selectedRange.label })}
            value={money(metrics.todayRevenue)}
            detail={t('adminDashboard.webSalesDetail', '{{orders}} web orders · avg {{average}}', { orders: metrics.todaySessions.length, average: money(metrics.todayAverage) })}
            icon={BadgeDollarSign}
            tone="blue"
            loading={dashboardLoading}
          />
          <StatCard
            label={t('adminDashboard.posSalesForRange', '{{range}} POS sales', { range: selectedRange.label })}
            value={money(metrics.selectedPosRevenue)}
            detail={t('adminDashboard.posSalesDetail', '{{orders}} POS orders · avg {{average}}', { orders: filteredCloverOrders.length, average: money(metrics.selectedPosAverage) })}
            icon={CreditCard}
            tone="green"
            loading={cashEventsLoading}
          />
          <StatCard
            label={t('adminDashboard.payrollForRange', '{{range}} payroll', { range: selectedRange.label })}
            value={money(payrollOverview.wages)}
            detail={t('adminDashboard.payrollDetail', '{{hours}} h · {{shifts}} shifts · {{pending}} pending', {
              hours: payrollOverview.hours.toFixed(1),
              shifts: payrollOverview.shiftCount,
              pending: payrollOverview.pending,
            })}
            icon={WalletCards}
            tone="dark"
            loading={dashboardLoading}
          />
          <StatCard
            label="Action queue"
            value={`${attentionCount}`}
            detail={`${metrics.readyPickup.length} ready · ${lowStock.length} low stock · ${payrollOverview.pending} payroll`}
            icon={AlertTriangle}
            tone={attentionCount ? 'amber' : 'green'}
            loading={dashboardLoading}
          />
        </section>

        <OwnerFocusPanel
          activeKitchen={metrics.activeKitchen.length}
          readyPickup={metrics.readyPickup.length}
          paymentPending={metrics.paymentPending.length}
          lowStockCount={lowStock.length}
          catalogGapCount={catalogHealth.noImage + catalogHealth.noPrice}
          payrollHours={payrollOverview.hours}
          payrollCost={payrollOverview.wages}
          pendingShiftCount={payrollOverview.pending}
          upcomingShiftDays={payrollOverview.upcomingDays}
          loyaltyCustomers={loyalty.customers}
          onNavigate={navigate}
        />

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.9fr)]">
          <RevenueChart data={selectedRevenue} title={t('adminDashboard.webVsPosRevenue', 'Web vs POS revenue')} subtitle={selectedRange.label} />
          <MixChart pickup={metrics.pickup} delivery={metrics.delivery} />
        </section>

        <section className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
          <UberSalesSourcePanel
            orders={filteredUberEatsOrders.length}
            events={uberEatsEventCount}
            revenue={uberEatsIncludedRevenue}
          />

          <EventsOpsPanel onOpen={() => navigate('/admin/events')} />
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <HorizontalBars
            title="Top sellers"
            label="Demand"
            icon={Star}
            items={topProducts.map((product) => ({
              name: product.name,
              value: product.quantity,
              detail: `${money(product.revenue)} checkout/POS revenue in ${demandDays} days`,
            }))}
            emptyTitle="No checkout product data yet"
            onItemClick={() => navigate('/admin/products')}
            headerAction={
              <div className="bg-slate-100 p-1">
                {[7, 14, 30].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDemandDays(days as 7 | 14 | 30)}
                    className={`px-2.5 py-1 text-[11px] font-semibold transition ${
                      demandDays === days
                        ? 'bg-slate-950 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-950'
                    }`}
                  >
                    {days}d
                  </button>
                ))}
              </div>
            }
          />

          <CloverCashEventsPanel
            events={cashEvents}
            orders={[
              ...recentCloverOrders,
              ...onlineSessions
                .filter((session) => isWithinDays(session.createdAt, 7))
                .map(normalizeWebSessionAsOrder),
            ]}
            payments={recentCloverPayments}
            loading={cashEventsLoading}
            error={cashEventsError}
            connected={Boolean(CLOVER_CASH_EVENTS_PROXY_URL)}
            onSelectOrder={setSelectedOrder}
          />
        </section>

        <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-4">
          <InsightCard
            icon={Package}
            label="Catalog health"
            title={`${catalogHealth.active} active products`}
            details={[
              `${catalogHealth.featured} featured online`,
              `${catalogHealth.hidden} hidden`,
              `${catalogHealth.noImage} without image`,
              `${catalogHealth.noPrice} without price`,
            ]}
            loading={productsLoading}
          />
          <InsightCard
            icon={Boxes}
            label="Inventory risk"
            title={ingredientsLoading ? 'Loading...' : `${lowStock.length} low stock items`}
            details={
              lowStock.length
                ? lowStock.slice(0, 4).map((ingredient) => ingredient.name)
                : ['No ingredients below minimum', 'Set minimum stock to activate alerts']
            }
          />
          <InsightCard
            icon={WalletCards}
            label="Purchasing"
            title={lastPurchase ? `${money(Number(lastPurchase.totalCost || 0))} latest purchase` : 'No recent purchase'}
            details={[
              lastPurchase?.supplier ? `Supplier: ${lastPurchase.supplier}` : 'Supplier not available',
              lastPurchase?.ingredientName || lastPurchase?.supplyName || 'No item name',
              `${purchases.length} purchase records`,
            ]}
          />
          <InsightCard
            icon={Clock}
            label="Staff handoff"
            title={`${metrics.activeKitchen.length} active tickets`}
            details={[
              `${metrics.readyPickup.length} ready for pickup`,
              `${metrics.paymentPending.length} payment pending`,
              `${metrics.paidTableOrdersToday.length} paid table orders today`,
            ]}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Manager checklist</p>
                <h2 className="mt-1 text-xl font-semibold text-gray-950">Today’s priorities</h2>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>

            <div className="mt-5 space-y-3">
              <PriorityRow icon={AlertTriangle} title="Resolve low stock" value={`${lowStock.length}`} detail="Review ingredients below minimum before dinner rush." />
              <PriorityRow icon={CreditCard} title="Confirm Clover cash" value={`${cashEvents.filter((event) => isSameDay(event.createdAt)).length}`} detail="Validate cash movements from Clover events." />
              <PriorityRow icon={Package} title="Fix catalog gaps" value={`${catalogHealth.noImage + catalogHealth.noPrice}`} detail="Products missing photos or prices hurt online ordering." />
              <PriorityRow icon={Users} title="Loyalty health" value={`${loyalty.customers}`} detail="Customer accounts available for retention campaigns." />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Recent web orders</p>
                <h2 className="mt-1 text-xl font-semibold text-gray-950">Checkout feed</h2>
              </div>
              <ShoppingBag className="h-5 w-5 text-gray-400" />
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                <SkeletonRows />
              ) : recentActivity.length ? recentActivity.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelectedOrder(normalizeWebSessionAsOrder(session))}
                  className="flex w-full items-center justify-between gap-4 rounded-2xl border border-gray-100 px-4 py-3 text-left transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-950/15"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-950">{session.customerName}</p>
                    <p className="text-xs text-gray-500">
                      {session.deliveryMethod} · {session.items.length} item groups · {session.orderNotes ? 'has notes' : 'no notes'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-gray-950">{money(session.total)}</p>
                    <p className="text-xs text-gray-400">{session.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </button>
              )) : (
                <EmptyState icon={Users} title="No checkout sessions loaded" description="Web orders will appear here after Clover sessions are created." />
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Legacy data</p>
              <h2 className="mt-1 text-xl font-semibold text-gray-950">Manual sales records</h2>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
              {manualSalesThisMonth.length} this month
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-gray-500">
            Manual sales are no longer the primary workflow. They remain visible only as historical context while real sales should come from Clover and web checkout sessions.
          </p>
        </section>
        <OrderDetailsPanel order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      </div>
    </div>
  )
}

function PriorityRow({
  icon: Icon,
  title,
  value,
  detail,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  value: string
  detail: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#f26350] ring-1 ring-gray-200">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-950">{title}</p>
          <p className="truncate text-xs text-gray-500">{detail}</p>
        </div>
      </div>
      <div className="shrink-0 text-lg font-semibold text-gray-950">{value}</div>
    </div>
  )
}
