import { useEffect, useMemo, useState } from 'react'
import ProductPicker from './ProductPicker'
import {
    calculateTotals,
    createDefaultSeats,
    markOrderPaid,
    recalculateOrder,
    sendOrderToKitchen,
    updateTableOrder,
} from './serviceFirestore'
import type { ProductItem, TableOrder, TableOrderSeatItem } from './serviceTypes'

interface Props {
    order: TableOrder | null
    products: ProductItem[]
    onClose: () => void
}

function money(value: number | null | undefined) {
    return `$${Number(value ?? 0).toFixed(2)}`
}

export default function OrderEditor({ order, products, onClose }: Props) {
    const [localOrder, setLocalOrder] = useState<TableOrder | null>(order)
    const [selectedSeatId, setSelectedSeatId] = useState<string>('shared')
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState<string | null>(null)
    const [mobilePickerOpen, setMobilePickerOpen] = useState(false)

    useEffect(() => {
        setLocalOrder(order)
        if (order?.seats?.length) {
            setSelectedSeatId(order.seats[0].id)
        }
    }, [order])

    useEffect(() => {
        if (!mobilePickerOpen) return
        const originalOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = originalOverflow
        }
    }, [mobilePickerOpen])

    const selectedSeat = useMemo(() => {
        return localOrder?.seats.find((seat) => seat.id === selectedSeatId) ?? null
    }, [localOrder, selectedSeatId])

    const showToast = (message: string) => {
        setToast(message)
        window.setTimeout(() => setToast(null), 1400)
    }

    if (!localOrder) {
        return (
            <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-8">
                <p className="text-sm text-gray-400">Select a table to start or edit an order</p>
            </div>
        )
    }

    function updateGuestCount(nextGuestCount: number) {
        const currentOrder = localOrder
        if (!currentOrder) return

        const safeCount = Math.max(1, nextGuestCount)
        const existingShared = currentOrder.seats.find((seat) => seat.type === 'shared')

        const nextSeats = createDefaultSeats(safeCount).map((seat) => {
            if (seat.type === 'shared') {
                return existingShared ? { ...existingShared } : seat
            }

            const existingPersonSeat = currentOrder.seats.find((current) => current.id === seat.id)
            return existingPersonSeat ? { ...existingPersonSeat } : seat
        })

        setLocalOrder(
            recalculateOrder({
                ...currentOrder,
                guestCount: safeCount,
                seats: nextSeats,
            })
        )
    }

    function addProductToSelectedSeat(item: TableOrderSeatItem) {
        const currentOrder = localOrder
        if (!currentOrder || !selectedSeat) return

        const nextSeats = currentOrder.seats.map((seat) => {
            if (seat.id !== selectedSeat.id) return seat

            const existingItem = seat.items.find(
                (current) =>
                    current.productId === item.productId &&
                    (current.notes ?? '') === (item.notes ?? '')
            )

            if (existingItem) {
                return {
                    ...seat,
                    items: seat.items.map((current) =>
                        current === existingItem
                            ? { ...current, quantity: current.quantity + item.quantity }
                            : current
                    ),
                }
            }

            return {
                ...seat,
                items: [...seat.items, item],
            }
        })

        setLocalOrder(
            recalculateOrder({
                ...currentOrder,
                seats: nextSeats,
            })
        )

        showToast(`${item.productName} added`)
    }

    function addProductsToSelectedSeat(items: TableOrderSeatItem[]) {
        const currentOrder = localOrder
        if (!currentOrder || !selectedSeat || items.length === 0) return

        const nextSeats = currentOrder.seats.map((seat) => {
            if (seat.id !== selectedSeat.id) return seat

            const nextItems = [...seat.items]

            for (const incoming of items) {
                const existingIndex = nextItems.findIndex(
                    (current) =>
                        current.productId === incoming.productId &&
                        (current.notes ?? '') === (incoming.notes ?? '')
                )

                if (existingIndex >= 0) {
                    nextItems[existingIndex] = {
                        ...nextItems[existingIndex],
                        quantity: nextItems[existingIndex].quantity + incoming.quantity,
                    }
                } else {
                    nextItems.push(incoming)
                }
            }

            return {
                ...seat,
                items: nextItems,
            }
        })

        setLocalOrder(
            recalculateOrder({
                ...currentOrder,
                seats: nextSeats,
            })
        )

        showToast(`${items.length} item${items.length > 1 ? 's' : ''} added`)
    }

    function updateItemQuantity(seatId: string, itemIndex: number, delta: number) {
        const currentOrder = localOrder
        if (!currentOrder) return

        const nextSeats = currentOrder.seats.map((seat) => {
            if (seat.id !== seatId) return seat

            const nextItems = seat.items
                .map((item, index) => {
                    if (index !== itemIndex) return item
                    return { ...item, quantity: Math.max(0, item.quantity + delta) }
                })
                .filter((item) => item.quantity > 0)

            return { ...seat, items: nextItems }
        })

        setLocalOrder(
            recalculateOrder({
                ...currentOrder,
                seats: nextSeats,
            })
        )
    }

    function updateItemNotes(seatId: string, itemIndex: number, notes: string) {
        const currentOrder = localOrder
        if (!currentOrder) return

        const nextSeats = currentOrder.seats.map((seat) => {
            if (seat.id !== seatId) return seat

            return {
                ...seat,
                items: seat.items.map((item, index) =>
                    index === itemIndex ? { ...item, notes } : item
                ),
            }
        })

        setLocalOrder(
            recalculateOrder({
                ...currentOrder,
                seats: nextSeats,
            })
        )
    }

    function removeItem(seatId: string, itemIndex: number) {
        const currentOrder = localOrder
        if (!currentOrder) return

        const nextSeats = currentOrder.seats.map((seat) => {
            if (seat.id !== seatId) return seat

            return {
                ...seat,
                items: seat.items.filter((_, index) => index !== itemIndex),
            }
        })

        setLocalOrder(
            recalculateOrder({
                ...currentOrder,
                seats: nextSeats,
            })
        )
    }

    async function saveDraft() {
        const currentOrder = localOrder
        if (!currentOrder) return

        try {
            setSaving(true)

            const totals = calculateTotals(currentOrder.seats)

            await updateTableOrder(currentOrder.id, {
                guestCount: currentOrder.guestCount,
                seats: currentOrder.seats,
                subtotal: totals.subtotal,
                taxes: totals.taxes,
                total: totals.total,
                totalItems: totals.totalItems,
                cloverRef: currentOrder.cloverRef ?? null,
                status: currentOrder.status,
                paymentStatus: currentOrder.paymentStatus,
                kitchenStatus: currentOrder.kitchenStatus,
            })

            showToast('Draft saved')
        } catch (error) {
            console.error('Failed to save draft', error)
            showToast('Failed to save')
        } finally {
            setSaving(false)
        }
    }

    async function handleSendToKitchen() {
        const currentOrder = localOrder
        if (!currentOrder) return

        try {
            await saveDraft()
            await sendOrderToKitchen(currentOrder.id)
            showToast('Sent to kitchen')
        } catch (error) {
            console.error('Failed to send order to kitchen', error)
            showToast('Kitchen failed')
        }
    }

    async function handleMarkPaid(method: 'cash' | 'card' | 'clover') {
        const currentOrder = localOrder
        if (!currentOrder) return

        try {
            await saveDraft()
            await markOrderPaid(currentOrder.id, method, currentOrder.cloverRef ?? null)
            showToast('Payment completed')
            onClose()
        } catch (error) {
            console.error('Failed to mark paid', error)
            showToast('Payment failed')
        }
    }

    return (
        <div className="relative flex h-full min-h-0 flex-col">
            {toast && (
                <div className="fixed left-1/2 top-4 z-[90] -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
                    {toast}
                </div>
            )}

            <div className="grid flex-1 min-h-0 grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
                <div className="min-h-0 overflow-y-auto pb-28 lg:pb-4">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                        <div>
                            <h2 className="text-xl font-light text-gray-900">
                                Table {localOrder.tableNumber}
                            </h2>
                            <p className="mt-0.5 text-xs text-gray-400">{localOrder.orderNumber}</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 text-xs text-gray-400 transition hover:text-gray-600"
                        >
                            Close
                        </button>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Guests</p>
                            <div className="mt-1 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => updateGuestCount(localOrder.guestCount - 1)}
                                    className="h-7 w-7 rounded-full border border-gray-200 text-sm text-gray-500"
                                >
                                    −
                                </button>
                                <span className="min-w-[24px] text-center text-sm text-gray-900">
                                    {localOrder.guestCount}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => updateGuestCount(localOrder.guestCount + 1)}
                                    className="h-7 w-7 rounded-full border border-gray-200 text-sm text-gray-500"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Status</p>
                            <p className="mt-1 text-sm capitalize text-gray-900">{localOrder.status}</p>
                        </div>

                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Payment</p>
                            <p className="mt-1 text-sm capitalize text-gray-900">
                                {localOrder.paymentStatus}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Ref</p>
                            <input
                                value={localOrder.cloverRef ?? ''}
                                onChange={(event) =>
                                    setLocalOrder({
                                        ...localOrder,
                                        cloverRef: event.target.value,
                                    })
                                }
                                placeholder="Clover ref"
                                className="w-full border-none p-0 text-sm text-gray-500 placeholder:text-gray-300 focus:outline-none focus:ring-0"
                            />
                        </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-700">Seats</h3>
                        <button
                            type="button"
                            onClick={() => setMobilePickerOpen(true)}
                            className="rounded-full bg-gray-900 px-4 py-2 text-sm text-white lg:hidden"
                        >
                            Add items
                        </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {localOrder.seats.map((seat) => {
                            const isSelected = selectedSeatId === seat.id
                            const itemCount = seat.items.reduce((sum, item) => sum + item.quantity, 0)
                            const subtotal = seat.items.reduce(
                                (sum, item) => sum + item.unitPrice * item.quantity,
                                0
                            )

                            return (
                                <div
                                    key={seat.id}
                                    className={[
                                        'rounded-2xl border transition-all',
                                        isSelected
                                            ? 'border-gray-300 bg-gray-50 shadow-sm'
                                            : 'border-gray-100 bg-white hover:border-gray-200',
                                    ].join(' ')}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSeatId(seat.id)}
                                        className="w-full p-3 text-left"
                                    >
                                        <div className="mb-1 flex items-center justify-between">
                                            <h3 className="text-sm font-medium text-gray-900">{seat.label}</h3>
                                            {itemCount > 0 ? (
                                                <span className="text-xs text-gray-400">{itemCount} items</span>
                                            ) : null}
                                        </div>
                                        <p className="text-xs text-gray-400">{money(subtotal)}</p>
                                    </button>

                                    {isSelected && seat.items.length > 0 && (
                                        <div className="space-y-3 border-t border-gray-100 p-3">
                                            {seat.items.map((item, index) => (
                                                <div key={`${item.productId}-${index}`} className="text-sm">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="truncate text-gray-800">
                                                                    {item.productName}
                                                                </span>
                                                                <span className="flex-shrink-0 text-xs text-gray-400">
                                                                    ×{item.quantity}
                                                                </span>
                                                            </div>
                                                            {item.notes ? (
                                                                <p className="mt-1 truncate text-xs text-gray-400">
                                                                    📝 {item.notes}
                                                                </p>
                                                            ) : null}
                                                        </div>

                                                        <div className="flex flex-shrink-0 items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => updateItemQuantity(seat.id, index, -1)}
                                                                className="h-7 w-7 rounded-full border border-gray-200 text-xs text-gray-500"
                                                            >
                                                                −
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => updateItemQuantity(seat.id, index, 1)}
                                                                className="h-7 w-7 rounded-full border border-gray-200 text-xs text-gray-500"
                                                            >
                                                                +
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeItem(seat.id, index)}
                                                                className="ml-1 rounded-full border border-red-100 px-2 py-1 text-[11px] text-red-500"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <textarea
                                                        value={item.notes ?? ''}
                                                        onChange={(event) =>
                                                            updateItemNotes(seat.id, index, event.target.value)
                                                        }
                                                        placeholder="Add notes..."
                                                        className="mt-2 w-full resize-none rounded-xl border-gray-100 bg-gray-50 p-2 text-xs focus:border-gray-300 focus:outline-none"
                                                        rows={1}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-6 border-t border-gray-200 pt-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Items</span>
                            <span className="text-gray-700">{localOrder.totalItems}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-sm">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="text-gray-700">{money(localOrder.subtotal)}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-sm">
                            <span className="text-gray-500">Tax</span>
                            <span className="text-gray-700">{money(localOrder.taxes)}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-base font-medium">
                            <span className="text-gray-900">Total</span>
                            <span className="text-gray-900">{money(localOrder.total)}</span>
                        </div>
                    </div>
                </div>

                <div className="hidden min-h-0 lg:block">
                    <ProductPicker
                        products={products}
                        onAddProduct={addProductToSelectedSeat}
                    />
                </div>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 backdrop-blur lg:hidden">
                <div className="grid grid-cols-4 gap-2">
                    <button
                        type="button"
                        onClick={() => setMobilePickerOpen(true)}
                        className="rounded-2xl bg-gray-900 px-3 py-3 text-xs font-medium text-white shadow-sm"
                    >
                        Add
                    </button>
                    <button
                        type="button"
                        onClick={saveDraft}
                        disabled={saving}
                        className="rounded-2xl border border-gray-200 px-3 py-3 text-xs text-gray-700 disabled:opacity-50"
                    >
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={handleSendToKitchen}
                        disabled={saving || localOrder.totalItems === 0}
                        className="rounded-2xl border border-gray-200 px-3 py-3 text-xs text-gray-700 disabled:opacity-30"
                    >
                        Kitchen
                    </button>
                    <button
                        type="button"
                        onClick={() => handleMarkPaid('cash')}
                        disabled={saving || localOrder.totalItems === 0}
                        className="rounded-2xl border border-gray-200 px-3 py-3 text-xs text-gray-700 disabled:opacity-30"
                    >
                        Cash
                    </button>
                </div>
            </div>

            {mobilePickerOpen && (
                <div className="fixed inset-0 z-[80] lg:hidden">
                    <button
                        type="button"
                        onClick={() => setMobilePickerOpen(false)}
                        className="absolute inset-0 bg-black/30"
                        aria-label="Close menu"
                    />
                    <div
                        className="absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl"
                        style={{ height: '78dvh' }}
                    >
                        <div className="flex-shrink-0 px-4 pt-3 pb-2">
                            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-300" />
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-medium text-gray-900">Add items</h3>
                                    <p className="text-xs text-gray-400">
                                        For {selectedSeat?.label ?? 'selected seat'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setMobilePickerOpen(false)}
                                    className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600"
                                >
                                    Done
                                </button>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1">
                            <ProductPicker
                                products={products}
                                onAddProduct={addProductToSelectedSeat}
                                onAddProducts={addProductsToSelectedSeat}
                                isMobile
                                onDone={() => setMobilePickerOpen(false)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {saving && (
                <div className="fixed bottom-24 right-4 h-2 w-2 animate-pulse rounded-full bg-gray-400 lg:bottom-4" />
            )}
        </div>
    )
}