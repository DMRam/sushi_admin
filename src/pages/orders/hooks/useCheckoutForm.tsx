import { useState, useCallback } from "react";
import type { CustomerFormData } from "../CustomerInformation";

export const useCheckoutForm = (initialData?: Partial<CustomerFormData>) => {
  const [formData, setFormData] = useState<CustomerFormData>({
    firstName: initialData?.firstName || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    address: initialData?.address || "",
    city: initialData?.city || "",
    zipCode: initialData?.zipCode || "",
    deliveryMethod: initialData?.deliveryMethod || "pickup",
    area: initialData?.area || "",
    deliveryInstructions: initialData?.deliveryInstructions || "",
    pickupTime: initialData?.pickupTime || "asap",
    orderNotes: initialData?.orderNotes || "",
  });

  const updateFormData = useCallback((updates: Partial<CustomerFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      firstName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      zipCode: "",
      deliveryMethod: "pickup",
      area: "",
      deliveryInstructions: "",
      pickupTime: "asap",
      orderNotes: "",
    });
  }, []);

  return {
    formData,
    updateFormData,
    resetForm,
  };
};