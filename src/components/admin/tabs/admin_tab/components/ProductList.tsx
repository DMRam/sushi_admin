import { useEffect, useMemo, useState } from 'react'
import type { ProductListProps } from '../types'
import { useDebouncedValue } from '../utils'
import { clamp, getDescription, getDescriptionForTitle, productSearchText, safeLower, truncateText } from '../hooks'


export default function ProductList({
    products,
    onEdit,
    onDelete,
    formatPrice,
    search,
    setSearch,
}: ProductListProps) {
    const debouncedSearch = useDebouncedValue(search, 250)

    const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')
    const [featured, setFeatured] = useState<'all' | 'featured' | 'not_featured'>('all')
    const [category, setCategory] = useState<string>('all')
    const [tag, setTag] = useState<string>('all')

    const [sortKey, setSortKey] = useState<'sortOrder' | 'name' | 'price' | 'updated'>('sortOrder')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)

    const categories = useMemo(() => {
        const s = new Set<string>()
        products.forEach((p: any) => s.add(p.category || 'general'))
        return ['all', ...Array.from(s).sort((a, b) => a.localeCompare(b))]
    }, [products])

    const tags = useMemo(() => {
        const s = new Set<string>()
        products.forEach((p: any) => (p.tags || []).forEach((t: any) => typeof t === 'string' && s.add(t)))
        return ['all', ...Array.from(s).sort((a, b) => a.localeCompare(b))]
    }, [products])

    const filtered = useMemo(() => {
        const q = safeLower(debouncedSearch).trim()

        return products.filter((p: any) => {
            if (status === 'active' && !p.isActive) return false
            if (status === 'inactive' && p.isActive) return false

            if (featured === 'featured' && !p.featured) return false
            if (featured === 'not_featured' && !!p.featured) return false

            if (category !== 'all' && (p.category || 'general') !== category) return false

            if (tag !== 'all') {
                const t = Array.isArray(p.tags) ? p.tags : []
                if (!t.includes(tag)) return false
            }

            if (!q) return true
            return safeLower(productSearchText(p)).includes(q)
        })
    }, [products, debouncedSearch, status, featured, category, tag])

    const sorted = useMemo(() => {
        const copy = [...filtered]

        copy.sort((a: any, b: any) => {
            let v = 0

            if (sortKey === 'sortOrder') {
                v = (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
                if (v === 0) v = String(a.name ?? '').localeCompare(String(b.name ?? ''))
            } else if (sortKey === 'name') {
                v = String(a.name ?? '').localeCompare(String(b.name ?? ''))
            } else if (sortKey === 'price') {
                v = (a.price ?? 0) - (b.price ?? 0)
            } else if (sortKey === 'updated') {
                const ad = a.lastUpdated?.getTime?.() ?? (a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0)
                const bd = b.lastUpdated?.getTime?.() ?? (b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0)
                v = ad - bd
            }

            return sortDir === 'asc' ? v : -v
        })

        return copy
    }, [filtered, sortKey, sortDir])

    const total = sorted.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = clamp(page, 1, totalPages)

    useEffect(() => {
        setPage(1)
    }, [debouncedSearch, status, featured, category, tag, sortKey, sortDir, pageSize])

    const paged = useMemo(() => {
        const start = (safePage - 1) * pageSize
        return sorted.slice(start, start + pageSize)
    }, [sorted, safePage, pageSize])

    const clearFilters = () => {
        setSearch('')
        setStatus('all')
        setFeatured('all')
        setCategory('all')
        setTag('all')
        setSortKey('sortOrder')
        setSortDir('asc')
        setPageSize(25)
        setPage(1)
    }

    const formatMargin = (product: any) => {
        const margin = Number(product.profitMargin)
        if (Number.isFinite(margin) && margin > 0) return `${margin.toFixed(0)}%`

        const price = Number(product.price) || 0
        const cost = Number(product.costPrice) || 0
        if (price <= 0) return '0%'
        return `${(((price - cost) / price) * 100).toFixed(0)}%`
    }

    return (
        <div className="space-y-3">
            <div className="sticky top-[76px] z-10 border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="text-sm font-semibold text-slate-950">
                            Showing <span className="text-[#E62B2B]">{total}</span> of{' '}
                            <span className="text-slate-700">{products.length}</span> products
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-12">
                    <div className="lg:col-span-5">
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Search
                        </label>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name / category / tags / description…"
                            className="w-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                        />
                    </div>

                    <div className="lg:col-span-2">
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Status
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                            className="w-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                        >
                            <option value="all">All status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div className="lg:col-span-2">
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Featured
                        </label>
                        <select
                            value={featured}
                            onChange={(e) => setFeatured(e.target.value as any)}
                            className="w-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                        >
                            <option value="all">All</option>
                            <option value="featured">Featured</option>
                            <option value="not_featured">Not featured</option>
                        </select>
                    </div>

                    <div className="lg:col-span-3">
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Page size
                        </label>
                        <select
                            value={pageSize}
                            onChange={(e) => setPageSize(parseInt(e.target.value) || 25)}
                            className="w-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                        >
                            <option value={10}>10 / page</option>
                            <option value={25}>25 / page</option>
                            <option value={50}>50 / page</option>
                            <option value={100}>100 / page</option>
                        </select>
                    </div>
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                        >
                            {categories.map((c) => (
                                <option key={c} value={c}>
                                    {c === 'all' ? 'All categories' : c}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="lg:col-span-4">
                        <select
                            value={tag}
                            onChange={(e) => setTag(e.target.value)}
                            className="w-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                        >
                            {tags.map((t) => (
                                <option key={t} value={t}>
                                    {t === 'all' ? 'All tags' : t}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="lg:col-span-3">
                        <select
                            value={sortKey}
                            onChange={(e) => setSortKey(e.target.value as any)}
                            className="w-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                        >
                            <option value="sortOrder">Sort order</option>
                            <option value="name">Name</option>
                            <option value="price">Price</option>
                            <option value="updated">Updated</option>
                        </select>
                    </div>

                    <div className="lg:col-span-1">
                        <button
                            type="button"
                            onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                            className="w-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            title="Toggle sort direction"
                        >
                            {sortDir === 'asc' ? 'Asc' : 'Desc'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="sm:hidden space-y-3">
                {paged.map((product: any) => (
                    <div key={product.id} className="border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex min-w-0 flex-1 gap-3">
                                <ProductThumb product={product} />
                                <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-950">
                                    {product.name || 'Unnamed Product'}
                                </div>
                                <div className="truncate text-xs text-slate-500">
                                    {product.category || 'No category'}
                                </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end space-y-1 flex-shrink-0 ml-2">
                                <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold ${product.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                                        }`}
                                >
                                    {product.isActive ? 'Active' : 'Inactive'}
                                </span>

                                {product.featured && (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold bg-amber-50 text-amber-700">
                                        Featured
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="mb-3 text-xs leading-5 text-slate-600 line-clamp-2" title={getDescriptionForTitle(product)}>
                            {truncateText(getDescription(product), 80)}
                        </div>

                        <div className="flex justify-between items-center mb-3">
                            <div className="text-base font-semibold text-slate-950">{formatPrice(product.price)}</div>
                            <div className="text-xs text-slate-500">Cost: {formatPrice(product.costPrice)} · {formatMargin(product)}</div>
                        </div>

                        {product.portionSize && (
                            <div className="text-xs text-gray-500 mb-2 font-light truncate">
                                Portion: {product.portionSize}
                            </div>
                        )}

                        {Array.isArray(product.tags) && product.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                                {product.tags.slice(0, 4).map((t: string) => (
                                    <span key={t} className="border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                                        {t}
                                    </span>
                                ))}
                                {product.tags.length > 4 && (
                                    <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500">
                                        +{product.tags.length - 4}
                                    </span>
                                )}
                            </div>
                        )}

                        <div className="flex space-x-2">
                            <button
                                onClick={() => onEdit(product)}
                                className="flex-1 bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => product.id && onDelete(product.id)}
                                className="flex-1 border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="hidden overflow-hidden border border-slate-200 bg-white shadow-sm sm:block">
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 table-fixed">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[42%]">
                                Product
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[16%]">
                                Category
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[16%]">
                                Pricing
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[14%]">
                                Status
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-[12%]">
                                Actions
                            </th>
                        </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-slate-100">
                        {paged.map((product: any) => (
                            <tr key={product.id} className="hover:bg-slate-50/80">
                                <td className="px-4 py-4 min-w-0 overflow-hidden">
                                    <div className="flex min-w-0 items-start gap-3 overflow-hidden">
                                        <ProductThumb product={product} />
                                        <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-semibold text-slate-950" title={product.name}>
                                            {product.name || 'Unnamed Product'}
                                        </div>

                                        <div className="mt-1 text-xs leading-5 text-slate-500" title={getDescriptionForTitle(product)}>
                                            {truncateText(getDescription(product), 80)}
                                        </div>

                                        {product.portionSize && (
                                            <div className="text-xs text-slate-400 truncate mt-1" title={product.portionSize}>
                                                {product.portionSize}
                                            </div>
                                        )}

                                        {Array.isArray(product.tags) && product.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {product.tags.slice(0, 3).map((t: string) => (
                                                    <span
                                                        key={t}
                                                        className="border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600"
                                                        title={t}
                                                    >
                                                        {t}
                                                    </span>
                                                ))}
                                                {product.tags.length > 3 && (
                                                    <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500">
                                                        +{product.tags.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        </div>
                                    </div>
                                </td>

                                <td className="px-4 py-4">
                                    <div className="truncate text-sm font-medium text-slate-700" title={product.category}>
                                        {product.category || 'No category'}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-400">
                                        Order {product.sortOrder ?? 0}
                                    </div>
                                </td>

                                <td className="px-4 py-4">
                                    <div className="text-sm font-semibold text-slate-950">{formatPrice(product.price)}</div>
                                    <div className="text-xs text-slate-500">Cost {formatPrice(product.costPrice)}</div>
                                    <div className="mt-1 text-xs font-medium text-emerald-700">Margin {formatMargin(product)}</div>
                                </td>

                                <td className="px-4 py-4">
                                    <div className="flex flex-col space-y-1">
                                        <span
                                            className={`inline-flex w-fit px-2 py-1 text-xs font-semibold ${product.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                                                }`}
                                        >
                                            {product.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                        {product.featured && (
                                            <span className="inline-flex w-fit px-2 py-1 text-xs font-semibold bg-amber-50 text-amber-700">
                                                Featured
                                            </span>
                                        )}
                                    </div>
                                </td>

                                <td className="px-4 py-4">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => onEdit(product)}
                                            className="border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => product.id && onDelete(product.id)}
                                            className="border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>

            <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-500">
                    Page {safePage} / {totalPages} · {total} results
                </p>

                <div className="flex gap-2">
                    <button
                        className="border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        disabled={safePage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Prev
                    </button>
                    <button
                        className="border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        disabled={safePage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </button>
                </div>
            </div>

            {products.length === 0 && (
                <div className="border border-dashed border-slate-300 bg-white py-10 text-center">
                    <div className="text-sm text-slate-400">
                        No products found. Add your first product to get started.
                    </div>
                </div>
            )}
        </div>
    )
}

function ProductThumb({ product }: { product: any }) {
    const imageUrl = product.imageUrl || product.imageUrls?.[0]

    if (!imageUrl) {
        return (
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-400">
                IMG
            </div>
        )
    }

    return (
        <img
            src={imageUrl}
            alt={product.name || 'Product image'}
            className="h-14 w-14 flex-shrink-0 border border-slate-200 object-cover"
            loading="lazy"
        />
    )
}
