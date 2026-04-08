import { useEffect, useMemo, useState, useRef } from 'react'
import {
    RESTAURANT_TABLES,
    createDraftOrder,
    createTableOrder,
    markOrderDelivered,
    markOrderPaid,
    recalculateOrder,
    sendOrderToKitchen,
    subscribeToActiveProducts,
    subscribeToOpenTableOrders,
    subscribeToReadyPickupOrders,
    updateTableOrder,
} from './serviceFirestore'
import type {
    ProductItem,
    TableOrder,
    TableOrderSeat,
    TableOrderSeatItem,
} from './serviceTypes'
import ProductPicker from './ProductPicker'

type PaymentMethod = 'cash' | 'card' | 'clover'
type TableVisualStatus = 'empty' | 'open' | 'ready' | 'closed'

function money(value: number | null | undefined) {
    return `$${Number(value ?? 0).toFixed(2)}`
}

function getSeatSubtotal(seat: TableOrderSeat | null | undefined) {
    if (!seat) return 0
    return seat.items.reduce(
        (sum, item) => sum + Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0),
        0
    )
}

function getSeatItemsCount(seat: TableOrderSeat | null | undefined) {
    if (!seat) return 0
    return seat.items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0)
}

function isPersonSeat(seat: TableOrderSeat) {
    return seat.type === 'person'
}

function findSeat(order: TableOrder | null, seatId: string) {
    if (!order) return null
    return order.seats.find((seat) => seat.id === seatId) ?? null
}

function getTableVisualStatus(order?: TableOrder): TableVisualStatus {
    if (!order) return 'empty'
    if (order.paymentStatus === 'paid') return 'closed'
    if (order.status === 'ready_for_pickup' || order.kitchenStatus === 'ready') return 'ready'
    return 'open'
}

function addItemToSeatItems(items: TableOrderSeatItem[], nextItem: TableOrderSeatItem) {
    const existing = items.find((item) => item.productId === nextItem.productId)
    if (!existing) return [...items, nextItem]

    return items.map((item) =>
        item.productId === nextItem.productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
    )
}

function decreaseSeatItem(items: TableOrderSeatItem[], productId: string) {
    return items
        .map((item) =>
            item.productId === productId
                ? { ...item, quantity: item.quantity - 1 }
                : item
        )
        .filter((item) => item.quantity > 0)
}

function buildUpdatedOrder(order: TableOrder, seats: TableOrderSeat[]): TableOrder {
    return recalculateOrder({
        ...order,
        seats,
        guestCount: seats.filter(isPersonSeat).length,
    })
}

