import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCartStore } from "../stores/cartStore";

import { LandingCTAFooter } from "./landing/components/LandingCTAFooter";
import CustomerInformation from "../components/web/CustomerInformation";
import OrderSummary from "../components/web/OrderSummary";
import PaymentSection from "../components/web/PaymentSection";

export default function CheckoutPage() {
    const cart = useCartStore((state) => state.cart);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [orderComplete, setOrderComplete] = useState(false);
    const [orderNumber, setOrderNumber] = useState("");

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        zipCode: "",
        deliveryInstructions: "",
        paymentMethod: "cash-card",
    });

    const gst = cartTotal * 0.05;
    const qst = cartTotal * 0.09975;
    const tax = gst + qst;
    const deliveryFee = cartTotal > 25 ? 0 : 4.99;
    const finalTotal = cartTotal + tax + deliveryFee;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handlePaymentMethodChange = (method: string) => {
        setFormData((prev) => ({
            ...prev,
            paymentMethod: method,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        await new Promise((resolve) => setTimeout(resolve, 2000));

        const newOrderNumber = `SUSHI-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        setOrderNumber(newOrderNumber);
        setOrderComplete(true);
        setIsProcessing(false);
    };

    if (cart.length === 0 && !orderComplete) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="container mx-auto px-6 text-center">
                    <div className="max-w-md mx-auto">
                        <svg
                            className="w-16 h-16 text-white/30 mx-auto mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1}
                                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                        </svg>
                        <h2 className="text-2xl font-light text-white mb-3 tracking-wide">Your cart is empty</h2>
                        <p className="text-white/60 mb-6 font-light tracking-wide text-sm">
                            Add some delicious sushi to get started!
                        </p>
                        <Link
                            to="/order"
                            className="border border-white text-white px-6 py-3 rounded-sm hover:bg-white hover:text-gray-900 transition-all duration-300 font-light tracking-wide text-sm inline-block"
                        >
                            Browse Menu
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (orderComplete) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="container mx-auto px-6">
                    <div className="max-w-md mx-auto text-center">
                        <div className="bg-white/5 border border-white/10 rounded-sm p-8 backdrop-blur-sm">
                            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-light text-white mb-3 tracking-wide">Order Confirmed!</h2>
                            <p className="text-white/60 mb-3 font-light tracking-wide text-sm">Thank you for your order</p>
                            <div className="bg-white/5 rounded-sm p-4 mb-6 border border-white/10">
                                <p className="text-xs text-white/40 font-light tracking-wide mb-1">Order Number</p>
                                <p className="text-lg font-light text-white font-mono">{orderNumber}</p>
                            </div>
                            <p className="text-white/60 mb-6 font-light tracking-wide leading-relaxed text-sm">
                                We've sent a confirmation email to <span className="text-white">{formData.email}</span>.
                                Your sushi will be ready in approximately 20-30 minutes.
                            </p>
                            <div className="flex flex-col gap-3">
                                <Link
                                    to="/order"
                                    className="border border-white text-white px-4 py-3 rounded-sm hover:bg-white hover:text-gray-900 transition-all duration-300 font-light tracking-wide text-sm"
                                >
                                    Order Again
                                </Link>
                                <button
                                    onClick={() => navigate("/")}
                                    className="bg-white/5 border border-white/10 text-white px-4 py-3 rounded-sm hover:bg-white/10 transition-all duration-300 font-light tracking-wide text-sm"
                                >
                                    Back to Home
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <header className="mb-8">
                        <Link
                            to="/order"
                            className="inline-flex items-center text-white/60 hover:text-white transition-colors duration-300 mb-3 font-light tracking-wide text-sm"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Menu
                        </Link>
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                                <span className="text-white text-sm font-light">1</span>
                            </div>
                            <h1 className="text-2xl font-light text-white tracking-wide">Checkout</h1>
                        </div>
                        <p className="text-white/40 font-light tracking-wide text-sm mt-1">Complete your order</p>
                    </header>

                    <form onSubmit={handleSubmit}>
                        {/* Mobile Layout */}
                        <div className="block lg:hidden space-y-6">
                            <OrderSummary
                                cart={cart}
                                cartTotal={cartTotal}
                                itemCount={itemCount}
                                gst={gst}
                                qst={qst}
                                deliveryFee={deliveryFee}
                                finalTotal={finalTotal}
                            />

                            <CustomerInformation formData={formData} onInputChange={handleInputChange} />

                            <PaymentSection
                                paymentMethod={formData.paymentMethod}
                                onPaymentMethodChange={handlePaymentMethodChange}
                                finalTotal={finalTotal}
                                isProcessing={isProcessing}
                                onSubmit={handleSubmit}
                            />
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden lg:grid grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <CustomerInformation formData={formData} onInputChange={handleInputChange} />
                                <PaymentSection
                                    paymentMethod={formData.paymentMethod}
                                    onPaymentMethodChange={handlePaymentMethodChange}
                                    finalTotal={finalTotal}
                                    isProcessing={isProcessing}
                                    onSubmit={handleSubmit}
                                />
                            </div>

                            <div className="space-y-6">
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
                        </div>
                    </form>
                </div>
            </div>

            <LandingCTAFooter displaySimple={true} />
        </div>
    );
}