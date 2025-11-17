import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import PaymentMethodSelector from "./PaymentMethodSelector";
import type { CustomerFormData } from "../orders/CustomerInformation";
import CustomerInformation from "../orders/CustomerInformation";
import { useCartStore } from "../../stores/cartStore";
import { supabase } from "../../lib/supabase";
import { AuthModal } from "../components/AuthModal";
import OrderSummary from "../../components/web/OrderSummary";
import { LandingCTAFooter } from "../landing/components/LandingCTAFooter";

// Custom hooks
import { useCheckoutForm } from "./hooks/useCheckoutForm";
import { useCheckoutTotals, useCheckoutValidation, useDeliveryInfo } from "./hooks/useCheckoutCalculations";
import { useUserAuth } from "./hooks/useUserAuth";
import type { CartItemCheckOut } from "./interfaces/IPaymentSteps";



// ---------- Component ----------
export default function CheckoutPage() {
    const cart = useCartStore((s) => s.cart);
    const { t } = useTranslation();
    const navigate = useNavigate();

    console.log("🔄 CheckoutPage rendered");

    // Custom hooks
    const { formData, updateFormData } = useCheckoutForm();
    const {
        user,
        isLoadingUser,
        showAuthModal,
        isLoginMode,
        authForm,
        isAuthLoading,
        authError,
        setAuthForm,
        setIsLoginMode,
        setAuthError,
        handleLogin,
        handleSignup,
        handleLogout,
        openAuthModal,
        setShowAuthModal
    } = useUserAuth();

    useEffect(() => {
        if (user && user.email && !formData.email) {
            updateFormData({
                firstName: user.first_name || formData.firstName,
                email: user.email || formData.email,
                phone: user.phone || formData.phone,
                address: user.address || formData.address,
                city: user.city || formData.city,
                zipCode: user.zip_code || formData.zipCode,
            });
        }
    }, [user, updateFormData]);

    const { errors, validate } = useCheckoutValidation();

    // Cart calculations
    const { safeCart, itemCount, subtotal } = useMemo(() => {
        const safeCart: CartItemCheckOut[] = Array.isArray(cart)
            ? cart.filter(item => (item.quantity || 0) > 0)
            : [];

        const itemCount = safeCart.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const subtotal = safeCart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);

        return { safeCart, itemCount, subtotal };
    }, [cart]);

    const deliveryInfo = useDeliveryInfo(formData, subtotal);
    const { gst, qst, finalTotal } = useCheckoutTotals(subtotal, deliveryInfo.fee);

    const [isProcessing, setIsProcessing] = useState(false);
    const [orderComplete, _setOrderComplete] = useState(false);
    const [orderNumber, _setOrderNumber] = useState("");
    const [currentStep, setCurrentStep] = useState<"info" | "review">("info");

    // Loyalty points
    const pointsEarned = Math.floor(subtotal);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    // Input handler
    const onInputChange = useCallback((e: any) => {
        const { name, value } = e.target as { name: keyof CustomerFormData; value: string };

        if (name === "city" && value === "Other") {
            if (formData.deliveryMethod === "delivery") {
                updateFormData({
                    [name]: value,
                    deliveryMethod: "pickup"
                });
            } else {
                updateFormData({ [name]: value });
            }
        } else {
            updateFormData({ [name]: value });
        }
    }, [updateFormData]);

    // Step handlers - SIMPLIFIED
    const handleContinueToReview = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        console.log("➡️ Continue to Review clicked");

        // Simple validation - you can make this more robust
        const isValid = formData.firstName && formData.email && formData.phone;

        if (isValid) {
            console.log("✅ Validation passed - moving to review");
            setCurrentStep("review");
        } else {
            console.log("❌ Validation failed - please fill required fields");
            // You can set errors here if needed
        }
    }, [formData]);

    const handleBackToInfo = useCallback(() => {
        console.log("⬅️ Back to Info clicked");
        setCurrentStep("info");
    }, []);

    // Debug step changes
    useEffect(() => {
        console.log("📍 Current step:", currentStep);
    }, [currentStep]);

    useEffect(() => {
        if (!user) return;
        (async () => {
            const { data } = await supabase
                .from("client_profiles")
                .select("*")
                .eq("firebase_uid", user.id)
                .single();

            if (data) {
                updateFormData({
                    firstName: data.full_name || formData.firstName,
                    email: data.email || formData.email,
                    phone: data.phone || formData.phone,
                    address: data.address || formData.address,
                    city: data.city || formData.city,
                    zipCode: data.zip_code || formData.zipCode,
                });
            }
        })();
    }, [user]);


    // OrderSummary props only
    const orderSummaryProps = useMemo(() => ({
        cart: safeCart,
        cartTotal: subtotal,
        itemCount,
        gst,
        qst,
        deliveryFee: deliveryInfo.fee,
        finalTotal,
    }), [safeCart, subtotal, itemCount, gst, qst, deliveryInfo.fee, finalTotal]);

    // ---------- Profile update before payment ----------
    const updateClientProfile = async (): Promise<boolean> => {
        if (!user) return false;
        try {
            const fullName = `${formData.firstName}`.trim();
            const { error } = await supabase
                .from("client_profiles")
                .update({
                    full_name: fullName,
                    email: formData.email,
                    phone: formData.phone,
                    address: formData.address,
                    city: formData.city,
                    zip_code: formData.zipCode,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", user.id);
            if (error) throw error;
            return true;
        } catch {
            return false;
        }
    };

    // ---------- Image extraction ----------
    const collectValidImageUrls = useCallback((item: CartItemCheckOut): string[] => {
        const out: string[] = [];
        const add = (url: any) => {
            if (typeof url !== "string") return;
            const u = url.trim();
            if (!u) return;
            try {
                new URL(u);
                const isImg = /\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?.*)?$/i.test(u) ||
                    u.includes("cloudinary") || u.includes("firebase") || u.includes("storage.googleapis.com");
                if (isImg && !out.includes(u)) out.push(u);
            } catch { }
        };
        [item.image, item.imageUrl, item.thumbnail, item.mainImage, item.photo, item.img, item.picture].forEach(add);
        (item.images || []).forEach(add);
        (item.imageUrls || []).forEach(add);
        return out;
    }, []);

    const handleCardPayment = async () => {
        setIsProcessing(true);
        try {
            if (!validate(formData, deliveryInfo)) return;
            if (!safeCart.length) throw new Error("Your cart is empty.");

            const cartItems = safeCart.map((it, idx) => {
                if (!it.name?.trim()) throw new Error(`Item ${idx + 1} is missing a name`);
                if (typeof it.price !== "number" || it.price < 0) throw new Error(`Item "${it.name}" has an invalid price`);
                if (it.quantity && (it.quantity < 1 || !Number.isInteger(it.quantity))) {
                    throw new Error(`Item "${it.name}" has an invalid quantity`);
                }
                const imgs = collectValidImageUrls(it);
                const base: any = {
                    productId: it.id || `item-${idx}-${Date.now()}`,
                    name: it.name.trim(),
                    price: Number(it.price),
                    quantity: it.quantity || 1,
                    ...(it.description && { description: it.description.substring(0, 495) }),
                    ...(it.category && { category: it.category }),
                };
                if (imgs.length) {
                    base.image = imgs[0];
                    base.imageUrls = imgs.slice(0, 8);
                }
                return base;
            });

            const customerInfo = {
                name: `${formData.firstName} `.trim(),
                email: formData.email?.trim() || "",
                phone: formData.phone?.trim() || "",
                address: formData.deliveryMethod === "delivery" ? formData.address?.trim() || "" : "Pickup",
                city:
                    formData.deliveryMethod === "delivery"
                        ? `${formData.city}${formData.area ? ` (${formData.area})` : ""}`
                        : "Pickup",
                zipCode: formData.deliveryMethod === "delivery" ? formData.zipCode?.trim() || "" : "",
                deliveryInstructions: formData.deliveryInstructions?.trim() || "",
                province: "QC",
                deliveryMethod: formData.deliveryMethod,
            };

            if (user) {
                await updateClientProfile();
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const body: any = {
                cartItems,
                customerInfo,
                totals: { subtotal, gst, qst, deliveryFee: deliveryInfo.fee, finalTotal },
                userId: user?.id || `guest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                clientUrl: window.location.origin,
            };
            if (user) {
                body.pointsInfo = { userId: user.id, pointsEarned, currentBalance: user.points };
            }

            const res = await fetch(
                "https://us-central1-sushi-admin.cloudfunctions.net/createCheckoutHTTP",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                    signal: controller.signal,
                }
            );
            clearTimeout(timeoutId);

            if (!res.ok) {
                let msg = `Payment failed: ${res.status}`;
                try {
                    const j = await res.json();
                    msg = j?.details || j?.error || msg;
                } catch { }
                throw new Error(msg);
            }
            const result = await res.json();

            if (result.success && result.url) {
                if (user) {
                    sessionStorage.setItem(
                        "pendingPointsOrder",
                        JSON.stringify({
                            userId: user.id,
                            orderId: result.orderId || `order-${Date.now()}`,
                            pointsEarned,
                            cartTotal: subtotal,
                        })
                    );
                }
                sessionStorage.setItem(
                    "pendingCheckout",
                    JSON.stringify({
                        cartItems,
                        customerInfo,
                        totals: { subtotal, gst, qst, deliveryFee: deliveryInfo.fee, finalTotal },
                        timestamp: Date.now(),
                    })
                );
                window.location.href = result.url;
            } else {
                throw new Error(result.error || "Checkout session creation failed");
            }
        } catch (err: any) {
            alert(err?.message || "Payment processing failed. Please try again.");
            setIsProcessing(false);
        }
    };

    // Empty cart
    if (safeCart.length === 0 && !orderComplete) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="container mx-auto px-6 text-center">
                    <div className="max-w-md mx-auto">
                        <svg className="w-16 h-16 text-white/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h2 className="text-2xl font-light text-white mb-3 tracking-wide">{t("checkoutPage.emptyCart", "Your cart is empty")}</h2>
                        <p className="text-white/60 mb-6 font-light tracking-wide text-sm">{t("checkoutPage.emptyCartDescription", "Add some delicious sushi to get started!")}</p>
                        <Link to="/order" className="border border-white text-white px-6 py-3 rounded-sm hover:bg-white hover:text-gray-900 transition-all text-sm">
                            {t("checkoutPage.browseMenu", "Browse Menu")}
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
                            <h2 className="text-2xl font-light text-white mb-3 tracking-wide">
                                {t("checkoutPage.paymentSuccessful", "Payment Successful!")}
                            </h2>

                            {user && pointsEarned > 0 && (
                                <div className="bg-green-500/10 border border-green-500/20 rounded-sm p-4 mb-4">
                                    <p className="text-green-400 text-sm font-light">🎉 You earned <strong>{pointsEarned} points</strong>!</p>
                                    <p className="text-green-400/60 text-xs mt-1">They'll appear in your profile shortly.</p>
                                </div>
                            )}

                            <div className="bg-white/5 rounded-sm p-4 mb-6 border border-white/10">
                                <p className="text-xs text-white/40 font-light tracking-wide mb-1">{t("checkoutPage.orderNumber", "Order Number")}</p>
                                <p className="text-lg font-light text-white font-mono">{orderNumber}</p>
                            </div>

                            <p className="text-white/60 mb-6 font-light tracking-wide leading-relaxed text-sm">
                                {formData.deliveryMethod === "delivery"
                                    ? t("checkoutPage.cashPaymentMessage", "We've received your order. Your sushi will be ready in approximately 20-30 minutes.")
                                    : "Your pickup order will be ready in approximately 20-30 minutes."}
                            </p>

                            <div className="flex flex-col gap-3">
                                <Link to="/order" className="border border-white text-white px-4 py-3 rounded-sm hover:bg-white hover:text-gray-900 transition-all text-sm">
                                    {t("checkoutPage.orderAgain", "Order Again")}
                                </Link>
                                <button onClick={() => navigate("/")} className="bg-white/5 border border-white/10 text-white px-4 py-3 rounded-sm hover:bg-white/10 transition-all text-sm">
                                    {t("checkoutPage.backHome", "Back to Home")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Banner
    const banner =
        formData.deliveryMethod === "delivery" && !deliveryInfo.allowed ? (
            <div className="bg-[#E62B2B]/10 border border-[#E62B2B]/30 text-[#ffb3b3] text-sm p-3 rounded-sm mb-4">
                {deliveryInfo.reason} — we switched to <strong>Pickup</strong> to continue.
            </div>
        ) : formData.city === "Magog" && formData.deliveryMethod === "delivery" ? (
            <div className="bg-white/5 border border-white/10 text-white/80 text-sm p-3 rounded-sm mb-4">
                Magog delivery minimum: <strong>$100</strong>. Free delivery from <strong>$150</strong>.
            </div>
        ) : formData.city === "Sherbrooke" && formData.deliveryMethod === "delivery" ? (
            <div className="bg-white/5 border border-white/10 text-white/80 text-sm p-3 rounded-sm mb-4">
                Sherbrooke delivery free from <strong>$25</strong>. Current fee:{" "}
                <strong>{deliveryInfo.fee > 0 ? `$${deliveryInfo.fee.toFixed(2)}` : t("common.free", "Free")}</strong>
            </div>
        ) : null;

    return (
        <div className="min-h-screen bg-gray-900">
            {showAuthModal && (
                <AuthModal
                    isLoginMode={isLoginMode}
                    setIsLoginMode={setIsLoginMode}
                    authForm={authForm}
                    setAuthForm={setAuthForm}
                    handleLogin={handleLogin}
                    handleSignup={handleSignup}
                    isAuthLoading={isAuthLoading}
                    authError={authError}
                    setAuthError={setAuthError}
                    setShowAuthModal={setShowAuthModal}
                />
            )}

            <div className="container mx-auto px-4 py-8">
                <div className="max-w-7xl mx-auto">
                    <header className="mb-6">
                        <Link
                            to="/order"
                            className="inline-flex items-center text-white/60 hover:text-white transition-colors mb-3 text-sm"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                            </svg>
                            {t("checkoutPage.backMenu", "Back to Menu")}
                        </Link>

                        <div className="flex justify-between items-center mb-3">
                            <h1 className="text-2xl font-light text-white tracking-wide">
                                {t("checkoutPage.checkout", "Checkout")}
                            </h1>

                            {isLoadingUser ? (
                                <div className="text-white/40 text-sm">Loading...</div>
                            ) : user ? (
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-white text-sm">Hello, {user.first_name}</p>
                                        <p className="text-white/60 text-xs">{user.points} points</p>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="text-white/60 hover:text-white text-sm border border-white/20 px-3 py-1 rounded-sm"
                                        type="button"
                                    >
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => openAuthModal("login")}
                                    className="text-white/60 hover:text-white text-sm border border-white/20 px-3 py-1 rounded-sm"
                                    type="button"
                                >
                                    {t("header.signIn", "Sign In")}
                                </button>
                            )}
                        </div>

                        {user && pointsEarned > 0 && (
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-sm p-3 mb-3">
                                <p className="text-blue-400 text-sm text-center">
                                    🎉 You'll earn <strong>{pointsEarned} points</strong> with this order!
                                </p>
                            </div>
                        )}

                        {banner}
                    </header>

                    {/* SIMPLIFIED FORM - NO MEMOIZED PROPS */}
                    <form onSubmit={handleContinueToReview}>
                        {/* Mobile */}
                        <div className="block lg:hidden space-y-6">
                            {currentStep === "info" ? (
                                <>
                                    {/* ✅ DIRECT PROPS - NO MEMOIZATION */}
                                    <CustomerInformation
                                        formData={formData}
                                        onInputChange={onInputChange}
                                        errors={errors}
                                        t={((key: string, def?: string) => t(key, { defaultValue: def }))}
                                    />
                                    <OrderSummary {...orderSummaryProps} />
                                    <div className="sticky bottom-0 bg-black/80 backdrop-blur-xl border-t border-white/10 pt-4 pb-4 -mx-4 px-4 mt-6">
                                        <button
                                            type="submit"
                                            className="bg-[#E62B2B] text-white px-8 py-4 rounded-xl hover:bg-[#ff4444] transition-all duration-300 font-light tracking-wide text-sm w-full shadow-lg shadow-[#E62B2B]/20"
                                        >
                                            {t("checkoutPage.continueReview", "Continue to Review")}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <OrderSummary {...orderSummaryProps} />
                                    <div className="bg-white/5 border border-white/10 rounded-sm p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-light text-white tracking-wide">
                                                {t("checkoutPage.deliveryInfo", "Delivery Information")}
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={handleBackToInfo}
                                                className="text-white/60 hover:text-white text-sm"
                                            >
                                                {t("checkoutPage.edit", "Edit")}
                                            </button>
                                        </div>
                                        <div className="text-white/80 font-light text-sm space-y-2">
                                            <p>{formData.firstName}</p>
                                            <p>{formData.email}</p>
                                            <p>{formData.phone}</p>
                                            {formData.deliveryMethod === "pickup" ? (
                                                <p>Pickup — Sherbrooke, QC</p>
                                            ) : (
                                                <>
                                                    <p>
                                                        {formData.address}
                                                        {formData.city ? `, ${formData.city}` : ""}{formData.area ? ` (${formData.area})` : ""}, QC {formData.zipCode}
                                                    </p>
                                                    {formData.deliveryInstructions && (
                                                        <p className="text-white/60">
                                                            {t("checkoutPage.instructions", "Instructions")}: {formData.deliveryInstructions}
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="sticky bottom-0 bg-gray-900 border-t border-white/10 pt-4 pb-4 -mx-4 px-4">
                                        <PaymentMethodSelector
                                            paymentMethod={"card"}
                                            onPaymentMethodChange={() => { }}
                                            finalTotal={finalTotal}
                                            isProcessing={isProcessing}
                                            onPlaceOrder={async () => {
                                                // Use your validation function here
                                                if (validate(formData, deliveryInfo)) {
                                                    await handleCardPayment();
                                                }
                                            }}
                                            onBack={handleBackToInfo}
                                        />

                                    </div>
                                </>
                            )}
                        </div>

                        {/* Desktop */}
                        <div className="hidden lg:grid grid-cols-1 xl:grid-cols-4 gap-8">
                            <div className="xl:col-span-3 space-y-6">
                                {currentStep === "info" ? (
                                    <>
                                        {/* ✅ DIRECT PROPS - NO MEMOIZATION */}
                                        <CustomerInformation
                                            formData={formData}
                                            onInputChange={onInputChange}
                                            errors={errors}
                                            t={((key: string, def?: string) => t(key, { defaultValue: def }))}
                                        />
                                        <div className="flex justify-end pt-2">
                                            <button
                                                type="submit"
                                                className="bg-white text-gray-900 px-8 py-3 rounded-sm hover:bg-white/90 transition-all text-sm"
                                            >
                                                {t("checkoutPage.continueReview", "Continue to Review")}
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="bg-white/5 border border-white/10 rounded-sm p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-light text-white tracking-wide">
                                                    {t("checkoutPage.deliveryInfo", "Delivery Information")}
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={handleBackToInfo}
                                                    className="text-white/60 hover:text-white text-sm"
                                                >
                                                    {t("checkoutPage.edit", "Edit")}
                                                </button>
                                            </div>
                                            <div className="text-white/80 font-light text-sm space-y-2">
                                                <p>{formData.firstName}</p>
                                                <p>{formData.email}</p>
                                                <p>{formData.phone}</p>
                                                {formData.deliveryMethod === "pickup" ? (
                                                    <p>Pickup — Sherbrooke, QC</p>
                                                ) : (
                                                    <>
                                                        <p>
                                                            {formData.address}
                                                            {formData.city ? `, ${formData.city}` : ""}{formData.area ? ` (${formData.area})` : ""}, QC {formData.zipCode}
                                                        </p>
                                                        {formData.deliveryInstructions && (
                                                            <p className="text-white/60">
                                                                {t("checkoutPage.instructions", "Instructions")}: {formData.deliveryInstructions}
                                                            </p>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <PaymentMethodSelector
                                            paymentMethod={"card"}
                                            onPaymentMethodChange={() => { }}
                                            finalTotal={finalTotal}
                                            isProcessing={isProcessing}
                                            onPlaceOrder={async () => {
                                                if (validate(formData, deliveryInfo)) {
                                                    await handleCardPayment();
                                                }
                                            }}
                                            onBack={handleBackToInfo}
                                        />


                                    </>
                                )}
                            </div>

                            <div className="xl:col-span-1">
                                <div className="min-w-80">
                                    <OrderSummary {...orderSummaryProps} />
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