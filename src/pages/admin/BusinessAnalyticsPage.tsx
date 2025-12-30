import { useState, useMemo } from 'react'
import { useProducts } from '../../context/ProductsContext'
import { useSales } from '../../context/SalesContext'
import { useExpenses } from '../../context/ExpensesContext'
import { useIngredients } from '../../context/IngredientsContext'
import { usePurchases } from '../../context/PurchasesContext'
import BreakEvenAnalysis from '../../components/admin/BreakEvenAnalysis'
import ProfitabilityChart from '../../components/admin/tabs/business_analytics/ProfitabilityChart'
import ExpenseBreakdown from '../../components/admin/tabs/business_analytics/ExpenseBreakdown'
import ProfitAllocation from '../../components/admin/tabs/business_analytics/profit_allocations/ProfitAllocation'
import QuickExpenseForm from '../../components/admin/tabs/business_analytics/QuickExpenseForm'
import SalesChart from '../../components/admin/tabs/sales_tracking/SalesChart'

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
// Overview subcomponents
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
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-light text-gray-500 tracking-wide">MONTHLY REVENUE</p>
                        <p className="text-lg sm:text-xl font-light text-gray-900 mt-1">{fmtCurrency(metrics.totalRevenue)}</p>
                        <p className="text-xs text-gray-500 mt-1 font-light">{metrics.totalUnitsSold} dishes</p>
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
                        <p className="text-xs font-light text-gray-500 tracking-wide">FOOD COST %</p>
                        <p className={`text-lg sm:text-xl font-light ${foodCostColor(metrics.foodCostPercentage)} mt-1`}>
                            {metrics.foodCostPercentage.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1 font-light">
                            {metrics.foodCostPercentage <= 30 ? 'Excellent' : metrics.foodCostPercentage <= 35 ? 'Good' : 'High'}
                        </p>
                    </div>
                    <div className="w-8 h-8 bg-red-100 rounded-sm flex items-center justify-center">
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-light text-gray-500 tracking-wide">GROSS MARGIN</p>
                        <p className="text-lg sm:text-xl font-light text-blue-600 mt-1">{metrics.grossMargin.toFixed(0)}%</p>
                        <p className="text-xs text-gray-500 mt-1 font-light">{fmtCurrency(metrics.grossProfit)}</p>
                    </div>
                    <div className="w-8 h-8 bg-blue-100 rounded-sm flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-light text-gray-500 tracking-wide">NET PROFIT</p>
                        <p className="text-lg sm:text-xl font-light text-purple-600 mt-1">{fmtCurrency(metrics.netProfit)}</p>
                        <p className="text-xs text-gray-500 mt-1 font-light">{metrics.netMargin.toFixed(0)}% margin</p>
                    </div>
                    <div className="w-8 h-8 bg-purple-100 rounded-sm flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-light text-gray-500 tracking-wide">AVG DAILY</p>
                        <p className="text-lg sm:text-xl font-light text-orange-600 mt-1">{fmtCurrency(metrics.avgDailyRevenue)}</p>
                        <p className="text-xs text-gray-500 mt-1 font-light">Last 30 days</p>
                    </div>
                    <div className="w-8 h-8 bg-orange-100 rounded-sm flex items-center justify-center">
                        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-light text-gray-500 tracking-wide">INVENTORY VALUE</p>
                        <p className="text-lg sm:text-xl font-light text-indigo-600 mt-1">{fmtCurrency(metrics.inventoryValue)}</p>
                        <p className="text-xs text-gray-500 mt-1 font-light">{ingredientCount} items</p>
                    </div>
                    <div className="w-8 h-8 bg-indigo-100 rounded-sm flex items-center justify-center">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    </div>
)

