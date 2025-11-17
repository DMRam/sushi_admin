// ClientDashboard.tsx
import { useClientAuth } from './hooks/useClientAuth'
import { RewardsTabs } from './components/RewardsTabs'
import { EnhancedHeader } from './components/EnhancedHeader'
import { useClientDashboard } from './hooks/useClientDashboard'

export default function ClientDashboard() {
    const { isClient, clientProfile, loading, setClientProfile } = useClientAuth()
    
    // Use the custom hook
    const {
        activeTab,
        setActiveTab,
        pointsHistory,
        recentOrders,
        specialOffers,
        quickReorderItems,
        loadingData,
        stats,
        isMobile,
        handleProfileUpdate,
        formatDate,
        formatCurrency
    } = useClientDashboard(clientProfile, setClientProfile)

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center overflow-hidden">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white/60 font-light tracking-wide">Loading your dashboard...</p>
                </div>
            </div>
        )
    }

    if (!isClient) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center overflow-hidden">
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
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-4 md:py-8 overflow-x-hidden">
            <div className="container mx-auto px-3 sm:px-4 max-w-7xl w-full">
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
                    isMobile={isMobile}
                    onProfileUpdate={handleProfileUpdate}
                />

                {/* Navigation Tabs */}
                <div className="flex space-x-1 bg-white/5 border border-white/10 rounded-xl p-1 mb-6 md:mb-8 backdrop-blur-sm overflow-x-auto">
                    {['overview', 'orders', 'points', 'rewards', 'quick-reorder', 'profile'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 min-w-max py-3 px-4 rounded-lg font-light transition-all duration-300 whitespace-nowrap ${activeTab === tab
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
                    setClientProfile={setClientProfile}
                    isMobile={isMobile}
                />
            </div>
        </div>
    )
}