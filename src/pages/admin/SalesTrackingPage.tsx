import { useState, useEffect } from 'react'
import SalesEntryForm from '../../components/admin/tabs/sales_tracking/SalesEntryForm'
import SalesHistory from '../../components/admin/tabs/sales_tracking/SalesHistory'


export default function SalesTrackingPage() {
  const [activeTab, setActiveTab] = useState<'entry' | 'history'>('entry')

  useEffect(() => {
    console.log('🔍 SalesTrackingPage mounted - activeTab:', activeTab)
  }, [activeTab])

  console.log('🎯 SalesTrackingPage rendering')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-gray-900 tracking-wide">Sales Tracking</h1>
          <p className="text-gray-500 font-light mt-2">Manage and monitor your restaurant sales</p>
        </div>

        {/* Enhanced Tabs */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('entry')}
                className={`py-4 px-1 border-b-2 font-light text-sm tracking-wide transition-all duration-300 ${activeTab === 'entry'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                RECORD SALES
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-light text-sm tracking-wide transition-all duration-300 ${activeTab === 'history'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                SALES HISTORY
              </button>
            </nav>
          </div>

          {/* Tab Content with Animation */}
          <div className="p-6">
            {activeTab === 'entry' && (
              <div className="animate-fade-in">
                <div className="mb-6">
                  <h2 className="text-xl font-light text-gray-900 tracking-wide mb-2">Record New Sale</h2>
                  <p className="text-gray-500 font-light text-sm">Enter sales data for today's transactions</p>
                </div>
                <SalesEntryForm />
              </div>
            )}
            {activeTab === 'history' && (
              <div className="animate-fade-in">
                <div className="mb-6">
                  <h2 className="text-xl font-light text-gray-900 tracking-wide mb-2">Sales History</h2>
                  <p className="text-gray-500 font-light text-sm">View and analyze past sales performance</p>
                </div>
                <SalesHistory />
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Bar (Optional Enhancement) */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-500 tracking-wide">TODAY'S SALES</p>
                <p className="text-2xl font-light text-gray-900 mt-2">$0.00</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-sm flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-500 tracking-wide">THIS WEEK</p>
                <p className="text-2xl font-light text-gray-900 mt-2">$0.00</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-sm flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-500 tracking-wide">AVG. ORDER</p>
                <p className="text-2xl font-light text-gray-900 mt-2">$0.00</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-sm flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}