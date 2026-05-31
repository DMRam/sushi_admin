import { useState, useEffect } from 'react'
import { useIngredients } from '../../../../context/IngredientsContext'
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import type { Unit } from '../../../../types/types'
import { db, storage } from '../../../../firebase/firebase'
import type { PurchaseLocale } from '../../../../pages/admin/tabs/purchases/purchaseTypes'
import {
    createPurchase,
    normalizePurchasePayload,
} from '../../../../pages/admin/tabs/purchases/purchaseFirestore'
import { formatMoney } from '../../../../pages/admin/tabs/purchases/purchaseLocale'
import { getByosDisplayLabels, getByosEffectivePrice } from '../../../../utils/byosCatalog'

interface PurchaseFormProps {
    isMobile?: boolean
    locale?: PurchaseLocale
    supplierOptions?: string[]
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
    byosName: string
    byosCategory: 'protein' | 'filling' | 'rolledOn' | 'sauce' | 'extra'
    byosPrice: string
    byosMaxPerRoll: string
    byosSortOrder: string
}

const byosCategoryOptions = [
    { value: 'protein', label: 'Protein' },
    { value: 'filling', label: 'Filling' },
    { value: 'rolledOn', label: 'Rolled on' },
    { value: 'sauce', label: 'Sauce' },
    { value: 'extra', label: 'Extra' },
] as const

const emptyNewIngredient: NewIngredientForm = {
    name: '',
    category: 'seafood',
    unit: 'kg',
    minimumStock: '0',
    displayOnBYOS: false,
    byosName: '',
    byosCategory: 'extra',
    byosPrice: '',
    byosMaxPerRoll: '1',
    byosSortOrder: '999',
}

