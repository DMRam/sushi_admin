import { Clock, Mail, MapPin, Phone, Sparkles, User } from "lucide-react";

type Props = {
  formData: any;
  onEdit: () => void;
  t: (key: string, fallback?: string) => string;
};

export default function CheckoutReviewInfo({ formData, onEdit, t }: Props) {
  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-light text-white tracking-wide flex items-center gap-2">
            <User className="w-5 h-5 text-[#E62B2B]" />
            {t("checkoutPage.customerInfo", "Customer Information")}
          </h3>

          <button
            type="button"
            onClick={onEdit}
            className="text-white/60 hover:text-white text-sm"
          >
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

        {formData.deliveryMethod === "delivery" ? (
          <div className="text-white/80 text-sm">
            <p>{formData.address}</p>
            <p className="text-white/60">
              {formData.city}
              {formData.area ? ` (${formData.area})` : ""}, QC {formData.zipCode}
            </p>

            {formData.deliveryInstructions ? (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-sm p-3 mt-3">
                <p className="text-blue-400 text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {t("checkoutPage.specialInstructions", "Special Instructions")}
                </p>
                <p className="text-blue-300 text-sm mt-1">
                  {formData.deliveryInstructions}
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-white/80 text-sm">
            <p>
              {t("checkoutPage.pickupTime", "Pickup time")}:{" "}
              <span className="text-white">{formData.pickupTime || "ASAP"}</span>
            </p>

            {formData.orderNotes ? (
              <p className="text-white/60 mt-2">
                {t("checkoutPage.orderNotes", "Order notes")}: {formData.orderNotes}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}