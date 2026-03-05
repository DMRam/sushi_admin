import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Clock, MapPin, Phone, Mail, User, ChefHat, Sparkles } from "lucide-react";

import PaymentMethodSelector from "./PaymentMethodSelector";
import type { CustomerFormData } from "../orders/CustomerInformation";
import CustomerInformation from "../orders/CustomerInformation";
import { useCartStore } from "../../stores/cartStore";
import { supabase } from "../../lib/supabase";
import { AuthModal } from "../components/AuthModal";
import OrderSummary from "../../components/web/OrderSummary";
import { LandingCTAFooter } from "../landing/components/LandingCTAFooter";

import { useCheckoutForm } from "./hooks/useCheckoutForm";
import { useCheckoutTotals, useCheckoutValidation, useDeliveryInfo } from "./hooks/useCheckoutCalculations";
import { useUserAuth } from "./hooks/useUserAuth";

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

// interface CheckoutResponse {
//     success: boolean;
//     url?: string;
//     orderId?: string;
//     error?: string;
//     details?: any;
//     userMessage?: string;
//     requestId?: string;
// }

// function getCheckoutHttpUrl(): string {
//     const explicit = (import.meta as any)?.env?.VITE_CHECKOUT_HTTP_URL as string | undefined;
//     if (explicit) return explicit;

//     // opcional fallback si tienes project id en env
//     const projectId = (import.meta as any)?.env?.VITE_FIREBASE_PROJECT_ID as string | undefined;
//     if (projectId) return `https://us-central1-${projectId}.cloudfunctions.net/createCheckoutHTTP`;

//     throw new Error("Missing checkout function URL. Set VITE_CHECKOUT_HTTP_URL.");
// }

// function getCloverCheckoutHttpUrl(): string {
//     const explicit = (import.meta as any)?.env?.VITE_CLOVER_CHECKOUT_HTTP_URL as string | undefined;
//     if (explicit) return explicit;

//     const projectId = (import.meta as any)?.env?.VITE_FIREBASE_PROJECT_ID as string | undefined;
//     if (projectId) return `https://us-central1-${projectId}.cloudfunctions.net/cloverCreateHostedCheckout`;

//     throw new Error("Missing Clover checkout function URL. Set VITE_CLOVER_CHECKOUT_HTTP_URL.");
// }



