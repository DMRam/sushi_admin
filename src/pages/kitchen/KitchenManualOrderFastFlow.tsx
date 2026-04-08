import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { extractKitchenDataFromDescription } from '../../utils/kitchenParser'

export type OrderType = 'pickup' | 'delivery' | 'dine_in'
export type PaymentType = 'cash' | 'card' | 'online' | 'clover' | 'uber'

export interface ProductDescription {
    fr?: string
    en?: string
    es?: string
}

export interface KitchenInfo {
    rollType?: string
    outerWrap?: string
    innerIngredients?: string[]
    finishes?: string[]
    sauces?: string[]
    protein?: string[]
    allergens?: string[]
    containsCheese?: boolean
    requiresFrying?: boolean
    displayNameKitchen?: string
    notes?: string

    // backward compatibility
    wrapper?: string
    fillings?: string[]
    toppings?: string[]
    garnish?: string[]
    steps?: string[]
    pieces?: number
}

export type ProductIngredientValue =
    | string
    | {
        name?: string
    }

export interface KitchenProduct {
    id: string
    name: string
    category?: string
    sellingPrice?: number
    imageUrls?: string[]
    isActive?: boolean
    description?: ProductDescription
    ingredients?: ProductIngredientValue[]
    aliases?: string[]
    sortOrder?: number
    kitchen?: KitchenInfo
}

export interface ManualOrderItem {
    productId: string
    name: string
    category?: string
    unitPrice: number
    qty: number
    notes: string
    imageUrl?: string
}

export interface ManualOrderDraft {
    orderType: OrderType
    payment: PaymentType
    customerName: string
    phone: string
    address: string
    specialInstructions: string
    items: ManualOrderItem[]
}

interface Props {
    isOpen: boolean
    products: KitchenProduct[]
    onClose: () => void
    onCreateOrder: (payload: {
        source: 'manual'
        orderType: OrderType
        payment: PaymentType
        customerName: string
        phone: string
        address: string
        specialInstructions: string
        items: ManualOrderItem[]
        subtotal: number
        totalItems: number
        createdAt: string
    }) => Promise<void> | void
}

const INITIAL_ORDER: ManualOrderDraft = {
    orderType: 'pickup',
    payment: 'cash',
    customerName: '',
    phone: '',
    address: 'Pickup',
    specialInstructions: '',
    items: [],
}

const QUICK_CATEGORIES = ['All', 'Makis', 'Hosomakis', 'California', 'Soups', 'Empanadas']

function normalizeText(value?: string) {
    return (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
}

function money(value: number) {
    return `$${Number(value || 0).toFixed(2)}`
}

function formatIngredientLabel(value?: string) {
    if (!value) return ''

    const translations: Record<string, string> = {
        crevette: 'Shrimp',
        crevette_tempura: 'Tempura Shrimp',
        avocat: 'Avocado',
        concombre: 'Cucumber',
        oignon_vert: 'Green Onion',
        fromage_creme: 'Cream Cheese',
        fromage_creme_light: 'Light Cream Cheese',
        saumon: 'Salmon',
        saumon_fume: 'Smoked Salmon',
        ciboulette: 'Chives',
        oignon_frit: 'Crispy Onion',
        kanikama: 'Kanikama',
        poulpe_tempura: 'Tempura Octopus',
        tuna: 'Tuna',
        sesame: 'Sesame',
        poivron_rouge: 'Red Pepper',
        champignon_saute: 'Sautéed Mushroom',
        olives_noires: 'Black Olives',
        tilapia_tempura: 'Tempura Tilapia',
        petoncles: 'Scallops',
        crabe: 'Crab',
        homard: 'Lobster',
        crabe_des_neiges: 'Snow Crab',
        poulet_tempura: 'Tempura Chicken',
        poulet_teriyaki: 'Teriyaki Chicken',
        massago: 'Massago',
        lime_zest: 'Lime Zest',
        teriyaki: 'Teriyaki Sauce',
        philadelphia: 'Philadelphia',
        none: 'No Special Wrap',
    }

    return (
        translations[value] ||
        value
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase())
    )
}

function normalizeIngredientValue(ingredient: ProductIngredientValue): string {
    if (typeof ingredient === 'string') return ingredient
    if (ingredient && typeof ingredient === 'object' && ingredient.name) return ingredient.name
    return ''
}

