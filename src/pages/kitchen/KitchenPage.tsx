import { useEffect, useMemo, useState } from 'react'
import {
    addDoc,
    collection,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import KitchenManualOrderFastFlow from './KitchenManualOrderFastFlow'
import { extractKitchenDataFromDescription } from '../../utils/kitchenParser'

export type OrderType = 'pickup' | 'delivery' | 'dine_in'
export type PaymentType = 'cash' | 'card' | 'online' | 'clover' | 'uber'

export interface ProductDescription {
    fr?: string
    en?: string
    es?: string
}

export interface LegacyKitchenInfo {
    wrapper?: string
    fillings?: string[]
    toppings?: string[]
    sauces?: string[]
    garnish?: string[]
    steps?: string[]
    notes?: string
    pieces?: number
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
    preparationTime?: number
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

interface KitchenOrder {
    id: string
    source?: 'manual' | 'uber' | 'clover'
    status?: 'new' | 'preparing' | 'ready' | 'completed'
    orderType?: OrderType
    payment?: PaymentType
    customerName?: string
    phone?: string
    address?: string
    specialInstructions?: string
    subtotal?: number
    totalItems?: number
    createdAt?: any
    updatedAt?: any
    items?: ManualOrderItem[]
}

interface KitchenSpec {
    wrap: string
    inside: string[]
    finishes: string[]
    sauces: string[]
    notes: string
    displayNameKitchen: string
    containsCheese: boolean
    requiresFrying: boolean
}

function money(value: number) {
    return `$${Number(value || 0).toFixed(2)}`
}

function formatCreatedAt(value: any) {
    if (!value) return '—'

    try {
        const date =
            typeof value?.toDate === 'function'
                ? value.toDate()
                : value instanceof Date
                    ? value
                    : new Date(value)

        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        })
    } catch {
        return '—'
    }
}

