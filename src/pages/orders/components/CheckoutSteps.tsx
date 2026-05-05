type Props = {
  currentStep: "info" | "review";
  t: (key: string, fallback?: string) => string;
};

export default function CheckoutSteps({ currentStep, t }: Props) {
  return (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center">
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-full ${
            currentStep === "info" ? "bg-[#E62B2B] text-white" : "bg-white/10 text-white/60"
          }`}
        >
          1
        </div>
        <div className={`ml-2 text-sm ${currentStep === "info" ? "text-white" : "text-white/60"}`}>
          {t("checkoutPage.information", "Information")}
        </div>
      </div>

      <div className="w-12 h-0.5 bg-white/20 mx-4" />

      <div className="flex items-center">
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-full ${
            currentStep === "review" ? "bg-[#E62B2B] text-white" : "bg-white/10 text-white/60"
          }`}
        >
          2
        </div>
        <div className={`ml-2 text-sm ${currentStep === "review" ? "text-white" : "text-white/60"}`}>
          {t("checkoutPage.review", "Review & Pay")}
        </div>
      </div>
    </div>
  );
}