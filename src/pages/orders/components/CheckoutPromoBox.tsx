import { CheckCircle2, Gift, Tag, X } from "lucide-react";

type Props = {
  discountCode: string;
  setDiscountCode: (value: string) => void;
  appliedCode: string | null;
  discountAmount: number;
  discountMessage: string | null;
  discountError: string | null;
  subtotal: number;
  discountedSubtotal: number;
  applyDiscount: () => void | Promise<void>;
  removeDiscount: () => void;
  t: (key: string, fallback?: string) => string;
  compact?: boolean;
  isApplyingDiscount?: boolean;
};

export default function CheckoutPromoBox({
  discountCode,
  setDiscountCode,
  appliedCode,
  discountAmount,
  discountMessage,
  discountError,
  subtotal,
  discountedSubtotal,
  applyDiscount,
  removeDiscount,
  t,
  compact = false,
  isApplyingDiscount = false,
}: Props) {
  const isGiftCardInput = discountCode.trim().toUpperCase().startsWith("MSH-");

  return (
    <div
      className={`w-full box-border overflow-hidden border border-[#f26350]/30 bg-[linear-gradient(135deg,rgba(242,99,80,0.20),rgba(14,14,14,0.96))] shadow-xl shadow-black/25 ${compact ? "p-4" : "p-5"
        }`}
    >
      <div className={`flex items-start gap-3 ${compact ? "mb-2" : "mb-3"}`}>
        <div
          className={`rounded-full bg-[#f26350]/20 flex items-center justify-center shrink-0 ${compact ? "w-8 h-8" : "w-9 h-9"
            }`}
        >
          {isGiftCardInput ? (
            <Gift className="w-4 h-4 text-[#ff8a8a]" />
          ) : (
            <Tag className="w-4 h-4 text-[#ff8a8a]" />
          )}
        </div>

        <div className="min-w-0">
          <p className="text-white font-medium text-sm leading-snug">
            {t("checkoutPage.promoOrGiftCardTitle", "Promo code or gift card")}
          </p>

          {!compact && (
            <p className="text-white/60 text-xs mt-1 leading-snug">
              {t(
                "checkoutPage.promoOrGiftCardDescription",
                "Use MAISUSHI10 for pickup deals or enter your gift card code."
              )}
            </p>
          )}
        </div>
      </div>

      <div className={compact ? "grid grid-cols-1 gap-2" : "flex flex-col sm:flex-row gap-2"}>
        <input
          type="text"
          value={discountCode}
          disabled={Boolean(appliedCode) || isApplyingDiscount}
          onChange={(e) => setDiscountCode(e.target.value)}
          placeholder={t("checkoutPage.discountCode", "Promo or gift card code")}
          className="w-full min-w-0 box-border bg-black/30 border border-white/15 text-white placeholder:text-white/35 rounded-[3px] px-3 py-3 text-sm outline-none focus:border-[#f26350]/70 disabled:opacity-70"
        />

        {appliedCode ? (
          <button
            type="button"
            onClick={removeDiscount}
            disabled={isApplyingDiscount}
            className="w-full inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white px-4 py-3 rounded-[3px] text-sm transition-colors disabled:opacity-70"
          >
            <X className="w-4 h-4" />
            {t("checkoutPage.remove", "Remove")}
          </button>
        ) : (
          <button
            type="button"
            onClick={applyDiscount}
            disabled={isApplyingDiscount}
            className="w-full bg-[#f26350] hover:bg-[#ff725f] text-white px-4 py-3 text-[12px] font-extrabold uppercase tracking-[0.08em] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isApplyingDiscount
              ? t("checkoutPage.applying", "Applying...")
              : t("checkoutPage.apply", "Apply")}
          </button>
        )}
      </div>

      {discountMessage && (
        <div className="mt-3 flex items-start gap-2 text-green-400 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="break-words">
            {discountMessage} (-${discountAmount.toFixed(2)})
          </span>
        </div>
      )}

      {discountError && (
        <p className="mt-3 text-[#ffb3b3] text-sm break-words">{discountError}</p>
      )}

      {discountAmount > 0 && !compact && (
        <div className="mt-4 border-t border-white/10 pt-3 space-y-1 text-sm">
          <div className="flex justify-between gap-3 text-white/60">
            <span>{t("checkoutPage.originalSubtotal", "Original subtotal")}</span>
            <span className="shrink-0">${subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between gap-3 text-green-400">
            <span>{t("checkoutPage.discount", "Discount")}</span>
            <span className="shrink-0">-${discountAmount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between gap-3 text-white">
            <span>{t("checkoutPage.discountedSubtotal", "Discounted subtotal")}</span>
            <span className="shrink-0">${discountedSubtotal.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
