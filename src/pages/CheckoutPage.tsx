import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCartStore } from "../stores/cartStore";
import {
    getFunctions,
    httpsCallable,
    type HttpsCallableResult,
} from "firebase/functions";

import { LandingCTAFooter } from "./landing/components/LandingCTAFooter";
import CustomerInformation from "../components/web/CustomerInformation";
import OrderSummary from "../components/web/OrderSummary";
import type {
    CashOrderResponse,
} from "../types/stripe_interfaces";
import PaymentMethodSelector from "./PaymentMethodSelector";

export default function CheckoutPage() {
    const cart = useCartStore((state) => state.cart);
    const clearCart = useCartStore((state) => state.clearCart);

    // Safe cart defaults
    const safeCart = Array.isArray(cart) ? cart : [];
    const itemCount = safeCart.reduce((sum, item) => sum + (item?.quantity || 0), 0);
    const cartTotal = safeCart.reduce(
        (sum, item) => sum + (item?.price || 0) * (item?.quantity || 0),
        0
    );

    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [orderComplete, setOrderComplete] = useState(false);
    const [orderNumber, setOrderNumber] = useState("");
    const [currentStep, setCurrentStep] = useState<"info" | "review" | "payment">("info");

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
        paymentMethod: "card", // card or cash
    });

    const gst = cartTotal * 0.05;
    const qst = cartTotal * 0.09975;
    const tax = gst + qst;
    const deliveryFee = cartTotal > 25 ? 0 : 4.99;
    const finalTotal = cartTotal + tax + deliveryFee;

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
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

    const validateCustomerInfo = () => {
        const requiredFields = {
            firstName: "First name",
            lastName: "Last name",
            email: "Email",
            phone: "Phone number",
            address: "Delivery address",
            city: "City",
            zipCode: "ZIP code"
        };

        const missingFields = Object.entries(requiredFields)
            .filter(([key]) => !formData[key as keyof typeof formData])
            .map(([_, label]) => label);

        if (missingFields.length > 0) {
            alert(`Please fill in the following required fields:\n${missingFields.join("\n")}`);
            return false;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            alert("Please enter a valid email address");
            return false;
        }

        // Basic phone validation
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        const cleanPhone = formData.phone.replace(/\D/g, '');
        if (!phoneRegex.test(cleanPhone)) {
            alert("Please enter a valid phone number");
            return false;
        }

        return true;
    };

    const handleContinueToReview = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateCustomerInfo()) {
            setCurrentStep("review");
        }
    };

    const handleBackToInfo = () => {
        setCurrentStep("info");
    };

    const handlePlaceOrder = async () => {
        if (formData.paymentMethod === "cash") {
            await handleCashPayment();
        } else {
            await handleCardPayment();
        }
    };

    // STRIPE PAYMENT - Redirects to Stripe Checkout
    const handleCardPayment = async () => {
        setIsProcessing(true);
        try {
            console.log('Processing card payment...');

            const cartItems = safeCart.map((item) => ({
                productId: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity || 1,
                ...(item.description && { description: item.description }),
                ...(item.category && { category: item.category }),
                ...(item.image && { image: item.image, imageUrls: [item.image] }),
            }));

            // Validate items
            const invalidItems = cartItems.filter(item => !item.name || item.price === undefined);
            if (invalidItems.length > 0) {
                throw new Error('Some items in your cart are invalid');
            }

            const customerInfo = {
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                city: formData.city,
                zipCode: formData.zipCode,
                deliveryInstructions: formData.deliveryInstructions,
                province: "QC",
            };

            console.log('Sending to Stripe...');
            const response = await fetch('https://us-central1-sushi-admin.cloudfunctions.net/createCheckoutHTTP', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cartItems,
                    customerInfo,
                    userId: 'user-' + Date.now(),
                    clientUrl: window.location.origin
                })
            });

            const responseText = await response.text();
            console.log('Stripe response:', responseText);

            if (!response.ok) {
                let errorData;
                try {
                    errorData = JSON.parse(responseText);
                } catch {
                    errorData = { error: responseText };
                }
                throw new Error(errorData.error || `Payment failed: ${response.status}`);
            }

            const result = JSON.parse(responseText);
            console.log('Stripe checkout session created:', result);

            if (result.success && result.url) {
                // Redirect to Stripe Checkout - they handle payment details
                console.log('Redirecting to Stripe Checkout...');
                window.location.href = result.url;
            } else {
                throw new Error(result.error || 'Checkout session creation failed');
            }
        } catch (error: any) {
            console.error('Card payment error:', error);
            alert(error.message || 'Payment processing failed. Please try again.');
            setIsProcessing(false);
        }
    };

    const handleCashPayment = async () => {
        setIsProcessing(true);
        try {
            const functions = getFunctions();
            const createCashOrder = httpsCallable<
                {
                    cartItems: any[];
                    customerInfo: any;
                    totals: any;
                },
                CashOrderResponse
            >(functions, "createCashOrder");

            const cartItems = safeCart.map((item) => ({
                productId: item.id,
                name: item.name,
                sellingPrice: item.price,
                quantity: item.quantity,
            }));

            const customerInfo = {
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                city: formData.city,
                zipCode: formData.zipCode,
                deliveryInstructions: formData.deliveryInstructions,
            };

            const result: HttpsCallableResult<CashOrderResponse> =
                await createCashOrder({
                    cartItems,
                    customerInfo,
                    totals: {
                        subtotal: cartTotal,
                        gst,
                        qst,
                        deliveryFee,
                        finalTotal,
                    },
                });

            if (result.data.success) {
                setOrderNumber(result.data.orderId);
                setOrderComplete(true);
                clearCart();
            } else {
                throw new Error(result.data.error || "Order creation failed");
            }
        } catch (error: any) {
            console.error("Cash order error:", error);
            alert(error.message || "Failed to create order. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (safeCart.length === 0 && !orderComplete) {
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
                        <h2 className="text-2xl font-light text-white mb-3 tracking-wide">
                            Your cart is empty
                        </h2>
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

    // Order Complete
    if (orderComplete) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="container mx-auto px-6">
                    <div className="max-w-md mx-auto text-center">
                        <div className="bg-white/5 border border-white/10 rounded-sm p-8 backdrop-blur-sm">
                            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
                                <svg
                                    className="w-6 h-6 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-light text-white mb-3 tracking-wide">
                                {formData.paymentMethod === "cash"
                                    ? "Order Confirmed!"
                                    : "Payment Successful!"}
                            </h2>
                            <p className="text-white/60 mb-3 font-light tracking-wide text-sm">
                                Thank you for your order
                            </p>
                            <div className="bg-white/5 rounded-sm p-4 mb-6 border border-white/10">
                                <p className="text-xs text-white/40 font-light tracking-wide mb-1">
                                    Order Number
                                </p>
                                <p className="text-lg font-light text-white font-mono">
                                    {orderNumber}
                                </p>
                            </div>
                            <p className="text-white/60 mb-6 font-light tracking-wide leading-relaxed text-sm">
                                {formData.paymentMethod === "cash"
                                    ? `We've received your order for $${finalTotal.toFixed(2)} CAD. Please have cash ready upon delivery. Your sushi will be ready in approximately 20–30 minutes.`
                                    : `We've sent a confirmation email to ${formData.email}. Your sushi will be ready in approximately 20–30 minutes.`}
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

    // Step Indicators
    const StepIndicator = () => (
        <div className="flex items-center justify-center mb-8">
            <div className="flex items-center">
                {/* Step 1: Information */}
                <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${currentStep === "info"
                        ? "bg-white border-white text-gray-900"
                        : "bg-white/10 border-white/20 text-white"
                        }`}>
                        <span className="text-sm font-light">1</span>
                    </div>
                    <span className={`text-xs mt-2 font-light tracking-wide ${currentStep === "info" ? "text-white" : "text-white/40"
                        }`}>
                        Information
                    </span>
                </div>

                <div className="w-12 h-px bg-white/20 mx-2"></div>

                {/* Step 2: Review */}
                <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${currentStep === "review"
                        ? "bg-white border-white text-gray-900"
                        : currentStep === "payment"
                            ? "bg-white/10 border-white/20 text-white"
                            : "bg-white/5 border-white/10 text-white/40"
                        }`}>
                        <span className="text-sm font-light">2</span>
                    </div>
                    <span className={`text-xs mt-2 font-light tracking-wide ${currentStep === "review" || currentStep === "payment"
                        ? "text-white"
                        : "text-white/40"
                        }`}>
                        Review & Pay
                    </span>
                </div>
            </div>
        </div>
    );

    // Main Checkout View
    return (
        <div className="min-h-screen bg-gray-900">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-7xl mx-auto"> {/* Increased max-width */}
                    {/* Header */}
                    <header className="mb-8">
                        <Link
                            to="/order"
                            className="inline-flex items-center text-white/60 hover:text-white transition-colors duration-300 mb-3 font-light tracking-wide text-sm"
                        >
                            <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                            Back to Menu
                        </Link>
                        <h1 className="text-2xl font-light text-white tracking-wide mb-2">
                            Checkout
                        </h1>
                        <StepIndicator />
                    </header>

                    <form onSubmit={currentStep === "info" ? handleContinueToReview : undefined}>
                        {/* Mobile Layout */}
                        <div className="block lg:hidden space-y-6">
                            {currentStep === "info" && (
                                <>
                                    <CustomerInformation
                                        formData={formData}
                                        onInputChange={handleInputChange}
                                    />

                                    <OrderSummary
                                        cart={safeCart}
                                        cartTotal={cartTotal}
                                        itemCount={itemCount}
                                        gst={gst}
                                        qst={qst}
                                        deliveryFee={deliveryFee}
                                        finalTotal={finalTotal}
                                    />

                                    <div className="sticky bottom-0 bg-gray-900 border-t border-white/10 pt-4 pb-4 -mx-4 px-4 mt-6">
                                        <button
                                            type="submit"
                                            className="bg-white text-gray-900 px-8 py-4 rounded-sm hover:bg-white/90 transition-all duration-300 font-light tracking-wide text-sm w-full"
                                        >
                                            Continue to Review
                                        </button>
                                    </div>
                                </>
                            )}

                            {currentStep === "review" && (
                                <>
                                    <OrderSummary
                                        cart={safeCart}
                                        cartTotal={cartTotal}
                                        itemCount={itemCount}
                                        gst={gst}
                                        qst={qst}
                                        deliveryFee={deliveryFee}
                                        finalTotal={finalTotal}
                                    />

                                    <div className="bg-white/5 border border-white/10 rounded-sm p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-light text-white tracking-wide">
                                                Delivery Information
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={handleBackToInfo}
                                                className="text-white/60 hover:text-white text-sm font-light tracking-wide"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                        <div className="text-white/80 font-light text-sm space-y-2">
                                            <p>{formData.firstName} {formData.lastName}</p>
                                            <p>{formData.email}</p>
                                            <p>{formData.phone}</p>
                                            <p>{formData.address}, {formData.city}, QC {formData.zipCode}</p>
                                            {formData.deliveryInstructions && (
                                                <p className="text-white/60">Instructions: {formData.deliveryInstructions}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="sticky bottom-0 bg-gray-900 border-t border-white/10 pt-4 pb-4 -mx-4 px-4">
                                        <PaymentMethodSelector
                                            paymentMethod={formData.paymentMethod}
                                            onPaymentMethodChange={handlePaymentMethodChange}
                                            finalTotal={finalTotal}
                                            isProcessing={isProcessing}
                                            onPlaceOrder={handlePlaceOrder}
                                            onBack={handleBackToInfo}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden lg:grid grid-cols-1 xl:grid-cols-4 gap-8"> {/* Better grid system */}
                            {/* Left Column - Main Content (3/4 width) */}
                            <div className="xl:col-span-3 space-y-6">
                                {currentStep === "info" && (
                                    <>
                                        <CustomerInformation
                                            formData={formData}
                                            onInputChange={handleInputChange}
                                        />

                                        <div className="flex justify-end pt-4">
                                            <button
                                                type="submit"
                                                className="bg-white text-gray-900 px-8 py-3 rounded-sm hover:bg-white/90 transition-all duration-300 font-light tracking-wide text-sm"
                                            >
                                                Continue to Review
                                            </button>
                                        </div>
                                    </>
                                )}

                                {currentStep === "review" && (
                                    <>
                                        <div className="bg-white/5 border border-white/10 rounded-sm p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-light text-white tracking-wide">
                                                    Delivery Information
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={handleBackToInfo}
                                                    className="text-white/60 hover:text-white text-sm font-light tracking-wide"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                            <div className="text-white/80 font-light text-sm space-y-2">
                                                <p>{formData.firstName} {formData.lastName}</p>
                                                <p>{formData.email}</p>
                                                <p>{formData.phone}</p>
                                                <p>{formData.address}, {formData.city}, QC {formData.zipCode}</p>
                                                {formData.deliveryInstructions && (
                                                    <p className="text-white/60">Instructions: {formData.deliveryInstructions}</p>
                                                )}
                                            </div>
                                        </div>

                                        <PaymentMethodSelector
                                            paymentMethod={formData.paymentMethod}
                                            onPaymentMethodChange={handlePaymentMethodChange}
                                            finalTotal={finalTotal}
                                            isProcessing={isProcessing}
                                            onPlaceOrder={handlePlaceOrder}
                                            onBack={handleBackToInfo}
                                        />
                                    </>
                                )}
                            </div>

                            {/* Right Column - Order Summary (1/4 width) */}
                            <div className="xl:col-span-1">
                                <div className="min-w-80"> {/* Ensure minimum width */}
                                    <OrderSummary
                                        cart={safeCart}
                                        cartTotal={cartTotal}
                                        itemCount={itemCount}
                                        gst={gst}
                                        qst={qst}
                                        deliveryFee={deliveryFee}
                                        finalTotal={finalTotal}
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <LandingCTAFooter displaySimple={true} />
        </div>
    );
}