import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PROMO_CODE,
  PROMO_MIN_SUBTOTAL,
  PROMO_PERCENT,
} from "../utils/checkoutConstants";
import { roundMoney } from "../utils/checkoutMoney";

type Params = {
  subtotal: number;
  deliveryMethod: string;
};

export function useCheckoutDiscount({ subtotal, deliveryMethod }: Params) {
  const [discountCode, setDiscountCode] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountMessage, setDiscountMessage] = useState<string | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  const discountedSubtotal = useMemo(() => {
    return roundMoney(Math.max(subtotal - discountAmount, 0));
  }, [subtotal, discountAmount]);

  const applyDiscount = useCallback(() => {
    const normalizedCode = discountCode.trim().toUpperCase();

    setDiscountError(null);
    setDiscountMessage(null);

    if (!normalizedCode) {
      setDiscountError("Enter a promo code.");
      return;
    }

    if (normalizedCode !== PROMO_CODE) {
      setAppliedCode(null);
      setDiscountAmount(0);
      setDiscountError("Invalid promo code.");
      return;
    }

    if (deliveryMethod !== "pickup") {
      setAppliedCode(null);
      setDiscountAmount(0);
      setDiscountError("This promo code is valid for pickup orders only.");
      return;
    }

    if (subtotal < PROMO_MIN_SUBTOTAL) {
      setAppliedCode(null);
      setDiscountAmount(0);
      setDiscountError("Minimum subtotal of $25 required.");
      return;
    }

    setAppliedCode(PROMO_CODE);
    setDiscountAmount(roundMoney(subtotal * PROMO_PERCENT));
    setDiscountMessage(`Promo applied: ${PROMO_CODE}`);
  }, [discountCode, deliveryMethod, subtotal]);

  const removeDiscount = useCallback(() => {
    setDiscountCode("");
    setAppliedCode(null);
    setDiscountAmount(0);
    setDiscountMessage(null);
    setDiscountError(null);
  }, []);

  useEffect(() => {
    if (!appliedCode) return;

    const stillEligible =
      appliedCode === PROMO_CODE &&
      deliveryMethod === "pickup" &&
      subtotal >= PROMO_MIN_SUBTOTAL;

    if (!stillEligible) {
      removeDiscount();
      setDiscountError("Promo removed. This code requires pickup and a minimum subtotal of $25.");
      return;
    }

    setDiscountAmount(roundMoney(subtotal * PROMO_PERCENT));
  }, [appliedCode, deliveryMethod, subtotal, removeDiscount]);

  return {
    discountCode,
    setDiscountCode,
    appliedCode,
    discountAmount,
    discountedSubtotal,
    discountMessage,
    discountError,
    setDiscountError,
    setDiscountMessage,
    applyDiscount,
    removeDiscount,
  };
}