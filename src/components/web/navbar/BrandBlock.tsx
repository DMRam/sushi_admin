import { Link } from "react-router-dom";
import type { UserRole } from "../../../context/UserProfileContext";
import { roleBadge } from "./utils";

interface Props {
  userRole: UserRole;
  hasProfile: boolean;
  loading: boolean;
}

export default function BrandBlock({ userRole, hasProfile, loading }: Props) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Link
        to="/admin/sales-tracking"
        className="group flex items-center gap-3 rounded-2xl transition-all"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 text-base font-semibold text-white shadow-sm transition-transform duration-200 group-hover:scale-[1.02]">
          S
        </div>

        <div className="hidden sm:block min-w-0">
          <div className="text-sm font-semibold tracking-tight text-gray-900">
            Sushi Admin
          </div>

          <div className="mt-1 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${roleBadge(
                userRole
              )}`}
            >
              {String(userRole).toLowerCase()}
            </span>

            {!hasProfile && !loading && (
              <span className="text-[10px] text-gray-400">No profile</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}