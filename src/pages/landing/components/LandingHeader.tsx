import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X, LayoutDashboard, ShoppingCart } from "lucide-react";
import { AuthModal } from "../../components/AuthModal";
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../../firebase/firebase";
import { supabase } from "../../../lib/supabase";
import logo from "../../../assets/logo/final/maisushi-logo-color.svg";
import { useCartStore } from "../../../stores/cartStore";

interface UserProfile {
    id: string; // client_profiles.id
    firebase_uid: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    points: number; // ✅ user_points.points
    address?: string;
    city?: string;
    zip_code?: string;
}

type ClientProfileRow = {
    id: string;
    firebase_uid: string;
    email: string;
    full_name?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    zip_code?: string | null;
    points?: number | null;       // exists in your schema
    total_points?: number | null; // exists too
};

type UserPointsRow = {
    user_id: string;
    points: number;
};

export const LandingHeader = () => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    // scroll state
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // cart
    const cart = useCartStore((state) => state.cart);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    // user
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);

    // auth modal
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [authForm, setAuthForm] = useState({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phone: "",
    });
    const [isAuthLoading, setIsAuthLoading] = useState(false);
    const [authError, setAuthError] = useState("");

    const splitName = (fullName: string) => {
        const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
        return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") || "" };
    };

    // ✅ YOUR schema: user_points.points
    const fetchPoints = useCallback(async (clientProfileId: string, fallbackClientPoints?: number | null) => {
        const { data, error } = await supabase
            .from("user_points")
            .select("points")
            .eq("user_id", clientProfileId)
            .maybeSingle<UserPointsRow>();

        if (error) {
            console.warn("⚠️ Could not fetch user_points.points. Using fallback.", error);
            return Number(fallbackClientPoints ?? 0) || 0;
        }

        // if row doesn't exist yet
        if (!data) return Number(fallbackClientPoints ?? 0) || 0;

        return Number(data.points ?? 0) || 0;
    }, []);

    const fetchUserProfile = useCallback(
        async (firebaseUid: string) => {
            setIsLoadingUser(true);
            try {
                const { data: clientProfile, error } = await supabase
                    .from("client_profiles")
                    .select("id,firebase_uid,email,full_name,phone,address,city,zip_code,points,total_points")
                    .eq("firebase_uid", firebaseUid)
                    .single<ClientProfileRow>();

                if (error || !clientProfile) {
                    console.error("Error fetching client profile:", error);
                    setUser(null);
                    setIsLoadingUser(false);
                    return;
                }

                const { firstName, lastName } = splitName(clientProfile.full_name || "");

                // ✅ prefer user_points.points, fallback to client_profiles.points
                const fallbackPoints = clientProfile.points ?? clientProfile.total_points ?? 0;
                const points = await fetchPoints(clientProfile.id, fallbackPoints);

                setUser({
                    id: clientProfile.id,
                    firebase_uid: clientProfile.firebase_uid,
                    email: clientProfile.email,
                    first_name: firstName,
                    last_name: lastName,
                    phone: clientProfile.phone || "",
                    points,
                    address: clientProfile.address || undefined,
                    city: clientProfile.city || undefined,
                    zip_code: clientProfile.zip_code || undefined,
                });

                setIsLoadingUser(false);
            } catch (err) {
                console.error("Error fetching user profile:", err);
                setUser(null);
                setIsLoadingUser(false);
            }
        },
        [fetchPoints]
    );

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) await fetchUserProfile(firebaseUser.uid);
            else {
                setUser(null);
                setIsLoadingUser(false);
            }
        });
        return () => unsubscribe();
    }, [fetchUserProfile]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAuthLoading(true);
        setAuthError("");
        try {
            const { signInWithEmailAndPassword } = await import("firebase/auth");
            const cred = await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
            await fetchUserProfile(cred.user.uid);

            setShowAuthModal(false);
            setAuthForm({ email: "", password: "", firstName: "", lastName: "", phone: "" });
        } catch (error: any) {
            console.error("Login error:", error);
            setAuthError(error.message || "Login failed");
        } finally {
            setIsAuthLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAuthLoading(true);
        setAuthError("");

        try {
            const cred = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
            const firebaseUser = cred.user;

            const fullName = `${authForm.firstName} ${authForm.lastName}`.trim();

            // ✅ Do NOT send points fields here unless you want them
            const profileData = {
                firebase_uid: firebaseUser.uid,
                email: authForm.email,
                full_name: fullName,
                phone: authForm.phone,
                created_at: new Date().toISOString(),
            };

            const { data: clientProfile, error: profileError } = await supabase
                .from("client_profiles")
                .insert(profileData)
                .select("id,firebase_uid,email,full_name,phone,address,city,zip_code,points,total_points")
                .single<ClientProfileRow>();

            if (profileError || !clientProfile) {
                console.error("Supabase profile error:", profileError);
                await firebaseUser.delete();
                throw profileError || new Error("Profile creation failed");
            }

            // ✅ Ensure user_points row exists for this user_id (your table has UNIQUE user_id ✅)
            const { error: upsertErr } = await supabase
                .from("user_points")
                .upsert({ user_id: clientProfile.id, points: 0 }, { onConflict: "user_id" });

            if (upsertErr) {
                console.warn("⚠️ user_points upsert failed (non-fatal):", upsertErr);
            }

            await fetchUserProfile(firebaseUser.uid);

            setShowAuthModal(false);
            setAuthForm({ email: "", password: "", firstName: "", lastName: "", phone: "" });
        } catch (error: any) {
            console.error("Signup error:", error);
            if (error?.code === "auth/email-already-in-use") {
                setAuthError("This email is already registered. Please sign in instead.");
            } else {
                setAuthError(error?.message || "Signup failed. Please try again.");
            }
        } finally {
            setIsAuthLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            setIsOpen(false);
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    const openAuthModal = (loginMode: boolean = true) => {
        setIsLoginMode(loginMode);
        setShowAuthModal(true);
        setAuthError("");
        if (loginMode) setAuthForm((prev) => ({ ...prev, firstName: "", lastName: "", phone: "" }));
    };

    return (
        <>
            <header
                className={[
                    "fixed inset-x-0 top-0 z-40",
                    "border-b transition-all duration-300",
                    "supports-[backdrop-filter]:backdrop-blur-md",
                    scrolled ? "bg-white/92 border-gray-200 shadow-md" : "bg-white/80 border-gray-100 shadow-sm",
                ].join(" ")}
            >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-gradient-to-b from-white/40 to-transparent" />

                <div className="relative w-full px-3 sm:px-4 md:px-8 py-3 overflow-x-clip">
                    <div className="flex items-center justify-between gap-3">
                        <Link to="/" className="flex items-center min-w-0 shrink-0 ml-2 sm:ml-4">
                            <img
                                src={logo}
                                alt="MaiSushi Logo"
                                className="h-12 sm:h-14 lg:h-16 w-auto max-w-[180px] sm:max-w-[220px] lg:max-w-[260px] object-contain transition-all duration-300 hover:scale-105"
                                loading="eager"
                                decoding="async"
                            />
                        </Link>

                        {/* Desktop */}
                        <nav className="hidden md:flex items-center gap-8 shrink min-w-0">
                            <Link to="/order" className="text-gray-700 hover:text-red-600 text-sm font-light transition-colors duration-300 whitespace-nowrap">
                                {t("header.menu", "Menu")}
                            </Link>

                            <a href="#contact" className="text-gray-700 hover:text-red-600 text-sm font-light transition-colors duration-300 whitespace-nowrap">
                                {t("header.contact", "Contact")}
                            </a>

                            {user && (
                                <Link to="/client-dashboard" className="text-gray-700 hover:text-red-600 text-sm font-light transition-colors duration-300 flex items-center gap-1 whitespace-nowrap">
                                    <LayoutDashboard size={16} />
                                    <span>Dashboard</span>
                                </Link>
                            )}

                            <Link to="/checkout" className="relative text-gray-700 hover:text-red-600 transition-colors duration-300 flex items-center gap-2 whitespace-nowrap group">
                                <ShoppingCart size={18} />
                                <span className="text-sm font-light">Cart</span>
                                {itemCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium group-hover:scale-110 transition-transform">
                                        {itemCount}
                                    </span>
                                )}
                            </Link>

                            <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
                                {isLoadingUser ? (
                                    <div className="text-xs text-gray-400 whitespace-nowrap">Loading...</div>
                                ) : user ? (
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                            <span className="text-sm text-gray-600 font-light whitespace-nowrap">
                                                {user.points ?? 0} {t("header.points", "pts")}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-700 font-medium whitespace-nowrap">
                                                {user.first_name || "User"}
                                            </span>
                                            <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-gray-700 transition-colors duration-300 font-light whitespace-nowrap">
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => openAuthModal(true)} className="text-xs text-gray-600 hover:text-gray-800 transition-colors duration-300 font-light whitespace-nowrap">
                                        {t("header.signIn", "Sign In")}
                                    </button>
                                )}
                            </div>
                        </nav>

                        {/* Mobile */}
                        <div className="flex items-center gap-3 md:hidden">
                            <Link to="/checkout" className="relative text-gray-700 hover:text-red-600 transition-colors duration-300 p-2">
                                <ShoppingCart size={20} />
                                {itemCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
                                        {itemCount}
                                    </span>
                                )}
                            </Link>

                            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-700 hover:text-red-600 focus:outline-none transition shrink-0" aria-label="Toggle menu">
                                {isOpen ? <X size={22} /> : <Menu size={22} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div
                    className={[
                        "md:hidden border-t transition-all duration-300 overflow-hidden",
                        "supports-[backdrop-filter]:backdrop-blur-md",
                        scrolled ? "bg-white/92 border-gray-200" : "bg-white/85 border-gray-100",
                        isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
                    ].join(" ")}
                >
                    <div className="flex flex-col px-4 py-4 space-y-4">
                        <Link to="/order" onClick={() => setIsOpen(false)} className="text-gray-700 hover:text-red-600 text-sm font-light transition">
                            {t("header.menu", "Menu")}
                        </Link>

                        <a href="#contact" onClick={() => setIsOpen(false)} className="text-gray-700 hover:text-red-600 text-sm font-light transition">
                            {t("header.contact", "Contact")}
                        </a>

                        <Link
                            to="/checkout"
                            onClick={() => setIsOpen(false)}
                            className="text-gray-700 hover:text-red-600 text-sm font-light transition flex items-center justify-between py-2 border-t border-gray-200"
                        >
                            <div className="flex items-center gap-2">
                                <ShoppingCart size={16} />
                                <span>Cart</span>
                            </div>
                            {itemCount > 0 && (
                                <span className="bg-red-600 text-white text-xs rounded-full px-2 py-1 min-w-6 text-center">
                                    {itemCount} items
                                </span>
                            )}
                        </Link>

                        {user && (
                            <Link to="/client-dashboard" onClick={() => setIsOpen(false)} className="text-gray-700 hover:text-red-600 text-sm font-light transition flex items-center gap-2">
                                <LayoutDashboard size={16} />
                                <span>Dashboard</span>
                            </Link>
                        )}

                        {isLoadingUser ? (
                            <div className="pt-3 border-t border-gray-200 text-xs text-gray-400">Loading...</div>
                        ) : user ? (
                            <div className="pt-3 border-t border-gray-200 space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-sm text-gray-600 font-light">
                                        {user.points ?? 0} {t("header.points", "pts")}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700 font-medium">{user.first_name || "User"}</span>
                                </div>

                                <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-gray-700 font-light transition text-left w-full pt-2 border-t border-gray-200">
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    openAuthModal(true);
                                    setIsOpen(false);
                                }}
                                className="pt-3 border-t border-gray-200 text-xs text-gray-600 hover:text-gray-800 font-light transition text-left"
                            >
                                {t("header.signIn", "Sign In")}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {showAuthModal && (
                <AuthModal
                    isLoginMode={isLoginMode}
                    setIsLoginMode={setIsLoginMode}
                    authForm={authForm}
                    setAuthForm={setAuthForm}
                    handleLogin={handleLogin}
                    handleSignup={handleSignup}
                    isAuthLoading={isAuthLoading}
                    authError={authError}
                    setAuthError={setAuthError}
                    setShowAuthModal={setShowAuthModal}
                />
            )}
        </>
    );
};