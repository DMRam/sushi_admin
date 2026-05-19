type Props = {
  currentStep: "info" | "review";
  t: (key: string, fallback?: string) => string;
};

export default function CheckoutSteps({ currentStep, t }: Props) {
  return (
    <div className="flex items-center justify-center mb-8 border border-white/10 bg-black/20 px-4 py-4">
      <div className="flex items-center">
        <div
          className={`flex items-center justify-center w-8 h-8 ${
            currentStep === "info" ? "bg-[#f26350] text-white" : "bg-white/10 text-white/60"
          }`}
        >
          1
        </div>
        <div className={`ml-2 text-xs font-bold uppercase tracking-[0.14em] ${currentStep === "info" ? "text-white" : "text-white/45"}`}>
          {t("checkoutPage.information", "Information")}
        </div>
      </div>

      <div className="w-12 h-0.5 bg-white/20 mx-4" />

      <div className="flex items-center">
        <div
          className={`flex items-center justify-center w-8 h-8 ${
            currentStep === "review" ? "bg-[#f26350] text-white" : "bg-white/10 text-white/60"
          }`}
        >
          2
        </div>
        <div className={`ml-2 text-xs font-bold uppercase tracking-[0.14em] ${currentStep === "review" ? "text-white" : "text-white/45"}`}>
          {t("checkoutPage.review", "Review & Pay")}
        </div>
      </div>
    </div>
  );
}
