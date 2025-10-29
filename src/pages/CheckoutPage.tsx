import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCartStore } from "../stores/cartStore";
import {
    getFunctions,
    httpsCallable,
    type HttpsCallableResult,
} from "firebase/functions";
import { useTranslation } from "react-i18next";

import { LandingCTAFooter } from "./landing/components/LandingCTAFooter";
import CustomerInformation from "../components/web/CustomerInformation";
import OrderSummary from "../components/web/OrderSummary";
import type {
    CashOrderResponse,
} from "../types/stripe_interfaces";
import PaymentMethodSelector from "./PaymentMethodSelector";

interface FormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zipCode: string;
    deliveryInstructions: string;
    paymentMethod: string;
}

interface CartItem {
    id?: string;
    name: string;
    price: number;
    quantity?: number;
    description?: string;
    category?: string;
    image?: string;
    imageUrl?: string;
    thumbnail?: string;
    mainImage?: string;
    photo?: string;
    img?: string;
    picture?: string;
    images?: string[];
    imageUrls?: string[];
}

interface CustomerInfo {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zipCode: string;
    deliveryInstructions: string;
    province: string;
}

interface Totals {
    subtotal: number;
    gst: number;
    qst: number;
    deliveryFee: number;
    finalTotal: number;
}

export default function CheckoutPage() {
    const cart = useCartStore((state) => state.cart);
    const clearCart = useCartStore((state) => state.clearCart);
    const { t } = useTranslation();

    const safeCart: CartItem[] = Array.isArray(cart) ? cart : [];
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

    const [formData, setFormData] = useState<FormData>({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        zipCode: "",
        deliveryInstructions: "",
        paymentMethod: "card",
    });

    const gst = Number((cartTotal * 0.05).toFixed(2));
    const qst = Number((cartTotal * 0.09975).toFixed(2));
    const tax = gst + qst;
    const deliveryFee = cartTotal > 25 ? 0 : 4.99;
    const finalTotal = Number((cartTotal + tax + deliveryFee).toFixed(2));

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

    const validateCustomerInfo = (): boolean => {
        const requiredFields = {
            firstName: t('common.firstName'),
            lastName: t('common.lastName'),
            email: t('common.email'),
            phone: t('common.phone'),
            address: t('common.address'),
            city: t('common.city'),
            zipCode: t('common.zipCode')
        };

        const missingFields = Object.entries(requiredFields)
            .filter(([key]) => !formData[key as keyof FormData]?.trim())
            .map(([_, label]) => label);

        if (missingFields.length > 0) {
            alert(`${t('checkoutPage.requiredFields')}\n${missingFields.join("\n")}`);
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            alert(t('checkoutPage.validEmail'));
            return false;
        }

        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        const cleanPhone = formData.phone.replace(/\D/g, '');
        if (!phoneRegex.test(cleanPhone)) {
            alert(t('checkoutPage.validPhone'));
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

    // Enhanced image URL validation and collection
    const collectValidImageUrls = (item: CartItem): string[] => {
        const validUrls: string[] = [];

        const addIfValidUrl = (url: any): boolean => {
            if (typeof url !== 'string') return false;

            const trimmedUrl = url.trim();
            if (!trimmedUrl) return false;

            try {
                // Check if it's a valid URL
                new URL(trimmedUrl);
                // Check if it's an image URL (basic check)
                const isImage = /\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?.*)?$/i.test(trimmedUrl) ||
                    trimmedUrl.includes('cloudinary') ||
                    trimmedUrl.includes('firebase') ||
                    trimmedUrl.includes('storage.googleapis.com');

                if (isImage && !validUrls.includes(trimmedUrl)) {
                    validUrls.push(trimmedUrl);
                    return true;
                }
            } catch (error) {
                // Not a valid URL
                console.warn(`Invalid image URL for ${item.name}:`, trimmedUrl);
            }
            return false;
        };

        // Check all possible image fields
        const imageFields = [
            item.image,
            item.imageUrl,
            item.thumbnail,
            item.mainImage,
            item.photo,
            item.img,
            item.picture
        ];

        // Process single image fields
        imageFields.forEach(field => addIfValidUrl(field));

        // Process array fields
        if (Array.isArray(item.images)) {
            item.images.forEach((url: string) => addIfValidUrl(url));
        }
        if (Array.isArray(item.imageUrls)) {
            item.imageUrls.forEach((url: string) => addIfValidUrl(url));
        }

        console.log(`🖼️ Collected ${validUrls.length} valid images for ${item.name}:`, validUrls);
        return validUrls;
    };

    const handleCardPayment = async () => {
        setIsProcessing(true);

        try {
            console.log('🔄 Starting card payment processing...');

            // Enhanced cart validation
            if (!safeCart || safeCart.length === 0) {
                throw new Error('Your cart is empty. Please add items before proceeding.');
            }

            // Enhanced cart items preparation with better image handling
            const cartItems = safeCart.map((item, index) => {
                // Validate required fields
                if (!item.name || item.name.trim() === "") {
                    throw new Error(`Item ${index + 1} is missing a name`);
                }

                if (item.price === undefined || item.price === null) {
                    throw new Error(`Item "${item.name}" is missing price information`);
                }

                if (typeof item.price !== "number" || item.price < 0) {
                    throw new Error(`Item "${item.name}" has an invalid price`);
                }

                if (item.quantity && (item.quantity < 1 || !Number.isInteger(item.quantity))) {
                    throw new Error(`Item "${item.name}" has an invalid quantity`);
                }

                // Collect valid image URLs
                const validImageUrls = collectValidImageUrls(item);

                // Prepare cart item with enhanced image handling
                const cartItem: any = {
                    productId: item.id || `item-${index}-${Date.now()}`,
                    name: item.name.trim(),
                    price: Number(item.price),
                    quantity: item.quantity || 1,
                    ...(item.description && {
                        description: item.description.substring(0, 495)
                    }),
                    ...(item.category && { category: item.category }),
                };

                // Add images if we have valid ones
                if (validImageUrls.length > 0) {
                    cartItem.image = validImageUrls[0]; // Primary image
                    cartItem.imageUrls = validImageUrls.slice(0, 8); // All images (Stripe limit)

                    console.log(`✅ Added ${validImageUrls.length} images to ${cartItem.name}`);
                } else {
                    console.warn(`⚠️ No valid images found for ${cartItem.name}`);
                }

                console.log(`📦 Prepared item: ${cartItem.name}`, {
                    price: cartItem.price,
                    quantity: cartItem.quantity,
                    images: cartItem.imageUrls?.length || 0
                });

                return cartItem;
            });

            console.log('✅ Cart items validated:', cartItems.length);

            // Enhanced customer info preparation
            const customerInfo: CustomerInfo = {
                name: `${formData.firstName} ${formData.lastName}`.trim(),
                email: formData.email.trim(),
                phone: formData.phone?.trim() || "",
                address: formData.address?.trim() || "",
                city: formData.city?.trim() || "",
                zipCode: formData.zipCode?.trim() || "",
                deliveryInstructions: formData.deliveryInstructions?.trim() || "",
                province: "QC",
            };

            // Validate required customer fields
            const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'zipCode'];
            const missingFields = requiredFields.filter(field => !formData[field as keyof FormData]?.trim());

            if (missingFields.length > 0) {
                throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`);
            }

            // Enhanced totals calculation with validation
            const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            if (subtotal <= 0) {
                throw new Error('Invalid cart total. Please check your items.');
            }

            const gst = Number((subtotal * 0.05).toFixed(2));
            const qst = Number((subtotal * 0.09975).toFixed(2));
            const tax = gst + qst;
            const deliveryFee = subtotal > 25 ? 0 : 4.99;
            const finalTotal = Number((subtotal + tax + deliveryFee).toFixed(2));

            console.log('💰 Enhanced totals calculation:', {
                subtotal,
                gst,
                qst,
                tax,
                deliveryFee,
                finalTotal,
                itemCount: cartItems.length
            });

            // Enhanced API request with better error handling and timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            console.log('🚀 Sending request to Stripe checkout...');
            console.log('📦 Cart items being sent:', cartItems.map(item => ({
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                images: item.imageUrls?.length || 0,
                imageUrls: item.imageUrls
            })));

            const response = await fetch('https://us-central1-sushi-admin.cloudfunctions.net/createCheckoutHTTP', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cartItems,
                    customerInfo,
                    totals: {
                        subtotal: subtotal,
                        gst: gst,
                        qst: qst,
                        deliveryFee: deliveryFee,
                        finalTotal: finalTotal
                    },
                    userId: 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                    clientUrl: window.location.origin
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log('📨 Stripe response status:', response.status);

            if (!response.ok) {
                let errorData;
                const responseText = await response.text();

                try {
                    errorData = JSON.parse(responseText);
                } catch {
                    errorData = { error: `Server error: ${response.status}` };
                }

                console.error('❌ Stripe API error:', errorData);

                // Enhanced error messages based on status code
                switch (response.status) {
                    case 400:
                        throw new Error(errorData.details || errorData.error || 'Invalid request. Please check your cart.');
                    case 500:
                        throw new Error('Payment service is temporarily unavailable. Please try again.');
                    default:
                        throw new Error(errorData.error || `Payment failed: ${response.status}`);
                }
            }

            const result = await response.json();
            console.log('✅ Stripe checkout session created:', result);

            if (result.success && result.url) {
                console.log('🔗 Redirecting to Stripe Checkout...');

                // Add analytics or tracking before redirect
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'begin_checkout', {
                        currency: 'CAD',
                        value: finalTotal,
                        items: cartItems.map(item => ({
                            item_id: item.productId,
                            item_name: item.name,
                            price: item.price,
                            quantity: item.quantity
                        }))
                    });
                }

                // Store cart data in sessionStorage in case of redirect issues
                sessionStorage.setItem('pendingCheckout', JSON.stringify({
                    cartItems,
                    customerInfo,
                    totals: { subtotal, gst, qst, deliveryFee, finalTotal },
                    timestamp: Date.now()
                }));

                // Redirect to Stripe
                window.location.href = result.url;
            } else {
                throw new Error(result.error || 'Checkout session creation failed');
            }

        } catch (error: any) {
            console.error('💥 Card payment error:', error);

            // Enhanced error handling with user-friendly messages
            let userMessage = error.message || 'Payment processing failed. Please try again.';

            if (error.name === 'AbortError') {
                userMessage = 'Request timeout. Please check your connection and try again.';
            }

            if (error.message.includes('network') || error.message.includes('fetch')) {
                userMessage = 'Network error. Please check your internet connection and try again.';
            }

            // Show error to user
            alert(userMessage);

            // Log detailed error for debugging
            console.error('Detailed error:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });

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

            // Enhanced cart items for cash payment with image handling
            const cartItems = safeCart.map((item, index) => {
                const validImageUrls = collectValidImageUrls(item);

                return {
                    productId: item.id || `item-${index}-${Date.now()}`,
                    name: item.name,
                    sellingPrice: item.price,
                    quantity: item.quantity || 1,
                    ...(item.description && { description: item.description }),
                    ...(item.category && { category: item.category }),
                    ...(validImageUrls.length > 0 && {
                        image: validImageUrls[0],
                        images: validImageUrls
                    }),
                };
            });

            const customerInfo: CustomerInfo = {
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                city: formData.city,
                zipCode: formData.zipCode,
                deliveryInstructions: formData.deliveryInstructions,
                province: "QC",
            };

            const totals: Totals = {
                subtotal: cartTotal,
                gst,
                qst,
                deliveryFee,
                finalTotal,
            };

            const result: HttpsCallableResult<CashOrderResponse> =
                await createCashOrder({
                    cartItems,
                    customerInfo,
                    totals,
                });

            if (result.data.success) {
                setOrderNumber(result.data.orderId);
                setOrderComplete(true);
                clearCart();

                // Clear any pending checkout data
                sessionStorage.removeItem('pendingCheckout');
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
                            {t('checkoutPage.emptyCart')}
                        </h2>
                        <p className="text-white/60 mb-6 font-light tracking-wide text-sm">
                            {t('checkoutPage.emptyCartDescription')}
                        </p>
                        <Link
                            to="/order"
                            className="border border-white text-white px-6 py-3 rounded-sm hover:bg-white hover:text-gray-900 transition-all duration-300 font-light tracking-wide text-sm inline-block"
                        >
                            {t('checkoutPage.browseMenu')}
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
                                    ? t('checkoutPage.orderConfirmed')
                                    : t('checkoutPage.paymentSuccessful')}
                            </h2>
                            <p className="text-white/60 mb-3 font-light tracking-wide text-sm">
                                {t('checkoutPage.thanksOrder')}
                            </p>
                            <div className="bg-white/5 rounded-sm p-4 mb-6 border border-white/10">
                                <p className="text-xs text-white/40 font-light tracking-wide mb-1">
                                    {t('checkoutPage.orderNumber')}
                                </p>
                                <p className="text-lg font-light text-white font-mono">
                                    {orderNumber}
                                </p>
                            </div>
                            <p className="text-white/60 mb-6 font-light tracking-wide leading-relaxed text-sm">
                                {formData.paymentMethod === "cash"
                                    ? t('checkoutPage.cashPaymentMessage', { amount: finalTotal.toFixed(2) })
                                    : t('checkoutPage.cardPaymentMessage', { email: formData.email })}
                            </p>
                            <div className="flex flex-col gap-3">
                                <Link
                                    to="/order"
                                    className="border border-white text-white px-4 py-3 rounded-sm hover:bg-white hover:text-gray-900 transition-all duration-300 font-light tracking-wide text-sm"
                                >
                                    {t('checkoutPage.orderAgain')}
                                </Link>
                                <button
                                    onClick={() => navigate("/")}
                                    className="bg-white/5 border border-white/10 text-white px-4 py-3 rounded-sm hover:bg-white/10 transition-all duration-300 font-light tracking-wide text-sm"
                                >
                                    {t('checkoutPage.backHome')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const StepIndicator = () => (
        <div className="flex items-center justify-center mb-8">
            <div className="flex items-center">
                <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${currentStep === "info"
                        ? "bg-white border-white text-gray-900"
                        : "bg-white/10 border-white/20 text-white"
                        }`}>
                        <span className="text-sm font-light">1</span>
                    </div>
                    <span className={`text-xs mt-2 font-light tracking-wide ${currentStep === "info" ? "text-white" : "text-white/40"
                        }`}>
                        {t('checkoutPage.information')}
                    </span>
                </div>

                <div className="w-12 h-px bg-white/20 mx-2"></div>

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
                        {t('checkoutPage.reviewPay')}
                    </span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-900">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-7xl mx-auto">
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
                            {t('checkoutPage.backMenu')}
                        </Link>
                        <h1 className="text-2xl font-light text-white tracking-wide mb-2">
                            {t('checkoutPage.checkout')}
                        </h1>
                        <StepIndicator />
                    </header>

                    <form onSubmit={currentStep === "info" ? handleContinueToReview : undefined}>
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
                                            {t('checkoutPage.continueReview')}
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
                                                {t('checkoutPage.deliveryInfo')}
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={handleBackToInfo}
                                                className="text-white/60 hover:text-white text-sm font-light tracking-wide"
                                            >
                                                {t('checkoutPage.edit')}
                                            </button>
                                        </div>
                                        <div className="text-white/80 font-light text-sm space-y-2">
                                            <p>{formData.firstName} {formData.lastName}</p>
                                            <p>{formData.email}</p>
                                            <p>{formData.phone}</p>
                                            <p>{formData.address}, {formData.city}, QC {formData.zipCode}</p>
                                            {formData.deliveryInstructions && (
                                                <p className="text-white/60">{t('checkoutPage.instructions')}: {formData.deliveryInstructions}</p>
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

                        <div className="hidden lg:grid grid-cols-1 xl:grid-cols-4 gap-8">
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
                                                {t('checkoutPage.continueReview')}
                                            </button>
                                        </div>
                                    </>
                                )}

                                {currentStep === "review" && (
                                    <>
                                        <div className="bg-white/5 border border-white/10 rounded-sm p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-light text-white tracking-wide">
                                                    {t('checkoutPage.deliveryInfo')}
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={handleBackToInfo}
                                                    className="text-white/60 hover:text-white text-sm font-light tracking-wide"
                                                >
                                                    {t('checkoutPage.edit')}
                                                </button>
                                            </div>
                                            <div className="text-white/80 font-light text-sm space-y-2">
                                                <p>{formData.firstName} {formData.lastName}</p>
                                                <p>{formData.email}</p>
                                                <p>{formData.phone}</p>
                                                <p>{formData.address}, {formData.city}, QC {formData.zipCode}</p>
                                                {formData.deliveryInstructions && (
                                                    <p className="text-white/60">{t('checkoutPage.instructions')}: {formData.deliveryInstructions}</p>
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

                            <div className="xl:col-span-1">
                                <div className="min-w-80">
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