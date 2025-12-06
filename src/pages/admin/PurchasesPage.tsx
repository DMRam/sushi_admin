import { useState, useEffect } from 'react'
import PurchaseForm from '../../components/admin/tabs/purchases/PurchaseForm'
import { PurchaseList } from '../../components/admin/tabs/purchases/PurchaseList'
import { PurchaseStats } from '../../components/admin/tabs/purchases/PurchaseStats'

interface PurchasesPageProps {
  isMobile?: boolean
}

export default function PurchasesPage({ isMobile = false }: PurchasesPageProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'list' | 'stats'>('form')
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }
    
    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth)
      window.addEventListener('resize', handleResize)
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [])

  const isSmallScreen = windowWidth < 768
  const isMediumScreen = windowWidth >= 768 && windowWidth < 1024

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`max-w-7xl mx-auto ${isMobile ? 'px-3 py-4 sm:py-6' : 'px-4 sm:px-6 lg:px-8 py-6 lg:py-8'}`}>
        {/* Header - Responsive */}
        <div className={`${isMobile ? 'mb-4 sm:mb-6' : 'mb-6 sm:mb-8'}`}>
          <h1 className={`font-light text-gray-900 tracking-wide ${isMobile ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}>
            {isSmallScreen ? 'Purchases' : 'Purchase Management'}
          </h1>
          <p className={`text-gray-500 font-light mt-1 ${isMobile ? 'text-sm' : 'sm:text-base'}`}>
            {isSmallScreen ? 'Track inventory and costs' : 'Track inventory purchases and supplier costs'}
          </p>
        </div>

        {/* Enhanced Tabs - Responsive */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="border-b border-gray-200">
            <nav className={`-mb-px flex ${isSmallScreen ? 'space-x-4 px-3 overflow-x-auto' : 'space-x-6 lg:space-x-8 px-4 sm:px-6'}`}>
              <button
                onClick={() => setActiveTab('form')}
                className={`border-b-2 font-light tracking-wide transition-all duration-300 whitespace-nowrap ${
                  isSmallScreen ? 'py-3 px-1 text-xs' : 'py-4 px-1 text-sm'
                } ${
                  activeTab === 'form'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {isSmallScreen ? 'RECORD' : 'RECORD PURCHASE'}
              </button>
              <button
                onClick={() => setActiveTab('list')}
                className={`border-b-2 font-light tracking-wide transition-all duration-300 whitespace-nowrap ${
                  isSmallScreen ? 'py-3 px-1 text-xs' : 'py-4 px-1 text-sm'
                } ${
                  activeTab === 'list'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {isSmallScreen ? 'HISTORY' : 'PURCHASE HISTORY'}
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`border-b-2 font-light tracking-wide transition-all duration-300 whitespace-nowrap ${
                  isSmallScreen ? 'py-3 px-1 text-xs' : 'py-4 px-1 text-sm'
                } ${
                  activeTab === 'stats'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {isSmallScreen ? 'STATS' : 'STATISTICS'}
              </button>
            </nav>
          </div>

          {/* Tab Content with Animation */}
          <div className={`${isMobile ? 'p-4' : 'p-4 sm:p-6'}`}>
            {activeTab === 'form' && (
              <div className="animate-fade-in">
                <div className={`${isMobile ? 'mb-4' : 'mb-6'}`}>
                  <h2 className={`font-light text-gray-900 tracking-wide ${isMobile ? 'text-lg mb-1' : 'text-xl mb-2'}`}>
                    {isSmallScreen ? 'New Purchase' : 'Record New Purchase'}
                  </h2>
                  <p className={`text-gray-500 font-light ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    {isSmallScreen ? 'Add products quickly' : 'Quickly add products while shopping or from invoices'}
                  </p>
                </div>
                <PurchaseForm isMobile={isSmallScreen} />
              </div>
            )}
            {activeTab === 'list' && (
              <div className="animate-fade-in">
                <div className={`${isMobile ? 'mb-4' : 'mb-6'}`}>
                  <h2 className={`font-light text-gray-900 tracking-wide ${isMobile ? 'text-lg mb-1' : 'text-xl mb-2'}`}>
                    {isSmallScreen ? 'Purchase History' : 'Purchase History'}
                  </h2>
                  <p className={`text-gray-500 font-light ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    {isSmallScreen ? 'View and manage records' : 'View and manage all purchase records'}
                  </p>
                </div>
                <PurchaseList isMobile={isSmallScreen} />
              </div>
            )}
            {activeTab === 'stats' && (
              <div className="animate-fade-in">
                <div className={`${isMobile ? 'mb-4' : 'mb-6'}`}>
                  <h2 className={`font-light text-gray-900 tracking-wide ${isMobile ? 'text-lg mb-1' : 'text-xl mb-2'}`}>
                    {isSmallScreen ? 'Analytics' : 'Purchase Analytics'}
                  </h2>
                  <p className={`text-gray-500 font-light ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    {isSmallScreen ? 'Track spending patterns' : 'Track spending patterns and supplier costs'}
                  </p>
                </div>
                <PurchaseStats isMobile={isSmallScreen} />
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Bar - Responsive */}
        <div className={`mt-6 grid gap-3 sm:gap-4 ${
          isSmallScreen ? 'grid-cols-2' : 
          isMediumScreen ? 'grid-cols-2 lg:grid-cols-4' : 
          'grid-cols-4'
        }`}>
          {/* Today's Purchases */}
          <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-light tracking-wide ${isSmallScreen ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}`}>
                  TODAY'S PURCHASES
                </p>
                <p className={`font-light text-gray-900 ${isSmallScreen ? 'text-lg mt-1' : 'text-2xl mt-2'}`}>
                  $0.00
                </p>
              </div>
              <div className={`bg-gray-100 rounded-sm flex items-center justify-center flex-shrink-0 ml-2 ${
                isSmallScreen ? 'w-8 h-8' : 'w-10 h-10'
              }`}>
                <svg className={`text-gray-600 ${
                  isSmallScreen ? 'w-4 h-4' : 'w-5 h-5'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          {/* This Month */}
          <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-light tracking-wide ${isSmallScreen ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}`}>
                  THIS MONTH
                </p>
                <p className={`font-light text-gray-900 ${isSmallScreen ? 'text-lg mt-1' : 'text-2xl mt-2'}`}>
                  $0.00
                </p>
              </div>
              <div className={`bg-gray-100 rounded-sm flex items-center justify-center flex-shrink-0 ml-2 ${
                isSmallScreen ? 'w-8 h-8' : 'w-10 h-10'
              }`}>
                <svg className={`text-gray-600 ${
                  isSmallScreen ? 'w-4 h-4' : 'w-5 h-5'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Avg. Cost */}
          <div className={`bg-white border border-gray-200 rounded-lg p-3 sm:p-4 ${
            isSmallScreen ? 'hidden sm:block' : ''
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-light tracking-wide ${isSmallScreen ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}`}>
                  AVG. COST
                </p>
                <p className={`font-light text-gray-900 ${isSmallScreen ? 'text-lg mt-1' : 'text-2xl mt-2'}`}>
                  $0.00
                </p>
              </div>
              <div className={`bg-gray-100 rounded-sm flex items-center justify-center flex-shrink-0 ml-2 ${
                isSmallScreen ? 'w-8 h-8' : 'w-10 h-10'
              }`}>
                <svg className={`text-gray-600 ${
                  isSmallScreen ? 'w-4 h-4' : 'w-5 h-5'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          {/* Active Suppliers */}
          <div className={`bg-white border border-gray-200 rounded-lg p-3 sm:p-4 ${
            isSmallScreen ? 'hidden sm:block' : ''
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-light tracking-wide ${isSmallScreen ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}`}>
                  SUPPLIERS
                </p>
                <p className={`font-light text-gray-900 ${isSmallScreen ? 'text-lg mt-1' : 'text-2xl mt-2'}`}>
                  0
                </p>
              </div>
              <div className={`bg-gray-100 rounded-sm flex items-center justify-center flex-shrink-0 ml-2 ${
                isSmallScreen ? 'w-8 h-8' : 'w-10 h-10'
              }`}>
                <svg className={`text-gray-600 ${
                  isSmallScreen ? 'w-4 h-4' : 'w-5 h-5'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions for Stats Tab */}
        {activeTab === 'stats' && (
          <div className={`mt-4 sm:mt-6 grid gap-3 sm:gap-4 ${
            isSmallScreen ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-light tracking-wide ${isSmallScreen ? 'text-xs text-blue-600' : 'text-sm text-blue-600'}`}>
                    {isSmallScreen ? 'TOP SUPPLIER' : 'TOP SUPPLIER'}
                  </p>
                  <p className={`font-light text-blue-900 ${isSmallScreen ? 'text-lg mt-1' : 'text-xl sm:text-2xl mt-2'}`}>
                    -
                  </p>
                  <p className={`text-blue-500 mt-1 ${isSmallScreen ? 'text-xs' : 'text-xs'}`}>
                    {isSmallScreen ? 'By spending' : 'Highest spending this month'}
                  </p>
                </div>
                <div className={`bg-blue-100 rounded-sm flex items-center justify-center flex-shrink-0 ml-2 ${
                  isSmallScreen ? 'w-8 h-8' : 'w-10 h-10'
                }`}>
                  <svg className={`text-blue-600 ${
                    isSmallScreen ? 'w-4 h-4' : 'w-5 h-5'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-light tracking-wide ${isSmallScreen ? 'text-xs text-green-600' : 'text-sm text-green-600'}`}>
                    {isSmallScreen ? 'MONTHLY AVG' : 'MONTHLY AVERAGE'}
                  </p>
                  <p className={`font-light text-green-900 ${isSmallScreen ? 'text-lg mt-1' : 'text-xl sm:text-2xl mt-2'}`}>
                    $0.00
                  </p>
                  <p className={`text-green-500 mt-1 ${isSmallScreen ? 'text-xs' : 'text-xs'}`}>
                    {isSmallScreen ? 'Purchase spending' : 'Average monthly spending'}
                  </p>
                </div>
                <div className={`bg-green-100 rounded-sm flex items-center justify-center flex-shrink-0 ml-2 ${
                  isSmallScreen ? 'w-8 h-8' : 'w-10 h-10'
                }`}>
                  <svg className={`text-green-600 ${
                    isSmallScreen ? 'w-4 h-4' : 'w-5 h-5'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-light tracking-wide ${isSmallScreen ? 'text-xs text-purple-600' : 'text-sm text-purple-600'}`}>
                    {isSmallScreen ? 'COST TREND' : 'COST TREND'}
                  </p>
                  <p className={`font-light text-purple-900 ${isSmallScreen ? 'text-lg mt-1' : 'text-xl sm:text-2xl mt-2'}`}>
                    -
                  </p>
                  <p className={`text-purple-500 mt-1 ${isSmallScreen ? 'text-xs' : 'text-xs'}`}>
                    {isSmallScreen ? 'Price changes' : 'Price fluctuation analysis'}
                  </p>
                </div>
                <div className={`bg-purple-100 rounded-sm flex items-center justify-center flex-shrink-0 ml-2 ${
                  isSmallScreen ? 'w-8 h-8' : 'w-10 h-10'
                }`}>
                  <svg className={`text-purple-600 ${
                    isSmallScreen ? 'w-4 h-4' : 'w-5 h-5'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
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