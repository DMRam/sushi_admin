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
                                        {/* Ingredients Section */}
                                        <div className="mb-6">
                                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                                                <h4 className="font-medium text-gray-900 text-sm sm:text-base flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                    </svg>
                                                    INGREDIENTS ({product.ingredients.length})
                                                </h4>
                                                {/* Only show cost for admin users */}
                                                {userProfile?.role === UserRole.ADMIN && (
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                        Total Cost: ${cost.toFixed(2)}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                {product.ingredients.length === 0 ? (
                                                    <div className="text-center py-4 text-gray-500 text-sm bg-gray-50 rounded-lg">
                                                        No ingredients added to this product
                                                    </div>
                                                ) : (
                                                    product.ingredients.map((item, index) => {
                                                        const ingredient = ingredients.find(ing => ing.id === item.id)
                                                        let itemCost = 0
                                                        let unitPrice = 0

                                                        if (ingredient) {
                                                            // Proper cost calculation based on unit
                                                            let quantityInKg = item.quantity
                                                            if (item.unit === 'g') quantityInKg = item.quantity / 1000
                                                            if (item.unit === 'ml') quantityInKg = item.quantity / 1000
                                                            if (item.unit === 'unit') quantityInKg = item.quantity

                                                            itemCost = ingredient.pricePerKg * quantityInKg
                                                            unitPrice = ingredient.pricePerKg
                                                        }

                                                        const isLowStock = ingredient && ingredient.currentStock <= ingredient.minimumStock
                                                        const isOutOfStock = ingredient && ingredient.currentStock === 0

                                                        return (
                                                            <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm bg-white border border-gray-200 p-3 sm:p-4 rounded-lg gap-3 hover:shadow-sm transition-shadow">
                                                                {/* Left side - Ingredient info */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="font-medium text-gray-900 text-sm truncate">
                                                                            {getIngredientName(item.id)}
                                                                        </span>
                                                                        {(isLowStock || isOutOfStock) && (
                                                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${isOutOfStock
                                                                                    ? 'bg-red-100 text-red-800 border border-red-200'
                                                                                    : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                                                                }`}>
                                                                                {isOutOfStock ? 'OUT OF STOCK' : 'LOW STOCK'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                                                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                                                                            {item.quantity} {item.unit}
                                                                        </span>
                                                                        {ingredient && (
                                                                            <>
                                                                                <span>•</span>
                                                                                <span>Stock: {ingredient.currentStock.toFixed(2)}{ingredient.unit}</span>
                                                                                {/* Only show unit price for admin users */}
                                                                                {userProfile?.role === UserRole.ADMIN && (
                                                                                    <>
                                                                                        <span>•</span>
                                                                                        <span>${unitPrice.toFixed(2)}/{ingredient.unit}</span>
                                                                                    </>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Right side - Cost and actions */}
                                                                <div className="flex items-center gap-3 sm:gap-4">
                                                                    {/* Only show cost for admin users */}
                                                                    {userProfile?.role === UserRole.ADMIN && (
                                                                        <div className="text-right">
                                                                            <div className="text-gray-900 font-semibold text-sm">
                                                                                ${itemCost.toFixed(2)}
                                                                            </div>
                                                                            <div className="text-xs text-gray-500">
                                                                                {unitPrice > 0 && `$${unitPrice.toFixed(2)}/${ingredient?.unit || 'kg'}`}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {ingredient && (
                                                                        <button
                                                                            onClick={() => window.open(`/ingredients?highlight=${ingredient.id}`, '_blank')}
                                                                            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                                                            title="View ingredient details"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                            </svg>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    })
                                                )}
                                            </div>

                                            {/* Cost Summary - Only for admin users */}
                                            {product.ingredients.length > 0 && userProfile?.role === UserRole.ADMIN && (
                                                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                                        <div className="text-center">
                                                            <div className="text-gray-600 font-medium">Total Cost</div>
                                                            <div className="text-2xl font-bold text-blue-700">${cost.toFixed(2)}</div>
                                                        </div>
                                                        {product.sellingPrice && (
                                                            <>
                                                                <div className="text-center">
                                                                    <div className="text-gray-600 font-medium">Selling Price</div>
                                                                    <div className="text-2xl font-bold text-green-600">${product.sellingPrice.toFixed(2)}</div>
                                                                </div>
                                                                <div className="text-center">
                                                                    <div className="text-gray-600 font-medium">Profit Margin</div>
                                                                    <div className={`text-2xl font-bold ${product.profitMargin && product.profitMargin > 0 ? 'text-green-600' : 'text-red-600'
                                                                        }`}>
                                                                        {product.profitMargin ? `${product.profitMargin.toFixed(1)}%` : 'N/A'}
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Preparation Section */}
                                        <div className="mb-6">
                                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                                                <h4 className="font-medium text-gray-900 text-sm sm:text-base flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                    </svg>
                                                    PREPARATION
                                                </h4>
                                                {/* Safely handle undefined preparationTime */}
                                                {product.preparationTime && product.preparationTime > 0 && (
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        {product.preparationTime} min
                                                    </span>
                                                )}
                                            </div>

                                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                                {product.description ? (
                                                    <div className="prose prose-sm max-w-none text-gray-700">
                                                        {product.description.split('\n').map((paragraph, index) => (
                                                            <p key={index} className="mb-3 last:mb-0">
                                                                {paragraph}
                                                            </p>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-4 text-gray-500 text-sm">
                                                        No preparation instructions added
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Additional Information */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                            {product.tags && product.tags.length > 0 && (
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <div className="font-medium text-gray-700 mb-2">Tags</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {product.tags.map((tag, index) => (
                                                            <span key={index} className="inline-block bg-white border border-gray-300 px-2 py-1 rounded text-xs text-gray-600">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {product.allergens && product.allergens.length > 0 && (
                                                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                                    <div className="font-medium text-red-700 mb-2 flex items-center gap-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                        </svg>
                                                        Allergens
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {product.allergens.map((allergen, index) => (
                                                            <span key={index} className="inline-block bg-white border border-red-300 px-2 py-1 rounded text-xs text-red-700 font-medium">
                                                                {allergen}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
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