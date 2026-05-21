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
        className="inline-flex items-center text-white/55 hover:text-white transition-colors mb-3 text-sm"
      >
        <span className="mr-2">←</span>
        {t("checkoutPage.backMenu", "Back to Menu")}
      </Link>

      <div className="flex flex-col gap-3 border border-white/10 bg-[#0b0b0b] p-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-light text-white tracking-wide sm:text-2xl">
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
              className="text-white/60 hover:text-white text-sm border border-white/20 px-3 py-2"
              type="button"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={onLoginClick}
            className="text-white/60 hover:text-white text-sm border border-white/20 px-3 py-2"
            type="button"
          >
            {t("header.signIn", "Sign In")}
          </button>
        )}
      </div>

      {banner}
    </header>
  );
}
