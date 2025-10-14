// pages/CheckoutPage.tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../stores/cartStore'
import CustomerInformation from '../components/CustomerInformation'
import PaymentSection from '../components/PaymentSection'
import OrderSummary from '../components/OrderSummary'

export default function CheckoutPage() {
    const cart = useCartStore((state) => state.cart)
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

    const navigate = useNavigate()
    const [isProcessing, setIsProcessing] = useState(false)
    const [orderComplete, setOrderComplete] = useState(false)
    const [orderNumber, setOrderNumber] = useState('')

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        zipCode: '',
        deliveryInstructions: '',
        paymentMethod: 'cash-card'
    })

    const gst = cartTotal * 0.05  // Federal GST 5%
    const qst = cartTotal * 0.09975  // Provincial QST 9.975%
    const tax = gst + qst
    const deliveryFee = cartTotal > 25 ? 0 : 4.99
    const finalTotal = cartTotal + tax + deliveryFee

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handlePaymentMethodChange = (method: string) => {
        setFormData(prev => ({
            ...prev,
            paymentMethod: method
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsProcessing(true)

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000))

        const newOrderNumber = `SUSHI-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
        setOrderNumber(newOrderNumber)
        setOrderComplete(true)
        setIsProcessing(false)
    }

    // Empty cart and order complete states remain the same...
    if (cart.length === 0 && !orderComplete) {
        return (
            <div className="min-h-screen bg-gray-50 py-12">
                <div className="container mx-auto px-4">
                    <div className="text-center">
                        <svg className="w-24 h-24 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h2 className="text-3xl font-bold text-gray-800 mb-4">Your cart is empty</h2>
                        <p className="text-gray-600 mb-8">Add some delicious sushi to get started!</p>
                        <Link
                            to="/order"
                            className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 transition-colors inline-block"
                        >
                            Browse Menu
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    if (orderComplete) {
        return (
            <div className="min-h-screen bg-gray-50 py-12">
                <div className="container mx-auto px-4">
                    <div className="max-w-2xl mx-auto text-center">
                        <div className="bg-white rounded-lg shadow-md p-8">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-800 mb-4">Order Confirmed!</h2>
                            <p className="text-gray-600 mb-2">Thank you for your order</p>
                            <div className="bg-gray-50 rounded-lg p-4 mb-6">
                                <p className="text-sm text-gray-600">Order Number</p>
                                <p className="text-xl font-bold text-gray-800">{orderNumber}</p>
                            </div>
                            <p className="text-gray-600 mb-6">
                                We've sent a confirmation email to {formData.email}. Your sushi will be ready in approximately 20-30 minutes.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link
                                    to="/order"
                                    className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Order Again
                                </Link>
                                <button
                                    onClick={() => navigate('/')}
                                    className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    Back to Home
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <header className="mb-8">
                        <Link to="/order" className="inline-flex items-center text-red-600 hover:text-red-700 mb-4">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Menu
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-800">Checkout</h1>
                    </header>

                    <form onSubmit={handleSubmit}>
                        {/* Mobile Layout: Order Summary First */}
                        <div className="block lg:hidden space-y-6">
                            {/* Order Summary - Top on Mobile */}
                            <OrderSummary
                                cart={cart}
                                cartTotal={cartTotal}
                                itemCount={itemCount}
                                gst={gst}
                                qst={qst}
                                deliveryFee={deliveryFee}
                                finalTotal={finalTotal}
                            />

                            {/* Customer Information */}
                            <CustomerInformation
                                formData={formData}
                                onInputChange={handleInputChange}
                            />

                            {/* Payment Section - Bottom on Mobile */}
                            <PaymentSection
                                paymentMethod={formData.paymentMethod}
                                onPaymentMethodChange={handlePaymentMethodChange}
                                finalTotal={finalTotal}
                                isProcessing={isProcessing}
                                onSubmit={handleSubmit}
                            />
                        </div>

                        {/* Desktop Layout: Side by Side */}
                        <div className="hidden lg:grid grid-cols-2 gap-8">
                            {/* Left Column - Forms */}
                            <div className="space-y-6">
                                <CustomerInformation
                                    formData={formData}
                                    onInputChange={handleInputChange}
                                />

                                <PaymentSection
                                    paymentMethod={formData.paymentMethod}
                                    onPaymentMethodChange={handlePaymentMethodChange}
                                    finalTotal={finalTotal}
                                    isProcessing={isProcessing}
                                    onSubmit={handleSubmit}
                                />
                            </div>

                            {/* Right Column - Order Summary */}
                            <OrderSummary
                                cart={cart}
                                cartTotal={cartTotal}
                                itemCount={itemCount}
                                gst={gst}
                                qst={qst}
                                deliveryFee={deliveryFee}
                                finalTotal={finalTotal}
                            />
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}