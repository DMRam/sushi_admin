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
            <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
                <div className="container mx-auto px-6 text-center">
                    <div className="max-w-md mx-auto border border-white/10 bg-[#0b0b0b] p-8 shadow-2xl shadow-black/40">
                        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#f26350]">
                            Mai Sushi
                        </p>

                        <h2 className="text-3xl font-light text-white mb-3 tracking-wide">
                            {t("checkoutPage.emptyCart", "Your cart is empty")}
                        </h2>

                        <p className="text-white/60 mb-6 font-light tracking-wide text-sm">
                            {t("checkoutPage.emptyCartDescription", "Add some delicious sushi to get started!")}
                        </p>

                        <Link
                            to="/order"
                            className="inline-flex items-center justify-center bg-[#f26350] px-7 py-4 text-[12px] font-extrabold uppercase tracking-[0.1em] text-white shadow-lg shadow-[#f26350]/25 transition-all hover:bg-[#ff725f]"
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
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="container mx-auto px-6">
                    <div className="max-w-md mx-auto text-center border border-white/10 bg-[#0b0b0b] p-8 shadow-2xl shadow-black/40">
                        <div className="text-white">Order complete: {orderNumber}</div>

                        <button
                            onClick={() => navigate("/")}
                            className="mt-4 bg-[#f26350] text-white px-6 py-3 text-[12px] font-extrabold uppercase tracking-[0.1em]"
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
            <div className="bg-[#f26350]/10 border border-[#f26350]/30 text-[#ffb3b3] text-sm p-3 mb-4">
                {deliveryInfo.reason} — we switched to <strong>Pickup</strong> to continue.
            </div>
        ) : null;

    return (
        <div className="min-h-screen bg-[#050505] text-white">
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

            <div className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
                <div className="mx-auto">
                    <div className="mb-6 border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(242,99,80,0.18),transparent_34%),linear-gradient(135deg,#101010,#050505)] px-5 py-5 shadow-2xl shadow-black/30 sm:px-7 lg:px-8">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-3xl">
                                <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-[#f26350]">
                                    {t("checkoutPage.secureCheckoutEyebrow", "Secure checkout")}
                                </p>

                                <h1 className="mt-3 text-3xl font-light tracking-wide text-white sm:text-4xl lg:text-5xl">
                                    {currentStep === "info"
                                        ? t("checkoutPage.completeOrderTitle", "Complete your order")
                                        : t("checkoutPage.reviewPaymentTitle", "Review and pay")}
                                </h1>

                                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
                                    {t(
                                        "checkoutPage.checkoutPromise",
                                        "Freshly prepared in Sherbrooke, secure card payment, and a fast pickup flow built for dinner decisions."
                                    )}
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[420px]">
                                <div className="border border-white/10 bg-black/20 px-3 py-3">
                                    <div className="text-lg font-semibold text-white">{itemCount}</div>
                                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                                        {itemCount === 1 ? t("common.item", "Item") : t("common.items", "Items")}
                                    </div>
                                </div>

                                <div className="border border-white/10 bg-black/20 px-3 py-3">
                                    <div className="text-lg font-semibold text-[#f26350]">${finalTotal.toFixed(2)}</div>
                                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                                        {t("common.total", "Total")}
                                    </div>
                                </div>

                                <div className="border border-white/10 bg-black/20 px-3 py-3">
                                    <div className="text-lg font-semibold text-white">{estimatedPrepTime}m</div>
                                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                                        {t("checkoutPage.estimated", "Estimate")}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

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
                        <div className="mb-6 border border-yellow-500/30 bg-yellow-500/10 p-4">
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
