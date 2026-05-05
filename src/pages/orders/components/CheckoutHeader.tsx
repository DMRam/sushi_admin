import { Link } from "react-router-dom";

type Props = {
  user: any;
  isLoadingUser: boolean;
  onLogout: () => void;
  onLoginClick: () => void;
  banner: React.ReactNode;
  t: (key: string, fallback?: string) => string;
};

export default function CheckoutHeader({
  user,
  isLoadingUser,
  onLogout,
  onLoginClick,
  banner,
  t,
}: Props) {
  return (
    <header className="mb-6">
      <Link
        to="/order"
        className="inline-flex items-center text-white/60 hover:text-white transition-colors mb-3 text-sm"
      >
        <span className="mr-2">←</span>
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
            onClick={onLoginClick}
            className="text-white/60 hover:text-white text-sm border border-white/20 px-3 py-1 rounded-sm"
            type="button"
          >
            {t("header.signIn", "Sign In")}
          </button>
        )}
      </div>

      <div className="mb-4 bg-white/5 border border-white/10 rounded-xl p-4">
        <p className="text-white text-sm font-medium">
          🔥 {t("checkoutPage.webPickupDeal", "Online pickup deal")}
        </p>
        <p className="text-white/60 text-sm mt-1">
          {t(
            "checkoutPage.webPickupDealDescription",
            "Use code MAISUSHI10 and get 10% off pickup orders over $25."
          )}
        </p>
      </div>

      {banner}
    </header>
  );
}