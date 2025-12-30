import React from "react";

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
  const handleModalClick = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={() => setShowAuthModal(false)}
    >
      <div
        className="bg-gray-800 border border-white/10 rounded-sm p-6 w-full max-w-md"
        onClick={handleModalClick}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-light text-white">
            {isLoginMode ? "Sign In" : "Create Account"}
          </h3>
          <button
            onClick={() => setShowAuthModal(false)}
            className="text-white/60 hover:text-white"
            type="button"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {authError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-sm p-3 mb-4">
            <p className="text-red-400 text-sm">{authError}</p>
          </div>
        )}

        <form onSubmit={isLoginMode ? handleLogin : handleSignup}>
          <div className="space-y-4">
            {!isLoginMode && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={authForm.firstName}
                    onChange={(e) =>
                      setAuthForm((p) => ({ ...p, firstName: e.target.value }))
                    }
                    className="bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-white/30"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={authForm.lastName}
                    onChange={(e) =>
                      setAuthForm((p) => ({ ...p, lastName: e.target.value }))
                    }
                    className="bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-white/30"
                    required
                  />
                </div>
                <input
                  type="tel"
                  placeholder="Phone"
                  value={authForm.phone}
                  onChange={(e) =>
                    setAuthForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  className="bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-white/30 w-full"
                  required
                />
              </>
            )}

            <input
              type="email"
              placeholder="Email"
              value={authForm.email}
              onChange={(e) =>
                setAuthForm((p) => ({ ...p, email: e.target.value }))
              }
              className="bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-white/30 w-full"
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(e) =>
                setAuthForm((p) => ({ ...p, password: e.target.value }))
              }
              className="bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-white/30 w-full"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={isAuthLoading}
            className="bg-white text-gray-900 px-4 py-3 rounded-sm hover:bg-white/90 transition-all duration-300 font-light tracking-wide text-sm w-full mt-6 disabled:opacity-50"
          >
            {isAuthLoading
              ? "Please wait..."
              : isLoginMode
              ? "Sign In"
              : "Create Account"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setAuthError("");
            }}
            className="text-white/60 hover:text-white text-sm"
            type="button"
          >
            {isLoginMode
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>

        {!isLoginMode && (
          <p className="text-white/40 text-xs text-center mt-4">
            Create an account to earn points and save your information for
            faster checkout.
          </p>
        )}
      </div>
    </div>
  );
};
