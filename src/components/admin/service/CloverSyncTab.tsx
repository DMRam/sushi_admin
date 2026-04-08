import { useEffect, useMemo, useState } from 'react'
import { subscribeToPaidOrders } from './serviceFirestore'
import type { TableOrder } from './serviceTypes'

function money(value: number | null | undefined) {
    return `$${Number(value ?? 0).toFixed(2)}`
}

function flattenItems(order: TableOrder) {
    return order.seats.flatMap((seat) =>
        seat.items.map((item) => ({
            ...item,
            seatLabel: seat.label,
            seatType: seat.type,
        }))
    )
}

export default function CloverSyncTab() {
    const [orders, setOrders] = useState<TableOrder[]>([])
    const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({})

    useEffect(() => {
        const unsubscribe = subscribeToPaidOrders(
            (incoming) => setOrders(incoming),
            (error) => console.error('Failed to load paid orders', error)
        )

        return () => unsubscribe()
    }, [])

    const sortedOrders = useMemo(() => {
        return [...orders].sort((a, b) => {
            const aTime = a.paidAt?.seconds ?? 0
            const bTime = b.paidAt?.seconds ?? 0
            return bTime - aTime
        })
    }, [orders])

    function toggleExpanded(orderId: string) {
        setExpandedOrderIds((current) => ({
            ...current,
            [orderId]: !current[orderId],
        }))
    }

    return (
        <div className="space-y-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Clover Sync</h2>
                <p className="text-sm text-gray-500">
                    Paid orders and reconciliation with Clover.
                </p>
            </div>

            {sortedOrders.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
                    No paid orders yet.
                </div>
            ) : (
                <div className="space-y-3">
                    {sortedOrders.map((order) => {
                        const isMatched = order.cloverStatus === 'matched'
                        const isExpanded = Boolean(expandedOrderIds[order.id])
                        const items = flattenItems(order)

                        return (
                            <div
                                key={order.id}
                                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                            >
                                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-base font-semibold text-gray-900">
                                                Table {order.tableNumber}
                                            </h3>

                                            <span
                                                className={[
                                                    'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                                                    isMatched
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-amber-100 text-amber-700',
                                                ].join(' ')}
                                            >
                                                {order.cloverStatus ?? 'not_sent'}
                                            </span>

                                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                                                {order.paymentMethod ?? 'unknown'}
                                            </span>
                                        </div>

                                        <p className="mt-1 text-sm text-gray-500">
                                            {order.totalItems} items · {money(order.total)}
                                        </p>

                                        <p className="text-xs text-gray-400">
                                            {order.orderNumber}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                                        <div className="text-right">
                                            <p className="text-sm text-gray-500">Paid</p>
                                            <p className="text-base font-semibold text-gray-900">
                                                {money(order.total)}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => toggleExpanded(order.id)}
                                            className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                        >
                                            {isExpanded ? 'Hide items' : 'Show items'}
                                        </button>
                                    </div>
                                </div>

                                {isExpanded ? (
                                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                                        <div className="mb-4 grid gap-2 sm:grid-cols-3">
                                            <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                                                <p className="text-xs uppercase tracking-wide text-gray-400">
                                                    Subtotal
                                                </p>
                                                <p className="mt-1 text-sm font-medium text-gray-900">
                                                    {money(order.subtotal)}
                                                </p>
                                            </div>

                                            <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                                                <p className="text-xs uppercase tracking-wide text-gray-400">
                                                    Tax
                                                </p>
                                                <p className="mt-1 text-sm font-medium text-gray-900">
                                                    {money(order.taxes)}
                                                </p>
                                            </div>

                                            <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                                                <p className="text-xs uppercase tracking-wide text-gray-400">
                                                    Total
                                                </p>
                                                <p className="mt-1 text-sm font-medium text-gray-900">
                                                    {money(order.total)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {items.map((item, index) => (
                                                <div
                                                    key={`${order.id}-${item.productId}-${index}`}
                                                    className="flex items-center justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-gray-200"
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {item.quantity} × {item.productName}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {item.seatLabel}
                                                        </p>
                                                    </div>

                                                    <p className="text-sm font-medium text-gray-700">
                                                        {money(item.quantity * item.unitPrice)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}