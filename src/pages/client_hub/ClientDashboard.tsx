import { useClientAuth } from './hooks/useClientAuth'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { db } from '../../firebase/firebase'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'

import { RewardsTabs } from './components/RewardsTabs'
import { EnhancedHeader } from './components/EnhancedHeader'
import type { OrderDetails, PointsHistoryItem, QuickReorderItem, SpecialOffer } from './interfaces/IClientHub'
import { PointsService } from './service/PointsService'

export default function ClientDashboard() {
    const { isClient, clientProfile, loading } = useClientAuth()
    const [activeTab, setActiveTab] = useState('overview')
    const [pointsHistory, setPointsHistory] = useState<PointsHistoryItem[]>([])
    const [recentOrders, setRecentOrders] = useState<OrderDetails[]>([])
    const [specialOffers, setSpecialOffers] = useState<SpecialOffer[]>([])
    const [quickReorderItems, setQuickReorderItems] = useState<QuickReorderItem[]>([])
    const [loadingData, setLoadingData] = useState(true)
    const [stats, setStats] = useState({
        totalSpent: 0,
        averageOrder: 0,
        favoriteCategory: '',
        monthlyOrders: 0
    })

    useEffect(() => {
        if (isClient && clientProfile?.id) {
            fetchDashboardData()
        }
    }, [isClient, clientProfile])

    const fetchDashboardData = async () => {
        try {
            setLoadingData(true)
            if (!clientProfile) return;

            // ✅ UPDATED: Fetch points history using PointsService
            const pointsHistoryData = await PointsService.getUserPointsHistory(clientProfile.id, 10)
            setPointsHistory(pointsHistoryData)

            // ✅ UPDATED: Fetch recent orders from Supabase instead of Firebase
            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', clientProfile.id)
                .order('created_at', { ascending: false })
                .limit(10)

            let totalSpent = 0
            const categoryCount: { [key: string]: number } = {}
            const productOrderCount: { [key: string]: { count: number, lastOrdered: string, name: string, price: number, image?: string } } = {}

            const processedOrders: OrderDetails[] = []

            if (!ordersError && ordersData) {
                ordersData.forEach((order) => {
                    const orderTotal = parseFloat(order.final_total) || 0
                    totalSpent += orderTotal

                    // Parse items from JSON string if needed
                    let items = []
                    try {
                        items = typeof order.items === 'string'
                            ? JSON.parse(order.items)
                            : order.items || []
                    } catch (e) {
                        console.error('Error parsing order items:', e)
                        items = []
                    }

                    const processedOrder: OrderDetails = {
                        id: order.firebase_order_id || order.id,
                        items: items.map((item: any) => {
                            // Track product order counts for quick reorder
                            if (item.productId || item.id) {
                                const productId = item.productId || item.id
                                productOrderCount[productId] = {
                                    count: (productOrderCount[productId]?.count || 0) + 1,
                                    lastOrdered: order.created_at || new Date().toISOString(),
                                    name: item.name,
                                    price: item.price || 0,
                                    image: item.image
                                }
                            }

                            // Track category counts
                            if (item.category) {
                                categoryCount[item.category] = (categoryCount[item.category] || 0) + 1
                            }

                            return {
                                id: item.productId || item.id,
                                name: item.name,
                                quantity: item.quantity || 1,
                                price: item.price || 0,
                                productId: item.productId || item.id,
                                image: item.image,
                                category: item.category
                            }
                        }),
                        totals: {
                            subtotal: parseFloat(order.subtotal) || 0,
                            gst: parseFloat(order.gst) || 0,
                            qst: parseFloat(order.qst) || 0,
                            deliveryFee: parseFloat(order.delivery_fee) || 0,
                            finalTotal: orderTotal
                        },
                        created_at: order.order_date || order.created_at,
                        status: order.status || 'Completed',
                        type: order.delivery_type as 'delivery' | 'pickup' || 'delivery',
                        delivery_address: order.delivery_address
                    }
                    processedOrders.push(processedOrder)
                })

                setRecentOrders(processedOrders.slice(0, 5))
            } else {
                console.error('Error fetching orders from Supabase:', ordersError)
                // Fallback to Firebase if Supabase fails
                await fetchOrdersFromFirebase(clientProfile.id)
            }

            // Calculate stats
            const favoriteCategory = Object.keys(categoryCount).reduce((a, b) =>
                categoryCount[a] > categoryCount[b] ? a : b, 'Unknown'
            )

            const monthlyOrders = processedOrders.filter(order => {
                const orderDate = new Date(order.created_at)
                const monthAgo = new Date()
                monthAgo.setMonth(monthAgo.getMonth() - 1)
                return orderDate > monthAgo
            }).length

            setStats({
                totalSpent,
                averageOrder: processedOrders.length > 0 ? totalSpent / processedOrders.length : 0,
                favoriteCategory,
                monthlyOrders
            })

            // Prepare quick reorder items
            const quickReorder = Object.entries(productOrderCount)
                .sort(([, a], [, b]) => b.count - a.count)
                .slice(0, 6)
                .map(([productId, data]) => ({
                    productId,
                    name: data.name,
                    price: data.price,
                    image: data.image,
                    lastOrdered: data.lastOrdered,
                    orderCount: data.count
                }))

            setQuickReorderItems(quickReorder)

            // Fetch special offers from Supabase
            const { data: offers, error: offersError } = await supabase
                .from('special_offers')
                .select('*')
                .gte('valid_until', new Date().toISOString())
                .order('created_at', { ascending: false })

            if (!offersError && offers) {
                setSpecialOffers(offers)
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoadingData(false)
        }
    }

    // Fallback function to fetch from Firebase if Supabase fails
    const fetchOrdersFromFirebase = async (userId: string) => {
        try {
            console.log('🔄 Falling back to Firebase for orders...')
            const ordersQuery = query(
                collection(db, 'orders'),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            )

            const ordersSnapshot = await getDocs(ordersQuery)
            const ordersData: OrderDetails[] = []
            let totalSpent = 0
            const categoryCount: { [key: string]: number } = {}
            const productOrderCount: { [key: string]: { count: number, lastOrdered: string, name: string, price: number, image?: string } } = {}

            ordersSnapshot.forEach((doc) => {
                const data = doc.data()
                const orderTotal = data.totals?.finalTotal || 0
                totalSpent += orderTotal

                const order: OrderDetails = {
                    id: doc.id,
                    items: data.items?.map((item: any) => {
                        // Track product order counts for quick reorder
                        if (item.productId) {
                            productOrderCount[item.productId] = {
                                count: (productOrderCount[item.productId]?.count || 0) + 1,
                                lastOrdered: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                                name: item.name,
                                price: item.sellingPrice || item.price || 0,
                                image: item.image
                            }
                        }

                        // Track category counts
                        if (item.category) {
                            categoryCount[item.category] = (categoryCount[item.category] || 0) + 1
                        }

                        return {
                            id: item.productId,
                            name: item.name,
                            quantity: item.quantity || 1,
                            price: item.sellingPrice || item.price || 0,
                            productId: item.productId,
                            image: item.image,
                            category: item.category
                        }
                    }) || [],
                    totals: data.totals || {
                        subtotal: 0,
                        gst: 0,
                        qst: 0,
                        deliveryFee: 0,
                        finalTotal: 0
                    },
                    created_at: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
                    status: data.paymentStatus === 'paid' ? 'Completed' : data.status || 'Processing',
                    type: data.deliveryType || 'delivery',
                    delivery_address: data.deliveryAddress
                }
                ordersData.push(order)
            })

            setRecentOrders(ordersData.slice(0, 5))

            // Update stats with Firebase data
            const favoriteCategory = Object.keys(categoryCount).reduce((a, b) =>
                categoryCount[a] > categoryCount[b] ? a : b, 'Unknown'
            )

            const monthlyOrders = ordersData.filter(order => {
                const orderDate = new Date(order.created_at)
                const monthAgo = new Date()
                monthAgo.setMonth(monthAgo.getMonth() - 1)
                return orderDate > monthAgo
            }).length

            setStats(prev => ({
                ...prev,
                totalSpent,
                averageOrder: ordersData.length > 0 ? totalSpent / ordersData.length : 0,
                favoriteCategory,
                monthlyOrders
            }))

            // Update quick reorder with Firebase data
            const quickReorder = Object.entries(productOrderCount)
                .sort(([, a], [, b]) => b.count - a.count)
                .slice(0, 6)
                .map(([productId, data]) => ({
                    productId,
                    name: data.name,
                    price: data.price,
                    image: data.image,
                    lastOrdered: data.lastOrdered,
                    orderCount: data.count
                }))

            setQuickReorderItems(quickReorder)

        } catch (firebaseError) {
            console.error('Error fetching from Firebase fallback:', firebaseError)
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD'
        }).format(amount)
    }

    // Add real-time subscription for points updates
    useEffect(() => {
        if (!clientProfile?.id) return;

        const subscription = supabase
            .channel('points-changes')
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'points_history',
                    filter: `user_id=eq.${clientProfile.id}`
                },
                (payload) => {
                    console.log('New points activity received:', payload)
                    // Refresh points history when new points are added
                    PointsService.getUserPointsHistory(clientProfile.id, 10)
                        .then(setPointsHistory)
                        .catch(console.error)
                }
            )
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [clientProfile?.id])

    // Add real-time subscription for orders updates
    useEffect(() => {
        if (!clientProfile?.id) return;

        const subscription = supabase
            .channel('orders-changes')
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'orders',
                    filter: `user_id=eq.${clientProfile.id}`
                },
                (payload) => {
                    console.log('New order received:', payload)
                    // Refresh dashboard data when new order is added
                    fetchDashboardData()
                }
            )
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [clientProfile?.id])

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white/60 font-light tracking-wide">Loading your dashboard...</p>
                </div>
            </div>
        )
    }

    if (!isClient) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
                <div className="text-center max-w-md mx-4">
                    <div className="w-20 h-20 bg-emerald-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-2xl">🍣</span>
                    </div>
                    <h2 className="text-2xl font-light text-white mb-4">Client Access Required</h2>
                    <p className="text-white/60 font-light tracking-wide mb-8">
                        This area is exclusively for our valued clients. Please log in to your client account.
                    </p>
                    <div className="space-y-3">
                        <a
                            href="/client-login"
                            className="block bg-emerald-500 text-white px-8 py-3 rounded-lg hover:bg-emerald-600 transition-all duration-300 font-light shadow-lg shadow-emerald-500/20"
                        >
                            Client Login
                        </a>
                        <a
                            href="/client-register"
                            className="block border border-white/20 text-white/60 px-8 py-3 rounded-lg hover:bg-white/10 hover:text-white transition-all duration-300 font-light"
                        >
                            Become a Client
                        </a>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-8">
            <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
                {/* Enhanced Header */}
                <EnhancedHeader
                    activeTab={activeTab}
                    clientProfile={clientProfile}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                    loadingData={loadingData}
                    setActiveTab={setActiveTab}
                    specialOffers={specialOffers}
                    stats={stats}
                />

                {/* Navigation Tabs */}
                <div className="flex space-x-1 bg-white/5 border border-white/10 rounded-xl p-1 mb-8 backdrop-blur-sm">
                    {['overview', 'orders', 'points', 'rewards', 'quick-reorder', 'profile'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3 px-4 rounded-lg font-light transition-all duration-300 ${activeTab === tab
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {tab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </button>
                    ))}
                </div>

                {/* Enhanced Tab Content */}
                <RewardsTabs
                    activeTab={activeTab}
                    clientProfile={clientProfile}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                    loadingData={loadingData}
                    pointsHistory={pointsHistory}
                    quickReorderItems={quickReorderItems}
                    recentOrders={recentOrders}
                    setActiveTab={setActiveTab}
                    stats={stats}
                />
            </div>
        </div>
    )
}