function normalizeIngredientLabels(ingredients?: ProductIngredientValue[]) {
    if (!Array.isArray(ingredients)) return []

    return ingredients
        .map(normalizeIngredientValue)
        .filter(Boolean)
        .map(formatIngredientLabel)
}

function getKitchenPreviewParts(product: KitchenProduct) {
    const parsed = extractKitchenDataFromDescription({
        name: product.name,
        description: product.description,
        ingredients: normalizeIngredientLabels(product.ingredients),
    })

    const kitchen = product.kitchen || {}

    const wrap = formatIngredientLabel(
        kitchen.outerWrap || kitchen.wrapper || parsed.wrapper || ''
    )

    const inside =
        kitchen.innerIngredients?.length
            ? kitchen.innerIngredients.map(formatIngredientLabel)
            : kitchen.fillings?.length
                ? kitchen.fillings.map(formatIngredientLabel)
                : parsed.fillings || []

    const finishes =
        kitchen.finishes?.length
            ? kitchen.finishes.map(formatIngredientLabel)
            : kitchen.toppings?.length
                ? kitchen.toppings.map(formatIngredientLabel)
                : parsed.toppings || []

    const sauces =
        kitchen.sauces?.length
            ? kitchen.sauces.map(formatIngredientLabel)
            : parsed.sauces || []

    const ingredients =
        normalizeIngredientLabels(product.ingredients)?.length > 0
            ? normalizeIngredientLabels(product.ingredients)
            : [...inside, ...finishes, ...sauces].filter(Boolean)

    return {
        wrap,
        inside,
        finishes,
        sauces,
        ingredients,
        kitchenName: kitchen.displayNameKitchen || product.name || '',
    }
}

function getProductKitchenPreview(product: KitchenProduct) {
    const preview = getKitchenPreviewParts(product)

    return (
        [...preview.ingredients, preview.wrap]
            .filter(Boolean)
            .slice(0, 6)
            .join(' · ') ||
        product.description?.en ||
        product.description?.fr ||
        product.description?.es ||
        'Tap to add'
    )
}

function buildSearchIndex(product: KitchenProduct) {
    const preview = getKitchenPreviewParts(product)

    return normalizeText(
        [
            product.name,
            product.category,
            product.description?.fr,
            product.description?.en,
            product.description?.es,
            ...(product.aliases || []),
            ...preview.ingredients,
            ...preview.inside,
            ...preview.finishes,
            ...preview.sauces,
            preview.wrap,
            preview.kitchenName,
        ]
            .filter(Boolean)
            .join(' ')
    )
}

function getTopProducts(products: KitchenProduct[]) {
    return [...products]
        .filter((p) => p.isActive !== false)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .slice(0, 8)
}

