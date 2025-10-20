import { useState } from 'react'
import { useProducts } from '../../../../context/ProductsContext'
import { useIngredients } from '../../../../context/IngredientsContext'
import { useUserProfile, UserRole } from '../../../../context/UserProfileContext'
import { productCost, calculateProfitMargin } from '../../../../utils/costCalculations'


export const ProductList = () => {
    const { products, removeProduct } = useProducts()
    const { ingredients } = useIngredients()
    const [expandedProduct, setExpandedProduct] = useState<string | null>(null)
    const { userProfile } = useUserProfile()

    const toggleExpand = (productId: string) => {
        setExpandedProduct(expandedProduct === productId ? null : productId)
    }

    const getIngredientName = (ingredientId: string) => {
        const ingredient = ingredients.find(ing => ing.id === ingredientId)
        return ingredient ? ingredient.name : 'Unknown Ingredient'
    }

    // Recalculate everything to ensure accuracy
    const productsWithRecalculatedCosts = products.map(product => {
        const cost = productCost(product, ingredients)
        const profitMargin = product.sellingPrice ? calculateProfitMargin(cost, product.sellingPrice) : undefined

        return {
            ...product,
            costPrice: cost,
            profitMargin
        }
    })

    return (
        <div className="space-y-3">
            {productsWithRecalculatedCosts.length === 0 ? (
                <div className="text-center text-gray-500 py-6">
                    No products created yet. Create your first product!
                </div>
            ) : (
                productsWithRecalculatedCosts.map(product => {
                    const cost = product.costPrice || 0
                    const profitMargin = product.profitMargin || 0
                    const profit = product.sellingPrice ? product.sellingPrice - cost : 0

                    return (
                        <div key={product.id} className="border border-gray-200 rounded-lg bg-white shadow-sm">
                            <div className="p-3 sm:p-4">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-base sm:text-lg text-gray-900 truncate">{product.name}</h3>

                                        {product.description && (
                                            <p className="text-gray-600 text-sm mt-1 line-clamp-2">{product.description}</p>
                                        )}

                                        <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 text-xs sm:text-sm">
                                            {product.category && (
                                                <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                    {product.category}
                                                </span>
                                            )}
                                            {product.portionSize && (
                                                <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                    {product.portionSize}
                                                </span>
                                            )}
                                        </div>

                                        {userProfile?.role !== UserRole.VIEWER && (
                                            <div className="mt-3 space-y-2">
                                                {/* Cost and Pricing - Stack on mobile, inline on desktop */}
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm">
                                                    <span className="font-medium text-gray-900">
                                                        Cost: ${cost.toFixed(2)}
                                                    </span>

                                                    {product.sellingPrice && (
                                                        <>
                                                            <span className="hidden sm:inline text-gray-400">•</span>
                                                            <span className="font-medium text-gray-900">
                                                                Selling: ${product.sellingPrice.toFixed(2)}
                                                            </span>
                                                            <span className="hidden sm:inline text-gray-400">•</span>
                                                            <span className={`font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                Profit: ${profit.toFixed(2)}
                                                            </span>
                                                            <span className="hidden sm:inline text-gray-400">•</span>
                                                            <span className={`font-medium ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                Margin: {profitMargin.toFixed(1)}%
                                                            </span>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Profit breakdown - Always stacked */}
                                                {product.sellingPrice && (
                                                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                                        <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                            {profit >= 0 ? '✅' : '⚠️'}
                                                        </span>
                                                        <span className="ml-1">
                                                            You {profit >= 0 ? 'make' : 'lose'} ${Math.abs(profit).toFixed(2)}
                                                            ({Math.abs(profitMargin).toFixed(1)}% margin) per serving
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons - Stack on mobile, row on desktop */}
                                    <div className="flex flex-col sm:flex-row gap-2 sm:ml-4 w-full sm:w-auto">
                                        <button
                                            onClick={() => toggleExpand(product.id)}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-2 border border-blue-200 rounded hover:bg-blue-50 transition-colors text-center"
                                        >
                                            {expandedProduct === product.id ? 'Hide' : 'Show'} Ingredients
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm('Are you sure you want to delete this product?')) {
                                                    removeProduct(product.id)
                                                }
                                            }}
                                            className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-2 border border-red-200 rounded hover:bg-red-50 transition-colors text-center"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Ingredients Section */}
                                {expandedProduct === product.id && (
                                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                                        <h4 className="font-medium text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Ingredients:</h4>
                                        <div className="space-y-2">
                                            {product.ingredients.map((item, index) => {
                                                const ingredient = ingredients.find(ing => ing.id === item.id)
                                                let itemCost = 0

                                                if (ingredient) {
                                                    // Proper cost calculation based on unit
                                                    let quantityInKg = item.quantity
                                                    if (item.unit === 'g') quantityInKg = item.quantity / 1000
                                                    if (item.unit === 'ml') quantityInKg = item.quantity / 1000
                                                    itemCost = ingredient.pricePerKg * quantityInKg
                                                }

                                                return (
                                                    <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm bg-gray-50 p-2 sm:p-3 rounded gap-2">
                                                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                                            <span className="font-medium text-gray-700 text-xs sm:text-sm truncate">
                                                                {getIngredientName(item.id)}
                                                            </span>
                                                            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded flex-shrink-0">
                                                                {item.quantity}{item.unit}
                                                            </span>
                                                        </div>
                                                        <span className="text-gray-600 font-medium text-xs sm:text-sm sm:text-right">
                                                            ${itemCost.toFixed(2)}
                                                        </span>
                                                    </div>
                                                )
                                            })}

                                            {/* Total cost */}
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm font-medium bg-blue-50 p-2 sm:p-3 rounded border border-blue-200 mt-2 gap-2">
                                                <span className="text-gray-700 text-xs sm:text-sm">Total Product Cost:</span>
                                                <span className="text-blue-700 text-sm sm:text-base font-bold">${cost.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })
            )}
        </div>
    )
}