// components/OrderSummary.tsx
import { useCartStore } from '../stores/cartStore'

interface OrderSummaryProps {
    cart: any[]
    cartTotal: number
    itemCount: number
    deliveryFee: number
    finalTotal: number
    gst: number;
    qst: number
}

export default function OrderSummary({
    cart,
    cartTotal,
    itemCount,
    deliveryFee,
    finalTotal,
    qst,
    gst
}: OrderSummaryProps) {
    const { updateQuantity, removeFromCart } = useCartStore()

    return (
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 h-fit lg:sticky lg:top-4 border border-gray-100">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6 flex items-center">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Order Summary
            </h2>

            {/* Cart Items - Mobile Optimized */}
            <div className="space-y-3 mb-4 md:mb-6 max-h-64 md:max-h-96 overflow-y-auto pr-1 md:pr-2">
                {cart.length === 0 ? (
                    <div className="text-center py-6 md:py-8 text-gray-500">
                        <svg className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-sm md:text-base">Your cart is empty</p>
                    </div>
                ) : (
                    cart.map((item) => (
                        <div
                            key={`${item.id}-${item.quantity}`}
                            className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 border border-gray-200"
                        >
                            <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                                {/* Item Image with Badge - Mobile Optimized */}
                                <div className="relative">
                                    <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-red-100 to-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-semibold text-red-600">🍣</span>
                                    </div>
                                    {item.quantity > 1 && (
                                        <span className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 md:w-5 md:h-5 flex items-center justify-center font-bold text-[10px] md:text-xs">
                                            {item.quantity}
                                        </span>
                                    )}
                                </div>

                                {/* Item Details - Mobile Optimized */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-800 text-sm md:text-base truncate">{item.name}</h3>
                                    <div className="flex items-center space-x-1 md:space-x-2 mt-0.5">
                                        <p className="text-red-600 font-bold text-sm md:text-base">${item.price.toFixed(2)}</p>
                                        <span className="text-gray-400 text-xs">•</span>
                                        <p className="text-green-600 text-xs md:text-sm font-medium">
                                            ${(item.price * item.quantity).toFixed(2)}
                                        </p>
                                    </div>
                                    {/* Item Tags - Mobile Optimized */}
                                    <div className="flex items-center space-x-1 mt-1">
                                        {item.spicyLevel > 0 && (
                                            <span className="text-[10px] md:text-xs bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full">
                                                🌶️ {item.spicyLevel}/3
                                            </span>
                                        )}
                                        {item.popular && (
                                            <span className="text-[10px] md:text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full">
                                                Popular
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Quantity Controls - Mobile Optimized */}
                            <div className="flex items-center space-x-1 md:space-x-2 ml-2">
                                <button
                                    onClick={() => updateQuantity(item.id, -1)}
                                    className="w-6 h-6 md:w-8 md:h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all duration-200 active:scale-95"
                                    title="Decrease quantity"
                                >
                                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                    </svg>
                                </button>

                                <span className="w-6 md:w-8 text-center font-bold text-gray-700 text-sm md:text-lg">
                                    {item.quantity}
                                </span>

                                <button
                                    onClick={() => updateQuantity(item.id, 1)}
                                    className="w-6 h-6 md:w-8 md:h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-green-50 hover:border-green-300 hover:text-green-600 transition-all duration-200 active:scale-95"
                                    title="Increase quantity"
                                >
                                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>

                                <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="w-6 h-6 md:w-8 md:h-8 rounded-full border border-red-200 flex items-center justify-center hover:bg-red-500 hover:text-white text-red-500 transition-all duration-200 active:scale-95 ml-0.5 md:ml-1"
                                    title="Remove item"
                                >
                                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Order Totals - Mobile Optimized */}
            {cart.length > 0 && (
                <div className="space-y-3 border-t border-gray-200 pt-3 md:pt-4">
                    {/* Progress Bar for Free Delivery */}
                    {cartTotal < 25 && (
                        <div className="mb-3 md:mb-4">
                            <div className="flex justify-between text-xs md:text-sm mb-1">
                                <span className="text-gray-600">
                                    ${cartTotal.toFixed(2)} of $25
                                </span>
                                <span className="text-red-600 font-semibold">
                                    ${(25 - cartTotal).toFixed(2)} to go
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 md:h-2">
                                <div
                                    className="bg-gradient-to-r from-green-400 to-green-500 h-1.5 md:h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min((cartTotal / 25) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* Totals */}
                    <div className="space-y-1 md:space-y-2">
                        <div className="flex justify-between items-center py-0.5 md:py-1">
                            <span className="text-gray-600 text-sm md:text-base">Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                            <span className="font-semibold text-sm md:text-base">${cartTotal.toFixed(2)}</span>
                        </div>

                        {/* Quebec Taxes */}
                        <div className="flex justify-between items-center py-0.5 md:py-1">
                            <span className="text-gray-600 text-sm md:text-base">GST (5%)</span>
                            <span className="font-semibold text-sm md:text-base">${gst.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center py-0.5 md:py-1">
                            <span className="text-gray-600 text-sm md:text-base">QST (9.975%)</span>
                            <span className="font-semibold text-sm md:text-base">${qst.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center py-0.5 md:py-1">
                            <span className="text-gray-600 text-sm md:text-base">Delivery</span>
                            <span className={`font-semibold text-sm md:text-base ${deliveryFee === 0 ? 'text-green-600' : ''}`}>
                                {deliveryFee === 0 ? 'FREE 🎉' : `$${deliveryFee.toFixed(2)}`}
                            </span>
                        </div>

                        {/* Free Delivery Message */}
                        {deliveryFee === 0 && cartTotal > 0 && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-2 md:p-3 text-center">
                                <div className="flex items-center justify-center space-x-1 text-green-700 text-xs md:text-sm">
                                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <span className="font-semibold">Free delivery unlocked!</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Final Total */}
                    <div className="border-t border-gray-300 pt-2 md:pt-3 mt-1 md:mt-2">
                        <div className="flex justify-between items-center">
                            <span className="text-base md:text-lg font-bold text-gray-800">Total</span>
                            <div className="text-right">
                                <div className="text-xl md:text-2xl font-bold text-red-600">${finalTotal.toFixed(2)}</div>
                                <div className="text-[10px] md:text-xs text-gray-500">including tax and delivery</div>
                            </div>
                        </div>
                    </div>

                    {/* Estimated Delivery Time */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 md:p-3 text-center">
                        <div className="flex items-center justify-center space-x-1 md:space-x-2 text-blue-700 text-xs md:text-sm">
                            <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Delivery: <strong>20-30 min</strong></span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}