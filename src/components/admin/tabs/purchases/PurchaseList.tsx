import { useState, useMemo } from 'react'
import { usePurchases } from '../../../../context/PurchasesContext'
import { useIngredients } from '../../../../context/IngredientsContext'

interface PurchaseListProps {
  isMobile?: boolean;
}

export const PurchaseList = ({ isMobile = false }: PurchaseListProps) => {
    const { purchases, removePurchase } = usePurchases()
    const { ingredients } = useIngredients()
    const [filter, setFilter] = useState({
        purchaseType: '', // 'ingredient', 'supply', or '' for all
        ingredientId: '',
        supplier: '',
        dateRange: '30' // 7, 30, 90, all
    })

    const filteredPurchases = useMemo(() => {
        let filtered = purchases

        // Filter by purchase type
        if (filter.purchaseType) {
            filtered = filtered.filter(purchase => purchase.purchaseType === filter.purchaseType)
        }

        // Filter by ingredient (only for ingredient purchases)
        if (filter.ingredientId) {
            filtered = filtered.filter(purchase =>
                purchase.purchaseType === 'ingredient' && purchase.ingredientId === filter.ingredientId
            )
        }

        // Filter by supplier
        if (filter.supplier) {
            filtered = filtered.filter(purchase =>
                purchase.supplier.toLowerCase().includes(filter.supplier.toLowerCase())
            )
        }

        // Filter by date range
        if (filter.dateRange !== 'all') {
            const days = parseInt(filter.dateRange)
            const cutoffDate = new Date()
            cutoffDate.setDate(cutoffDate.getDate() - days)
            filtered = filtered.filter(purchase => new Date(purchase.purchaseDate) >= cutoffDate)
        }

        return filtered.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
    }, [purchases, filter])

    const getDisplayName = (purchase: any) => {
        if (purchase.purchaseType === 'supply') {
            return purchase.supplyName || 'Supply Item'
        }
        return ingredients.find(ing => ing.id === purchase.ingredientId)?.name || 'Unknown Ingredient'
    }

    const getCategory = (purchase: any) => {
        if (purchase.purchaseType === 'supply') {
            return purchase.supplyCategory || 'supply'
        }
        const ingredient = ingredients.find(ing => ing.id === purchase.ingredientId)
        return ingredient?.category || 'ingredient'
    }

    const getCategoryDisplayName = (category: string) => {
        const categoryMap: { [key: string]: string } = {
            packaging: 'Packaging',
            cleaning: 'Cleaning',
            delivery: 'Delivery',
            office: 'Office',
            other: 'Other',
            seafood: 'Seafood',
            vegetables: 'Vegetables',
            fruits: 'Fruits',
            spices: 'Spices',
            dairy: 'Dairy',
            grains: 'Grains'
        }
        return categoryMap[category] || category
    }

    const getCategoryColor = (category: string) => {
        const colorMap: { [key: string]: string } = {
            packaging: 'bg-purple-100 text-purple-800',
            cleaning: 'bg-blue-100 text-blue-800',
            delivery: 'bg-green-100 text-green-800',
            office: 'bg-gray-100 text-gray-800',
            other: 'bg-yellow-100 text-yellow-800',
            seafood: 'bg-red-100 text-red-800',
            vegetables: 'bg-green-100 text-green-800',
            fruits: 'bg-orange-100 text-orange-800',
            spices: 'bg-yellow-100 text-yellow-800',
            dairy: 'bg-blue-100 text-blue-800',
            grains: 'bg-amber-100 text-amber-800'
        }
        return colorMap[category] || 'bg-gray-100 text-gray-800'
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const handleDelete = (purchaseId: string) => {
        if (confirm('Are you sure you want to delete this purchase record? This action cannot be undone.')) {
            removePurchase(purchaseId)
        }
    }

    const totalSpent = filteredPurchases.reduce((sum, purchase) => sum + purchase.totalCost, 0)

    // Get unique suppliers for filter suggestions
    const uniqueSuppliers = useMemo(() => {
        const suppliers = purchases.map(p => p.supplier).filter(Boolean)
        return [...new Set(suppliers)].sort()
    }, [purchases])

    return (
        <div className={`space-y-${isMobile ? '4' : '6'}`}>
            {/* Filters */}
            <div className={`bg-gray-50 rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
                <h3 className={`font-medium text-gray-900 mb-${isMobile ? '3' : '4'} ${isMobile ? 'text-base' : 'text-lg'}`}>
                    Filters
                </h3>
                <div className={`grid gap-${isMobile ? '3' : '4'} ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-4'}`}>
                    <div>
                        <label className={`block text-gray-700 mb-1 ${isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}`}>
                            Type
                        </label>
                        <select
                            value={filter.purchaseType}
                            onChange={(e) => setFilter({ ...filter, purchaseType: e.target.value })}
                            className={`w-full border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${isMobile ? 'px-2 py-2 text-sm' : 'px-3 py-2'}`}
                        >
                            <option value="">All Types</option>
                            <option value="ingredient">Food Ingredients</option>
                            <option value="supply">Supplies & Equipment</option>
                        </select>
                    </div>

                    <div>
                        <label className={`block text-gray-700 mb-1 ${isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}`}>
                            Ingredient
                        </label>
                        <select
                            value={filter.ingredientId}
                            onChange={(e) => setFilter({ ...filter, ingredientId: e.target.value })}
                            className={`w-full border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${isMobile ? 'px-2 py-2 text-sm' : 'px-3 py-2'}`}
                            disabled={filter.purchaseType === 'supply'}
                        >
                            <option value="">All Ingredients</option>
                            {ingredients.map(ingredient => (
                                <option key={ingredient.id} value={ingredient.id}>
                                    {ingredient.name}
                                </option>
                            ))}
                        </select>
                        {filter.purchaseType === 'supply' && (
                            <p className={`text-gray-500 mt-1 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                                Ingredient filter disabled for supplies
                            </p>
                        )}
                    </div>

                    <div>
                        <label className={`block text-gray-700 mb-1 ${isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}`}>
                            Supplier
                        </label>
                        <input
                            type="text"
                            value={filter.supplier}
                            onChange={(e) => setFilter({ ...filter, supplier: e.target.value })}
                            className={`w-full border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${isMobile ? 'px-2 py-2 text-sm' : 'px-3 py-2'}`}
                            placeholder="Filter by supplier..."
                            list="supplier-suggestions"
                        />
                        <datalist id="supplier-suggestions">
                            {uniqueSuppliers.map(supplier => (
                                <option key={supplier} value={supplier} />
                            ))}
                        </datalist>
                    </div>

                    <div>
                        <label className={`block text-gray-700 mb-1 ${isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}`}>
                            Date Range
                        </label>
                        <select
                            value={filter.dateRange}
                            onChange={(e) => setFilter({ ...filter, dateRange: e.target.value })}
                            className={`w-full border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${isMobile ? 'px-2 py-2 text-sm' : 'px-3 py-2'}`}
                        >
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 90 days</option>
                            <option value="all">All time</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className={`bg-white border rounded-sm ${isMobile ? 'p-3' : 'p-4'}`}>
                <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-between items-center'}`}>
                    <div>
                        <span className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-sm'}`}>
                            Showing {filteredPurchases.length} purchases
                        </span>
                        {filter.purchaseType && (
                            <span className={`text-gray-500 ${isMobile ? 'text-xs block mt-1' : 'text-sm ml-2'}`}>
                                ({filter.purchaseType === 'ingredient' ? 'Food Ingredients' : 'Supplies & Equipment'})
                            </span>
                        )}
                    </div>
                    <div className={isMobile ? 'mt-2' : 'text-right'}>
                        <span className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-sm'}`}>Total spent: </span>
                        <span className={`font-bold text-green-600 ${isMobile ? 'text-lg' : 'text-lg'}`}>
                            ${totalSpent.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Purchases List */}
            <div className={`space-y-${isMobile ? '3' : '4'}`}>
                {filteredPurchases.length === 0 ? (
                    <div className="text-center py-12">
                        <div className={`text-gray-500 mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
                            No purchases found
                        </div>
                        <div className={`text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            {purchases.length === 0
                                ? "No purchases recorded yet. Record your first purchase above."
                                : "No purchases match your current filters."
                            }
                        </div>
                    </div>
                ) : (
                    filteredPurchases.map(purchase => {
                        const displayName = getDisplayName(purchase)
                        const category = getCategory(purchase)
                        const categoryDisplayName = getCategoryDisplayName(category)
                        const categoryColor = getCategoryColor(category)

                        return (
                            <div 
                                key={purchase.id} 
                                className={`bg-white border border-gray-200 rounded-sm hover:shadow-sm transition-shadow ${isMobile ? 'p-3' : 'p-4'}`}
                            >
                                <div className={`${isMobile ? 'flex-col' : 'flex justify-between items-start'}`}>
                                    <div className={isMobile ? '' : 'flex-1'}>
                                        <div className={`flex items-center gap-${isMobile ? '2' : '3'} mb-${isMobile ? '2' : '2'} ${isMobile ? 'flex-wrap' : ''}`}>
                                            <div className="flex items-center gap-2">
                                                {purchase.purchaseType === 'supply' ? (
                                                    <span className={isMobile ? 'text-base' : 'text-lg'}>📦</span>
                                                ) : (
                                                    <span className={isMobile ? 'text-base' : 'text-lg'}>🍣</span>
                                                )}
                                                <h3 className={`font-semibold text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
                                                    {displayName.length > 30 && isMobile ? `${displayName.substring(0, 30)}...` : displayName}
                                                </h3>
                                            </div>
                                            <div className={`flex gap-1 ${isMobile ? 'mt-1' : ''}`}>
                                                <span className={`px-2 py-1 rounded-full ${categoryColor} ${isMobile ? 'text-xs' : 'text-xs'}`}>
                                                    {isMobile && categoryDisplayName.length > 12 
                                                        ? `${categoryDisplayName.substring(0, 12)}...` 
                                                        : categoryDisplayName}
                                                </span>
                                                {purchase.purchaseType === 'supply' && (
                                                    <span className={`bg-gray-100 text-gray-600 px-2 py-1 rounded-full ${isMobile ? 'text-xs' : 'text-xs'}`}>
                                                        Supply
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className={`grid gap-${isMobile ? '3' : '4'} ${isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-4'}`}>
                                            <div>
                                                <span className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Quantity:</span>
                                                <div className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
                                                    {purchase.quantity} {purchase.unit}
                                                </div>
                                            </div>
                                            {purchase.purchaseType === 'ingredient' ? (
                                                <div>
                                                    <span className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Price:</span>
                                                    <div className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
                                                        ${purchase.pricePerKg.toFixed(2)}/kg
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <span className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Unit Price:</span>
                                                    <div className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
                                                        ${(purchase.totalCost / purchase.quantity).toFixed(2)}/{purchase.unit}
                                                    </div>
                                                </div>
                                            )}
                                            <div>
                                                <span className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Supplier:</span>
                                                <div className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
                                                    {isMobile && purchase.supplier.length > 20 
                                                        ? `${purchase.supplier.substring(0, 20)}...` 
                                                        : purchase.supplier}
                                                </div>
                                            </div>
                                            <div>
                                                <span className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Date:</span>
                                                <div className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
                                                    {formatDate(purchase.purchaseDate)}
                                                </div>
                                            </div>
                                        </div>

                                        {(purchase.deliveryDate || purchase.invoiceNumber || purchase.notes) && (
                                            <div className={`mt-3 pt-3 border-t border-gray-200 ${isMobile ? 'mt-2 pt-2' : ''}`}>
                                                <div className={`grid gap-2 text-gray-600 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
                                                    {purchase.deliveryDate && (
                                                        <div className={isMobile ? 'text-xs' : 'text-xs'}>
                                                            <span className="font-medium">Delivery:</span> {formatDate(purchase.deliveryDate)}
                                                        </div>
                                                    )}
                                                    {purchase.invoiceNumber && (
                                                        <div className={isMobile ? 'text-xs' : 'text-xs'}>
                                                            <span className="font-medium">Invoice:</span> {purchase.invoiceNumber}
                                                        </div>
                                                    )}
                                                    {purchase.notes && (
                                                        <div className={isMobile ? 'text-xs col-span-1' : 'md:col-span-2 text-xs'}>
                                                            <span className="font-medium">Notes:</span> 
                                                            <span className="ml-1">
                                                                {isMobile && purchase.notes.length > 50 
                                                                    ? `${purchase.notes.substring(0, 50)}...` 
                                                                    : purchase.notes}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className={`flex items-center gap-2 ${isMobile ? 'mt-3 justify-between border-t border-gray-100 pt-3' : 'flex-col items-end gap-2 ml-4'}`}>
                                        <div className={isMobile ? 'text-left' : 'text-right'}>
                                            <div className={`font-bold text-green-600 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                                                ${purchase.totalCost.toFixed(2)}
                                            </div>
                                            <div className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                                                Total cost
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleDelete(purchase.id)}
                                            className={`text-red-600 hover:text-red-800 font-medium border border-red-200 rounded hover:bg-red-50 transition-colors ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm'}`}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}