import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { doc, getDoc } from "firebase/firestore";
import {
  PROMO_CODE,
  PROMO_MIN_SUBTOTAL,
  PROMO_PERCENT,
} from "../utils/checkoutConstants";
import { roundMoney } from "../utils/checkoutMoney";
import { db } from "../../../firebase/firebase";

type Params = {
  subtotal: number;
  deliveryMethod: string;
};

type GiftCardData = {
  code: string;
  balance: number;
  initialAmount?: number;
  status?: "active" | "used" | "expired" | "disabled";
};

type DiscountType = "promo" | "gift_card" | null;

export function useCheckoutDiscount({ subtotal, deliveryMethod }: Params) {
  const { t } = useTranslation();
  const [discountCode, setDiscountCode] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<DiscountType>(null);
  const [giftCardBalance, setGiftCardBalance] = useState<number | null>(null);

  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountMessage, setDiscountMessage] = useState<string | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);

  const discountedSubtotal = useMemo(() => {
    return roundMoney(Math.max(subtotal - discountAmount, 0));
  }, [subtotal, discountAmount]);

  const resetDiscount = useCallback(() => {
    setAppliedCode(null);
    setDiscountType(null);
    setGiftCardBalance(null);
    setDiscountAmount(0);
    setDiscountMessage(null);
    setDiscountError(null);
  }, []);

  const removeDiscount = useCallback(() => {
    setDiscountCode("");
    resetDiscount();
  }, [resetDiscount]);

  const applyPromoCode = useCallback(
    (normalizedCode: string) => {
      if (normalizedCode !== PROMO_CODE) {
        return false;
      }

      if (deliveryMethod !== "pickup") {
        resetDiscount();
        setDiscountError(t("checkoutPage.promoPickupOnly", "This promo code is valid for pickup orders only."));
        return true;
      }

      if (subtotal < PROMO_MIN_SUBTOTAL) {
        resetDiscount();
        setDiscountError(t("checkoutPage.promoMinimumSubtotal", "Minimum subtotal of $25 required."));
        return true;
      }

      const amount = roundMoney(subtotal * PROMO_PERCENT);

      setAppliedCode(PROMO_CODE);
      setDiscountType("promo");
      setGiftCardBalance(null);
      setDiscountAmount(amount);
      setDiscountMessage(t("checkoutPage.promoApplied", "Promo applied: {{code}}", { code: PROMO_CODE }));

      return true;
    },
    [deliveryMethod, resetDiscount, subtotal, t]
  );

  const applyGiftCardCode = useCallback(
    async (normalizedCode: string) => {
      // Gift card codes can follow this format: MSH-XXXXXX
      if (!normalizedCode.startsWith("MSH-")) {
        return false;
      }

      const giftCardRef = doc(db, "gift_cards", normalizedCode);
      const giftCardSnap = await getDoc(giftCardRef);

      if (!giftCardSnap.exists()) {
        resetDiscount();
        setDiscountError(t("checkoutPage.invalidGiftCard", "Invalid gift card code."));
        return true;
      }

      const giftCard = giftCardSnap.data() as GiftCardData;

      if (giftCard.status && giftCard.status !== "active") {
        resetDiscount();
        setDiscountError(t("checkoutPage.giftCardInactive", "This gift card is not active."));
        return true;
      }

      const balance = Number(giftCard.balance || 0);

      if (balance <= 0) {
        resetDiscount();
        setDiscountError(t("checkoutPage.giftCardEmpty", "This gift card has no remaining balance."));
        return true;
      }

      const amount = roundMoney(Math.min(balance, subtotal));

      setAppliedCode(normalizedCode);
      setDiscountType("gift_card");
      setGiftCardBalance(balance);
      setDiscountAmount(amount);
      setDiscountMessage(t(
        "checkoutPage.giftCardApplied",
        "Gift card applied: {{code}} (${{amount}} used)",
        { code: normalizedCode, amount: amount.toFixed(2) }
      ));

      return true;
    },
    [resetDiscount, subtotal, t]
  );

  const applyDiscount = useCallback(async () => {
    const normalizedCode = discountCode.trim().toUpperCase();

    setDiscountError(null);
    setDiscountMessage(null);

    if (!normalizedCode) {
      setDiscountError(t("checkoutPage.enterDiscountCode", "Enter a promo code or gift card code."));
      return;
    }

    setIsApplyingDiscount(true);

    try {
      const promoHandled = applyPromoCode(normalizedCode);
      if (promoHandled) return;

      const giftCardHandled = await applyGiftCardCode(normalizedCode);
      if (giftCardHandled) return;

      resetDiscount();
      setDiscountError(t("checkoutPage.invalidDiscountCode", "Invalid promo code or gift card code."));
    } catch (error) {
      console.error("Error applying discount:", error);
      resetDiscount();
      setDiscountError(t("checkoutPage.discountApplyFailed", "Could not apply this code. Please try again."));
    } finally {
      setIsApplyingDiscount(false);
    }
  }, [
    discountCode,
    applyPromoCode,
    applyGiftCardCode,
    resetDiscount,
    t,
  ]);

  useEffect(() => {
    if (!appliedCode || !discountType) return;

    if (discountType === "promo") {
      const stillEligible =
        appliedCode === PROMO_CODE &&
        deliveryMethod === "pickup" &&
        subtotal >= PROMO_MIN_SUBTOTAL;

      if (!stillEligible) {
        removeDiscount();
        setDiscountError(
          t("checkoutPage.promoRemoved", "Promo removed. This code requires pickup and a minimum subtotal of $25.")
        );
        return;
      }

      setDiscountAmount(roundMoney(subtotal * PROMO_PERCENT));
      return;
    }

    if (discountType === "gift_card") {
      const balance = giftCardBalance || 0;
      setDiscountAmount(roundMoney(Math.min(balance, subtotal)));
    }
  }, [
    appliedCode,
    discountType,
    giftCardBalance,
    deliveryMethod,
    subtotal,
    removeDiscount,
    t,
  ]);

  return {
    discountCode,
    setDiscountCode,

    appliedCode,
    discountType,
    giftCardBalance,

    discountAmount,
    discountedSubtotal,

    discountMessage,
    discountError,

    isApplyingDiscount,

    setDiscountError,
    setDiscountMessage,

    applyDiscount,
    removeDiscount,
  };
}
