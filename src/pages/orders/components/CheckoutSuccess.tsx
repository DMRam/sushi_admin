import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface CheckoutSuccessProps {
    orderNumber: string;
    pointsEarned: number;
    user: any;
    deliveryMethod: string;
    onBackHome: () => void;
}

export function CheckoutSuccess({ 
    orderNumber, 
    pointsEarned, 
    user, 
    deliveryMethod, 
    onBackHome 
}: CheckoutSuccessProps) {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="container mx-auto px-6">
                <div className="max-w-md mx-auto text-center">
                    <div className="bg-white/5 border border-white/10 rounded-sm p-8 backdrop-blur-sm">
                        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-light text-white mb-3 tracking-wide">
                            {t("checkoutPage.paymentSuccessful", "Payment Successful!")}
                        </h2>

                        {user && pointsEarned > 0 && (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-sm p-4 mb-4">
                                <p className="text-green-400 text-sm font-light">🎉 You earned <strong>{pointsEarned} points</strong>!</p>
                                <p className="text-green-400/60 text-xs mt-1">They'll appear in your profile shortly.</p>
                            </div>
                        )}

                        <div className="bg-white/5 rounded-sm p-4 mb-6 border border-white/10">
                            <p className="text-xs text-white/40 font-light tracking-wide mb-1">{t("checkoutPage.orderNumber", "Order Number")}</p>
                            <p className="text-lg font-light text-white font-mono">{orderNumber}</p>
                        </div>

                        <p className="text-white/60 mb-6 font-light tracking-wide leading-relaxed text-sm">
                            {deliveryMethod === "delivery"
                                ? t("checkoutPage.cashPaymentMessage", "We've received your order. Your sushi will be ready in approximately 20-30 minutes.")
                                : "Your pickup order will be ready in approximately 20-30 minutes."}
                        </p>

                        <div className="flex flex-col gap-3">
                            <Link to="/order" className="border border-white text-white px-4 py-3 rounded-sm hover:bg-white hover:text-gray-900 transition-all text-sm">
                                {t("checkoutPage.orderAgain", "Order Again")}
                            </Link>
                            <button onClick={onBackHome} className="bg-white/5 border border-white/10 text-white px-4 py-3 rounded-sm hover:bg-white/10 transition-all text-sm">
                                {t("checkoutPage.backHome", "Back to Home")}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}