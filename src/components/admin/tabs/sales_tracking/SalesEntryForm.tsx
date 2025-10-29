import { useEffect, useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { useIngredients } from '../../../../context/IngredientsContext'
import { useProducts } from '../../../../context/ProductsContext'
import { useSales } from '../../../../context/SalesContext'
import { db } from '../../../../firebase/firebase'
import type { ProductIngredient } from '../../../../types/types'
import { useUserProfile } from '../../../../context/UserProfileContext'

interface CartItem {
  productId: string
  productName: string
  quantity: number
  salePrice: number
  originalPrice: number
  costPrice?: number
  productType: 'ingredientBased' | 'directCost'
  portionSize: string
}

interface Discount {
  type: 'percentage' | 'fixed'
  value: number
  reason?: string
  approvedBy?: string
}

interface TaxSettings {
  gst: number // Federal GST
  qst: number // Quebec QST
  enabled: boolean
}

export default function SalesEntryForm() {
  const { addSale, fixPendingOrders } = useSales()
  const { products } = useProducts()
  const { ingredients, updateIngredient } = useIngredients()
  const { userProfile } = useUserProfile()

  const [saleData, setSaleData] = useState({
    saleDate: new Date().toISOString().split('T')[0],
    saleTime: new Date().toTimeString().slice(0, 5),
    customerName: '',
    customerEmail: '',
    saleType: 'walk_in',
    paymentStatus: 'completed',
    orderId: '',
    stripeSessionId: ''
  })

  const [cart, setCart] = useState<CartItem[]>([])
  const [currentProduct, setCurrentProduct] = useState({
    productId: '',
    quantity: 1,
    salePrice: ''
  })

  const [discount, setDiscount] = useState<Discount | null>(null)
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [showPriceApprovalModal, setShowPriceApprovalModal] = useState(false)
  const [pendingPriceChange, setPendingPriceChange] = useState<{ index: number, newPrice: number } | null>(null)

  const [recentSales, setRecentSales] = useState<Array<{
    products: string
    totalAmount: number
    timestamp: string
    customerName: string
  }>>([])

  const [processing, setProcessing] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Quebec Tax Rates (2024)
  const [taxSettings] = useState<TaxSettings>({
    gst: 5.0, // Federal GST
    qst: 9.975, // Quebec QST
    enabled: true
  })

  const selectedProduct = products.find(p => p.id === currentProduct.productId)
  const isAdmin = userProfile?.role === 'admin' || userProfile?.email?.includes('admin') || false

  // Auto-fill sale price when product is selected
  useEffect(() => {
    if (selectedProduct && selectedProduct.sellingPrice) {
      setCurrentProduct(prev => ({
        ...prev,
        salePrice: selectedProduct.sellingPrice!.toString()
      }))
    }
  }, [selectedProduct])

  // Calculate taxes for Quebec
  const calculateTaxes = (subtotal: number) => {
    if (!taxSettings.enabled) return { gst: 0, qst: 0, total: subtotal }

    const gst = (subtotal * taxSettings.gst) / 100
    const qst = ((subtotal + gst) * taxSettings.qst) / 100
    const total = subtotal + gst + qst

    return { gst, qst, total }
  }

  // Calculate discount amount
  const calculateDiscount = (subtotal: number) => {
    if (!discount) return 0

    if (discount.type === 'percentage') {
      return (subtotal * discount.value) / 100
    } else {
      return Math.min(discount.value, subtotal)
    }
  }

  const convertFromGrams = (grams: number, targetUnit: string): number => {
    switch (targetUnit) {
      case 'kg': return grams / 1000
      case 'g': return grams
      case 'l': return grams / 1000
      case 'ml': return grams
      case 'unit': return grams
      default: return grams
    }
  }

  const convertToGrams = (quantity: number, unit: string): number => {
    switch (unit) {
      case 'kg': return quantity * 1000
      case 'g': return quantity
      case 'l': return quantity * 1000
      case 'ml': return quantity
      case 'unit': return quantity
      default: return quantity
    }
  }

  const addToCart = () => {
    if (!currentProduct.productId || !currentProduct.salePrice) {
      alert('Please select a product and enter a sale price')
      return
    }

    if (!selectedProduct) return

    const salePrice = parseFloat(currentProduct.salePrice)
    const originalPrice = selectedProduct.sellingPrice || 0

    // Check if price is being reduced and user is not admin
    if (salePrice < originalPrice && !isAdmin) {
      setPendingPriceChange({
        index: -1, // -1 indicates new item
        newPrice: salePrice
      })
      setShowPriceApprovalModal(true)
      return
    }

    const cartItem: CartItem = {
      productId: currentProduct.productId,
      productName: selectedProduct.name,
      quantity: currentProduct.quantity,
      salePrice: salePrice,
      originalPrice: originalPrice,
      costPrice: selectedProduct.costPrice,
      productType: selectedProduct.productType,
      portionSize: selectedProduct.portionSize
    }

    setCart(prev => [...prev, cartItem])

    // Reset current product form
    setCurrentProduct({
      productId: '',
      quantity: 1,
      salePrice: ''
    })
  }

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index))
  }

  const updateCartItem = (index: number, field: keyof CartItem, value: any) => {
    if (field === 'salePrice') {
      const originalPrice = cart[index].originalPrice
      // Check if price is being reduced and user is not admin
      if (value < originalPrice && !isAdmin) {
        setPendingPriceChange({ index, newPrice: value })
        setShowPriceApprovalModal(true)
        return
      }
    }

    setCart(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ))
  }

  const approvePriceChange = () => {
    if (!pendingPriceChange) return

    if (pendingPriceChange.index === -1) {
      // New item approval
      if (!selectedProduct) return

      const cartItem: CartItem = {
        productId: currentProduct.productId,
        productName: selectedProduct.name,
        quantity: currentProduct.quantity,
        salePrice: pendingPriceChange.newPrice,
        originalPrice: selectedProduct.sellingPrice || 0,
        costPrice: selectedProduct.costPrice,
        productType: selectedProduct.productType,
        portionSize: selectedProduct.portionSize
      }

      setCart(prev => [...prev, cartItem])
      setCurrentProduct({
        productId: '',
        quantity: 1,
        salePrice: ''
      })
    } else {
      // Existing item approval
      setCart(prev => prev.map((item, i) =>
        i === pendingPriceChange.index
          ? { ...item, salePrice: pendingPriceChange.newPrice }
          : item
      ))
    }

    setShowPriceApprovalModal(false)
    setPendingPriceChange(null)
  }

  const applyDiscount = (discountData: Discount) => {
    if (!isAdmin) {
      alert('Only administrators can apply discounts')
      return
    }
    setDiscount(discountData)
    setShowDiscountModal(false)
  }

  const removeDiscount = () => {
    setDiscount(null)
  }

  const decreaseIngredientStock = async (productId: string, quantitySold: number) => {
    const product = products.find(p => p.id === productId)
    if (!product) return console.warn('Product not found:', productId)
    if (product.productType !== 'ingredientBased') return

    const updates = []

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

      // Update Firebase
      try {
        const updatePromise = updateDoc(doc(db, 'ingredients', ingredientData.id), {
          currentStock: newStock,
          stockGrams: newStockGrams,
          updatedAt: serverTimestamp()
        })
        updates.push(updatePromise)

        // Update local state
        updateIngredient(ingredientData.id, {
          currentStock: newStock,
          stockGrams: newStockGrams
        })
      } catch (err) {
        console.error(`Failed to update Firebase for ${ingredientData.name}`, err)
      }
    }

    // Wait for all updates to complete
    await Promise.allSettled(updates)
  }

  const checkStockAvailability = async (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId)
    if (!product || product.productType !== 'ingredientBased') {
      return { hasEnoughStock: true, lowStockItems: [], lowStockFlag: false }
    }

    const lowStockItems: string[] = []
    let lowStockFlag = false

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
        lowStockFlag = true
      }
    }

    return {
      hasEnoughStock: lowStockItems.length === 0,
      lowStockItems,
      lowStockFlag
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cart.length === 0) {
      alert('Please add at least one product to the cart')
      return
    }

    setProcessing(true)

    try {
      const saleDateTime = `${saleData.saleDate}T${saleData.saleTime}`

      // Check stock for ingredient-based products
      const lowStockWarnings: string[] = []
      let hasLowStock = false
      for (const item of cart) {
        if (item.productType === 'ingredientBased') {
          const stockCheck = await checkStockAvailability(item.productId, item.quantity)
          if (!stockCheck.hasEnoughStock) {
            hasLowStock = true
            lowStockWarnings.push(`${item.productName}: ${stockCheck.lowStockItems.join(', ')}`)
          }
        }
      }

      if (hasLowStock && !confirm(`⚠️ Low Stock Warning!\n\n${lowStockWarnings.join('\n')}\n\nProceed anyway?`)) {
        setProcessing(false)
        return
      }

      // 🧮 Calculate totals
      const subtotal = cart.reduce((t, i) => t + i.salePrice * i.quantity, 0)
      const discountAmount = calculateDiscount(subtotal)
      const taxableAmount = subtotal - discountAmount
      const taxes = calculateTaxes(taxableAmount)
      const totalAmount = taxes.total
      const costTotal = cart.reduce((t, i) => t + (i.costPrice || 0) * i.quantity, 0)
      const profitTotal = taxableAmount - costTotal

      // 🧾 Single sale record for the entire order
      const saleRecordData = {
        orderId: saleData.orderId || `ORD-${Date.now()}`,
        products: cart.map(item => ({
          id: item.productId,
          name: item.productName,
          quantity: item.quantity,
          salePrice: item.salePrice,
          originalPrice: item.originalPrice,
          costPrice: item.costPrice
        })),
        subtotal,
        discountAmount,
        taxes,
        totalAmount,
        costTotal,
        profitTotal,
        saleDate: saleDateTime,
        customerName: saleData.customerName || 'Walk-in Customer',
        customerEmail: saleData.customerEmail || '',
        saleType: saleData.saleType,
        paymentStatus: saleData.paymentStatus,
        lowStockFlag: hasLowStock,
        stripeSessionId: saleData.stripeSessionId || '',
        createdAt: serverTimestamp()
      }

      // Save one document only
      await addSale(saleRecordData)

      // Update stock
      for (const item of cart) {
        if (item.productType === 'ingredientBased') {
          await decreaseIngredientStock(item.productId, item.quantity)
        }
      }

      // Update UI
      setRecentSales(prev => [{
        products: cart.map(i => `${i.quantity}x ${i.productName}`).join(', '),
        totalAmount,
        timestamp: new Date().toLocaleTimeString(),
        customerName: saleData.customerName || 'Walk-in'
      }, ...prev.slice(0, 4)])

      setCart([])
      setDiscount(null)
      setProcessing(false)
      alert(`✅ Sale recorded: $${totalAmount.toFixed(2)}`)

    } catch (err) {
      console.error(err)
      alert('❌ Failed to record sale.')
      setProcessing(false)
    }
  }


  const handleFixOrders = async () => {
    try {
      const result = await fixPendingOrders();
      if (result.success) {
        alert(`✅ Fixed ${result.fixed} orders and created ${result.salesCreated} sales records!`);
      } else {
        alert('❌ Failed to fix orders: ' + result.error);
      }
    } catch (error) {
      console.error('Error fixing orders:', error);
      alert('❌ Error fixing orders - check console');
    }
  }

  // Calculate all amounts
  const subtotal = cart.reduce((total, item) => total + (item.salePrice * item.quantity), 0)
  const discountAmount = calculateDiscount(subtotal)
  const taxableAmount = Math.max(0, subtotal - discountAmount)
  const taxes = calculateTaxes(taxableAmount)
  const costTotal = cart.reduce((total, item) => total + ((item.costPrice || 0) * item.quantity), 0)
  const profitTotal = taxableAmount - costTotal

  return (
    <div className="space-y-6">
      {/* Price Approval Modal */}
      {showPriceApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4">
              ⚠️ Price Reduction Requires Approval
            </h3>
            <p className="text-gray-600 mb-4">
              You are reducing the price below the original selling price.
              This action requires administrator approval.
            </p>
            {pendingPriceChange && (
              <div className="bg-yellow-50 p-3 rounded mb-4">
                <p className="text-sm">
                  Original Price: ${pendingPriceChange.index === -1
                    ? selectedProduct?.sellingPrice
                    : cart[pendingPriceChange.index]?.originalPrice
                  }<br />
                  New Price: ${pendingPriceChange.newPrice}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPriceApprovalModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={approvePriceChange}
                className="flex-1 bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600"
              >
                Request Approval
              </button>
              {isAdmin && (
                <button
                  onClick={approvePriceChange}
                  className="flex-1 bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
                >
                  Approve as Admin
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Apply Discount
            </h3>
            <DiscountForm
              onApply={applyDiscount}
              onCancel={() => setShowDiscountModal(false)}
              isAdmin={isAdmin}
              subtotal={subtotal}
            />
          </div>
        </div>
      )}

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

        {/* Customer Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name
            </label>
            <input
              type="text"
              value={saleData.customerName}
              onChange={(e) => setSaleData({ ...saleData, customerName: e.target.value })}
              placeholder="Walk-in Customer"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Email
            </label>
            <input
              type="email"
              value={saleData.customerEmail}
              onChange={(e) => setSaleData({ ...saleData, customerEmail: e.target.value })}
              placeholder="customer@example.com"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Sale Type and Payment Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sale Type *
            </label>
            <select
              value={saleData.saleType}
              onChange={(e) => setSaleData({ ...saleData, saleType: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="walk_in">Walk-in</option>
              <option value="online">Online</option>
              <option value="delivery">Delivery</option>
              <option value="takeaway">Takeaway</option>
              <option value="catering">Catering</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Status *
            </label>
            <select
              value={saleData.paymentStatus}
              onChange={(e) => setSaleData({ ...saleData, paymentStatus: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {/* Add Product to Cart Section */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Add Products</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product *
              </label>
              <select
                value={currentProduct.productId}
                onChange={(e) => setCurrentProduct({ ...currentProduct, productId: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a product</option>
                {products
                  .filter(product => product.sellingPrice && product.isActive !== false)
                  .map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - ${product.sellingPrice}
                    </option>
                  ))
                }
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min="1"
                value={currentProduct.quantity}
                onChange={(e) => setCurrentProduct({ ...currentProduct, quantity: parseInt(e.target.value) || 1 })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={currentProduct.salePrice}
                onChange={(e) => setCurrentProduct({ ...currentProduct, salePrice: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={addToCart}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            + Add to Cart
          </button>
        </div>

        {/* Shopping Cart */}
        {cart.length > 0 && (
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})
              </h3>
              <button
                type="button"
                onClick={() => setShowDiscountModal(true)}
                className="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 text-sm font-medium"
              >
                Apply Discount
              </button>
            </div>

            <div className="space-y-3">
              {cart.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.productName}</div>
                    <div className="text-sm text-gray-600">{item.portionSize}</div>
                    {item.salePrice < item.originalPrice && (
                      <div className="text-xs text-green-600">
                        Discounted from ${item.originalPrice.toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateCartItem(index, 'quantity', Math.max(1, item.quantity - 1))}
                        className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300"
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-medium">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartItem(index, 'quantity', item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300"
                      >
                        +
                      </button>
                    </div>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.salePrice}
                      onChange={(e) => updateCartItem(index, 'salePrice', parseFloat(e.target.value) || 0)}
                      className="w-20 border border-gray-300 rounded px-2 py-1 text-right"
                    />

                    <div className="w-20 text-right font-medium">
                      ${(item.quantity * item.salePrice).toFixed(2)}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(index)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Summary */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-blue-900">Subtotal:</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>

                {discount && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}

                {taxSettings.enabled && (
                  <>
                    <div className="flex justify-between text-gray-600 text-sm">
                      <span>GST ({taxSettings.gst}%):</span>
                      <span>${taxes.gst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 text-sm">
                      <span>QST ({taxSettings.qst}%):</span>
                      <span>${taxes.qst.toFixed(2)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between items-center border-t border-blue-200 pt-2">
                  <span className="font-medium text-blue-900">Total:</span>
                  <span className="text-xl font-bold text-blue-700">
                    ${taxes.total.toFixed(2)}
                  </span>
                </div>

                {(costTotal > 0 && userProfile?.role === 'admin') && (
                  <div className="text-sm text-blue-600 border-t border-blue-200 pt-2">

                    Cost: ${costTotal.toFixed(2)} • Profit: ${profitTotal.toFixed(2)}
                  </div>
                )}

                <div className="text-xs text-blue-500 mt-1">
                  ⚠️ This will decrease ingredient stock levels for ingredient-based products
                </div>
              </div>
            </div>

            {/* Discount Display */}
            {discount && (
              <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-green-800">Discount Applied</span>
                    <div className="text-sm text-green-600">
                      {discount.type === 'percentage' ? `${discount.value}%` : `$${discount.value}`}
                      {discount.reason && ` - ${discount.reason}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeDiscount}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Advanced Options */}
        <div className="border-t pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800 mb-2"
          >
            <span>{showAdvanced ? '▼' : '▶'} Advanced Options</span>
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-2 gap-4 mt-2 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order ID
                </label>
                <input
                  type="text"
                  value={saleData.orderId}
                  onChange={(e) => setSaleData({ ...saleData, orderId: e.target.value })}
                  placeholder="Optional order reference"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stripe Session ID
                </label>
                <input
                  type="text"
                  value={saleData.stripeSessionId}
                  onChange={(e) => setSaleData({ ...saleData, stripeSessionId: e.target.value })}
                  placeholder="Optional Stripe session ID"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        {cart.length > 0 && (
          <button
            type="submit"
            disabled={processing}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-medium disabled:bg-green-400 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {processing ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing {cart.length} {cart.length === 1 ? 'Sale' : 'Sales'}...
              </div>
            ) : (
              `Record ${cart.length} ${cart.length === 1 ? 'Sale' : 'Sales'} - $${taxes.total.toFixed(2)}`
            )}
          </button>
        )}
      </form>

      {/* Recent Sales */}
      {recentSales.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Sales</h3>
          <div className="space-y-2">
            {recentSales.map((sale, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-white rounded border">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{sale.products}</div>
                  <div className="text-sm text-gray-600">{sale.customerName}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">${sale.totalAmount.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">{sale.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Sales Buttons */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Add Products</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {products
            .filter(product => product.sellingPrice && product.isActive !== false)
            .slice(0, 6)
            .map(product => (
              <button
                key={product.id}
                type="button"
                onClick={() => {
                  setCurrentProduct({
                    productId: product.id,
                    quantity: 1,
                    salePrice: product.sellingPrice!.toString()
                  })
                }}
                className="p-3 text-left bg-blue-50 rounded border border-blue-200 hover:bg-blue-100 transition-colors duration-200"
              >
                <div className="font-medium text-blue-900 truncate">{product.name}</div>
                <div className="text-sm text-blue-700">${product.sellingPrice}</div>
                <div className="text-xs text-blue-500 truncate">{product.portionSize}</div>
              </button>
            ))
          }
        </div>
      </div>

      {/* Admin Tools Section */}
      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Admin Tools</h3>

        <button
          type="button"
          onClick={handleFixOrders}
          className="bg-yellow-500 text-white py-2 px-4 rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors duration-200"
        >
          🔧 Fix Pending Orders & Create Sales
        </button>

        <p className="text-sm text-yellow-700 mt-2">
          This will process all pending Stripe orders and create sales records for them.
        </p>
      </div>
    </div>
  )
}

// Discount Form Component
const DiscountForm: React.FC<{
  onApply: (discount: Discount) => void
  onCancel: () => void
  isAdmin: boolean
  subtotal: number
}> = ({ onApply, onCancel, isAdmin, subtotal }) => {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [reason, setReason] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAdmin) {
      alert('Only administrators can apply discounts')
      return
    }

    const value = parseFloat(discountValue)
    if (isNaN(value) || value <= 0) {
      alert('Please enter a valid discount value')
      return
    }

    if (discountType === 'percentage' && value > 100) {
      alert('Percentage discount cannot exceed 100%')
      return
    }

    if (discountType === 'fixed' && value > subtotal) {
      alert('Fixed discount cannot exceed subtotal')
      return
    }

    onApply({
      type: discountType,
      value,
      reason: reason || undefined,
      approvedBy: 'admin' // In real implementation, use actual admin user info
    })
  }

  const discountAmount = discountValue ?
    discountType === 'percentage' ?
      (subtotal * parseFloat(discountValue)) / 100 :
      Math.min(parseFloat(discountValue), subtotal)
    : 0

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Discount Type
        </label>
        <select
          value={discountType}
          onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="percentage">Percentage (%)</option>
          <option value="fixed">Fixed Amount ($)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Discount Value
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          max={discountType === 'percentage' ? 100 : subtotal}
          value={discountValue}
          onChange={(e) => setDiscountValue(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={discountType === 'percentage' ? '10' : '5.00'}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reason (Optional)
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Special promotion, customer complaint, etc."
        />
      </div>

      {discountValue && (
        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <div className="text-sm text-blue-800">
            Discount Amount: <strong>${discountAmount.toFixed(2)}</strong><br />
            New Subtotal: <strong>${(subtotal - discountAmount).toFixed(2)}</strong>
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
          <div className="text-sm text-yellow-800">
            ⚠️ Only administrators can apply discounts
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isAdmin}
          className="flex-1 bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed"
        >
          Apply Discount
        </button>
      </div>
    </form>
  )
}