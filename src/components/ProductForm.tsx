import React, { useState, useEffect } from 'react'
import { useIngredients } from '../context/IngredientsContext'
import { useProducts } from '../context/ProductsContext'
import { productCost, calculateProfitMargin } from '../utils/costCalculations'
import type { ProductIngredient, Unit } from '../types/types'

export default function ProductForm() {
    const { ingredients } = useIngredients()
    const { products, addProduct, updateProduct } = useProducts()

    const [selectedProductId, setSelectedProductId] = useState<string>('')
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        portionSize: '',
        sellingPrice: '', // Keep as string for input
        preparationTime: '0', // Add this field
        tags: '' // Add tags as comma-separated string
    })
    const [productIngredients, setProductIngredients] = useState<ProductIngredient[]>([])
    const [newIngredient, setNewIngredient] = useState({
        ingredientId: '',
        quantity: '',
        unit: 'g' as Unit
    })

    // Load product when selected
    useEffect(() => {
        if (selectedProductId) {
            const product = products.find(p => p.id === selectedProductId)
            if (product) {
                setFormData({
                    name: product.name,
                    description: product.description || '',
                    category: product.category,
                    portionSize: product.portionSize,
                    sellingPrice: product.sellingPrice ? product.sellingPrice.toString() : '',
                    preparationTime: product.preparationTime?.toString() || '0',
                    tags: product.tags?.join(', ') || ''
                })
                setProductIngredients(product.ingredients)
            }
        } else {
            setFormData({
                name: '',
                description: '',
                category: '',
                portionSize: '',
                sellingPrice: '',
                preparationTime: '0',
                tags: ''
            })
            setProductIngredients([])
        }
    }, [selectedProductId, products])

    // Calculate total cost - use a simpler approach
    const totalCost = productIngredients.reduce((total, productIngredient) => {
        const ingredient = ingredients.find(ing => ing.id === productIngredient.ingredientId)
        if (!ingredient) return total

        // Convert quantity to KG for cost calculation
        let quantityInKg = productIngredient.quantity
        if (productIngredient.unit === 'g') quantityInKg = productIngredient.quantity / 1000
        if (productIngredient.unit === 'ml') quantityInKg = productIngredient.quantity / 1000

        return total + (ingredient.pricePerKg * quantityInKg)
    }, 0)

    // Calculate profit and margin only when we have valid numbers
    const sellingPriceNum = formData.sellingPrice ? parseFloat(formData.sellingPrice) : 0
    const profit = sellingPriceNum > 0 ? sellingPriceNum - totalCost : 0
    const profitMargin = sellingPriceNum > 0 ? calculateProfitMargin(totalCost, sellingPriceNum) : 0

    const handleAddIngredient = () => {
        if (!newIngredient.ingredientId || !newIngredient.quantity) return

        setProductIngredients(prev => [...prev, {
            ingredientId: newIngredient.ingredientId,
            quantity: Number.parseFloat(newIngredient.quantity),
            unit: newIngredient.unit
        }])

        setNewIngredient({
            ingredientId: '',
            quantity: '',
            unit: 'g'
        })
    }

    const handleRemoveIngredient = (index: number) => {
        setProductIngredients(prev => prev.filter((_, i) => i !== index))
    }

    // Update the ProductForm to ensure costPrice is always calculated
    const handleSave = () => {
        if (!formData.name) {
            alert('Please enter a product name')
            return
        }

        // Calculate profit margin properly
        const sellingPriceNum = formData.sellingPrice ? parseFloat(formData.sellingPrice.toString()) : 0
        const profitMargin = sellingPriceNum > 0 ? calculateProfitMargin(totalCost, sellingPriceNum) : 0

        // Parse tags from comma-separated string
        const tags = formData.tags
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)

        const productData = {
            name: formData.name.trim(),
            description: formData.description.trim(),
            category: formData.category.trim(),
            portionSize: formData.portionSize.trim(),
            ingredients: productIngredients,
            costPrice: totalCost, // Make sure this is always set
            sellingPrice: sellingPriceNum > 0 ? sellingPriceNum : undefined,
            profitMargin: sellingPriceNum > 0 ? profitMargin : undefined,
            preparationTime: parseInt(formData.preparationTime) || 0,
            isActive: true,
            tags: tags
        }

        if (selectedProductId) {
            updateProduct(selectedProductId, productData)
            alert('Product updated successfully!')
        } else {
            addProduct(productData)
            setSelectedProductId('')
            setFormData({
                name: '',
                description: '',
                category: '',
                portionSize: '',
                sellingPrice: '',
                preparationTime: '0',
                tags: ''
            })
            setProductIngredients([])
            alert('Product created successfully!')
        }
    }

    const getIngredientName = (ingredientId: string) => {
        return ingredients.find(ing => ing.id === ingredientId)?.name || 'Unknown'
    }

    const getIngredientCost = (ingredient: ProductIngredient) => {
        const ing = ingredients.find(i => i.id === ingredient.ingredientId)
        if (!ing) return 0

        // Proper cost calculation based on unit
        let quantityInKg = ingredient.quantity
        if (ingredient.unit === 'g') quantityInKg = ingredient.quantity / 1000
        if (ingredient.unit === 'ml') quantityInKg = ingredient.quantity / 1000

        return ing.pricePerKg * quantityInKg
    }

    return (
        <div className="space-y-6 mt-4">
            {/* Product Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Product to Edit
                </label>
                <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Create New Product</option>
                    {products.map(product => (
                        <option key={product.id} value={product.id}>
                            {product.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Product Details */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Classic Ceviche"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Appetizer, Main Course"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preparation Time (minutes)</label>
                    <input
                        type="number"
                        min="0"
                        value={formData.preparationTime}
                        onChange={(e) => setFormData({ ...formData, preparationTime: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 15"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                    <input
                        type="text"
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., spicy, popular, seasonal"
                    />
                    <div className="text-xs text-gray-500 mt-1">Separate tags with commas</div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Product description..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Portion Size</label>
                <input
                    type="text"
                    value={formData.portionSize}
                    onChange={(e) => setFormData({ ...formData, portionSize: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 300g bowl, 500ml cup"
                />
            </div>

            {/* Ingredients Section */}
            <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Ingredients</h3>

                {/* Add Ingredient */}
                <div className="flex gap-2 mb-4">
                    <select
                        value={newIngredient.ingredientId}
                        onChange={(e) => setNewIngredient({ ...newIngredient, ingredientId: e.target.value })}
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Select Ingredient</option>
                        {ingredients.map(ingredient => (
                            <option key={ingredient.id} value={ingredient.id}>
                                {ingredient.name} (${ingredient.pricePerKg}/kg)
                            </option>
                        ))}
                    </select>

                    <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={newIngredient.quantity}
                        onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                        placeholder="Quantity"
                        className="w-24 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <select
                        value={newIngredient.unit}
                        onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value as Unit })}
                        className="w-20 border border-gray-300 rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="l">l</option>
                        <option value="unit">unit</option>
                    </select>

                    <button
                        type="button"
                        onClick={handleAddIngredient}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        Add
                    </button>
                </div>

                {/* Ingredients List */}
                <div className="space-y-2">
                    {productIngredients.map((ingredient, index) => (
                        <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                            <div>
                                <span className="font-medium text-gray-900">
                                    {getIngredientName(ingredient.ingredientId)}
                                </span>
                                <span className="text-sm text-gray-600 ml-2">
                                    {ingredient.quantity}{ingredient.unit} - ${getIngredientCost(ingredient).toFixed(2)}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemoveIngredient(index)}
                                className="text-red-600 hover:text-red-800 font-medium"
                            >
                                Remove
                            </button>
                        </div>
                    ))}

                    {productIngredients.length === 0 && (
                        <div className="text-center text-gray-500 py-4">
                            No ingredients added. Add ingredients above.
                        </div>
                    )}
                </div>

                {/* Total Cost */}
                <div className="mt-4 p-3 bg-blue-50 rounded border">
                    <div className="flex justify-between items-center font-medium text-gray-900">
                        <span>Total Product Cost:</span>
                        <span className="text-lg">${totalCost.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Selling Price */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (Optional)</label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                />

                {/* Profit Display - Only show when we have a valid selling price */}
                {formData.sellingPrice && !isNaN(sellingPriceNum) && sellingPriceNum > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded border">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <div className="text-gray-600">Cost Price:</div>
                                <div className="font-medium">${totalCost.toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-gray-600">Selling Price:</div>
                                <div className="font-medium">${sellingPriceNum.toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-gray-600">Profit:</div>
                                <div className={`font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ${profit.toFixed(2)}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-600">Margin:</div>
                                <div className={`font-medium ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {profitMargin.toFixed(1)}%
                                </div>
                            </div>
                        </div>

                        {/* Additional profit percentage based on cost */}
                        {totalCost > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                                Profit percentage: {((profit / totalCost) * 100).toFixed(1)}% of cost
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
            >
                {selectedProductId ? 'Update Product' : 'Create Product'}
            </button>
        </div>
    )
}