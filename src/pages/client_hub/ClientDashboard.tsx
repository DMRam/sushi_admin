import { Link } from 'react-router-dom'
import {
    CalendarDays,
    Gift,
    History,
    LayoutDashboard,
    ReceiptText,
    RefreshCw,
    User,
} from 'lucide-react'

import { useClientAuth } from './hooks/useClientAuth'
import { RewardsTabs } from './components/RewardsTabs'
import { EnhancedHeader } from './components/EnhancedHeader'
import { useClientDashboard } from './hooks/useClientDashboard'
import logo from '../../assets/logo/final/maisushi-logo-white.svg'

const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'booking', label: 'Booking', icon: CalendarDays },
    { id: 'orders', label: 'Orders', icon: ReceiptText },
    { id: 'points', label: 'Points', icon: History },
    { id: 'rewards', label: 'Rewards', icon: Gift },
    { id: 'quick-reorder', label: 'Reorder', icon: RefreshCw },
    { id: 'profile', label: 'Profile', icon: User },
]

export default function ClientDashboard() {
    const { isClient, clientProfile, loading, setClientProfile } = useClientAuth()

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
        formatCurrency,
    } = useClientDashboard(clientProfile, setClientProfile)

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] text-white">
                <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 text-center">
                    <img src={logo} alt="MaiSushi" className="mb-7 h-20 w-auto" />
                    <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-[#F45D4F]" />
                    <p className="mt-5 text-sm font-medium uppercase tracking-[0.18em] text-white/48">
                        Loading your account
                    </p>
                </div>
            </div>
        )
    }

    if (!isClient) {
        return (
            <div className="min-h-screen bg-[#050505] text-white">
                <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-5 text-center">
                    <img src={logo} alt="MaiSushi" className="mb-8 h-20 w-auto" />
                    <div className="mb-5 inline-flex items-center gap-2 border border-[#F45D4F]/35 bg-[#F45D4F]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#ff8a7b]">
                        <User size={16} />
                        Customer account
                    </div>
                    <h1 className="text-4xl font-semibold tracking-tight">Sign in to continue</h1>
                    <p className="mt-4 max-w-md text-sm leading-6 text-white/58">
                        Access rewards, order history, profile details, and faster checkout from one MaiSushi account.
                    </p>
                    <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
                        <Link
                            to="/client-login"
                            className="bg-[#F45D4F] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#de4f43]"
                        >
                            Sign in
                        </Link>
                        <Link
                            to="/client-register"
                            className="border border-white/14 px-5 py-4 text-sm font-semibold text-white/72 transition hover:bg-white/8 hover:text-white"
                        >
                            Create account
                        </Link>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(244,93,79,0.18),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.06),transparent_28%)]" />
            <div className="relative mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-10">
                <header className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                    <Link to="/" className="inline-flex items-center">
                        <img src={logo} alt="MaiSushi" className="h-14 w-auto" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link
                            to="/order"
                            className="hidden bg-[#F45D4F] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#de4f43] sm:inline-flex"
                        >
                            Order
                        </Link>
                    </div>
                </header>

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

                <nav className="mb-5 overflow-x-auto border border-white/10 bg-white/[0.035] p-1">
                    <div className="flex min-w-max gap-1">
                        {tabs.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setActiveTab(id)}
                                className={[
                                    'inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] transition',
                                    activeTab === id
                                        ? 'bg-white text-slate-950'
                                        : 'text-white/58 hover:bg-white/8 hover:text-white',
                                ].join(' ')}
                            >
                                <Icon size={16} />
                                {label}
                            </button>
                        ))}
                    </div>
                </nav>

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
