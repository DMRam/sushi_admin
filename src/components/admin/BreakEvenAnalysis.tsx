import { useState, useMemo } from 'react'
import { useProducts } from '../../context/ProductsContext'
import { useExpenses } from '../../context/ExpensesContext'

export default function BreakEvenAnalysis() {
    const { products } = useProducts()
    const { getMonthlyExpenses } = useExpenses()

    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
    const [customFixedCosts, setCustomFixedCosts] = useState('')

    const monthlyFixedCosts = useMemo(() => {
        if (customFixedCosts) {
            return parseFloat(customFixedCosts) || 0
        }
        return getMonthlyExpenses()
    }, [customFixedCosts, getMonthlyExpenses])

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
