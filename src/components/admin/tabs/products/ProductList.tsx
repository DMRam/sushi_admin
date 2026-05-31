import { useMemo, useState } from 'react'
import { Eye, EyeOff, ImageOff, Languages, Search, SlidersHorizontal, Trash2 } from 'lucide-react'
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
type StatusFilter = 'all' | 'active' | 'hidden' | 'featured' | 'missing'

export const ProductList = () => {
    const { products, removeProduct } = useProducts()
    const { ingredients } = useIngredients()
    const { userProfile } = useUserProfile()

    const [expandedProduct, setExpandedProduct] = useState<string | null>(null)

    // NEW: toolbar state
    const [query, setQuery] = useState('')
    const [category, setCategory] = useState<string>('all')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
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
                hasAllLocales: Boolean(product.description?.en && product.description?.fr && product.description?.es),
                hasMedia: Boolean(product.imageUrls?.length),
                hasPrice: Number(product.sellingPrice || 0) > 0,
            }
        })
    }, [products, ingredients])

    const productSummary = useMemo(() => {
        const active = productsWithRecalculatedCosts.filter(p => p.isActive !== false).length
        const hidden = productsWithRecalculatedCosts.length - active
        const featured = productsWithRecalculatedCosts.filter(p => p.featured).length
        const missing = productsWithRecalculatedCosts.filter(p => !p.hasMedia || !p.hasPrice || !p.hasAllLocales).length

        return { active, hidden, featured, missing }
    }, [productsWithRecalculatedCosts])

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

        if (statusFilter === 'active') {
            list = list.filter(p => p.isActive !== false)
        }

        if (statusFilter === 'hidden') {
            list = list.filter(p => p.isActive === false)
        }

        if (statusFilter === 'featured') {
            list = list.filter(p => p.featured)
        }

        if (statusFilter === 'missing') {
            list = list.filter(p => !p.hasMedia || !p.hasPrice || !p.hasAllLocales)
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
    }, [productsWithRecalculatedCosts, query, category, statusFilter, sortKey, sortDir])

    const visible = filtered.slice(0, limit)

    const canSeeMoney = userProfile?.role !== UserRole.VIEWER
    const statusButtons: Array<{ key: StatusFilter; label: string; count: number }> = [
        { key: 'all', label: 'All', count: productsWithRecalculatedCosts.length },
        { key: 'active', label: 'Active', count: productSummary.active },
        { key: 'hidden', label: 'Hidden', count: productSummary.hidden },
        { key: 'featured', label: 'Featured', count: productSummary.featured },
        { key: 'missing', label: 'Needs work', count: productSummary.missing },
    ]

    return (
        <div className="space-y-3">
            <div className="sticky top-0 z-10 border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Filtered view</p>
                            <p className="mt-1 text-sm text-slate-700">
                                <span className="font-semibold text-slate-950">{filtered.length}</span> items
                                {category !== 'all' ? <span className="text-slate-400"> · {category}</span> : null}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <select
                                className="border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                                value={sortKey}
                                onChange={(e) => setSortKey(e.target.value as SortKey)}
                            >
                                <option value="name">Sort: Name</option>
                                <option value="category">Sort: Category</option>
                                {canSeeMoney && <option value="margin">Sort: Margin</option>}
                                {canSeeMoney && <option value="profit">Sort: Profit</option>}
                            </select>

                            <button
                                className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
                                onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
                                title="Toggle sort direction"
                            >
                                <SlidersHorizontal className="h-4 w-4" />
                                {sortDir === 'asc' ? 'Asc' : 'Desc'}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {statusButtons.map((button) => (
                            <button
                                key={button.key}
                                type="button"
                                onClick={() => {
                                    setStatusFilter(button.key)
                                    setLimit(20)
                                }}
                                className={`border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                                    statusFilter === button.key
                                        ? 'border-slate-950 bg-slate-950 text-white'
                                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400 hover:bg-white'
                                }`}
                            >
                                {button.label} <span className="ml-1 opacity-70">{button.count}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <label className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                className="w-full border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                                placeholder="Search name, category, description..."
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value)
                                    setLimit(20)
                                }}
                            />
                        </label>

                        <select
                            className="border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900 sm:w-56"
                            value={category}
                            onChange={(e) => {
                                setCategory(e.target.value)
                                setLimit(20)
                            }}
                        >
                            {categories.map(c => (
                                <option key={c} value={c}>
                                    {c === 'all' ? 'All categories' : c}
                                </option>
                            ))}
                        </select>

                        {(query || category !== 'all' || statusFilter !== 'all') && (
                            <button
                                className="border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-950 sm:w-28"
                                onClick={() => {
                                    setQuery('')
                                    setCategory('all')
                                    setStatusFilter('all')
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
                <div className="border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-slate-500">
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
                                <div key={product.id} className="border border-slate-200 bg-white shadow-sm">
                                    <div className="p-3 sm:p-4">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-3">
                                                    <h3 className="truncate text-base font-semibold text-slate-950 sm:text-lg">
                                                        {product.name}
                                                    </h3>
                                                    {product.category && (
                                                        <span className="shrink-0 border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
                                                            {product.category}
                                                        </span>
                                                    )}
                                                </div>

                                                {descriptionText && (
                                                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{descriptionText}</p>
                                                )}

                                                <div className="mt-2 flex flex-wrap gap-2 text-xs sm:text-sm">
                                                    <span className={`inline-flex items-center gap-1 border px-2 py-1 font-semibold ${
                                                        product.isActive === false
                                                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                                                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                    }`}>
                                                        {product.isActive === false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                        {product.isActive === false ? 'Hidden' : 'Active'}
                                                    </span>
                                                    {product.featured && (
                                                        <span className="border border-blue-200 bg-blue-50 px-2 py-1 font-semibold text-blue-700">Featured</span>
                                                    )}
                                                    {!product.hasMedia && (
                                                        <span className="inline-flex items-center gap-1 border border-amber-200 bg-amber-50 px-2 py-1 font-semibold text-amber-700">
                                                            <ImageOff className="h-3.5 w-3.5" />
                                                            No image
                                                        </span>
                                                    )}
                                                    {isMultilingualDescription(product.description) && (
                                                        <span className={`inline-flex items-center gap-1 border px-2 py-1 font-semibold ${
                                                            product.hasAllLocales
                                                                ? 'border-slate-200 bg-slate-50 text-slate-600'
                                                                : 'border-amber-200 bg-amber-50 text-amber-700'
                                                        }`}>
                                                            <Languages className="h-3.5 w-3.5" />
                                                            {[product.description.en && 'EN', product.description.fr && 'FR', product.description.es && 'ES'].filter(Boolean).join('/')}
                                                        </span>
                                                    )}
                                                    {product.portionSize && (
                                                        <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600">
                                                            {product.portionSize}
                                                        </span>
                                                    )}
                                                </div>

                                                {canSeeMoney && (
                                                    <div className="mt-3">
                                                        <div className="grid gap-2 text-sm sm:grid-cols-4">
                                                            <span className="border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-700">Cost ${cost.toFixed(2)}</span>

                                                            {product.sellingPrice ? (
                                                                <>
                                                                    <span className="border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-700">Sell ${product.sellingPrice.toFixed(2)}</span>
                                                                    <span className={`border px-2 py-1 font-semibold ${profit >= 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                                                                        Profit ${profit.toFixed(2)}
                                                                    </span>
                                                                    <span className={`border px-2 py-1 font-semibold ${profitMargin >= 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                                                                        Margin {profitMargin.toFixed(1)}%
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="border border-amber-200 bg-amber-50 px-2 py-1 font-semibold text-amber-700">No selling price</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col sm:flex-row gap-2 sm:ml-4 w-full sm:w-auto">
                                                <button
                                                    onClick={() => toggleExpand(product.id)}
                                                    className="inline-flex items-center justify-center gap-2 border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
                                                >
                                                    {expandedProduct === product.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    {expandedProduct === product.id ? 'Hide' : 'Details'}
                                                </button>

                                                {userProfile?.role !== UserRole.VIEWER && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Are you sure you want to delete this product?')) {
                                                                removeProduct(product.id)
                                                            }
                                                        }}
                                                        className="inline-flex items-center justify-center gap-2 border border-red-200 px-3 py-2 text-center text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expanded */}
                                        {expandedProduct === product.id && (
                                            <div className="mt-4 border-t border-slate-200 pt-4">
                                                {/* Description block (keep your existing rendering) */}
                                                {product.description && (
                                                    <div className="mb-6">
                                                        <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-base">Description</h4>
                                                        <div className="border border-slate-200 bg-white p-4">
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
