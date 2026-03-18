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

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 space-y-4">
            <div className="sticky top-[56px] z-10 bg-white border border-gray-200 rounded-xl p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                        <div className="text-sm font-light text-gray-900">
                            Showing <span className="text-gray-700">{total}</span> of{' '}
                            <span className="text-gray-700">{products.length}</span>
                        </div>
                        <div className="text-xs text-gray-500 font-light mt-1">
                            Search + filters + sorting for large catalogs
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm font-light"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-6">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name / category / tags / description…"
                            className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900/10 font-light"
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 font-light"
                        >
                            <option value="all">All status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <select
                            value={featured}
                            onChange={(e) => setFeatured(e.target.value as any)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 font-light"
                        >
                            <option value="all">All</option>
                            <option value="featured">Featured</option>
                            <option value="not_featured">Not featured</option>
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <select
                            value={pageSize}
                            onChange={(e) => setPageSize(parseInt(e.target.value) || 25)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 font-light"
                        >
                            <option value={10}>10 / page</option>
                            <option value={25}>25 / page</option>
                            <option value={50}>50 / page</option>
                            <option value={100}>100 / page</option>
                        </select>
                    </div>
                </div>

                <div className="mt-2 grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-4">
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 font-light"
                        >
                            {categories.map((c) => (
                                <option key={c} value={c}>
                                    {c === 'all' ? 'All categories' : c}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="sm:col-span-4">
                        <select
                            value={tag}
                            onChange={(e) => setTag(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 font-light"
                        >
                            {tags.map((t) => (
                                <option key={t} value={t}>
                                    {t === 'all' ? 'All tags' : t}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="sm:col-span-3">
                        <select
                            value={sortKey}
                            onChange={(e) => setSortKey(e.target.value as any)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 font-light"
                        >
                            <option value="sortOrder">Sort order</option>
                            <option value="name">Name</option>
                            <option value="price">Price</option>
                            <option value="updated">Updated</option>
                        </select>
                    </div>

                    <div className="sm:col-span-1">
                        <button
                            type="button"
                            onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                            className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm font-light"
                            title="Toggle sort direction"
                        >
                            {sortDir === 'asc' ? 'Asc' : 'Desc'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="sm:hidden space-y-3">
                {paged.map((product: any) => (
                    <div key={product.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start mb-3">
                            <div className="min-w-0 flex-1">
                                <div className="font-light text-gray-900 text-sm mb-1 truncate">
                                    {product.name || 'Unnamed Product'}
                                </div>
                                <div className="text-xs text-gray-500 font-light truncate">
                                    {product.category || 'No category'}
                                </div>
                            </div>

                            <div className="flex flex-col items-end space-y-1 flex-shrink-0 ml-2">
                                <span
                                    className={`inline-flex px-2 py-1 text-xs font-light rounded-full ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}
                                >
                                    {product.isActive ? 'Active' : 'Inactive'}
                                </span>

                                {product.featured && (
                                    <span className="inline-flex px-2 py-1 text-xs font-light rounded-full bg-yellow-100 text-yellow-800">
                                        Featured
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="text-xs text-gray-600 mb-2 font-light line-clamp-2" title={getDescriptionForTitle(product)}>
                            {truncateText(getDescription(product), 80)}
                        </div>

                        <div className="flex justify-between items-center mb-3">
                            <div className="text-sm font-light text-green-600">{formatPrice(product.price)}</div>
                            <div className="text-xs text-gray-500 font-light">Cost: {formatPrice(product.costPrice)}</div>
                        </div>

                        {product.portionSize && (
                            <div className="text-xs text-gray-500 mb-2 font-light truncate">
                                Portion: {product.portionSize}
                            </div>
                        )}

                        {Array.isArray(product.tags) && product.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                                {product.tags.slice(0, 4).map((t: string) => (
                                    <span key={t} className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-600">
                                        {t}
                                    </span>
                                ))}
                                {product.tags.length > 4 && (
                                    <span className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-500">
                                        +{product.tags.length - 4}
                                    </span>
                                )}
                            </div>
                        )}

                        <div className="flex space-x-2">
                            <button
                                onClick={() => onEdit(product)}
                                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm font-light hover:bg-blue-700"
                            >
                                EDIT
                            </button>
                            <button
                                onClick={() => product.id && onDelete(product.id)}
                                className="flex-1 bg-red-600 text-white px-3 py-2 rounded text-sm font-light hover:bg-red-700"
                            >
                                DELETE
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider w-2/5">
                                Product
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider w-1/6">
                                Category
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider w-1/6">
                                Price
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider w-1/6">
                                Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider w-1/6">
                                Actions
                            </th>
                        </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-gray-200">
                        {paged.map((product: any) => (
                            <tr key={product.id} className="hover:bg-gray-50">
                                <td className="px-4 py-4 w-2/5 min-w-0 overflow-hidden">
                                    <div className="flex flex-col min-w-0 overflow-hidden">
                                        <div className="text-sm font-light text-gray-900 truncate" title={product.name}>
                                            {product.name || 'Unnamed Product'}
                                        </div>

                                        <div className="text-xs text-gray-500 font-light mt-1" title={getDescriptionForTitle(product)}>
                                            {truncateText(getDescription(product), 80)}
                                        </div>

                                        {product.portionSize && (
                                            <div className="text-xs text-gray-400 font-light truncate mt-1" title={product.portionSize}>
                                                {product.portionSize}
                                            </div>
                                        )}

                                        {Array.isArray(product.tags) && product.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {product.tags.slice(0, 3).map((t: string) => (
                                                    <span
                                                        key={t}
                                                        className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-600"
                                                        title={t}
                                                    >
                                                        {t}
                                                    </span>
                                                ))}
                                                {product.tags.length > 3 && (
                                                    <span className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-500">
                                                        +{product.tags.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </td>

                                <td className="px-4 py-4 w-1/6">
                                    <div className="text-sm text-gray-600 font-light truncate" title={product.category}>
                                        {product.category || 'No category'}
                                    </div>
                                </td>

                                <td className="px-4 py-4 w-1/6">
                                    <div className="text-sm font-light text-green-600">{formatPrice(product.price)}</div>
                                    <div className="text-xs text-gray-500 font-light">Cost: {formatPrice(product.costPrice)}</div>
                                </td>

                                <td className="px-4 py-4 w-1/6">
                                    <div className="flex flex-col space-y-1">
                                        <span
                                            className={`inline-flex px-2 py-1 text-xs font-light rounded-full ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}
                                        >
                                            {product.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                        {product.featured && (
                                            <span className="inline-flex px-2 py-1 text-xs font-light rounded-full bg-yellow-100 text-yellow-800">
                                                Featured
                                            </span>
                                        )}
                                    </div>
                                </td>

                                <td className="px-4 py-4 w-1/6">
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => onEdit(product)}
                                            className="text-blue-600 hover:text-blue-900 font-light text-sm px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => product.id && onDelete(product.id)}
                                            className="text-red-600 hover:text-red-900 font-light text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors"
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

            <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-500 font-light">
                    Page {safePage} / {totalPages} · {total} results
                </p>

                <div className="flex gap-2">
                    <button
                        className="px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm font-light disabled:opacity-50"
                        disabled={safePage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Prev
                    </button>
                    <button
                        className="px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm font-light disabled:opacity-50"
                        disabled={safePage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </button>
                </div>
            </div>

            {products.length === 0 && (
                <div className="text-center py-8">
                    <div className="text-gray-400 text-sm font-light">
                        No products found. Add your first product to get started.
                    </div>
                </div>
            )}
        </div>
    )
}