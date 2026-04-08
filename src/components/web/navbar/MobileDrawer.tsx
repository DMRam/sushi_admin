import { Link } from "react-router-dom";
import { X, LogOut, User as UserIcon } from "lucide-react";
import type { UserRole } from "../../../context/UserProfileContext";
import type { NavLink } from "./types";
import { initials, roleBadge } from "./utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  links: NavLink[];
  isActive: (path: string) => boolean;
  displayName: string;
  email?: string | null;
  userRole: UserRole;
  onLogout: () => void;
  profileLabel: string;
  logoutLabel: string;
}

function mobileLinkClass(active: boolean) {
  return [
    "flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-200",
    active
      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
      : "text-gray-700 hover:bg-gray-50",
  ].join(" ");
}

export default function MobileDrawer({
  isOpen,
  onClose,
  links,
  isActive,
  displayName,
  email,
  userRole,
  onLogout,
  profileLabel,
  logoutLabel,
}: Props) {
  return (
    <>
      <div
        className={[
          "fixed inset-0 z-[70] bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 xl:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      <aside
        className={[
          "fixed inset-y-0 left-0 z-[80] h-full w-[320px] max-w-[88vw] border-r border-gray-200 bg-white shadow-2xl transition-transform duration-300 ease-out xl:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        aria-hidden={!isOpen}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-[76px] items-center justify-between border-b border-gray-100 px-4">
            <div className="text-sm font-semibold text-gray-900">Menu</div>

            <button
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
              aria-label="Close menu"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex h-[calc(100%-76px)] flex-col">
            <div className="border-b border-gray-100 p-4">
              <Link
                to="/admin/profile"
                onClick={onClose}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-4 transition-colors hover:bg-gray-50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-base font-semibold text-white">
                  {initials(displayName)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-gray-900">
                    {displayName}
                  </div>
                  <div className="truncate text-sm text-gray-500">
                    {email}
                  </div>
                </div>

                <span
                  className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${roleBadge(
                    userRole
                  )}`}
                >
                  {String(userRole).toLowerCase()}
                </span>
              </Link>
            </div>

            <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
              {links.map((link) => {
                const active = isActive(link.path);
                const Icon = link.icon;

                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={onClose}
                    className={mobileLinkClass(active)}
                  >
                    <Icon
                      className={`h-5 w-5 ${active ? "text-blue-700" : "text-gray-400"
                        }`}
                    />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="space-y-2 border-t border-gray-100 p-4">
              <Link
                to="/admin/profile"
                onClick={onClose}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <UserIcon className="h-5 w-5 text-gray-400" />
                <span>{profileLabel}</span>
              </Link>

              <button
                onClick={onLogout}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                type="button"
              >
                <LogOut className="h-5 w-5 text-red-400" />
                <span>{logoutLabel}</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}