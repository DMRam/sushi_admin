import { useState, useMemo, useEffect } from 'react'
import { useSales } from '../../../../../context/SalesContext'
import { useExpenses } from '../../../../../context/ExpensesContext'
import { useProducts } from '../../../../../context/ProductsContext'
import { useSettings } from '../../../../../context/SettingContext'
import { ProfitAllocationComponent } from './components/ProfitAllocationComponent'


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

    const totalRevenue = monthlySales.reduce((sum, sale) => sum + sale.totalAmount, 0)
    const monthlyExpenses = getMonthlyExpenses()

    // Calculate COGS (Cost of Goods Sold) - using costTotal from sales records
    const cogs = monthlySales.reduce((sum, sale) => sum + (sale.costTotal || 0), 0)

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

  // Calculate profit allocation - return the format expected by ProfitAllocationComponent
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
    const newSettings: any = { ...allocationSettings, [key]: value }

    if (currentTotal > 0 && remainingPercentage > 0) {
      otherKeys.forEach(k => {
        const currentValue = allocationSettings[k as keyof typeof allocationSettings] as number
        const proportion = currentValue / currentTotal
        newSettings[k] = Math.round(remainingPercentage * proportion)
      })
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
    <ProfitAllocationComponent
      allocationSettings={allocationSettings}
      currentMonthFinancials={currentMonthFinancials}
      fmtCurrency={fmtCurrency}
      handleSaveAllocation={handleSaveAllocation}
      profitAllocation={profitAllocation}
      saving={saving}
      setAllocationSettings={setAllocationSettings}
      totalAllocated={totalAllocated}
      totalPercentage={totalPercentage}
      updatePercentage={updatePercentage}
    />
  )
}