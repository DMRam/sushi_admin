import { useMemo, useState } from 'react'
import type {
    PurchaseLocale,
    PurchaseRecord,
} from '../../../../pages/admin/tabs/purchases/purchaseTypes'
import {
    formatDate,
    formatMoney,
} from '../../../../pages/admin/tabs/purchases/purchaseLocale'
import { deletePurchase, updatePurchase } from '../../../../pages/admin/tabs/purchases/purchaseFirestore'

interface PurchaseListProps {
    isMobile?: boolean
    locale?: PurchaseLocale
    rows: PurchaseRecord[]
    loading?: boolean
    onSelect?: (purchase: PurchaseRecord) => void
}

type FilterState = {
    source: '' | 'app' | 'n8n' | 'import'
    paymentStatus: '' | 'paid' | 'unpaid'
    supplier: string
    dateRange: '7' | '30' | '90' | 'all'
}

export const PurchaseList = ({
    isMobile = false,
    locale = 'fr-CA',
    rows,
    loading = false,
    onSelect,
}: PurchaseListProps) => {
    const [filter, setFilter] = useState<FilterState>({
        source: '',
        paymentStatus: '',
        supplier: '',
        dateRange: '30',
    })
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null)

    const filteredPurchases = useMemo(() => {
        let filtered = rows

        if (filter.source) {
            filtered = filtered.filter((purchase) => purchase.source === filter.source)
        }

        if (filter.paymentStatus) {
            filtered = filtered.filter(
                (purchase) => (purchase.paymentStatus ?? 'unpaid') === filter.paymentStatus
            )
        }

        if (filter.supplier.trim()) {
            filtered = filtered.filter((purchase) =>
                String(purchase.supplierName ?? '')
                    .toLowerCase()
                    .includes(filter.supplier.toLowerCase())
            )
        }

        if (filter.dateRange !== 'all') {
            const days = parseInt(filter.dateRange, 10)
            const cutoffDate = new Date()
            cutoffDate.setDate(cutoffDate.getDate() - days)

            filtered = filtered.filter((purchase) => {
                const d = new Date(`${purchase.purchaseDate}T00:00:00`)
                return d >= cutoffDate
            })
        }

        return [...filtered].sort(
            (a, b) =>
                new Date(`${b.purchaseDate}T00:00:00`).getTime() -
                new Date(`${a.purchaseDate}T00:00:00`).getTime()
        )
    }, [rows, filter])

    const totalSpent = filteredPurchases.reduce(
        (sum, purchase) => sum + Number(purchase.total ?? 0),
        0
    )

    const uniqueSuppliers = useMemo(() => {
        const suppliers = rows.map((p) => p.supplierName).filter(Boolean)
        return [...new Set(suppliers)].sort()
    }, [rows])

    async function handleTogglePaymentStatus(purchase: PurchaseRecord) {
        const nextStatus = purchase.paymentStatus === 'paid' ? 'unpaid' : 'paid'

        try {
            setUpdatingPaymentId(purchase.id)
            await updatePurchase(purchase.id, {
                paymentStatus: nextStatus,
            })
        } catch (error) {
            console.error('Failed to update payment status', error)
            window.alert('Failed to update payment status.')
        } finally {
            setUpdatingPaymentId(null)
        }
    }

    function getSourceBadge(source: string | undefined) {
        const toneMap: Record<string, string> = {
            app: 'bg-gray-100 text-gray-700',
            n8n: 'bg-blue-100 text-blue-700',
            import: 'bg-purple-100 text-purple-700',
        }

        return {
            label: source || 'app',
            className: toneMap[source || 'app'] ?? 'bg-gray-100 text-gray-700',
        }
    }

    function getPaymentBadge(paymentStatus: string | undefined) {
        if (paymentStatus === 'paid') {
            return {
                label: 'paid',
                className: 'bg-green-100 text-green-700',
            }
        }

        return {
            label: 'unpaid',
            className: 'bg-amber-100 text-amber-700',
        }
    }

    function getItemsSummary(purchase: PurchaseRecord) {
        if (!purchase.items?.length) return 'No items'

        if (purchase.items.length === 1) {
            const item = purchase.items[0]
            return `${item.quantity} ${item.unit || ''} ${item.name}`.trim()
        }

        return `${purchase.items.length} items`
    }

    function getPrimaryCategory(purchase: PurchaseRecord) {
        const first = purchase.items?.[0]
        return first?.category || 'other'
    }

    function getCategoryDisplayName(category: string) {
        const categoryMap: Record<string, string> = {
            packaging: 'Packaging',
            cleaning: 'Cleaning',
            delivery: 'Delivery',
            office: 'Office',
            other: 'Other',
            seafood: 'Seafood',
            vegetables: 'Vegetables',
            fruits: 'Fruits',
            spices: 'Spices',
            dairy: 'Dairy',
            grains: 'Grains',
            ingredient: 'Ingredient',
        }
        return categoryMap[category] || category
    }

    function getCategoryColor(category: string) {
        const colorMap: Record<string, string> = {
            packaging: 'bg-purple-100 text-purple-800',
            cleaning: 'bg-blue-100 text-blue-800',
            delivery: 'bg-green-100 text-green-800',
            office: 'bg-gray-100 text-gray-800',
            other: 'bg-yellow-100 text-yellow-800',
            seafood: 'bg-red-100 text-red-800',
            vegetables: 'bg-green-100 text-green-800',
            fruits: 'bg-orange-100 text-orange-800',
            spices: 'bg-yellow-100 text-yellow-800',
            dairy: 'bg-blue-100 text-blue-800',
            grains: 'bg-amber-100 text-amber-800',
            ingredient: 'bg-gray-100 text-gray-800',
        }
        return colorMap[category] || 'bg-gray-100 text-gray-800'
    }

    async function handleDeletePurchase(purchaseId: string) {
        const confirmed = window.confirm('Delete this purchase?')
        if (!confirmed) return

        try {
            setDeletingId(purchaseId)
            await deletePurchase(purchaseId)
        } catch (error) {
            console.error('Failed to delete purchase', error)
            window.alert('Failed to delete purchase.')
        } finally {
            setDeletingId(null)
        }
    }

    if (loading) {
        return (
            <div className="py-10 text-center text-sm text-gray-500">
                Loading purchases...
            </div>
        )
    }

    return (
        <div className={`space-y-${isMobile ? '4' : '6'}`}>
            <div className={`rounded-lg bg-gray-50 ${isMobile ? 'p-3' : 'p-4'}`}>
                <h3 className={`mb-${isMobile ? '3' : '4'} font-medium text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
                    Filters
                </h3>

                <div className={`grid gap-${isMobile ? '3' : '4'} ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-4'}`}>
                    <div>
                        <label className={`mb-1 block text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}`}>
                            Source
                        </label>
                        <select
                            value={filter.source}
                            onChange={(e) =>
                                setFilter((prev) => ({
                                    ...prev,
                                    source: e.target.value as FilterState['source'],
                                }))
                            }
                            className={`w-full rounded-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 ${isMobile ? 'px-2 py-2 text-sm' : 'px-3 py-2'}`}
                        >
                            <option value="">All sources</option>
                            <option value="app">App</option>
                            <option value="n8n">n8n</option>
                            <option value="import">Import</option>
                        </select>
                    </div>

                    <div>
                        <label className={`mb-1 block text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}`}>
                            Payment
                        </label>
                        <select
                            value={filter.paymentStatus}
                            onChange={(e) =>
                                setFilter((prev) => ({
                                    ...prev,
                                    paymentStatus: e.target.value as FilterState['paymentStatus'],
                                }))
                            }
                            className={`w-full rounded-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 ${isMobile ? 'px-2 py-2 text-sm' : 'px-3 py-2'}`}
                        >
                            <option value="">All</option>
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                        </select>
                    </div>

                    <div>
                        <label className={`mb-1 block text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}`}>
                            Supplier
                        </label>
                        <input
                            type="text"
                            value={filter.supplier}
                            onChange={(e) =>
                                setFilter((prev) => ({
                                    ...prev,
                                    supplier: e.target.value,
                                }))
                            }
                            className={`w-full rounded-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 ${isMobile ? 'px-2 py-2 text-sm' : 'px-3 py-2'}`}
                            placeholder="Filter by supplier..."
                            list="supplier-suggestions"
                        />
                        <datalist id="supplier-suggestions">
                            {uniqueSuppliers.map((supplier) => (
                                <option key={supplier} value={supplier} />
                            ))}
                        </datalist>
                    </div>

                    <div>
                        <label className={`mb-1 block text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}`}>
                            Date range
                        </label>
                        <select
                            value={filter.dateRange}
                            onChange={(e) =>
                                setFilter((prev) => ({
                                    ...prev,
                                    dateRange: e.target.value as FilterState['dateRange'],
                                }))
                            }
                            className={`w-full rounded-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 ${isMobile ? 'px-2 py-2 text-sm' : 'px-3 py-2'}`}
                        >
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 90 days</option>
                            <option value="all">All time</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className={`rounded-sm border bg-white ${isMobile ? 'p-3' : 'p-4'}`}>
                <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'}`}>
                    <div>
                        <span className="text-sm text-gray-600">
                            Showing {filteredPurchases.length} purchases
                        </span>
                    </div>

                    <div className={isMobile ? 'mt-2' : 'text-right'}>
                        <span className="text-sm text-gray-600">Total spent: </span>
                        <span className={`font-bold text-green-600 ${isMobile ? 'text-lg' : 'text-lg'}`}>
                            {formatMoney(totalSpent, locale)}
                        </span>
                    </div>
                </div>
            </div>

            <div className={`space-y-${isMobile ? '3' : '4'}`}>
                {filteredPurchases.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className={`mb-2 text-gray-500 ${isMobile ? 'text-base' : 'text-lg'}`}>
                            No purchases found
                        </div>
                        <div className={`text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            {rows.length === 0
                                ? 'No purchases recorded yet.'
                                : 'No purchases match your current filters.'}
                        </div>
                    </div>
                ) : (
                    filteredPurchases.map((purchase) => {
                        const primaryCategory = getPrimaryCategory(purchase)
                        const categoryDisplayName = getCategoryDisplayName(primaryCategory)
                        const categoryColor = getCategoryColor(primaryCategory)
                        const sourceBadge = getSourceBadge(purchase.source)
                        const paymentBadge = getPaymentBadge(purchase.paymentStatus)
                        // const isDeleting = deletingId === purchase.id

                        return (
                            <div
                                key={purchase.id}
                                className={`rounded-sm border border-gray-200 bg-white transition-shadow hover:shadow-sm ${isMobile ? 'p-3' : 'p-4'}`}
                            >
                                <div className={`${isMobile ? 'flex-col' : 'flex items-start justify-between'}`}>
                                    <div className={isMobile ? '' : 'flex-1'}>
                                        <div className={`mb-2 flex items-center gap-${isMobile ? '2' : '3'} ${isMobile ? 'flex-wrap' : ''}`}>
                                            <div className="flex items-center gap-2">
                                                <span className={isMobile ? 'text-base' : 'text-lg'}>
                                                    {primaryCategory === 'packaging' ||
                                                        primaryCategory === 'cleaning' ||
                                                        primaryCategory === 'delivery' ||
                                                        primaryCategory === 'office'
                                                        ? '📦'
                                                        : '🍣'}
                                                </span>

                                                <h3 className={`font-semibold text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
                                                    {purchase.supplierName}
                                                </h3>
                                            </div>

                                            <div className={`flex gap-1 ${isMobile ? 'mt-1' : ''}`}>
                                                <span className={`rounded-full px-2 py-1 text-xs ${categoryColor}`}>
                                                    {isMobile && categoryDisplayName.length > 12
                                                        ? `${categoryDisplayName.substring(0, 12)}...`
                                                        : categoryDisplayName}
                                                </span>

                                                <span className={`rounded-full px-2 py-1 text-xs ${sourceBadge.className}`}>
                                                    {sourceBadge.label}
                                                </span>

                                                <span className={`rounded-full px-2 py-1 text-xs ${paymentBadge.className}`}>
                                                    {paymentBadge.label}
                                                </span>
                                            </div>
                                        </div>

                                        <div className={`grid gap-${isMobile ? '3' : '4'} ${isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-4'}`}>
                                            <div>
                                                <span className="text-sm text-gray-600">Items:</span>
                                                <div className={`${isMobile ? 'text-sm' : ''} font-medium`}>
                                                    {getItemsSummary(purchase)}
                                                </div>
                                            </div>

                                            <div>
                                                <span className="text-sm text-gray-600">Supplier:</span>
                                                <div className={`${isMobile ? 'text-sm' : ''} font-medium`}>
                                                    {isMobile && purchase.supplierName.length > 20
                                                        ? `${purchase.supplierName.substring(0, 20)}...`
                                                        : purchase.supplierName}
                                                </div>
                                            </div>

                                            <div>
                                                <span className="text-sm text-gray-600">Date:</span>
                                                <div className={`${isMobile ? 'text-sm' : ''} font-medium`}>
                                                    {formatDate(purchase.purchaseDate, locale)}
                                                </div>
                                            </div>

                                            <div>
                                                <span className="text-sm text-gray-600">Invoice:</span>
                                                <div className={`${isMobile ? 'text-sm' : ''} font-medium`}>
                                                    {purchase.invoiceNumber || '—'}
                                                </div>
                                            </div>
                                        </div>

                                        {(purchase.invoiceNumber || purchase.attachmentUrl) && (
                                            <div className={`mt-3 flex flex-wrap gap-2 border-t border-gray-200 pt-3 ${isMobile ? 'mt-2 pt-2' : ''}`}>
                                                {purchase.invoiceNumber ? (
                                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                                                        Invoice #{purchase.invoiceNumber}
                                                    </span>
                                                ) : null}

                                                {purchase.attachmentUrl ? (
                                                    <a
                                                        href={purchase.attachmentUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                                                    >
                                                        View invoice
                                                    </a>
                                                ) : null}
                                            </div>
                                        )}

                                        {purchase.items?.length > 0 && (
                                            <div className={`mt-3 border-t border-gray-200 pt-3 ${isMobile ? 'mt-2 pt-2' : ''}`}>
                                                <div className="space-y-2">
                                                    {purchase.items.map((item, index) => (
                                                        <div
                                                            key={`${purchase.id}-${index}`}
                                                            className="flex items-center justify-between rounded-sm bg-gray-50 px-3 py-2"
                                                        >
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {item.quantity} {item.unit || ''} {item.name}
                                                                </div>
                                                                {item.category ? (
                                                                    <div className="text-xs text-gray-500">{item.category}</div>
                                                                ) : null}
                                                            </div>

                                                            <div className="text-sm font-medium text-gray-700">
                                                                {formatMoney(item.lineTotal, locale)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {purchase.notes && (
                                            <div className={`mt-3 border-t border-gray-200 pt-3 ${isMobile ? 'mt-2 pt-2' : ''}`}>
                                                <div className="text-xs text-gray-600">
                                                    <span className="font-medium">Notes:</span> {purchase.notes}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className={`flex items-center gap-2 ${isMobile ? 'mt-3 justify-between border-t border-gray-100 pt-3' : 'ml-4 flex-col items-end gap-2'}`}>
                                        <div className={isMobile ? 'text-left' : 'text-right'}>
                                            <div className={`font-bold text-green-600 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                                                {formatMoney(purchase.total, locale)}
                                            </div>
                                            <div className="text-xs text-gray-500">Total</div>
                                        </div>

                                        <div className={`flex gap-2 ${isMobile ? 'flex-row' : 'flex-col w-full'}`}>
                                            <button
                                                type="button"
                                                onClick={() => onSelect?.(purchase)}
                                                className={`rounded border border-gray-300 font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm'}`}
                                            >
                                                Map items
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleTogglePaymentStatus(purchase)}
                                                disabled={updatingPaymentId === purchase.id}
                                                className={[
                                                    'rounded border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                                                    isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm',
                                                    purchase.paymentStatus === 'paid'
                                                        ? 'border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800'
                                                        : 'border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800',
                                                ].join(' ')}
                                            >
                                                {updatingPaymentId === purchase.id
                                                    ? 'Updating...'
                                                    : purchase.paymentStatus === 'paid'
                                                        ? 'Mark unpaid'
                                                        : 'Mark paid'}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleDeletePurchase(purchase.id)}
                                                disabled={deletingId === purchase.id}
                                                className={`rounded border border-red-200 font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50 ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm'}`}
                                            >
                                                {deletingId === purchase.id ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}