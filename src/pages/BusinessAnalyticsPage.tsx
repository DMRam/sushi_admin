import { useState, useMemo } from 'react'
import { useProducts } from '../context/ProductsContext'
import { useSales } from '../context/SalesContext'
import { useExpenses } from '../context/ExpensesContext'
import { useIngredients } from '../context/IngredientsContext'
import { usePurchases } from '../context/PurchasesContext'

// Existing feature modules (kept as-is)
import BreakEvenAnalysis from '../components/BreakEvenAnalysis'
import SalesChart from '../components/SalesChart'
import ProfitabilityChart from '../components/ProfitabilityChart'
import ExpenseBreakdown from '../components/ExpenseBreakdown'
import ProfitAllocation from '../components/ProfitAllocation'
import QuickExpenseForm from '../components/QuickExpenseForm'

// ------------------------------
// Types & helpers
// ------------------------------

type TabId = 'overview' | 'break-even' | 'sales' | 'profitability' | 'expenses' | 'profit-allocation'

const clamp = (num: number, min = -100, max = 100) => Math.min(Math.max(num, min), max)

const fmtCurrency = (v: number, digits = 0) =>
    `$${Number.isFinite(v) ? v.toFixed(digits) : '0'}`

const foodCostColor = (pct: number) => {
    if (pct <= 30) return 'text-green-600'
    if (pct <= 35) return 'text-yellow-600'
    return 'text-red-600'
}

const badgeColorByNet = (net: number) => (net >= 0 ? 'text-green-600' : 'text-red-600')

const barWidthPct = (pct: number) => `${Math.max(0, Math.min(100, pct))}%`

// ------------------------------
// Overview subcomponents (kept in same file for simplicity)
// ------------------------------

interface Metrics {
    totalRevenue: number
    totalUnitsSold: number
    monthlyExpenses: number
    ingredientCosts: number
    grossProfit: number
    netProfit: number
    grossMargin: number
    netMargin: number
    avgSaleValue: number
    avgDailyRevenue: number
    inventoryValue: number
    totalPurchases: number
    foodCostPercentage: number
    dailyBreakEvenDishes: number
    monthlyBreakEvenDishes: number
}

const OverviewMetrics: React.FC<{ metrics: Metrics; ingredientCount: number; showQuickExpense: boolean }> = ({
    metrics,
    ingredientCount,
    showQuickExpense,
}) => (
    <div className="space-y-6">
        {showQuickExpense && <QuickExpenseForm />}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="text-sm font-semibold text-green-900">Monthly Revenue</h3>
                <p className="text-xl font-bold text-green-700">{fmtCurrency(metrics.totalRevenue)}</p>
                <p className="text-xs text-green-600 mt-1">{metrics.totalUnitsSold} dishes</p>
            </div>

            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h3 className="text-sm font-semibold text-red-900">Food Cost %</h3>
                <p className={`text-xl font-bold ${foodCostColor(metrics.foodCostPercentage)}`}>
                    {metrics.foodCostPercentage.toFixed(1)}%
                </p>
                <p className="text-xs text-red-600 mt-1">
                    {metrics.foodCostPercentage <= 30 ? 'Excellent' : metrics.foodCostPercentage <= 35 ? 'Good' : 'High'}
                </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-sm font-semibold text-blue-900">Gross Margin</h3>
                <p className="text-xl font-bold text-blue-700">{metrics.grossMargin.toFixed(0)}%</p>
                <p className="text-xs text-blue-600 mt-1">{fmtCurrency(metrics.grossProfit)}</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="text-sm font-semibold text-purple-900">Net Profit</h3>
                <p className="text-xl font-bold text-purple-700">{fmtCurrency(metrics.netProfit)}</p>
                <p className="text-xs text-purple-600 mt-1">{metrics.netMargin.toFixed(0)}% margin</p>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h3 className="text-sm font-semibold text-orange-900">Avg. Daily</h3>
                <p className="text-xl font-bold text-orange-700">{fmtCurrency(metrics.avgDailyRevenue)}</p>
                <p className="text-xs text-orange-600 mt-1">Last 30 days</p>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <h3 className="text-sm font-semibold text-indigo-900">Inventory Value</h3>
                <p className="text-xl font-bold text-indigo-700">{fmtCurrency(metrics.inventoryValue)}</p>
                <p className="text-xs text-indigo-600 mt-1">{ingredientCount} items</p>
            </div>
        </div>
    </div>
)

