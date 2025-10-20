import  { useEffect, useState } from 'react'

import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { useIngredients } from '../../../../context/IngredientsContext'
import { useProducts } from '../../../../context/ProductsContext'
import { useSales } from '../../../../context/SalesContext'
import { db } from '../../../../firebase/firebase'
import type { ProductIngredient } from '../../../../types/types'


export default function SalesEntryForm() {
  const { addSale } = useSales()
  const { products } = useProducts()
  const { ingredients, updateIngredient } = useIngredients()

  const [saleData, setSaleData] = useState({
    productId: '',
    quantity: 1,
    salePrice: '',
    saleDate: new Date().toISOString().split('T')[0],
    saleTime: new Date().toTimeString().slice(0, 5)
  })

  const [recentSales, setRecentSales] = useState<Array<{
    productName: string
    quantity: number
    salePrice: number
    timestamp: string
  }>>([])
  const [processing, setProcessing] = useState(false)

  const selectedProduct = products.find(p => p.id === saleData.productId)

  // Auto-fill sale price when product is selected
  useEffect(() => {
    if (selectedProduct && selectedProduct.sellingPrice) {
      setSaleData(prev => ({
        ...prev,
        salePrice: selectedProduct.sellingPrice!.toString()
      }))
    }
  }, [selectedProduct])


  const convertFromGrams = (grams: number, targetUnit: string): number => {
    switch (targetUnit) {
      case 'kg':
        return grams / 1000;
      case 'g':
        return grams;
      case 'l':
        return grams / 1000;
      case 'ml':
        return grams;
      case 'unit':
        return grams;
      default:
        return grams;
    }
  }

  const convertToGrams = (quantity: number, unit: string): number => {
    switch (unit) {
      case 'kg': return quantity * 1000;
      case 'g': return quantity;
      case 'l': return quantity * 1000;
      case 'ml': return quantity;
      case 'unit': return quantity;
      default: return quantity;
    }
  }

  const decreaseIngredientStock = async (productId: string, quantitySold: number) => {
    const product = products.find(p => p.id === productId)
    if (!product) return console.warn('Product not found:', productId)
    if (product.productType !== 'ingredientBased') return

    for (const ingredient of product.ingredients as ProductIngredient[]) {
      const ingredientData = ingredients.find(ing => ing.id === ingredient.id)

      if (!ingredientData) {
        console.warn('Ingredient not found in global list:', ingredient.id)
        continue
      }

      // Total quantity used in the ingredient's units
      let totalQuantityUsed = ingredient.quantity * quantitySold

      // Convert units if needed
      if (ingredient.unit !== ingredientData.unit) {
        try {
          const grams = convertToGrams(totalQuantityUsed, ingredient.unit)
          totalQuantityUsed = convertFromGrams(grams, ingredientData.unit)
        } catch (err) {
          console.error(`Unit conversion failed for ${ingredientData.name}`, err)
          continue
        }
      }

      // Ensure stock doesn't go negative
      const newStock = Math.max(0, ingredientData.currentStock - totalQuantityUsed)

      // Optional: store consistent grams
      let newStockGrams = ingredientData.unit === 'g' || ingredientData.unit === 'ml'
        ? newStock
        : convertToGrams(newStock, ingredientData.unit)

      console.log(`Updating ingredient: ${ingredientData.name}`, {
        currentStock: ingredientData.currentStock,
        quantityUsed: totalQuantityUsed,
        newStock,
        ingredientUnit: ingredient.unit,
        stockUnit: ingredientData.unit,
        stockGrams: newStockGrams
      })

      // Update Firebase
      try {
        await updateDoc(doc(db, 'ingredients', ingredientData.id), {
          currentStock: newStock,
          stockGrams: newStockGrams,
          updatedAt: serverTimestamp()
        })
      } catch (err) {
        console.error(`Failed to update Firebase for ${ingredientData.name}`, err)
        continue
      }

      // Update local state
      updateIngredient(ingredientData.id, {
        currentStock: newStock,
        stockGrams: newStockGrams
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!saleData.productId || !saleData.salePrice) {
      alert('Please select a product and enter a sale price')
      return
    }

    setProcessing(true)

    try {
      const saleDateTime = `${saleData.saleDate}T${saleData.saleTime}`
      const salePriceNum = parseFloat(saleData.salePrice)

      // Check stock availability (for warning only)
      const stockCheck = await checkStockAvailability(saleData.productId, saleData.quantity)

      if (!stockCheck.hasEnoughStock) {
        const proceed = confirm(
          `⚠️ Low Stock Warning!\n\n` +
          `You're selling ${saleData.quantity} ${selectedProduct?.name} but:\n` +
          `${stockCheck.lowStockItems.join('\n')}\n\n` +
          `Do you want to proceed with the sale anyway?`
        )

        if (!proceed) {
          setProcessing(false)
          return
        }
      }

      // 1. Record the sale in Firebase
      await addSale({
        productId: saleData.productId,
        quantity: saleData.quantity,
        salePrice: salePriceNum,
        saleDate: saleDateTime
      })

      // 2. Decrease ingredient stock for ingredient-based products
      if (selectedProduct?.productType === 'ingredientBased') {
        await decreaseIngredientStock(saleData.productId, saleData.quantity)
      }

      // 3. Add to recent sales for quick feedback
      const productName = selectedProduct?.name || 'Unknown Product'
      setRecentSales(prev => [{
        productName,
        quantity: saleData.quantity,
        salePrice: salePriceNum,
        timestamp: new Date().toLocaleTimeString(),
        lowStock: !stockCheck.hasEnoughStock
      }, ...prev.slice(0, 4)])

      // 4. Reset form but keep date/time
      setSaleData(prev => ({
        productId: '',
        quantity: 1,
        salePrice: '',
        saleDate: prev.saleDate,
        saleTime: prev.saleTime
      }))

      // Show success message
      const message = stockCheck.hasEnoughStock
        ? `✅ Sale recorded: ${saleData.quantity} x ${productName} for $${(salePriceNum * saleData.quantity).toFixed(2)}`
        : `⚠️ Sale recorded (LOW STOCK): ${saleData.quantity} x ${productName} for $${(salePriceNum * saleData.quantity).toFixed(2)}`

      alert(message)

    } catch (error) {
      console.error('Error recording sale:', error)
      alert('❌ Failed to record sale. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  // Add this function to check stock before sale
  const checkStockAvailability = async (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId)
    if (!product || product.productType !== 'ingredientBased') {
      return { hasEnoughStock: true, lowStockItems: [] }
    }

    const lowStockItems: string[] = []

    for (const ingredient of product.ingredients) {
      const ingredientData = ingredients.find(ing => ing.id === ingredient.id)
      if (!ingredientData) continue

      const totalQuantityNeeded = ingredient.quantity * quantity
      let quantityNeededInStockUnit = totalQuantityNeeded

      // Convert to same unit as stock
      if (ingredient.unit !== ingredientData.unit) {
        const quantityInGrams = convertToGrams(totalQuantityNeeded, ingredient.unit)
        quantityNeededInStockUnit = convertFromGrams(quantityInGrams, ingredientData.unit)
      }

      if (ingredientData.currentStock < quantityNeededInStockUnit) {
        const shortfall = quantityNeededInStockUnit - ingredientData.currentStock
        lowStockItems.push(
          `- ${ingredientData.name}: Need ${quantityNeededInStockUnit.toFixed(2)}${ingredientData.unit}, have ${ingredientData.currentStock.toFixed(2)}${ingredientData.unit} (short ${shortfall.toFixed(2)}${ingredientData.unit})`
        )
      }
    }

    return {
      hasEnoughStock: lowStockItems.length === 0,
      lowStockItems
    }
  }

  const totalAmount = saleData.salePrice ? parseFloat(saleData.salePrice) * saleData.quantity : 0

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sale Date *
            </label>
            <input
              type="date"
              value={saleData.saleDate}
              onChange={(e) => setSaleData({ ...saleData, saleDate: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sale Time *
            </label>
            <input
              type="time"
              value={saleData.saleTime}
              onChange={(e) => setSaleData({ ...saleData, saleTime: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Product Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product *
          </label>
          <select
            value={saleData.productId}
            onChange={(e) => setSaleData({ ...saleData, productId: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a product</option>
            {products
              .filter(product => product.sellingPrice && product.isActive !== false)
              .map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} - ${product.sellingPrice} ({product.portionSize})
                  {product.productType === 'directCost' ? ' [Direct Cost]' : ' [Ingredient Based]'}
                </option>
              ))
            }
          </select>
        </div>

        {/* Quantity and Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity *
            </label>
            <input
              type="number"
              min="1"
              value={saleData.quantity}
              onChange={(e) => setSaleData({ ...saleData, quantity: parseInt(e.target.value) || 1 })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sale Price *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={saleData.salePrice}
              onChange={(e) => setSaleData({ ...saleData, salePrice: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        {/* Total Amount Display */}
        {saleData.salePrice && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center">
              <span className="font-medium text-blue-900">Total Amount:</span>
              <span className="text-2xl font-bold text-blue-700">
                ${totalAmount.toFixed(2)}
              </span>
            </div>
            {selectedProduct && selectedProduct.costPrice && (
              <div className="text-sm text-blue-600 mt-1">
                Cost: ${(selectedProduct.costPrice * saleData.quantity).toFixed(2)} •
                Profit: ${(totalAmount - (selectedProduct.costPrice * saleData.quantity)).toFixed(2)}
              </div>
            )}
            {selectedProduct?.productType === 'ingredientBased' && (
              <div className="text-xs text-blue-500 mt-1">
                ⚠️ This will decrease ingredient stock levels
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={processing}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-medium disabled:bg-green-400 disabled:cursor-not-allowed"
        >
          {processing ? 'Processing Sale...' : 'Record Sale'}
        </button>
      </form>

      {/* Recent Sales */}
      {recentSales.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Sales</h3>
          <div className="space-y-2">
            {recentSales.map((sale, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                <div>
                  <span className="font-medium">{sale.productName}</span>
                  <span className="text-sm text-gray-600 ml-2">
                    {sale.quantity}x • ${sale.salePrice.toFixed(2)} each
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    ${(sale.quantity * sale.salePrice).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">{sale.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Sales Buttons */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Sales</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {products
            .filter(product => product.sellingPrice && product.isActive !== false)
            .slice(0, 6)
            .map(product => (
              <button
                key={product.id}
                type="button"
                onClick={() => {
                  setSaleData(prev => ({
                    ...prev,
                    productId: product.id,
                    salePrice: product.sellingPrice!.toString()
                  }))
                }}
                className="p-3 text-left bg-blue-50 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <div className="font-medium text-blue-900">{product.name}</div>
                <div className="text-sm text-blue-700">${product.sellingPrice}</div>
                <div className="text-xs text-blue-500">{product.portionSize}</div>
              </button>
            ))
          }
        </div>
      </div>
    </div>
  )
}