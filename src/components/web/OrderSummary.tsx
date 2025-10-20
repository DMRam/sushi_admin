import { useCartStore } from '../../stores/cartStore'

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
        <div className="bg-white/5 border border-white/10 rounded-sm p-6 backdrop-blur-sm lg:sticky lg:top-8">
            <h2 className="text-lg font-light text-white mb-4 tracking-wide flex items-center">
                <svg className="w-5 h-5 text-white mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Order Summary
            </h2>

            {/* Cart Items */}
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {cart.length === 0 ? (
                    <div className="text-center py-8 text-white/40">
                        <svg className="w-12 h-12 mx-auto mb-3 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-sm font-light tracking-wide">Your cart is empty</p>
                    </div>
                ) : (
                    cart.map((item) => (
                        <div
                            key={`${item.id}-${item.quantity}`}
                            className="flex items-center justify-between p-3 bg-white/5 rounded-sm border border-white/10"
                        >
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <div className="relative">
                                    <div className="w-10 h-10 bg-white/10 rounded-sm flex items-center justify-center border border-white/10">
                                        <span className="text-sm text-white/80">🍣</span>
                                    </div>
                                    {item.quantity > 1 && (
                                        <span className="absolute -top-1 -right-1 bg-white/20 text-white text-xs rounded-sm w-4 h-4 flex items-center justify-center font-light border border-white/20">
                                            {item.quantity}
                                        </span>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="font-light text-white text-sm tracking-wide truncate">{item.name}</h3>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <p className="text-white/80 font-light text-sm">${item.price.toFixed(2)}</p>
                                        <span className="text-white/30">•</span>
                                        <p className="text-white/60 text-xs font-light">
                                            ${(item.price * item.quantity).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => updateQuantity(item.id, -1)}
                                    className="w-6 h-6 rounded-sm border border-white/20 flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-all duration-300"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                    </svg>
                                </button>

                                <span className="w-6 text-center font-light text-white text-sm">
                                    {item.quantity}
                                </span>

                                <button
                                    onClick={() => updateQuantity(item.id, 1)}
                                    className="w-6 h-6 rounded-sm border border-white/20 flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-all duration-300"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>

                                <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="w-6 h-6 rounded-sm border border-white/20 flex items-center justify-center hover:bg-white/20 text-white/60 hover:text-white transition-all duration-300 ml-1"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Order Totals */}
            {cart.length > 0 && (
                <div className="space-y-4 border-t border-white/10 pt-4">
                    {cartTotal < 25 && (
                        <div className="mb-4">
                            <div className="flex justify-between text-xs mb-2">
                                <span className="text-white/60 font-light">${cartTotal.toFixed(2)} of $25</span>
                                <span className="text-white/80 font-light">${(25 - cartTotal).toFixed(2)} to go</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-1.5">
                                <div
                                    className="bg-white/80 h-1.5 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min((cartTotal / 25) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <div className="flex justify-between items-center py-1">
                            <span className="text-white/60 text-sm font-light">Subtotal ({itemCount} items)</span>
                            <span className="font-light text-white">${cartTotal.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center py-1">
                            <span className="text-white/60 text-sm font-light">GST (5%)</span>
                            <span className="font-light text-white">${gst.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center py-1">
                            <span className="text-white/60 text-sm font-light">QST (9.975%)</span>
                            <span className="font-light text-white">${qst.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center py-1">
                            <span className="text-white/60 text-sm font-light">Delivery</span>
                            <span className={`font-light ${deliveryFee === 0 ? 'text-white' : 'text-white/80'}`}>
                                {deliveryFee === 0 ? 'FREE' : `$${deliveryFee.toFixed(2)}`}
                            </span>
                        </div>

                        {deliveryFee === 0 && cartTotal > 0 && (
                            <div className="bg-white/10 rounded-sm p-3 text-center border border-white/20">
                                <div className="flex items-center justify-center space-x-2 text-white text-xs font-light">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <span>Free delivery unlocked!</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-white/20 pt-3">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-light text-white">Total</span>
                            <div className="text-right">
                                <div className="text-xl font-light text-white">${finalTotal.toFixed(2)}</div>
                                <div className="text-xs text-white/40 font-light">including tax and delivery</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/10 rounded-sm p-3 text-center border border-white/20">
                        <div className="flex items-center justify-center space-x-2 text-white text-xs font-light">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Delivery: <span className="text-white/80">20-30 min</span></span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}