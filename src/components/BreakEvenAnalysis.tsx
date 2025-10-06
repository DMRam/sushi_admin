import React, { useState, useMemo } from 'react'
import { useProducts } from '../context/ProductsContext'
import { useExpenses } from '../context/ExpensesContext'

export default function BreakEvenAnalysis() {
    const { products } = useProducts()
    const { expenses, getMonthlyExpenses } = useExpenses()

    const [selectedProductId, setSelectedProductId] = useState('')
    const [customFixedCosts, setCustomFixedCosts] = useState('')

    const monthlyFixedCosts = useMemo(() => {
        if (customFixedCosts) {
            return parseFloat(customFixedCosts) || 0
        }
        return getMonthlyExpenses()
    }, [customFixedCosts, getMonthlyExpenses])

    const breakEvenData = useMemo(() => {
        if (!selectedProductId) return null

        const product = products.find(p => p.id === selectedProductId)
        if (!product || !product.sellingPrice || !product.costPrice) return null

        const fixedCosts = monthlyFixedCosts
        const variableCostPerUnit = product.costPrice
        const sellingPricePerUnit = product.sellingPrice
        const contributionMargin = sellingPricePerUnit - variableCostPerUnit

        if (contributionMargin <= 0) return null

        const breakEvenUnits = Math.ceil(fixedCosts / contributionMargin)
        const breakEvenRevenue = breakEvenUnits * sellingPricePerUnit

        return {
            fixedCosts,
            variableCostPerUnit,
            sellingPricePerUnit,
            contributionMargin,
            breakEvenUnits,
            breakEvenRevenue
        }
    }, [selectedProductId, products, monthlyFixedCosts])

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Input Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Break-Even Calculator</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Product
                        </label>
                        <select
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Choose a product</option>
                            {products
                                .filter(p => p.sellingPrice && p.costPrice)
                                .map(product => (
                                    <option key={product.id} value={product.id}>
                                        {product.name} (${product.sellingPrice})
                                    </option>
                                ))
                            }
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Monthly Fixed Costs
                        </label>
                        <input
                            type="number"
                            value={customFixedCosts}
                            onChange={(e) => setCustomFixedCosts(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={`Auto: $${getMonthlyExpenses().toFixed(2)}`}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Leave empty to use actual monthly expenses (${getMonthlyExpenses().toFixed(2)})
                        </p>
                    </div>
                </div>

                {/* Results Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Analysis Results</h3>

                    {!breakEvenData && selectedProductId && (
                        <div className="text-center py-8 text-gray-500">
                            {(() => {
                                const product = products.find(p => p.id === selectedProductId)
                                if (!product?.sellingPrice) return "Selected product doesn't have a selling price"
                                if (!product?.costPrice) return "Selected product doesn't have a cost price calculated"
                                return "Cannot calculate break-even with current data"
                            })()}
                        </div>
                    )}

                    {!selectedProductId && (
                        <div className="text-center py-8 text-gray-500">
                            Select a product with both cost and selling prices to see break-even analysis
                            <div className="mt-4 space-y-2">
                                {products
                                    .filter(p => p.costPrice && p.sellingPrice)
                                    .slice(0, 3)
                                    .map(product => (
                                        <button
                                            key={product.id}
                                            onClick={() => setSelectedProductId(product.id)}
                                            className="block w-full p-3 text-left bg-blue-50 rounded border border-blue-200 hover:bg-blue-100"
                                        >
                                            <div className="font-medium">{product.name}</div>
                                            <div className="text-sm text-gray-600">
                                                Cost: ${product.costPrice?.toFixed(2)} • Sell: ${product.sellingPrice?.toFixed(2)}
                                            </div>
                                        </button>
                                    ))
                                }
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Visualization */}
            {breakEvenData && (
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Break-Even Visualization</h3>
                    <div className="space-y-4">
                        {/* Simple bar chart representation */}
                        {[500, 1000, 1500, breakEvenData.breakEvenUnits, 2500, 3000]
                            .filter(units => units <= 3000)
                            .map(units => {
                                const revenue = units * breakEvenData.sellingPricePerUnit
                                const totalCost = breakEvenData.fixedCosts + (units * breakEvenData.variableCostPerUnit)
                                const profit = revenue - totalCost
                                const isBreakEven = units === breakEvenData.breakEvenUnits

                                return (
                                    <div key={units} className="flex items-center gap-4">
                                        <div className="w-20 text-sm font-medium text-gray-700">
                                            {units} units
                                            {isBreakEven && <div className="text-xs text-blue-600">BREAK-EVEN</div>}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex h-8 rounded-lg overflow-hidden">
                                                <div
                                                    className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                                                    style={{ width: `${(revenue / (breakEvenData.breakEvenUnits * breakEvenData.sellingPricePerUnit * 1.5)) * 100}%` }}
                                                >
                                                    ${revenue.toFixed(0)}
                                                </div>
                                                <div
                                                    className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                                                    style={{ width: `${(totalCost / (breakEvenData.breakEvenUnits * breakEvenData.sellingPricePerUnit * 1.5)) * 100}%` }}
                                                >
                                                    ${totalCost.toFixed(0)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`w-20 text-sm font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ${profit.toFixed(0)}
                                        </div>
                                    </div>
                                )
                            })
                        }
                    </div>
                </div>
            )}
        </div>
    )
}