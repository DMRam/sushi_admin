import { useState, useRef, useMemo, useCallback } from "react";
import type { CustomerFormData } from "../CustomerInformation";

const caPostal = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneDigits = (s: string) => s.replace(/\D/g, "");
const isValidCAPhone = (s: string) => {
  const digits = phoneDigits(s);
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
};

export const useCheckoutValidation = () => {
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormData, string>>>({});
  const firstErrorRef = useRef<string | null>(null);

  const validate = useCallback((formData: CustomerFormData, deliveryInfo: any): boolean => {
    const e: Partial<Record<keyof CustomerFormData, string>> = {};
    firstErrorRef.current = null;

    const needAddr = formData.deliveryMethod === "delivery";
    const setErr = (k: keyof CustomerFormData, msg: string) => {
      e[k] = msg;
      if (!firstErrorRef.current) firstErrorRef.current = String(k);
    };

    if (!formData.firstName || formData.firstName.trim().length < 2) {
      setErr("firstName", "Please enter a valid first name");
    }
    if (!emailRx.test(formData.email || "")) {
      setErr("email", "Please enter a valid email address");
    }
    if (!isValidCAPhone(formData.phone || "")) {
      setErr("phone", "Please enter a valid Canadian phone number");
    }
    if (!formData.deliveryMethod) {
      setErr("deliveryMethod", "Please select pickup or delivery");
    }

    if (formData.deliveryMethod === "delivery") {
      if (!formData.city) setErr("city", "Please choose a city");
      if (formData.city === "Sherbrooke" && !formData.area) {
        setErr("area", "Please choose an area (Cartier)");
      }
      if (formData.city === "Other") {
        setErr("city", "Delivery unavailable in selected area — choose pickup");
      }
      if (needAddr) {
        if (!formData.address || formData.address.trim().length < 5) {
          setErr("address", "Please enter a valid street address");
        }
        if (!formData.zipCode || !caPostal.test(formData.zipCode)) {
          setErr("zipCode", "Please enter a valid Canadian postal code (e.g., J1H 4A8)");
        }
      }
      if (!deliveryInfo.allowed) {
        setErr("city", deliveryInfo.reason || "Delivery not available");
      }
    }

    setErrors(e);

    if (firstErrorRef.current) {
      const el = document.querySelector(`[name="${firstErrorRef.current}"]`) as HTMLElement | null;
      if (el?.scrollIntoView) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    return Object.keys(e).length === 0;
  }, []);

  return {
    errors,
    validate,
  };
};

export const useDeliveryInfo = (formData: CustomerFormData, subtotal: number) => {
  return useMemo(() => {
    const method = formData.deliveryMethod;
    if (method === "pickup") {
      return { allowed: true, reason: "", fee: 0, freeThreshold: 0 };
    }
    if (formData.city === "Sherbrooke") {
      const fee = subtotal > 25 ? 0 : 4.99;
      return { allowed: true, reason: "", fee, freeThreshold: 25 };
    }
    if (formData.city === "Magog") {
      if (subtotal < 100) {
        return { allowed: false, reason: "Delivery to Magog requires a $100 minimum order.", fee: 0, freeThreshold: 150 };
      }
      const fee = subtotal >= 150 ? 0 : 9.99;
      return { allowed: true, reason: "", fee, freeThreshold: 150 };
    }
    return { allowed: false, reason: "Delivery unavailable in selected area — pickup only.", fee: 0, freeThreshold: 0 };
  }, [formData.deliveryMethod, formData.city, subtotal]);
};

export const useCheckoutTotals = (subtotal: number, deliveryFee: number) => {
  return useMemo(() => {
    const gst = Number(((subtotal + deliveryFee) * 0.05).toFixed(2));
    const qst = Number(((subtotal + deliveryFee) * 0.09975).toFixed(2));
    const finalTotal = Number((subtotal + deliveryFee + gst + qst).toFixed(2));
    return { gst, qst, finalTotal };
  }, [subtotal, deliveryFee]);
};