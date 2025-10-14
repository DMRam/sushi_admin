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
        <div className="bg-white rounded-xl shadow-md p-6 mt-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Payment Method
            </h3>

            {/* Payment Method Selection - Updated for Mobile */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <button
                    type="button"
                    onClick={() => onPaymentMethodChange('credit-card')}
                    className={`p-3 border-2 rounded-xl text-center transition-all duration-200 ${paymentMethod === 'credit-card'
                        ? 'border-red-500 bg-red-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                >
                    <div className="text-xl md:text-2xl mb-1">💳</div>
                    <div className="font-semibold text-xs md:text-sm">Credit Card</div>
                </button>

                <button
                    type="button"
                    onClick={() => onPaymentMethodChange('paypal')}
                    className={`p-3 border-2 rounded-xl text-center transition-all duration-200 ${paymentMethod === 'paypal'
                        ? 'border-red-500 bg-red-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                >
                    <div className="text-xl md:text-2xl mb-1">📱</div>
                    <div className="font-semibold text-xs md:text-sm">PayPal</div>
                </button>

                <button
                    type="button"
                    onClick={() => onPaymentMethodChange('cash-card')}
                    className={`p-3 border-2 rounded-xl text-center transition-all duration-200 ${paymentMethod === 'cash-card'
                        ? 'border-red-500 bg-red-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                >
                    <div className="text-xl md:text-2xl mb-1">💳💵</div>
                    <div className="font-semibold text-xs md:text-sm">Cash/Card</div>
                </button>


            </div>

            {/* Payment Forms */}
            <div className="animate-fade-in">
                {paymentMethod === 'credit-card' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Name on Card</label>
                                <input
                                    type="text"
                                    name="nameOnCard"
                                    value={cardDetails.nameOnCard}
                                    onChange={handleCardInputChange}
                                    placeholder="John Doe"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                                <input
                                    type="text"
                                    name="cardNumber"
                                    value={cardDetails.cardNumber}
                                    onChange={handleCardInputChange}
                                    placeholder="1234 5678 9012 3456"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                                <input
                                    type="text"
                                    name="expiryDate"
                                    value={cardDetails.expiryDate}
                                    onChange={handleCardInputChange}
                                    placeholder="MM/YY"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
                                <input
                                    type="text"
                                    name="cvv"
                                    value={cardDetails.cvv}
                                    onChange={handleCardInputChange}
                                    placeholder="123"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span>Your payment details are secure and encrypted</span>
                        </div>
                    </div>
                )}

                {paymentMethod === 'paypal' && (
                    <div className="text-center p-6 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="text-4xl mb-4">📱</div>
                        <h4 className="font-semibold text-yellow-800 mb-2">Pay with PayPal</h4>
                        <p className="text-yellow-700 text-sm mb-4">
                            You'll be redirected to PayPal to complete your payment securely
                        </p>
                        <button
                            type="button"
                            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                        >
                            Continue to PayPal
                        </button>
                    </div>
                )}

                {paymentMethod === 'cash-card' && (
                    <div className="text-center p-6 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="text-4xl mb-4">💳💵</div>
                        <h4 className="font-semibold text-purple-800 mb-2">Cash or Credit Card</h4>
                        <p className="text-purple-700 text-sm mb-2">
                            Pay with cash or card when your order arrives
                        </p>
                        <div className="bg-white rounded-lg p-3 mt-3 border border-purple-100">
                            <p className="text-purple-600 text-xs font-medium">
                                💳 We accept Visa, Mastercard, and American Express
                            </p>
                            <p className="text-purple-600 text-xs mt-1">
                                💵 Please have exact change ready if paying with cash
                            </p>
                        </div>
                    </div>
                )}

                {paymentMethod === 'cash' && (
                    <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-4xl mb-4">💵</div>
                        <h4 className="font-semibold text-green-800 mb-2">Cash on Delivery</h4>
                        <p className="text-green-700 text-sm mb-2">
                            Pay with cash when your order arrives
                        </p>
                        <p className="text-green-600 text-xs">
                            Please have exact change ready for the delivery driver
                        </p>
                    </div>
                )}
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isProcessing}
                onClick={onSubmit}
                className={`w-full py-4 px-6 rounded-xl text-white font-semibold text-lg mt-6 transition-all duration-200 ${isProcessing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : paymentMethod === 'cash' || paymentMethod === 'cash-card'
                        ? 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl'
                        : 'bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-xl'
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
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>SSL Secure</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>PCI Compliant</span>
                </div>
            </div>
        </div>
    )
}