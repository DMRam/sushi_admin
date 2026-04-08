import { useEffect, useMemo, useState } from 'react'
import {
    markOrderPaid,
    subscribeToPaymentOrders,
} from './serviceFirestore'
import type { TableOrder, TableOrderSeatItem } from './serviceTypes'

type PaymentMethod = 'cash' | 'card' | 'clover'

function money(value: number | null | undefined) {
    return `$${Number(value ?? 0).toFixed(2)}`
}

function flattenItems(order: TableOrder): Array<TableOrderSeatItem & { seatLabel: string }> {
    return order.seats.flatMap((seat) =>
        seat.items.map((item) => ({
            ...item,
            seatLabel: seat.label,
        }))
    )
}

export default function PaymentsTab() {
    const [orders, setOrders] = useState<TableOrder[]>([])
    const [selectedOrder, setSelectedOrder] = useState<TableOrder | null>(null)
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
    const [isSaving, setIsSaving] = useState(false)
    const [toast, setToast] = useState<string | null>(null)

    const sortedOrders = useMemo(() => {
        return [...orders].sort((a, b) => {
            const aTime = a.deliveredAt?.seconds ?? 0
            const bTime = b.deliveredAt?.seconds ?? 0
            return bTime - aTime
        })
    }, [orders])

    const showToast = (message: string) => {
        setToast(message)
        window.clearTimeout((showToast as any)._timer)
        ;(showToast as any)._timer = window.setTimeout(() => setToast(null), 3000)
    }

    useEffect(() => {
        const unsubscribe = subscribeToPaymentOrders(
            (incomingOrders) => {
                setOrders(incomingOrders)

                setSelectedOrder((current) => {
                    if (!current) return incomingOrders[0] ?? null
                    return incomingOrders.find((order) => order.id === current.id) ?? incomingOrders[0] ?? null
                })
            },
            (error) => {
                console.error('Failed to subscribe to payment orders', error)
            }
        )

        return () => unsubscribe()
    }, [])

    async function handleMarkPaid() {
        if (!selectedOrder?.id) return

        try {
            setIsSaving(true)
            await markOrderPaid(selectedOrder.id, paymentMethod)
            showToast(`Table ${selectedOrder.tableNumber} marked as paid`)
            setSelectedOrder(null)
        } catch (error) {
            console.error('Failed to mark order paid', error)
            showToast('Could not complete payment')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-4">
            {toast && (
                <div className="fixed left-1/2 top-4 z-[90] -translate-x-1/2 rounded-full bg-gray-800 px-4 py-2 text-sm text-white shadow-lg">
                    {toast}
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Payments</h2>
                    <p className="text-sm text-gray-500">
                        Delivered orders waiting for payment.
                    </p>
                </div>

                <div className="rounded-2xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
                    Pending payments: {sortedOrders.length}
                </div>
            </div>

            {sortedOrders.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
                    No pending payments right now.
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-[360px,1fr]">
                    <div className="space-y-3">
                        {sortedOrders.map((order) => (
                            <button
                                key={order.id}
                                type="button"
                                onClick={() => setSelectedOrder(order)}
                                className={[
                                    'w-full rounded-2xl border p-4 text-left transition',
                                    selectedOrder?.id === order.id
                                        ? 'border-gray-900 bg-gray-50'
                                        : 'border-gray-200 bg-white hover:border-gray-300',
                                ].join(' ')}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="text-base font-semibold text-gray-900">
                                        Table {order.tableNumber}
                                    </h3>
                                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                                        Payment pending
                                    </span>
                                </div>

                                <p className="mt-1 text-sm text-gray-500">
                                    {order.guestCount} guests · {order.totalItems} items
                                </p>

                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Total</span>
                                    <span className="text-base font-semibold text-gray-900">
                                        {money(order.total)}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                        {selectedOrder ? (
                            <>
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900">
                                            Table {selectedOrder.tableNumber}
                                        </h3>
                                        <p className="mt-1 text-sm text-gray-500">
                                            Delivered order ready for checkout
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
                                        {money(selectedOrder.total)}
                                    </div>
                                </div>

                                <div className="mb-5 space-y-2">
                                    {flattenItems(selectedOrder).map((item, index) => (
                                        <div
                                            key={`${item.productId}-${index}`}
                                            className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3"
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {item.quantity} × {item.productName}
                                                </p>
                                                <p className="text-xs text-gray-500">{item.seatLabel}</p>
                                            </div>

                                            <div className="text-sm text-gray-700">
                                                {money(item.quantity * item.unitPrice)}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-2 border-t border-gray-100 pt-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Subtotal</span>
                                        <span className="text-gray-700">{money(selectedOrder.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Tax</span>
                                        <span className="text-gray-700">{money(selectedOrder.taxes)}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-semibold">
                                        <span className="text-gray-900">Total</span>
                                        <span className="text-gray-900">{money(selectedOrder.total)}</span>
                                    </div>
                                </div>

                                <div className="mt-5 grid grid-cols-3 gap-2">
                                    {(['cash', 'card', 'clover'] as PaymentMethod[]).map((method) => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setPaymentMethod(method)}
                                            className={[
                                                'rounded-2xl border px-4 py-3 text-sm transition',
                                                paymentMethod === method
                                                    ? 'border-gray-900 bg-gray-900 text-white'
                                                    : 'border-gray-200 text-gray-700',
                                            ].join(' ')}
                                        >
                                            {method.charAt(0).toUpperCase() + method.slice(1)}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => void handleMarkPaid()}
                                    disabled={isSaving}
                                    className="mt-5 w-full rounded-2xl bg-green-600 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                    Mark as paid
                                </button>
                            </>
                        ) : (
                            <div className="py-12 text-center text-sm text-gray-500">
                                Select an order to process payment.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isSaving ? (
                <div className="fixed bottom-4 right-4 h-2 w-2 animate-pulse rounded-full bg-gray-400" />
            ) : null}
        </div>
    )
}