import { useState, useEffect } from 'react'
import SalesEntryForm from '../components/SalesEntryForm'
import SalesHistory from '../components/SalesHistory'

export default function SalesTrackingPage() {
  const [activeTab, setActiveTab] = useState<'entry' | 'history'>('entry')

  useEffect(() => {
    console.log('🔍 SalesTrackingPage mounted - activeTab:', activeTab)
  }, [activeTab])

  console.log('🎯 SalesTrackingPage rendering')

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Sales Tracking</h1>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('entry')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'entry'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Record Sales
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Sales History
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'entry' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Record New Sale</h2>
            <SalesEntryForm />
          </div>
        )}
        {activeTab === 'history' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Sales History</h2>
            <SalesHistory />
          </div>
        )}
      </div>
    </div>
  )
}