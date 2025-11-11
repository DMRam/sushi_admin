import { useNavigate } from "react-router-dom";
import type { ClientProfile } from "../../../types/types";
import type { Dispatch, SetStateAction } from "react";
import { ProfileTab } from "./ProfileTab";
import { RewardsTab } from "./RewardsTab";

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
    productId: string
    image?: string
    category?: string
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
    type: 'delivery' | 'pickup'
    delivery_address?: string
    pointsEarned?: number // Add points earned for this order
}

interface QuickReorderItem {
    productId: string
    name: string
    price: number
    image?: string
    lastOrdered: string
    orderCount: number
}

interface ProfileTabProps {
    clientProfile: ClientProfile | null
    formatCurrency: (amount: number) => string;
    stats: {
        totalSpent: number;
        averageOrder: number;
        favoriteCategory: string;
        monthlyOrders: number;
    }
    loadingData: boolean;
    activeTab: string;
    setActiveTab: Dispatch<SetStateAction<string>>;
    recentOrders: OrderDetails[];
    pointsHistory: PointsHistoryItem[];
    formatDate: (dateString: string) => string;
    quickReorderItems: QuickReorderItem[]
}

export const RewardsTabs = ({ clientProfile, formatCurrency, stats, loadingData, activeTab, setActiveTab, recentOrders, pointsHistory, formatDate, quickReorderItems }: ProfileTabProps) => {
    const navigate = useNavigate()

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Helper function to find points earned for an order
    const getPointsForOrder = (orderId: string): number => {
        const pointEntry = pointsHistory.find(item => item.order_id === orderId);
        return pointEntry?.points || Math.floor(recentOrders.find(order => order.id === orderId)?.totals.finalTotal || 0);
    }

    const handleQuickReorder = async (productId: string) => {
        // Add to cart logic here
        console.log('Adding product to cart:', productId)
        // You'll need to implement your cart addition logic
    }

    const handleReorderEntireOrder = async (order: OrderDetails) => {
        // Add all items from order to cart
        console.log('Reordering entire order:', order.id)
        // Implement bulk add to cart logic
    }

    return (
        <>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                {loadingData ? (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 border-4 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-white/60 font-light">Loading your data...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'overview' && (
                            <div className="space-y-8">
                                {/* Quick Actions */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <button
                                        onClick={() => navigate('/menu')}
                                        className="bg-emerald-500 text-white p-4 rounded-lg hover:bg-emerald-600 transition-all duration-300 font-light text-center"
                                    >
                                        <div className="text-2xl mb-2">🍽️</div>
                                        Order Food
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('quick-reorder')}
                                        className="bg-blue-500 text-white p-4 rounded-lg hover:bg-blue-600 transition-all duration-300 font-light text-center"
                                    >
                                        <div className="text-2xl mb-2">⚡</div>
                                        Quick Reorder
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('rewards')}
                                        className="bg-purple-500 text-white p-4 rounded-lg hover:bg-purple-600 transition-all duration-300 font-light text-center"
                                    >
                                        <div className="text-2xl mb-2">🎁</div>
                                        Claim Rewards
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Enhanced Recent Orders with Points */}
                                    <div>
                                        <h3 className="text-xl font-light text-white mb-4 flex items-center gap-2">
                                            <span>📦</span>
                                            Recent Orders
                                        </h3>
                                        {recentOrders.length > 0 ? (
                                            <div className="space-y-3">
                                                {recentOrders.slice(0, 3).map((order) => {
                                                    const pointsEarned = getPointsForOrder(order.id);
                                                    return (
                                                        <div key={order.id} className="flex justify-between items-center p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300 group">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start gap-3">
                                                                    <div className="flex-1">
                                                                        <p className="text-white font-light truncate">
                                                                            {order.items.slice(0, 2).map(item => item.name).join(', ')}
                                                                            {order.items.length > 2 && ` +${order.items.length - 2} more`}
                                                                        </p>
                                                                        <p className="text-white/60 text-sm font-light">{formatDateTime(order.created_at)}</p>
                                                                        <div className="flex items-center gap-3 mt-1">
                                                                            <p className="text-white/40 text-xs font-light capitalize">{order.type} • {order.status}</p>
                                                                            {pointsEarned > 0 && (
                                                                                <div className="flex items-center gap-1">
                                                                                    <span className="text-yellow-400 text-xs">⭐</span>
                                                                                    <span className="text-yellow-400 text-xs font-medium">+{pointsEarned} pts</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right flex-shrink-0 ml-4">
                                                                <p className="text-white font-light">{formatCurrency(order.totals.finalTotal)}</p>
                                                                <button
                                                                    onClick={() => handleReorderEntireOrder(order)}
                                                                    className="text-emerald-400 text-sm font-light opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap"
                                                                >
                                                                    Reorder
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-white/60 font-light text-center py-4">No orders yet</p>
                                        )}
                                    </div>

                                    {/* Enhanced Points Activity - Show non-order points */}
                                    <div>
                                        <h3 className="text-xl font-light text-white mb-4 flex items-center gap-2">
                                            <span>🎁</span>
                                            Rewards Preview
                                        </h3>

                                        {/* Quick Rewards Preview */}
                                        <div className="space-y-4">
                                            {/* Points Balance Card */}
                                            <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-400/20 rounded-xl p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="text-white font-light">Available Points</h4>
                                                        <p className="text-emerald-400 text-2xl font-light mt-1">{stats.totalSpent ? Math.floor(stats.totalSpent) : 0} pts</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-white/60 text-sm">Ready to redeem</p>
                                                        <button
                                                            onClick={() => setActiveTab('rewards')}
                                                            className="mt-2 bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-600 transition-all duration-300 font-light"
                                                        >
                                                            View Rewards
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Quick Rewards Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {/* Free Appetizer Preview */}
                                                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-400/20 rounded-lg p-3">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-lg">🍽️</span>
                                                        <h5 className="text-white font-light text-sm">Free Appetizer</h5>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-amber-400 text-xs">100 pts</span>
                                                        <span className="text-white/60 text-xs">Popular</span>
                                                    </div>
                                                </div>

                                                {/* Free Delivery Preview */}
                                                <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-400/20 rounded-lg p-3">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-lg">🚚</span>
                                                        <h5 className="text-white font-light text-sm">Free Delivery</h5>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-blue-400 text-xs">150 pts</span>
                                                        <span className="text-white/60 text-xs">Most Used</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Call to Action */}
                                            <div className="text-center">
                                                <button
                                                    onClick={() => setActiveTab('rewards')}
                                                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 font-light flex items-center justify-center gap-2"
                                                >
                                                    <span>🎁</span>
                                                    View All Rewards & Bonuses
                                                    <span>→</span>
                                                </button>
                                                <p className="text-white/40 text-xs mt-2">
                                                    {recentOrders.length > 0
                                                        ? `You have enough points for ${Math.floor((stats.totalSpent || 0) / 100)} rewards!`
                                                        : 'Make your first order to start earning points!'
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'orders' && (
                            <div>
                                <h3 className="text-xl font-light text-white mb-4">Order History</h3>
                                {recentOrders.length > 0 ? (
                                    <div className="space-y-4">
                                        {recentOrders.map((order) => {
                                            const pointsEarned = getPointsForOrder(order.id);
                                            return (
                                                <div key={order.id} className="bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300 overflow-hidden">
                                                    <div className="p-4 border-b border-white/10">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="text-white font-light">Order #{order.id.slice(-8)}</p>
                                                                <p className="text-white/60 text-sm font-light">{formatDateTime(order.created_at)}</p>
                                                                {pointsEarned > 0 && (
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-yellow-400 text-sm">⭐</span>
                                                                        <span className="text-yellow-400 text-sm font-medium">+{pointsEarned} points earned</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-white font-light">{formatCurrency(order.totals.finalTotal)}</p>
                                                                <p className="text-emerald-400 text-sm font-light capitalize">{order.status}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <h4 className="text-white font-light mb-2">Items</h4>
                                                                {order.items.map((item, index) => (
                                                                    <div key={index} className="flex justify-between text-white/60 text-sm">
                                                                        <span>{item.quantity}x {item.name}</span>
                                                                        <span>{formatCurrency(item.price * item.quantity)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-white font-light mb-2">Order Details</h4>
                                                                <div className="text-white/60 text-sm space-y-1">
                                                                    <p>Type: {order.type}</p>
                                                                    {order.delivery_address && <p>Address: {order.delivery_address}</p>}
                                                                    <p>Items: {order.items.length}</p>
                                                                    {pointsEarned > 0 && (
                                                                        <p className="text-yellow-400">Points Earned: +{pointsEarned}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleReorderEntireOrder(order)}
                                                            className="mt-4 bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition-all duration-300 font-light"
                                                        >
                                                            Reorder Entire Order
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-white/60 font-light text-center py-4">No orders yet</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'quick-reorder' && (
                            <div>
                                <h3 className="text-xl font-light text-white mb-4">Quick Reorder</h3>
                                {quickReorderItems.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {quickReorderItems.map((item) => (
                                            <div key={item.productId} className="bg-white/5 rounded-lg border border-white/10 p-4 hover:bg-white/10 transition-all duration-300">
                                                <div className="flex items-start gap-3 mb-3">
                                                    {item.image ? (
                                                        <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                                                    ) : (
                                                        <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                                                            <span className="text-lg">🍽️</span>
                                                        </div>
                                                    )}
                                                    <div className="flex-1">
                                                        <h4 className="text-white font-light">{item.name}</h4>
                                                        <p className="text-emerald-400 font-light">{formatCurrency(item.price)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center text-white/60 text-sm mb-3">
                                                    <span>Ordered {item.orderCount} times</span>
                                                    <span>Last: {formatDate(item.lastOrdered)}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleQuickReorder(item.productId)}
                                                    className="w-full bg-emerald-500 text-white py-2 rounded-lg hover:bg-emerald-600 transition-all duration-300 font-light"
                                                >
                                                    Add to Cart
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-white/60 font-light text-center py-4">No reorder history yet</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'points' && (
                            <div>
                                <h3 className="text-xl font-light text-white mb-4">Complete Points History</h3>
                                {pointsHistory.length > 0 ? (
                                    <div className="space-y-3">
                                        {pointsHistory.map((item) => (
                                            <div key={item.id} className="flex justify-between items-center p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300">
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <p className="text-white font-light break-words">
                                                        {item.description}
                                                    </p>
                                                    <p className="text-white/60 text-sm font-light">{formatDate(item.created_at)}</p>
                                                    {item.order_id && (
                                                        <p className="text-white/40 text-xs">Order #{item.order_id.slice(-8)}</p>
                                                    )}
                                                </div>
                                                <div className="text-right flex-shrink-0 whitespace-nowrap">
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
                            <RewardsTab />
                        )}

                        {activeTab === 'profile' && clientProfile && (
                            <ProfileTab clientProfile={clientProfile} formatCurrency={formatCurrency} stats={stats} i18nIsDynamicList />
                        )}
                    </>
                )}
            </div>
        </>
    )
}