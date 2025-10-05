// src/components/SalesEntryForm.tsx
import React, { useState } from 'react'
import { useSales } from '../context/SalesContext'
import { useProducts } from '../context/ProductsContext'

export default function SalesEntryForm() {
  const { addSale } = useSales()
  const { products } = useProducts()

  const [saleData, setSaleData] = useState({
    productId: '',
    quantity: 1,
    salePrice: '',
    saleDate: new Date().toISOString().split('T')[0],
    saleTime: new Date().toTimeString().slice(0, 5) // HH:MM format
  })

  const [recentSales, setRecentSales] = useState<Array<{
    productName: string
    quantity: number
    salePrice: number
    timestamp: string
  }>>([])

  const selectedProduct = products.find(p => p.id === saleData.productId)

  // Auto-fill sale price when product is selected
  React.useEffect(() => {
    if (selectedProduct && selectedProduct.sellingPrice) {
      setSaleData(prev => ({
        ...prev,
        salePrice: selectedProduct.sellingPrice!.toString()
      }))
    }
  }, [selectedProduct])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!saleData.productId || !saleData.salePrice) {
      alert('Please select a product and enter a sale price')
      return
    }

    const saleDateTime = `${saleData.saleDate}T${saleData.saleTime}`
    const salePriceNum = parseFloat(saleData.salePrice)

    addSale({
      productId: saleData.productId,
      quantity: saleData.quantity,
      salePrice: salePriceNum,
      saleDate: saleDateTime
    })

    // Add to recent sales for quick feedback
    const productName = selectedProduct?.name || 'Unknown Product'
    setRecentSales(prev => [{
      productName,
      quantity: saleData.quantity,
      salePrice: salePriceNum,
      timestamp: new Date().toLocaleTimeString()
    }, ...prev.slice(0, 4)]) // Keep only last 5 sales

    // Reset form but keep date/time
    setSaleData(prev => ({
      productId: '',
      quantity: 1,
      salePrice: '',
      saleDate: prev.saleDate,
      saleTime: prev.saleTime
    }))

    // Optional: Show success message
    alert(`Sale recorded: ${saleData.quantity} x ${productName} for $${(salePriceNum * saleData.quantity).toFixed(2)}`)
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
              onChange={(e) => setSaleData({...saleData, saleDate: e.target.value})}
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
              onChange={(e) => setSaleData({...saleData, saleTime: e.target.value})}
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
            onChange={(e) => setSaleData({...saleData, productId: e.target.value})}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a product</option>
            {products
              .filter(product => product.sellingPrice)
              .map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} - ${product.sellingPrice} ({product.portionSize})
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
              onChange={(e) => setSaleData({...saleData, quantity: parseInt(e.target.value) || 1})}
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
              onChange={(e) => setSaleData({...saleData, salePrice: e.target.value})}
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
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-medium"
        >
          Record Sale
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
            .filter(product => product.sellingPrice)
            .slice(0, 6) // Show only first 6 products for quick access
            .map(product => (
              <button
                key={product.id}
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
              </button>
            ))
          }
        </div>
      </div>
    </div>
  )
}