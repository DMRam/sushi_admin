import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronRight, Eye, EyeOff, ImageOff, Languages, Search, SlidersHorizontal } from 'lucide-react'
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

type ProductListProps = {
    selectedProductId?: string
    onSelectProduct?: (productId: string) => void
}

export const ProductList = ({ selectedProductId, onSelectProduct }: ProductListProps) => {
    const { products } = useProducts()
    const { ingredients } = useIngredients()
    const { userProfile } = useUserProfile()

    // NEW: toolbar state
    const [query, setQuery] = useState('')
    const [category, setCategory] = useState<string>('all')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [sortKey, setSortKey] = useState<SortKey>('name')
    const [sortDir, setSortDir] = useState<SortDir>('asc')
    const [limit, setLimit] = useState(20)

    const getDescriptionText = (description: string | MultilingualDescription | undefined): string => {
        if (!description) return ''
        if (typeof description === 'string') return description
        return description.en || description.es || description.fr || ''
    }

    const isMultilingualDescription = (description: any): description is MultilingualDescription => {
        return description && typeof description === 'object' && ('en' in description || 'es' in description || 'fr' in description)
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
            <div className="sticky top-0 z-10 rounded-2xl border border-[#f0dfd8] bg-white/95 p-3 shadow-sm backdrop-blur">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f45f4f]">Product view</p>
                            <p className="mt-1 text-sm text-slate-700">
                                <span className="font-semibold text-slate-950">{filtered.length}</span> items
                                {category !== 'all' ? <span className="text-slate-400"> · {category}</span> : null}
                            </p>
                            {selectedProductId && (
                                <p className="mt-1 text-xs font-semibold text-[#f45f4f]">
                                    Selected product is loaded in the editor.
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <select
                                className="rounded-xl border border-[#f0dfd8] bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-[#fb6a57] focus:ring-2 focus:ring-[#fb6a57]/20"
                                value={sortKey}
                                onChange={(e) => setSortKey(e.target.value as SortKey)}
                            >
                                <option value="name">Sort: Name</option>
                                <option value="category">Sort: Category</option>
                                {canSeeMoney && <option value="margin">Sort: Margin</option>}
                                {canSeeMoney && <option value="profit">Sort: Profit</option>}
                            </select>

                            <button
                                className="inline-flex items-center gap-2 rounded-xl border border-[#f0dfd8] bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[#fff7f3] hover:text-slate-950"
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
                                        ? 'border-[#fb6a57] bg-[#fff1ed] text-[#c53f34]'
                                        : 'border-[#f0dfd8] bg-white text-slate-600 hover:border-[#fb6a57] hover:bg-[#fff7f3]'
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
                                className="w-full rounded-xl border border-[#f0dfd8] bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#fb6a57] focus:ring-2 focus:ring-[#fb6a57]/20"
                                placeholder="Search name, category, description..."
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value)
                                    setLimit(20)
                                }}
                            />
                        </label>

                        <select
                            className="rounded-xl border border-[#f0dfd8] bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-[#fb6a57] focus:ring-2 focus:ring-[#fb6a57]/20 sm:w-56"
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
                                className="rounded-xl border border-[#f0dfd8] bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[#fff7f3] hover:text-slate-950 sm:w-28"
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

            {filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#f0dfd8] bg-[#fff7f3] px-5 py-12 text-center">
                    <ImageOff className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="mt-3 text-sm font-semibold text-slate-950">No products match this view</p>
                    <p className="mt-1 text-sm text-slate-500">Clear the filters or create a new product.</p>
                </div>
            ) : (
                <>
                    <div className="overflow-hidden rounded-2xl border border-[#f0dfd8] bg-white shadow-sm">
                        <div className="divide-y divide-slate-100">
                            {visible.map((product: any) => {
                                const cost = product.costPrice || 0
                                const profitMargin = product.profitMargin || 0
                                const profit = product.profit || 0
                                const descriptionText = product.descriptionText || ''
                                const localeLabel = isMultilingualDescription(product.description)
                                    ? [product.description.en && 'EN', product.description.fr && 'FR', product.description.es && 'ES'].filter(Boolean).join('/')
                                    : 'Single'
                                const selected = selectedProductId === product.id

                                return (
                                    <button
                                        key={product.id}
                                        type="button"
                                        onClick={() => onSelectProduct?.(product.id)}
                                        className={`group grid w-full grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left transition sm:grid-cols-[82px_minmax(0,1fr)_120px_40px] ${
                                            selected ? 'border-l-4 border-[#fb6a57] bg-[#fff1ed] pl-2 shadow-[inset_0_0_0_1px_rgba(251,106,87,0.18)]' : 'border-l-4 border-transparent bg-white hover:bg-[#fffaf7]'
                                        }`}
                                    >
                                        <div className="flex h-16 w-[72px] shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-100 sm:h-[72px] sm:w-[82px]">
                                            {product.imageUrls?.[0] ? (
                                                <img src={product.imageUrls[0]} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <ImageOff className="h-5 w-5 text-slate-400" />
                                            )}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="truncate text-sm font-semibold text-slate-950 sm:text-base">{product.name}</p>
                                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                                    product.isActive === false
                                                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                                                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                }`}>
                                                    {product.isActive === false ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                    {product.isActive === false ? 'Hidden' : 'Active'}
                                                </span>
                                            </div>
                                            <p className="mt-1 truncate text-xs font-medium text-slate-500">{product.category || 'Uncategorized'}</p>
                                            <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-500">{descriptionText || 'No description available'}</p>
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {!product.hasMedia && (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                                        <AlertTriangle className="h-3 w-3" />
                                                        Image
                                                    </span>
                                                )}
                                                {!product.hasPrice && (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                                        <AlertTriangle className="h-3 w-3" />
                                                        Price
                                                    </span>
                                                )}
                                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                                    product.hasAllLocales ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-amber-200 bg-amber-50 text-amber-700'
                                                }`}>
                                                    <Languages className="h-3 w-3" />
                                                    {localeLabel || 'Missing'}
                                                </span>
                                            </div>
                                        </div>

                                        {canSeeMoney && (
                                            <div className="hidden text-right sm:block">
                                                <p className="text-sm font-semibold text-slate-950">{product.sellingPrice ? `$${product.sellingPrice.toFixed(2)}` : 'No price'}</p>
                                                <p className={`mt-1 text-xs font-semibold ${profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                                    ${profit.toFixed(2)} profit
                                                </p>
                                                <p className={`mt-1 text-xs ${profitMargin >= 0 ? 'text-slate-500' : 'text-red-700'}`}>
                                                    {profitMargin.toFixed(1)}% margin · ${cost.toFixed(2)} cost
                                                </p>
                                            </div>
                                        )}

                                        <ChevronRight className={`h-5 w-5 justify-self-end transition ${selected ? 'text-[#f45f4f]' : 'text-slate-300 group-hover:text-[#f45f4f]'}`} />
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {filtered.length > limit && (
                        <div className="pt-2">
                            <button
                                className="w-full rounded-xl border border-[#f0dfd8] bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-[#fff7f3]"
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
