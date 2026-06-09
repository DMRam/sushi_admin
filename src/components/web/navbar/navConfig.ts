import {
    LayoutDashboard,
    CalendarDays,
    ShoppingCart,
    Package,
    Boxes,
    TrendingUp,
    Shield,
    Wallet,
    Gift,
    PartyPopper,
    Award,
    UsersRound,
} from "lucide-react";
import { UserRole } from "../../../context/UserProfileContext";
import type { NavLink } from "./types";
import type { TFunction } from "i18next";


export function buildNavLinks(t: TFunction): NavLink[] {
    return [
        {
            path: "/admin/sales-tracking",
            label: t("nav.dashboard", "Dashboard"),
            shortLabel: t("nav.dashboardShort", "Dash"),
            allowedRoles: [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN],
            icon: LayoutDashboard,
        },
        {
            path: "/admin/purchases",
            label: t("nav.purchases", "Purchases"),
            shortLabel: t("nav.purchases", "Purchases"),
            allowedRoles: [UserRole.MANAGER, UserRole.ADMIN],
            icon: ShoppingCart,
        },
        {
            path: "/admin/bookings",
            label: t("nav.bookings", "Bookings"),
            shortLabel: t("nav.bookingsShort", "Book"),
            allowedRoles: [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN],
            icon: CalendarDays,
        },
        {
            path: "/admin/events",
            label: t("nav.events", "Events"),
            shortLabel: t("nav.events", "Events"),
            allowedRoles: [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN],
            icon: PartyPopper,
        },
        {
            path: "/admin/gift-cards",
            label: t("nav.giftCards", "Gift Cards"),
            shortLabel: t("nav.giftCardsShort", "Gift"),
            allowedRoles: [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN],
            icon: Gift,
        },
        {
            path: "/admin/rewards",
            label: t("nav.rewards", "Rewards"),
            shortLabel: t("nav.rewardsShort", "Rewards"),
            allowedRoles: [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN],
            icon: Award,
        },
        {
            path: "/admin/clients",
            label: t("nav.clients", "Clients"),
            shortLabel: t("nav.clientsShort", "Clients"),
            allowedRoles: [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN],
            icon: UsersRound,
        },
        {
            path: "/admin/products",
            label: t("nav.products", "Products"),
            shortLabel: t("nav.products", "Products"),
            allowedRoles: [UserRole.MANAGER, UserRole.ADMIN],
            icon: Package,
        },
        {
            path: "/admin/stock",
            label: t("nav.stock", "Stock"),
            shortLabel: t("nav.stock", "Stock"),
            allowedRoles: [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN],
            icon: Boxes,
        },
        {
            path: "/admin/cost-analysis",
            label: t("nav.costAnalysis", "Cost Analysis"),
            shortLabel: t("nav.cost", "Cost"),
            allowedRoles: [UserRole.MANAGER, UserRole.ADMIN],
            icon: TrendingUp,
        },
        {
            path: "/admin/business-analytics",
            label: t("nav.businessAnalytics", "Business Analytics"),
            shortLabel: t("nav.analytics", "Analytics"),
            allowedRoles: [UserRole.MANAGER, UserRole.ADMIN],
            icon: TrendingUp,
        },
        {
            path: "/admin/payroll",
            label: t("nav.payroll", "Payroll"),
            shortLabel: t("nav.payroll", "Payroll"),
            allowedRoles: [UserRole.MANAGER, UserRole.ADMIN],
            icon: Wallet,
        },
        {
            path: "/admin/admin",
            label: t("nav.admin", "Admin"),
            shortLabel: t("nav.admin", "Admin"),
            allowedRoles: [UserRole.ADMIN],
            icon: Shield,
        },
    ];
}
