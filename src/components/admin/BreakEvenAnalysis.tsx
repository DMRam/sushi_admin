import { useState, useMemo } from 'react'
import { useProducts } from '../../context/ProductsContext'
import { useExpenses } from '../../context/ExpensesContext'

type BreakEvenAnalysisProps = {
    actualRevenue?: number
    actualUnitsSold?: number
    actualOrders?: number
    monthlyExpenses?: number
    estimatedIngredientCosts?: number
}

export default function BreakEvenAnalysis({
    actualRevenue = 0,
    actualUnitsSold = 0,
    actualOrders = 0,
    monthlyExpenses,
    estimatedIngredientCosts = 0,
}: BreakEvenAnalysisProps) {
    const { products } = useProducts()
    const { getMonthlyExpenses } = useExpenses()

    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
    const [customFixedCosts, setCustomFixedCosts] = useState('')

    const monthlyFixedCosts = useMemo(() => {
        if (customFixedCosts) {
            return parseFloat(customFixedCosts) || 0
        }
        return monthlyExpenses ?? getMonthlyExpenses()
    }, [customFixedCosts, getMonthlyExpenses, monthlyExpenses])

    const realBreakEven = useMemo(() => {
        const avgRevenuePerItem = actualUnitsSold > 0 ? actualRevenue / actualUnitsSold : 0
        const avgFoodCostPerItem = actualUnitsSold > 0 ? estimatedIngredientCosts / actualUnitsSold : 0
        const contributionMargin = avgRevenuePerItem - avgFoodCostPerItem
        const neededItems = contributionMargin > 0 ? Math.ceil(monthlyFixedCosts / contributionMargin) : 0
        const progress = neededItems > 0 ? Math.min(100, (actualUnitsSold / neededItems) * 100) : 0

        return {
            avgRevenuePerItem,
            avgFoodCostPerItem,
            contributionMargin,
            neededItems,
            progress,
            remainingItems: Math.max(0, neededItems - actualUnitsSold),
            projectedRevenue: neededItems * avgRevenuePerItem,
        }
    }, [actualRevenue, actualUnitsSold, estimatedIngredientCosts, monthlyFixedCosts])

    const breakEvenData = useMemo(() => {
        if (!selectedProductIds.length) return null

        const selectedProducts = products.filter(p => selectedProductIds.includes(p.id))
        const validProducts = selectedProducts.filter(p => p.sellingPrice && p.costPrice)

        if (!validProducts.length) return null

        const fixedCosts = monthlyFixedCosts
        const totalContributionMargin = validProducts.reduce(
            (sum, p) => sum + ((p.sellingPrice ?? 0) - (p.costPrice ?? 0)),
            0
        )

        const avgContributionMargin = totalContributionMargin / validProducts.length

        const avgSellingPrice =
            validProducts.reduce((sum, p) => sum + (p.sellingPrice ?? 0), 0) /
            validProducts.length


        if (avgContributionMargin <= 0) return null

        const breakEvenUnits = Math.ceil(fixedCosts / avgContributionMargin)
        const breakEvenRevenue = breakEvenUnits * avgSellingPrice

        return {
            fixedCosts,
            avgContributionMargin,
            avgSellingPrice,
            breakEvenUnits,
            breakEvenRevenue,
            productNames: validProducts.map(p => p.name).join(', '),
            products: validProducts
        }
    }, [selectedProductIds, products, monthlyFixedCosts])

    return (
        <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Real sales break-even</p>
                        <h3 className="mt-1 text-xl font-semibold text-gray-950">Based on Clover, website, and recorded sales</h3>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
                            This uses the last 30 days of order revenue and matched product costs. If products are missing cost prices, the food cost estimate will be low.
                        </p>
                    </div>
                    <div className="grid gap-3 text-sm sm:grid-cols-3 lg:min-w-[520px]">
                        <div className="rounded-lg bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Actual orders</p>
                            <p className="mt-1 text-lg font-semibold text-gray-950">{actualOrders}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Items sold</p>
                            <p className="mt-1 text-lg font-semibold text-gray-950">{actualUnitsSold.toFixed(0)}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Need to break even</p>
                            <p className="mt-1 text-lg font-semibold text-gray-950">
                                {realBreakEven.neededItems ? `${realBreakEven.neededItems} items` : 'Add cost data'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
                    <div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700">Break-even progress</span>
                            <span className="font-semibold text-gray-950">{realBreakEven.progress.toFixed(0)}%</span>
                        </div>
                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-[#f26350]" style={{ width: `${realBreakEven.progress}%` }} />
                        </div>
                        <p className="mt-2 text-sm text-gray-500">
                            {realBreakEven.neededItems
                                ? realBreakEven.remainingItems > 0
                                    ? `You need about ${realBreakEven.remainingItems.toFixed(0)} more items this month to cover fixed costs.`
                                    : 'You are past the estimated break-even point for this month.'
                                : 'Add product cost prices to calculate a reliable break-even target.'}
                        </p>
                    </div>

                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm">
                        <div className="flex justify-between gap-3">
                            <span className="text-gray-500">Avg revenue per item</span>
                            <span className="font-semibold text-gray-950">${realBreakEven.avgRevenuePerItem.toFixed(2)}</span>
                        </div>
                        <div className="mt-2 flex justify-between gap-3">
                            <span className="text-gray-500">Estimated food cost per item</span>
                            <span className="font-semibold text-gray-950">${realBreakEven.avgFoodCostPerItem.toFixed(2)}</span>
                        </div>
                        <div className="mt-2 flex justify-between gap-3 border-t border-gray-200 pt-2">
                            <span className="text-gray-500">Contribution per item</span>
                            <span className="font-semibold text-emerald-700">${realBreakEven.contributionMargin.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                    <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">BREAK-EVEN CALCULATOR</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">
                                SELECT PRODUCTS
                            </label>
                            <select
                                multiple
                                value={selectedProductIds}
                                onChange={(e) =>
                                    setSelectedProductIds(Array.from(e.target.selectedOptions, option => option.value))
                                }
                                className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light h-40"
                            >
                                {products
                                    .filter(p => p.sellingPrice && p.costPrice)
                                    .map(product => (
                                        <option key={product.id} value={product.id}>
                                            {product.name} (${product.sellingPrice})
                                        </option>
                                    ))
                                }
                            </select>
                            <p className="text-xs text-gray-500 mt-1 font-light">
                                Hold Ctrl (Windows) or ⌘ (Mac) to select multiple products
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">
                                MONTHLY FIXED COSTS
                            </label>
                            <input
                                type="number"
                                value={customFixedCosts}
                                onChange={(e) => setCustomFixedCosts(e.target.value)}
                                className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light"
                                placeholder={`Auto: $${getMonthlyExpenses().toFixed(2)}`}
                            />
                            <p className="text-xs text-gray-500 mt-1 font-light">
                                Leave empty to use actual monthly expenses (${getMonthlyExpenses().toFixed(2)})
                            </p>
                        </div>
                    </div>

                    {/* Quick Product Suggestions */}
                    {!selectedProductIds.length && (
                        <div className="mt-6">
                            <p className="text-sm font-light text-gray-700 mb-3">QUICK SELECT:</p>
                            <div className="space-y-2">
                                {products
                                    .filter(p => p.costPrice && p.sellingPrice)
                                    .slice(0, 3)
                                    .map(product => (
                                        <button
                                            key={product.id}
                                            onClick={() => setSelectedProductIds(prev => [...new Set([...prev, product.id])])}
                                            className="block w-full p-3 text-left bg-gray-50 rounded-sm border border-gray-200 hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="font-light text-gray-900">{product.name}</div>
                                            <div className="text-xs text-gray-600 font-light">
                                                Cost: ${product.costPrice?.toFixed(2)} • Sell: ${product.sellingPrice?.toFixed(2)}
                                            </div>
                                        </button>
                                    ))
                                }
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                    <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">ANALYSIS RESULTS</h3>

                    {!breakEvenData && selectedProductIds.length > 0 && (
                        <div className="text-center py-8 text-gray-500 font-light">
                            Cannot calculate break-even with current data
                        </div>
                    )}

                    {!selectedProductIds.length && (
                        <div className="text-center py-8 text-gray-500 font-light">
                            Select one or more products with cost and selling prices to see combined break-even analysis
                        </div>
                    )}

                    {breakEvenData && (
                        <div className="space-y-4">
                            {/* Key Metrics */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-50 border border-green-200 rounded-sm p-3">
                                    <p className="text-xs font-light text-green-600 tracking-wide">BREAK-EVEN UNITS (TOTAL)</p>
                                    <p className="text-xl font-light text-green-600 mt-1">{breakEvenData.breakEvenUnits}</p>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-sm p-3">
                                    <p className="text-xs font-light text-blue-600 tracking-wide">BREAK-EVEN REVENUE</p>
                                    <p className="text-xl font-light text-blue-600 mt-1">${breakEvenData.breakEvenRevenue.toFixed(0)}</p>
                                </div>
                            </div>

                            {/* Detailed Breakdown */}
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="font-light text-gray-600">Fixed Costs:</span>
                                    <span className="font-light text-gray-900">${breakEvenData.fixedCosts.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="font-light text-gray-600">Avg Selling Price/Unit:</span>
                                    <span className="font-light text-gray-900">${breakEvenData.avgSellingPrice.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                                    <span className="font-light text-gray-600">Avg Contribution Margin:</span>
                                    <span className="font-light text-green-600">${breakEvenData.avgContributionMargin.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Profitability Indicator */}
                            <div className={`p-3 rounded-sm border ${breakEvenData.avgContributionMargin > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="text-sm font-light text-center">
                                    {breakEvenData.avgContributionMargin > 0
                                        ? `✅ Each unit (avg) contributes $${breakEvenData.avgContributionMargin.toFixed(2)} toward fixed costs`
                                        : '❌ Combined selection is not profitable at current pricing'
                                    }
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Visualization */}
            {breakEvenData && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                    <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">BREAK-EVEN VISUALIZATION</h3>

                    {/* Key Insight */}
                    <div className="bg-blue-50 border border-blue-200 rounded-sm p-4 mb-6">
                        <div className="text-sm font-light text-blue-700">
                            You need to sell approximately <strong>{breakEvenData.breakEvenUnits} total units</strong>
                            (across: <strong>{breakEvenData.productNames}</strong>)
                            to break even each month, generating about <strong>${breakEvenData.breakEvenRevenue.toFixed(0)} in revenue</strong>.
                        </div>
                    </div>

                    <div className="space-y-3">
                        {[500, 1000, 1500, breakEvenData.breakEvenUnits, 2500, 3000]
                            .filter(units => units <= 3000)
                            .map(units => {
                                const revenue = units * breakEvenData.avgSellingPrice
                                const totalCost = breakEvenData.fixedCosts + (units * (breakEvenData.avgSellingPrice - breakEvenData.avgContributionMargin))
                                const profit = revenue - totalCost
                                const isBreakEven = units === breakEvenData.breakEvenUnits

                                return (
                                    <div key={units} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gray-50 rounded-sm">
                                        <div className="w-20 text-sm font-light text-gray-700">
                                            {units} units
                                            {isBreakEven && (
                                                <div className="text-xs text-blue-600 font-light mt-1">BREAK-EVEN POINT</div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex h-6 rounded-sm overflow-hidden">
                                                <div
                                                    className="bg-green-500 flex items-center justify-center text-white text-xs font-light"
                                                    style={{ width: `${Math.min(100, (revenue / (breakEvenData.breakEvenUnits * breakEvenData.avgSellingPrice * 1.5)) * 100)}%` }}
                                                >
                                                    ${revenue.toFixed(0)}
                                                </div>
                                                <div
                                                    className="bg-red-500 flex items-center justify-center text-white text-xs font-light"
                                                    style={{ width: `${Math.min(100, (totalCost / (breakEvenData.breakEvenUnits * breakEvenData.avgSellingPrice * 1.5)) * 100)}%` }}
                                                >
                                                    ${totalCost.toFixed(0)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`w-20 text-sm font-light text-center ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ${profit.toFixed(0)}
                                            <div className="text-xs text-gray-500 font-light">
                                                {profit >= 0 ? 'Profit' : 'Loss'}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        }
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 mt-4 text-xs font-light text-gray-600">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                            <span>Revenue</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                            <span>Total Costs</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                            <span>Break-even Point</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Educational Section */}
            {!selectedProductIds.length && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6">
                    <h3 className="text-lg font-light text-gray-900 tracking-wide mb-3">ABOUT BREAK-EVEN ANALYSIS</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 font-light">
                        <div>
                            <p className="font-light text-gray-700 mb-2">What is Break-Even Analysis?</p>
                            <p className="mb-3">
                                Break-even analysis helps you determine the number of units you need to sell to cover all your costs.
                                Below this point, you operate at a loss. Above it, you make a profit.
                            </p>
                        </div>
                        <div>
                            <p className="font-light text-gray-700 mb-2">Why It Matters</p>
                            <ul className="space-y-1">
                                <li>• Set realistic sales targets</li>
                                <li>• Understand combined product profitability</li>
                                <li>• Make informed pricing decisions</li>
                                <li>• Plan for business sustainability</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
