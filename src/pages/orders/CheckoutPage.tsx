import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type { CustomerFormData } from "./CustomerInformation";
import { useCartStore } from "../../stores/cartStore";
import { supabase } from "../../lib/supabase";
import { AuthModal } from "../components/AuthModal";
import { LandingCTAFooter } from "../landing/components/LandingCTAFooter";

import { useCheckoutForm } from "./hooks/useCheckoutForm";
import { useCheckoutValidation, useDeliveryInfo } from "./hooks/useCheckoutCalculations";
import { useUserAuth } from "./hooks/useUserAuth";
import { useCheckoutDiscount } from "./hooks/useCheckoutDiscount";
import { useCloverCheckout } from "./hooks/useCloverCheckout";

import CheckoutHeader from "./components/CheckoutHeader";
import CheckoutSteps from "./components/CheckoutSteps";
import CheckoutMobileLayout from "./components/CheckoutMobileLayout";
import CheckoutDesktopLayout from "./components/CheckoutDesktopLayout";

import { GST_RATE, QST_RATE } from "./utils/checkoutConstants";
import { roundMoney } from "./utils/checkoutMoney";
import { getStoreStatus } from "./utils/checkIsOpen";

export interface CartItemCheckOut {
    id?: string;
    name: string;
    price: number;
    quantity?: number;
    description: { es: string; fr: string; en: string } | string;
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
    preparationTime?: number;
}

