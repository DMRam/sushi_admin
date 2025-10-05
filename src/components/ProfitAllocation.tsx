import React, { useState, useMemo } from 'react'
import { useSales } from '../context/SalesContext'
import { useExpenses } from '../context/ExpensesContext'
import { useProducts } from '../context/ProductsContext'

export default function ProfitAllocation() {
  const { getRecentSales } = useSales()
  const { getMonthlyExpenses, expenses } = useExpenses()
  const { products } = useProducts()

  const [allocationSettings, setAllocationSettings] = useState({
    taxRate: 25, // 25% tax rate (typical for small business)
    reinvestmentPercentage: 20, // 20% for business growth
    ownerPayPercentage: 50, // 50% for owner's salary
    emergencyFundPercentage: 5, // 5% for emergency fund
    monthlyOwnerSalary: 0, // Fixed monthly salary goal
    useFixedSalary: false
  })

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
    const monthlyExpenses = getMonthlyExpenses(currentYear, currentMonth)
    
    // Calculate COGS (Cost of Goods Sold)
    const cogs = monthlySales.reduce((sum, sale) => {
      const product = products.find(p => p.id === sale.productId)
      const costPrice = product?.costPrice || 0
      return sum + (costPrice * sale.quantity)
    }, 0)
    
    const grossProfit = totalRevenue - cogs
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

  // Calculate profit allocation
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
      
      reinvestment = remainingAfterSalary * (allocationSettings.reinvestmentPercentage / 100)
      emergencyFund = remainingAfterSalary * (allocationSettings.emergencyFundPercentage / 100)
    } else {
      ownerPay = profitAfterTaxes * (allocationSettings.ownerPayPercentage / 100)
      reinvestment = profitAfterTaxes * (allocationSettings.reinvestmentPercentage / 100)
      emergencyFund = profitAfterTaxes * (allocationSettings.emergencyFundPercentage / 100)
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

  const handleSaveAllocation = () => {
    // In a real app, you'd save this to your database
    alert('Profit allocation settings saved! This is for planning purposes.')
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Profit Distribution Planner</h2>
        <p className="text-gray-600 mb-6">
          Plan how to allocate your profits for taxes, reinvestment, and personal income.
        </p>

        {/* Current Month Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-700">
              ${currentMonthFinancials.totalRevenue.toFixed(2)}
            </div>
            <div className="text-sm text-green-600">Total Revenue</div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-700">
              ${currentMonthFinancials.monthlyExpenses.toFixed(2)}
            </div>
            <div className="text-sm text-red-600">Monthly Expenses</div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">
              ${currentMonthFinancials.netProfit.toFixed(2)}
            </div>
            <div className="text-sm text-blue-600">Net Profit</div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-700">
              {currentMonthFinancials.salesCount}
            </div>
            <div className="text-sm text-purple-600">Sales This Month</div>
          </div>
        </div>

        {/* Allocation Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Settings Panel */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Allocation Settings</h3>
            
            {/* Tax Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Tax Rate: {allocationSettings.taxRate}%
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
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>25% (Typical)</span>
                <span>50%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Consult with your accountant for accurate tax rates
              </p>
            </div>

            {/* Salary Option */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
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
                <label htmlFor="fixedSalary" className="text-sm font-medium text-gray-700">
                  Set fixed monthly salary
                </label>
              </div>
              
              {allocationSettings.useFixedSalary && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Salary Goal
                  </label>
                  <input
                    type="number"
                    value={allocationSettings.monthlyOwnerSalary}
                    onChange={(e) => setAllocationSettings({
                      ...allocationSettings,
                      monthlyOwnerSalary: parseFloat(e.target.value) || 0
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              )}
            </div>

            {/* Percentage Allocation */}
            {!allocationSettings.useFixedSalary && (
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Profit Distribution (After Taxes)</h4>
                
                {[
                  { key: 'ownerPayPercentage', label: 'Owner Salary', color: 'bg-green-500' },
                  { key: 'reinvestmentPercentage', label: 'Reinvestment', color: 'bg-blue-500' },
                  { key: 'emergencyFundPercentage', label: 'Emergency Fund', color: 'bg-purple-500' }
                ].map((item) => (
                  <div key={item.key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{item.label}</span>
                      <span>{allocationSettings[item.key as keyof typeof allocationSettings]}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={allocationSettings[item.key as keyof typeof allocationSettings] as number}
                      onChange={(e) => setAllocationSettings({
                        ...allocationSettings,
                        [item.key]: parseInt(e.target.value)
                      })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                ))}
                
                <div className="text-center text-sm text-gray-600">
                  Total: {allocationSettings.ownerPayPercentage + allocationSettings.reinvestmentPercentage + allocationSettings.emergencyFundPercentage}%
                  {allocationSettings.ownerPayPercentage + allocationSettings.reinvestmentPercentage + allocationSettings.emergencyFundPercentage !== 100 && (
                    <span className="text-red-500 ml-2">⚠️ Should total 100%</span>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleSaveAllocation}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Save Allocation Plan
            </button>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Recommended Allocation</h3>
            
            {currentMonthFinancials.netProfit > 0 ? (
              <div className="space-y-4">
                {/* Tax Allocation */}
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-red-900">💰 Tax Reserve</div>
                      <div className="text-sm text-red-700">
                        Set aside for tax payments
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-red-700">
                        ${profitAllocation.taxes.toFixed(2)}
                      </div>
                      <div className="text-sm text-red-600">
                        {allocationSettings.taxRate}% of profit
                      </div>
                    </div>
                  </div>
                </div>

                {/* Owner Pay */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-green-900">👤 Owner Salary</div>
                      <div className="text-sm text-green-700">
                        Your take-home pay
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-700">
                        ${profitAllocation.ownerPay.toFixed(2)}
                      </div>
                      {!allocationSettings.useFixedSalary && (
                        <div className="text-sm text-green-600">
                          {allocationSettings.ownerPayPercentage}% after taxes
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reinvestment */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-blue-900">🚀 Business Reinvestment</div>
                      <div className="text-sm text-blue-700">
                        For growth and improvements
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-700">
                        ${profitAllocation.reinvestment.toFixed(2)}
                      </div>
                      {!allocationSettings.useFixedSalary && (
                        <div className="text-sm text-blue-600">
                          {allocationSettings.reinvestmentPercentage}% after taxes
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Emergency Fund */}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-purple-900">🛡️ Emergency Fund</div>
                      <div className="text-sm text-purple-700">
                        Safety net for slow months
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-purple-700">
                        ${profitAllocation.emergencyFund.toFixed(2)}
                      </div>
                      {!allocationSettings.useFixedSalary && (
                        <div className="text-sm text-purple-600">
                          {allocationSettings.emergencyFundPercentage}% after taxes
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total Allocated:</span>
                    <span className="text-green-600">${totalAllocated.toFixed(2)}</span>
                  </div>
                  {profitAllocation.remaining !== 0 && (
                    <div className="flex justify-between items-center text-sm text-gray-600 mt-1">
                      <span>Remaining (adjust percentages):</span>
                      <span className={profitAllocation.remaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ${profitAllocation.remaining.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Monthly Salary Equivalent */}
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-sm text-yellow-800">
                    💡 This equals <strong>${(profitAllocation.ownerPay / 4).toFixed(2)}/week</strong> or <strong>${(profitAllocation.ownerPay / 20).toFixed(2)}/day</strong> (20 working days)
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-red-600 text-lg font-semibold mb-2">
                  No Profit This Month
                </div>
                <div className="text-gray-600">
                  You need to generate profit before you can allocate funds.
                  {currentMonthFinancials.netProfit < 0 && (
                    <div className="mt-2 text-sm">
                      Current loss: <span className="text-red-600">${Math.abs(currentMonthFinancials.netProfit).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Business Tips */}
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">💼 Smart Business Tips</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Tax Planning:</strong>
              <ul className="list-disc list-inside mt-1 text-gray-600">
                <li>Set aside tax money in a separate account</li>
                <li>Pay estimated taxes quarterly</li>
                <li>Keep receipts for deductible expenses</li>
              </ul>
            </div>
            <div>
              <strong>Reinvestment Ideas:</strong>
              <ul className="list-disc list-inside mt-1 text-gray-600">
                <li>Upgrade kitchen equipment</li>
                <li>Marketing and advertising</li>
                <li>Staff training</li>
                <li>New menu development</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}