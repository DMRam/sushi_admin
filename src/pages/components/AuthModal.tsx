import type React from "react";
import { Link } from "react-router-dom";
import { Gift, LayoutDashboard, Lock, Mail, Phone, User, X } from "lucide-react";

interface AuthModalProps {
  isLoginMode: boolean;
  setIsLoginMode: (val: boolean) => void;
  authForm: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  setAuthForm: React.Dispatch<
    React.SetStateAction<{
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone: string;
    }>
  >;
  handleLogin: (e: React.FormEvent) => void;
  handleSignup: (e: React.FormEvent) => void;
  isAuthLoading: boolean;
  authError: string;
  setAuthError: (val: string) => void;
  setShowAuthModal: (val: boolean) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isLoginMode,
  setIsLoginMode,
  authForm,
  setAuthForm,
  handleLogin,
  handleSignup,
  isAuthLoading,
  authError,
  setAuthError,
  setShowAuthModal,
}) => {
  const title = isLoginMode ? "MaiSushi account" : "Create your account";
  const subtitle = isLoginMode
    ? "Sign in to track rewards, reorder faster, and keep your checkout details ready."
    : "Join MaiSushi rewards and start building points from your orders.";

  const updateField = (field: keyof typeof authForm, value: string) => {
    setAuthForm((current) => ({ ...current, [field]: value }));
  };

  const switchMode = (mode: boolean) => {
    setIsLoginMode(mode);
    setAuthError("");
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/72 p-4 backdrop-blur-md"
      onClick={() => setShowAuthModal(false)}
    >
      <div
        className="relative w-full max-w-lg border border-white/12 bg-[#070707] p-5 text-white shadow-2xl shadow-black/50 sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setShowAuthModal(false)}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center text-white/55 transition hover:bg-white/8 hover:text-white"
          aria-label="Close account dialog"
        >
          <X size={22} />
        </button>

        <div className="pr-12">
          <div className="mb-5 inline-flex items-center gap-2 border border-[#F45D4F]/35 bg-[#F45D4F]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#ff8a7b]">
            <Gift size={16} />
            Rewards
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-white/58">{subtitle}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 border border-white/10 bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => switchMode(true)}
            className={[
              "px-4 py-3 text-sm font-semibold transition",
              isLoginMode ? "bg-white text-slate-950" : "text-white/58 hover:text-white",
            ].join(" ")}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => switchMode(false)}
            className={[
              "px-4 py-3 text-sm font-semibold transition",
              !isLoginMode ? "bg-white text-slate-950" : "text-white/58 hover:text-white",
            ].join(" ")}
          >
            Create account
          </button>
        </div>

        {authError && (
          <div className="mt-4 border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100">
            {authError}
          </div>
        )}

        <form onSubmit={isLoginMode ? handleLogin : handleSignup} className="mt-5 space-y-3">
          {!isLoginMode && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                icon={<User size={18} />}
                placeholder="First name"
                value={authForm.firstName}
                onChange={(value) => updateField("firstName", value)}
                required
              />
              <Field
                icon={<User size={18} />}
                placeholder="Last name"
                value={authForm.lastName}
                onChange={(value) => updateField("lastName", value)}
                required
              />
            </div>
          )}

          {!isLoginMode && (
            <Field
              icon={<Phone size={18} />}
              placeholder="Phone"
              value={authForm.phone}
              onChange={(value) => updateField("phone", value)}
              type="tel"
              required
            />
          )}

          <Field
            icon={<Mail size={18} />}
            placeholder="Email"
            value={authForm.email}
            onChange={(value) => updateField("email", value)}
            type="email"
            required
          />
          <Field
            icon={<Lock size={18} />}
            placeholder="Password"
            value={authForm.password}
            onChange={(value) => updateField("password", value)}
            type="password"
            required
            minLength={6}
          />

          <button
            type="submit"
            disabled={isAuthLoading}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 bg-[#F45D4F] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#de4f43] disabled:cursor-wait disabled:opacity-60"
          >
            <LayoutDashboard size={18} />
            {isAuthLoading ? "Please wait..." : isLoginMode ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-5 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <span>{isLoginMode ? "New to MaiSushi rewards?" : "Already have an account?"}</span>
          <button
            type="button"
            onClick={() => switchMode(!isLoginMode)}
            className="text-left font-semibold text-white transition hover:text-[#ff8a7b]"
          >
            {isLoginMode ? "Create an account" : "Sign in instead"}
          </button>
        </div>

        <Link
          to="/client-dashboard"
          onClick={() => setShowAuthModal(false)}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 border border-white/12 px-5 py-3 text-sm font-semibold text-white/72 transition hover:bg-white/8 hover:text-white"
        >
          <LayoutDashboard size={18} />
          Open rewards dashboard
        </Link>
      </div>
    </div>
  );
};

function Field({
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  minLength,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="flex items-center gap-3 border border-white/10 bg-black px-4 py-3 text-white transition focus-within:border-[#F45D4F]">
      <span className="text-white/42">{icon}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
      />
    </label>
  );
}