const PerformanceInsights: React.FC<{ metrics: Metrics }> = ({ metrics }) => {
    const netColor = metrics.netMargin >= 15 ? 'bg-green-50 border-green-200' : metrics.netMargin >= 10 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
    const netText = metrics.netMargin >= 15 ? 'text-green-600' : metrics.netMargin >= 10 ? 'text-yellow-600' : 'text-red-600'

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Restaurant Performance */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">RESTAURANT PERFORMANCE</h3>
                <div className="space-y-3">
                    {/* Food Cost Insight */}
                    <div className={`p-3 rounded-sm border ${metrics.foodCostPercentage <= 30 ? 'bg-green-50 border-green-200' : metrics.foodCostPercentage <= 35 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex justify-between items-center">
                            <span className="font-light text-gray-900">Food Cost Percentage</span>
                            <span className={`font-light ${foodCostColor(metrics.foodCostPercentage)}`}>
                                {metrics.foodCostPercentage.toFixed(1)}%
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 font-light">
                            {metrics.foodCostPercentage <= 30
                                ? 'Excellent! Your food costs are well managed'
                                : metrics.foodCostPercentage <= 35
                                    ? 'Good - industry average is 28-35%'
                                    : 'High - review ingredient costs and portion sizes'}
                        </p>
                    </div>

                    {/* Profitability Insight */}
                    <div className={`p-3 rounded-sm border ${netColor}`}>
                        <div className="flex justify-between items-center">
                            <span className="font-light text-gray-900">Net Profitability</span>
                            <span className={`font-light ${netText}`}>{metrics.netMargin.toFixed(1)}%</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 font-light">
                            {metrics.netMargin >= 15
                                ? 'Excellent profitability!'
                                : metrics.netMargin >= 10
                                    ? 'Good performance for restaurant industry'
                                    : 'Below target - review expenses and pricing'}
                        </p>
                    </div>

                    {/* Break-Even Insight */}
                    <div className="p-3 rounded-sm bg-blue-50 border border-blue-200">
                        <div className="flex justify-between items-center">
                            <span className="font-light text-gray-900">Daily Break-Even</span>
                            <span className="font-light text-blue-600">
                                {metrics.dailyBreakEvenDishes > 0
                                    ? `${metrics.dailyBreakEvenDishes} dishes/day`
                                    : 'N/A'}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 font-light">
                            {metrics.monthlyBreakEvenDishes > 0
                                ? `Need to sell ${metrics.monthlyBreakEvenDishes} dishes monthly to break even`
                                : 'No sales or price data available yet'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">COST BREAKDOWN</h3>
                <div className="space-y-4">
                    {/* Ingredient Costs */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-light text-gray-600">Ingredient Costs</span>
                            <span className="font-light text-gray-900">{fmtCurrency(metrics.ingredientCosts, 2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-red-500 rounded-full h-2" style={{ width: barWidthPct(metrics.foodCostPercentage) }} />
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between font-light">
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
                            <span className="font-light text-gray-600">Operating Expenses</span>
                            <span className="font-light text-gray-900">{fmtCurrency(metrics.monthlyExpenses, 2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-orange-500 rounded-full h-2"
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
                        <div className="text-xs text-gray-500 mt-1 flex justify-between font-light">
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
                            <span className="font-light text-gray-600">Net Profit</span>
                            <span className="font-light text-gray-900">{fmtCurrency(metrics.netProfit, 2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-500 rounded-full h-2" style={{ width: barWidthPct(clamp(metrics.netMargin)) }} />
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between font-light">
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
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 lg:col-span-2">
                <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">COST STRUCTURE</h3>
                <div className="space-y-4">
                    {/* Fixed Costs */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-light text-gray-600">Fixed Costs (Rent, etc.)</span>
                            <span className="font-light text-gray-900">{fmtCurrency(metrics.monthlyExpenses, 2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-orange-500 rounded-full h-2"
                                style={{
                                    width: barWidthPct(
                                        metrics.totalRevenue > 0 ? (metrics.monthlyExpenses / metrics.totalRevenue) * 100 : 100,
                                    ),
                                }}
                            />
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between font-light">
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
                            <span className="font-light text-gray-600">Ingredient Costs</span>
                            <span className="font-light text-gray-900">{fmtCurrency(metrics.ingredientCosts, 2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-red-500 rounded-full h-2" style={{ width: barWidthPct(metrics.foodCostPercentage) }} />
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between font-light">
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
                            <span className="font-light text-gray-600">Net {metrics.netProfit >= 0 ? 'Profit' : 'Loss'}</span>
                            <span className={`font-light ${badgeColorByNet(metrics.netProfit)}`}>
                                {fmtCurrency(Math.abs(metrics.netProfit), 2)}
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={`rounded-full h-2 ${metrics.netProfit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{
                                    width: barWidthPct(
                                        metrics.totalRevenue > 0 ? (Math.abs(metrics.netProfit) / metrics.totalRevenue) * 100 : 0,
                                    ),
                                }}
                            />
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between font-light">
                            <span>Monthly Result</span>
                            <span>
                                {metrics.netProfit >= 0
                                    ? `${metrics.netMargin.toFixed(1)}% profit margin`
                                    : `${Math.abs(metrics.netMargin).toFixed(1)}% loss margin`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Financial Status */}
                <div className={`mt-6 p-4 rounded-sm border ${metrics.netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-light text-gray-900">Current Financial Status</span>
                        <span className={`font-light ${badgeColorByNet(metrics.netProfit)}`}>
                            {metrics.netProfit >= 0 ? '✅ Profitable' : '⚠️ Operating at Loss'}
                        </span>
                    </div>
                    <div className="text-sm text-gray-600 font-light">
                        {metrics.netProfit >= 0
                            ? `You're making ${fmtCurrency(metrics.netProfit)} profit monthly`
                            : `You need ${fmtCurrency(Math.abs(metrics.netProfit))} more in monthly revenue to break even`}
                    </div>
                </div>
            </div>

            {/* Industry Benchmarks */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 lg:col-span-2">
                <h4 className="font-light text-gray-900 mb-3 tracking-wide">INDUSTRY BENCHMARKS</h4>
                <div className="text-sm text-gray-600 grid grid-cols-1 sm:grid-cols-3 gap-3 font-light">
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

        // Calculate totals from all products in sales records
        const totalRevenue = recentSales.reduce((sum, sale) =>
            sum + sale.totalAmount, 0
        )

        const totalUnitsSold = recentSales.reduce((sum, sale) =>
            sum + sale.products.reduce((productSum, product) =>
                productSum + product.quantity, 0
            ), 0
        )

        const monthlyExpenses = getMonthlyExpenses()

        // Calculate INGREDIENT COSTS from product cost prices
        const ingredientCosts = recentSales.reduce((sum, sale) => {
            return sum + sale.products.reduce((productSum, product) => {
                const productCost = product.costPrice || 0
                return productSum + (productCost * product.quantity)
            }, 0)
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
            totalPurchases: 0,
            foodCostPercentage,
            dailyBreakEvenDishes,
            monthlyBreakEvenDishes
        }
    }, [sales, products, expenses, ingredients, purchases, loading, getRecentSales, getMonthlyExpenses])

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-lg text-gray-600 font-light">Loading business analytics...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-light text-gray-900 tracking-wide">Business Analytics</h1>
                    <p className="text-gray-500 font-light mt-2">Track performance, costs, and profitability</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg">
                    {/* Navigation Tabs */}
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-4 sm:space-x-8 px-4 sm:px-6 overflow-x-auto">
                            {[
                                { id: 'overview', name: 'OVERVIEW' },
                                { id: 'break-even', name: 'BREAK-EVEN' },
                                { id: 'sales', name: 'SALES' },
                                { id: 'profitability', name: 'PROFITABILITY' },
                                { id: 'expenses', name: 'EXPENSES' },
                                { id: 'profit-allocation', name: 'PROFIT DISTRIBUTION' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as TabId)}
                                    className={`py-4 px-1 border-b-2 font-light text-sm tracking-wide whitespace-nowrap ${activeTab === tab.id
                                        ? 'border-gray-900 text-gray-900'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    {tab.name}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-4 sm:p-6">
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
            </div>
        </div>
    )
}