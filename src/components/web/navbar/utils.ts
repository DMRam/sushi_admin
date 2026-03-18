import { UserRole } from "../../../context/UserProfileContext";

export const isSuperAdmin = (email: string): boolean => {
  const superAdminEmails = [
    "admin@sushi.com",
    "superadmin@sushi.com",
  ];

  return superAdminEmails.includes(email.toLowerCase());
};

export function initials(nameOrEmail?: string) {
  const s = String(nameOrEmail ?? "").trim();
  if (!s) return "U";

  const parts = s.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();

  return s.slice(0, 2).toUpperCase();
}

export function roleBadge(role: UserRole) {
  switch (role) {
    case UserRole.ADMIN:
      return "bg-violet-50 text-violet-700 border-violet-200";
    case UserRole.MANAGER:
      return "bg-amber-50 text-amber-800 border-amber-200";
    case UserRole.STAFF:
      return "bg-blue-50 text-blue-700 border-blue-200";
    case UserRole.VIEWER:
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

export function normalizePath(path: string) {
  return path.replace(/\/+$/, "");
}

export function isActivePath(currentPath: string, targetPath: string) {
  const current = normalizePath(currentPath);
  const target = normalizePath(targetPath);
  return current === target || current.startsWith(`${target}/`);
}