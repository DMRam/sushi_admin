import React, { useState, useMemo } from 'react'
import { useProducts } from '../context/ProductsContext'
import { useSales } from '../context/SalesContext'
import { useExpenses } from '../context/ExpensesContext'
import BreakEvenAnalysis from '../components/BreakEvenAnalysis'
import SalesChart from '../components/SalesChart'
import ProfitabilityChart from '../components/ProfitabilityChart'
import ExpenseBreakdown from '../components/ExpenseBreakdown'
import ProfitAllocation from '../components/ProfitAllocation'
import QuickExpenseForm from '../components/QuickExpenseForm'

export default function BusinessAnalyticsPage() {
    const { products } = useProducts()
    const { sales, getRecentSales } = useSales()
    const { expenses, getMonthlyExpenses } = useExpenses()

    // Update the state type to include 'profit-allocation'
    const [activeTab, setActiveTab] = useState<'overview' | 'break-even' | 'sales' | 'profitability' | 'expenses' | 'profit-allocation'>('overview')

    // Business metrics calculations
    const metrics = useMemo(() => {
        const recentSales = getRecentSales(30) // Last 30 days
        const totalRevenue = recentSales.reduce((sum, sale) => sum + (sale.quantity * sale.salePrice), 0)
        const totalUnitsSold = recentSales.reduce((sum, sale) => sum + sale.quantity, 0)
        const monthlyExpenses = getMonthlyExpenses()

        // Calculate COGS (Cost of Goods Sold)
        const cogs = recentSales.reduce((sum, sale) => {
            const product = products.find(p => p.id === sale.productId)
            const costPrice = product?.costPrice || 0
            return sum + (costPrice * sale.quantity)
        }, 0)

        const grossProfit = totalRevenue - cogs
        const netProfit = grossProfit - monthlyExpenses
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
        const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

        // Average metrics
        const avgSaleValue = totalUnitsSold > 0 ? totalRevenue / totalUnitsSold : 0
        const avgDailyRevenue = totalRevenue / 30 // Last 30 days

        return {
            totalRevenue,
            totalUnitsSold,
            monthlyExpenses,
            cogs,
            grossProfit,
            netProfit,
            grossMargin,
            netMargin,
            avgSaleValue,
            avgDailyRevenue
        }
    }, [sales, products, expenses, getRecentSales, getMonthlyExpenses])

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Business Analytics Dashboard</h1>

                {/* Navigation Tabs */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        {[
                            { id: 'overview', name: 'Overview' },
                            { id: 'break-even', name: 'Break-Even Analysis' },
                            { id: 'sales', name: 'Sales Analytics' },
                            { id: 'profitability', name: 'Profitability' },
                            { id: 'expenses', name: 'Expense Breakdown' },
                            { id: 'profit-allocation', name: 'Profit Distribution' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">

                        {/* Quick Expense Form Prompt */}
                        {metrics.monthlyExpenses === 0 && (
                            <QuickExpenseForm />
                        )}
                        {/* Key Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <h3 className="text-lg font-semibold text-green-900">Monthly Revenue</h3>
                                <p className="text-2xl font-bold text-green-700">${metrics.totalRevenue.toFixed(2)}</p>
                                <p className="text-sm text-green-600 mt-1">{metrics.totalUnitsSold} units</p>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h3 className="text-lg font-semibold text-blue-900">Gross Margin</h3>
                                <p className="text-2xl font-bold text-blue-700">{metrics.grossMargin.toFixed(1)}%</p>
                                <p className="text-sm text-blue-600 mt-1">${metrics.grossProfit.toFixed(2)}</p>
                            </div>

                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                <h3 className="text-lg font-semibold text-purple-900">Net Profit</h3>
                                <p className="text-2xl font-bold text-purple-700">${metrics.netProfit.toFixed(2)}</p>
                                <p className="text-sm text-purple-600 mt-1">{metrics.netMargin.toFixed(1)}% margin</p>
                            </div>

                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                <h3 className="text-lg font-semibold text-orange-900">Avg. Daily</h3>
                                <p className="text-2xl font-bold text-orange-700">${metrics.avgDailyRevenue.toFixed(2)}</p>
                                <p className="text-sm text-orange-600 mt-1">Last 30 days</p>
                            </div>
                        </div>

                        {/* Quick Insights */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-lg border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
                                <div className="space-y-3">
                                    <div className={`p-3 rounded-lg ${metrics.netMargin >= 20 ? 'bg-green-50 border border-green-200' :
                                        metrics.netMargin >= 10 ? 'bg-yellow-50 border border-yellow-200' :
                                            'bg-red-50 border border-red-200'
                                        }`}>
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">Net Profitability</span>
                                            <span className={`font-bold ${metrics.netMargin >= 20 ? 'text-green-600' :
                                                metrics.netMargin >= 10 ? 'text-yellow-600' :
                                                    'text-red-600'
                                                }`}>
                                                {metrics.netMargin.toFixed(1)}%
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {metrics.netMargin >= 20 ? 'Excellent! Strong profitability' :
                                                metrics.netMargin >= 10 ? 'Good performance' :
                                                    'Needs improvement - review costs'}
                                        </p>
                                    </div>

                                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">Break-Even Point</span>
                                            <span className="font-bold text-blue-600">
                                                {Math.ceil(metrics.monthlyExpenses / metrics.avgSaleValue)} units/day
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">
                                            You need to sell {(metrics.monthlyExpenses / metrics.avgSaleValue).toFixed(1)} units monthly to break even
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-lg border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Structure</h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>Food Costs (COGS)</span>
                                            <span>${metrics.cogs.toFixed(2)}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-red-500 rounded-full h-2"
                                                style={{ width: `${(metrics.cogs / metrics.totalRevenue) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>Operating Expenses</span>
                                            <span>${metrics.monthlyExpenses.toFixed(2)}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-orange-500 rounded-full h-2"
                                                style={{ width: `${(metrics.monthlyExpenses / metrics.totalRevenue) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>Net Profit</span>
                                            <span>${metrics.netProfit.toFixed(2)}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-green-500 rounded-full h-2"
                                                style={{ width: `${(metrics.netProfit / metrics.totalRevenue) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Break-Even Analysis Tab */}
                {activeTab === 'break-even' && <BreakEvenAnalysis />}

                {/* Sales Analytics Tab */}
                {activeTab === 'sales' && <SalesChart />}

                {/* Profitability Tab */}
                {activeTab === 'profitability' && <ProfitabilityChart />}

                {/* Expenses Tab */}
                {activeTab === 'expenses' && <ExpenseBreakdown />}

                {/* Profit Allocation Tab */}
                {activeTab === 'profit-allocation' && <ProfitAllocation />}
            </div>
        </div>
    )
}