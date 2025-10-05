import React, { useState, useEffect } from 'react'
import { usePurchases } from '../context/PurchasesContext'
import { useIngredients } from '../context/IngredientsContext'
import type { Unit } from '../types/types'

export default function PurchaseForm() {
    const { addPurchase } = usePurchases()
    const { ingredients, updateIngredient } = useIngredients()

    const [formData, setFormData] = useState({
        ingredientId: '',
        quantity: '',
        unit: 'kg' as Unit,
        pricePerKg: '',
        supplier: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        deliveryDate: '',
        invoiceNumber: '',
        notes: ''
    })

    const [selectedIngredient, setSelectedIngredient] = useState<any>(null)

    // Update selected ingredient when ingredientId changes
    useEffect(() => {
        if (formData.ingredientId) {
            const ingredient = ingredients.find(ing => ing.id === formData.ingredientId)
            setSelectedIngredient(ingredient)
            // Pre-fill current price
            if (ingredient) {
                setFormData(prev => ({
                    ...prev,
                    pricePerKg: ingredient.pricePerKg.toString()
                }))
            }
        } else {
            setSelectedIngredient(null)
        }
    }, [formData.ingredientId, ingredients])

    const calculateTotalCost = (): number => {
        if (!formData.quantity || !formData.pricePerKg) return 0
        const quantity = parseFloat(formData.quantity)
        const pricePerKg = parseFloat(formData.pricePerKg)

        // Convert quantity to kg for calculation
        let quantityInKg = quantity
        if (formData.unit === 'g') quantityInKg = quantity / 1000
        if (formData.unit === 'ml') quantityInKg = quantity / 1000

        return quantityInKg * pricePerKg
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.ingredientId || !formData.quantity || !formData.pricePerKg) {
            alert('Please fill in all required fields')
            return
        }

        const totalCost = calculateTotalCost()
        const purchaseData = {
            ingredientId: formData.ingredientId,
            quantity: parseFloat(formData.quantity),
            unit: formData.unit,
            totalCost,
            pricePerKg: parseFloat(formData.pricePerKg),
            supplier: formData.supplier,
            purchaseDate: formData.purchaseDate,
            deliveryDate: formData.deliveryDate || undefined,
            invoiceNumber: formData.invoiceNumber || undefined,
            notes: formData.notes || undefined,
            quantityGrams: formData.unit === 'g' ? parseFloat(formData.quantity) : formData.unit === 'kg' ? parseFloat(formData.quantity) * 1000 : formData.unit === 'ml' ? parseFloat(formData.quantity) : formData.unit === 'l' ? parseFloat(formData.quantity) * 1000 : parseFloat(formData.quantity)
        }

        addPurchase(purchaseData)

        // Update ingredient stock and price
        if (selectedIngredient) {
            const quantityInKg = formData.unit === 'g' ? parseFloat(formData.quantity) / 1000 : parseFloat(formData.quantity)
            updateIngredient(selectedIngredient.id, {
                pricePerKg: parseFloat(formData.pricePerKg),
                currentStock: selectedIngredient.currentStock + quantityInKg
            })
        }

        // Reset form
        setFormData({
            ingredientId: '',
            quantity: '',
            unit: 'kg',
            pricePerKg: '',
            supplier: '',
            purchaseDate: new Date().toISOString().split('T')[0],
            deliveryDate: '',
            invoiceNumber: '',
            notes: ''
        })

        alert('Purchase recorded successfully!')
    }

    const totalCost = calculateTotalCost()

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Ingredient Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ingredient *
                    </label>
                    <select
                        value={formData.ingredientId}
                        onChange={(e) => setFormData({ ...formData, ingredientId: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    >
                        <option value="">Select Ingredient</option>
                        {ingredients.map(ingredient => (
                            <option key={ingredient.id} value={ingredient.id}>
                                {ingredient.name} (Current: ${ingredient.pricePerKg}/kg)
                            </option>
                        ))}
                    </select>
                </div>

                {/* Supplier */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Supplier *
                    </label>
                    <input
                        type="text"
                        value={formData.supplier}
                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Supplier name"
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Quantity */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity *
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00"
                            required
                        />
                        <select
                            value={formData.unit}
                            onChange={(e) => setFormData({ ...formData, unit: e.target.value as Unit })}
                            className="w-20 border border-gray-300 rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="l">l</option>
                            <option value="ml">ml</option>
                            <option value="unit">unit</option>
                        </select>
                    </div>
                </div>

                {/* Price per KG */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price per KG *
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.pricePerKg}
                        onChange={(e) => setFormData({ ...formData, pricePerKg: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                        required
                    />
                </div>

                {/* Total Cost (Read-only) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Cost
                    </label>
                    <div className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50">
                        <span className="font-medium">${totalCost.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Purchase Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Purchase Date *
                    </label>
                    <input
                        type="date"
                        value={formData.purchaseDate}
                        onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                {/* Delivery Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delivery Date
                    </label>
                    <input
                        type="date"
                        value={formData.deliveryDate}
                        onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Invoice Number */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Invoice Number
                    </label>
                    <input
                        type="text"
                        value={formData.invoiceNumber}
                        onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional"
                    />
                </div>
            </div>

            {/* Notes */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                </label>
                <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Any additional notes about this purchase..."
                />
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
            >
                Record Purchase
            </button>
        </form>
    )
}