export default function CheckoutPage() {
    const cart = useCartStore((s) => s.cart);
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();

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
        setShowAuthModal,
    } = useUserAuth();

    const { errors, validate } = useCheckoutValidation();

    const [isProcessing, setIsProcessing] = useState(false);
    const [orderComplete] = useState(false);
    const [orderNumber] = useState("");
    const [currentStep, setCurrentStep] = useState<"info" | "review">("info");

    // hydrate form from auth user
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

    const { safeCart, itemCount, subtotal } = useMemo(() => {
        const safeCart: CartItemCheckOut[] = Array.isArray(cart) ? cart.filter((i) => (i.quantity || 0) > 0) : [];
        const itemCount = safeCart.reduce((sum, i) => sum + (i.quantity || 0), 0);
        const subtotal = safeCart.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0);
        return { safeCart, itemCount, subtotal };
    }, [cart]);

    const deliveryInfo = useDeliveryInfo(formData, subtotal);
    const { gst, qst, finalTotal } = useCheckoutTotals(subtotal, deliveryInfo.fee);

    const pointsEarned = Math.floor(subtotal);

    // type CloverCheckoutResponse = {
    //     checkoutUrl: string;
    //     checkoutSessionId?: string;
    //     expirationTime?: string;
    //     error?: string;
    //     status?: number;
    //     data?: any;
    // };

    // const createCloverCheckoutHttp = useCallback(async (payload: any): Promise<CloverCheckoutResponse> => {
    //     const url = getCloverCheckoutHttpUrl();

    //     const resp = await fetch(url, {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: JSON.stringify(payload),
    //     });

    //     const json = (await resp.json().catch(() => ({}))) as any;

    //     if (!resp.ok) {
    //         const msg = json?.error || `Clover checkout failed (HTTP ${resp.status})`;
    //         throw new Error(msg);
    //     }

    //     if (!json.checkoutUrl) throw new Error("Clover did not return checkoutUrl");
    //     return json as CloverCheckoutResponse;
    // }, []);

    const estimatedPrepTime = useMemo(() => {
        const baseTime = 15;
        const itemTime = safeCart.reduce((time, item) => time + (item.preparationTime || 0) * (item.quantity || 1), 0);
        return Math.min(baseTime + itemTime, 45);
    }, [safeCart]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    const onInputChange = useCallback(
        (e: any) => {
            const { name, value } = e.target as { name: keyof CustomerFormData; value: string };

            if (name === "city" && value === "Other") {
                if (formData.deliveryMethod === "delivery") {
                    updateFormData({ [name]: value, deliveryMethod: "pickup" });
                } else {
                    updateFormData({ [name]: value });
                }
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
                    (formData.deliveryMethod === "delivery" && formData.address?.trim() && formData.city?.trim()));

            if (isValid) setCurrentStep("review");
            else window.scrollTo({ top: 0, behavior: "smooth" });
        },
        [formData]
    );

    const handleBackToInfo = useCallback(() => setCurrentStep("info"), []);

    // hydrate from supabase profile
    useEffect(() => {
        if (!user) return;

        (async () => {
            const { data } = await supabase.from("client_profiles").select("*").eq("firebase_uid", user.id).single();
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

    const orderSummaryProps = useMemo(
        () => ({
            cart: safeCart,
            cartTotal: subtotal,
            itemCount,
            gst,
            qst,
            deliveryFee: deliveryInfo.fee,
            finalTotal,
        }),
        [safeCart, subtotal, itemCount, gst, qst, deliveryInfo.fee, finalTotal]
    );

    const updateClientProfile = useCallback(async (): Promise<void> => {
        if (!user) return;

        const fullName = `${formData.firstName}`.trim();
        await supabase
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
    }, [user, formData]);

    // const collectValidImageUrls = useCallback((item: CartItemCheckOut): string[] => {
    //     const out: string[] = [];
    //     const add = (url: any) => {
    //         if (typeof url !== "string") return;
    //         const u = url.trim();
    //         if (!u) return;
    //         try {
    //             new URL(u);
    //             const isImg =
    //                 /\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?.*)?$/i.test(u) ||
    //                 u.includes("cloudinary") ||
    //                 u.includes("firebase") ||
    //                 u.includes("storage.googleapis.com");
    //             if (isImg && !out.includes(u)) out.push(u);
    //         } catch { }
    //     };

    //     [item.image, item.imageUrl, item.thumbnail, item.mainImage, item.photo, item.img, item.picture].forEach(add);
    //     (item.images || []).forEach(add);
    //     (item.imageUrls || []).forEach(add);
    //     return out;
    // }, []);

    // const createCheckoutHttp = useCallback(async (payload: any): Promise<CheckoutResponse> => {
    //     const url = getCheckoutHttpUrl();

    //     const resp = await fetch(url, {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: JSON.stringify(payload),
    //     });

    //     const json = (await resp.json().catch(() => ({}))) as any;

    //     // backend compat: if it returns {data:{...}} unwrap it
    //     const data: CheckoutResponse = json?.data ? json.data : json;

    //     if (!resp.ok) {
    //         const msg = data.userMessage || data.error || `Checkout failed (HTTP ${resp.status})`;
    //         throw new Error(msg);
    //     }

    //     return data;
    // }, []);

    const handleCardPayment = useCallback(async () => {
        setIsProcessing(true);

        try {
            if (!validate(formData, deliveryInfo)) {
                throw new Error("Please complete the required fields.");
            }
            if (!safeCart.length) {
                throw new Error("Your cart is empty.");
            }

            // Subtotal BASE (sin impuestos), desde el carrito
            const calculatedSubtotal = safeCart.reduce((sum, it) => {
                const qty = Number.isFinite(it.quantity) ? Number(it.quantity) : 1;
                return sum + (it.price * qty);
            }, 0);

            if (Math.abs(calculatedSubtotal - subtotal) > 0.01) {
                console.warn("Subtotal mismatch:", { calculated: calculatedSubtotal, passed: subtotal });
            }

            // ✅ ENVIAR A CLOVER: precios BASE (sin taxes)
            const items = safeCart.map((it, idx) => {
                if (!it.name?.trim()) throw new Error(`Item ${idx + 1} is missing a name`);
                if (typeof it.price !== "number" || it.price < 0) {
                    throw new Error(`Item "${it.name}" has an invalid price`);
                }

                const quantity = Number.isFinite(it.quantity) ? Number(it.quantity) : 1;
                if (quantity < 1 || !Number.isInteger(quantity)) {
                    throw new Error(`Item "${it.name}" has an invalid quantity`);
                }

                const note = getLocalizedDescription(it.description)?.substring(0, 250) ?? "";

                return {
                    name: it.name.trim(),
                    price: Math.round(it.price * 100), // ✅ cents BASE (sin impuestos)
                    unitQty: quantity,
                    note,
                };
            });

            const customer = {
                email: (formData.email ?? "").trim(),
                firstName: (`${formData.firstName ?? ""}`).trim() || "Guest",
                phoneNumber: (formData.phone ?? "").trim(),
            };

            if (user) await updateClientProfile();

            const url = (import.meta.env.VITE_CLOVER_CHECKOUT_HTTP_URL as string) || "";
            const merchantId = (import.meta.env.VITE_CLOVER_MERCHANT_ID as string) || "";
            if (!url) throw new Error("Missing VITE_CLOVER_CHECKOUT_HTTP_URL");
            if (!merchantId) throw new Error("Missing VITE_CLOVER_MERCHANT_ID");

            const payload = {
                merchantId,
                tipsEnabled: true,
                clientUrl: window.location.origin,
                customer,
                items,
                metadata: {
                    userId: user?.id || "guest",
                    pointsEarned: String(user ? pointsEarned ?? 0 : 0),
                    totals: JSON.stringify({
                        subtotal: calculatedSubtotal,        
                        gst,                                 
                        qst,                               
                        deliveryFee: deliveryInfo.fee,
                        finalTotal,                         
                    }),
                    deliveryMethod: formData.deliveryMethod,
                },
            };

             const itemsTotalBase = items.reduce((sum, it) => sum + (it.price * it.unitQty) / 100, 0);
            const expectedTotal = itemsTotalBase + gst + qst + (deliveryInfo.fee || 0);

            if (Math.abs(expectedTotal - finalTotal) > 0.02) {
                console.warn("Total mismatch check:", {
                    itemsTotalBase,
                    gst,
                    qst,
                    deliveryFee: deliveryInfo.fee,
                    expectedTotal,
                    finalTotal,
                    diff: expectedTotal - finalTotal,
                });
            }

            const resp = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "omit",
                body: JSON.stringify(payload),
            });

            const raw = await resp.text();
            let data: any = {};
            try {
                data = raw ? JSON.parse(raw) : {};
            } catch {
                data = { raw };
            }

            if (!resp.ok) {
                const details =
                    data?.data?.errors ||
                    data?.data?.message ||
                    data?.data?.details ||
                    data?.message ||
                    data?.error ||
                    data?.raw ||
                    raw ||
                    "Unknown error";

                throw new Error(
                    [
                        data?.error || "Hosted checkout create failed",
                        data?.status ? `CloverStatus=${data.status}` : "",
                        typeof details === "string" ? details : JSON.stringify(details),
                    ]
                        .filter(Boolean)
                        .join(" | ")
                );
            }

            if (!data?.checkoutUrl) throw new Error("Missing checkoutUrl in Clover response");

            sessionStorage.setItem(
                "pendingCloverCheckout",
                JSON.stringify({
                    orderId: data.orderId,
                    checkoutSessionId: data.checkoutSessionId || null,
                    checkoutUrl: data.checkoutUrl,
                    expirationTime: data.expirationTime || null,
                    createdAt: Date.now(),
                    totals: {
                        subtotal: calculatedSubtotal,
                        gst,
                        qst,
                        deliveryFee: deliveryInfo.fee,
                        finalTotal,
                    },
                    pointsEarned: user ? pointsEarned ?? 0 : 0,
                    userId: user?.id || null,
                    customerEmail: customer.email,
                })
            );

            window.location.href = data.checkoutUrl;
        } catch (err: any) {
            console.error("❌ Checkout error:", err);
            alert(err?.message || "Payment processing failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    }, [
        validate,
        formData,
        deliveryInfo,
        safeCart,
        getLocalizedDescription,
        user,
        updateClientProfile,
        subtotal,
        gst,
        qst,
        finalTotal,
        pointsEarned,
    ]);

    // Empty cart
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

    // Order complete (lo dejé como lo tienes, solo placeholder)
    if (orderComplete) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="container mx-auto px-6">
                    <div className="max-w-md mx-auto text-center">
                        <div className="text-white">Order complete: {orderNumber}</div>
                        <button onClick={() => navigate("/")} className="mt-4 bg-white text-gray-900 px-4 py-2 rounded-sm">
                            {t("checkoutPage.backHome", "Back to Home")}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const banner =
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
                    <header className="mb-6">
                        <Link to="/order" className="inline-flex items-center text-white/60 hover:text-white transition-colors mb-3 text-sm">
                            <span className="mr-2">←</span>
                            {t("checkoutPage.backMenu", "Back to Menu")}
                        </Link>

                        <div className="flex justify-between items-center mb-3">
                            <h1 className="text-2xl font-light text-white tracking-wide">{t("checkoutPage.checkout", "Checkout")}</h1>

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

                        {banner}
                    </header>

                    <div className="flex items-center justify-center mb-8">
                        <div className="flex items-center">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === "info" ? "bg-[#E62B2B] text-white" : "bg-white/10 text-white/60"}`}>1</div>
                            <div className={`ml-2 text-sm ${currentStep === "info" ? "text-white" : "text-white/60"}`}>
                                {t("checkoutPage.information", "Information")}
                            </div>
                        </div>
                        <div className="w-12 h-0.5 bg-white/20 mx-4"></div>
                        <div className="flex items-center">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === "review" ? "bg-[#E62B2B] text-white" : "bg-white/10 text-white/60"}`}>2</div>
                            <div className={`ml-2 text-sm ${currentStep === "review" ? "text-white" : "text-white/60"}`}>
                                {t("checkoutPage.review", "Review & Pay")}
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleContinueToReview}>
                        {/* Mobile */}
                        <div className="block lg:hidden space-y-6">
                            {currentStep === "info" ? (
                                <>
                                    <CustomerInformation
                                        formData={formData}
                                        onInputChange={onInputChange}
                                        errors={errors}
                                        t={(key: string, def?: string) => t(key, { defaultValue: def })}
                                    />
                                    <OrderSummary {...orderSummaryProps} />
                                    <div className="sticky bottom-0 bg-black/80 backdrop-blur-xl border-t border-white/10 pt-4 pb-4 -mx-4 px-4 mt-6">
                                        <button type="submit" className="bg-[#E62B2B] text-white px-8 py-4 rounded-xl w-full">
                                            {t("checkoutPage.continueReview", "Continue to Review")}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <OrderSummary {...orderSummaryProps} />

                                    <div className="space-y-4">
                                        <div className="bg-white/5 border border-white/10 rounded-sm p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-light text-white tracking-wide flex items-center gap-2">
                                                    <User className="w-5 h-5 text-[#E62B2B]" />
                                                    {t("checkoutPage.customerInfo", "Customer Information")}
                                                </h3>
                                                <button type="button" onClick={handleBackToInfo} className="text-white/60 hover:text-white text-sm">
                                                    {t("checkoutPage.edit", "Edit")}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-4 text-sm">
                                                <div className="flex items-center gap-3 text-white/80">
                                                    <Mail className="w-4 h-4 text-white/40" />
                                                    <span>{formData.email}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-white/80">
                                                    <Phone className="w-4 h-4 text-white/40" />
                                                    <span>{formData.phone}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 border border-white/10 rounded-sm p-6">
                                            <div className="flex items-center gap-2 text-white mb-3">
                                                {formData.deliveryMethod === "delivery" ? (
                                                    <MapPin className="w-5 h-5 text-[#E62B2B]" />
                                                ) : (
                                                    <Clock className="w-5 h-5 text-[#E62B2B]" />
                                                )}
                                                <span className="font-light">
                                                    {formData.deliveryMethod === "delivery"
                                                        ? t("checkoutPage.deliveryAddress", "Delivery Address")
                                                        : t("checkoutPage.pickupInfo", "Pickup Information")}
                                                </span>
                                            </div>

                                            {formData.deliveryMethod === "delivery" && (
                                                <div className="text-white/80 text-sm">
                                                    <p>{formData.address}</p>
                                                    <p className="text-white/60">
                                                        {formData.city}{formData.area ? ` (${formData.area})` : ""}, QC {formData.zipCode}
                                                    </p>
                                                    {formData.deliveryInstructions ? (
                                                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-sm p-3 mt-3">
                                                            <p className="text-blue-400 text-sm font-medium flex items-center gap-2">
                                                                <Sparkles className="w-4 h-4" />
                                                                {t("checkoutPage.specialInstructions", "Special Instructions")}
                                                            </p>
                                                            <p className="text-blue-300 text-sm mt-1">{formData.deliveryInstructions}</p>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-gradient-to-r from-[#E62B2B]/10 to-[#ff6b6b]/10 border border-[#E62B2B]/20 rounded-sm p-4">
                                            <div className="flex items-center gap-3">
                                                <ChefHat className="w-5 h-5 text-[#E62B2B]" />
                                                <div>
                                                    <p className="text-white font-medium text-sm">{t("checkoutPage.estimatedTime", "Estimated Preparation Time")}</p>
                                                    <p className="text-white/60 text-sm">
                                                        {t("checkoutPage.readyIn", "Ready in approximately")} <strong>{estimatedPrepTime} minutes</strong>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="sticky bottom-0 bg-gray-900 border-t border-white/10 pt-4 pb-4 -mx-4 px-4">
                                        <PaymentMethodSelector
                                            paymentMethod={"card"}
                                            onPaymentMethodChange={() => { }}
                                            finalTotal={finalTotal}
                                            isProcessing={isProcessing}
                                            onPlaceOrder={handleCardPayment}
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
                                        <CustomerInformation
                                            formData={formData}
                                            onInputChange={onInputChange}
                                            errors={errors}
                                            t={(key: string, def?: string) => t(key, { defaultValue: def })}
                                        />
                                        <div className="flex justify-end pt-2">
                                            <button type="submit" className="bg-white text-gray-900 px-8 py-3 rounded-sm hover:bg-white/90 transition-all text-sm font-medium">
                                                {t("checkoutPage.continueReview", "Continue to Review")}
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <PaymentMethodSelector
                                        paymentMethod={"card"}
                                        onPaymentMethodChange={() => { }}
                                        finalTotal={finalTotal}
                                        isProcessing={isProcessing}
                                        onPlaceOrder={handleCardPayment}
                                        onBack={handleBackToInfo}
                                    />
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
