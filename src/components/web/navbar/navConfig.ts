import {
    BarChart3,
    // ChefHat,
    ShoppingCart,
    Package,
    Boxes,
    TrendingUp,
    Shield,
    Wallet,
} from "lucide-react";
import { UserRole } from "../../../context/UserProfileContext";
import type { NavLink } from "./types";
import type { TFunction } from "i18next";


export function buildNavLinks(t: TFunction): NavLink[] {
    return [
        {
            path: "/admin/sales-tracking",
            label: t("nav.salesTracking", "Sales Tracking"),
            shortLabel: t("nav.sales", "Sales"),
            allowedRoles: [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN, UserRole.VIEWER],
            icon: BarChart3,
        },
        // {
        //     path: "/admin/kitchen",
        //     label: t("nav.kitchen", "Kitchen"),
        //     shortLabel: t("nav.kitchen", "Kitchen"),
        //     allowedRoles: [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN, UserRole.VIEWER],
        //     icon: ChefHat,
        // },
        {
            path: "/admin/purchases",
            label: t("nav.purchases", "Purchases"),
            shortLabel: t("nav.purchases", "Purchases"),
            allowedRoles: [UserRole.MANAGER, UserRole.ADMIN],
            icon: ShoppingCart,
        },
        {
            path: "/admin/products",
            label: t("nav.products", "Products"),
            shortLabel: t("nav.products", "Products"),
            allowedRoles: [UserRole.MANAGER, UserRole.ADMIN, UserRole.VIEWER],
            icon: Package,
        },
        {
            path: "/admin/stock",
            label: t("nav.stock", "Stock"),
            shortLabel: t("nav.stock", "Stock"),
            allowedRoles: [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN, UserRole.VIEWER],
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