export default function CheckoutPage() {
    const { isOpen, nextOpening } = getStoreStatus();
    const cart = useCartStore((s) => s.cart);
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();

    const { formData, updateFormData } = useCheckoutForm();
    const { errors, validate } = useCheckoutValidation();

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
        setShowAuthModal,
    } = useUserAuth();

    const [isProcessing, setIsProcessing] = useState(false);
    const [orderComplete] = useState(false);
    const [orderNumber] = useState("");
    const [currentStep, setCurrentStep] = useState<"info" | "review">("info");

    const { safeCart, itemCount, subtotal } = useMemo(() => {
        const safeCart: CartItemCheckOut[] = Array.isArray(cart)
            ? cart.filter((item) => (item.quantity || 0) > 0)
            : [];

        const itemCount = safeCart.reduce((sum, item) => sum + (item.quantity || 0), 0);

        const subtotal = safeCart.reduce(
            (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
            0
        );

        return {
            safeCart,
            itemCount,
            subtotal: roundMoney(subtotal),
        };
    }, [cart]);

    const deliveryInfo = useDeliveryInfo(formData, subtotal);

    const discount = useCheckoutDiscount({
        subtotal,
        deliveryMethod: formData.deliveryMethod || "pickup",
    });

    const gst = useMemo(
        () => roundMoney(discount.discountedSubtotal * GST_RATE),
        [discount.discountedSubtotal]
    );

    const qst = useMemo(
        () => roundMoney(discount.discountedSubtotal * QST_RATE),
        [discount.discountedSubtotal]
    );

    const finalTotal = useMemo(
        () => roundMoney(discount.discountedSubtotal + gst + qst + deliveryInfo.fee),
        [discount.discountedSubtotal, gst, qst, deliveryInfo.fee]
    );

    const pointsEarned = Math.floor(discount.discountedSubtotal);

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
    }, [user, updateFormData]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!user) return;

        (async () => {
            const { data } = await supabase
                .from("client_profiles")
                .select("*")
                .eq("firebase_uid", user.id)
                .single();

            if (!data) return;

            updateFormData({
                firstName: data.full_name || formData.firstName,
                email: data.email || formData.email,
                phone: data.phone || formData.phone,
                address: data.address || formData.address,
                city: data.city || formData.city,
                zipCode: data.zip_code || formData.zipCode,
            });
        })();
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    useEffect(() => {
        window.fbq?.('track', 'InitiateCheckout')
    }, [])

    const getLocalizedDescription = useCallback(
        (description: { es: string; fr: string; en: string } | string) => {
            if (typeof description === "string") return description;

            switch (i18n.language) {
                case "es":
                    return description.es;
                case "fr":
                    return description.fr;
                default:
                    return description.en;
            }
        },
        [i18n.language]
    );

    const onInputChange = useCallback(
        (e: any) => {
            const { name, value } = e.target as {
                name: keyof CustomerFormData;
                value: string;
            };

            if (name === "city" && value === "Other") {
                updateFormData({
                    [name]: value,
                    ...(formData.deliveryMethod === "delivery" ? { deliveryMethod: "pickup" } : {}),
                });
                return;
            }

            updateFormData({ [name]: value });
        },
        [updateFormData, formData.deliveryMethod]
    );

    const handleContinueToReview = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();

            const isValid =
                formData.firstName?.trim() &&
                formData.email?.trim() &&
                formData.phone?.trim() &&
                (formData.deliveryMethod === "pickup" ||
                    (formData.deliveryMethod === "delivery" &&
                        formData.address?.trim() &&
                        formData.city?.trim()));

            if (isValid) {
                setCurrentStep("review");
            }

            window.scrollTo({ top: 0, behavior: "smooth" });
        },
        [formData]
    );

    const handleBackToInfo = useCallback(() => {
        setCurrentStep("info");
    }, []);

    const updateClientProfile = useCallback(async (): Promise<void> => {
        if (!user) return;

        await supabase
            .from("client_profiles")
            .update({
                full_name: `${formData.firstName}`.trim(),
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                city: formData.city,
                zip_code: formData.zipCode,
                updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);
    }, [user, formData]);

    const estimatedPrepTime = useMemo(() => {
        const baseTime = 15;
        const itemTime = safeCart.reduce(
            (time, item) => time + (item.preparationTime || 0) * (item.quantity || 1),
            0
        );

        return Math.min(baseTime + itemTime, 45);
    }, [safeCart]);

    const orderSummaryProps = useMemo(
        () => ({
            cart: safeCart,
            cartTotal: discount.discountedSubtotal,
            itemCount,
            gst,
            qst,
            deliveryFee: deliveryInfo.fee,
            finalTotal,
        }),
        [safeCart, discount.discountedSubtotal, itemCount, gst, qst, deliveryInfo.fee, finalTotal]
    );

    const promoProps = useMemo(
        () => ({
            discountCode: discount.discountCode,
            setDiscountCode: discount.setDiscountCode,
            appliedCode: discount.appliedCode,
            discountAmount: discount.discountAmount,
            discountMessage: discount.discountMessage,
            discountError: discount.discountError,
            subtotal,
            discountedSubtotal: discount.discountedSubtotal,
            applyDiscount: discount.applyDiscount,
            removeDiscount: discount.removeDiscount,
            isApplyingDiscount: discount.isApplyingDiscount,
            t: (key: string, fallback?: string) => t(key, { defaultValue: fallback }),
        }),
        [discount, subtotal, t]
    );

    const handleCardPayment = useCloverCheckout({
        validate,
        formData,
        deliveryInfo,
        safeCart,
        subtotal,
        gst,
        qst,
        finalTotal,
        discountedSubtotal: discount.discountedSubtotal,
        discountAmount: discount.discountAmount,
        appliedCode: discount.appliedCode,
        pointsEarned,
        user,
        updateClientProfile,
        getLocalizedDescription,
        setIsProcessing,
    });

    if (safeCart.length === 0 && !orderComplete) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="container mx-auto px-6 text-center">
                    <div className="max-w-md mx-auto">
                        <h2 className="text-2xl font-light text-white mb-3 tracking-wide">
                            {t("checkoutPage.emptyCart", "Your cart is empty")}
                        </h2>

                        <p className="text-white/60 mb-6 font-light tracking-wide text-sm">
                            {t("checkoutPage.emptyCartDescription", "Add some delicious sushi to get started!")}
                        </p>

                        <Link
                            to="/order"
                            className="border border-white text-white px-6 py-3 rounded-sm hover:bg-white hover:text-gray-900 transition-all text-sm"
                        >
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
                        <div className="text-white">Order complete: {orderNumber}</div>

                        <button
                            onClick={() => navigate("/")}
                            className="mt-4 bg-white text-gray-900 px-4 py-2 rounded-sm"
                        >
                            {t("checkoutPage.backHome", "Back to Home")}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const deliveryBanner =
        formData.deliveryMethod === "delivery" && !deliveryInfo.allowed ? (
            <div className="bg-[#E62B2B]/10 border border-[#E62B2B]/30 text-[#ffb3b3] text-sm p-3 rounded-sm mb-4">
                {deliveryInfo.reason} — we switched to <strong>Pickup</strong> to continue.
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
                    <CheckoutHeader
                        user={user}
                        isLoadingUser={isLoadingUser}
                        onLogout={handleLogout}
                        onLoginClick={() => openAuthModal("login")}
                        banner={deliveryBanner}
                        t={(key: string, fallback?: string) => t(key, { defaultValue: fallback })}
                    />

                    <CheckoutSteps
                        currentStep={currentStep}
                        t={(key: string, fallback?: string) => t(key, { defaultValue: fallback })}
                    />

                    {!isOpen && nextOpening && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded mb-6">
                            <p className="text-yellow-300 text-sm text-center">
                                {t("checkoutPage.closedNow")}
                                <br />
                                {t("checkoutPage.ordersPreparedAt", {
                                    time: nextOpening.toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    }),
                                })}
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleContinueToReview}>
                        <CheckoutMobileLayout
                            currentStep={currentStep}
                            formData={formData}
                            onInputChange={onInputChange}
                            errors={errors}
                            t={(key: string, fallback?: string) => t(key, { defaultValue: fallback })}
                            orderSummaryProps={orderSummaryProps}
                            promoProps={promoProps}
                            handleBackToInfo={handleBackToInfo}
                            estimatedPrepTime={estimatedPrepTime}
                            finalTotal={finalTotal}
                            isProcessing={isProcessing}
                            handleCardPayment={handleCardPayment}
                        />

                        <CheckoutDesktopLayout
                            currentStep={currentStep}
                            formData={formData}
                            onInputChange={onInputChange}
                            errors={errors}
                            t={(key: string, fallback?: string) => t(key, { defaultValue: fallback })}
                            orderSummaryProps={orderSummaryProps}
                            promoProps={promoProps}
                            finalTotal={finalTotal}
                            isProcessing={isProcessing}
                            handleCardPayment={handleCardPayment}
                            handleBackToInfo={handleBackToInfo}
                            discountAmount={discount.discountAmount}
                            appliedCode={discount.appliedCode}
                        />
                    </form>
                </div>
            </div>

            <LandingCTAFooter displaySimple={true} />
        </div>
    );
}