const PerformanceInsights: React.FC<{ metrics: Metrics }> = ({ metrics }) => {
    const netColor = metrics.netMargin >= 15 ? 'bg-green-50 border-green-200' : metrics.netMargin >= 10 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
    const netText = metrics.netMargin >= 15 ? 'text-green-600' : metrics.netMargin >= 10 ? 'text-yellow-600' : 'text-red-600'

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Restaurant Performance */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Restaurant Performance</h3>
                <div className="space-y-3">
                    {/* Food Cost Insight */}
                    <div className={`p-3 rounded-lg ${metrics.foodCostPercentage <= 30 ? 'bg-green-50 border border-green-200' : metrics.foodCostPercentage <= 35 ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex justify-between items-center">
                            <span className="font-medium">Food Cost Percentage</span>
                            <span className={`font-bold ${foodCostColor(metrics.foodCostPercentage)}`}>
                                {metrics.foodCostPercentage.toFixed(1)}%
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                            {metrics.foodCostPercentage <= 30
                                ? 'Excellent! Your food costs are well managed'
                                : metrics.foodCostPercentage <= 35
                                    ? 'Good - industry average is 28-35%'
                                    : 'High - review ingredient costs and portion sizes'}
                        </p>
                    </div>

                    {/* Profitability Insight */}
                    <div className={`p-3 rounded-lg ${netColor}`}>
                        <div className="flex justify-between items-center">
                            <span className="font-medium">Net Profitability</span>
                            <span className={`font-bold ${netText}`}>{metrics.netMargin.toFixed(1)}%</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                            {metrics.netMargin >= 15
                                ? 'Excellent profitability!'
                                : metrics.netMargin >= 10
                                    ? 'Good performance for restaurant industry'
                                    : 'Below target - review expenses and pricing'}
                        </p>
                    </div>

                    {/* Break-Even Insight */}
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="flex justify-between items-center">
                            <span className="font-medium">Daily Break-Even</span>
                            <span className="font-bold text-blue-600">
                                {metrics.dailyBreakEvenDishes > 0
                                    ? `${metrics.dailyBreakEvenDishes} dishes/day`
                                    : 'N/A'}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                            {metrics.monthlyBreakEvenDishes > 0
                                ? `Need to sell ${metrics.monthlyBreakEvenDishes} dishes monthly to break even`
                                : 'No sales or price data available yet'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
                <div className="space-y-4">
                    {/* Ingredient Costs */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span>Ingredient Costs</span>
                            <span>{fmtCurrency(metrics.ingredientCosts, 2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div className="bg-red-500 rounded-full h-3" style={{ width: barWidthPct(metrics.foodCostPercentage) }} />
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between">
                            <span>Food Cost</span>
                            <span>
                                {metrics.foodCostPercentage.toFixed(1)}% of revenue
                                {metrics.foodCostPercentage > 35 && ' ⚠️ High'}
                            </span>
                        </div>
                    </div>

                    {/* Operating Expenses */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span>Operating Expenses</span>
                            <span>{fmtCurrency(metrics.monthlyExpenses, 2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-orange-500 rounded-full h-3"
                                style={{
                                    width: barWidthPct(
                                        metrics.totalRevenue > 0
                                            ? (metrics.monthlyExpenses / metrics.totalRevenue) * 100
                                            : metrics.monthlyExpenses > 0
                                                ? 100
                                                : 0,
                                    ),
                                }}
                            />
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between">
                            <span>Rent, Labor, Utilities</span>
                            <span>
                                {metrics.totalRevenue > 0
                                    ? metrics.monthlyExpenses / metrics.totalRevenue > 1
                                        ? `Expenses are ${(metrics.monthlyExpenses / metrics.totalRevenue).toFixed(1)}x revenue`
                                        : `${((metrics.monthlyExpenses / metrics.totalRevenue) * 100).toFixed(0)}% of revenue`
                                    : metrics.monthlyExpenses > 0
                                        ? `${fmtCurrency(metrics.monthlyExpenses)}/month fixed costs`
                                        : 'No expenses recorded'}
                                {metrics.monthlyExpenses > metrics.totalRevenue && metrics.totalRevenue > 0 && ' 🔴'}
                            </span>
                        </div>
                    </div>

                    {/* Net Profit */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span>Net Profit</span>
                            <span>{fmtCurrency(metrics.netProfit, 2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div className="bg-green-500 rounded-full h-3" style={{ width: barWidthPct(clamp(metrics.netMargin)) }} />
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between">
                            <span>Your Take Home</span>
                            <span>
                                {metrics.netMargin.toFixed(1)}% of revenue
                                {metrics.netMargin < 0 && ' 🔴 Operating at loss'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cost Structure & Financial Health combined section */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Structure</h3>
                <div className="space-y-4">
                    {/* Fixed Costs */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span>Fixed Costs (Rent, etc.)</span>
                            <span>{fmtCurrency(metrics.monthlyExpenses, 2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-orange-500 rounded-full h-3"
                                style={{
                                    width: barWidthPct(
                                        metrics.totalRevenue > 0 ? (metrics.monthlyExpenses / metrics.totalRevenue) * 100 : 100,
                                    ),
                                }}
                            />
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between">
                            <span>Monthly overhead</span>
                            <span>
                                {metrics.totalRevenue > 0
                                    ? `Covers ${Math.ceil(metrics.monthlyExpenses / (metrics.avgSaleValue || 1)).toLocaleString()} dishes`
                                    : 'No sales to cover costs'}
                            </span>
                        </div>
                    </div>

                    {/* Ingredient Costs */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span>Ingredient Costs</span>
                            <span>{fmtCurrency(metrics.ingredientCosts, 2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div className="bg-red-500 rounded-full h-3" style={{ width: barWidthPct(metrics.foodCostPercentage) }} />
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between">
                            <span>Food Cost %</span>
                            <span className={foodCostColor(metrics.foodCostPercentage)}>
                                {metrics.foodCostPercentage.toFixed(1)}% (
                                {metrics.foodCostPercentage <= 30 ? 'Good' : metrics.foodCostPercentage <= 35 ? 'Average' : 'High'})
                            </span>
                        </div>
                    </div>

                    {/* Net Profit/Loss */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span>Net {metrics.netProfit >= 0 ? 'Profit' : 'Loss'}</span>
                            <span className={badgeColorByNet(metrics.netProfit)}>
                                {fmtCurrency(Math.abs(metrics.netProfit), 2)}
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className={`rounded-full h-3 ${metrics.netProfit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{
                                    width: barWidthPct(
                                        metrics.totalRevenue > 0 ? (Math.abs(metrics.netProfit) / metrics.totalRevenue) * 100 : 0,
                                    ),
                                }}
                            />
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between">
                            <span>Monthly Result</span>
                            <span>
                                {metrics.netProfit >= 0
                                    ? `${metrics.netMargin.toFixed(1)}% profit margin`
                                    : `${Math.abs(metrics.netMargin).toFixed(1)}% loss margin`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Industry Benchmarks */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Restaurant Industry Context</h4>
                    <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex justify-between">
                            <span>Typical Restaurant Rent:</span>
                            <span>5-10% of revenue</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Your Overhead vs Revenue:</span>
                            <span className={metrics.totalRevenue > 0 && metrics.monthlyExpenses / metrics.totalRevenue <= 0.1 ? 'text-green-600' : 'text-red-600'}>
                                {metrics.totalRevenue > 0
                                    ? `${((metrics.monthlyExpenses / metrics.totalRevenue) * 100).toFixed(0)}% of revenue`
                                    : 'N/A'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Break-even Timeline:</span>
                            <span>Most restaurants: 6-12 months</span>
                        </div>
                    </div>
                </div>

                {/* Financial Status */}
                <div className={`mt-6 p-4 rounded-lg border ${metrics.netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Current Financial Status</span>
                        <span className={`font-bold ${badgeColorByNet(metrics.netProfit)}`}>
                            {metrics.netProfit >= 0 ? '✅ Profitable' : '⚠️ Operating at Loss'}
                        </span>
                    </div>
                    <div className="text-sm text-gray-600">
                        {metrics.netProfit >= 0
                            ? `You're making ${fmtCurrency(metrics.netProfit)} profit monthly`
                            : `You need ${fmtCurrency(Math.abs(metrics.netProfit))} more in monthly revenue to break even`}
                    </div>
                </div>
            </div>

            {/* Industry Benchmarks (compact) */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 lg:col-span-2">
                <h4 className="font-medium text-gray-900 mb-2">Industry Benchmarks</h4>
                <div className="text-xs text-gray-600 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="flex justify-between"><span>Ideal Food Cost:</span><span>25-30%</span></div>
                    <div className="flex justify-between"><span>Avg. Net Profit (industry):</span><span>3-5%</span></div>
                    <div className="flex justify-between"><span>Healthy Net Profit:</span><span>10-15%</span></div>
                </div>
            </div>
        </div>
    )
}

// ------------------------------
// Main component
// ------------------------------

export default function BusinessAnalyticsPage() {
    const { products, loading: productsLoading } = useProducts()
    const { sales, getRecentSales, loading: salesLoading } = useSales()
    const { expenses, getMonthlyExpenses, loading: expensesLoading } = useExpenses()
    const { ingredients, loading: ingredientsLoading } = useIngredients()
    const { purchases, loading: purchasesLoading } = usePurchases()

    const [activeTab, setActiveTab] = useState<TabId>('overview')

    const loading = productsLoading || salesLoading || expensesLoading || ingredientsLoading || purchasesLoading

    // Business metrics calculations
    const metrics = useMemo((): Metrics => {
        if (loading) {
            return {
                totalRevenue: 0,
                totalUnitsSold: 0,
                monthlyExpenses: 0,
                ingredientCosts: 0,
                grossProfit: 0,
                netProfit: 0,
                grossMargin: 0,
                netMargin: 0,
                avgSaleValue: 0,
                avgDailyRevenue: 0,
                inventoryValue: 0,
                totalPurchases: 0,
                foodCostPercentage: 0,
                dailyBreakEvenDishes: 0,
                monthlyBreakEvenDishes: 0
            }
        }

        const recentSales = getRecentSales(30)
        const totalRevenue = recentSales.reduce((sum, sale) => sum + (sale.quantity * sale.salePrice), 0)
        const totalUnitsSold = recentSales.reduce((sum, sale) => sum + sale.quantity, 0)
        const monthlyExpenses = getMonthlyExpenses()

        // Calculate INGREDIENT COSTS
        const ingredientCosts = recentSales.reduce((sum, sale) => {
            const product = products.find(p => p.id === sale.productId)
            const costPrice = product?.costPrice || 0
            return sum + (costPrice * sale.quantity)
        }, 0)

        // Calculate inventory value
        const inventoryValue = ingredients.reduce((total, ingredient) => {
            return total + (ingredient.currentStock * ingredient.pricePerKg)
        }, 0)

        // Calculate break-even dishes
        const avgSaleValue = totalUnitsSold > 0 ? totalRevenue / totalUnitsSold : 0
        const avgContributionMargin = avgSaleValue > 0 ? avgSaleValue - (ingredientCosts / totalUnitsSold) : 0
        const monthlyBreakEvenDishes = avgContributionMargin > 0 ? Math.ceil(monthlyExpenses / avgContributionMargin) : 0
        const dailyBreakEvenDishes = avgSaleValue > 0 ? Math.ceil(monthlyBreakEvenDishes / 30) : 0

        const grossProfit = totalRevenue - ingredientCosts
        const netProfit = grossProfit - monthlyExpenses
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
        const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
        const foodCostPercentage = totalRevenue > 0 ? (ingredientCosts / totalRevenue) * 100 : 0

        // Average metrics
        const avgDailyRevenue = totalRevenue > 0 ? totalRevenue / 30 : 0

        return {
            totalRevenue,
            totalUnitsSold,
            monthlyExpenses,
            ingredientCosts,
            grossProfit,
            netProfit,
            grossMargin,
            netMargin,
            avgSaleValue,
            avgDailyRevenue,
            inventoryValue,
            totalPurchases: 0, // You can calculate this if needed
            foodCostPercentage,
            dailyBreakEvenDishes,
            monthlyBreakEvenDishes
        }
    }, [sales, products, expenses, ingredients, purchases, loading, getRecentSales, getMonthlyExpenses])

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-lg text-gray-600">Loading business analytics...</div>
            </div>
        )
    }

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
                                onClick={() => setActiveTab(tab.id as TabId)}
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
                        <OverviewMetrics
                            metrics={metrics}
                            ingredientCount={ingredients.length}
                            showQuickExpense={metrics.monthlyExpenses === 0}
                        />
                        <PerformanceInsights metrics={metrics} />
                    </div>
                )}

                {/* Other Tabs */}
                {activeTab === 'break-even' && <BreakEvenAnalysis />}
                {activeTab === 'sales' && <SalesChart />}
                {activeTab === 'profitability' && <ProfitabilityChart />}
                {activeTab === 'expenses' && <ExpenseBreakdown />}
                {activeTab === 'profit-allocation' && <ProfitAllocation />}
            </div>
        </div>
    )
}