export default function KitchenManualOrderFastFlow({
    isOpen,
    products,
    onClose,
    onCreateOrder,
}: Props) {
    const [draft, setDraft] = useState<ManualOrderDraft>(INITIAL_ORDER)
    const [productSearch, setProductSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('All')
    const [isSaving, setIsSaving] = useState(false)
    const searchRef = useRef<HTMLInputElement | null>(null)
    const mobileScrollRef = useRef<HTMLDivElement | null>(null)
    const desktopProductListRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!isOpen) return

        const previousHtmlOverflow = document.documentElement.style.overflow
        const previousBodyOverflow = document.body.style.overflow

        document.documentElement.style.overflow = 'hidden'
        document.body.style.overflow = 'hidden'

        const timer = window.setTimeout(() => {
            searchRef.current?.focus()
            searchRef.current?.select()
        }, 50)

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                searchRef.current?.focus()
                searchRef.current?.select()
            }

            if (e.key === 'Escape') {
                onClose()
            }
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => {
            window.clearTimeout(timer)
            window.removeEventListener('keydown', handleKeyDown)
            document.documentElement.style.overflow = previousHtmlOverflow
            document.body.style.overflow = previousBodyOverflow
        }
    }, [isOpen, onClose])

    useEffect(() => {
        if (!isOpen) {
            setDraft(INITIAL_ORDER)
            setProductSearch('')
            setSelectedCategory('All')
        }
    }, [isOpen])

    const activeProducts = useMemo(
        () => products.filter((p) => p.isActive !== false),
        [products]
    )

    const categories = useMemo(() => {
        const fromProducts = Array.from(
            new Set(activeProducts.map((p) => p.category).filter(Boolean))
        ) as string[]

        const ordered = QUICK_CATEGORIES.filter(
            (c) => c === 'All' || fromProducts.includes(c)
        )
        const rest = fromProducts
            .filter((c) => !ordered.includes(c))
            .sort((a, b) => a.localeCompare(b))

        return [...ordered, ...rest]
    }, [activeProducts])

    const filteredProducts = useMemo(() => {
        const q = normalizeText(productSearch)

        return activeProducts.filter((product) => {
            const matchesCategory =
                selectedCategory === 'All' || product.category === selectedCategory

            if (!matchesCategory) return false
            if (!q) return true

            return buildSearchIndex(product).includes(q)
        })
    }, [activeProducts, productSearch, selectedCategory])

    const quickAddProducts = useMemo(() => getTopProducts(activeProducts), [activeProducts])

    const subtotal = useMemo(
        () => draft.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0),
        [draft.items]
    )

    const totalItems = useMemo(
        () => draft.items.reduce((sum, item) => sum + item.qty, 0),
        [draft.items]
    )

    const addProduct = (product: KitchenProduct) => {
        setDraft((prev) => {
            const existing = prev.items.find((item) => item.productId === product.id)

            if (existing) {
                return {
                    ...prev,
                    items: prev.items.map((item) =>
                        item.productId === product.id ? { ...item, qty: item.qty + 1 } : item
                    ),
                }
            }

            return {
                ...prev,
                items: [
                    ...prev.items,
                    {
                        productId: product.id,
                        name: product.name || 'Unnamed item',
                        category: product.category || '',
                        unitPrice: Number(product.sellingPrice || 0),
                        qty: 1,
                        notes: '',
                        imageUrl: product.imageUrls?.[0] || '',
                    },
                ],
            }
        })

        setProductSearch('')
        searchRef.current?.focus()

        if (desktopProductListRef.current) {
            desktopProductListRef.current.scrollTop = 0
        }
    }

    const decrementItem = (productId: string) => {
        setDraft((prev) => ({
            ...prev,
            items: prev.items
                .map((item) =>
                    item.productId === productId ? { ...item, qty: item.qty - 1 } : item
                )
                .filter((item) => item.qty > 0),
        }))
    }

    const incrementItem = (productId: string) => {
        setDraft((prev) => ({
            ...prev,
            items: prev.items.map((item) =>
                item.productId === productId ? { ...item, qty: item.qty + 1 } : item
            ),
        }))
    }

    const removeItem = (productId: string) => {
        setDraft((prev) => ({
            ...prev,
            items: prev.items.filter((item) => item.productId !== productId),
        }))
    }

    const updateItemNotes = (productId: string, notes: string) => {
        setDraft((prev) => ({
            ...prev,
            items: prev.items.map((item) =>
                item.productId === productId ? { ...item, notes: notes || '' } : item
            ),
        }))
    }

    const onProductSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            if (filteredProducts.length > 0) addProduct(filteredProducts[0])
        }
    }

    const resetForm = () => {
        setDraft(INITIAL_ORDER)
        setProductSearch('')
        setSelectedCategory('All')
        searchRef.current?.focus()
        mobileScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const submitOrder = async () => {
        if (draft.items.length === 0 || isSaving) return

        const safeItems = draft.items.map((item) => ({
            productId: item.productId || '',
            name: item.name || 'Unnamed item',
            category: item.category || '',
            unitPrice: Number(item.unitPrice || 0),
            qty: Number(item.qty || 1),
            notes: item.notes || '',
            imageUrl: item.imageUrl || '',
        }))

        try {
            setIsSaving(true)

            await onCreateOrder({
                source: 'manual',
                orderType: draft.orderType || 'pickup',
                payment: draft.payment || 'cash',
                customerName: draft.customerName.trim() || 'Walk-in',
                phone: draft.phone.trim() || '',
                address:
                    draft.orderType === 'pickup'
                        ? 'Pickup'
                        : draft.address.trim() || '',
                specialInstructions: draft.specialInstructions.trim() || '',
                items: safeItems,
                subtotal: Number(subtotal || 0),
                totalItems: Number(totalItems || 0),
                createdAt: new Date().toISOString(),
            })

            setDraft(INITIAL_ORDER)
            setProductSearch('')
            setSelectedCategory('All')
            onClose()
        } finally {
            setIsSaving(false)
        }
    }

    if (!isOpen) return null

    return createPortal(
        <>
            <div
                className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-[2px]"
                onClick={onClose}
            />

            <div className="fixed inset-0 z-[9999] lg:p-4">
                {/* MOBILE / TABLET */}
                <div className="flex h-[100dvh] flex-col bg-white lg:hidden">
                    <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                                    New Order
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Fast entry for busy kitchen
                                </p>
                            </div>

                            <button
                                onClick={onClose}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Close modal"
                            >
                                ✕
                            </button>
                        </div>
                    </header>

                    <div
                        ref={mobileScrollRef}
                        className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
                        style={{
                            WebkitOverflowScrolling: 'touch',
                            overscrollBehavior: 'contain',
                        }}
                    >
                        <div className="space-y-4 pb-24">
                            <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                <h3 className="mb-3 text-base font-semibold text-slate-900">
                                    Products
                                </h3>

                                <div className="relative">
                                    <input
                                        ref={searchRef}
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        onKeyDown={onProductSearchKeyDown}
                                        placeholder="Search product"
                                        className="k-input w-full py-3 pl-10 pr-3"
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        🔍
                                    </span>
                                </div>

                                <div className="mt-3 -mx-1 overflow-x-auto">
                                    <div className="flex gap-2 px-1 pb-1">
                                        {categories.map((category) => (
                                            <button
                                                key={category}
                                                onClick={() => setSelectedCategory(category)}
                                                className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition ${selectedCategory === category
                                                        ? 'bg-slate-900 text-white'
                                                        : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
                                                    }`}
                                            >
                                                {category}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {quickAddProducts.length > 0 && (
                                    <div className="mt-3">
                                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Quick Add
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {quickAddProducts.map((product) => (
                                                <button
                                                    key={product.id}
                                                    onClick={() => addProduct(product)}
                                                    className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-800 transition hover:bg-slate-200"
                                                >
                                                    + {product.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-3 space-y-2">
                                    {filteredProducts.map((product) => {
                                        const preview = getKitchenPreviewParts(product)

                                        return (
                                            <button
                                                key={product.id}
                                                onClick={() => addProduct(product)}
                                                className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate text-sm font-semibold text-slate-900">
                                                        {product.name}
                                                    </div>

                                                    <div className="mt-0.5 text-xs text-slate-500">
                                                        {product.category || 'No category'}
                                                    </div>

                                                    <div className="mt-1 line-clamp-2 text-xs text-slate-600">
                                                        {getProductKitchenPreview(product)}
                                                    </div>

                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                        {preview.wrap && (
                                                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
                                                                Wrap: {preview.wrap}
                                                            </span>
                                                        )}
                                                        {product.kitchen?.requiresFrying && (
                                                            <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-medium text-rose-700">
                                                                Fry
                                                            </span>
                                                        )}
                                                        {product.kitchen?.containsCheese && (
                                                            <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700">
                                                                Cheese
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="shrink-0 text-right">
                                                    <div className="text-sm font-bold text-slate-900">
                                                        {money(Number(product.sellingPrice || 0))}
                                                    </div>
                                                    <div className="mt-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
                                                        Add
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                    })}

                                    {filteredProducts.length === 0 && (
                                        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                                            No products found
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Type">
                                    <select
                                        value={draft.orderType}
                                        onChange={(e) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                orderType: e.target.value as OrderType,
                                                address:
                                                    e.target.value === 'pickup'
                                                        ? 'Pickup'
                                                        : prev.address,
                                            }))
                                        }
                                        className="k-input py-3"
                                    >
                                        <option value="pickup">Pickup</option>
                                        <option value="delivery">Delivery</option>
                                        <option value="dine_in">Dine-in</option>
                                    </select>
                                </Field>

                                <Field label="Payment">
                                    <select
                                        value={draft.payment}
                                        onChange={(e) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                payment: e.target.value as PaymentType,
                                            }))
                                        }
                                        className="k-input py-3"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="card">Card</option>
                                        <option value="online">Online</option>
                                        <option value="clover">Clover</option>
                                        <option value="uber">Uber</option>
                                    </select>
                                </Field>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Name">
                                    <input
                                        value={draft.customerName}
                                        onChange={(e) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                customerName: e.target.value,
                                            }))
                                        }
                                        placeholder="Name"
                                        className="k-input py-3"
                                    />
                                </Field>

                                <Field label="Phone">
                                    <input
                                        value={draft.phone}
                                        onChange={(e) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                phone: e.target.value,
                                            }))
                                        }
                                        placeholder="Phone"
                                        className="k-input py-3"
                                    />
                                </Field>
                            </div>

                            {draft.orderType !== 'pickup' && (
                                <Field label="Address">
                                    <input
                                        value={draft.address}
                                        onChange={(e) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                address: e.target.value,
                                            }))
                                        }
                                        placeholder="Delivery address"
                                        className="k-input py-3"
                                    />
                                </Field>
                            )}

                            <Field label="Instructions">
                                <textarea
                                    value={draft.specialInstructions}
                                    onChange={(e) =>
                                        setDraft((prev) => ({
                                            ...prev,
                                            specialInstructions: e.target.value,
                                        }))
                                    }
                                    placeholder="Allergy, no mayo, etc."
                                    className="k-input min-h-[72px] resize-none py-3"
                                />
                            </Field>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <h3 className="text-base font-semibold text-slate-900">
                                        Items ({totalItems})
                                    </h3>
                                </div>

                                {draft.items.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-sm text-slate-500">
                                        No items yet. Tap products above.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {draft.items.map((item) => (
                                            <div
                                                key={item.productId}
                                                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="truncate font-semibold text-slate-900">
                                                            {item.name}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {money(item.unitPrice)} each
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => removeItem(item.productId)}
                                                        className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>

                                                <div className="mt-2 flex items-center justify-between">
                                                    <div className="flex items-center rounded-lg border border-slate-300">
                                                        <button
                                                            onClick={() => decrementItem(item.productId)}
                                                            className="w-10 px-2 py-2 text-lg font-semibold hover:bg-slate-100"
                                                        >
                                                            −
                                                        </button>
                                                        <span className="w-10 border-x border-slate-300 px-2 py-2 text-center text-sm font-semibold">
                                                            {item.qty}
                                                        </span>
                                                        <button
                                                            onClick={() => incrementItem(item.productId)}
                                                            className="w-10 px-2 py-2 text-lg font-semibold hover:bg-slate-100"
                                                        >
                                                            +
                                                        </button>
                                                    </div>

                                                    <div className="text-sm font-semibold text-slate-900">
                                                        {money(item.unitPrice * item.qty)}
                                                    </div>
                                                </div>

                                                <input
                                                    type="text"
                                                    value={item.notes}
                                                    onChange={(e) =>
                                                        updateItemNotes(item.productId, e.target.value)
                                                    }
                                                    placeholder="Item note"
                                                    className="k-input mt-2 min-h-0 py-3 text-sm"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <footer className="sticky bottom-0 z-20 shrink-0 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-8px_20px_rgba(0,0,0,0.06)]">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-xs text-slate-500">Total</div>
                                <div className="text-xl font-bold text-slate-900">
                                    {money(subtotal)}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={resetForm}
                                    className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    Clear
                                </button>

                                <button
                                    onClick={submitOrder}
                                    disabled={draft.items.length === 0 || isSaving}
                                    className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isSaving ? '...' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </footer>
                </div>

                {/* DESKTOP */}
                <div className="hidden h-[95vh] max-h-[95vh] w-full max-w-7xl overflow-hidden rounded-2xl bg-white shadow-2xl lg:mx-auto lg:flex">
                    <section className="flex min-h-0 w-[55%] flex-col border-r border-slate-200">
                        <header className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                                        New Order
                                    </h2>
                                    <p className="text-sm text-slate-500">
                                        Fast entry for busy kitchen
                                    </p>
                                </div>

                                <button
                                    onClick={onClose}
                                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                                    aria-label="Close modal"
                                >
                                    ✕
                                </button>
                            </div>
                        </header>

                        <div
                            className="min-h-0 flex-1 overflow-y-auto px-6 py-4"
                            style={{
                                WebkitOverflowScrolling: 'touch',
                                overscrollBehavior: 'contain',
                            }}
                        >
                            <div className="space-y-4 pb-6">
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Type">
                                        <select
                                            value={draft.orderType}
                                            onChange={(e) =>
                                                setDraft((prev) => ({
                                                    ...prev,
                                                    orderType: e.target.value as OrderType,
                                                    address:
                                                        e.target.value === 'pickup'
                                                            ? 'Pickup'
                                                            : prev.address,
                                                }))
                                            }
                                            className="k-input py-3"
                                        >
                                            <option value="pickup">Pickup</option>
                                            <option value="delivery">Delivery</option>
                                            <option value="dine_in">Dine-in</option>
                                        </select>
                                    </Field>

                                    <Field label="Payment">
                                        <select
                                            value={draft.payment}
                                            onChange={(e) =>
                                                setDraft((prev) => ({
                                                    ...prev,
                                                    payment: e.target.value as PaymentType,
                                                }))
                                            }
                                            className="k-input py-3"
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="card">Card</option>
                                            <option value="online">Online</option>
                                            <option value="clover">Clover</option>
                                            <option value="uber">Uber</option>
                                        </select>
                                    </Field>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Name">
                                        <input
                                            value={draft.customerName}
                                            onChange={(e) =>
                                                setDraft((prev) => ({
                                                    ...prev,
                                                    customerName: e.target.value,
                                                }))
                                            }
                                            placeholder="Name"
                                            className="k-input py-3"
                                        />
                                    </Field>

                                    <Field label="Phone">
                                        <input
                                            value={draft.phone}
                                            onChange={(e) =>
                                                setDraft((prev) => ({
                                                    ...prev,
                                                    phone: e.target.value,
                                                }))
                                            }
                                            placeholder="Phone"
                                            className="k-input py-3"
                                        />
                                    </Field>
                                </div>

                                {draft.orderType !== 'pickup' && (
                                    <Field label="Address">
                                        <input
                                            value={draft.address}
                                            onChange={(e) =>
                                                setDraft((prev) => ({
                                                    ...prev,
                                                    address: e.target.value,
                                                }))
                                            }
                                            placeholder="Delivery address"
                                            className="k-input py-3"
                                        />
                                    </Field>
                                )}

                                <Field label="Instructions">
                                    <textarea
                                        value={draft.specialInstructions}
                                        onChange={(e) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                specialInstructions: e.target.value,
                                            }))
                                        }
                                        placeholder="Allergy, no mayo, etc."
                                        className="k-input min-h-[72px] resize-none py-3"
                                    />
                                </Field>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <div className="mb-2 flex items-center justify-between">
                                        <h3 className="text-base font-semibold text-slate-900">
                                            Items ({totalItems})
                                        </h3>
                                    </div>

                                    {draft.items.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-sm text-slate-500">
                                            No items yet. Search or tap products on the right.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {draft.items.map((item) => (
                                                <div
                                                    key={item.productId}
                                                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="truncate font-semibold text-slate-900">
                                                                {item.name}
                                                            </div>
                                                            <div className="text-xs text-slate-500">
                                                                {money(item.unitPrice)} each
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => removeItem(item.productId)}
                                                            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>

                                                    <div className="mt-2 flex items-center justify-between">
                                                        <div className="flex items-center rounded-lg border border-slate-300">
                                                            <button
                                                                onClick={() => decrementItem(item.productId)}
                                                                className="w-10 px-2 py-2 text-lg font-semibold hover:bg-slate-100"
                                                            >
                                                                −
                                                            </button>
                                                            <span className="w-10 border-x border-slate-300 px-2 py-2 text-center text-sm font-semibold">
                                                                {item.qty}
                                                            </span>
                                                            <button
                                                                onClick={() => incrementItem(item.productId)}
                                                                className="w-10 px-2 py-2 text-lg font-semibold hover:bg-slate-100"
                                                            >
                                                                +
                                                            </button>
                                                        </div>

                                                        <div className="text-sm font-semibold text-slate-900">
                                                            {money(item.unitPrice * item.qty)}
                                                        </div>
                                                    </div>

                                                    <input
                                                        type="text"
                                                        value={item.notes}
                                                        onChange={(e) =>
                                                            updateItemNotes(item.productId, e.target.value)
                                                        }
                                                        placeholder="Item note"
                                                        className="k-input mt-2 min-h-0 py-3 text-sm"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <footer className="shrink-0 border-t border-slate-200 bg-white px-6 py-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs text-slate-500">Total</div>
                                    <div className="text-2xl font-bold text-slate-900">
                                        {money(subtotal)}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={resetForm}
                                        className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        Clear
                                    </button>

                                    <button
                                        onClick={submitOrder}
                                        disabled={draft.items.length === 0 || isSaving}
                                        className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isSaving ? '...' : 'Create'}
                                    </button>
                                </div>
                            </div>
                        </footer>
                    </section>

                    <aside className="flex min-h-0 w-[45%] flex-col bg-slate-50">
                        <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
                            <h3 className="text-xl font-bold text-slate-900">Products</h3>

                            <div className="relative mt-2">
                                <input
                                    ref={searchRef}
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    onKeyDown={onProductSearchKeyDown}
                                    placeholder="Search (press Enter to add first)"
                                    className="k-input w-full py-3 pl-10 pr-3"
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    🔍
                                </span>
                            </div>

                            <div className="mt-3 overflow-x-auto pb-1">
                                <div className="flex gap-1.5">
                                    {categories.map((category) => (
                                        <button
                                            key={category}
                                            onClick={() => setSelectedCategory(category)}
                                            className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition ${selectedCategory === category
                                                    ? 'bg-slate-900 text-white'
                                                    : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
                                                }`}
                                        >
                                            {category}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {quickAddProducts.length > 0 && (
                            <div className="shrink-0 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Quick Add
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {quickAddProducts.map((product) => (
                                        <button
                                            key={product.id}
                                            onClick={() => addProduct(product)}
                                            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-100"
                                        >
                                            + {product.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div
                            ref={desktopProductListRef}
                            className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
                            style={{
                                WebkitOverflowScrolling: 'touch',
                                overscrollBehavior: 'contain',
                            }}
                        >
                            <div className="space-y-2 pb-6">
                                {filteredProducts.map((product) => {
                                    const preview = getKitchenPreviewParts(product)

                                    return (
                                        <button
                                            key={product.id}
                                            onClick={() => addProduct(product)}
                                            className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-base font-semibold text-slate-900">
                                                    {product.name}
                                                </div>

                                                <div className="mt-0.5 text-sm text-slate-500">
                                                    {product.category || 'No category'}
                                                </div>

                                                {preview.kitchenName &&
                                                    preview.kitchenName !== product.name && (
                                                        <div className="mt-1 text-xs font-medium text-slate-700">
                                                            Kitchen: {preview.kitchenName}
                                                        </div>
                                                    )}

                                                <div className="mt-1 line-clamp-2 text-sm text-slate-600">
                                                    {getProductKitchenPreview(product)}
                                                </div>

                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {preview.wrap && (
                                                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
                                                            Wrap: {preview.wrap}
                                                        </span>
                                                    )}
                                                    {product.kitchen?.requiresFrying && (
                                                        <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-medium text-rose-700">
                                                            Fry
                                                        </span>
                                                    )}
                                                    {product.kitchen?.containsCheese && (
                                                        <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700">
                                                            Cheese
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="shrink-0 text-right">
                                                <div className="text-lg font-bold text-slate-900">
                                                    {money(Number(product.sellingPrice || 0))}
                                                </div>
                                                <div className="mt-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                                    Add
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}

                                {filteredProducts.length === 0 && (
                                    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                                        No products found
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            <style>{`
                .k-input {
                    width: 100%;
                    border-radius: 0.75rem;
                    border: 1px solid rgb(203 213 225);
                    background: white;
                    padding: 0.75rem 1rem;
                    color: rgb(15 23 42);
                    outline: none;
                    transition: all 0.15s ease;
                    font-size: 16px;
                    -webkit-appearance: none;
                    appearance: none;
                }

                .k-input:focus {
                    border-color: rgb(15 23 42);
                    box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1);
                }

                .k-input::placeholder {
                    color: rgb(148 163 184);
                }

                button,
                .k-input,
                select,
                textarea {
                    touch-action: manipulation;
                }

                @supports (height: 100dvh) {
                    .mobile-modal-height {
                        height: 100dvh;
                    }
                }

                @media (max-width: 1023px) {
                    button,
                    .k-input,
                    select,
                    textarea {
                        min-height: 44px;
                    }
                }
            `}</style>
        </>,
        document.body
    )
}

function Field({
    label,
    children,
}: {
    label: string
    children: React.ReactNode
}) {
    return (
        <label className="block">
            <div className="mb-1 text-xs font-medium text-slate-600 md:text-sm">{label}</div>
            {children}
        </label>
    )
}