function formatIngredientLabel(value?: string) {
    if (!value) return '—'

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
        philadelphia: 'Philadelphia',
        saumon_wrap: 'Salmon',
        avocat_wrap: 'Avocado',
        ciboulette_wrap: 'Chives',
        massago_wrap: 'Massago',
        sesame_wrap: 'Sesame',
        tuna_wrap: 'Tuna',
        none: 'No Special Wrap',
        teriyaki: 'Teriyaki Sauce',
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

function getKitchenSpec(product?: KitchenProduct): KitchenSpec {
    if (!product) {
        return {
            wrap: '',
            inside: [],
            finishes: [],
            sauces: [],
            notes: '',
            displayNameKitchen: '',
            containsCheese: false,
            requiresFrying: false,
        }
    }

    const parsed = extractKitchenDataFromDescription({
        name: product.name,
        description: product.description,
        ingredients: normalizeIngredientLabels(product.ingredients),
    })

    const kitchen = product.kitchen || {}

    const wrap =
        kitchen.outerWrap ||
        kitchen.wrapper ||
        parsed.wrapper ||
        ''

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

    return {
        wrap: formatIngredientLabel(wrap),
        inside,
        finishes,
        sauces,
        notes: kitchen.notes || parsed.notes || '',
        displayNameKitchen: kitchen.displayNameKitchen || product.name || '',
        containsCheese: Boolean(kitchen.containsCheese),
        requiresFrying: Boolean(kitchen.requiresFrying),
    }
}

function mapProductDoc(raw: any): KitchenProduct {
    return {
        id: raw.id,
        name: raw.name || 'Unnamed product',
        category: raw.category || '',
        sellingPrice: Number(raw.sellingPrice || 0),
        imageUrls: Array.isArray(raw.imageUrls) ? raw.imageUrls : [],
        isActive: raw.isActive !== false,
        description: raw.description || {},
        ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
        aliases: Array.isArray(raw.aliases) ? raw.aliases : [],
        sortOrder: Number(raw.sortOrder || 0),
        preparationTime: Number(raw.preparationTime || 0),
        kitchen: raw.kitchen || {},
    }
}

export default function KitchenPage() {
    const [products, setProducts] = useState<KitchenProduct[]>([])
    const [orders, setOrders] = useState<KitchenOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [isManualOrderOpen, setIsManualOrderOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'new' | 'preparing' | 'ready' | 'completed' | 'all'>('new')
    const [debugInfo, setDebugInfo] = useState('')

    useEffect(() => {
        void loadData()
    }, [])

    async function loadProductsFromKnownCollections() {
        const attempts = ['web-products', 'products', 'webProducts']
        const logs: string[] = []

        for (const collectionName of attempts) {
            try {
                const snap = await getDocs(collection(db, collectionName))
                logs.push(`${collectionName}: ${snap.size} docs`)

                if (!snap.empty) {
                    const mapped = snap.docs.map((item) =>
                        mapProductDoc({
                            id: item.id,
                            ...item.data(),
                        })
                    )

                    return {
                        products: mapped,
                        logs,
                        source: collectionName,
                    }
                }
            } catch (error: any) {
                logs.push(`${collectionName}: ERROR ${error?.message || 'unknown error'}`)
            }
        }

        return {
            products: [] as KitchenProduct[],
            logs,
            source: '',
        }
    }

    async function loadOrdersSafe() {
        try {
            const ordersSnap = await getDocs(
                query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
            )

            return ordersSnap.docs.map((item) => ({
                id: item.id,
                ...item.data(),
            })) as KitchenOrder[]
        } catch {
            const ordersSnap = await getDocs(collection(db, 'orders'))
            return ordersSnap.docs.map((item) => ({
                id: item.id,
                ...item.data(),
            })) as KitchenOrder[]
        }
    }

    async function loadData() {
        try {
            setLoading(true)

            const [{ products: loadedProducts, logs, source }, loadedOrders] =
                await Promise.all([loadProductsFromKnownCollections(), loadOrdersSafe()])

            const sortedProducts = [...loadedProducts].sort((a, b) => {
                const byCategory = (a.category || '').localeCompare(b.category || '')
                if (byCategory !== 0) return byCategory
                return (a.sortOrder || 0) - (b.sortOrder || 0)
            })

            setProducts(sortedProducts)
            setOrders(loadedOrders)
            setDebugInfo(`Products source: ${source || 'none'} | ${logs.join(' | ')}`)
        } catch (error) {
            console.error('Kitchen loadData error:', error)
            setDebugInfo(`Load error: ${(error as Error)?.message || 'unknown error'}`)
        } finally {
            setLoading(false)
        }
    }

    async function handleCreateOrder(payload: {
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
    }) {
        const cleanedItems = payload.items.map((item) => ({
            productId: item.productId || '',
            name: item.name || 'Unnamed item',
            category: item.category || '',
            unitPrice: Number(item.unitPrice || 0),
            qty: Number(item.qty || 1),
            notes: item.notes || '',
            imageUrl: item.imageUrl || '',
        }))

        const safeOrder = {
            source: payload.source,
            status: 'new' as const,
            orderType: payload.orderType || 'pickup',
            payment: payload.payment || 'cash',
            customerName: payload.customerName || 'Walk-in',
            phone: payload.phone || '',
            address: payload.address || '',
            specialInstructions: payload.specialInstructions || '',
            items: cleanedItems,
            subtotal: Number(payload.subtotal || 0),
            totalItems: Number(payload.totalItems || 0),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }

        console.log('Saving order:', safeOrder)

        await addDoc(collection(db, 'orders'), safeOrder)
        await loadData()
    }

    async function updateOrderStatus(
        orderId: string,
        nextStatus: 'new' | 'preparing' | 'ready' | 'completed'
    ) {
        await updateDoc(doc(db, 'orders', orderId), {
            status: nextStatus,
            updatedAt: serverTimestamp(),
        })

        await loadData()
    }

    const productMap = useMemo(() => {
        return new Map(products.map((product) => [product.id, product]))
    }, [products])

    const newOrders = orders.filter((order) => (order.status || 'new') === 'new')
    const preparingOrders = orders.filter((order) => order.status === 'preparing')
    const readyOrders = orders.filter((order) => order.status === 'ready')
    const completedOrders = orders.filter((order) => order.status === 'completed')

    const visibleOrders = (() => {
        switch (activeTab) {
            case 'new':
                return newOrders
            case 'preparing':
                return preparingOrders
            case 'ready':
                return readyOrders
            case 'completed':
                return completedOrders
            default:
                return orders
        }
    })()

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900">Kitchen Management</h1>
                    <p className="mt-2 text-lg text-slate-500">
                        Fast manual orders plus a clear kitchen queue.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => void loadData()}
                        className="rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Refresh Orders
                    </button>

                    <button
                        onClick={() => setIsManualOrderOpen(true)}
                        className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
                    >
                        + New Manual Order
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <span className="font-semibold">Debug:</span> {debugInfo || 'Loading debug info...'}
            </div>

            <div className="grid gap-4 md:grid-cols-5">
                <StatCard label="Products Loaded" value={products.length} />
                <StatCard label="In Queue" value={newOrders.length} />
                <StatCard label="Preparing" value={preparingOrders.length} />
                <StatCard label="Ready" value={readyOrders.length} />
                <StatCard label="Completed" value={completedOrders.length} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap gap-2">
                    <TabButton label={`Queue (${newOrders.length})`} active={activeTab === 'new'} onClick={() => setActiveTab('new')} />
                    <TabButton label={`Preparing (${preparingOrders.length})`} active={activeTab === 'preparing'} onClick={() => setActiveTab('preparing')} />
                    <TabButton label={`Ready (${readyOrders.length})`} active={activeTab === 'ready'} onClick={() => setActiveTab('ready')} />
                    <TabButton label={`Completed (${completedOrders.length})`} active={activeTab === 'completed'} onClick={() => setActiveTab('completed')} />
                    <TabButton label={`All (${orders.length})`} active={activeTab === 'all'} onClick={() => setActiveTab('all')} />
                </div>
            </div>

            {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
                    Loading kitchen data...
                </div>
            ) : visibleOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
                    No orders in this section.
                </div>
            ) : (
                <div className="space-y-6">
                    {visibleOrders.map((order) => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            productMap={productMap}
                            onMoveToPreparing={() => void updateOrderStatus(order.id, 'preparing')}
                            onMoveToReady={() => void updateOrderStatus(order.id, 'ready')}
                            onMoveToCompleted={() => void updateOrderStatus(order.id, 'completed')}
                            onMoveToQueue={() => void updateOrderStatus(order.id, 'new')}
                        />
                    ))}
                </div>
            )}

            <KitchenManualOrderFastFlow
                isOpen={isManualOrderOpen}
                products={products}
                onClose={() => setIsManualOrderOpen(false)}
                onCreateOrder={handleCreateOrder}
            />
        </div>
    )
}

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm text-slate-500">{label}</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
        </div>
    )
}

