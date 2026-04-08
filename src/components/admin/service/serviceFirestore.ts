import {
    addDoc,
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
    increment,
    type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../../../firebase/firebase'
import type {
    ProductItem,
    TableOrder,
    TableOrderSeat,
    TableOrderSeatItem,
} from './serviceTypes'

const PRODUCTS_COLLECTION = 'products'
const TABLE_ORDERS_COLLECTION = 'tableOrders'
const TAX_RATE = 0.14975

export const RESTAURANT_TABLES = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== 'object') return false
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
}

function removeUndefinedDeep(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(removeUndefinedDeep)
    }

    if (isPlainObject(value)) {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([, nestedValue]) => nestedValue !== undefined)
                .map(([key, nestedValue]) => [key, removeUndefinedDeep(nestedValue)])
        )
    }

    return value
}

export function createDefaultSeats(guestCount: number): TableOrderSeat[] {
    const persons = Array.from({ length: Math.max(guestCount, 1) }, (_, index) => ({
        id: `person-${index + 1}`,
        type: 'person' as const,
        label: `Person ${index + 1}`,
        personNumber: index + 1,
        items: [],
    }))

    return [
        ...persons,
        {
            id: 'shared',
            type: 'shared' as const,
            label: 'Shared',
            items: [],
        },
    ]
}

export function buildOrderNumber(tableNumber: string) {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const hh = String(now.getHours()).padStart(2, '0')
    const min = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')

    return `MS-T${tableNumber}-${yyyy}${mm}${dd}-${hh}${min}${ss}`
}

export function roundCurrency(value: number) {
    return Math.round(value * 100) / 100
}

export function calculateTotals(seats: TableOrderSeat[]) {
    const subtotal = seats.reduce((seatSum, seat) => {
        return (
            seatSum +
            seat.items.reduce((itemSum, item) => itemSum + item.unitPrice * item.quantity, 0)
        )
    }, 0)

    const taxes = subtotal * TAX_RATE
    const total = subtotal + taxes
    const totalItems = seats.reduce(
        (sum, seat) => sum + seat.items.reduce((inner, item) => inner + item.quantity, 0),
        0
    )

    return {
        subtotal: roundCurrency(subtotal),
        taxes: roundCurrency(taxes),
        total: roundCurrency(total),
        totalItems,
    }
}

export function buildSeatItem(product: ProductItem): TableOrderSeatItem {
    return {
        productId: product.id,
        productName: product.name,
        category: product.category,
        quantity: 1,
        unitPrice: Number(product.sellingPrice ?? 0),
        imageUrl: product.imageUrls?.[0] ?? null,
        notes: '',
        kitchen: {
            containsCheese: Boolean(product.kitchen?.containsCheese),
            requiresFrying: Boolean(product.kitchen?.requiresFrying),
            preparationTime: Number(product.kitchen?.preparationTime ?? 0),
            displayNameKitchen: product.kitchen?.displayNameKitchen ?? product.name ?? '',
            innerIngredients: product.kitchen?.innerIngredients ?? [],
            protein: product.kitchen?.protein ?? [],
            sauces: product.kitchen?.sauces ?? [],
            finishes: product.kitchen?.finishes ?? [],
            allergens: product.kitchen?.allergens ?? [],
        },
        description:
            typeof product.description === 'string'
                ? product.description
                : product.description?.fr ??
                product.description?.en ??
                product.description?.es ??
                '',
        itemStatus: 'pending',
    }
}

export function createDraftOrder(tableNumber: string, guestCount = 2): Omit<TableOrder, 'id'> {
    const seats = createDefaultSeats(guestCount)
    const totals = calculateTotals(seats)

    return {
        tableNumber,
        guestCount,
        orderNumber: buildOrderNumber(tableNumber),
        cloverRef: null,
        status: 'draft',
        kitchenStatus: 'pending',
        paymentStatus: 'pending',
        paymentMethod: null,
        cloverStatus: 'not_sent',
        seats,
        subtotal: totals.subtotal,
        taxes: totals.taxes,
        total: totals.total,
        totalItems: totals.totalItems,
        kitchenCallCount: 0,
        pickupCallCount: 0,
    }
}

