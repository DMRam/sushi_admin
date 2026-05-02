import {
    addDoc,
    collection,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../../../../firebase/firebase'
import type {
    PurchaseItem,
    PurchaseLocale,
    PurchaseRecord,
    PurchaseSource,
    PurchaseStatus,
} from './purchaseTypes'
import type { IngredientOption } from './purchaseMappingUtils'

const PURCHASES_COLLECTION = 'purchases'
const INGREDIENTS_COLLECTION = 'ingredients'

function roundCurrency(value: number) {
    return Math.round(value * 100) / 100
}

function toNumber(value: unknown, fallback = 0) {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
}

export function calculatePurchaseTotals(items: PurchaseItem[], taxes?: number | null) {
    const subtotal = roundCurrency(
        items.reduce(
            (sum, item) => sum + toNumber(item.lineTotal, item.quantity * item.unitPrice),
            0
        )
    )
    const normalizedTaxes = roundCurrency(toNumber(taxes, 0))
    const total = roundCurrency(subtotal + normalizedTaxes)

    return {
        subtotal,
        taxes: normalizedTaxes,
        total,
    }
}

export function normalizePurchasePayload(input: {
    source?: PurchaseSource
    status?: PurchaseStatus
    locale?: PurchaseLocale
    purchaseDate?: string
    supplierName?: string
    supplierAddress?: string | null
    paymentStatus?: '' | 'paid' | 'unpaid'
    paymentTerms?: string | null
    paymentAccount?: string | null
    invoiceNumber?: string | null
    notes?: string | null
    currency?: string
    taxes?: number | null
    items?: PurchaseItem[]
    attachmentUrl?: string | null
    externalRef?: string | null
}): Omit<PurchaseRecord, 'id' | 'createdAt' | 'updatedAt'> {
    const items: PurchaseItem[] = Array.isArray(input.items)
        ? input.items.map((item, index) => {
            const quantity = toNumber(item.quantity, 0)
            const unitPrice = toNumber(item.unitPrice, 0)
            const lineTotal = roundCurrency(toNumber(item.lineTotal, quantity * unitPrice))

            const normalizedName = String(item.name ?? '').trim()

            return {
                id: item.id ? String(item.id) : `purchase-item-${index + 1}`,
                name: normalizedName,
                rawName: item.rawName ? String(item.rawName).trim() : normalizedName,
                ingredientId: item.ingredientId ? String(item.ingredientId) : null,
                ingredientName: item.ingredientName ? String(item.ingredientName).trim() : null,
                category: item.category ? String(item.category).trim() : null,
                quantity,
                unit: item.unit ? String(item.unit).trim() : null,
                unitPrice,
                lineTotal,
                mappingStatus:
                    item.mappingStatus ?? (item.ingredientId ? 'mapped' : 'pending'),
            }
        })
        : []

    const totals = calculatePurchaseTotals(items, input.taxes)

    return {
        source: input.source ?? 'app',
        status: input.status ?? 'recorded',
        locale: input.locale ?? 'fr-CA',
        purchaseDate: input.purchaseDate ?? new Date().toISOString().slice(0, 10),

        supplierName: String(input.supplierName ?? '').trim(),
        supplierAddress: input.supplierAddress ? String(input.supplierAddress).trim() : null,

        paymentStatus: input.paymentStatus === 'paid' ? 'paid' : 'unpaid',
        paymentTerms: input.paymentTerms ? String(input.paymentTerms).trim() : null,
        paymentAccount: input.paymentAccount ? String(input.paymentAccount).trim() : null,

        invoiceNumber: input.invoiceNumber ? String(input.invoiceNumber).trim() : null,
        notes: input.notes ? String(input.notes).trim() : null,

        currency: 'CAD',
        subtotal: totals.subtotal,
        taxes: totals.taxes,
        total: totals.total,

        items,

        attachmentUrl: input.attachmentUrl ? String(input.attachmentUrl).trim() : null,
        externalRef: input.externalRef ? String(input.externalRef).trim() : null,
    }
}

export async function createPurchase(
    payload: Omit<PurchaseRecord, 'id' | 'createdAt' | 'updatedAt'>
) {
    const docRef = await addDoc(collection(db, PURCHASES_COLLECTION), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })

    return docRef.id
}

export async function updatePurchase(
    purchaseId: string,
    partial: Partial<Omit<PurchaseRecord, 'id'>>
) {
    await updateDoc(doc(db, PURCHASES_COLLECTION, purchaseId), {
        ...partial,
        updatedAt: serverTimestamp(),
    })
}

export async function deletePurchase(purchaseId: string) {
    await deleteDoc(doc(db, PURCHASES_COLLECTION, purchaseId))
}

function getSortValue(row: PurchaseRecord) {
    const createdAtSeconds =
        typeof row.createdAt === 'object' && row.createdAt?.seconds
            ? row.createdAt.seconds
            : 0

    if (createdAtSeconds) return createdAtSeconds * 1000

    const purchaseDateValue = new Date(`${row.purchaseDate}T00:00:00`).getTime()
    return Number.isFinite(purchaseDateValue) ? purchaseDateValue : 0
}

export function subscribeToPurchases(
    callback: (rows: PurchaseRecord[]) => void,
    onError?: (error: Error) => void
): Unsubscribe {
    return onSnapshot(
        collection(db, PURCHASES_COLLECTION),
        (snapshot) => {
            const rows: PurchaseRecord[] = snapshot.docs
                .map((docSnap) => ({
                    id: docSnap.id,
                    ...(docSnap.data() as Omit<PurchaseRecord, 'id'>),
                }))
                .sort((a, b) => getSortValue(b) - getSortValue(a))

            callback(rows)
        },
        (error) => onError?.(error as Error)
    )
}

export async function getIngredientsForMapping(): Promise<IngredientOption[]> {
    const snapshot = await getDocs(collection(db, INGREDIENTS_COLLECTION))

    return snapshot.docs.map((docSnap) => {
        const data = docSnap.data()

        return {
            id: docSnap.id,
            name: String(data.name ?? '').trim(),
            category: data.category ? String(data.category).trim() : '',
            unit: data.unit ? String(data.unit).trim() : 'unit',
            aliases: Array.isArray(data.aliases)
                ? data.aliases.map((alias: unknown) => String(alias).trim()).filter(Boolean)
                : [],
        }
    })
}

export async function updatePurchaseItems(
    purchaseId: string,
    items: PurchaseItem[]
) {
    const mappedCount = items.filter((item) => item.mappingStatus === 'mapped').length
    const pendingCount = items.filter((item) => item.mappingStatus === 'pending').length
    const ignoredCount = items.filter((item) => item.mappingStatus === 'ignored').length

    await updateDoc(doc(db, PURCHASES_COLLECTION, purchaseId), {
        items,
        mappingSummary: {
            mappedCount,
            pendingCount,
            ignoredCount,
            totalItems: items.length,
        },
        updatedAt: serverTimestamp(),
    })
}