import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function EmptyCart() {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="container mx-auto px-6 text-center">
                <div className="max-w-md mx-auto">
                    <svg className="w-16 h-16 text-white/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h2 className="text-2xl font-light text-white mb-3 tracking-wide">{t("checkoutPage.emptyCart", "Your cart is empty")}</h2>
                    <p className="text-white/60 mb-6 font-light tracking-wide text-sm">{t("checkoutPage.emptyCartDescription", "Add some delicious sushi to get started!")}</p>
                    <Link to="/order" className="border border-white text-white px-6 py-3 rounded-sm hover:bg-white hover:text-gray-900 transition-all text-sm">
                        {t("checkoutPage.browseMenu", "Browse Menu")}
                    </Link>
                </div>
            </div>
        </div>
    );
}