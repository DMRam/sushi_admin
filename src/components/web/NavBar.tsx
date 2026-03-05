import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useUserProfile, UserRole } from "../../context/UserProfileContext";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    BarChart3,
    ChefHat,
    ShoppingCart,
    Package,
    Boxes,
    TrendingUp,
    Shield,
    User as UserIcon,
    LogOut,
    Menu,
    X,
} from "lucide-react";

interface NavLink {
    path: string;
    label: string;
    allowedRoles: UserRole[];
    icon: React.ComponentType<{ className?: string }>;
}

// Simple super admin check function
const isSuperAdmin = (email: string): boolean => {
    const superAdminEmails = [
        "admin@sushi.com",
        "superadmin@sushi.com",
        // Add other super admin emails here
    ];
    return superAdminEmails.includes(email.toLowerCase());
};

function initials(nameOrEmail?: string) {
    const s = String(nameOrEmail ?? "").trim();
    if (!s) return "U";
    const parts = s.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return s.slice(0, 2).toUpperCase();
}

function roleBadge(role: UserRole) {
    switch (role) {
        case UserRole.ADMIN:
            return "bg-violet-50 text-violet-700 border-violet-200";
        case UserRole.MANAGER:
            return "bg-amber-50 text-amber-800 border-amber-200";
        case UserRole.STAFF:
            return "bg-blue-50 text-blue-700 border-blue-200";
        default:
            return "bg-gray-50 text-gray-700 border-gray-200";
    }
}

