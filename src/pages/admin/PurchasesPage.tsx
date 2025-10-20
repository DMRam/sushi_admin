import { useState } from 'react'
import PurchaseForm from '../../components/admin/tabs/purchases/PurchaseForm'
import { PurchaseList } from '../../components/admin/tabs/purchases/PurchaseList'
import { PurchaseStats } from '../../components/admin/tabs/purchases/PurchaseStats'


export default function PurchasesPage() {
  const [activeTab, setActiveTab] = useState<'form' | 'list' | 'stats'>('form')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-gray-900 tracking-wide">Purchase Management</h1>
          <p className="text-gray-500 font-light mt-2">Track inventory purchases and supplier costs</p>
        </div>

        {/* Enhanced Tabs */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('form')}
                className={`py-4 px-1 border-b-2 font-light text-sm tracking-wide transition-all duration-300 ${activeTab === 'form'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                RECORD PURCHASE
              </button>
              <button
                onClick={() => setActiveTab('list')}
                className={`py-4 px-1 border-b-2 font-light text-sm tracking-wide transition-all duration-300 ${activeTab === 'list'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                PURCHASE HISTORY
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`py-4 px-1 border-b-2 font-light text-sm tracking-wide transition-all duration-300 ${activeTab === 'stats'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                STATISTICS
              </button>
            </nav>
          </div>

          {/* Tab Content with Animation */}
          <div className="p-6">
            {activeTab === 'form' && (
              <div className="animate-fade-in">
                <div className="mb-6">
                  <h2 className="text-xl font-light text-gray-900 tracking-wide mb-2">Record New Purchase</h2>
                  <p className="text-gray-500 font-light text-sm">Quickly add products while shopping or from invoices</p>
                </div>
                <PurchaseForm />
              </div>
            )}
            {activeTab === 'list' && (
              <div className="animate-fade-in">
                <div className="mb-6">
                  <h2 className="text-xl font-light text-gray-900 tracking-wide mb-2">Purchase History</h2>
                  <p className="text-gray-500 font-light text-sm">View and manage all purchase records</p>
                </div>
                <PurchaseList />
              </div>
            )}
            {activeTab === 'stats' && (
              <div className="animate-fade-in">
                <div className="mb-6">
                  <h2 className="text-xl font-light text-gray-900 tracking-wide mb-2">Purchase Analytics</h2>
                  <p className="text-gray-500 font-light text-sm">Track spending patterns and supplier costs</p>
                </div>
                <PurchaseStats />
              </div>
            )}
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