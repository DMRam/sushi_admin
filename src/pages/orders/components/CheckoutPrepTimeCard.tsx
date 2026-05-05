import { ChefHat } from "lucide-react";

type Props = {
  estimatedPrepTime: number;
  t: (key: string, fallback?: string) => string;
};

export default function CheckoutPrepTimeCard({ estimatedPrepTime, t }: Props) {
  return (
    <div className="bg-gradient-to-r from-[#E62B2B]/10 to-[#ff6b6b]/10 border border-[#E62B2B]/20 rounded-sm p-4">
      <div className="flex items-center gap-3">
        <ChefHat className="w-5 h-5 text-[#E62B2B]" />

        <div>
          <p className="text-white font-medium text-sm">
            {t("checkoutPage.estimatedTime", "Estimated Preparation Time")}
          </p>
          <p className="text-white/60 text-sm">
            {t("checkoutPage.readyIn", "Ready in approximately")}{" "}
            <strong>{estimatedPrepTime} minutes</strong>
          </p>
        </div>
      </div>
    </div>
  );
}