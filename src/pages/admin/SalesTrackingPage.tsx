import { useState, useEffect } from 'react'
import SalesEntryForm from '../../components/admin/tabs/sales_tracking/SalesEntryForm'
import SalesHistory from '../../components/admin/tabs/sales_tracking/SalesHistory'
import { OwnerRewardsDashboard } from '../../components/admin/tabs/maisuchi_rewards/reward_screen/OwnerRewardsDashboard'

export default function SalesTrackingPage() {
  const [activeTab, setActiveTab] = useState<'entry' | 'history' | 'rewards'>('entry')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    console.log('🔍 SalesTrackingPage mounted - activeTab:', activeTab)
    
    // Check if mobile on mount and on resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [activeTab])

  console.log('🎯 SalesTrackingPage rendering')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header - Responsive */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-light text-gray-900 tracking-wide">Business Management</h1>
          <p className="text-gray-500 font-light mt-1 sm:mt-2 text-sm sm:text-base">
            Manage sales, track performance, and handle rewards
          </p>
        </div>

        {/* Enhanced Tabs - Responsive */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-2 sm:space-x-4 lg:space-x-8 px-3 sm:px-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('entry')}
                className={`py-3 sm:py-4 px-1 sm:px-2 lg:px-1 border-b-2 font-light text-xs sm:text-sm tracking-wide transition-all duration-300 whitespace-nowrap ${activeTab === 'entry'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {isMobile ? 'SALES' : 'RECORD SALES'}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-3 sm:py-4 px-1 sm:px-2 lg:px-1 border-b-2 font-light text-xs sm:text-sm tracking-wide transition-all duration-300 whitespace-nowrap ${activeTab === 'history'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {isMobile ? 'HISTORY' : 'SALES HISTORY'}
              </button>
              <button
                onClick={() => setActiveTab('rewards')}
                className={`py-3 sm:py-4 px-1 sm:px-2 lg:px-1 border-b-2 font-light text-xs sm:text-sm tracking-wide transition-all duration-300 whitespace-nowrap ${activeTab === 'rewards'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {isMobile ? 'REWARDS' : 'REWARDS MANAGEMENT'}
              </button>
            </nav>
          </div>

          {/* Tab Content with Animation */}
          <div className="p-4 sm:p-6">
            {activeTab === 'entry' && (
              <div className="animate-fade-in">
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl font-light text-gray-900 tracking-wide mb-1 sm:mb-2">
                    {isMobile ? 'New Sale' : 'Record New Sale'}
                  </h2>
                  <p className="text-gray-500 font-light text-xs sm:text-sm">
                    {isMobile ? 'Enter today\'s sales data' : 'Enter sales data for today\'s transactions'}
                  </p>
                </div>
                <SalesEntryForm isMobile={isMobile} />
              </div>
            )}
            {activeTab === 'history' && (
              <div className="animate-fade-in">
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl font-light text-gray-900 tracking-wide mb-1 sm:mb-2">
                    Sales History
                  </h2>
                  <p className="text-gray-500 font-light text-xs sm:text-sm">
                    {isMobile ? 'View past sales' : 'View and analyze past sales performance'}
                  </p>
                </div>
                <SalesHistory isMobile={isMobile} />
              </div>
            )}
            {activeTab === 'rewards' && (
              <div className="animate-fade-in">
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl font-light text-gray-900 tracking-wide mb-1 sm:mb-2">
                    {isMobile ? 'Rewards' : 'Rewards Management'}
                  </h2>
                  <p className="text-gray-500 font-light text-xs sm:text-sm">
                    {isMobile ? 'Manage customer rewards' : 'Manage customer rewards and redemption'}
                  </p>
                </div>
                <OwnerRewardsDashboard isMobile={isMobile} />
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Bar - Enhanced with Responsive Grid */}
        <div className="mt-6 sm:mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-light text-gray-500 tracking-wide">
                  {isMobile ? 'TODAY' : 'TODAY\'S SALES'}
                </p>
                <p className="text-lg sm:text-2xl font-light text-gray-900 mt-1 sm:mt-2">$0.00</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-sm flex items-center justify-center flex-shrink-0 ml-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-light text-gray-500 tracking-wide">
                  {isMobile ? 'THIS WEEK' : 'THIS WEEK'}
                </p>
                <p className="text-lg sm:text-2xl font-light text-gray-900 mt-1 sm:mt-2">$0.00</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-sm flex items-center justify-center flex-shrink-0 ml-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-light text-gray-500 tracking-wide">
                  {isMobile ? 'AVG ORDER' : 'AVG. ORDER'}
                </p>
                <p className="text-lg sm:text-2xl font-light text-gray-900 mt-1 sm:mt-2">$0.00</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-sm flex items-center justify-center flex-shrink-0 ml-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-light text-gray-500 tracking-wide">
                  {isMobile ? 'REWARDS' : 'ACTIVE REWARDS'}
                </p>
                <p className="text-lg sm:text-2xl font-light text-gray-900 mt-1 sm:mt-2">0</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-sm flex items-center justify-center flex-shrink-0 ml-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Rewards Quick Actions - Conditional & Responsive */}
        {activeTab === 'rewards' && (
          <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-light text-blue-600 tracking-wide truncate">
                    {isMobile ? 'PENDING' : 'PENDING REDEMPTIONS'}
                  </p>
                  <p className="text-lg sm:text-2xl font-light text-blue-900 mt-1 sm:mt-2">0</p>
                  <p className="text-xs text-blue-500 mt-1 truncate">
                    {isMobile ? 'Ready for use' : 'Ready for in-store use'}
                  </p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-sm flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-light text-green-600 tracking-wide truncate">
                    {isMobile ? 'REDEEMED' : 'TOTAL REDEEMED'}
                  </p>
                  <p className="text-lg sm:text-2xl font-light text-green-900 mt-1 sm:mt-2">0</p>
                  <p className="text-xs text-green-500 mt-1 truncate">
                    {isMobile ? 'All-time' : 'All-time redemptions'}
                  </p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-sm flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-light text-purple-600 tracking-wide truncate">
                    {isMobile ? 'POINTS' : 'POINTS DISTRIBUTED'}
                  </p>
                  <p className="text-lg sm:text-2xl font-light text-purple-900 mt-1 sm:mt-2">0</p>
                  <p className="text-xs text-purple-500 mt-1 truncate">
                    {isMobile ? 'Loyalty points' : 'Customer loyalty points'}
                  </p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-sm flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        /* Hide scrollbar for tabs on mobile but keep functionality */
        .overflow-x-auto::-webkit-scrollbar {
          display: none;
        }
        .overflow-x-auto {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}