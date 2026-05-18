import { useCallback } from "react";
import { IS_TEST_CHECKOUT } from "../utils/checkoutConstants";
import { roundMoney, toCents } from "../utils/checkoutMoney";
import type { CartItemCheckOut } from "../CheckoutPage";

type Params = {
  validate: (formData: any, deliveryInfo: any) => boolean;
  formData: any;
  deliveryInfo: any;
  safeCart: CartItemCheckOut[];
  subtotal: number;
  gst: number;
  qst: number;
  finalTotal: number;
  discountedSubtotal: number;
  discountAmount: number;
  appliedCode: string | null;
  pointsEarned: number;
  user: any;
  updateClientProfile: () => Promise<void>;
  getLocalizedDescription: (description: any) => string;
  setIsProcessing: (value: boolean) => void;
};

export function useCloverCheckout({
  validate,
  formData,
  deliveryInfo,
  safeCart,
  subtotal,
  gst,
  qst,
  finalTotal,
  discountedSubtotal,
  discountAmount,
  appliedCode,
  pointsEarned,
  user,
  updateClientProfile,
  getLocalizedDescription,
  setIsProcessing,
}: Params) {
  return useCallback(async () => {
    setIsProcessing(true);

    try {
      if (!validate(formData, deliveryInfo)) {
        throw new Error("Please complete the required fields.");
      }

      if (!safeCart.length) {
        throw new Error("Your cart is empty.");
      }

      const calculatedSubtotal = roundMoney(
        safeCart.reduce((sum, item) => {
          const quantity = Number.isFinite(item.quantity) ? Number(item.quantity) : 1;
          return sum + item.price * quantity;
        }, 0)
      );

      if (Math.abs(calculatedSubtotal - subtotal) > 0.01) {
        console.warn("Subtotal mismatch:", {
          calculated: calculatedSubtotal,
          passed: subtotal,
        });
      }

      const discountRatio =
        subtotal > 0 && discountAmount > 0 ? discountAmount / subtotal : 0;

      const items = safeCart.map((item, index) => {
        if (!item.name?.trim()) {
          throw new Error(`Item ${index + 1} is missing a name`);
        }

        if (typeof item.price !== "number" || item.price < 0) {
          throw new Error(`Item "${item.name}" has an invalid price`);
        }

        const quantity = Number.isFinite(item.quantity) ? Number(item.quantity) : 1;

        if (quantity < 1 || !Number.isInteger(quantity)) {
          throw new Error(`Item "${item.name}" has an invalid quantity`);
        }

        const discountedUnitPrice = roundMoney(item.price * (1 - discountRatio));

        const note = [
          getLocalizedDescription(item.description)?.substring(0, 150) ?? "",
          `Pickup: ${formData.pickupTime || "asap"}`,
          formData.orderNotes ? `Notes: ${formData.orderNotes}` : "",
          appliedCode ? `Promo: ${appliedCode} (-$${discountAmount.toFixed(2)})` : "",
          IS_TEST_CHECKOUT ? "TEST ORDER - DO NOT PREPARE" : "",
        ]
          .filter(Boolean)
          .join(" | ");

        return {
          name: IS_TEST_CHECKOUT ? `TEST - ${item.name.trim()}` : item.name.trim(),
          price: IS_TEST_CHECKOUT ? 100 : toCents(discountedUnitPrice),
          unitQty: IS_TEST_CHECKOUT ? 1 : quantity,
          note,
        };
      });

      const customer = {
        email: (formData.email ?? "").trim(),
        firstName: `${formData.firstName ?? ""}`.trim() || "Guest",
        phoneNumber: (formData.phone ?? "").trim(),
      };

      const fullForm = {
        firstName: formData.firstName || "",
        email: formData.email || "",
        phone: formData.phone || "",
        deliveryMethod: formData.deliveryMethod || "pickup",
        pickupTime: formData.pickupTime || "asap",
        orderNotes: formData.orderNotes || "",
        address: formData.address || "",
        city: formData.city || "",
        area: formData.area || "",
        zipCode: formData.zipCode || "",
        deliveryInstructions: formData.deliveryInstructions || "",
      };

      if (user) {
        await updateClientProfile();
      }

      const url = (import.meta.env.VITE_CLOVER_CHECKOUT_HTTP_URL as string) || "";
      const merchantId = (import.meta.env.VITE_CLOVER_MERCHANT_ID as string) || "";

      if (!url) throw new Error("Missing VITE_CLOVER_CHECKOUT_HTTP_URL");
      if (!merchantId) throw new Error("Missing VITE_CLOVER_MERCHANT_ID");

      const realTotals = {
        subtotal: calculatedSubtotal,
        discountCode: appliedCode || "",
        discountAmount,
        discountedSubtotal,
        gst,
        qst,
        deliveryFee: deliveryInfo.fee,
        finalTotal,
      };

      const cloverAmount = IS_TEST_CHECKOUT ? 115 : toCents(finalTotal);

      // Add before payload
      const localCheckoutId = crypto.randomUUID();

      const publicBaseUrl =
        window.location.hostname === "localhost"
          ? "https://maisushi.ca"
          : window.location.origin;

      const successUrl = `${publicBaseUrl}/checkout/success?localCheckoutId=${localCheckoutId}`;
      const cancelUrl = `${publicBaseUrl}/checkout/cancel?localCheckoutId=${localCheckoutId}`;

      const payload = {
        merchantId,
        clientUrl: window.location.origin,
        customer,
        items,
        amount: cloverAmount,
        currency: "cad",
        successUrl,
        cancelUrl,
        metadata: {
          userId: user?.id || "guest",
          pointsEarned: String(user ? pointsEarned ?? 0 : 0),
          deliveryMethod: fullForm.deliveryMethod,
          pickupTime: fullForm.pickupTime,
          orderNotes: fullForm.orderNotes,
          customerName: fullForm.firstName,
          customerEmail: fullForm.email,
          customerPhone: fullForm.phone,
          discountCode: appliedCode || "",
          discountAmount: String(discountAmount),
          discountedSubtotal: String(discountedSubtotal),
          localCheckoutId,
          totals: JSON.stringify(
            IS_TEST_CHECKOUT
              ? {
                subtotal: 1,
                discountCode: appliedCode || "",
                discountAmount: 0,
                discountedSubtotal: 1,
                gst: 0.05,
                qst: 0.1,
                deliveryFee: 0,
                finalTotal: 1.15,
              }
              : realTotals
          ),
          isTest: IS_TEST_CHECKOUT ? "true" : "false",
          customerInfo: JSON.stringify({
            name: fullForm.firstName,
            email: fullForm.email,
            phone: fullForm.phone,
          }),
          deliveryInfo: JSON.stringify({
            address: fullForm.address,
            city: fullForm.city,
            area: fullForm.area,
            zipCode: fullForm.zipCode,
            instructions: fullForm.deliveryInstructions,
          }),
          fullForm: JSON.stringify(fullForm),
        },
      };

      console.log("Clover checkout URL:", url);
      console.log("Clover merchantId:", merchantId);
      console.log("Clover payload:", payload);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify(payload),
      });

      const raw = await response.text();
      let data: any = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { raw };
      }

      if (!response.ok) {
        const details =
          data?.details ||
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

      if (!data?.checkoutUrl) {
        console.error("Missing checkoutUrl in Clover response:", data);
        throw new Error("Missing checkoutUrl in Clover response");
      }

      const checkoutSessionId = data.checkoutSessionId || null;

      const pendingCheckoutData = {
        localCheckoutId,
        checkoutSessionId,
        checkoutUrl: data.checkoutUrl,
        expirationTime: data.expirationTime || null,
        createdAt: Date.now(),
        totals: realTotals,
        customer,
        formData: fullForm,
        pointsEarned: user ? pointsEarned ?? 0 : 0,
        userId: user?.id || null,
        customerEmail: customer.email,
        promo: {
          code: appliedCode,
          amount: discountAmount,
        },
      };

      if (checkoutSessionId) {
        localStorage.setItem("cloverCheckoutSessionId", checkoutSessionId);
        localStorage.setItem(
          `pendingCloverCheckout:${localCheckoutId}`,
          JSON.stringify(pendingCheckoutData)
        );

        console.log("✅ Saved Clover checkout locally:", {
          localCheckoutId,
          checkoutSessionId,
        });
      } else {
        console.warn("⚠️ Clover response has no checkoutSessionId:", data);
      }


      console.log("✅ Clover checkout created:", {
        checkoutSessionId,
        checkoutUrl: data.checkoutUrl,
        expirationTime: data.expirationTime || null,
      });


      console.log("➡️ Redirecting to Clover checkout...");
      console.log("💾 Saved value check:", {
        localCheckoutId,
        checkoutSessionId,
        savedPending: localStorage.getItem(`pendingCloverCheckout:${localCheckoutId}`),
        savedSession: localStorage.getItem("cloverCheckoutSessionId"),
      });

      console.log("➡️ Redirecting to Clover checkout...");

      await new Promise((resolve) => setTimeout(resolve, 300));
      window.location.assign(data.checkoutUrl);
      return;
      setIsProcessing(false);
    } catch (error: any) {
      console.error("❌ Checkout error:", error);
      alert(error?.message || "Payment processing failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [
    validate,
    formData,
    deliveryInfo,
    safeCart,
    subtotal,
    gst,
    qst,
    finalTotal,
    discountedSubtotal,
    discountAmount,
    appliedCode,
    pointsEarned,
    user,
    updateClientProfile,
    getLocalizedDescription,
    setIsProcessing,
  ]);
}