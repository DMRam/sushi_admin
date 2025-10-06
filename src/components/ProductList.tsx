import { useState } from 'react'
import { useProducts } from '../context/ProductsContext'
import { useIngredients } from '../context/IngredientsContext'
import { productCost, calculateProfitMargin } from '../utils/costCalculations'
import { UserRole, useUserProfile } from '../context/UserProfileContext'

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
        <div className="space-y-4 mt-4">
            {productsWithRecalculatedCosts.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                    No products created yet. Create your first product!
                </div>
            ) : (
                productsWithRecalculatedCosts.map(product => {
                    const cost = product.costPrice || 0
                    const profitMargin = product.profitMargin || 0
                    const profit = product.sellingPrice ? product.sellingPrice - cost : 0

                    return (
                        <div key={product.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                            <div className="p-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg text-gray-900">{product.name}</h3>
                                        {product.description && (
                                            <p className="text-gray-600 text-sm mt-1">{product.description}</p>
                                        )}
                                        <div className="flex flex-wrap gap-4 mt-2 text-sm">
                                            {product.category && (
                                                <span className="text-gray-600">Category: {product.category}</span>
                                            )}
                                            {product.portionSize && (
                                                <span className="text-gray-600">Portion: {product.portionSize}</span>
                                            )}
                                        </div>

                                        {userProfile?.role != UserRole.VIEWER && (
                                            <>
                                                <div className="flex flex-wrap gap-4 mt-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-gray-900">
                                                            Cost: ${cost.toFixed(2)}
                                                        </span>
                                                        {product.sellingPrice && (
                                                            <>
                                                                <span className="text-gray-400">•</span>
                                                                <span className="font-medium text-gray-900">
                                                                    Selling: ${product.sellingPrice.toFixed(2)}
                                                                </span>
                                                                <span className="text-gray-400">•</span>
                                                                <span className={`font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    Profit: ${profit.toFixed(2)}
                                                                </span>
                                                                <span className="text-gray-400">•</span>
                                                                <span className={`font-medium ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    Margin: {profitMargin.toFixed(1)}%
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Quick profit breakdown */}
                                                {product.sellingPrice && (
                                                    <div className="mt-2 text-xs text-gray-500">
                                                        {profit >= 0 ? '✅' : '⚠️'}
                                                        You {profit >= 0 ? 'make' : 'lose'} ${Math.abs(profit).toFixed(2)}
                                                        ({Math.abs(profitMargin).toFixed(1)}% of selling price) per serving
                                                    </div>
                                                )}
                                            </>
                                        )}



                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <button
                                            onClick={() => toggleExpand(product.id)}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                                        >
                                            {expandedProduct === product.id ? 'Hide' : 'Show'} Ingredients
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm('Are you sure you want to delete this product?')) {
                                                    removeProduct(product.id)
                                                }
                                            }}
                                            className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 border border-red-200 rounded hover:bg-red-50 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                {expandedProduct === product.id && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <h4 className="font-medium text-gray-900 mb-3">Ingredients:</h4>
                                        <div className="space-y-2">
                                            {product.ingredients.map((item, index) => {
                                                const ingredient = ingredients.find(ing => ing.id === item.ingredientId)
                                                let itemCost = 0

                                                if (ingredient) {
                                                    // Proper cost calculation based on unit
                                                    let quantityInKg = item.quantity
                                                    if (item.unit === 'g') quantityInKg = item.quantity / 1000
                                                    if (item.unit === 'ml') quantityInKg = item.quantity / 1000
                                                    itemCost = ingredient.pricePerKg * quantityInKg
                                                }

                                                return (
                                                    <div key={index} className="flex justify-between items-center text-sm bg-gray-50 p-3 rounded">
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-medium text-gray-700">
                                                                {getIngredientName(item.ingredientId)}
                                                            </span>
                                                            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                                                                {item.quantity}{item.unit}
                                                            </span>
                                                        </div>
                                                        <span className="text-gray-600 font-medium">
                                                            ${itemCost.toFixed(2)}
                                                        </span>
                                                    </div>
                                                )
                                            })}

                                            {/* Total cost breakdown */}
                                            <div className="flex justify-between items-center text-sm font-medium bg-blue-50 p-3 rounded border border-blue-200 mt-3">
                                                <span className="text-gray-700">Total Product Cost:</span>
                                                <span className="text-blue-700">${cost.toFixed(2)}</span>
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