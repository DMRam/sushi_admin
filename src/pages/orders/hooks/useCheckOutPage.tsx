import { useState, useEffect, useMemo, useCallback } from "react";
import { getFunctions, httpsCallable, type HttpsCallableResult } from "firebase/functions";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { useCartStore } from "../../../stores/cartStore";
import type { CashOrderResponse } from "../../../types/stripe_interfaces";

import { useCheckoutForm } from "./useCheckoutForm";
import { useCheckoutTotals, useCheckoutValidation, useDeliveryInfo } from "./useCheckoutCalculations";
import { useUserAuth } from "./useUserAuth";
import type { CustomerFormData } from "../../orders/CustomerInformation";
import type { CartItemCheckOut } from "../interfaces/IPaymentSteps";

export const useCheckoutPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // --- CART STORE ---
  const cart = useCartStore((s) => s.cart);
  const clearCart = useCartStore((s) => s.clearCart);

  // --- USER AUTH ---
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

  // --- FORM ---
  const { formData, updateFormData } = useCheckoutForm();
  const { errors, validate } = useCheckoutValidation();

  // --- PREFILL LOGGED-IN USER ---
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

  // --- CART CALCULATIONS ---
  const { safeCart, itemCount, subtotal } = useMemo(() => {
    const safeCart: CartItemCheckOut[] = Array.isArray(cart)
      ? cart.filter((item) => (item.quantity || 0) > 0)
      : [];

    const itemCount = safeCart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const subtotal = safeCart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);

    return { safeCart, itemCount, subtotal };
  }, [cart]);

  const deliveryInfo = useDeliveryInfo(formData, subtotal);
  const { gst, qst, finalTotal } = useCheckoutTotals(subtotal, deliveryInfo.fee);

  // --- PAGE STATE ---
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [currentStep, setCurrentStep] = useState<"info" | "review">("info");

  const pointsEarned = Math.floor(subtotal);

  // --- SCROLL ON LOAD ---
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // --- INPUT CHANGE HANDLER ---
  const onInputChange = useCallback(
    (e: any) => {
      const { name, value } = e.target as { name: keyof CustomerFormData; value: string };

      if (name === "city" && value === "Other") {
        if (formData.deliveryMethod === "delivery") {
          updateFormData({
            [name]: value,
            deliveryMethod: "pickup",
          });
        } else {
          updateFormData({ [name]: value });
        }
      } else {
        updateFormData({ [name]: value });
      }
    },
    [updateFormData]
  );

  // --- STEP HANDLERS ---
  const handleContinueToReview = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const isValid = formData.firstName && formData.email && formData.phone;
      if (isValid) setCurrentStep("review");
    },
    [formData]
  );

  const handleBackToInfo = useCallback(() => setCurrentStep("info"), []);

  // --- IMAGE EXTRACTION ---
  const collectValidImageUrls = useCallback((item: CartItemCheckOut): string[] => {
    const out: string[] = [];
    const add = (url: any) => {
      if (typeof url !== "string") return;
      const u = url.trim();
      if (!u) return;
      try {
        new URL(u);
        const isImg =
          /\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?.*)?$/i.test(u) ||
          u.includes("cloudinary") ||
          u.includes("firebase") ||
          u.includes("storage.googleapis.com");
        if (isImg && !out.includes(u)) out.push(u);
      } catch {}
    };
    [item.image, item.imageUrl, item.thumbnail, item.mainImage, item.photo, item.img, item.picture].forEach(add);
    (item.images || []).forEach(add);
    (item.imageUrls || []).forEach(add);
    return out;
  }, []);

  // --- PROFILE UPDATE ---
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

  // --- PAYMENT METHODS ---
  const handleCashPayment = async () => {
    setIsProcessing(true);
    try {
      if (!validate(formData, deliveryInfo)) return;

      const functions = getFunctions();
      const createCashOrder = httpsCallable<
        { cartItems: any[]; customerInfo: any; totals: any; pointsInfo?: any },
        CashOrderResponse
      >(functions, "createCashOrder");

      const cartItems = safeCart.map((it, idx) => {
        const imgs = collectValidImageUrls(it);
        return {
          productId: it.id || `item-${idx}-${Date.now()}`,
          name: it.name,
          sellingPrice: it.price,
          quantity: it.quantity || 1,
          ...(it.description && { description: it.description }),
          ...(it.category && { category: it.category }),
          ...(imgs.length > 0 && { image: imgs[0], images: imgs }),
        };
      });

      const customerInfo = {
        name: `${formData.firstName}`,
        email: formData.email,
        phone: formData.phone,
        address: formData.deliveryMethod === "delivery" ? formData.address : "Pickup",
        city:
          formData.deliveryMethod === "delivery"
            ? `${formData.city}${formData.area ? ` (${formData.area})` : ""}`
            : "Pickup",
        zipCode: formData.deliveryMethod === "delivery" ? formData.zipCode : "",
        deliveryInstructions: formData.deliveryInstructions,
        province: "QC",
        deliveryMethod: formData.deliveryMethod,
      };

      if (user) await updateClientProfile();

      const totals = { subtotal, gst, qst, deliveryFee: deliveryInfo.fee, finalTotal };
      const requestData: any = { cartItems, customerInfo, totals };

      if (user) {
        requestData.pointsInfo = {
          userId: user.id,
          pointsEarned,
          currentBalance: user.points,
        };
      }

      const result: HttpsCallableResult<CashOrderResponse> = await createCashOrder(requestData);
      if (result.data.success) {
        clearCart();
        setOrderNumber(result.data.orderId);
        setOrderComplete(true);
      } else {
        throw new Error(result.data.error || "Order creation failed");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to create order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- RETURN ALL RELEVANT STATE & ACTIONS ---
  return {
    // State
    t,
    user,
    formData,
    updateFormData,
    deliveryInfo,
    gst,
    qst,
    finalTotal,
    subtotal,
    itemCount,
    pointsEarned,
    orderNumber,
    orderComplete,
    currentStep,
    isProcessing,
    errors,
    isLoadingUser,
    showAuthModal,
    isLoginMode,
    authForm,
    isAuthLoading,
    authError,

    // Actions
    onInputChange,
    handleContinueToReview,
    handleBackToInfo,
    handleLogout,
    openAuthModal,
    setAuthForm,
    setIsLoginMode,
    setAuthError,
    setShowAuthModal,
    handleLogin,
    handleSignup,
    handleCashPayment,
    validate,
    clearCart,
    setOrderComplete,
    setOrderNumber,
    navigate,
  };
};
