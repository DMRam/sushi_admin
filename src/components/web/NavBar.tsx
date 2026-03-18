import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Menu, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { useUserProfile, UserRole } from "../../context/UserProfileContext";
import BrandBlock from "./navbar/BrandBlock";
import DesktopNav from "./navbar/DesktopNav";
import MobileDrawer from "./navbar/MobileDrawer";
import { buildNavLinks } from "./navbar/navConfig";
import { isActivePath, isSuperAdmin } from "./navbar/utils";

export default function NavBar() {
    const { user, logout } = useAuth();
    const { userProfile, loading } = useUserProfile();
    const loc = useLocation();
    const { t } = useTranslation();

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const userRole: UserRole = useMemo(() => {
        if (userProfile?.role) return userProfile.role;
        if (user?.email && isSuperAdmin(user.email)) return UserRole.ADMIN;
        return UserRole.VIEWER;
    }, [userProfile?.role, user?.email]);

    const navLinks = useMemo(() => buildNavLinks(t), [t]);

    const filteredNavLinks = useMemo(() => {
        return navLinks.filter((link) => link.allowedRoles.includes(userRole));
    }, [navLinks, userRole]);

    const displayName = userProfile?.displayName || user?.email?.split("@")[0] || "User";

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

    const isActive = (path: string) => isActivePath(loc.pathname, path);

    if (!user) return null;

    return (
        <>
            <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
                <div className="mx-auto max-w-[1700px] px-4 sm:px-6 lg:px-8">
                    <div className="flex min-h-[76px] items-center justify-between gap-4">
                        {/* Left side */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsMenuOpen(true)}
                                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-all hover:bg-gray-50"
                                aria-label="Open menu"
                            >
                                <Menu className="h-5 w-5" />
                            </button>

                            <BrandBlock
                                userRole={userRole}
                                hasProfile={!!userProfile}
                                loading={loading}
                            />
                        </div>

                        {/* Center desktop nav */}
                        <DesktopNav links={filteredNavLinks} isActive={isActive} />

                        {/* Right side */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            <button
                                onClick={handleLogout}
                                className="hidden md:inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:text-gray-900 hover:shadow-md"
                                title={t("nav.logout", "Logout")}
                            >
                                <LogOut className="h-4 w-4 text-gray-400" />
                                <span className="hidden lg:inline">{t("nav.logout", "Logout")}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <MobileDrawer
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                links={filteredNavLinks}
                isActive={isActive}
                displayName={displayName}
                email={user.email}
                userRole={userRole}
                onLogout={handleLogout}
                profileLabel={t("nav.profile", "Profile")}
                logoutLabel={t("nav.logout", "Logout")}
            />
        </>
    );
}