type OrderWithSeatsAndTotals = {
    seats: TableOrderSeat[]
    subtotal: number
    taxes: number
    total: number
    totalItems: number
}

export function recalculateOrder<T extends OrderWithSeatsAndTotals>(order: T): T {
    const totals = calculateTotals(order.seats)

    return {
        ...order,
        subtotal: totals.subtotal,
        taxes: totals.taxes,
        total: totals.total,
        totalItems: totals.totalItems,
    }
}

export function subscribeToActiveProducts(
    callback: (products: ProductItem[]) => void,
    onError?: (error: Error) => void
): Unsubscribe {
    const q = query(
        collection(db, PRODUCTS_COLLECTION),
        where('isActive', '==', true),
        orderBy('category'),
        orderBy('sortOrder')
    )

    return onSnapshot(
        q,
        (snapshot) => {
            const products: ProductItem[] = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...(docSnap.data() as Omit<ProductItem, 'id'>),
            }))
            callback(products)
        },
        (error) => onError?.(error as Error)
    )
}

export function subscribeToOpenTableOrders(
    callback: (orders: TableOrder[]) => void,
    onError?: (error: Error) => void
): Unsubscribe {
    const q = query(
        collection(db, TABLE_ORDERS_COLLECTION),
        where('paymentStatus', '==', 'pending')
    )

    return onSnapshot(
        q,
        (snapshot) => {
            const orders: TableOrder[] = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...(docSnap.data() as Omit<TableOrder, 'id'>),
            }))

            callback(orders)
        },
        (error) => onError?.(error as Error)
    )
}

export function subscribeToKitchenOrders(
    callback: (orders: TableOrder[]) => void,
    onError?: (error: Error) => void
): Unsubscribe {
    const q = query(
        collection(db, TABLE_ORDERS_COLLECTION),
        where('status', 'in', ['sent_to_kitchen', 'preparing', 'ready_for_pickup'])
    )

    return onSnapshot(
        q,
        (snapshot) => {
            const orders: TableOrder[] = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...(docSnap.data() as Omit<TableOrder, 'id'>),
            }))

            callback(orders)
        },
        (error) => onError?.(error as Error)
    )
}

export function subscribeToReadyPickupOrders(
    callback: (orders: TableOrder[]) => void,
    onError?: (error: Error) => void
): Unsubscribe {
    const q = query(
        collection(db, TABLE_ORDERS_COLLECTION),
        where('status', '==', 'ready_for_pickup')
    )

    return onSnapshot(
        q,
        (snapshot) => {
            const orders: TableOrder[] = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...(docSnap.data() as Omit<TableOrder, 'id'>),
            }))

            callback(orders)
        },
        (error) => onError?.(error as Error)
    )
}

export async function createTableOrder(order: Omit<TableOrder, 'id'>) {
    const payload = removeUndefinedDeep({
        ...order,
        kitchenCallCount: (order as any).kitchenCallCount ?? 0,
        pickupCallCount: (order as any).pickupCallCount ?? 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    }) as Record<string, unknown>

    const docRef = await addDoc(collection(db, TABLE_ORDERS_COLLECTION), payload)
    return docRef.id
}

export async function updateTableOrder(orderId: string, partial: Partial<TableOrder>) {
    const ref = doc(db, TABLE_ORDERS_COLLECTION, orderId)

    await updateDoc(
        ref,
        removeUndefinedDeep({
            ...partial,
            updatedAt: serverTimestamp(),
        }) as Record<string, unknown>
    )
}

