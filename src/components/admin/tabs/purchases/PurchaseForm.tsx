import { useState, useEffect } from 'react'
import { useIngredients } from '../../../../context/IngredientsContext'
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import type { Unit } from '../../../../types/types'
import { db } from '../../../../firebase/firebase'
import type { PurchaseLocale } from '../../../../pages/admin/tabs/purchases/purchaseTypes'
import {
    createPurchase,
    normalizePurchasePayload,
} from '../../../../pages/admin/tabs/purchases/purchaseFirestore'
import { formatMoney } from '../../../../pages/admin/tabs/purchases/purchaseLocale'

interface PurchaseFormProps {
    isMobile?: boolean
    locale?: PurchaseLocale
}

type PurchaseType = 'ingredient' | 'supply'
type SupplyCategory = 'packaging' | 'cleaning' | 'delivery' | 'office' | 'other'
type PaymentStatus = 'paid' | 'unpaid'

interface NewIngredientForm {
    name: string
    category: string
    unit: Unit
    minimumStock: string
    displayOnBYOS: boolean
}

export default function PurchaseForm({
    isMobile = false,
    locale = 'fr-CA',
}: PurchaseFormProps) {
    const { ingredients, updateIngredient, addIngredient } = useIngredients()

    const [formData, setFormData] = useState({
        purchaseType: 'ingredient' as PurchaseType,
        ingredientId: '',
        supplyName: '',
        supplyCategory: 'packaging' as SupplyCategory,
        quantity: '',
        unit: 'unit' as Unit,
        pricePerKg: '',
        totalCost: '',
        supplier: '',
        supplierAddress: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        deliveryDate: '',
        invoiceNumber: '',
        paymentStatus: 'paid' as PaymentStatus,
        paymentTerms: '',
        paymentAccount: '',
        attachmentUrl: '',
        notes: '',
    })

    const [selectedIngredient, setSelectedIngredient] = useState<any>(null)
    const [showNewIngredientForm, setShowNewIngredientForm] = useState(false)
    const [newIngredient, setNewIngredient] = useState<NewIngredientForm>({
        name: '',
        category: 'seafood',
        unit: 'kg',
        minimumStock: '0',
        displayOnBYOS: false,
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [quickMode, setQuickMode] = useState(true)
    const [showBYOSToggle, setShowBYOSToggle] = useState(false)

    useEffect(() => {
        if (formData.ingredientId && formData.purchaseType === 'ingredient') {
            const ingredient = ingredients.find((ing) => ing.id === formData.ingredientId)
            setSelectedIngredient(ingredient)

            if (ingredient) {
                setFormData((prev) => ({
                    ...prev,
                    pricePerKg: ingredient.pricePerKg?.toString() || '',
                    unit: ingredient.unit || 'kg',
                }))
            }
        } else {
            setSelectedIngredient(null)
            setShowBYOSToggle(false)
        }
    }, [formData.ingredientId, formData.purchaseType, ingredients])

    function calculateIngredientTotalCost(): number {
        if (!formData.quantity || !formData.pricePerKg) return 0

        const quantity = parseFloat(formData.quantity)
        const pricePerKg = parseFloat(formData.pricePerKg)

        if (!Number.isFinite(quantity) || !Number.isFinite(pricePerKg)) return 0

        let quantityInKg = quantity
        if (formData.unit === 'g') quantityInKg = quantity / 1000
        if (formData.unit === 'ml') quantityInKg = quantity / 1000
        if (formData.unit === 'l') quantityInKg = quantity

        return quantityInKg * pricePerKg
    }

    function getTotalCost(): number {
        if (formData.purchaseType === 'ingredient') {
            return calculateIngredientTotalCost()
        }
        return parseFloat(formData.totalCost) || 0
    }

    async function handleAddNewIngredient() {
        if (!newIngredient.name.trim()) {
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
                displayOnBYOS: newIngredient.displayOnBYOS,
            }

            const firebaseId = await addIngredient(ingredientData)

            setFormData((prev) => ({
                ...prev,
                ingredientId: firebaseId,
            }))

            setShowNewIngredientForm(false)
            setNewIngredient({
                name: '',
                category: 'seafood',
                unit: 'kg',
                minimumStock: '0',
                displayOnBYOS: false,
            })

            alert('Ingredient added. Now complete the purchase.')
        } catch (error) {
            console.error('Error adding ingredient:', error)
            alert('Error adding ingredient. Please try again.')
        }
    }

    async function handleToggleBYOS() {
        if (!selectedIngredient) return

        try {
            const newBYOSStatus = !selectedIngredient.displayOnBYOS

            await updateDoc(doc(db, 'ingredients', selectedIngredient.id), {
                displayOnBYOS: newBYOSStatus,
                updatedAt: serverTimestamp(),
            })

            updateIngredient(selectedIngredient.id, {
                displayOnBYOS: newBYOSStatus,
            })

            setSelectedIngredient({
                ...selectedIngredient,
                displayOnBYOS: newBYOSStatus,
            })

            alert(`Ingredient ${newBYOSStatus ? 'added to' : 'removed from'} Build Your Own Sushi`)
        } catch (error) {
            console.error('Error updating BYOS status:', error)
            alert('Error updating ingredient. Please try again.')
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!formData.supplier.trim()) {
            alert('Please enter supplier')
            return
        }

        if (formData.purchaseType === 'ingredient') {
            if (!formData.ingredientId || !formData.quantity || !formData.pricePerKg) {
                alert('Please fill Ingredient, Quantity and Price per Kg')
                return
            }

            if (parseFloat(formData.quantity) <= 0 || parseFloat(formData.pricePerKg) <= 0) {
                alert('Quantity and Price per Kg must be greater than 0')
                return
            }
        } else {
            if (!formData.supplyName.trim() || !formData.totalCost) {
                alert('Please fill Supply Name and Total Cost')
                return
            }

            if (parseFloat(formData.totalCost) <= 0) {
                alert('Total Cost must be greater than 0')
                return
            }
        }

        setIsSubmitting(true)

        try {
            const totalCost = getTotalCost()
            const quantity = parseFloat(formData.quantity) || 1

            let quantityGrams = quantity
            let quantityInKg = quantity

            if (formData.purchaseType === 'ingredient') {
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
            }

            let itemName = ''
            let itemCategory = ''
            let itemUnitPrice = 0

            if (formData.purchaseType === 'ingredient') {
                const ingredient = ingredients.find((ing) => ing.id === formData.ingredientId)

                if (!ingredient) {
                    throw new Error('Selected ingredient not found')
                }

                itemName = ingredient.name
                itemCategory = ingredient.category || 'ingredient'
                itemUnitPrice = parseFloat(formData.pricePerKg)

                const newStock = (ingredient.currentStock || 0) + quantityInKg
                const newStockGrams = (ingredient.stockGrams || 0) + quantityGrams

                await updateDoc(doc(db, 'ingredients', ingredient.id), {
                    pricePerKg: parseFloat(formData.pricePerKg),
                    currentStock: newStock,
                    stockGrams: newStockGrams,
                    updatedAt: serverTimestamp(),
                })

                updateIngredient(ingredient.id, {
                    pricePerKg: parseFloat(formData.pricePerKg),
                    currentStock: newStock,
                    stockGrams: newStockGrams,
                })
            } else {
                itemName = formData.supplyName.trim()
                itemCategory = formData.supplyCategory
                itemUnitPrice = totalCost / Math.max(quantity, 1)
            }

            const composedNotes = [
                formData.notes.trim(),
                formData.deliveryDate ? `Delivery date: ${formData.deliveryDate}` : '',
                formData.purchaseType === 'ingredient'
                    ? `Ingredient stock updated: +${quantityGrams}${formData.unit === 'kg' ? 'g' : formData.unit}`
                    : '',
            ]
                .filter(Boolean)
                .join(' | ')

            const payload = normalizePurchasePayload({
                source: 'app',
                locale,
                status: 'recorded',
                purchaseDate: formData.purchaseDate,
                supplierName: formData.supplier.trim(),
                invoiceNumber: formData.invoiceNumber.trim() || null,
                notes: composedNotes || null,
                taxes: 0,
                attachmentUrl: formData.attachmentUrl.trim() || null,
                supplierAddress: formData.supplierAddress.trim() || null,
                paymentStatus: formData.paymentStatus,
                paymentTerms: formData.paymentTerms.trim() || null,
                paymentAccount: formData.paymentAccount.trim() || null,
                
                items: [
                    {
                        name: itemName,
                        category: itemCategory,
                        quantity,
                        unit: formData.unit,
                        unitPrice: itemUnitPrice,
                        lineTotal: totalCost,
                    },
                ],
            })

            await createPurchase(payload)

            setFormData({
                purchaseType: formData.purchaseType,
                ingredientId: '',
                supplyName: '',
                supplyCategory: 'packaging',
                quantity: '',
                unit: formData.purchaseType === 'ingredient' ? 'kg' : 'unit',
                pricePerKg: '',
                totalCost: '',
                supplier: formData.supplier,
                supplierAddress: '',
                purchaseDate: new Date().toISOString().split('T')[0],
                deliveryDate: '',
                invoiceNumber: '',
                paymentStatus: 'paid',
                paymentTerms: '',
                paymentAccount: '',
                attachmentUrl: '',
                notes: '',
            })

            setShowBYOSToggle(false)
            setSelectedIngredient(null)

            alert(
                formData.purchaseType === 'ingredient'
                    ? 'Purchase recorded successfully. Inventory updated.'
                    : 'Purchase recorded successfully.'
            )
        } catch (error) {
            console.error('Error recording purchase:', error)
            alert('Error recording purchase. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const totalCost = getTotalCost()

    return (
        <div className={`space-y-${isMobile ? '4' : '6'}`}>
            <div className={`rounded-sm border border-gray-200 bg-white ${isMobile ? 'p-3' : 'p-4'}`}>
                <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'}`}>
                    <div>
                        <h3 className={`font-light tracking-wide text-gray-900 ${isMobile ? 'text-sm' : ''}`}>
                            ENTRY MODE
                        </h3>
                        <p className={`font-light text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            {quickMode ? 'Quick supermarket mode' : 'Detailed invoice mode'}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setQuickMode((prev) => !prev)}
                        className={`rounded-sm bg-gray-900 px-4 py-2 text-sm font-light tracking-wide text-white transition-colors hover:bg-gray-800 ${isMobile ? 'mt-1 w-full' : ''}`}
                    >
                        {quickMode ? 'SWITCH TO DETAILED' : 'SWITCH TO QUICK'}
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className={`space-y-${isMobile ? '4' : '6'}`}>
                <div className={`rounded-sm border border-gray-200 bg-white ${isMobile ? 'p-4' : 'p-6'}`}>
                    <h3 className={`mb-4 font-light tracking-wide text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
                        1. PURCHASE TYPE
                    </h3>

                    <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        <button
                            type="button"
                            onClick={() =>
                                setFormData((prev) => ({
                                    ...prev,
                                    purchaseType: 'ingredient',
                                    unit: 'kg',
                                    supplyName: '',
                                    supplyCategory: 'packaging',
                                    totalCost: '',
                                }))
                            }
                            className={`rounded-sm border-2 p-4 text-left transition-all ${formData.purchaseType === 'ingredient'
                                    ? 'border-gray-900 bg-gray-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <div className="font-light tracking-wide text-gray-900">🍣 FOOD INGREDIENT</div>
                            <p className={`mt-1 font-light text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                Raw materials, seafood, vegetables, spices
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setFormData((prev) => ({
                                    ...prev,
                                    purchaseType: 'supply',
                                    unit: 'unit',
                                    ingredientId: '',
                                    pricePerKg: '',
                                    quantity: '1',
                                }))
                            }
                            className={`rounded-sm border-2 p-4 text-left transition-all ${formData.purchaseType === 'supply'
                                    ? 'border-gray-900 bg-gray-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <div className="font-light tracking-wide text-gray-900">📦 SUPPLIES & EQUIPMENT</div>
                            <p className={`mt-1 font-light text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                Packaging, cleaning, delivery supplies, equipment
                            </p>
                        </button>
                    </div>
                </div>

                <div className={`rounded-sm border border-gray-200 bg-white ${isMobile ? 'p-4' : 'p-6'}`}>
                    <h3 className={`mb-4 font-light tracking-wide text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
                        2. {formData.purchaseType === 'ingredient' ? 'SELECT INGREDIENT' : 'SUPPLY DETAILS'}
                    </h3>

                    {formData.purchaseType === 'ingredient' ? (
                        <div className="space-y-4">
                            <div className={`flex gap-4 ${isMobile ? 'flex-col' : 'items-end'}`}>
                                <div className={isMobile ? '' : 'flex-1'}>
                                    <label className={`mb-2 block tracking-wide text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-light'}`}>
                                        INGREDIENT *
                                    </label>

                                    <select
                                        value={formData.ingredientId}
                                        onChange={(e) => {
                                            setFormData((prev) => ({ ...prev, ingredientId: e.target.value }))
                                            setShowBYOSToggle(!!e.target.value)
                                        }}
                                        className="w-full rounded-sm border border-gray-300 px-3 py-3 font-light tracking-wide focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                                        required
                                        disabled={isSubmitting}
                                    >
                                        <option value="">Select Ingredient</option>
                                        {ingredients.map((ingredient) => (
                                            <option key={ingredient.id} value={ingredient.id}>
                                                {ingredient.name}
                                                {ingredient.currentStock > 0
                                                    ? ` (Stock: ${ingredient.currentStock.toFixed(2)}${ingredient.unit})`
                                                    : ''}
                                                {ingredient.displayOnBYOS ? ' 🎯 BYOS' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {!isMobile && <div className="font-light text-gray-500">or</div>}

                                <button
                                    type="button"
                                    onClick={() => setShowNewIngredientForm((prev) => !prev)}
                                    className={`rounded-sm bg-gray-900 px-4 py-3 text-sm font-light tracking-wide text-white hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-900 ${isMobile ? 'w-full' : ''}`}
                                    disabled={isSubmitting}
                                >
                                    {showNewIngredientForm ? 'CANCEL' : 'NEW INGREDIENT'}
                                </button>
                            </div>

                            {isMobile && showNewIngredientForm && (
                                <div className="text-center text-sm font-light text-gray-500">or</div>
                            )}

                            {showBYOSToggle && selectedIngredient && (
                                <div className={`rounded-sm border border-amber-200 bg-amber-50 p-4 ${isMobile ? 'mt-3' : ''}`}>
                                    <div className={`${isMobile ? 'flex-col gap-3' : 'flex items-center justify-between'}`}>
                                        <div>
                                            <h4 className="text-sm font-medium text-amber-900">
                                                🎯 Build Your Own Sushi Setting
                                            </h4>
                                            <p className="mt-1 text-xs text-amber-700">
                                                This ingredient is {selectedIngredient.displayOnBYOS ? 'currently available' : 'not available'} in the Build Your Own Sushi section
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleToggleBYOS}
                                            className={`rounded-sm font-medium transition-colors ${selectedIngredient.displayOnBYOS
                                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                    : 'bg-amber-500 text-white hover:bg-amber-600'
                                                } ${isMobile ? 'mt-3 w-full px-4 py-2 text-sm' : 'px-4 py-2 text-sm'}`}
                                        >
                                            {selectedIngredient.displayOnBYOS ? 'Remove from BYOS' : 'Add to BYOS'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                            <div>
                                <label className={`mb-2 block tracking-wide text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-light'}`}>
                                    SUPPLY NAME *
                                </label>
                                <input
                                    type="text"
                                    value={formData.supplyName}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, supplyName: e.target.value }))}
                                    className="w-full rounded-sm border border-gray-300 px-3 py-3 font-light tracking-wide focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                                    placeholder="e.g., Aluminum Trays, Delivery Bags, Cleaning Supplies"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div>
                                <label className={`mb-2 block tracking-wide text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-light'}`}>
                                    CATEGORY
                                </label>
                                <select
                                    value={formData.supplyCategory}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            supplyCategory: e.target.value as SupplyCategory,
                                        }))
                                    }
                                    className="w-full rounded-sm border border-gray-300 px-3 py-3 font-light tracking-wide focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                                    disabled={isSubmitting}
                                >
                                    <option value="packaging">Packaging</option>
                                    <option value="cleaning">Cleaning Supplies</option>
                                    <option value="delivery">Delivery Supplies</option>
                                    <option value="office">Office Supplies</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {showNewIngredientForm && formData.purchaseType === 'ingredient' && (
                        <div className={`mt-4 rounded-sm border bg-gray-50 p-4 ${isMobile ? 'mt-3' : ''}`}>
                            <h4 className={`mb-3 font-light tracking-wide text-gray-900 ${isMobile ? 'text-sm' : ''}`}>
                                ADD NEW INGREDIENT
                            </h4>

                            <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                                <div>
                                    <label className={`mb-2 block tracking-wide text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-light'}`}>
                                        NAME *
                                    </label>
                                    <input
                                        type="text"
                                        value={newIngredient.name}
                                        onChange={(e) => setNewIngredient((prev) => ({ ...prev, name: e.target.value }))}
                                        className="w-full rounded-sm border border-gray-300 px-3 py-2 font-light focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                                        placeholder="e.g., Fresh Tuna, Salmon Fillet"
                                    />
                                </div>

                                <div>
                                    <label className={`mb-2 block tracking-wide text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-light'}`}>
                                        CATEGORY
                                    </label>
                                    <select
                                        value={newIngredient.category}
                                        onChange={(e) => setNewIngredient((prev) => ({ ...prev, category: e.target.value }))}
                                        className="w-full rounded-sm border border-gray-300 px-3 py-2 font-light focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
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

                                <div className={isMobile ? '' : 'md:col-span-2'}>
                                    <div className="flex items-center gap-3 rounded-sm border border-gray-300 bg-white p-3">
                                        <input
                                            type="checkbox"
                                            id="displayOnBYOS"
                                            checked={newIngredient.displayOnBYOS}
                                            onChange={(e) =>
                                                setNewIngredient((prev) => ({
                                                    ...prev,
                                                    displayOnBYOS: e.target.checked,
                                                }))
                                            }
                                            className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                        />

                                        <label htmlFor="displayOnBYOS" className="flex-1">
                                            <div className="text-sm font-medium text-gray-900">
                                                🎯 Show in Build Your Own Sushi
                                            </div>
                                            <p className={`mt-1 text-gray-600 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                                                When checked, this ingredient will appear in the Build Your Own Sushi section.
                                            </p>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className={`mt-4 flex gap-4 ${isMobile ? 'flex-col' : ''}`}>
                                <button
                                    type="button"
                                    onClick={handleAddNewIngredient}
                                    className={`rounded-sm bg-gray-900 px-4 py-2 text-sm font-light tracking-wide text-white hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-900 ${isMobile ? 'w-full' : ''}`}
                                >
                                    ADD INGREDIENT
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className={`rounded-sm border border-gray-200 bg-white ${isMobile ? 'p-4' : 'p-6'}`}>
                    <h3 className={`mb-4 font-light tracking-wide text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
                        3. PURCHASE DETAILS
                    </h3>

                    <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                        <div>
                            <label className={`mb-2 block tracking-wide text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-light'}`}>
                                SUPPLIER *
                            </label>
                            <input
                                type="text"
                                value={formData.supplier}
                                onChange={(e) => setFormData((prev) => ({ ...prev, supplier: e.target.value }))}
                                className="w-full rounded-sm border border-gray-300 px-3 py-3 font-light tracking-wide focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                                placeholder="Supplier name"
                                required
                                disabled={isSubmitting}
                            />
                        </div>

                        <div>
                            <label className={`mb-2 block tracking-wide text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-light'}`}>
                                SUPPLIER ADDRESS
                            </label>
                            <input
                                type="text"
                                value={formData.supplierAddress}
                                onChange={(e) => setFormData((prev) => ({ ...prev, supplierAddress: e.target.value }))}
                                className="w-full rounded-sm border border-gray-300 px-3 py-3 font-light tracking-wide focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                                placeholder="Optional"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <div className={`mt-6 grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                        <div>
                            <label className={`mb-2 block tracking-wide text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-light'}`}>
                                PURCHASE DATE *
                            </label>
                            <input
                                type="date"
                                value={formData.purchaseDate}
                                onChange={(e) => setFormData((prev) => ({ ...prev, purchaseDate: e.target.value }))}
                                className="w-full appearance-none rounded-sm border border-gray-300 font-light tracking-wide focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                                style={
                                    isMobile
                                        ? {
                                            padding: '0.75rem 0.75rem',
                                            fontSize: '0.875rem',
                                            lineHeight: '1.25rem',
                                        }
                                        : undefined
                                }
                                required
                                disabled={isSubmitting}
                            />
                        </div>

                        <div>
                            <label className={`mb-2 block tracking-wide text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-light'}`}>
                                PAYMENT STATUS
                            </label>
                            <select
                                value={formData.paymentStatus}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        paymentStatus: e.target.value as PaymentStatus,
                                    }))
                                }
                                className="w-full rounded-sm border border-gray-300 px-3 py-3 font-light tracking-wide focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                                disabled={isSubmitting}
                            >
                                <option value="paid">Paid</option>
                                <option value="unpaid">Unpaid</option>
                            </select>
                        </div>
                    </div>

                    <div className={`mt-6 grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
                        <div>
                            <label className={`mb-2 block tracking-wide text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-light'}`}>
                                QUANTITY {formData.purchaseType === 'ingredient' ? '*' : ''}
                            </label>

                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                                    className="min-w-0 flex-1 rounded-sm border border-gray-300 px-3 py-3 font-light tracking-wide focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                                    placeholder={formData.purchaseType === 'ingredient' ? '0.00' : '1'}
                                    required={formData.purchaseType === 'ingredient'}
                                    disabled={isSubmitting}
                                />

                                <select
                                    value={formData.unit}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value as Unit }))}
                                    className={`rounded-sm border border-gray-300 font-light focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 ${isMobile ? 'w-auto px-2 py-3 text-sm' : 'w-24 px-3 py-3'}`}
                                    disabled={isSubmitting}
                                >
                                    <option value="unit">unit</option>
                                    <option value="kg">kg</option>
                                    <option value="g">g</option>
                                    <option value="l">l</option>
                                    <option value="ml">ml</option>
                                </select>
                            </div>
                        </div>

                        {formData.purchaseType === 'ingredient' ? (
                            <div>
                                <label className={`mb-2 block tracking-wide text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-light'}`}>
                                    PRICE PER KG *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.pricePerKg}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, pricePerKg: e.target.value }))}
                                    className="w-full rounded-sm border border-gray-300 px-3 py-3 font-light tracking-wide focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                                    placeholder="0.00"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                        ) : (
                            <div>
                                <label className={`mb-2 block tracking-wide text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-light'}`}>
                                    TOTAL COST *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.totalCost}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, totalCost: e.target.value }))}
                                    className="w-full rounded-sm border border-gray-300 px-3 py-3 font-light tracking-wide focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                                    placeholder="0.00"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                        )}

                        <div>
                            <label className={`mb-2 block tracking-wide text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-light'}`}>
                                FINAL TOTAL
                            </label>
                            <div className="w-full rounded-sm border border-gray-300 bg-gray-50 px-3 py-3">
                                <span className={`font-light text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
                                    {formatMoney(totalCost, locale)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {!quickMode && (
                        <>
                            <div className={`mt-6 grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                                <div>
                                    <label className={`mb-2 block tracking-wide text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-light'}`}>
                                        DELIVERY DATE
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.deliveryDate}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, deliveryDate: e.target.value }))}
                                        className="w-full rounded-sm border border-gray-300 px-3 py-3 font-light tracking-wide focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div>
                                    <label className={`mb-2 block tracking-wide text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-light'}`}>
                                        INVOICE NUMBER
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.invoiceNumber}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
                                        className="w-full rounded-sm border border-gray-300 px-3 py-3 font-light tracking-wide focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                                        placeholder="Optional"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            <div className={`mt-6 grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                                <div>
                                    <label className={`mb-2 block tracking-wide text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-light'}`}>
                                        PAYMENT TERMS
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.paymentTerms}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, paymentTerms: e.target.value }))}
                                        className="w-full rounded-sm border border-gray-300 px-3 py-3 font-light tracking-wide focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                                        placeholder="Optional"
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div>
                                    <label className={`mb-2 block tracking-wide text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-light'}`}>
                                        PAYMENT ACCOUNT
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.paymentAccount}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, paymentAccount: e.target.value }))}
                                        className="w-full rounded-sm border border-gray-300 px-3 py-3 font-light tracking-wide focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                                        placeholder="Card, Scotia, Cash, etc."
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            <div className="mt-6">
                                <label className={`mb-2 block tracking-wide text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-light'}`}>
                                    ATTACHMENT URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.attachmentUrl}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, attachmentUrl: e.target.value }))}
                                    className="w-full rounded-sm border border-gray-300 px-3 py-3 font-light tracking-wide focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                                    placeholder="https://..."
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="mt-6">
                                <label className={`mb-2 block tracking-wide text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-light'}`}>
                                    NOTES
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                                    className="w-full rounded-sm border border-gray-300 px-3 py-3 font-light focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                                    rows={isMobile ? 2 : 3}
                                    placeholder="Quality notes, special instructions, etc."
                                    disabled={isSubmitting}
                                />
                            </div>
                        </>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full rounded-sm bg-gray-900 text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400 ${isMobile ? 'py-3 text-sm' : 'py-4 text-base'} font-light tracking-wide`}
                >
                    {isSubmitting ? 'RECORDING PURCHASE...' : 'RECORD PURCHASE'}
                </button>
            </form>

            <div className="rounded-sm border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>

                    <div>
                        <h4 className="text-sm font-light tracking-wide text-blue-900">
                            {formData.purchaseType === 'ingredient' ? 'FOOD INGREDIENTS' : 'SUPPLIES & EQUIPMENT'}
                        </h4>
                        <p className={`mt-1 font-light text-blue-700 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            {formData.purchaseType === 'ingredient'
                                ? 'Food ingredients will update your inventory automatically and will also be recorded in the shared purchases collection.'
                                : 'Supplies and equipment are recorded in the same purchases collection, so app entries and n8n POST entries will appear together.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}