import { useState, useEffect } from 'react'
import { usePurchases } from '../../../../context/PurchasesContext'
import { useIngredients } from '../../../../context/IngredientsContext'
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import type { Unit } from '../../../../types/types'
import { db } from '../../../../firebase/firebase'

export default function PurchaseForm() {
    const { addPurchase } = usePurchases()
    const { ingredients, updateIngredient, addIngredient } = useIngredients()

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

    const [_selectedIngredient, setSelectedIngredient] = useState<any>(null)
    const [showNewIngredientForm, setShowNewIngredientForm] = useState(false)
    const [newIngredient, setNewIngredient] = useState({
        name: '',
        category: 'seafood',
        unit: 'kg' as Unit,
        minimumStock: '0'
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [quickMode, setQuickMode] = useState(true)

    // Update selected ingredient when ingredientId changes
    useEffect(() => {
        if (formData.ingredientId) {
            const ingredient = ingredients.find(ing => ing.id === formData.ingredientId)
            setSelectedIngredient(ingredient)
            if (ingredient) {
                setFormData(prev => ({
                    ...prev,
                    pricePerKg: ingredient.pricePerKg?.toString() || ''
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

        let quantityInKg = quantity
        if (formData.unit === 'g') quantityInKg = quantity / 1000
        if (formData.unit === 'ml') quantityInKg = quantity / 1000
        if (formData.unit === 'l') quantityInKg = quantity

        return quantityInKg * pricePerKg
    }

    const handleAddNewIngredient = async () => {
        if (!newIngredient.name) {
            alert('Please enter ingredient name')
            return
        }

        try {
            const ingredientData = {
                name: newIngredient.name.trim(),
                pricePerKg: 0,
                unit: newIngredient.unit,
                category: newIngredient.category,
                minimumStock: parseFloat(newIngredient.minimumStock) || 0,
                currentStock: 0,
                stockGrams: 0,
            }

            const firebaseId = await addIngredient(ingredientData)

            setFormData(prev => ({
                ...prev,
                ingredientId: firebaseId
            }))

            setShowNewIngredientForm(false)
            setNewIngredient({
                name: '',
                category: 'seafood',
                unit: 'kg',
                minimumStock: '0'
            })

            alert('Ingredient added! Now complete the purchase.')
        } catch (error) {
            console.error('Error adding ingredient:', error)
            alert('Error adding ingredient. Please try again.')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Check only truly required fields
        if (!formData.ingredientId || !formData.quantity || !formData.pricePerKg || !formData.supplier || !formData.purchaseDate) {
            alert('Please fill in all required fields: Ingredient, Quantity, Price per Kg, Supplier, and Purchase Date')
            return
        }

        // Additional validation for numeric fields
        if (parseFloat(formData.quantity) <= 0 || parseFloat(formData.pricePerKg) <= 0) {
            alert('Quantity and Price per Kg must be greater than 0')
            return
        }

        setIsSubmitting(true)

        try {
            const totalCost = calculateTotalCost()
            const quantity = parseFloat(formData.quantity)
            const pricePerKg = parseFloat(formData.pricePerKg)

            // Calculate quantity in grams for consistent storage
            let quantityGrams = quantity
            let quantityInKg = quantity

            switch (formData.unit) {
                case 'kg':
                    quantityGrams = quantity * 1000
                    break
                case 'g':
                    quantityGrams = quantity
                    quantityInKg = quantity / 1000
                    break
                case 'l':
                    quantityGrams = quantity * 1000
                    break
                case 'ml':
                    quantityGrams = quantity
                    quantityInKg = quantity / 1000
                    break
                case 'unit':
                    quantityGrams = quantity
                    quantityInKg = quantity
                    break
            }

            const selectedIngredient = ingredients.find(ing => ing.id === formData.ingredientId)

            if (!selectedIngredient) {
                throw new Error('Selected ingredient not found')
            }

            const ingredientName = selectedIngredient.name

            // 1. Create purchase record in Firebase
            const purchaseData = {
                ingredientId: formData.ingredientId,
                ingredientName: ingredientName,
                quantity: quantity,
                unit: formData.unit,
                totalCost: totalCost,
                pricePerKg: pricePerKg,
                supplier: formData.supplier.trim(),
                purchaseDate: formData.purchaseDate,
                deliveryDate: formData.deliveryDate || null,
                invoiceNumber: formData.invoiceNumber?.trim() || null,
                notes: formData.notes?.trim() || null,
                quantityGrams: quantityGrams,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }

            const purchaseRef = await addDoc(collection(db, 'purchases'), purchaseData)
            console.log('Purchase recorded with ID: ', purchaseRef.id)

            // 2. Update ingredient in Firebase
            const newStock = (selectedIngredient.currentStock || 0) + quantityInKg
            const newStockGrams = (selectedIngredient.stockGrams || 0) + quantityGrams

            const ingredientUpdate = {
                pricePerKg: pricePerKg,
                currentStock: newStock,
                stockGrams: newStockGrams,
                updatedAt: serverTimestamp()
            }

            await updateDoc(doc(db, 'ingredients', selectedIngredient.id), ingredientUpdate)

            // 3. Update local state
            updateIngredient(selectedIngredient.id, {
                pricePerKg: pricePerKg,
                currentStock: newStock,
                stockGrams: newStockGrams
            })

            // 4. Update local purchases context
            await addPurchase({
                ingredientId: formData.ingredientId,
                ingredientName: ingredientName,
                quantity: quantity,
                unit: formData.unit,
                totalCost: totalCost,
                pricePerKg: pricePerKg,
                supplier: formData.supplier.trim(),
                purchaseDate: formData.purchaseDate,
                deliveryDate: formData.deliveryDate || '',
                invoiceNumber: formData.invoiceNumber?.trim() || '',
                notes: formData.notes?.trim() || '',
                quantityGrams: quantityGrams
            })

            // Reset form but keep supplier for quick entry
            setFormData({
                ingredientId: '',
                quantity: '',
                unit: 'kg',
                pricePerKg: '',
                supplier: formData.supplier, // Keep supplier for quick entry
                purchaseDate: new Date().toISOString().split('T')[0],
                deliveryDate: '',
                invoiceNumber: '',
                notes: ''
            })

            alert('Purchase recorded successfully! Inventory updated.')

        } catch (error) {
            console.error('Error recording purchase:', error)
            alert('Error recording purchase. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const totalCost = calculateTotalCost()

    return (
        <div className="space-y-6">
            {/* Quick Mode Toggle */}
            <div className="bg-white border border-gray-200 rounded-sm p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-light text-gray-900 tracking-wide">ENTRY MODE</h3>
                        <p className="text-sm text-gray-500 font-light">
                            {quickMode ? 'Quick supermarket mode' : 'Detailed invoice mode'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setQuickMode(!quickMode)}
                        className="px-4 py-2 bg-gray-900 text-white text-sm font-light tracking-wide rounded-sm hover:bg-gray-800 transition-colors"
                    >
                        {quickMode ? 'SWITCH TO DETAILED' : 'SWITCH TO QUICK'}
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Ingredient Selection */}
                <div className="bg-white border border-gray-200 rounded-sm p-6">
                    <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">1. SELECT INGREDIENT</h3>

                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">
                                INGREDIENT *
                            </label>
                            <select
                                value={formData.ingredientId}
                                onChange={(e) => setFormData({ ...formData, ingredientId: e.target.value })}
                                className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide"
                                required
                                disabled={isSubmitting}
                            >
                                <option value="">Select Ingredient</option>
                                {ingredients.map(ingredient => (
                                    <option key={ingredient.id} value={ingredient.id}>
                                        {ingredient.name}
                                        {ingredient.currentStock > 0 &&
                                            ` (Stock: ${ingredient.currentStock.toFixed(2)}${ingredient.unit})`
                                        }
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="text-gray-500 font-light">or</div>

                        <button
                            type="button"
                            onClick={() => setShowNewIngredientForm(!showNewIngredientForm)}
                            className="px-4 py-3 bg-gray-900 text-white text-sm font-light tracking-wide rounded-sm hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-900"
                            disabled={isSubmitting}
                        >
                            {showNewIngredientForm ? 'CANCEL' : 'NEW INGREDIENT'}
                        </button>
                    </div>

                    {/* New Ingredient Form */}
                    {showNewIngredientForm && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-sm border">
                            <h4 className="font-light text-gray-900 tracking-wide mb-3">ADD NEW INGREDIENT</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">
                                        NAME *
                                    </label>
                                    <input
                                        type="text"
                                        value={newIngredient.name}
                                        onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                                        className="w-full border border-gray-300 rounded-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light"
                                        placeholder="e.g., Fresh Tuna, Salmon Fillet"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">
                                        CATEGORY
                                    </label>
                                    <select
                                        value={newIngredient.category}
                                        onChange={(e) => setNewIngredient({ ...newIngredient, category: e.target.value })}
                                        className="w-full border border-gray-300 rounded-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light"
                                    >
                                        <option value="seafood">Seafood</option>
                                        <option value="vegetables">Vegetables</option>
                                        <option value="fruits">Fruits</option>
                                        <option value="spices">Spices</option>
                                        <option value="dairy">Dairy</option>
                                        <option value="grains">Grains</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={handleAddNewIngredient}
                                    className="px-4 py-2 bg-gray-900 text-white text-sm font-light tracking-wide rounded-sm hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-900"
                                >
                                    ADD INGREDIENT
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Purchase Details */}
                <div className="bg-white border border-gray-200 rounded-sm p-6">
                    <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">2. PURCHASE DETAILS</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">
                                SUPPLIER *
                            </label>
                            <input
                                type="text"
                                value={formData.supplier}
                                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                                className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide"
                                placeholder="Supplier name"
                                required
                                disabled={isSubmitting}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">
                                PURCHASE DATE *
                            </label>
                            <input
                                type="date"
                                value={formData.purchaseDate}
                                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                                className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide"
                                required
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                        <div>
                            <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">
                                QUANTITY *
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                    className="flex-1 border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide"
                                    placeholder="0.00"
                                    required
                                    disabled={isSubmitting}
                                />
                                <select
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as Unit })}
                                    className="w-20 border border-gray-300 rounded-sm px-2 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light"
                                    disabled={isSubmitting}
                                >
                                    <option value="kg">kg</option>
                                    <option value="g">g</option>
                                    <option value="l">l</option>
                                    <option value="ml">ml</option>
                                    <option value="unit">unit</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">
                                PRICE PER KG *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.pricePerKg}
                                onChange={(e) => setFormData({ ...formData, pricePerKg: e.target.value })}
                                className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide"
                                placeholder="0.00"
                                required
                                disabled={isSubmitting}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">
                                TOTAL COST
                            </label>
                            <div className="w-full border border-gray-300 rounded-sm px-3 py-3 bg-gray-50">
                                <span className="font-light text-lg text-gray-900">${totalCost.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Fields (Conditional) */}
                    {!quickMode && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div>
                                <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">
                                    DELIVERY DATE
                                </label>
                                <input
                                    type="date"
                                    value={formData.deliveryDate}
                                    onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                                    className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide"
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">
                                    INVOICE NUMBER
                                </label>
                                <input
                                    type="text"
                                    value={formData.invoiceNumber}
                                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                                    className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide"
                                    placeholder="Optional"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    )}

                    {/* Notes (Conditional) */}
                    {!quickMode && (
                        <div className="mt-6">
                            <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">
                                NOTES
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light"
                                rows={3}
                                placeholder="Quality notes, special instructions, etc."
                                disabled={isSubmitting}
                            />
                        </div>
                    )}
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gray-900 text-white py-4 px-4 rounded-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 font-light tracking-wide disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    {isSubmitting ? 'RECORDING PURCHASE...' : 'RECORD PURCHASE'}
                </button>
            </form>

            {/* Quick Supermarket Tips */}
            {quickMode && (
                <div className="bg-blue-50 border border-blue-200 rounded-sm p-4">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <h4 className="font-light text-blue-900 tracking-wide text-sm">QUICK ENTRY MODE</h4>
                            <p className="text-blue-700 font-light text-sm mt-1">
                                Supplier is remembered between entries for faster data entry while shopping.
                                Switch to detailed mode for invoice numbers and delivery dates.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}