export default function NavBar() {
    const { user, logout } = useAuth();
    const { userProfile, loading } = useUserProfile();
    const loc = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { t } = useTranslation();

    // Role resolution (profile > superadmin email > viewer)
    const userRole: UserRole = useMemo(() => {
        if (userProfile?.role) return userProfile.role;
        if (user?.email && isSuperAdmin(user.email)) return UserRole.ADMIN;
        return UserRole.VIEWER;
    }, [userProfile?.role, user?.email]);

    const navLinks: NavLink[] = useMemo(
        () => [
            {
                path: "/admin/sales-tracking",
                label: t("nav.salesTracking", "Sales"),
                allowedRoles: [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN, UserRole.VIEWER],
                icon: BarChart3,
            },
            {
                path: "/admin/kitchen",
                label: t("nav.kitchen", "Kitchen"),
                allowedRoles: [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN, UserRole.VIEWER],
                icon: ChefHat,
            },
            {
                path: "/admin/purchases",
                label: t("nav.purchases", "Purchases"),
                allowedRoles: [UserRole.MANAGER, UserRole.ADMIN],
                icon: ShoppingCart,
            },
            {
                path: "/admin/products",
                label: t("nav.products", "Products"),
                allowedRoles: [UserRole.MANAGER, UserRole.ADMIN, UserRole.VIEWER],
                icon: Package,
            },
            {
                path: "/admin/stock",
                label: t("nav.stock", "Stock"),
                allowedRoles: [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN, UserRole.VIEWER],
                icon: Boxes,
            },
            {
                path: "/admin/cost-analysis",
                label: t("nav.costAnalysis", "Cost"),
                allowedRoles: [UserRole.MANAGER, UserRole.ADMIN],
                icon: TrendingUp,
            },
            {
                path: "/admin/business-analytics",
                label: t("nav.businessAnalytics", "Analytics"),
                allowedRoles: [UserRole.MANAGER, UserRole.ADMIN],
                icon: TrendingUp,
            },
            {
                path: "/admin/admin",
                label: t("nav.admin", "Admin"),
                allowedRoles: [UserRole.ADMIN],
                icon: Shield,
            },
        ],
        [t]
    );

    const filteredNavLinks = useMemo(
        () => navLinks.filter((link) => link.allowedRoles.includes(userRole)),
        [navLinks, userRole]
    );

    const displayName = userProfile?.displayName || user?.email?.split("@")[0] || "User";

    // Close mobile menu on route change
    useEffect(() => {
        setIsMenuOpen(false);
    }, [loc.pathname]);

    const handleLogout = async () => {
        try {
            await logout();
            setIsMenuOpen(false);
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    const isActive = (path: string) =>
        loc.pathname === path || loc.pathname.startsWith(path + "/") || loc.pathname.startsWith(path);

    // Enhanced desktop link classes
    const desktopLinkClass = (active: boolean) =>
        [
            "relative inline-flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors",
            active
                ? "text-blue-700"
                : "text-gray-600 hover:text-gray-900",
        ].join(" ");

    // Add active indicator underline
    const activeIndicator = (active: boolean) =>
        active ? "after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-blue-600 after:rounded-full" : "";

    const mobileLinkClass = (active: boolean) =>
        [
            "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
            active
                ? "bg-blue-50 text-blue-700"
                : "text-gray-700 hover:bg-gray-50",
        ].join(" ");

    if (!user) return null;

    return (
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
            <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-18 items-center justify-between">
                    {/* Logo and Brand */}
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900 text-white font-semibold text-lg">
                            S
                        </div>
                        <div className="hidden sm:block">
                            <div className="text-sm font-semibold text-gray-900">Sushi Admin</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                    className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${roleBadge(
                                        userRole
                                    )}`}
                                >
                                    {String(userRole)}
                                </span>
                                {!userProfile && !loading && (
                                    <span className="text-[10px] text-gray-400">No profile</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Desktop Navigation - Centered */}
                    <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
                        {filteredNavLinks.map((link) => {
                            const active = isActive(link.path);
                            const Icon = link.icon;
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`${desktopLinkClass(active)} ${activeIndicator(active)}`}
                                    aria-current={active ? "page" : undefined}
                                >
                                    <Icon className={`h-4 w-4 ${active ? "text-blue-700" : "text-gray-400"}`} />
                                    <span>{link.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right Actions */}
                    <div className="flex items-center gap-3">
                        {/* Profile Menu - Desktop */}
                        <div className="hidden md:block">
                            <Link
                                to="/admin/profile"
                                className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 hover:bg-gray-50 transition-colors group"
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white text-sm font-medium">
                                    {initials(displayName)}
                                </div>
                                <div className="max-w-[120px]">
                                    <div className="truncate text-sm font-medium text-gray-700 group-hover:text-gray-900">
                                        {displayName}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {String(userRole).toLowerCase()}
                                    </div>
                                </div>
                            </Link>
                        </div>

                        {/* Logout Button - Desktop */}
                        <button
                            onClick={handleLogout}
                            className="hidden md:inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                            title="Sign out"
                        >
                            <LogOut className="h-4 w-4 text-gray-400" />
                        </button>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMenuOpen((v) => !v)}
                            className="md:hidden inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50 transition-colors"
                            aria-label="Toggle menu"
                        >
                            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden border-t border-gray-100 py-4">
                        {/* User Info */}
                        <div className="flex items-center gap-3 px-2 pb-4 mb-2 border-b border-gray-100">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white text-base font-medium">
                                {initials(displayName)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">{displayName}</div>
                                <div className="text-sm text-gray-500 truncate">{user.email}</div>
                            </div>
                            <span
                                className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${roleBadge(
                                    userRole
                                )}`}
                            >
                                {String(userRole)}
                            </span>
                        </div>

                        {/* Mobile Navigation Links */}
                        <nav className="space-y-1 px-2">
                            {filteredNavLinks.map((link) => {
                                const active = isActive(link.path);
                                const Icon = link.icon;
                                return (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        className={mobileLinkClass(active)}
                                    >
                                        <Icon className={`h-5 w-5 ${active ? "text-blue-700" : "text-gray-400"}`} />
                                        <span>{link.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Mobile Actions */}
                        <div className="mt-4 pt-4 border-t border-gray-100 px-2 space-y-2">
                            <Link
                                to="/admin/profile"
                                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <UserIcon className="h-5 w-5 text-gray-400" />
                                <span>{t("nav.profile", "Profile")}</span>
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <LogOut className="h-5 w-5 text-red-400" />
                                <span>{t("nav.logout", "Sign out")}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}