export async function sendOrderToKitchen(orderId: string) {
    const ref = doc(db, TABLE_ORDERS_COLLECTION, orderId)

    await updateDoc(
        ref,
        removeUndefinedDeep({
            status: 'sent_to_kitchen',
            kitchenStatus: 'pending',
            sentToKitchenAt: serverTimestamp(),
            kitchenStartedAt: null,
            readyForPickupAt: null,
            deliveredAt: null,
            kitchenCallCount: increment(1),
            updatedAt: serverTimestamp(),
        }) as Record<string, unknown>
    )
}

export async function notifyKitchenAgain(orderId: string) {
    const ref = doc(db, TABLE_ORDERS_COLLECTION, orderId)

    await updateDoc(
        ref,
        {
            kitchenCallCount: increment(1),
            updatedAt: serverTimestamp(),
        } as Record<string, unknown>
    )
}

export async function startPreparingOrder(orderId: string) {
    const ref = doc(db, TABLE_ORDERS_COLLECTION, orderId)

    await updateDoc(
        ref,
        removeUndefinedDeep({
            status: 'preparing',
            kitchenStatus: 'preparing',
            kitchenStartedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }) as Record<string, unknown>
    )
}

export async function markOrderReadyForPickup(orderId: string) {
    const ref = doc(db, TABLE_ORDERS_COLLECTION, orderId)

    await updateDoc(
        ref,
        removeUndefinedDeep({
            status: 'ready_for_pickup',
            kitchenStatus: 'ready',
            readyForPickupAt: serverTimestamp(),
            pickupCallCount: increment(1),
            updatedAt: serverTimestamp(),
        }) as Record<string, unknown>
    )
}

export async function notifyPickupAgain(orderId: string) {
    const ref = doc(db, TABLE_ORDERS_COLLECTION, orderId)

    await updateDoc(
        ref,
        {
            status: 'ready_for_pickup',
            kitchenStatus: 'ready',
            pickupCallCount: increment(1),
            updatedAt: serverTimestamp(),
        } as Record<string, unknown>
    )
}

export async function markOrderDelivered(orderId: string) {
    const ref = doc(db, TABLE_ORDERS_COLLECTION, orderId)

    await updateDoc(
        ref,
        removeUndefinedDeep({
            status: 'delivered',
            kitchenStatus: 'delivered',
            deliveredAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }) as Record<string, unknown>
    )
}

export async function markOrderPaid(
    orderId: string,
    paymentMethod: 'cash' | 'card' | 'clover',
    cloverRef?: string | null
) {
    const ref = doc(db, TABLE_ORDERS_COLLECTION, orderId)

    await updateDoc(
        ref,
        removeUndefinedDeep({
            status: 'paid',
            paymentStatus: 'paid',
            paymentMethod,
            cloverRef: cloverRef ?? null,
            cloverStatus: paymentMethod === 'clover' ? 'matched' : 'not_sent',
            paidAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }) as Record<string, unknown>
    )
}

export function subscribeToPaymentOrders(
    callback: (orders: TableOrder[]) => void,
    onError?: (error: Error) => void
): Unsubscribe {
    const q = query(
        collection(db, TABLE_ORDERS_COLLECTION),
        where('status', '==', 'delivered'),
        where('paymentStatus', '==', 'pending')
    )

    return onSnapshot(
        q,
        (snapshot) => {
            const orders: TableOrder[] = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...(docSnap.data() as Omit<TableOrder, 'id'>),
            }))

            callback(orders)
        },
        (error) => onError?.(error as Error)
    )
}

export function subscribeToPaidOrders(
    callback: (orders: TableOrder[]) => void,
    onError?: (error: Error) => void
): Unsubscribe {
    const q = query(
        collection(db, TABLE_ORDERS_COLLECTION),
        where('paymentStatus', '==', 'paid')
    )

    return onSnapshot(
        q,
        (snapshot) => {
            const orders: TableOrder[] = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...(docSnap.data() as Omit<TableOrder, 'id'>),
            }))

            callback(orders)
        },
        (error) => onError?.(error as Error)
    )
}