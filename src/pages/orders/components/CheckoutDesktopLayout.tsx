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
    <div className="hidden lg:grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-8 items-start">
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
                className="bg-white text-gray-900 px-8 py-3 rounded-sm hover:bg-white/90 transition-all text-sm font-medium"
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

      <aside className="w-full max-w-[360px] space-y-4 sticky top-6 self-start">
        <div className="w-full overflow-hidden rounded-xl">
          <OrderSummary {...orderSummaryProps} />
        </div>

        <div className="w-full">
          <CheckoutPromoBox {...promoProps} compact />
        </div>
      </aside>
    </div>
  );
}