import CustomerInformation from "../CustomerInformation";
import OrderSummary from "../../../components/web/OrderSummary";
import PaymentMethodSelector from "../PaymentMethodSelector";
import CheckoutPromoBox from "./CheckoutPromoBox";

type Props = any;

export default function CheckoutDesktopLayout({
  currentStep,
  formData,
  onInputChange,
  errors,
  t,
  orderSummaryProps,
  promoProps,
  finalTotal,
  isProcessing,
  handleCardPayment,
  handleBackToInfo,
}: Props) {
  return (
    <div className="hidden lg:grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-8 items-start">
      <div className="min-w-0 space-y-6">
        {currentStep === "info" ? (
          <>
            <CustomerInformation
              formData={formData}
              onInputChange={onInputChange}
              errors={errors}
              t={t}
            />

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="bg-[#f26350] px-8 py-4 text-[12px] font-extrabold uppercase tracking-[0.1em] text-white shadow-lg shadow-[#f26350]/20 transition-all hover:bg-[#ff725f]"
              >
                {t("checkoutPage.continueReview", "Continue to Review")}
              </button>
            </div>
          </>
        ) : (
          <PaymentMethodSelector
            paymentMethod="card"
            onPaymentMethodChange={() => { }}
            finalTotal={finalTotal}
            isProcessing={isProcessing}
            onPlaceOrder={handleCardPayment}
            onBack={handleBackToInfo}
          />
        )}
      </div>

      <aside className="w-full max-w-[420px] space-y-4 sticky top-[132px] self-start">
        <div className="w-full overflow-hidden">
          <OrderSummary {...orderSummaryProps} />
        </div>

        <div className="w-full">
          <CheckoutPromoBox {...promoProps} compact />
        </div>
      </aside>
    </div>
  );
}
