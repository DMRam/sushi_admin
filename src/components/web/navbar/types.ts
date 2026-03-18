import type { ComponentType } from "react";
import type { UserRole } from "../../../context/UserProfileContext";

export interface NavLink {
  path: string;
  label: string;
  shortLabel?: string;
  allowedRoles: UserRole[];
  icon: ComponentType<{ className?: string }>;
}