export default function PurchaseForm({
    isMobile = false,
    locale = 'fr-CA',
    supplierOptions = [],
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
        gstAmount: '',
        qstAmount: '',
        paymentStatus: 'paid' as PaymentStatus,
        paymentTerms: '',
        paymentAccount: '',
        attachmentUrl: '',
        notes: '',
    })

    const [selectedIngredient, setSelectedIngredient] = useState<any>(null)
    const [showNewIngredientForm, setShowNewIngredientForm] = useState(false)
    const [newIngredient, setNewIngredient] = useState<NewIngredientForm>(emptyNewIngredient)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [quickMode, setQuickMode] = useState(true)
    const [showBYOSToggle, setShowBYOSToggle] = useState(false)
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
    const [invoicePreviewUrl, setInvoicePreviewUrl] = useState<string | null>(null)

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

    useEffect(() => {
        return () => {
            if (invoicePreviewUrl) URL.revokeObjectURL(invoicePreviewUrl)
        }
    }, [invoicePreviewUrl])

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

    function getTaxTotal(): number {
        const gst = parseFloat(formData.gstAmount) || 0
        const qst = parseFloat(formData.qstAmount) || 0
        return Math.max(0, gst) + Math.max(0, qst)
    }

    async function uploadInvoiceAttachment(): Promise<string | null> {
        if (!invoiceFile) return formData.attachmentUrl.trim() || null

        const safeName = invoiceFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')
        const storagePath = `purchase-invoices/${formData.purchaseDate}/${Date.now()}-${safeName}`
        const fileRef = ref(storage, storagePath)
        await uploadBytes(fileRef, invoiceFile, {
            contentType: invoiceFile.type || 'application/octet-stream',
            customMetadata: {
                supplier: formData.supplier.trim(),
                invoiceNumber: formData.invoiceNumber.trim(),
            },
        })

        return getDownloadURL(fileRef)
    }

    async function handleAddNewIngredient() {
        if (!newIngredient.name.trim()) {
            alert('Please enter ingredient name')
            return
        }

        try {
            const customerName = newIngredient.byosName.trim() || newIngredient.name.trim()
            const labels = getByosDisplayLabels(customerName, newIngredient.byosCategory)
            const effectiveByosPrice = getByosEffectivePrice(customerName, newIngredient.byosCategory, parseFloat(newIngredient.byosPrice) || 0)
            const ingredientData = {
                name: newIngredient.name.trim(),
                pricePerKg: 0,
                unit: newIngredient.unit,
                category: newIngredient.category,
                minimumStock: parseFloat(newIngredient.minimumStock) || 0,
                currentStock: 0,
                stockGrams: 0,
                displayOnBYOS: newIngredient.displayOnBYOS,
                byosName: newIngredient.displayOnBYOS ? (labels?.fr || customerName) : '',
                byosCategory: newIngredient.byosCategory,
                byosPrice: newIngredient.displayOnBYOS ? effectiveByosPrice : 0,
                byosMaxPerRoll: parseInt(newIngredient.byosMaxPerRoll, 10) || 1,
                byosSortOrder: parseInt(newIngredient.byosSortOrder, 10) || 999,
            }

            const firebaseId = await addIngredient(ingredientData)

            setFormData((prev) => ({
                ...prev,
                ingredientId: firebaseId,
            }))

            setShowNewIngredientForm(false)
            setNewIngredient(emptyNewIngredient)

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
            const customerName = selectedIngredient.byosName || selectedIngredient.name
            const labels = getByosDisplayLabels(customerName, selectedIngredient.byosCategory || 'extra')

            const byosDefaults = newBYOSStatus
                ? {
                    byosName: labels?.fr || customerName,
                    byosCategory: selectedIngredient.byosCategory || 'extra',
                    byosPrice: getByosEffectivePrice(customerName, selectedIngredient.byosCategory || 'extra', selectedIngredient.byosPrice),
                    byosMaxPerRoll: Number(selectedIngredient.byosMaxPerRoll || 1),
                    byosSortOrder: Number(selectedIngredient.byosSortOrder || 999),
                }
                : {}

            await updateDoc(doc(db, 'ingredients', selectedIngredient.id), {
                displayOnBYOS: newBYOSStatus,
                ...byosDefaults,
                updatedAt: serverTimestamp(),
            })

            updateIngredient(selectedIngredient.id, {
                displayOnBYOS: newBYOSStatus,
                ...byosDefaults,
            })

            setSelectedIngredient({
                ...selectedIngredient,
                displayOnBYOS: newBYOSStatus,
                ...byosDefaults,
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
            const taxTotal = getTaxTotal()
            const quantity = parseFloat(formData.quantity) || 1
            const attachmentUrl = await uploadInvoiceAttachment()

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
                taxes: taxTotal,
                attachmentUrl,
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
                gstAmount: '',
                qstAmount: '',
                paymentStatus: 'paid',
                paymentTerms: '',
                paymentAccount: '',
                attachmentUrl: '',
                notes: '',
            })

            setShowBYOSToggle(false)
            setSelectedIngredient(null)
            setInvoiceFile(null)
            setInvoicePreviewUrl(null)

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
    const taxTotal = getTaxTotal()
    const invoiceTotal = totalCost + taxTotal

    return (
        <div className={`space-y-${isMobile ? '4' : '6'}`}>
            <div className={`rounded-sm border border-gray-200 bg-white ${isMobile ? 'p-3' : 'p-4'}`}>
                <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'}`}>
                    <div>
                        <h3 className={`font-light tracking-wide text-gray-900 ${isMobile ? 'text-sm' : ''}`}>
                            ENTRY MODE
                        </h3>
                        <p className={`font-light text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            {quickMode ? 'Fast stock entry' : 'Quebec invoice entry with taxes and attachment'}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setQuickMode((prev) => !prev)}
                        className={`rounded-sm bg-gray-900 px-4 py-2 text-sm font-light tracking-wide text-white transition-colors hover:bg-gray-800 ${isMobile ? 'mt-1 w-full' : ''}`}
                    >
                        {quickMode ? 'DETAILED INVOICE' : 'FAST ENTRY'}
                    </button>
                </div>
            </div>

            <div className={`rounded-sm border border-gray-200 bg-white ${isMobile ? 'p-4' : 'p-5'}`}>
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-[1.1fr_0.9fr]'}`}>
                    <div>
                        <h3 className={`font-light tracking-wide text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
                            Invoice photo
                        </h3>
                        <p className="mt-1 text-sm font-light text-gray-500">
                            Take a clear photo or upload the supplier invoice. It is saved with the purchase for tax review.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <label className="inline-flex cursor-pointer items-center justify-center rounded-sm border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-light tracking-wide text-white hover:bg-gray-800">
                                Upload photo
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    capture="environment"
                                    className="hidden"
                                    disabled={isSubmitting}
                                    onChange={(event) => {
                                        const file = event.target.files?.[0] || null
                                        setInvoiceFile(file)
                                        if (invoicePreviewUrl) URL.revokeObjectURL(invoicePreviewUrl)
                                        setInvoicePreviewUrl(file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
                                    }}
                                />
                            </label>
                            {invoiceFile && (
                                <button
                                    type="button"
                                    className="rounded-sm border border-gray-300 px-4 py-2 text-sm font-light text-gray-700 hover:bg-gray-50"
                                    onClick={() => {
                                        setInvoiceFile(null)
                                        if (invoicePreviewUrl) URL.revokeObjectURL(invoicePreviewUrl)
                                        setInvoicePreviewUrl(null)
                                    }}
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="rounded-sm border border-dashed border-gray-300 bg-gray-50 p-3">
                        {invoicePreviewUrl ? (
                            <img src={invoicePreviewUrl} alt="Invoice preview" className="h-40 w-full rounded-sm object-cover" />
                        ) : (
                            <div className="flex h-40 items-center justify-center text-center text-sm text-gray-500">
                                {invoiceFile ? invoiceFile.name : 'Invoice preview will appear here'}
                            </div>
                        )}
                    </div>
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
                                                🎯 BYOS availability
                                            </h4>
                                            <p className="mt-1 text-xs text-amber-700">
                                                Purchases update stock and cost. Customer price, category, max per roll, and sort order are managed in Product management → Ingredients & BYOS.
                                            </p>
                                            {selectedIngredient.displayOnBYOS && (
                                                <p className="mt-2 text-xs font-medium text-amber-900">
                                                    Showing as {selectedIngredient.byosName || selectedIngredient.name} · {selectedIngredient.byosCategory || 'extra'} · ${getByosEffectivePrice(selectedIngredient.byosName || selectedIngredient.name, selectedIngredient.byosCategory, selectedIngredient.byosPrice).toFixed(2)} · max {selectedIngredient.byosMaxPerRoll || 1}/roll
                                                </p>
                                            )}
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
                                                When checked, configure customer price and limits below.
                                            </p>
                                        </label>
                                    </div>
                                </div>

                                {newIngredient.displayOnBYOS && (
                                    <div className={isMobile ? '' : 'md:col-span-2'}>
                                        <div className={`grid gap-3 rounded-sm border border-amber-200 bg-amber-50 p-3 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-5'}`}>
                                            <input
                                                type="text"
                                                value={newIngredient.byosName}
                                                onChange={(e) => setNewIngredient((prev) => ({ ...prev, byosName: e.target.value }))}
                                                className="rounded-sm border border-gray-300 px-3 py-2 text-sm font-light md:col-span-2"
                                                placeholder="Customer display name"
                                            />
                                            <select
                                                value={newIngredient.byosCategory}
                                                onChange={(e) => setNewIngredient((prev) => ({ ...prev, byosCategory: e.target.value as NewIngredientForm['byosCategory'] }))}
                                                className="rounded-sm border border-gray-300 px-3 py-2 text-sm font-light"
                                            >
                                                {byosCategoryOptions.map((category) => (
                                                    <option key={category.value} value={category.value}>{category.label}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={newIngredient.byosPrice}
                                                onChange={(e) => setNewIngredient((prev) => ({ ...prev, byosPrice: e.target.value }))}
                                                className="rounded-sm border border-gray-300 px-3 py-2 text-sm font-light"
                                                placeholder="Price"
                                            />
                                            <input
                                                type="number"
                                                min="1"
                                                value={newIngredient.byosMaxPerRoll}
                                                onChange={(e) => setNewIngredient((prev) => ({ ...prev, byosMaxPerRoll: e.target.value }))}
                                                className="rounded-sm border border-gray-300 px-3 py-2 text-sm font-light"
                                                placeholder="Max"
                                            />
                                            <input
                                                type="number"
                                                value={newIngredient.byosSortOrder}
                                                onChange={(e) => setNewIngredient((prev) => ({ ...prev, byosSortOrder: e.target.value }))}
                                                className="rounded-sm border border-gray-300 px-3 py-2 text-sm font-light"
                                                placeholder="Sort"
                                            />
                                        </div>
                                    </div>
                                )}
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
                                list="purchase-supplier-options"
                                required
                                disabled={isSubmitting}
                            />
                            <datalist id="purchase-supplier-options">
                                {supplierOptions.map((supplier) => (
                                    <option key={supplier} value={supplier} />
                                ))}
                            </datalist>
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
                                SUBTOTAL
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

                            <div className={`mt-6 grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
                                <div>
                                    <label className={`mb-2 block tracking-wide text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-light'}`}>
                                        GST / TPS
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.gstAmount}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, gstAmount: e.target.value }))}
                                        className="w-full rounded-sm border border-gray-300 px-3 py-3 font-light tracking-wide focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                                        placeholder="0.00"
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div>
                                    <label className={`mb-2 block tracking-wide text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-light'}`}>
                                        QST / TVQ
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.qstAmount}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, qstAmount: e.target.value }))}
                                        className="w-full rounded-sm border border-gray-300 px-3 py-3 font-light tracking-wide focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                                        placeholder="0.00"
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div>
                                    <label className={`mb-2 block tracking-wide text-gray-700 ${isMobile ? 'text-xs font-medium' : 'text-sm font-light'}`}>
                                        INVOICE TOTAL
                                    </label>
                                    <div className="w-full rounded-sm border border-gray-300 bg-gray-50 px-3 py-3">
                                        <span className={`font-light text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
                                            {formatMoney(invoiceTotal, locale)}
                                        </span>
                                    </div>
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
                    {isSubmitting ? 'SAVING PURCHASE...' : invoiceFile ? 'SAVE PURCHASE + INVOICE' : 'RECORD PURCHASE'}
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
                                ? 'Food ingredients update inventory automatically. Uploading an invoice keeps the tax document linked to the purchase.'
                                : 'Supplies and equipment are recorded with supplier, tax, payment, invoice, and attachment fields for bookkeeping.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
