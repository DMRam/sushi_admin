import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCartStore } from '../../stores/cartStore'
import type { MenuItem } from '../../types/types'

interface OrderSummaryProps {
    cartTotal: number
    itemCount: number
    deliveryFee: number
    finalTotal: number
    gst: number
    qst: number
}

const DELIVERY_MINIMUM = 150

const OrderSummary = memo(function OrderSummary({
    cartTotal,
    itemCount,
    deliveryFee,
    finalTotal,
    qst,
    gst,
}: OrderSummaryProps) {
    const { t } = useTranslation()

    const addToCart = useCartStore((state) => state.addToCart)
    const removeFromCart = useCartStore((state) => state.removeFromCart)
    const cart = useCartStore((state) => state.cart)

    const safeCart = Array.isArray(cart) ? cart : []
    const remainingForDelivery = Math.max(DELIVERY_MINIMUM - cartTotal, 0)
    const deliveryProgress = Math.min((cartTotal / DELIVERY_MINIMUM) * 100, 100)
    const isDeliveryAvailable = cartTotal >= DELIVERY_MINIMUM

    const handleAddToCart = (item: MenuItem) => {
        addToCart(item)
    }

    const handleRemoveItem = (item: MenuItem) => {
        removeFromCart(item)
    }

    return (
        <div className="bg-[#0b0b0b] border border-white/10 p-5 backdrop-blur-sm lg:sticky lg:top-8 min-w-80 shadow-2xl shadow-black/35 sm:p-6">
            <h2 className="text-lg font-light text-white mb-4 tracking-wide flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center">
                    <svg className="w-5 h-5 text-[#f26350] mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    {t('orderSummary.title')}
                </div>

                <span className="bg-[#f26350]/15 text-[#ff8a78] text-xs px-2 py-1 font-bold">
                    {itemCount} {itemCount === 1 ? t('common.item') : t('common.items')}
                </span>
            </h2>

            <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
                {safeCart.length === 0 ? (
                    <div className="text-center py-8 text-white/40">
                        <svg className="w-12 h-12 mx-auto mb-3 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-sm font-light tracking-wide">{t('checkoutPage.emptyCart')}</p>
                    </div>
                ) : (
                    safeCart.map((item, index) => {
                        const safeItem = item || {}
                        const safeId = safeItem.id || `item-${index}`
                        const safeName = safeItem.name || t('orderSummary.unknownItem')
                        const safePrice = safeItem.price || 0
                        const safeQuantity = safeItem.quantity || 0
                        const itemTotal = safePrice * safeQuantity

                        return (
                            <div
                                key={safeId}
                                className="flex items-start justify-between p-3 bg-black/30 border border-white/10 hover:bg-white/8 transition-all duration-200 gap-3"
                            >
                                <div className="flex items-start space-x-3 flex-1 min-w-0">
                                    <div className="relative flex-shrink-0">
                                        {safeItem.image ? (
                                            <img
                                                src={safeItem.image}
                                                alt={safeName}
                                                className="w-12 h-12 rounded-sm object-cover border border-white/10"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-white/10 rounded-sm flex items-center justify-center border border-white/10">
                                                <span className="text-sm text-white/80">🍣</span>
                                            </div>
                                        )}

                                        {safeQuantity > 1 && (
                                            <span className="absolute -top-1 -right-1 bg-white/20 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-light border border-white/20 backdrop-blur-sm">
                                                {safeQuantity}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-light text-white text-sm tracking-wide break-words">
                                            {safeName}
                                        </h3>
                                        <p className="text-white/80 font-light text-sm mt-1">
                                            ${safePrice.toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end space-y-2 flex-shrink-0">
                                    <div className="flex items-center space-x-1 bg-[#0e0e0e] rounded-sm border border-white/10 p-1 min-w-[100px] justify-between">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(item)}
                                            className="w-7 h-7 flex items-center justify-center hover:bg-white/8 text-white/60 hover:text-white transition-all duration-200 flex-shrink-0"
                                            aria-label={t('orderSummary.decreaseQuantity')}
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                            </svg>
                                        </button>

                                        <span className="min-w-[30px] text-center font-light text-white text-sm mx-1 flex-shrink-0">
                                            {safeQuantity}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() => handleAddToCart(item)}
                                            className="w-7 h-7 flex items-center justify-center hover:bg-white/8 text-white/60 hover:text-white transition-all duration-200 flex-shrink-0"
                                            aria-label={t('orderSummary.increaseQuantity')}
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>
                                    </div>

                                    <p className="text-white font-light text-sm">
                                        ${itemTotal.toFixed(2)}
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(item)}
                                        className="w-8 h-8 border border-white/20 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/30 text-white/60 hover:text-red-300 transition-all duration-200 self-end"
                                        aria-label={t('orderSummary.removeItem')}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {safeCart.length > 0 && (
                <div className="space-y-4 border-t border-white/10 pt-4">
                    {!isDeliveryAvailable && (
                        <div className="mb-4">
                            <div className="flex justify-between text-xs mb-2">
                                <span className="text-white/60 font-light">
                                    Delivery from ${DELIVERY_MINIMUM.toFixed(2)}
                                </span>
                                <span className="text-white/80 font-light">
                                    ${remainingForDelivery.toFixed(2)} to go
                                </span>
                            </div>

                            <div className="w-full bg-white/10 h-2">
                                <div
                                    className="bg-[#f26350] h-2 transition-all duration-500"
                                    style={{ width: `${deliveryProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-1">
                            <span className="text-white/60 text-sm font-light">
                                {t('common.subtotal')} ({itemCount} {itemCount === 1 ? t('common.item') : t('common.items')})
                            </span>
                            <span className="font-light text-white">${cartTotal.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center py-1">
                            <span className="text-white/60 text-sm font-light">{t('common.gst')} (5%)</span>
                            <span className="font-light text-white">${gst.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center py-1">
                            <span className="text-white/60 text-sm font-light">{t('common.qst')} (9.975%)</span>
                            <span className="font-light text-white">${qst.toFixed(2)}</span>
                        </div>

                        {isDeliveryAvailable && (
                            <div className="flex justify-between items-center py-1">
                                <span className="text-white/60 text-sm font-light">{t('common.deliveryFee')}</span>
                                <span className={`font-light ${deliveryFee === 0 ? 'text-green-400' : 'text-white/80'}`}>
                                    {deliveryFee === 0 ? t('common.free') : `$${deliveryFee.toFixed(2)}`}
                                </span>
                            </div>
                        )}

                        {isDeliveryAvailable && (
                            <div className="bg-green-500/10 rounded-sm p-3 text-center border border-green-500/20">
                                <div className="flex items-center justify-center space-x-2 text-green-400 text-xs font-light">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <span>{t('orderSummary.freeDelivery')}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-white/20 pt-4">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-light text-white">{t('common.total')}</span>
                            <div className="text-right">
                                <div className="text-2xl font-semibold text-[#f26350]">${finalTotal.toFixed(2)}</div>
                                <div className="text-xs text-white/40 font-light">
                                    {isDeliveryAvailable
                                        ? t('orderSummary.includingTaxDelivery')
                                        : 'CAD · including taxes'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#f26350]/10 p-3 text-center border border-[#f26350]/25">
                        <div className="text-white/80 text-xs font-light">
                            Pickup only for online orders. For large delivery orders, please contact us directly.
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
},
    (prevProps, nextProps) => {
        return (
            prevProps.cartTotal === nextProps.cartTotal &&
            prevProps.itemCount === nextProps.itemCount &&
            prevProps.gst === nextProps.gst &&
            prevProps.qst === nextProps.qst &&
            prevProps.deliveryFee === nextProps.deliveryFee &&
            prevProps.finalTotal === nextProps.finalTotal
        )
    })

export default OrderSummary
