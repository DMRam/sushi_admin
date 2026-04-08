import { useMemo, useRef, useState } from 'react'
import type { ProductItem, TableOrderSeatItem } from './serviceTypes'

interface Props {
    products: ProductItem[]
    onAddProduct: (item: TableOrderSeatItem) => void
    onAddProducts?: (items: TableOrderSeatItem[]) => void
    isMobile?: boolean
    onDone?: () => void
}

function normalizeProductName(product: ProductItem): string {
    const name = product.name as unknown
    if (typeof name === 'string') return name
    if (name && typeof name === 'object') {
        const localized = name as { fr?: string; en?: string; es?: string }
        return localized.fr || localized.en || localized.es || 'Product'
    }
    return 'Product'
}

function buildSeatItemFromProduct(product: ProductItem): TableOrderSeatItem {
    return {
        productId: product.id,
        productName: normalizeProductName(product),
        category: product.category || '',
        unitPrice: Number(product.sellingPrice ?? 0),
        quantity: 1,
        notes: '',
        kitchen: product.kitchen,
        imageUrl: product.imageUrls?.[0],
    }
}

export default function ProductPicker({
    products,
    onAddProduct,
    onAddProducts,
    isMobile = false,
    onDone,
}: Props) {
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('All')
    const [queued, setQueued] = useState<Record<string, number>>({})
    const [flashAdded, setFlashAdded] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    const categories = useMemo(() => {
        const distinct = Array.from(
            new Set(products.map((p) => p.category).filter(Boolean) as string[])
        )
        return ['All', ...distinct]
    }, [products])

    const filteredProducts = useMemo(() => {
        const term = search.trim().toLowerCase()

        return products.filter((product) => {
            const name = normalizeProductName(product).toLowerCase()
            const categoryText = (product.category || '').toLowerCase()

            const matchesSearch =
                !term || name.includes(term) || categoryText.includes(term)

            const matchesCategory =
                category === 'All' || product.category === category

            return matchesSearch && matchesCategory && product.isActive !== false
        })
    }, [products, search, category])

    const queuedCount = useMemo(
        () => Object.values(queued).reduce((sum, qty) => sum + qty, 0),
        [queued]
    )

    function increaseQueued(productId: string) {
        setQueued((current) => ({
            ...current,
            [productId]: (current[productId] ?? 0) + 1,
        }))
    }

    function decreaseQueued(productId: string) {
        setQueued((current) => {
            const nextQty = (current[productId] ?? 0) - 1
            if (nextQty <= 0) {
                const copy = { ...current }
                delete copy[productId]
                return copy
            }
            return {
                ...current,
                [productId]: nextQty,
            }
        })
    }

    function clearQueued() {
        setQueued({})
    }

    function handleSingleAdd(product: ProductItem) {
        if (isMobile) {
            increaseQueued(product.id)
            return
        }

        onAddProduct(buildSeatItemFromProduct(product))
    }

    function handleBulkAdd() {
        if (!queuedCount) return

        const items: TableOrderSeatItem[] = Object.entries(queued)
            .map(([productId, quantity]) => {
                const product = products.find((p) => p.id === productId)
                if (!product) return null

                return {
                    ...buildSeatItemFromProduct(product),
                    quantity,
                }
            })
            .filter(Boolean) as TableOrderSeatItem[]

        if (onAddProducts) {
            onAddProducts(items)
        } else {
            items.forEach((item) => onAddProduct(item))
        }

        setFlashAdded(true)
        window.setTimeout(() => setFlashAdded(false), 500)
        clearQueued()
        searchInputRef.current?.blur()
        onDone?.()
    }

    return (
        <div className="flex h-full min-h-0 flex-col bg-white">
            <div className="flex-shrink-0 border-b border-gray-200 bg-white px-4 pt-4 pb-3">
                <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault()
                            searchInputRef.current?.blur()
                            listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                        }
                    }}
                    onBlur={() => {
                        window.requestAnimationFrame(() => {
                            window.scrollTo(0, 0)
                        })
                    }}
                    placeholder="Search menu..."
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[16px] focus:border-gray-400 focus:outline-none"
                />
            </div>

            <div
                className="scrollbar-hide flex-shrink-0 overflow-x-auto overflow-y-hidden border-b border-gray-100 bg-white px-3 py-3"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                <div className="flex gap-2">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setCategory(cat)}
                            className={[
                                'flex-shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-xs transition',
                                category === cat
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-gray-100 text-gray-600 active:bg-gray-200',
                            ].join(' ')}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div
                ref={listRef}
                className={[
                    'flex-1 min-h-0 overflow-y-auto bg-white transition-colors duration-200',
                    flashAdded ? 'bg-green-50/70' : '',
                ].join(' ')}
                style={{
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehavior: 'contain',
                }}
            >
                {filteredProducts.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-gray-400">
                        No items found
                    </div>
                ) : (
                    <div className="px-2 py-2 pb-24">
                        {filteredProducts.map((product) => {
                            const qty = queued[product.id] ?? 0
                            const selected = qty > 0

                            return (
                                <div
                                    key={product.id}
                                    className={[
                                        'mb-1 flex items-center justify-between rounded-2xl px-3 py-3 transition-all',
                                        selected
                                            ? 'bg-gray-50 ring-1 ring-gray-200 shadow-sm'
                                            : 'active:bg-gray-50',
                                    ].join(' ')}
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleSingleAdd(product)}
                                        className="min-w-0 flex-1 text-left"
                                    >
                                        <p className="truncate text-sm font-medium text-gray-900">
                                            {normalizeProductName(product)}
                                        </p>
                                        <p className="mt-0.5 text-xs text-gray-400">
                                            {product.category || 'Menu item'}
                                        </p>
                                    </button>

                                    <div className="ml-3 flex flex-shrink-0 items-center gap-2">
                                        <span className="text-sm text-gray-500">
                                            ${(Number(product.sellingPrice ?? 0)).toFixed(2)}
                                        </span>

                                        {isMobile ? (
                                            qty === 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={() => increaseQueued(product.id)}
                                                    className="rounded-full bg-gray-900 px-3 py-1.5 text-xs text-white shadow-sm"
                                                >
                                                    Add
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-2 rounded-full bg-gray-900 px-2 py-1 text-white shadow-sm">
                                                    <button
                                                        type="button"
                                                        onClick={() => decreaseQueued(product.id)}
                                                        className="h-6 w-6 rounded-full bg-white/10 text-sm"
                                                    >
                                                        −
                                                    </button>
                                                    <span className="min-w-[18px] text-center text-xs font-medium">
                                                        {qty}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => increaseQueued(product.id)}
                                                        className="h-6 w-6 rounded-full bg-white/10 text-sm"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            )
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleSingleAdd(product)}
                                                className="rounded-full bg-gray-900 px-3 py-1.5 text-xs text-white"
                                            >
                                                Add
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {isMobile && (
                <div className="flex-shrink-0 border-t border-gray-200 bg-white/95 p-3 backdrop-blur">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={clearQueued}
                            disabled={!queuedCount}
                            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-600 disabled:opacity-40"
                        >
                            Clear
                        </button>

                        <button
                            type="button"
                            onClick={handleBulkAdd}
                            disabled={!queuedCount}
                            className={[
                                'flex-1 rounded-2xl px-4 py-3 text-sm font-medium text-white transition-all',
                                queuedCount ? 'bg-gray-900 shadow-sm' : 'bg-gray-300',
                            ].join(' ')}
                        >
                            {queuedCount
                                ? `Add ${queuedCount} item${queuedCount > 1 ? 's' : ''}`
                                : 'Select items'}
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    )
}