// components/PaymentSection.tsx
import { useState } from 'react'

interface PaymentSectionProps {
    paymentMethod: string
    onPaymentMethodChange: (method: string) => void
    finalTotal: number
    isProcessing: boolean
    onSubmit: (e: React.FormEvent) => void
}

export default function PaymentSection({
    paymentMethod,
    onPaymentMethodChange,
    finalTotal,
    isProcessing,
    onSubmit
}: PaymentSectionProps) {
    const [cardDetails, setCardDetails] = useState({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        nameOnCard: ''
    })

    const handleCardInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setCardDetails(prev => ({ ...prev, [name]: value }))
    }

    return (
        <div className="bg-white/5 border border-white/10 rounded-sm p-6 backdrop-blur-sm mb-15">
            <h3 className="text-xl font-light text-white mb-6 tracking-wide flex items-center">
                <svg className="w-5 h-5 text-white mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Payment Method
            </h3>

            {/* Payment Method Selection */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <button
                    type="button"
                    onClick={() => onPaymentMethodChange('credit-card')}
                    className={`p-4 border rounded-sm text-center transition-all duration-300 font-light tracking-wide ${paymentMethod === 'credit-card'
                        ? 'border-white bg-white/10 text-white shadow-lg'
                        : 'border-white/20 text-white/60 hover:border-white/30 hover:bg-white/5 hover:text-white/80'
                        }`}
                >
                    <div className="text-xl mb-1">💳</div>
                    <div className="text-xs">Credit Card</div>
                </button>

                <button
                    type="button"
                    onClick={() => onPaymentMethodChange('paypal')}
                    className={`p-4 border rounded-sm text-center transition-all duration-300 font-light tracking-wide ${paymentMethod === 'paypal'
                        ? 'border-white bg-white/10 text-white shadow-lg'
                        : 'border-white/20 text-white/60 hover:border-white/30 hover:bg-white/5 hover:text-white/80'
                        }`}
                >
                    <div className="text-xl mb-1">📱</div>
                    <div className="text-xs">PayPal</div>
                </button>

                <button
                    type="button"
                    onClick={() => onPaymentMethodChange('cash-card')}
                    className={`p-4 border rounded-sm text-center transition-all duration-300 font-light tracking-wide ${paymentMethod === 'cash-card'
                        ? 'border-white bg-white/10 text-white shadow-lg'
                        : 'border-white/20 text-white/60 hover:border-white/30 hover:bg-white/5 hover:text-white/80'
                        }`}
                >
                    <div className="text-xl mb-1">💳💵</div>
                    <div className="text-xs">Cash/Card</div>
                </button>
            </div>

            {/* Payment Forms */}
            <div className="animate-fade-in">
                {paymentMethod === 'credit-card' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-light text-white/60 mb-2 tracking-wide">Name on Card</label>
                                <input
                                    type="text"
                                    name="nameOnCard"
                                    value={cardDetails.nameOnCard}
                                    onChange={handleCardInputChange}
                                    placeholder="John Doe"
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all duration-300 font-light tracking-wide"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-light text-white/60 mb-2 tracking-wide">Card Number</label>
                                <input
                                    type="text"
                                    name="cardNumber"
                                    value={cardDetails.cardNumber}
                                    onChange={handleCardInputChange}
                                    placeholder="1234 5678 9012 3456"
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all duration-300 font-light tracking-wide"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-light text-white/60 mb-2 tracking-wide">Expiry Date</label>
                                <input
                                    type="text"
                                    name="expiryDate"
                                    value={cardDetails.expiryDate}
                                    onChange={handleCardInputChange}
                                    placeholder="MM/YY"
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all duration-300 font-light tracking-wide"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-light text-white/60 mb-2 tracking-wide">CVV</label>
                                <input
                                    type="text"
                                    name="cvv"
                                    value={cardDetails.cvv}
                                    onChange={handleCardInputChange}
                                    placeholder="123"
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all duration-300 font-light tracking-wide"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 text-sm text-white/60 font-light tracking-wide">
                            <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span>Your payment details are secure and encrypted</span>
                        </div>
                    </div>
                )}

                {paymentMethod === 'paypal' && (
                    <div className="text-center p-6 bg-white/5 rounded-sm border border-white/10">
                        <div className="text-3xl mb-4">📱</div>
                        <h4 className="font-light text-white mb-2 tracking-wide">Pay with PayPal</h4>
                        <p className="text-white/60 text-sm mb-4 font-light tracking-wide leading-relaxed">
                            You'll be redirected to PayPal to complete your payment securely
                        </p>
                        <button
                            type="button"
                            className="border border-white text-white px-6 py-3 rounded-sm hover:bg-white hover:text-gray-900 transition-all duration-300 font-light tracking-wide"
                        >
                            Continue to PayPal
                        </button>
                    </div>
                )}

                {paymentMethod === 'cash-card' && (
                    <div className="text-center p-6 bg-white/5 rounded-sm border border-white/10">
                        <div className="text-3xl mb-4">💳💵</div>
                        <h4 className="font-light text-white mb-2 tracking-wide">Cash or Credit Card</h4>
                        <p className="text-white/60 text-sm mb-2 font-light tracking-wide leading-relaxed">
                            Pay with cash or card when your order arrives
                        </p>
                        <div className="bg-white/5 rounded-sm p-3 mt-3 border border-white/10">
                            <p className="text-white/80 text-xs font-light tracking-wide">
                                💳 We accept Visa, Mastercard, and American Express
                            </p>
                            <p className="text-white/80 text-xs mt-1 font-light tracking-wide">
                                💵 Please have exact change ready if paying with cash
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isProcessing}
                onClick={onSubmit}
                className={`w-full py-4 px-6 rounded-sm text-white font-light tracking-wide text-lg mt-6 transition-all duration-300 ${isProcessing
                    ? 'bg-white/20 cursor-not-allowed'
                    : 'border border-white hover:bg-white hover:text-gray-900'
                    }`}
            >
                {isProcessing ? (
                    <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing Order...
                    </span>
                ) : (
                    `Place Order - $${finalTotal.toFixed(2)}`
                )}
            </button>

            {/* Security Badges */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center space-x-2 text-xs text-white/40 font-light tracking-wide">
                    <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>SSL Secure</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-white/40 font-light tracking-wide">
                    <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>PCI Compliant</span>
                </div>
            </div>
        </div>
    )
}