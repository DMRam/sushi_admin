import { useState, useMemo, useEffect } from 'react'
import { useSales } from '../../context/SalesContext'
import { useExpenses } from '../../context/ExpensesContext'
import { useProducts } from '../../context/ProductsContext'
import { useSettings } from '../../context/SettingContext'

type AllocationSettings = {
  taxRate: number;
  reinvestmentPercentage: number;
  ownerPayPercentage: number;
  emergencyFundPercentage: number;
  monthlyOwnerSalary: number;
  useFixedSalary: boolean;
};

const fmtCurrency = (v: number, digits = 0) =>
  `$${Number.isFinite(v) ? v.toFixed(digits) : '0'}`

export default function ProfitAllocation() {
  const { getRecentSales } = useSales()
  const { getMonthlyExpenses } = useExpenses()
  const { products } = useProducts()
  const { allocationSettings: savedSettings, saveAllocationSettings, loading: settingsLoading } = useSettings()

  const [allocationSettings, setAllocationSettings] = useState({
    taxRate: 14.98,
    reinvestmentPercentage: 10,
    ownerPayPercentage: 5,
    emergencyFundPercentage: 5,
    monthlyOwnerSalary: 0,
    useFixedSalary: false
  })

  const [saving, setSaving] = useState(false)

  // Load saved settings when component mounts or settings change
  useEffect(() => {
    if (savedSettings && !settingsLoading) {
      setAllocationSettings({
        taxRate: savedSettings.taxRate || 14.98,
        reinvestmentPercentage: savedSettings.reinvestmentPercentage || 10,
        ownerPayPercentage: savedSettings.ownerPayPercentage || 5,
        emergencyFundPercentage: savedSettings.emergencyFundPercentage || 5,
        monthlyOwnerSalary: savedSettings.monthlyOwnerSalary || 0,
        useFixedSalary: savedSettings.useFixedSalary || false
      })
    }
  }, [savedSettings, settingsLoading])

  // Calculate current month's financials
  const currentMonthFinancials = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Get sales for current month
    const monthlySales = getRecentSales(30).filter(sale => {
      const saleDate = new Date(sale.saleDate)
      return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear
    })

    const totalRevenue = monthlySales.reduce((sum, sale) => sum + (sale.quantity * sale.salePrice), 0)
    const monthlyExpenses = getMonthlyExpenses()

    // Calculate COGS (Cost of Goods Sold)
    const cogs = monthlySales.reduce((sum, sale) => {
      const product = products.find(p => p.id === sale.productId)
      const costPrice = product?.costPrice || 0
      return sum + (costPrice * sale.quantity)
    }, 0)

    const grossProfit = Math.max(0, totalRevenue - cogs)
    const netProfit = grossProfit - monthlyExpenses

    return {
      totalRevenue,
      monthlyExpenses,
      cogs,
      grossProfit,
      netProfit,
      salesCount: monthlySales.length
    }
  }, [getRecentSales, getMonthlyExpenses, products])

  // Calculate profit allocation with proper percentage validation
  const profitAllocation = useMemo(() => {
    const { netProfit } = currentMonthFinancials

    if (netProfit <= 0) {
      return {
        taxes: 0,
        reinvestment: 0,
        ownerPay: 0,
        emergencyFund: 0,
        remaining: netProfit
      }
    }

    // Calculate based on settings
    let taxes = netProfit * (allocationSettings.taxRate / 100)

    // Remaining after taxes
    const profitAfterTaxes = netProfit - taxes

    let ownerPay, reinvestment, emergencyFund

    if (allocationSettings.useFixedSalary && allocationSettings.monthlyOwnerSalary > 0) {
      ownerPay = Math.min(profitAfterTaxes, allocationSettings.monthlyOwnerSalary)
      const remainingAfterSalary = profitAfterTaxes - ownerPay

      // Calculate percentages based on remaining amount
      const totalPercentage = allocationSettings.reinvestmentPercentage + allocationSettings.emergencyFundPercentage
      const scaleFactor = totalPercentage > 0 ? 100 / totalPercentage : 0

      reinvestment = remainingAfterSalary * (allocationSettings.reinvestmentPercentage / 100) * scaleFactor
      emergencyFund = remainingAfterSalary * (allocationSettings.emergencyFundPercentage / 100) * scaleFactor
    } else {
      // Normal percentage-based allocation
      const totalPercentage = allocationSettings.ownerPayPercentage +
        allocationSettings.reinvestmentPercentage +
        allocationSettings.emergencyFundPercentage

      // Scale percentages to total 100% if they don't
      const scaleFactor = totalPercentage > 0 ? 100 / totalPercentage : 1

      ownerPay = profitAfterTaxes * (allocationSettings.ownerPayPercentage / 100) * scaleFactor
      reinvestment = profitAfterTaxes * (allocationSettings.reinvestmentPercentage / 100) * scaleFactor
      emergencyFund = profitAfterTaxes * (allocationSettings.emergencyFundPercentage / 100) * scaleFactor
    }

    const remaining = profitAfterTaxes - (ownerPay + reinvestment + emergencyFund)

    return {
      taxes,
      reinvestment,
      ownerPay,
      emergencyFund,
      remaining
    }
  }, [currentMonthFinancials, allocationSettings])

  const totalAllocated = profitAllocation.taxes + profitAllocation.reinvestment +
    profitAllocation.ownerPay + profitAllocation.emergencyFund

  // Calculate total percentage for validation
  const totalPercentage = allocationSettings.ownerPayPercentage +
    allocationSettings.reinvestmentPercentage +
    allocationSettings.emergencyFundPercentage

  const handleSaveAllocation = async () => {
    setSaving(true)
    try {
      const success = await saveAllocationSettings(allocationSettings)
      if (success) {
        alert('Profit allocation settings saved successfully!')
      }
    } catch (error) {
      alert('Error saving settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Update percentage to ensure they total 100%
  const updatePercentage = (key: string, value: number) => {
    const otherKeys = ['ownerPayPercentage', 'reinvestmentPercentage', 'emergencyFundPercentage'].filter(k => k !== key)
    const currentTotal = otherKeys.reduce((sum, k) => sum + (allocationSettings[k as keyof typeof allocationSettings] as number), 0)

    // Distribute the remaining percentage among other categories
    const remainingPercentage = 100 - value
    const newSettings: AllocationSettings = { ...allocationSettings };

    if (currentTotal > 0 && remainingPercentage > 0) {
      const otherKeys = Object.keys(allocationSettings).filter(
        (k) => k !== 'taxRate' && k !== 'useFixedSalary' // example exclusions
      ) as (keyof AllocationSettings)[];

      otherKeys.forEach((k) => {
        const currentValue = allocationSettings[k];
        if (typeof currentValue === 'number') {
          const proportion = currentValue / currentTotal;
          (newSettings as any)[k] = Math.round(remainingPercentage * proportion);
        }
      });
    }

    setAllocationSettings(newSettings)
  }

  if (settingsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600 font-light">Loading allocation settings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-light text-gray-900 tracking-wide">Profit Distribution Planner</h2>
        <p className="text-gray-500 font-light mt-2">Plan how to allocate your profits for taxes, reinvestment, and personal income.</p>
      </div>

      {/* Current Month Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-light text-gray-500 tracking-wide">MONTHLY REVENUE</p>
              <p className="text-lg sm:text-xl font-light text-gray-900 mt-1">
                {fmtCurrency(currentMonthFinancials.totalRevenue)}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-sm flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-light text-gray-500 tracking-wide">MONTHLY EXPENSES</p>
              <p className="text-lg sm:text-xl font-light text-gray-900 mt-1">
                {fmtCurrency(currentMonthFinancials.monthlyExpenses)}
              </p>
            </div>
            <div className="w-8 h-8 bg-red-100 rounded-sm flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className={`bg-white border border-gray-200 rounded-lg p-4 ${currentMonthFinancials.netProfit >= 0 ? '' : 'border-red-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-light text-gray-500 tracking-wide">
                {currentMonthFinancials.netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS'}
              </p>
              <p className={`text-lg sm:text-xl font-light mt-1 ${currentMonthFinancials.netProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                {fmtCurrency(Math.abs(currentMonthFinancials.netProfit))}
              </p>
            </div>
            <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${currentMonthFinancials.netProfit >= 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
              <svg className={`w-4 h-4 ${currentMonthFinancials.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-light text-gray-500 tracking-wide">MONTHLY SALES</p>
              <p className="text-lg sm:text-xl font-light text-gray-900 mt-1">
                {currentMonthFinancials.salesCount}
              </p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-sm flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Settings Panel */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">ALLOCATION SETTINGS</h3>

          <div className="space-y-6">
            {/* Tax Rate */}
            <div>
              <label className="block text-sm font-light text-gray-700 mb-3">
                Estimated Tax Rate: <span className="font-medium">{allocationSettings.taxRate}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={allocationSettings.taxRate}
                onChange={(e) => setAllocationSettings({
                  ...allocationSettings,
                  taxRate: parseInt(e.target.value)
                })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2 font-light">
                <span>0%</span>
                <span>14.98% (Typical)</span>
                <span>50%</span>
              </div>
              <p className="text-xs text-gray-500 mt-2 font-light">
                Consult with your accountant for accurate tax rates
              </p>
            </div>

            {/* Salary Option */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="fixedSalary"
                  checked={allocationSettings.useFixedSalary}
                  onChange={(e) => setAllocationSettings({
                    ...allocationSettings,
                    useFixedSalary: e.target.checked
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="fixedSalary" className="text-sm font-light text-gray-700">
                  Set fixed monthly salary
                </label>
              </div>

              {allocationSettings.useFixedSalary && (
                <div>
                  <label className="block text-sm font-light text-gray-700 mb-2">
                    Monthly Salary Goal
                  </label>
                  <input
                    type="number"
                    value={allocationSettings.monthlyOwnerSalary}
                    onChange={(e) => setAllocationSettings({
                      ...allocationSettings,
                      monthlyOwnerSalary: Math.max(0, parseFloat(e.target.value) || 0)
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                    placeholder="0.00"
                  />
                </div>
              )}
            </div>

            {/* Percentage Allocation */}
            {!allocationSettings.useFixedSalary && (
              <div className="space-y-6">
                <h4 className="text-md font-light text-gray-900 tracking-wide">PROFIT DISTRIBUTION (AFTER TAXES)</h4>

                {[
                  {
                    key: 'ownerPayPercentage',
                    label: 'Owner Salary',
                    description: 'Your take-home pay'
                  },
                  {
                    key: 'reinvestmentPercentage',
                    label: 'Reinvestment',
                    description: 'For business growth'
                  },
                  {
                    key: 'emergencyFundPercentage',
                    label: 'Emergency Fund',
                    description: 'Safety net for slow months'
                  }
                ].map((item) => (
                  <div key={item.key} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-light text-gray-600">{item.label}</span>
                      <span className="font-light text-gray-900">
                        {allocationSettings[item.key as keyof typeof allocationSettings]}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={allocationSettings[item.key as keyof typeof allocationSettings] as number}
                      onChange={(e) => updatePercentage(item.key, parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-xs text-gray-500 font-light">
                      {item.description}
                    </div>
                  </div>
                ))}

                <div className={`text-center text-sm font-light ${totalPercentage === 100 ? 'text-green-600' : 'text-red-600'
                  }`}>
                  Total: {totalPercentage}%
                  {totalPercentage !== 100 && (
                    <span className="ml-2">⚠️ Should total 100%</span>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleSaveAllocation}
              disabled={saving}
              className={`w-full py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-light ${saving
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-gray-900 hover:bg-gray-800 text-white'
                }`}
            >
              {saving ? 'SAVING...' : 'SAVE ALLOCATION PLAN'}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">RECOMMENDED ALLOCATION</h3>

          {currentMonthFinancials.netProfit > 0 ? (
            <div className="space-y-4">
              {/* Tax Allocation */}
              <div className="p-4 rounded-sm border border-red-200 bg-red-50">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-light text-red-900">💰 Tax Reserve</div>
                    <div className="text-sm text-red-700 font-light">
                      Set aside for tax payments
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-light text-red-700">
                      {fmtCurrency(profitAllocation.taxes, 2)}
                    </div>
                    <div className="text-sm text-red-600 font-light">
                      {allocationSettings.taxRate}% of profit
                    </div>
                  </div>
                </div>
              </div>

              {/* Owner Pay */}
              <div className="p-4 rounded-sm border border-green-200 bg-green-50">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-light text-green-900">👤 Owner Salary</div>
                    <div className="text-sm text-green-700 font-light">
                      Your take-home pay
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-light text-green-700">
                      {fmtCurrency(profitAllocation.ownerPay, 2)}
                    </div>
                    {!allocationSettings.useFixedSalary && (
                      <div className="text-sm text-green-600 font-light">
                        {allocationSettings.ownerPayPercentage}% after taxes
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Reinvestment */}
              <div className="p-4 rounded-sm border border-blue-200 bg-blue-50">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-light text-blue-900">🚀 Business Reinvestment</div>
                    <div className="text-sm text-blue-700 font-light">
                      For growth and improvements
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-light text-blue-700">
                      {fmtCurrency(profitAllocation.reinvestment, 2)}
                    </div>
                    {!allocationSettings.useFixedSalary && (
                      <div className="text-sm text-blue-600 font-light">
                        {allocationSettings.reinvestmentPercentage}% after taxes
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Emergency Fund */}
              <div className="p-4 rounded-sm border border-purple-200 bg-purple-50">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-light text-purple-900">🛡️ Emergency Fund</div>
                    <div className="text-sm text-purple-700 font-light">
                      Safety net for slow months
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-light text-purple-700">
                      {fmtCurrency(profitAllocation.emergencyFund, 2)}
                    </div>
                    {!allocationSettings.useFixedSalary && (
                      <div className="text-sm text-purple-600 font-light">
                        {allocationSettings.emergencyFundPercentage}% after taxes
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-sm border border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-light text-gray-900">Total Allocated:</span>
                  <span className="font-light text-green-600">{fmtCurrency(totalAllocated, 2)}</span>
                </div>
                {Math.abs(profitAllocation.remaining) > 0.01 && (
                  <div className="flex justify-between items-center text-sm text-gray-600 mt-2">
                    <span className="font-light">Remaining (adjust percentages):</span>
                    <span className={`font-light ${profitAllocation.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmtCurrency(Math.abs(profitAllocation.remaining), 2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Monthly Salary Equivalent */}
              {profitAllocation.ownerPay > 0 && (
                <div className="text-center p-4 bg-yellow-50 rounded-sm border border-yellow-200">
                  <div className="text-sm text-yellow-800 font-light">
                    💡 This equals <strong>{fmtCurrency(profitAllocation.ownerPay / 4, 2)}/week</strong> or <strong>{fmtCurrency(profitAllocation.ownerPay / 20, 2)}/day</strong> (20 working days)
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-red-600 text-lg font-light mb-3 tracking-wide">
                {currentMonthFinancials.netProfit < 0 ? 'OPERATING AT LOSS' : 'NO PROFIT THIS MONTH'}
              </div>
              <div className="text-gray-600 font-light">
                {currentMonthFinancials.netProfit < 0 ? (
                  <div>
                    Current loss: <span className="text-red-600">{fmtCurrency(Math.abs(currentMonthFinancials.netProfit), 2)}</span>
                    <div className="mt-3 text-sm">
                      Focus on reducing costs or increasing revenue to reach profitability.
                    </div>
                  </div>
                ) : (
                  "You need to generate profit before you can allocate funds."
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Business Tips */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6">
        <h4 className="font-light text-gray-900 mb-4 tracking-wide">BUSINESS TIPS</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <strong className="font-light text-gray-900">Tax Planning:</strong>
            <ul className="list-disc list-inside mt-2 text-gray-600 space-y-1 font-light">
              <li>Set aside tax money in a separate account</li>
              <li>Pay estimated taxes quarterly</li>
              <li>Keep receipts for deductible expenses</li>
            </ul>
          </div>
          <div>
            <strong className="font-light text-gray-900">Reinvestment Ideas:</strong>
            <ul className="list-disc list-inside mt-2 text-gray-600 space-y-1 font-light">
              <li>Upgrade kitchen equipment</li>
              <li>Marketing and advertising</li>
              <li>Staff training</li>
              <li>New menu development</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}