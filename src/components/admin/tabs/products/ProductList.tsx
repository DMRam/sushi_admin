import { useMemo, useState } from 'react'
import { useProducts } from '../../../../context/ProductsContext'
import { useIngredients } from '../../../../context/IngredientsContext'
import { useUserProfile, UserRole } from '../../../../context/UserProfileContext'
import { productCost, calculateProfitMargin } from '../../../../utils/costCalculations'

interface MultilingualDescription {
    en: string
    es: string
    fr: string
}

type SortKey = 'name' | 'category' | 'margin' | 'profit'
type SortDir = 'asc' | 'desc'

export const ProductList = () => {
    const { products, removeProduct } = useProducts()
    const { ingredients } = useIngredients()
    const { userProfile } = useUserProfile()

    const [expandedProduct, setExpandedProduct] = useState<string | null>(null)

    // NEW: toolbar state
    const [query, setQuery] = useState('')
    const [category, setCategory] = useState<string>('all')
    const [sortKey, setSortKey] = useState<SortKey>('name')
    const [sortDir, setSortDir] = useState<SortDir>('asc')
    const [limit, setLimit] = useState(20)

    const toggleExpand = (productId: string) => {
        setExpandedProduct(expandedProduct === productId ? null : productId)
    }

    const getDescriptionText = (description: string | MultilingualDescription | undefined): string => {
        if (!description) return ''
        if (typeof description === 'string') return description
        return description.en || description.es || description.fr || ''
    }

    const isMultilingualDescription = (description: any): description is MultilingualDescription => {
        return description && typeof description === 'object' && ('en' in description || 'es' in description || 'fr' in description)
    }

    const splitTextIntoParagraphs = (text: string): string[] => {
        if (!text) return []
        return text.split('\n').filter(p => p.trim() !== '')
    }

    // Recalculate cost/margins (same as you did)
    const productsWithRecalculatedCosts = useMemo(() => {
        return products.map(product => {
            const cost = productCost(product, ingredients)
            const profitMargin = product.sellingPrice ? calculateProfitMargin(cost, product.sellingPrice) : 0
            const profit = product.sellingPrice ? product.sellingPrice - cost : 0

            return {
                ...product,
                costPrice: cost,
                profitMargin,
                profit,
                descriptionText: getDescriptionText(product.description),
            }
        })
    }, [products, ingredients])

    // Categories list
    const categories = useMemo(() => {
        const set = new Set<string>()
        for (const p of productsWithRecalculatedCosts) {
            if (p.category) set.add(p.category)
        }
        return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
    }, [productsWithRecalculatedCosts])

    // Filter + search + sort
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()

        let list = productsWithRecalculatedCosts

        if (category !== 'all') {
            list = list.filter(p => (p.category || '').toLowerCase() === category.toLowerCase())
        }

        if (q) {
            list = list.filter(p => {
                const hay = [
                    p.name,
                    p.category,
                    p.descriptionText,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()

                return hay.includes(q)
            })
        }

        list = [...list].sort((a, b) => {
            const dir = sortDir === 'asc' ? 1 : -1

            if (sortKey === 'name') return dir * (a.name || '').localeCompare(b.name || '')
            if (sortKey === 'category') return dir * (a.category || '').localeCompare(b.category || '')
            if (sortKey === 'margin') return dir * ((a.profitMargin || 0) - (b.profitMargin || 0))
            if (sortKey === 'profit') return dir * ((a.profit || 0) - (b.profit || 0))
            return 0
        })

        return list
    }, [productsWithRecalculatedCosts, query, category, sortKey, sortDir])

    const visible = filtered.slice(0, limit)

    const canSeeMoney = userProfile?.role !== UserRole.VIEWER

    return (
        <div className="space-y-3">
            {/* Sticky toolbar */}
            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border border-gray-200 rounded-lg p-3">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                        <div className="text-sm text-gray-700">
                            <span className="font-medium">{filtered.length}</span> items
                            {category !== 'all' ? <span className="text-gray-400"> • </span> : null}
                            {category !== 'all' ? <span className="text-gray-600">{category}</span> : null}
                        </div>

                        <div className="flex gap-2">
                            <select
                                className="text-sm border border-gray-200 rounded-md px-2 py-2 bg-white"
                                value={sortKey}
                                onChange={(e) => setSortKey(e.target.value as SortKey)}
                            >
                                <option value="name">Sort: Name</option>
                                <option value="category">Sort: Category</option>
                                {canSeeMoney && <option value="margin">Sort: Margin</option>}
                                {canSeeMoney && <option value="profit">Sort: Profit</option>}
                            </select>

                            <button
                                className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white hover:bg-gray-50"
                                onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
                                title="Toggle sort direction"
                            >
                                {sortDir === 'asc' ? '↑' : '↓'}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            className="w-full text-sm border border-gray-200 rounded-md px-3 py-2"
                            placeholder="Search name, category, description..."
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value)
                                setLimit(20) // reset paging on new search
                            }}
                        />

                        <select
                            className="text-sm border border-gray-200 rounded-md px-2 py-2 bg-white sm:w-56"
                            value={category}
                            onChange={(e) => {
                                setCategory(e.target.value)
                                setLimit(20) // reset paging on filter change
                            }}
                        >
                            {categories.map(c => (
                                <option key={c} value={c}>
                                    {c === 'all' ? 'All categories' : c}
                                </option>
                            ))}
                        </select>

                        {(query || category !== 'all') && (
                            <button
                                className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white hover:bg-gray-50 sm:w-28"
                                onClick={() => {
                                    setQuery('')
                                    setCategory('all')
                                    setLimit(20)
                                }}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Empty */}
            {filtered.length === 0 ? (
                <div className="text-center text-gray-500 py-10">
                    No products match your filters.
                </div>
            ) : (
                <>
                    {/* List */}
                    <div className="space-y-3">
                        {visible.map((product: any) => {
                            const cost = product.costPrice || 0
                            const profitMargin = product.profitMargin || 0
                            const profit = product.profit || 0
                            const descriptionText = product.descriptionText || ''

                            return (
                                <div key={product.id} className="border border-gray-200 rounded-lg bg-white shadow-sm">
                                    <div className="p-3 sm:p-4">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-3">
                                                    <h3 className="font-semibold text-base sm:text-lg text-gray-900 truncate">
                                                        {product.name}
                                                    </h3>
                                                    {product.category && (
                                                        <span className="shrink-0 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                            {product.category}
                                                        </span>
                                                    )}
                                                </div>

                                                {descriptionText && (
                                                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">{descriptionText}</p>
                                                )}

                                                {isMultilingualDescription(product.description) && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {product.description.en && <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">EN</span>}
                                                        {product.description.es && <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">ES</span>}
                                                        {product.description.fr && <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">FR</span>}
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap gap-2 mt-2 text-xs sm:text-sm">
                                                    {product.portionSize && (
                                                        <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                            {product.portionSize}
                                                        </span>
                                                    )}
                                                </div>

                                                {canSeeMoney && (
                                                    <div className="mt-3">
                                                        <div className="flex flex-wrap items-center gap-3 text-sm">
                                                            <span className="font-medium text-gray-900">Cost: ${cost.toFixed(2)}</span>

                                                            {product.sellingPrice ? (
                                                                <>
                                                                    <span className="text-gray-400">•</span>
                                                                    <span className="font-medium text-gray-900">Selling: ${product.sellingPrice.toFixed(2)}</span>
                                                                    <span className="text-gray-400">•</span>
                                                                    <span className={`font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                        Profit: ${profit.toFixed(2)}
                                                                    </span>
                                                                    <span className="text-gray-400">•</span>
                                                                    <span className={`font-medium ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                        Margin: {profitMargin.toFixed(1)}%
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="text-gray-500">(no selling price)</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col sm:flex-row gap-2 sm:ml-4 w-full sm:w-auto">
                                                <button
                                                    onClick={() => toggleExpand(product.id)}
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-2 border border-blue-200 rounded hover:bg-blue-50 transition-colors text-center"
                                                >
                                                    {expandedProduct === product.id ? 'Hide' : 'Show'} Details
                                                </button>

                                                {userProfile?.role !== UserRole.VIEWER && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Are you sure you want to delete this product?')) {
                                                                removeProduct(product.id)
                                                            }
                                                        }}
                                                        className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-2 border border-red-200 rounded hover:bg-red-50 transition-colors text-center"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expanded */}
                                        {expandedProduct === product.id && (
                                            <div className="mt-4 pt-4 border-t border-gray-200">
                                                {/* Description block (keep your existing rendering) */}
                                                {product.description && (
                                                    <div className="mb-6">
                                                        <h4 className="font-medium text-gray-900 text-sm sm:text-base mb-3">DESCRIPTION</h4>
                                                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                                                            {typeof product.description === 'string' ? (
                                                                <div className="prose prose-sm max-w-none text-gray-700">
                                                                    {splitTextIntoParagraphs(product.description).map((p: string, idx: number) => (
                                                                        <p key={idx} className="mb-3 last:mb-0">{p}</p>
                                                                    ))}
                                                                </div>
                                                            ) : isMultilingualDescription(product.description) ? (
                                                                <div className="space-y-4">
                                                                    {product.description.en && (
                                                                        <div>
                                                                            <div className="mb-2">
                                                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">English</span>
                                                                            </div>
                                                                            <div className="prose prose-sm max-w-none text-gray-700 bg-blue-50 p-3 rounded">
                                                                                {splitTextIntoParagraphs(product.description.en).map((p: string, idx: number) => (
                                                                                    <p key={idx} className="mb-2 last:mb-0">{p}</p>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {product.description.es && (
                                                                        <div>
                                                                            <div className="mb-2">
                                                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">Spanish</span>
                                                                            </div>
                                                                            <div className="prose prose-sm max-w-none text-gray-700 bg-green-50 p-3 rounded">
                                                                                {splitTextIntoParagraphs(product.description.es).map((p: string, idx: number) => (
                                                                                    <p key={idx} className="mb-2 last:mb-0">{p}</p>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {product.description.fr && (
                                                                        <div>
                                                                            <div className="mb-2">
                                                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">French</span>
                                                                            </div>
                                                                            <div className="prose prose-sm max-w-none text-gray-700 bg-purple-50 p-3 rounded">
                                                                                {splitTextIntoParagraphs(product.description.fr).map((p: string, idx: number) => (
                                                                                    <p key={idx} className="mb-2 last:mb-0">{p}</p>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="text-center py-4 text-gray-500 text-sm">No description available</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Keep your Ingredients section below as-is (you can paste it back under here) */}
                                                {/* ... */}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Load more */}
                    {filtered.length > limit && (
                        <div className="pt-2">
                            <button
                                className="w-full border border-gray-200 rounded-lg py-3 text-sm text-gray-700 bg-white hover:bg-gray-50"
                                onClick={() => setLimit(l => l + 30)}
                            >
                                Load more ({filtered.length - limit} remaining)
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