function TabButton({
    label,
    active,
    onClick,
}: {
    label: string
    active: boolean
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${active
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
        >
            {label}
        </button>
    )
}

function OrderCard({
    order,
    productMap,
    onMoveToPreparing,
    onMoveToReady,
    onMoveToCompleted,
    onMoveToQueue,
}: {
    order: KitchenOrder
    productMap: Map<string, KitchenProduct>
    onMoveToPreparing: () => void
    onMoveToReady: () => void
    onMoveToCompleted: () => void
    onMoveToQueue: () => void
}) {
    const status = order.status || 'new'

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Order #{order.id.slice(-6)}</h2>

                    <div className="mt-3 grid gap-1 text-sm text-slate-600">
                        <div><span className="font-semibold">Customer:</span> {order.customerName || 'Walk-in'}</div>
                        <div><span className="font-semibold">Type:</span> {order.orderType || 'pickup'}</div>
                        <div><span className="font-semibold">Source:</span> {order.source || 'manual'}</div>
                        <div><span className="font-semibold">Payment:</span> {order.payment || 'cash'}</div>
                        <div><span className="font-semibold">Order Time:</span> {formatCreatedAt(order.createdAt)}</div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                        {status.toUpperCase()}
                    </div>

                    {status === 'new' && (
                        <button onClick={onMoveToPreparing} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                            Start Preparing
                        </button>
                    )}

                    {status === 'preparing' && (
                        <>
                            <button onClick={onMoveToQueue} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                Back to Queue
                            </button>
                            <button onClick={onMoveToReady} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                                Mark Ready
                            </button>
                        </>
                    )}

                    {status === 'ready' && (
                        <>
                            <button onClick={onMoveToPreparing} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                Back to Preparing
                            </button>
                            <button onClick={onMoveToCompleted} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                                Complete
                            </button>
                        </>
                    )}

                    {status === 'completed' && (
                        <button onClick={onMoveToReady} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            Back to Ready
                        </button>
                    )}
                </div>
            </div>

            {order.specialInstructions && (
                <div className="mb-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                    <span className="font-semibold">Special instructions:</span> {order.specialInstructions}
                </div>
            )}

            <div className="space-y-4">
                {order.items?.map((item, index) => {
                    const product = productMap.get(item.productId)

                    return (
                        <div key={`${item.productId}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 flex-1">
                                    <div className="text-xl font-semibold text-slate-900">
                                        {item.qty}x {item.name}
                                    </div>

                                    <div className="mt-1 text-sm text-slate-500">
                                        {item.category || product?.category || 'No category'}
                                    </div>

                                    <KitchenSpecCard product={product} />

                                    {item.notes && (
                                        <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-700">
                                            <span className="font-semibold">Item note:</span> {item.notes}
                                        </div>
                                    )}
                                </div>

                                <div className="text-right">
                                    <div className="text-sm text-slate-500">Price</div>
                                    <div className="text-2xl font-bold text-slate-900">
                                        {money(item.unitPrice * item.qty)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="mt-5 flex justify-end">
                <div className="rounded-2xl bg-slate-900 px-4 py-3 text-right text-white">
                    <div className="text-xs uppercase tracking-wide text-slate-300">Subtotal</div>
                    <div className="text-2xl font-bold">{money(order.subtotal || 0)}</div>
                </div>
            </div>
        </div>
    )
}

function KitchenSpecCard({ product }: { product?: KitchenProduct }) {
    const spec = getKitchenSpec(product)

    return (
        <div className="mt-3 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-white p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Wrap
                </div>
                <div className="mt-2 text-base font-bold text-slate-900">
                    {spec.wrap || '—'}
                </div>
            </div>

            <div className="rounded-xl bg-white p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Inside
                </div>
                <div className="mt-2 text-sm text-slate-800">
                    {spec.inside.length > 0 ? spec.inside.join(' · ') : '—'}
                </div>
            </div>

            <div className="rounded-xl bg-white p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Finish
                </div>
                <div className="mt-2 text-sm text-slate-800">
                    {spec.finishes.length > 0 ? spec.finishes.join(' · ') : '—'}
                </div>
            </div>

            <div className="rounded-xl bg-white p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sauce
                </div>
                <div className="mt-2 text-sm text-slate-800">
                    {spec.sauces.length > 0 ? spec.sauces.join(' · ') : '—'}
                </div>
            </div>

            {/* {(spec.notes || spec.displayNameKitchen) && (
                <div className="md:col-span-4 rounded-xl border border-slate-200 bg-slate-100 p-3">
                    {spec.displayNameKitchen && (
                        <div className="text-sm font-semibold text-slate-900">
                            Kitchen Name: {spec.displayNameKitchen}
                        </div>
                    )}
                    {spec.notes && (
                        <div className="mt-1 text-sm text-slate-700">
                            Notes: {spec.notes}
                        </div>
                    )}
                </div>
            )} */}

            {(spec.containsCheese || spec.requiresFrying) && (
                <div className="md:col-span-4 flex flex-wrap gap-2">
                    {spec.containsCheese && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                            Contains Cheese
                        </span>
                    )}
                    {spec.requiresFrying && (
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
                            Requires Frying
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}