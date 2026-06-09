import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { HashLink } from "react-router-hash-link";
import { useTranslation } from "react-i18next";
import { CalendarDays, Menu, X, LayoutDashboard, ShoppingCart } from "lucide-react";
import { AuthModal } from "../../components/AuthModal";
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../../firebase/firebase";
import { supabase } from "../../../lib/supabase";
import logo from "../../../assets/logo/final/maisushi-logo-white.svg";
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

    const scrollToSection = (element: HTMLElement) => {
        const headerOffset = 128;
        const top = element.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
    };

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
                    "fixed inset-x-0 top-8 z-[70]",
                    "border-b transition-all duration-300",
                    "bg-[#030303] supports-[backdrop-filter]:backdrop-blur-md",
                    scrolled ? "border-white/10 shadow-xl shadow-black/35" : "border-white/10 shadow-sm",
                ].join(" ")}
            >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-gradient-to-b from-white/[0.06] to-transparent" />

                <div className="relative mx-auto max-w-[1600px] px-5 py-3 overflow-x-clip lg:px-10">
                    <div className="flex h-[52px] items-center justify-between gap-3">
                        <Link to="/" className="flex items-center min-w-0 shrink-0 ml-2 sm:ml-4">
                            <img
                                src={logo}
                                alt="MaiSushi Logo"
                                className="h-[54px] w-auto max-w-[180px] object-contain brightness-110 transition-all duration-300 hover:scale-105 sm:h-[60px] sm:max-w-[210px] lg:max-w-[230px]"
                                loading="eager"
                                decoding="async"
                            />
                        </Link>

                        {/* Desktop */}
                        <nav className="hidden sm:flex items-center gap-5 shrink min-w-0 lg:gap-8">
                            <Link to="/order" className="whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/86 transition-colors duration-300 hover:text-[#f26350]">
                                {t("header.menu", "Menu")}
                            </Link>

                            <Link to="/booking" className="flex items-center gap-1 whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/86 transition-colors duration-300 hover:text-[#f26350]">
                                <CalendarDays size={15} />
                                <span>{t("header.booking", "Booking")}</span>
                            </Link>

                            <HashLink to="/#events" scroll={scrollToSection} className="whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/86 transition-colors duration-300 hover:text-[#f26350]">
                                {t("header.events", "Events")}
                            </HashLink>

                            <HashLink to="/#contact" scroll={scrollToSection} className="whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/86 transition-colors duration-300 hover:text-[#f26350]">
                                {t("header.contact", "Contact")}
                            </HashLink>

                            {user && (
                                <Link to="/client-dashboard" className="flex items-center gap-1 whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/86 transition-colors duration-300 hover:text-[#f26350]">
                                    <LayoutDashboard size={16} />
                                    <span>{t("header.dashboard", "Dashboard")}</span>
                                </Link>
                            )}

                            <Link to="/checkout" className="group relative flex items-center gap-2 whitespace-nowrap text-white/86 transition-colors duration-300 hover:text-[#f26350]">
                                <ShoppingCart size={18} />
                                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em]">{t("header.cart", "Cart")}</span>
                                {itemCount > 0 && (
                                    <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#f26350] text-xs font-bold text-white transition-transform group-hover:scale-110">
                                        {itemCount}
                                    </span>
                                )}
                            </Link>

                            <Link
                                to="/order"
                                className="rounded-[3px] bg-[#f26350] px-7 py-3.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white shadow-lg shadow-[#f26350]/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ff725f]"
                            >
                                {t("header.order", "Order")}
                            </Link>

                            <div className="hidden items-center gap-4 border-l border-white/10 pl-4 xl:flex">
                                {isLoadingUser ? (
                                    <div className="whitespace-nowrap text-xs text-white/45">{t("header.loading", "Loading...")}</div>
                                ) : user ? (
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                            <span className="whitespace-nowrap text-sm font-light text-white/65">
                                                {user.points ?? 0} {t("header.points", "pts")}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="whitespace-nowrap text-sm font-medium text-white/84">
                                                {user.first_name || "User"}
                                            </span>
                                            <button onClick={handleLogout} className="whitespace-nowrap text-xs font-light text-white/50 transition-colors duration-300 hover:text-white/78">
                                                {t("header.logout", "Logout")}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => openAuthModal(true)} className="whitespace-nowrap text-xs font-light text-white/68 transition-colors duration-300 hover:text-white">
                                        {t("header.signIn", "Sign In")}
                                    </button>
                                )}
                            </div>
                        </nav>

                        {/* Mobile */}
                        <div className="flex items-center gap-3 sm:hidden">
                            <Link to="/checkout" className="relative p-2 text-white/82 transition-colors duration-300 hover:text-[#f26350]">
                                <ShoppingCart size={20} />
                                {itemCount > 0 && (
                                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#f26350] text-xs font-bold text-white">
                                        {itemCount}
                                    </span>
                                )}
                            </Link>

                            <button onClick={() => setIsOpen(!isOpen)} className="shrink-0 text-white/82 transition hover:text-[#f26350] focus:outline-none" aria-label="Toggle menu">
                                {isOpen ? <X size={22} /> : <Menu size={22} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div
                    className={[
                        "sm:hidden border-t transition-all duration-300 overflow-hidden",
                        "supports-[backdrop-filter]:backdrop-blur-md",
                        scrolled ? "bg-[#050505]/96 border-white/10" : "bg-[#050505]/92 border-white/10",
                        isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
                    ].join(" ")}
                >
                    <div className="flex flex-col px-4 py-4 space-y-4">
                        <Link to="/order" onClick={() => setIsOpen(false)} className="text-sm font-semibold uppercase tracking-[0.16em] text-white/82 transition hover:text-[#f26350]">
                            {t("header.menu", "Menu")}
                        </Link>

                        <Link to="/booking" onClick={() => setIsOpen(false)} className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-white/82 transition hover:text-[#f26350]">
                            <CalendarDays size={16} />
                            <span>{t("header.booking", "Booking")}</span>
                        </Link>

                        <HashLink to="/#events" scroll={scrollToSection} onClick={() => setIsOpen(false)} className="text-sm font-semibold uppercase tracking-[0.16em] text-white/82 transition hover:text-[#f26350]">
                            {t("header.events", "Events")}
                        </HashLink>

                        <HashLink to="/#contact" scroll={scrollToSection} onClick={() => setIsOpen(false)} className="text-sm font-semibold uppercase tracking-[0.16em] text-white/82 transition hover:text-[#f26350]">
                            {t("header.contact", "Contact")}
                        </HashLink>

                        <Link
                            to="/checkout"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-between border-t border-white/10 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-white/82 transition hover:text-[#f26350]"
                        >
                            <div className="flex items-center gap-2">
                                <ShoppingCart size={16} />
                                <span>{t("header.cart", "Cart")}</span>
                            </div>
                            {itemCount > 0 && (
                                <span className="min-w-6 rounded-full bg-[#f26350] px-2 py-1 text-center text-xs text-white">
                                    {itemCount} {t("header.items", "items")}
                                </span>
                            )}
                        </Link>

                        {user && (
                            <Link to="/client-dashboard" onClick={() => setIsOpen(false)} className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-white/82 transition hover:text-[#f26350]">
                                <LayoutDashboard size={16} />
                                <span>{t("header.dashboard", "Dashboard")}</span>
                            </Link>
                        )}

                        {isLoadingUser ? (
                            <div className="border-t border-white/10 pt-3 text-xs text-white/45">{t("header.loading", "Loading...")}</div>
                        ) : user ? (
                            <div className="space-y-3 border-t border-white/10 pt-3">
                                <div className="flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-sm font-light text-white/65">
                                        {user.points ?? 0} {t("header.points", "pts")}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-white/84">{user.first_name || "User"}</span>
                                </div>

                                <button onClick={handleLogout} className="w-full border-t border-white/10 pt-2 text-left text-xs font-light text-white/50 transition hover:text-white/78">
                                    {t("header.logout", "Logout")}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    openAuthModal(true);
                                    setIsOpen(false);
                                }}
                                className="border-t border-white/10 pt-3 text-left text-xs font-light text-white/68 transition hover:text-white"
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
