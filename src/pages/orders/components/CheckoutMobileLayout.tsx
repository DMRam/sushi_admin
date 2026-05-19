import CustomerInformation from "../CustomerInformation";
import OrderSummary from "../../../components/web/OrderSummary";
import PaymentMethodSelector from "../PaymentMethodSelector";
import CheckoutPromoBox from "./CheckoutPromoBox";
import CheckoutReviewInfo from "./CheckoutReviewInfo";
import CheckoutPrepTimeCard from "./CheckoutPrepTimeCard";

type Props = any;

export default function CheckoutMobileLayout({
  currentStep,
  formData,
  onInputChange,
  errors,
  t,
  orderSummaryProps,
  promoProps,
  handleBackToInfo,
  estimatedPrepTime,
  finalTotal,
  isProcessing,
  handleCardPayment,
}: Props) {
  return (
    <div className="block lg:hidden space-y-6">
      {currentStep === "info" ? (
        <>
          <CustomerInformation
            formData={formData}
            onInputChange={onInputChange}
            errors={errors}
            t={t}
          />

          <CheckoutPromoBox {...promoProps} />

          <OrderSummary {...orderSummaryProps} />

          <div className="sticky bottom-0 bg-black/85 backdrop-blur-xl border-t border-white/10 pt-4 pb-4 -mx-4 px-4 mt-6">
            <button type="submit" className="bg-[#f26350] text-white px-8 py-4 w-full text-[12px] font-extrabold uppercase tracking-[0.1em] shadow-lg shadow-[#f26350]/20">
              {t("checkoutPage.continueReview", "Continue to Review")}
            </button>
          </div>
        </>
      ) : (
        <>
          <OrderSummary {...orderSummaryProps} />

          <div className="space-y-4">
            <CheckoutPromoBox {...promoProps} />

            <CheckoutReviewInfo
              formData={formData}
              onEdit={handleBackToInfo}
              t={t}
            />

            <CheckoutPrepTimeCard
              estimatedPrepTime={estimatedPrepTime}
              t={t}
            />
          </div>

          <div className="sticky bottom-0 bg-black/85 backdrop-blur-xl border-t border-white/10 pt-4 pb-4 -mx-4 px-4">
            <PaymentMethodSelector
              paymentMethod="card"
              onPaymentMethodChange={() => {}}
              finalTotal={finalTotal}
              isProcessing={isProcessing}
              onPlaceOrder={handleCardPayment}
              onBack={handleBackToInfo}
            />
          </div>
        </>
      )}
    </div>
  );
}
