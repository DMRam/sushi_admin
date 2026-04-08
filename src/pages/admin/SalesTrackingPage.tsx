import { useMemo, useState } from 'react'
import FloorOrdersTab from '../../components/admin/service/FloorOrdersTab'
import KitchenTab from '../../components/admin/service/KitchenTab'
import PaymentsTab from '../../components/admin/service/PaymentsTab'
import CloverSyncTab from '../../components/admin/service/CloverSyncTab'

type ActiveTab = 'floor' | 'kitchen' | 'payments' | 'clover'

const TABS: Array<{
  key: ActiveTab
  shortLabel: string
  label: string
}> = [
    { key: 'floor', shortLabel: 'Floor', label: 'Floor Orders' },
    { key: 'kitchen', shortLabel: 'Kitchen', label: 'Kitchen' },
    { key: 'payments', shortLabel: 'Payments', label: 'Payments' },
    { key: 'clover', shortLabel: 'Clover', label: 'Clover Sync' },
  ]

function tabButtonClass(active: boolean) {
  return [
    'relative shrink-0 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
    'sm:px-5 sm:py-3',
    active
      ? 'bg-gray-900 text-white shadow-sm'
      : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 hover:text-gray-900',
  ].join(' ')
}

function renderTabContent(activeTab: ActiveTab) {
  switch (activeTab) {
    case 'floor':
      return (
        <div className="animate-fade-in">
          <FloorOrdersTab />
        </div>
      )

    case 'kitchen':
      return (
        <KitchenTab />
      )

    case 'payments':
      return (
        <div className="animate-fade-in">
          <PaymentsTab />
        </div>
      )

    case 'clover':
      return (
        <div className="animate-fade-in">
          <CloverSyncTab />
        </div>
      )

    default:
      return null
  }
}

export default function SalesTrackingPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('floor')

  const activeTabMeta = useMemo(
    () => TABS.find((tab) => tab.key === activeTab),
    [activeTab]
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="w-full px-0 py-0 sm:px-0 sm:py-0">
        <header className="mb-4 rounded-[28px] border border-gray-200 bg-white px-4 py-5 shadow-sm sm:mb-6 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                Restaurant Admin
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
                Restaurant Operations
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-base">
                Manage dine-in orders, kitchen handoff, payments, and Clover references
                from one place.
              </p>
            </div>

            <div className="inline-flex w-fit items-center rounded-2xl bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600">
              Active section: {activeTabMeta?.label}
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm">
          <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
            <div className="px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
              <div className="no-scrollbar flex gap-2 overflow-x-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={tabButtonClass(activeTab === tab.key)}
                    aria-pressed={activeTab === tab.key}
                  >
                    <span className="sm:hidden">{tab.shortLabel}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="min-h-[420px] bg-white p-3 sm:p-4 lg:p-6">
            {renderTabContent(activeTab)}
          </div>
        </section>
      </div>

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.28s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }

        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}