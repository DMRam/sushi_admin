import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  Boxes,
  CheckCircle2,
  Clock,
  CreditCard,
  DatabaseZap,
  Package,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Star,
  Trophy,
  Users,
  WalletCards,
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

const CLOVER_CASH_EVENTS_PROXY_URL =
  import.meta.env.VITE_CLOVER_CASH_EVENTS_PROXY_URL ||
  import.meta.env.VITE_CLOVER_DASHBOARD_URL ||
  ''

function money(value: number) {
  return `$${(Number.isFinite(value) ? value : 0).toFixed(2)}`
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
  const directTotal = totals.finalTotal ?? metadataTotals.finalTotal ?? data.finalTotal

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
  const rawItems = Array.isArray(data.items) ? data.items : []

  return {
    id,
    createdAt: normalizeDate(data.createdAt || metadata.createdAt),
    customerName: data.customerName || metadata.customerName || customerInfo.name || fullForm.firstName || 'Guest',
    customerEmail: data.customerEmail || metadata.customerEmail || customerInfo.email || fullForm.email || '',
    total: readSessionTotal(data),
    subtotal: readSessionSubtotal(data),
    paymentStatus: data.paymentStatus || data.status || metadata.paymentStatus || 'unknown',
    deliveryMethod: fullForm.deliveryMethod || metadataFullForm.deliveryMethod || metadata.deliveryMethod || 'pickup',
    pickupTime: fullForm.pickupTime || metadataFullForm.pickupTime || metadata.pickupTime || '',
    orderNotes: fullForm.orderNotes || metadataFullForm.orderNotes || metadata.orderNotes || '',
    items: rawItems.map((item: any) => ({
      name: item.name || 'Product',
      quantity: Number(item.quantity ?? item.unitQty ?? 1) || 1,
      price: Number(item.priceCents ? item.priceCents / 100 : item.price ?? 0) || 0,
    })),
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

function isOperationalProductName(name: string) {
  return !/^test\b/i.test(name.trim())
}

function startOfDayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function dayLabel(date: Date) {
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
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
}: {
  label: string
  value: string
  detail: string
  icon: ComponentType<{ className?: string }>
  tone?: 'dark' | 'green' | 'orange' | 'blue' | 'amber'
}) {
  const toneClass = {
    dark: 'bg-gray-950 text-white',
    green: 'bg-emerald-600 text-white',
    orange: 'bg-[#f26350] text-white',
    blue: 'bg-blue-600 text-white',
    amber: 'bg-amber-500 text-white',
  }[tone]

  return (
    <div className="rounded-[26px] border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-950">{value}</p>
          <p className="mt-2 text-sm leading-5 text-gray-500">{detail}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function RevenueChart({
  data,
}: {
  data: Array<{ label: string; value: number; orders: number }>
}) {
  const max = Math.max(...data.map((item) => item.value), 1)

  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Trend</p>
          <h2 className="mt-1 text-xl font-semibold text-gray-950">7 day web revenue</h2>
        </div>
        <BarChart3 className="h-5 w-5 text-[#f26350]" />
      </div>

      <div className="mt-6 flex h-64 items-end gap-3">
        {data.map((item) => (
          <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-3">
            <div className="flex h-48 w-full items-end rounded-t-2xl bg-gray-50 px-1.5">
              <div
                className="w-full rounded-t-xl bg-gradient-to-t from-[#f26350] to-[#ff9b87] shadow-[0_10px_28px_rgba(242,99,80,0.22)] transition-all"
                style={{ height: `${Math.max(8, (item.value / max) * 100)}%` }}
                title={`${item.label}: ${money(item.value)}`}
              />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-700">{item.label}</p>
              <p className="mt-0.5 text-[11px] text-gray-400">{item.orders} orders</p>
            </div>
          </div>
        ))}
      </div>
    </div>
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
    <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Fulfillment mix</p>
      <h2 className="mt-1 text-xl font-semibold text-gray-950">Pickup vs delivery</h2>
      <div className="mt-6 flex items-center gap-5">
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
}: {
  title: string
  label: string
  icon: ComponentType<{ className?: string }>
  items: Array<{ name: string; value: number; detail: string }>
  emptyTitle: string
  headerAction?: ReactNode
}) {
  const max = Math.max(...items.map((item) => item.value), 1)

  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{label}</p>
          <h2 className="mt-1 text-xl font-semibold text-gray-950">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {headerAction}
          <Icon className="h-5 w-5 text-[#f26350]" />
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {items.length ? items.map((item, index) => (
          <div key={item.name}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-950">{index + 1}. {item.name}</p>
                <p className="text-xs text-gray-500">{item.detail}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-gray-950">{quantityLabel(item.value)}</p>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[#f26350]"
                style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }}
              />
            </div>
          </div>
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
}: {
  events: CloverCashEvent[]
  orders: CloverRecentOrder[]
  payments: CloverRecentOrder[]
  loading: boolean
  error: string | null
  connected: boolean
}) {
  const mergedOrders = useMemo(() => {
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
  }, [orders, payments])

  const todayEvents = events.filter((event) => isSameDay(event.createdAt))
  const todayCash = todayEvents.reduce((sum, event) => sum + event.amount, 0)
  const todayOrders = mergedOrders.filter((order) => isSameDay(order.createdAt))
  const todayOrderRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0)

  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Clover API</p>
          <h2 className="mt-1 text-xl font-semibold text-gray-950">Recent orders</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Live Clover order feed with date, customer details, totals, and items sold.
          </p>
        </div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${connected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
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

      <div className="mt-5 space-y-3">
        {loading ? (
          <SkeletonRows />
        ) : mergedOrders.length ? mergedOrders.slice(0, 10).map((order) => (
          <div key={order.id} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
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
                  {order.lineItems.slice(0, 5).map((item) => (
                    <div key={`${order.id}-${item.id}`} className="flex items-center justify-between gap-3 text-xs">
                      <p className="min-w-0 truncate font-semibold text-gray-800">
                        {quantityLabel(item.quantity)}x {item.name}
                      </p>
                      <p className="shrink-0 font-semibold text-gray-950">{money(item.total || item.price * item.quantity)}</p>
                    </div>
                  ))}
                  {order.lineItems.length > 5 && (
                    <p className="text-xs font-medium text-gray-400">+{order.lineItems.length - 5} more items</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs leading-5 text-gray-400 ring-1 ring-gray-100">
                No line items returned for this Clover order yet.
              </p>
            )}
          </div>
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
    <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gray-950 text-white">
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
  const [checkoutSessions, setCheckoutSessions] = useState<CheckoutSession[]>([])
  const [tableOrders, setTableOrders] = useState<TableOrder[]>([])
  const [loyalty, setLoyalty] = useState<LoyaltyStats>({ customers: 0, pointsIssued: 0 })
  const [cashEvents, setCashEvents] = useState<CloverCashEvent[]>([])
  const [recentCloverOrders, setRecentCloverOrders] = useState<CloverRecentOrder[]>([])
  const [recentCloverPayments, setRecentCloverPayments] = useState<CloverRecentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [cashEventsLoading, setCashEventsLoading] = useState(false)
  const [cashEventsError, setCashEventsError] = useState<string | null>(null)
  const [dataError, setDataError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [demandDays, setDemandDays] = useState<7 | 14 | 30>(14)

  const { products, loading: productsLoading } = useProducts()
  const { ingredients, loading: ingredientsLoading } = useIngredients()
  const { purchases } = usePurchases()
  const { sales } = useSales()

  useEffect(() => {
    setLoading(true)
    setDataError(null)

    const unsubscribers: Unsubscribe[] = []

    const checkoutQuery = query(
      collection(db, 'cloverCheckoutSessions'),
      orderBy('createdAt', 'desc'),
      limit(180)
    )

    const tableOrderQuery = query(
      collection(db, 'tableOrders'),
      orderBy('createdAt', 'desc'),
      limit(140)
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

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [refreshKey])

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
        url.searchParams.set('limit', '20')
        url.searchParams.set('detailLimit', '8')
        url.searchParams.set('orderLimit', '30')

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
  }, [refreshKey])

  const metrics = useMemo(() => {
    const todaySessions = checkoutSessions.filter((session) => isSameDay(session.createdAt))
    const weekSessions = checkoutSessions.filter((session) => isWithinDays(session.createdAt, 7))
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
    const pickup = weekSessions.filter((session) => session.deliveryMethod !== 'delivery').length
    const delivery = weekSessions.filter((session) => session.deliveryMethod === 'delivery').length

    return {
      todaySessions,
      weekSessions,
      todayRevenue,
      weekRevenue,
      todayAverage,
      activeKitchen,
      readyPickup,
      paymentPending,
      paidTableOrdersToday,
      pickup,
      delivery,
    }
  }, [checkoutSessions, tableOrders])

  const sevenDayRevenue = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - index))
      const key = startOfDayKey(date)
      const sessions = checkoutSessions.filter((session) => startOfDayKey(session.createdAt) === key)

      return {
        label: dayLabel(date),
        value: sessions.reduce((sum, session) => sum + session.total, 0),
        orders: sessions.length,
      }
    })
  }, [checkoutSessions])

  const topProducts = useMemo(() => {
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>()
    const combinedOrders = [
      ...recentCloverOrders,
      ...recentCloverPayments,
      ...checkoutSessions.map(normalizeWebSessionAsOrder),
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
  }, [checkoutSessions, cashEvents, recentCloverOrders, recentCloverPayments, demandDays])

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

  const recentActivity = checkoutSessions.slice(0, 8)
  const lastPurchase = purchases[0]
  const manualSalesThisMonth = sales.filter((sale) => {
    const date = new Date(sale.saleDate)
    const now = new Date()
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  })

  const handleRefresh = () => {
    setRefreshKey((current) => current + 1)
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <div className="mx-auto w-full max-w-[1760px] space-y-5 px-3 pb-8 sm:px-5 lg:px-8">
        <section className="overflow-hidden rounded-[32px] border border-gray-200 bg-[radial-gradient(circle_at_8%_10%,rgba(242,99,80,0.2),transparent_27rem),linear-gradient(135deg,#111827,#030712)] p-5 text-white shadow-sm sm:p-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                <Sparkles className="h-3.5 w-3.5 text-[#f26350]" />
                Restaurant intelligence
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                Mai Sushi command center
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-white/62 sm:text-base">
                Real-time web checkout, Clover cash events through a secure backend proxy, inventory pressure, loyalty points, menu health, and staff action signals.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex w-fit items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-950 shadow-lg shadow-black/20 transition hover:bg-gray-100"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh dashboard
            </button>
          </div>
        </section>

        {dataError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {dataError}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Today web sales"
            value={money(metrics.todayRevenue)}
            detail={`${metrics.todaySessions.length} web orders · avg ${money(metrics.todayAverage)}`}
            icon={BadgeDollarSign}
            tone="orange"
          />
          <StatCard
            label="7 day web sales"
            value={money(metrics.weekRevenue)}
            detail={`${metrics.weekSessions.length} checkout sessions`}
            icon={Activity}
            tone="dark"
          />
          <StatCard
            label="Clover orders"
            value={`${[...recentCloverOrders, ...recentCloverPayments].filter((order) => isSameDay(order.createdAt)).length}`}
            detail={CLOVER_CASH_EVENTS_PROXY_URL ? `${recentCloverOrders.length} orders · ${recentCloverPayments.length} payments` : 'Backend proxy needed'}
            icon={CreditCard}
            tone={CLOVER_CASH_EVENTS_PROXY_URL ? 'green' : 'amber'}
          />
          <StatCard
            label="Action queue"
            value={`${metrics.activeKitchen.length + metrics.paymentPending.length + lowStock.length}`}
            detail={`${metrics.readyPickup.length} ready · ${lowStock.length} low stock`}
            icon={AlertTriangle}
            tone="blue"
          />
          <StatCard
            label="Loyalty points"
            value={`${loyalty.pointsIssued.toLocaleString()}`}
            detail={`${loyalty.customers} customer accounts`}
            icon={Trophy}
            tone="green"
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.45fr_0.9fr]">
          <RevenueChart data={sevenDayRevenue} />
          <MixChart pickup={metrics.pickup} delivery={metrics.delivery} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
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
            headerAction={
              <div className="rounded-full bg-gray-100 p-1">
                {[7, 14, 30].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDemandDays(days as 7 | 14 | 30)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                      demandDays === days
                        ? 'bg-gray-950 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-950'
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
              ...checkoutSessions
                .filter((session) => isWithinDays(session.createdAt, 7))
                .map(normalizeWebSessionAsOrder),
            ]}
            payments={recentCloverPayments}
            loading={cashEventsLoading}
            error={cashEventsError}
            connected={Boolean(CLOVER_CASH_EVENTS_PROXY_URL)}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
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
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
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

          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
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
                <div key={session.id} className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 px-4 py-3">
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
                </div>
              )) : (
                <EmptyState icon={Users} title="No checkout sessions loaded" description="Web orders will appear here after Clover sessions are created." />
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
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
