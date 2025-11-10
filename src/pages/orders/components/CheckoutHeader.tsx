// components/CheckoutHeader.tsx
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ClientProfile } from "../../../types/types";

interface CheckoutHeaderProps {
    user: ClientProfile | null;
    isLoadingUser: boolean;
    pointsEarned: number;
    banner: React.ReactNode;
    onShowAuthModal: () => void;
    onLogout: () => void;
}

export function CheckoutHeader({ 
    user, 
    isLoadingUser, 
    pointsEarned, 
    banner, 
    onShowAuthModal, 
    onLogout 
}: CheckoutHeaderProps) {
    const { t } = useTranslation();

    return (
        <header className="mb-6">
            <Link
                to="/order"
                className="inline-flex items-center text-white/60 hover:text-white transition-colors mb-3 text-sm"
            >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
                {t("checkoutPage.backMenu", "Back to Menu")}
            </Link>

            <div className="flex justify-between items-center mb-3">
                <h1 className="text-2xl font-light text-white tracking-wide">
                    {t("checkoutPage.checkout", "Checkout")}
                </h1>

                {isLoadingUser ? (
                    <div className="text-white/40 text-sm">Loading...</div>
                ) : user ? (
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-white text-sm">Hello, {user.first_name}</p>
                            <p className="text-white/60 text-xs">{user.points} points</p>
                        </div>
                        <button
                            onClick={onLogout}
                            className="text-white/60 hover:text-white text-sm border border-white/20 px-3 py-1 rounded-sm"
                            type="button"
                        >
                            Logout
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={onShowAuthModal}
                        className="text-white/60 hover:text-white text-sm border border-white/20 px-3 py-1 rounded-sm"
                        type="button"
                    >
                        {t("header.signIn", "Sign In")}
                    </button>
                )}
            </div>

            {user && pointsEarned > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-sm p-3 mb-3">
                    <p className="text-blue-400 text-sm text-center">
                        🎉 You'll earn <strong>{pointsEarned} points</strong> with this order!
                    </p>
                </div>
            )}

            {banner}
        </header>
    );
}