export default function FloorOrdersTab() {
    const [products, setProducts] = useState<ProductItem[]>([])
    const [ordersByTable, setOrdersByTable] = useState<Record<string, TableOrder>>({})
    const [readyOrders, setReadyOrders] = useState<TableOrder[]>([])
    const [selectedTable, setSelectedTable] = useState<string | null>(null)
    const [selectedSeatId, setSelectedSeatId] = useState<string>('person-1')
    const [isSaving, setIsSaving] = useState(false)
    const [isLoadingProducts, setIsLoadingProducts] = useState(true)
    const [isLoadingOrders, setIsLoadingOrders] = useState(true)
    const [checkoutOpen, setCheckoutOpen] = useState(false)
    const [checkoutMethod, setCheckoutMethod] = useState<PaymentMethod>('card')
    const [toast, setToast] = useState<string | null>(null)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const readySignalCountsRef = useRef<Record<string, number>>({})
    const readyAudioRef = useRef<HTMLAudioElement | null>(null)

    const selectedOrder = selectedTable ? ordersByTable[selectedTable] ?? null : null
    const selectedSeat = useMemo(() => findSeat(selectedOrder, selectedSeatId), [selectedOrder, selectedSeatId])

    const personSeats = useMemo(() => selectedOrder?.seats.filter(isPersonSeat) ?? [], [selectedOrder])
    const sharedSeat = useMemo(
        () => selectedOrder?.seats.find((seat) => seat.type === 'shared') ?? null,
        [selectedOrder]
    )

    const readyTableNumbers = useMemo(
        () => new Set(readyOrders.map((order) => String(order.tableNumber))),
        [readyOrders]
    )

    const stats = useMemo(() => {
        const orders = Object.values(ordersByTable)
        return {
            openTables: orders.filter((order) => order.paymentStatus === 'pending').length,
            ready: orders.filter(
                (order) => order.status === 'ready_for_pickup' || order.kitchenStatus === 'ready'
            ).length,
            pendingAmount: orders
                .filter((order) => order.paymentStatus === 'pending')
                .reduce((sum, order) => sum + Number(order.total ?? 0), 0),
        }
    }, [ordersByTable])

    const showToast = (message: string) => {
        setToast(message)
        window.clearTimeout((showToast as any)._timer)
            ; (showToast as any)._timer = window.setTimeout(() => setToast(null), 3000)
    }

    useEffect(() => {
        readyAudioRef.current = new Audio('/sounds/waitress-alert.mp3')
        readyAudioRef.current.preload = 'auto'
    }, [])

    useEffect(() => {
        const unsubscribe = subscribeToActiveProducts(
            (nextProducts) => {
                setProducts(nextProducts)
                setIsLoadingProducts(false)
            },
            (error) => {
                console.error('Failed to subscribe to active products', error)
                setIsLoadingProducts(false)
            }
        )
        return () => unsubscribe()
    }, [])

    useEffect(() => {
        const unsubscribe = subscribeToOpenTableOrders(
            (orders) => {
                const nextMap = orders.reduce<Record<string, TableOrder>>((acc, order) => {
                    acc[String(order.tableNumber)] = order
                    return acc
                }, {})
                setOrdersByTable(nextMap)
                setIsLoadingOrders(false)
            },
            (error) => {
                console.error('Failed to subscribe to open table orders', error)
                setIsLoadingOrders(false)
            }
        )
        return () => unsubscribe()
    }, [])

    useEffect(() => {
        const unsubscribe = subscribeToReadyPickupOrders(
            (orders) => {
                let shouldPlay = false
                const nextCounts: Record<string, number> = {
                    ...readySignalCountsRef.current,
                }

                orders.forEach((order) => {
                    const currentCount = Number(order.pickupCallCount ?? 0)
                    const previousCount = Number(readySignalCountsRef.current[order.id] ?? 0)

                    if (currentCount > previousCount) {
                        shouldPlay = true
                        showToast(`Table ${order.tableNumber} is ready for pickup`)
                    }

                    nextCounts[order.id] = currentCount
                })

                readySignalCountsRef.current = nextCounts
                setReadyOrders(orders)

                if (shouldPlay && readyAudioRef.current) {
                    readyAudioRef.current.pause()
                    readyAudioRef.current.currentTime = 0
                    readyAudioRef.current.play().catch(() => {
                        // browser may block autoplay until there has been user interaction
                    })
                }

                setOrdersByTable((current) => {
                    const next = { ...current }
                    orders.forEach((order) => {
                        next[String(order.tableNumber)] = {
                            ...(next[String(order.tableNumber)] ?? order),
                            ...order,
                        }
                    })
                    return next
                })
            },
            (error) => {
                console.error('Failed to subscribe to ready pickup orders', error)
            }
        )

        return () => unsubscribe()
    }, [])

    useEffect(() => {
        if (!selectedOrder) return
        const currentSeatExists = selectedOrder.seats.some((seat) => seat.id === selectedSeatId)
        if (currentSeatExists) return
        const fallbackSeat = selectedOrder.seats.find(isPersonSeat) ?? selectedOrder.seats[0]
        if (fallbackSeat) setSelectedSeatId(fallbackSeat.id)
    }, [selectedOrder, selectedSeatId])

    useEffect(() => {
        if (!mobileMenuOpen) return
        const original = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = original
        }
    }, [mobileMenuOpen])

    async function persistOrder(order: TableOrder) {
        try {
            setIsSaving(true)

            if (order.id) {
                await updateTableOrder(order.id, {
                    tableNumber: order.tableNumber,
                    guestCount: order.guestCount,
                    orderNumber: order.orderNumber,
                    cloverRef: order.cloverRef ?? null,
                    status: order.status,
                    kitchenStatus: order.kitchenStatus,
                    paymentStatus: order.paymentStatus,
                    paymentMethod: order.paymentMethod ?? null,
                    cloverStatus: order.cloverStatus,
                    seats: order.seats,
                    subtotal: order.subtotal,
                    taxes: order.taxes,
                    total: order.total,
                    totalItems: order.totalItems,
                })
            } else {
                const orderId = await createTableOrder({
                    tableNumber: order.tableNumber,
                    guestCount: order.guestCount,
                    orderNumber: order.orderNumber,
                    cloverRef: order.cloverRef ?? null,
                    status: order.status,
                    kitchenStatus: order.kitchenStatus,
                    paymentStatus: order.paymentStatus,
                    paymentMethod: null,
                    cloverStatus: order.cloverStatus,
                    seats: order.seats,
                    subtotal: order.subtotal,
                    taxes: order.taxes,
                    total: order.total,
                    totalItems: order.totalItems,
                })

                setOrdersByTable((current) => ({
                    ...current,
                    [String(order.tableNumber)]: { ...order, id: orderId },
                }))
            }
        } catch (error) {
            console.error('Failed to persist floor order', error)
        } finally {
            setIsSaving(false)
        }
    }

    function patchSelectedOrder(updater: (order: TableOrder) => TableOrder) {
        if (!selectedOrder || !selectedTable) return
        const nextOrder = updater(selectedOrder)
        setOrdersByTable((current) => ({ ...current, [selectedTable]: nextOrder }))
        void persistOrder(nextOrder)
    }

    async function handleOpenTable(tableNumber: string) {
        const existing = ordersByTable[tableNumber]
        if (existing) {
            setSelectedTable(tableNumber)
            const firstSeat = existing.seats.find(isPersonSeat) ?? existing.seats[0]
            setSelectedSeatId(firstSeat?.id ?? 'shared')
            return
        }

        const draft = createDraftOrder(tableNumber, 2)
        const firstSeat = draft.seats.find(isPersonSeat) ?? draft.seats[0]
        const localDraft: TableOrder = { ...draft, id: '' }

        setOrdersByTable((current) => ({ ...current, [tableNumber]: localDraft }))
        setSelectedTable(tableNumber)
        setSelectedSeatId(firstSeat?.id ?? 'shared')
        await persistOrder(localDraft)
    }

    function handleAddGuest() {
        if (!selectedOrder) return

        patchSelectedOrder((order) => {
            const nextGuestCount = order.seats.filter(isPersonSeat).length + 1
            const nextSeat: TableOrderSeat = {
                id: `person-${nextGuestCount}`,
                type: 'person',
                label: `Guest ${nextGuestCount}`,
                personNumber: nextGuestCount,
                items: [],
            }

            const currentPersons = order.seats.filter(isPersonSeat)
            const currentShared = order.seats.find((seat) => seat.type === 'shared')
            const nextSeats = currentShared
                ? [...currentPersons, nextSeat, currentShared]
                : [...order.seats, nextSeat]

            setSelectedSeatId(nextSeat.id)
            return buildUpdatedOrder(order, nextSeats)
        })
    }

    function handleAddProduct(item: TableOrderSeatItem) {
        if (!selectedOrder) return

        patchSelectedOrder((order) => {
            const nextSeats = order.seats.map((seat) => {
                if (seat.id !== selectedSeatId) return seat
                return {
                    ...seat,
                    items: addItemToSeatItems(seat.items, item),
                }
            })

            return buildUpdatedOrder(order, nextSeats)
        })
    }

    function handleDecreaseItem(productId: string, seatId: string) {
        if (!selectedOrder) return

        patchSelectedOrder((order) => {
            const nextSeats = order.seats.map((seat) =>
                seat.id === seatId
                    ? { ...seat, items: decreaseSeatItem(seat.items, productId) }
                    : seat
            )
            return buildUpdatedOrder(order, nextSeats)
        })
    }

    function handleIncreaseExistingItem(item: TableOrderSeatItem) {
        handleAddProduct({ ...item, quantity: 1 })
    }

    function handleMoveSharedToSeat(item: TableOrderSeatItem, destinationSeatId: string) {
        if (!selectedOrder) return

        patchSelectedOrder((order) => {
            const nextSeats = order.seats.map((seat) => {
                if (seat.id === 'shared') {
                    return { ...seat, items: decreaseSeatItem(seat.items, item.productId) }
                }

                if (seat.id === destinationSeatId) {
                    return {
                        ...seat,
                        items: addItemToSeatItems(seat.items, { ...item, quantity: 1 }),
                    }
                }

                return seat
            })

            return buildUpdatedOrder(order, nextSeats)
        })
    }

    async function handleSendToKitchen() {
        if (!selectedOrder?.id) return

        try {
            setIsSaving(true)
            await sendOrderToKitchen(selectedOrder.id)
            showToast('Order sent to kitchen')
        } catch (error) {
            console.error('Failed to send order to kitchen', error)
        } finally {
            setIsSaving(false)
        }
    }

    async function handleMarkReadyOrderDelivered(orderId: string, tableNumber: string) {
        try {
            setIsSaving(true)
            await markOrderDelivered(orderId)
            showToast(`Table ${tableNumber} marked as served`)
        } catch (error) {
            console.error('Failed to mark order delivered', error)
        } finally {
            setIsSaving(false)
        }
    }

    async function handleMarkPaid() {
        if (!selectedOrder?.id) return

        try {
            setIsSaving(true)
            await markOrderPaid(selectedOrder.id, checkoutMethod)
            setCheckoutOpen(false)
            showToast('Payment completed')
            setSelectedTable(null)
        } catch (error) {
            console.error('Failed to mark order paid', error)
        } finally {
            setIsSaving(false)
        }
    }

    const activeItems = selectedSeat?.items ?? []
    const activeSeatSubtotal = getSeatSubtotal(selectedSeat)

    return (
        <div className="min-h-screen bg-gray-50">
            {toast && (
                <div className="fixed left-1/2 top-4 z-[90] -translate-x-1/2 rounded-full bg-gray-800 px-4 py-2 text-sm text-white shadow-lg">
                    {toast}
                </div>
            )}

            <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 lg:px-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-light text-gray-900">Floor</h1>
                    <p className="mt-0.5 text-sm text-gray-400">Dine-in management</p>
                </div>

                {readyOrders.length > 0 ? (
                    <div className="mb-6 space-y-3">
                        {readyOrders.map((order) => (
                            <div
                                key={order.id}
                                className="flex flex-col gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <p className="text-sm font-semibold text-green-900">
                                        Table {order.tableNumber} is ready for pickup
                                    </p>
                                    <p className="mt-1 text-xs text-green-800">
                                        {order.totalItems} items · Total {money(order.total)}
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedTable(String(order.tableNumber))
                                            const firstSeat = order.seats.find(isPersonSeat) ?? order.seats[0]
                                            setSelectedSeatId(firstSeat?.id ?? 'shared')
                                            showToast(`Opening table ${order.tableNumber}`)
                                        }}
                                        className="rounded-xl border border-green-300 bg-white px-3 py-2 text-xs font-medium text-green-900"
                                    >
                                        Open table
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => void handleMarkReadyOrderDelivered(order.id, String(order.tableNumber))}
                                        className="rounded-xl bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700"
                                    >
                                        Mark served
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}

                <div className="mb-6 grid grid-cols-3 gap-3">
                    <div className="border-b border-gray-200 pb-2">
                        <p className="text-xs uppercase tracking-wide text-gray-400">Open</p>
                        <p className="mt-1 text-xl font-light text-gray-900">{stats.openTables}</p>
                    </div>

                    <div className="border-b border-gray-200 pb-2">
                        <p className="text-xs uppercase tracking-wide text-gray-400">Ready</p>
                        <p className="mt-1 text-xl font-light text-gray-900">{stats.ready}</p>
                    </div>

                    <div className="border-b border-gray-200 pb-2">
                        <p className="text-xs uppercase tracking-wide text-gray-400">Due</p>
                        <p className="mt-1 text-xl font-light text-gray-900">{money(stats.pendingAmount)}</p>
                    </div>
                </div>

                <div className="mb-8">
                    <h2 className="mb-3 text-sm font-medium text-gray-500">Tables</h2>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                        {RESTAURANT_TABLES.map((tableNumber) => {
                            const order = ordersByTable[String(tableNumber)]
                            const status = getTableVisualStatus(order)
                            const isSelected = selectedTable === String(tableNumber)
                            const isReady = readyTableNumbers.has(String(tableNumber))

                            return (
                                <button
                                    key={tableNumber}
                                    type="button"
                                    onClick={() => void handleOpenTable(String(tableNumber))}
                                    className={[
                                        'relative aspect-square rounded-2xl border transition-all',
                                        isSelected
                                            ? 'border-gray-900 bg-gray-50'
                                            : isReady
                                                ? 'border-green-400 bg-green-50 ring-2 ring-green-200'
                                                : 'border-gray-200 bg-white hover:border-gray-300',
                                    ].join(' ')}
                                >
                                    <div className="absolute right-3 top-3">
                                        <TableStatusDot status={status} />
                                    </div>

                                    {isReady ? (
                                        <div className="absolute left-3 top-3 rounded-full bg-green-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                                            Ready
                                        </div>
                                    ) : null}

                                    <div className="flex h-full flex-col items-center justify-center">
                                        <span className="text-2xl font-light text-gray-900">{tableNumber}</span>
                                        {order ? (
                                            <span className="mt-1 text-xs text-gray-400">
                                                {money(order.total)}
                                            </span>
                                        ) : null}
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {isLoadingOrders ? (
                        <p className="mt-3 text-center text-xs text-gray-400">Loading tables...</p>
                    ) : null}
                </div>

                {selectedOrder && (
                    <div className="border-t border-gray-200 pb-28 pt-6 lg:pb-6">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-medium text-gray-900">
                                    Table {selectedOrder.tableNumber}
                                </h2>
                                <p className="mt-0.5 text-xs text-gray-400">
                                    {selectedOrder.guestCount} guests · {selectedOrder.totalItems} items
                                </p>
                            </div>

                            <div className="hidden gap-2 sm:flex">
                                <button
                                    type="button"
                                    onClick={handleAddGuest}
                                    className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                                >
                                    Add guest
                                </button>

                                <button
                                    type="button"
                                    onClick={() => void handleSendToKitchen()}
                                    disabled={selectedOrder.totalItems === 0}
                                    className="rounded-full bg-gray-900 px-3 py-1.5 text-xs text-white disabled:opacity-30"
                                >
                                    Send to kitchen
                                </button>
                            </div>
                        </div>

                        <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
                            {personSeats.map((seat, index) => {
                                const active = selectedSeatId === seat.id
                                const itemCount = getSeatItemsCount(seat)

                                return (
                                    <button
                                        key={seat.id}
                                        type="button"
                                        onClick={() => setSelectedSeatId(seat.id)}
                                        className={[
                                            'whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-all',
                                            active
                                                ? 'bg-gray-900 text-white'
                                                : 'text-gray-500 hover:text-gray-900',
                                        ].join(' ')}
                                    >
                                        Guest {index + 1}
                                        {itemCount > 0 ? (
                                            <span className="ml-1 text-xs opacity-70">({itemCount})</span>
                                        ) : null}
                                    </button>
                                )
                            })}

                            <button
                                type="button"
                                onClick={() => setSelectedSeatId('shared')}
                                className={[
                                    'whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-all',
                                    selectedSeatId === 'shared'
                                        ? 'bg-gray-900 text-white'
                                        : 'text-gray-500 hover:text-gray-900',
                                ].join(' ')}
                            >
                                Shared
                                {sharedSeat && getSeatItemsCount(sharedSeat) > 0 ? (
                                    <span className="ml-1 text-xs opacity-70">({getSeatItemsCount(sharedSeat)})</span>
                                ) : null}
                            </button>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <div className="hidden min-h-0 lg:block">
                                {isLoadingProducts ? (
                                    <div className="py-8 text-center text-sm text-gray-400">Loading menu...</div>
                                ) : (
                                    <div className="h-[60vh] min-h-[400px] md:h-[70vh]">
                                        <ProductPicker
                                            products={products}
                                            onAddProduct={handleAddProduct}
                                            isMobile={false}
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="mb-4 border-b border-gray-100 pb-2">
                                    <p className="text-sm font-medium text-gray-900">
                                        {selectedSeat?.label === 'Shared' ? 'Shared items' : selectedSeat?.label}
                                    </p>
                                    <p className="mt-0.5 text-xs text-gray-400">{money(activeSeatSubtotal)}</p>
                                </div>

                                {activeItems.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-gray-400">No items</div>
                                ) : (
                                    <div className="mb-6 space-y-2">
                                        {activeItems.map((item) => (
                                            <div
                                                key={`${selectedSeatId}-${item.productId}`}
                                                className="flex items-center justify-between border-b border-gray-50 py-2"
                                            >
                                                <div className="flex-1">
                                                    <p className="text-sm text-gray-800">{item.productName}</p>

                                                    <div className="mt-1 flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDecreaseItem(item.productId, selectedSeatId)}
                                                            className="h-6 w-6 rounded-full border border-gray-200 text-xs text-gray-500 hover:bg-gray-50"
                                                        >
                                                            −
                                                        </button>

                                                        <span className="text-xs text-gray-500">{item.quantity}</span>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleIncreaseExistingItem(item)}
                                                            className="h-6 w-6 rounded-full border border-gray-200 text-xs text-gray-500 hover:bg-gray-50"
                                                        >
                                                            +
                                                        </button>

                                                        {selectedSeatId === 'shared' && personSeats.length > 0 ? (
                                                            <select
                                                                className="ml-2 bg-transparent text-xs text-gray-400 focus:outline-none"
                                                                defaultValue=""
                                                                onChange={(e) => {
                                                                    if (e.target.value) {
                                                                        handleMoveSharedToSeat(item, e.target.value)
                                                                        e.target.value = ''
                                                                    }
                                                                }}
                                                            >
                                                                <option value="">Move to guest</option>
                                                                {personSeats.map((seat) => (
                                                                    <option key={seat.id} value={seat.id}>
                                                                        {seat.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                <span className="text-sm text-gray-600">
                                                    {money(item.quantity * item.unitPrice)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="border-t border-gray-200 pt-4">
                                    <div className="mb-1 flex justify-between text-sm">
                                        <span className="text-gray-500">Subtotal</span>
                                        <span className="text-gray-700">{money(selectedOrder.subtotal)}</span>
                                    </div>

                                    <div className="mb-3 flex justify-between text-sm">
                                        <span className="text-gray-500">Tax</span>
                                        <span className="text-gray-700">{money(selectedOrder.taxes)}</span>
                                    </div>

                                    <div className="flex justify-between text-base font-medium">
                                        <span className="text-gray-900">Total</span>
                                        <span className="text-gray-900">{money(selectedOrder.total)}</span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setCheckoutOpen(true)}
                                        disabled={selectedOrder.totalItems === 0}
                                        className="mt-4 w-full rounded-xl bg-gray-900 py-2.5 text-sm text-white disabled:opacity-30"
                                    >
                                        Checkout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {checkoutOpen && selectedOrder && (
                    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/20 p-4 sm:items-center">
                        <div className="w-full max-w-sm rounded-2xl bg-white p-5">
                            <h3 className="mb-1 text-lg font-medium text-gray-900">Checkout</h3>
                            <p className="mb-4 text-sm text-gray-400">Table {selectedOrder.tableNumber}</p>

                            <div className="mb-4 space-y-2">
                                {(['cash', 'card', 'clover'] as PaymentMethod[]).map((method) => (
                                    <button
                                        key={method}
                                        type="button"
                                        onClick={() => setCheckoutMethod(method)}
                                        className={[
                                            'w-full rounded-xl border py-2.5 text-sm transition-all',
                                            checkoutMethod === method
                                                ? 'border-gray-900 bg-gray-900 text-white'
                                                : 'border-gray-200 text-gray-600',
                                        ].join(' ')}
                                    >
                                        {method.charAt(0).toUpperCase() + method.slice(1)}
                                    </button>
                                ))}
                            </div>

                            <div className="mb-2 flex justify-between text-sm">
                                <span className="text-gray-500">Total</span>
                                <span className="font-medium text-gray-900">{money(selectedOrder.total)}</span>
                            </div>

                            <div className="mt-4 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCheckoutOpen(false)}
                                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={() => void handleMarkPaid()}
                                    className="flex-1 rounded-xl bg-gray-900 py-2.5 text-sm text-white"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {selectedOrder ? (
                    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 p-3 backdrop-blur lg:hidden">
                        <div className="grid grid-cols-4 gap-2">
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(true)}
                                className="rounded-2xl bg-gray-900 px-3 py-3 text-xs font-medium text-white"
                            >
                                Menu
                            </button>

                            <button
                                type="button"
                                onClick={handleAddGuest}
                                className="rounded-2xl border border-gray-200 px-3 py-3 text-xs text-gray-700"
                            >
                                Guest
                            </button>

                            <button
                                type="button"
                                onClick={() => void handleSendToKitchen()}
                                disabled={selectedOrder.totalItems === 0}
                                className="rounded-2xl border border-gray-200 px-3 py-3 text-xs text-gray-700 disabled:opacity-30"
                            >
                                Kitchen
                            </button>

                            <button
                                type="button"
                                onClick={() => setCheckoutOpen(true)}
                                disabled={selectedOrder.totalItems === 0}
                                className="rounded-2xl border border-gray-200 px-3 py-3 text-xs text-gray-700 disabled:opacity-30"
                            >
                                Pay
                            </button>
                        </div>
                    </div>
                ) : null}

                {mobileMenuOpen ? (
                    <div className="fixed inset-0 z-[85] lg:hidden">
                        <button
                            type="button"
                            aria-label="Close mobile menu"
                            onClick={() => setMobileMenuOpen(false)}
                            className="absolute inset-0 bg-black/30"
                        />

                        <div
                            className="absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl"
                            style={{ height: '85dvh' }}
                        >
                            <div className="flex-shrink-0 px-4 pb-2 pt-3">
                                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-300" />

                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-base font-medium text-gray-900">Menu</h3>
                                        <p className="text-xs text-gray-400">
                                            Add items to {selectedSeat?.label ?? 'seat'}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1">
                                {isLoadingProducts ? (
                                    <div className="py-8 text-center text-sm text-gray-400">Loading menu...</div>
                                ) : (
                                    <ProductPicker
                                        products={products}
                                        onAddProduct={handleAddProduct}
                                        isMobile
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                ) : null}

                {isSaving ? (
                    <div className="fixed bottom-24 right-4 h-2 w-2 animate-pulse rounded-full bg-gray-400 lg:bottom-4" />
                ) : null}
            </div>
        </div>
    )
}

function TableStatusDot({ status }: { status: TableVisualStatus }) {
    const colors = {
        empty: 'bg-gray-200',
        open: 'bg-blue-400',
        ready: 'bg-green-400',
        closed: 'bg-gray-400',
    }

    return <div className={`h-2 w-2 rounded-full ${colors[status]}`} />
}