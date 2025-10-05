import React, { useState } from 'react'
import PurchaseForm from '../components/PurchaseForm'
import { PurchaseList } from '../components/PurchaseList'
import { PurchaseStats } from '../components/PurchaseStats'


export default function PurchasesPage() {
  const [activeTab, setActiveTab] = useState<'form' | 'list' | 'stats'>('form')

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Purchase Management</h1>
        
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('form')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'form'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Record Purchase
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'list'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Purchase History
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Statistics
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'form' && <PurchaseForm />}
        {activeTab === 'list' && <PurchaseList />}
        {activeTab === 'stats' && <PurchaseStats />}
      </div>
    </div>
  )
}