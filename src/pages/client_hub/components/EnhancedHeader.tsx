import type { Dispatch, SetStateAction } from "react";
import type { ClientProfile } from "../../../types/types";
import { useNavigate } from "react-router-dom";
import { signOut } from 'firebase/auth'
import { auth } from "../../../firebase/firebase";

interface SpecialOffer {
    id: string
    title: string
    description: string
    discount_percentage: number
    valid_until: string
    min_order_amount: number
    code: string
    image_url?: string
}

interface EnhancedHeaderProps {
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
    specialOffers: SpecialOffer[]
    formatDate: (dateString: string) => string;

}
export const EnhancedHeader = ({ clientProfile, formatCurrency, formatDate, stats, specialOffers }: EnhancedHeaderProps) => {

    const navigate = useNavigate()

    const copyPromoCode = (code: string) => {
        navigator.clipboard.writeText(code)
        // You can add a toast notification here
        alert(`Promo code ${code} copied to clipboard!`)
    }

    const getTierColor = (tier: string) => {
        switch (tier?.toLowerCase()) {
            case 'platinum': return 'from-purple-500 to-pink-500'
            case 'gold': return 'from-yellow-500 to-orange-500'
            case 'silver': return 'from-gray-400 to-gray-300'
            default: return 'from-emerald-400 to-cyan-400'
        }
    }

    const getTierBenefits = (tier: string) => {
        switch (tier?.toLowerCase()) {
            case 'platinum': return ['Free Delivery', '20% Bonus Points', 'Priority Support', 'Exclusive Offers']
            case 'gold': return ['15% Bonus Points', 'Priority Support', 'Special Discounts']
            case 'silver': return ['10% Bonus Points', 'Early Access to Sales']
            default: return ['5% Bonus Points']
        }
    }

    const getProgressPercentage = () => {
        const points = clientProfile?.total_points || 0
        if (points >= 1000) return 100
        return (points / 1000) * 100
    }

    const handleLogout = async () => {
        try {
            await signOut(auth)
            navigate('/')
        } catch (error) {
            console.error('Logout error:', error)
        }
    }

    const getDaysUntilTierUpgrade = () => {
        const points = clientProfile?.total_points || 0
        const pointsNeeded = 1000 - points
        const averagePointsPerDay = 50 // Adjust based on your business
        return Math.ceil(pointsNeeded / averagePointsPerDay)
    }
    return (
        <>

            {/* Enhanced Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {clientProfile?.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-4xl font-light text-white mb-2">
                            Welcome back, {clientProfile?.full_name?.split(' ')[0]}!
                        </h1>
                        <p className="text-white/60 font-light flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${getTierColor(clientProfile?.current_tier || 'bronze')}`}></span>
                            {clientProfile?.current_tier ? `${clientProfile.current_tier.charAt(0).toUpperCase() + clientProfile.current_tier.slice(1)} Tier Member` : 'Bronze Tier Member'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/menu')}
                        className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition-all duration-300 font-light shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                    >
                        <span>🍽️</span>
                        Order Now
                    </button>
                    <button
                        onClick={handleLogout}
                        className="border border-white/20 text-white/60 px-6 py-2 rounded-lg hover:bg-white/10 hover:text-white transition-all duration-300 font-light flex items-center gap-2"
                    >
                        <span>🚪</span>
                        Logout
                    </button>
                </div>
            </div>

            {/* Enhanced Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
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

                <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-400/10 rounded-lg flex items-center justify-center">
                            <span className="text-xl">💰</span>
                        </div>
                        <div>
                            <p className="text-white/60 font-light text-sm">Total Spent</p>
                            <p className="text-2xl font-light text-white">{formatCurrency(stats.totalSpent)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-400/10 rounded-lg flex items-center justify-center">
                            <span className="text-xl">📊</span>
                        </div>
                        <div>
                            <p className="text-white/60 font-light text-sm">Monthly Orders</p>
                            <p className="text-2xl font-light text-white">{stats.monthlyOrders}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-400/10 rounded-lg flex items-center justify-center">
                            <span className="text-xl">❤️</span>
                        </div>
                        <div>
                            <p className="text-white/60 font-light text-sm">Favorite</p>
                            <p className="text-2xl font-light text-white capitalize">{stats.favoriteCategory || 'None'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress and Tier Benefits */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-white/60 font-light">Progress to Next Tier</p>
                        <p className="text-white font-light">{clientProfile?.total_points || 0}/1000 points</p>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-3 mb-2">
                        <div
                            className={`h-3 rounded-full bg-gradient-to-r ${getTierColor(clientProfile?.current_tier || 'bronze')} transition-all duration-1000 ease-out`}
                            style={{ width: `${getProgressPercentage()}%` }}
                        ></div>
                    </div>
                    <p className="text-white/40 text-sm font-light">
                        {1000 - (clientProfile?.total_points || 0)} points needed •
                        ~{getDaysUntilTierUpgrade()} days until next tier
                    </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                    <h4 className="text-white font-light mb-3">Tier Benefits</h4>
                    <ul className="space-y-2">
                        {getTierBenefits(clientProfile?.current_tier || 'bronze').map((benefit, index) => (
                            <li key={index} className="text-white/60 text-sm font-light flex items-center gap-2">
                                <span className="text-emerald-400">✓</span>
                                {benefit}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Special Offers Section */}
            {specialOffers.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-2xl font-light text-white mb-4 flex items-center gap-2">
                        <span>🎁</span>
                        Special Offers
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {specialOffers.slice(0, 3).map((offer) => (
                            <div key={offer.id} className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-400/20 rounded-xl p-6 backdrop-blur-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="text-white font-light text-lg">{offer.title}</h4>
                                        <p className="text-white/60 text-sm font-light">{offer.description}</p>
                                    </div>
                                    <span className="bg-purple-400/20 text-purple-400 px-3 py-1 rounded-full text-sm font-light">
                                        {offer.discount_percentage}% OFF
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mt-4">
                                    <button
                                        onClick={() => copyPromoCode(offer.code)}
                                        className="text-white/60 hover:text-white transition-colors font-light text-sm flex items-center gap-2"
                                    >
                                        Code: {offer.code}
                                        <span>📋</span>
                                    </button>
                                    <span className="text-white/40 text-xs">
                                        Valid until {formatDate(offer.valid_until)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </>
    )
}
