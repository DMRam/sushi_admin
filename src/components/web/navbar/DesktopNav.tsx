import { Link } from "react-router-dom";
import type { NavLink } from "./types";

interface Props {
  links: NavLink[];
  isActive: (path: string) => boolean;
}

function desktopLinkClass(active: boolean) {
  return [
    "group relative inline-flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200",
    active
      ? "bg-gray-950 text-white shadow-lg shadow-gray-950/15"
      : "text-gray-500 hover:bg-gray-100 hover:text-gray-950",
  ].join(" ");
}

export default function DesktopNav({ links, isActive }: Props) {
  return (
    <nav className="hidden items-center gap-1.5 rounded-[26px] border border-gray-200 bg-white p-1.5 shadow-sm xl:flex">
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
                active ? "text-[#f26350]" : "text-gray-400 group-hover:text-gray-700",
              ].join(" ")}
            />
            <span>{link.shortLabel ?? link.label}</span>

            {active && (
              <span className="absolute inset-x-4 -bottom-[7px] h-1 rounded-full bg-[#f26350]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
