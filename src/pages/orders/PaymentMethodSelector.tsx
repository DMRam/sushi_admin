import { useTranslation } from 'react-i18next'

interface PaymentMethodSelectorProps {
    paymentMethod: string;
    onPaymentMethodChange: (method: string) => void;
    finalTotal: number;
    isProcessing: boolean;
    onPlaceOrder: () => void;
    onBack: () => void;
}

export default function PaymentMethodSelector({
    paymentMethod,
    onPaymentMethodChange,
    finalTotal,
    isProcessing,
    onPlaceOrder,
    onBack
}: PaymentMethodSelectorProps) {
    const { t } = useTranslation()

    return (
        <div className="bg-white/5 border border-white/10 rounded-sm p-6">
            <h3 className="text-lg font-light text-white tracking-wide mb-4">
                {t('common.paymentMethod')}
            </h3>

            <div className="space-y-4 mb-6">
                {/* Credit Card Option */}
                <label className="flex items-start space-x-3 cursor-pointer group p-4 rounded-sm border transition-all duration-200 hover:bg-white/5"
                    style={{
                        borderColor: paymentMethod === "card" ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                        backgroundColor: paymentMethod === "card" ? 'rgba(255,255,255,0.1)' : 'transparent'
                    }}
                >
                    <div className="flex items-center h-5 mt-0.5">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${paymentMethod === "card" ? 'border-white bg-white' : 'border-white/30'}`}>
                            {paymentMethod === "card" && (
                                <div className="w-2 h-2 rounded-full bg-gray-900"></div>
                            )}
                        </div>
                        <input
                            type="radio"
                            name="paymentMethod"
                            value="card"
                            checked={paymentMethod === "card"}
                            onChange={(e) => onPaymentMethodChange(e.target.value)}
                            className="sr-only"
                        />
                    </div>
                    <div className="flex-1">
                        <div className="text-white font-light">{t('paymentMethod.card')}</div>
                        <div className="text-white/60 text-sm font-light mt-1">
                            {t('paymentMethod.cardDescription')}
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <div className="w-8 h-5 bg-blue-500 rounded flex items-center justify-center">
                            <span className="text-xs text-white font-bold">V</span>
                        </div>
                        <div className="w-8 h-5 bg-yellow-500 rounded flex items-center justify-center">
                            <span className="text-xs text-white font-bold">M</span>
                        </div>
                    </div>
                </label>               
            </div>

            {/* Payment Note */}
            {paymentMethod === "card" && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-sm p-4 mb-6">
                    <div className="flex items-start space-x-3">
                        <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-blue-300 text-sm font-light">
                            <strong>{t('paymentMethod.securePayment')}:</strong> {t('paymentMethod.securePaymentDescription')}
                        </div>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    type="button"
                    onClick={onBack}
                    disabled={isProcessing}
                    className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-sm hover:bg-white/10 transition-all duration-300 font-light tracking-wide text-sm flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {t('checkoutPage.backToInfo')}
                </button>
                <button
                    type="button"
                    onClick={onPlaceOrder}
                    disabled={isProcessing}
                    className="bg-white text-gray-900 px-6 py-3 rounded-sm hover:bg-white/90 transition-all duration-300 font-light tracking-wide text-sm flex-1 disabled:bg-white/50 disabled:cursor-not-allowed"
                >
                    {isProcessing ? (
                        <div className="flex items-center justify-center space-x-2">
                            <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                            <span>{t('common.processing')}</span>
                        </div>
                    ) : paymentMethod === "card" ? (
                        `${t('paymentMethod.pay')} $${finalTotal.toFixed(2)}`
                    ) : (
                        `${t('common.placeOrder')} - $${finalTotal.toFixed(2)}`
                    )}
                </button>
            </div>
        </div>
    );
}