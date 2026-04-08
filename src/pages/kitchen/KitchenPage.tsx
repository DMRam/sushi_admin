import { useEffect, useMemo, useRef, useState } from 'react'
import {
    addDoc,
    collection,
    doc,
    getDocs,
    increment,
    onSnapshot,
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
    lastReadyAlertAt?: any
    lastNewAlertAt?: any
    readyAlertVersion?: number
    newAlertVersion?: number
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

    const wrap = kitchen.outerWrap || kitchen.wrapper || parsed.wrapper || ''

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

    const [alertMessage, setAlertMessage] = useState('')
    const [soundEnabled, setSoundEnabled] = useState(true)
    const [notificationsEnabled, setNotificationsEnabled] = useState(false)
    const [audioUnlocked, setAudioUnlocked] = useState(false)

    const seenNewAlertVersionsRef = useRef<Map<string, number>>(new Map())
    const seenReadyAlertVersionsRef = useRef<Map<string, number>>(new Map())
    const hasInitializedOrdersRef = useRef(false)
    const audioContextRef = useRef<AudioContext | null>(null)
    const alertTimeoutRef = useRef<number | null>(null)

    function ensureAudioContext() {
        try {
            const AudioCtx =
                window.AudioContext ||
                (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

            if (!AudioCtx) return null

            if (!audioContextRef.current) {
                audioContextRef.current = new AudioCtx()
            }

            if (audioContextRef.current.state === 'suspended') {
                void audioContextRef.current.resume()
            }

            return audioContextRef.current
        } catch (error) {
            console.error('Failed to initialize audio context:', error)
            return null
        }
    }

    function playReadyOrderSound() {
        if (!soundEnabled) return

        try {
            const ctx = ensureAudioContext()
            if (!ctx) return

            const pattern = [
                { time: 0.0, freq: 1046, duration: 0.18 },
                { time: 0.22, freq: 1318, duration: 0.18 },
                { time: 0.44, freq: 1567, duration: 0.24 },
                { time: 0.78, freq: 1567, duration: 0.24 },
            ]

            pattern.forEach((note) => {
                const oscillator = ctx.createOscillator()
                const gain = ctx.createGain()

                oscillator.type = 'square'
                oscillator.frequency.setValueAtTime(ctx.sampleRate ? note.freq : note.freq, ctx.currentTime + note.time)

                gain.gain.setValueAtTime(0.0001, ctx.currentTime + note.time)
                gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + note.time + 0.02)
                gain.gain.exponentialRampToValueAtTime(
                    0.0001,
                    ctx.currentTime + note.time + note.duration
                )

                oscillator.connect(gain)
                gain.connect(ctx.destination)

                oscillator.start(ctx.currentTime + note.time)
                oscillator.stop(ctx.currentTime + note.time + note.duration)
            })
        } catch (error) {
            console.error('Failed to play ready order sound:', error)
        }
    }

    function playNewOrderSound() {
        if (!soundEnabled) return

        try {
            const ctx = ensureAudioContext()
            if (!ctx) return

            const now = ctx.currentTime

            const oscillator1 = ctx.createOscillator()
            const gain1 = ctx.createGain()
            oscillator1.type = 'sine'
            oscillator1.frequency.setValueAtTime(880, now)
            gain1.gain.setValueAtTime(0.0001, now)
            gain1.gain.exponentialRampToValueAtTime(0.12, now + 0.02)
            gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)
            oscillator1.connect(gain1)
            gain1.connect(ctx.destination)
            oscillator1.start(now)
            oscillator1.stop(now + 0.22)

            const oscillator2 = ctx.createOscillator()
            const gain2 = ctx.createGain()
            oscillator2.type = 'sine'
            oscillator2.frequency.setValueAtTime(1174, now + 0.18)
            gain2.gain.setValueAtTime(0.0001, now + 0.18)
            gain2.gain.exponentialRampToValueAtTime(0.12, now + 0.2)
            gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)
            oscillator2.connect(gain2)
            gain2.connect(ctx.destination)
            oscillator2.start(now + 0.18)
            oscillator2.stop(now + 0.42)
        } catch (error) {
            console.error('Failed to play new order sound:', error)
        }
    }

    function vibrateDevice() {
        if ('vibrate' in navigator) {
            navigator.vibrate([180, 80, 180])
        }
    }

    async function unlockDeviceAudio() {
        const ctx = ensureAudioContext()

        if (!ctx) {
            setAudioUnlocked(false)
            return false
        }

        try {
            if (ctx.state === 'suspended') {
                await ctx.resume()
            }

            const oscillator = ctx.createOscillator()
            const gain = ctx.createGain()

            gain.gain.setValueAtTime(0.0001, ctx.currentTime)
            oscillator.connect(gain)
            gain.connect(ctx.destination)
            oscillator.start(ctx.currentTime)
            oscillator.stop(ctx.currentTime + 0.01)

            setAudioUnlocked(ctx.state === 'running')
            return ctx.state === 'running'
        } catch (error) {
            console.error('Failed to unlock device audio:', error)
            setAudioUnlocked(false)
            return false
        }
    }

    async function requestNotificationPermission() {
        await unlockDeviceAudio()

        if (!('Notification' in window)) {
            setNotificationsEnabled(false)
            return false
        }

        if (Notification.permission === 'granted') {
            setNotificationsEnabled(true)
            return true
        }

        if (Notification.permission === 'denied') {
            setNotificationsEnabled(false)
            return false
        }

        const permission = await Notification.requestPermission()
        const granted = permission === 'granted'
        setNotificationsEnabled(granted)
        return granted
    }

    function showReadyBrowserNotification(order: KitchenOrder) {
        if (!('Notification' in window)) return
        if (Notification.permission !== 'granted') return

        const title = 'Order ready for pickup / service'
        const body = `${order.customerName || 'Walk-in'} • ${order.totalItems || 0} item(s) • ${money(order.subtotal || 0)}`

        try {
            const notification = new Notification(title, {
                body,
                tag: `kitchen-ready-${order.id}-${order.readyAlertVersion || 0}`,
            })

            notification.onclick = () => {
                window.focus()
                setActiveTab('ready')
                notification.close()
            }
        } catch (error) {
            console.error('Failed to show ready notification:', error)
        }
    }

    function showBrowserNotification(order: KitchenOrder) {
        if (!('Notification' in window)) return
        if (Notification.permission !== 'granted') return

        const title = 'New kitchen order'
        const body = `${order.customerName || 'Walk-in'} • ${order.totalItems || 0} item(s) • ${money(order.subtotal || 0)}`

        try {
            const notification = new Notification(title, {
                body,
                tag: `kitchen-order-${order.id}-${order.newAlertVersion || 0}`,
            })

            notification.onclick = () => {
                window.focus()
                setActiveTab('new')
                notification.close()
            }
        } catch (error) {
            console.error('Failed to show notification:', error)
        }
    }

    function triggerReadyOrderAlert(order: KitchenOrder, manual = false) {
        const nextMessage = manual
            ? `Ready order alert sent again: ${order.customerName || 'Walk-in'} · ${order.totalItems || 0} item(s) · ${money(order.subtotal || 0)}`
            : `Order ready: ${order.customerName || 'Walk-in'} · ${order.totalItems || 0} item(s) · ${money(order.subtotal || 0)}`

        setAlertMessage(nextMessage)
        setActiveTab('ready')

        playReadyOrderSound()
        vibrateDevice()
        showReadyBrowserNotification(order)

        if (alertTimeoutRef.current) {
            window.clearTimeout(alertTimeoutRef.current)
        }

        alertTimeoutRef.current = window.setTimeout(() => {
            setAlertMessage((current) => (current === nextMessage ? '' : current))
            alertTimeoutRef.current = null
        }, 9000)
    }

    function triggerNewOrderAlert(order: KitchenOrder) {
        const nextMessage = `New order in queue: ${order.customerName || 'Walk-in'} · ${order.totalItems || 0} item(s) · ${money(order.subtotal || 0)}`

        setAlertMessage(nextMessage)
        setActiveTab('new')
        playNewOrderSound()
        vibrateDevice()
        showBrowserNotification(order)

        if (alertTimeoutRef.current) {
            window.clearTimeout(alertTimeoutRef.current)
        }

        alertTimeoutRef.current = window.setTimeout(() => {
            setAlertMessage((current) => (current === nextMessage ? '' : current))
            alertTimeoutRef.current = null
        }, 7000)
    }

    useEffect(() => {
        void loadInitialProducts()

        const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'))

        const unsubscribe = onSnapshot(
            ordersQuery,
            (snapshot) => {
                const liveOrders = snapshot.docs.map((item) => ({
                    id: item.id,
                    ...item.data(),
                })) as KitchenOrder[]

                setOrders(liveOrders)

                const currentNewVersions = new Map(
                    liveOrders
                        .filter((order) => (order.status || 'new') === 'new')
                        .map((order) => [order.id, Number(order.newAlertVersion || 0)])
                )

                const currentReadyVersions = new Map(
                    liveOrders
                        .filter((order) => order.status === 'ready')
                        .map((order) => [order.id, Number(order.readyAlertVersion || 0)])
                )

                if (!hasInitializedOrdersRef.current) {
                    seenNewAlertVersionsRef.current = new Map(currentNewVersions)
                    seenReadyAlertVersionsRef.current = new Map(currentReadyVersions)
                    hasInitializedOrdersRef.current = true
                    setLoading(false)
                    return
                }

                const trulyNewOrders = liveOrders.filter((order) => {
                    if ((order.status || 'new') !== 'new') return false

                    const currentVersion = Number(order.newAlertVersion || 0)
                    const seenVersion = seenNewAlertVersionsRef.current.get(order.id) || 0

                    return currentVersion > seenVersion
                })

                const newlyReadyOrders = liveOrders.filter((order) => {
                    if (order.status !== 'ready') return false

                    const currentVersion = Number(order.readyAlertVersion || 0)
                    const seenVersion = seenReadyAlertVersionsRef.current.get(order.id) || 0

                    return currentVersion > seenVersion
                })

                if (trulyNewOrders.length > 0) {
                    trulyNewOrders.forEach((order) => {
                        triggerNewOrderAlert(order)
                    })
                }

                if (newlyReadyOrders.length > 0) {
                    newlyReadyOrders.forEach((order) => {
                        triggerReadyOrderAlert(order, true)
                    })
                }

                seenNewAlertVersionsRef.current = new Map(currentNewVersions)
                seenReadyAlertVersionsRef.current = new Map(currentReadyVersions)

                setLoading(false)
            },
            (error) => {
                console.error('Orders realtime listener error:', error)
                setDebugInfo(`Orders listener error: ${error?.message || 'unknown error'}`)
                setLoading(false)
            }
        )

        return () => {
            unsubscribe()

            if (alertTimeoutRef.current) {
                window.clearTimeout(alertTimeoutRef.current)
            }

            if (audioContextRef.current) {
                void audioContextRef.current.close().catch(() => undefined)
            }
        }
    }, [])


    useEffect(() => {
        const tryUnlockAudio = () => {
            void unlockDeviceAudio()
        }

        window.addEventListener('pointerdown', tryUnlockAudio)
        window.addEventListener('touchstart', tryUnlockAudio)
        window.addEventListener('keydown', tryUnlockAudio)

        return () => {
            window.removeEventListener('pointerdown', tryUnlockAudio)
            window.removeEventListener('touchstart', tryUnlockAudio)
            window.removeEventListener('keydown', tryUnlockAudio)
        }
    }, [])

    useEffect(() => {
        if ('Notification' in window) {
            setNotificationsEnabled(Notification.permission === 'granted')
        }
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

    async function loadInitialProducts() {
        try {
            setLoading(true)

            const { products: loadedProducts, logs, source } =
                await loadProductsFromKnownCollections()

            const sortedProducts = [...loadedProducts].sort((a, b) => {
                const byCategory = (a.category || '').localeCompare(b.category || '')
                if (byCategory !== 0) return byCategory
                return (a.sortOrder || 0) - (b.sortOrder || 0)
            })

            setProducts(sortedProducts)
            setDebugInfo(`Products source: ${source || 'none'} | ${logs.join(' | ')}`)
        } catch (error) {
            console.error('Kitchen loadInitialProducts error:', error)
            setDebugInfo(`Load error: ${(error as Error)?.message || 'unknown error'}`)
        } finally {
            setLoading(false)
        }
    }

    async function refreshProductsOnly() {
        try {
            const { products: loadedProducts, logs, source } =
                await loadProductsFromKnownCollections()

            const sortedProducts = [...loadedProducts].sort((a, b) => {
                const byCategory = (a.category || '').localeCompare(b.category || '')
                if (byCategory !== 0) return byCategory
                return (a.sortOrder || 0) - (b.sortOrder || 0)
            })

            setProducts(sortedProducts)
            setDebugInfo(`Products source: ${source || 'none'} | ${logs.join(' | ')}`)
        } catch (error) {
            console.error('Kitchen refreshProductsOnly error:', error)
            setDebugInfo(`Load error: ${(error as Error)?.message || 'unknown error'}`)
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
            newAlertVersion: 1,
            readyAlertVersion: 0,
            lastNewAlertAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }

        console.log('Saving order:', safeOrder)

        await addDoc(collection(db, 'orders'), safeOrder)
    }

    async function updateOrderStatus(
        orderId: string,
        nextStatus: 'new' | 'preparing' | 'ready' | 'completed'
    ) {
        const payload: Record<string, unknown> = {
            status: nextStatus,
            updatedAt: serverTimestamp(),
        }

        if (nextStatus === 'new') {
            payload.newAlertVersion = increment(1)
            payload.lastNewAlertAt = serverTimestamp()
        }

        if (nextStatus === 'ready') {
            payload.readyAlertVersion = increment(1)
            payload.lastReadyAlertAt = serverTimestamp()
        }

        await updateDoc(doc(db, 'orders', orderId), payload)
    }

    async function alertReadyAgain(orderId: string) {
        await updateDoc(doc(db, 'orders', orderId), {
            readyAlertVersion: increment(1),
            lastReadyAlertAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        })
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
        <div className="min-h-0 space-y-6 p-4 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
                        Kitchen Management
                    </h1>
                    <p className="mt-2 text-base text-slate-500 md:text-lg">
                        Fast manual orders plus a clear kitchen queue.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => void refreshProductsOnly()}
                        className="rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Refresh Products
                    </button>

                    <button
                        onClick={() => void requestNotificationPermission()}
                        className="rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
                    >
                        {notificationsEnabled ? 'Notifications On' : 'Enable Alerts'}
                    </button>

                    <button
                        onClick={() => {
                            void unlockDeviceAudio()
                            setSoundEnabled((prev) => !prev)
                        }}
                        className={`rounded-xl px-4 py-3 font-medium ${soundEnabled
                            ? 'border border-emerald-300 bg-emerald-50 text-emerald-800'
                            : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                            }`}
                    >
                        {soundEnabled ? 'Sound On' : 'Sound Off'}
                    </button>

                    <button
                        onClick={() => void unlockDeviceAudio()}
                        className={`rounded-xl px-4 py-3 font-medium ${audioUnlocked
                            ? 'border border-emerald-300 bg-emerald-50 text-emerald-800'
                            : 'border border-amber-300 bg-amber-50 text-amber-900'
                            }`}
                    >
                        {audioUnlocked ? 'Audio Unlocked' : 'Unlock Device Audio'}
                    </button>

                    <button
                        onClick={() => setIsManualOrderOpen(true)}
                        className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
                    >
                        + New Manual Order
                    </button>
                </div>
            </div>

            {alertMessage && (
                <div className="animate-pulse rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-900 shadow-sm">
                    🔔 {alertMessage}
                </div>
            )}

            {!audioUnlocked && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Tap <span className="font-semibold">Unlock Device Audio</span> once on each tablet or phone so browser sound can play for realtime kitchen alerts.
                </div>
            )}

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
                    <TabButton
                        label={`Queue (${newOrders.length})`}
                        active={activeTab === 'new'}
                        onClick={() => setActiveTab('new')}
                    />
                    <TabButton
                        label={`Preparing (${preparingOrders.length})`}
                        active={activeTab === 'preparing'}
                        onClick={() => setActiveTab('preparing')}
                    />
                    <TabButton
                        label={`Ready (${readyOrders.length})`}
                        active={activeTab === 'ready'}
                        onClick={() => setActiveTab('ready')}
                    />
                    <TabButton
                        label={`Completed (${completedOrders.length})`}
                        active={activeTab === 'completed'}
                        onClick={() => setActiveTab('completed')}
                    />
                    <TabButton
                        label={`All (${orders.length})`}
                        active={activeTab === 'all'}
                        onClick={() => setActiveTab('all')}
                    />
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
                            onAlertReadyAgain={() => void alertReadyAgain(order.id)}
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
    onAlertReadyAgain,
}: {
    order: KitchenOrder
    productMap: Map<string, KitchenProduct>
    onMoveToPreparing: () => void
    onMoveToReady: () => void
    onMoveToCompleted: () => void
    onMoveToQueue: () => void
    onAlertReadyAgain: () => void
}) {
    const status = order.status || 'new'

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 md:text-2xl">
                        Order #{order.id.slice(-6)}
                    </h2>

                    <div className="mt-3 grid gap-1 text-sm text-slate-600">
                        <div>
                            <span className="font-semibold">Customer:</span>{' '}
                            {order.customerName || 'Walk-in'}
                        </div>
                        <div>
                            <span className="font-semibold">Type:</span> {order.orderType || 'pickup'}
                        </div>
                        <div>
                            <span className="font-semibold">Source:</span> {order.source || 'manual'}
                        </div>
                        <div>
                            <span className="font-semibold">Payment:</span> {order.payment || 'cash'}
                        </div>
                        <div>
                            <span className="font-semibold">Order Time:</span>{' '}
                            {formatCreatedAt(order.createdAt)}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                        {status.toUpperCase()}
                    </div>

                    {status === 'new' && (
                        <button
                            onClick={onMoveToPreparing}
                            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                            Start Preparing
                        </button>
                    )}

                    {status === 'preparing' && (
                        <>
                            <button
                                onClick={onMoveToQueue}
                                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Back to Queue
                            </button>
                            <button
                                onClick={onMoveToReady}
                                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                            >
                                Mark Ready
                            </button>
                        </>
                    )}

                    {status === 'ready' && (
                        <>
                            <button
                                onClick={onAlertReadyAgain}
                                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                            >
                                Alert Waitress Again
                            </button>

                            <button
                                onClick={onMoveToPreparing}
                                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Back to Preparing
                            </button>

                            <button
                                onClick={onMoveToCompleted}
                                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                            >
                                Complete
                            </button>
                        </>
                    )}

                    {status === 'completed' && (
                        <button
                            onClick={onMoveToReady}
                            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Back to Ready
                        </button>
                    )}
                </div>
            </div>

            {order.specialInstructions && (
                <div className="mb-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                    <span className="font-semibold">Special instructions:</span>{' '}
                    {order.specialInstructions}
                </div>
            )}

            <div className="space-y-4">
                {order.items?.map((item, index) => {
                    const product = productMap.get(item.productId)

                    return (
                        <div
                            key={`${item.productId}-${index}`}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 flex-1">
                                    <div className="text-lg font-semibold text-slate-900 md:text-xl">
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
                                    <div className="text-xl font-bold text-slate-900 md:text-2xl">
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