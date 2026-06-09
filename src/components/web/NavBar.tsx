import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Menu, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { useUserProfile, UserRole } from "../../context/UserProfileContext";
import DesktopNav from "./navbar/DesktopNav";
import MobileDrawer from "./navbar/MobileDrawer";
import { buildNavLinks } from "./navbar/navConfig";
import { isActivePath, isSuperAdmin } from "./navbar/utils";
import maiSushiLogo from "../../assets/logo/final/maisushi-logo-color.svg";

export default function NavBar() {
    const { user, logout } = useAuth();
    const { userProfile } = useUserProfile();
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

    const displayName =
        userProfile?.displayName || user?.email?.split("@")[0] || "User";

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
            <header className="admin-carbon-topbar sticky top-0 z-50 border-b border-gray-200 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur supports-[backdrop-filter]:bg-white/90">
                <div className="mx-auto max-w-[1920px] px-3 sm:px-5 lg:px-6">
                    <div className="flex min-h-[64px] items-center justify-between gap-2 sm:gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                onClick={() => setIsMenuOpen(true)}
                                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 active:scale-[0.98] 2xl:hidden"
                                aria-label={t("nav.openMenu", "Open menu")}
                                type="button"
                            >
                                <Menu className="h-5 w-5" />
                            </button>

                            <div className="admin-carbon-brand hidden min-w-0 items-center gap-3 md:flex">
                                <div className="flex h-12 w-36 items-center justify-start border border-gray-200 bg-white px-2">
                                    <img src={maiSushiLogo} alt="Mai Sushi" className="h-10 w-full object-contain" />
                                </div>
                                <div className="hidden min-w-0 xl:block">
                                    <p className="truncate text-sm font-semibold tracking-tight text-gray-950">
                                        Mai Sushi Ops
                                    </p>
                                    <p className="mt-0.5 truncate text-xs font-medium text-gray-400">
                                        Restaurant command center
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="hidden min-w-0 flex-1 justify-center 2xl:flex">
                            <DesktopNav
                                links={filteredNavLinks}
                                isActive={isActive}
                            />
                        </div>

                        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                            <button
                                onClick={handleLogout}
                                className="hidden 2xl:inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-300 hover:bg-gray-950 hover:text-white hover:shadow-md"
                                title={t("nav.logout", "Logout")}
                                type="button"
                            >
                                <LogOut className="h-4 w-4 text-gray-400" />
                                <span>{t("nav.logout", "Logout")}</span>
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
