import { Link } from "react-router-dom";
import type { NavLink } from "./types";

interface Props {
  links: NavLink[];
  isActive: (path: string) => boolean;
}

function desktopLinkClass(active: boolean) {
  return [
    "group relative inline-flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
    active
      ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100"
      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
  ].join(" ");
}

export default function DesktopNav({ links, isActive }: Props) {
  return (
    <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 xl:flex">
      {links.map((link) => {
        const active = isActive(link.path);
        const Icon = link.icon;

        return (
          <Link
            key={link.path}
            to={link.path}
            className={desktopLinkClass(active)}
            aria-current={active ? "page" : undefined}
          >
            <Icon
              className={[
                "h-4 w-4 transition-colors",
                active ? "text-blue-700" : "text-gray-400 group-hover:text-gray-700",
              ].join(" ")}
            />
            <span>{link.shortLabel ?? link.label}</span>

            {active && (
              <span className="absolute inset-x-3 -bottom-[9px] h-0.5 rounded-full bg-blue-600" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}