import { signOut } from 'firebase/auth'
import { auth } from '../../firebase/firebase'
import { useNavigate } from 'react-router-dom'
import { useClientAuth } from './hooks/useClientAuth'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { db } from '../../firebase/firebase'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'

interface PointsHistoryItem {
    id: string
    points: number
    description: string
    type: string
    transaction_type: string
    created_at: string
    order_id?: string
}

interface OrderItem {
    id: string
    name: string
    quantity: number
    price: number
}

interface OrderDetails {
    id: string
    items: OrderItem[]
    totals: {
        subtotal: number
        gst: number
        qst: number
        deliveryFee: number
        finalTotal: number
    }
    created_at: string
    status: string
}

export default function ClientDashboard() {
    const { isClient, clientProfile, loading } = useClientAuth()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('overview')
    const [pointsHistory, setPointsHistory] = useState<PointsHistoryItem[]>([])
    const [recentOrders, setRecentOrders] = useState<OrderDetails[]>([])
    const [loadingData, setLoadingData] = useState(true)

    useEffect(() => {
        if (isClient && clientProfile?.id) {
            fetchDashboardData()
        }
    }, [isClient, clientProfile])

    const fetchDashboardData = async () => {
        try {
            setLoadingData(true)

            // Fetch points history from Supabase
            if (!clientProfile) return;
            const { data: pointsData, error: pointsError } = await supabase
                .from('points_history')
                .select('*')
                .eq('user_id', clientProfile.id)
                .order('created_at', { ascending: false })
                .limit(10)

            if (!pointsError && pointsData) {
                setPointsHistory(pointsData)
            }

            // Fetch recent orders from Firestore
            const ordersQuery = query(
                collection(db, 'orders'),
                where('userId', '==', clientProfile.id),
                orderBy('createdAt', 'desc')
            )

            const ordersSnapshot = await getDocs(ordersQuery)
            const ordersData: OrderDetails[] = []

            ordersSnapshot.forEach((doc) => {
                const data = doc.data()
                ordersData.push({
                    id: doc.id,
                    items: data.items?.map((item: any) => ({
                        id: item.productId,
                        name: item.name,
                        quantity: item.quantity || 1,
                        price: item.sellingPrice || item.price || 0
                    })) || [],
                    totals: data.totals || {
                        subtotal: 0,
                        gst: 0,
                        qst: 0,
                        deliveryFee: 0,
                        finalTotal: 0
                    },
                    created_at: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
                    status: data.paymentStatus === 'paid' ? 'Completed' : data.status || 'Processing'
                })
            })

            setRecentOrders(ordersData.slice(0, 5))

        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoadingData(false)
        }
    }

    const handleLogout = async () => {
        try {
            await signOut(auth)
            navigate('/')
        } catch (error) {
            console.error('Logout error:', error)
        }
    }

    // Mock rewards data (you can replace this with real data later)
    const rewards = [
        { id: 1, name: 'Free Appetizer', points: 100, claimed: false },
        { id: 2, name: '10% Off Next Order', points: 200, claimed: true },
        { id: 3, name: 'Free Delivery', points: 150, claimed: false },
    ]

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

    const getTierColor = (tier: string) => {
        switch (tier?.toLowerCase()) {
            case 'platinum': return 'from-purple-500 to-pink-500'
            case 'gold': return 'from-yellow-500 to-orange-500'
            case 'silver': return 'from-gray-400 to-gray-300'
            default: return 'from-emerald-400 to-cyan-400'
        }
    }

    const getProgressPercentage = () => {
        const points = clientProfile?.total_points || 0
        if (points >= 1000) return 100
        return (points / 1000) * 100
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-8">
            <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
                    <div>
                        <h1 className="text-4xl font-light text-white mb-2">
                            Welcome back, {clientProfile?.full_name?.split(' ')[0]}!
                        </h1>
                        <p className="text-white/60 font-light">
                            Here's your loyalty dashboard and rewards
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="border border-white/20 text-white/60 px-6 py-2 rounded-lg hover:bg-white/10 hover:text-white transition-all duration-300 font-light flex items-center gap-2"
                    >
                        <span>🚪</span>
                        Logout
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-400/10 rounded-lg flex items-center justify-center">
                                <span className="text-xl">⭐</span>
                            </div>
                            <div>
                                <p className="text-white/60 font-light text-sm">Total Points</p>
                                <p className="text-2xl font-light text-white">{clientProfile?.total_points || 0}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-400/10 rounded-lg flex items-center justify-center">
                                <span className="text-xl">🏆</span>
                            </div>
                            <div>
                                <p className="text-white/60 font-light text-sm">Current Tier</p>
                                <p className="text-2xl font-light text-white capitalize">{clientProfile?.current_tier || 'Bronze'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-400/10 rounded-lg flex items-center justify-center">
                                <span className="text-xl">📅</span>
                            </div>
                            <div>
                                <p className="text-white/60 font-light text-sm">Total Orders</p>
                                <p className="text-2xl font-light text-white">{recentOrders.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-white/60 font-light">Progress to Next Tier</p>
                        <p className="text-white font-light">{clientProfile?.total_points || 0}/1000 points</p>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-3">
                        <div
                            className={`h-3 rounded-full bg-gradient-to-r ${getTierColor(clientProfile?.current_tier || 'bronze')} transition-all duration-1000 ease-out`}
                            style={{ width: `${getProgressPercentage()}%` }}
                        ></div>
                    </div>
                    <p className="text-white/40 text-sm font-light mt-2">
                        {1000 - (clientProfile?.total_points || 0)} points needed for next tier
                    </p>
                </div>

                {/* Navigation Tabs */}
                <div className="flex space-x-1 bg-white/5 border border-white/10 rounded-xl p-1 mb-8 backdrop-blur-sm">
                    {['overview', 'orders', 'points', 'rewards', 'profile'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3 px-4 rounded-lg font-light transition-all duration-300 ${activeTab === tab
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                    {loadingData ? (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 border-4 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-white/60 font-light">Loading your data...</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-light text-white mb-4">Recent Orders</h3>
                                        {recentOrders.length > 0 ? (
                                            <div className="space-y-3">
                                                {recentOrders.slice(0, 3).map((order) => (
                                                    <div key={order.id} className="flex justify-between items-center p-4 bg-white/5 rounded-lg border border-white/10">
                                                        <div>
                                                            <p className="text-white font-light">
                                                                {order.items.slice(0, 2).map(item => item.name).join(', ')}
                                                                {order.items.length > 2 && ` +${order.items.length - 2} more`}
                                                            </p>
                                                            <p className="text-white/60 text-sm font-light">{formatDate(order.created_at)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-white font-light">{formatCurrency(order.totals.finalTotal)}</p>
                                                            <p className="text-emerald-400 text-sm font-light">{order.status}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-white/60 font-light text-center py-4">No orders yet</p>
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-light text-white mb-4">Recent Points Activity</h3>
                                        {pointsHistory.length > 0 ? (
                                            <div className="space-y-3">
                                                {pointsHistory.slice(0, 5).map((item) => (
                                                    <div key={item.id} className="flex justify-between items-center p-4 bg-white/5 rounded-lg border border-white/10">
                                                        <div>
                                                            <p className="text-white font-light">{item.description}</p>
                                                            <p className="text-white/60 text-sm font-light">{formatDate(item.created_at)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-emerald-400 font-light">+{item.points} pts</p>
                                                            <p className="text-white/60 text-sm font-light capitalize">{item.type}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-white/60 font-light text-center py-4">No points activity yet</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'orders' && (
                                <div>
                                    <h3 className="text-xl font-light text-white mb-4">Order History</h3>
                                    {recentOrders.length > 0 ? (
                                        <div className="space-y-3">
                                            {recentOrders.map((order) => (
                                                <div key={order.id} className="flex justify-between items-center p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300">
                                                    <div>
                                                        <p className="text-white font-light">
                                                            {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                                                        </p>
                                                        <p className="text-white/60 text-sm font-light">{formatDate(order.created_at)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-white font-light">{formatCurrency(order.totals.finalTotal)}</p>
                                                        <p className="text-emerald-400 text-sm font-light">{order.status}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-white/60 font-light text-center py-4">No orders yet</p>
                                    )}
                                </div>
                            )}

                            {activeTab === 'points' && (
                                <div>
                                    <h3 className="text-xl font-light text-white mb-4">Points History</h3>
                                    {pointsHistory.length > 0 ? (
                                        <div className="space-y-3">
                                            {pointsHistory.map((item) => (
                                                <div key={item.id} className="flex justify-between items-center p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300">
                                                    <div>
                                                        <p className="text-white font-light">{item.description}</p>
                                                        <p className="text-white/60 text-sm font-light">{formatDate(item.created_at)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-emerald-400 font-light text-lg">+{item.points} pts</p>
                                                        <p className="text-white/60 text-sm font-light capitalize">{item.type}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-white/60 font-light text-center py-4">No points history yet</p>
                                    )}
                                </div>
                            )}

                            {activeTab === 'rewards' && (
                                <div>
                                    <h3 className="text-xl font-light text-white mb-4">Your Rewards</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {rewards.map((reward) => (
                                            <div key={reward.id} className={`p-4 rounded-lg border ${reward.claimed
                                                ? 'bg-white/5 border-white/10'
                                                : 'bg-gradient-to-r from-emerald-400/10 to-cyan-400/10 border-emerald-400/20'
                                                }`}>
                                                <div className="flex justify-between items-start mb-3">
                                                    <h4 className="text-white font-light">{reward.name}</h4>
                                                    <span className={`px-2 py-1 rounded text-sm font-light ${reward.claimed
                                                        ? 'bg-white/10 text-white/60'
                                                        : 'bg-emerald-400/20 text-emerald-400'
                                                        }`}>
                                                        {reward.points} pts
                                                    </span>
                                                </div>
                                                <button
                                                    className={`w-full py-2 rounded-lg font-light transition-all duration-300 ${reward.claimed
                                                        ? 'bg-white/10 text-white/60 cursor-not-allowed'
                                                        : 'bg-emerald-500 text-white hover:bg-emerald-600'
                                                        }`}
                                                    disabled={reward.claimed}
                                                >
                                                    {reward.claimed ? 'Claimed' : 'Claim Reward'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'profile' && clientProfile && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div>
                                        <h3 className="text-xl font-light text-white mb-4">Personal Information</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-white/60 font-light text-sm">Full Name</label>
                                                <p className="text-white font-light text-lg">{clientProfile.full_name}</p>
                                            </div>
                                            <div>
                                                <label className="text-white/60 font-light text-sm">Email</label>
                                                <p className="text-white font-light text-lg">{clientProfile.email}</p>
                                            </div>
                                            <div>
                                                <label className="text-white/60 font-light text-sm">Phone</label>
                                                <p className="text-white font-light text-lg">{clientProfile.phone || 'Not provided'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-light text-white mb-4">Loyalty Information</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-white/60 font-light text-sm">Member Since</label>
                                                <p className="text-white font-light text-lg">
                                                    {new Date(clientProfile.created_at).toLocaleDateString('en-US', {
                                                        weekday: 'long',
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="text-white/60 font-light text-sm">Total Points</label>
                                                <p className="text-white font-light text-lg">{clientProfile.total_points || 0}</p>
                                            </div>
                                            <div>
                                                <label className="text-white/60 font-light text-sm">Current Tier</label>
                                                <p className="text-white font-light text-lg capitalize">{clientProfile.current_tier || 'Bronze'}</p>
                                            </div>
                                        </div>

                                        <button className="w-full mt-6 border border-white/20 text-white/60 py-3 rounded-lg hover:bg-white/10 hover:text-white transition-all duration-300 font-light">
                                            Edit Profile
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}