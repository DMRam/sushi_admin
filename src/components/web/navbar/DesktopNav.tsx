import { Link } from "react-router-dom";
import type { NavLink } from "./types";

interface Props {
  links: NavLink[];
  isActive: (path: string) => boolean;
}

function desktopLinkClass(active: boolean) {
  return [
    "group relative inline-flex min-h-[42px] shrink-0 items-center gap-2 border-r border-slate-200 px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] transition-all duration-200 last:border-r-0 2xl:px-3.5 2xl:text-xs",
    active
      ? "bg-white text-slate-950 shadow-sm"
      : "text-slate-500 hover:bg-white hover:text-slate-950",
  ].join(" ");
}

export default function DesktopNav({ links, isActive }: Props) {
  return (
    <nav className="admin-carbon-nav-scroll hidden max-w-full items-stretch overflow-x-auto overflow-y-hidden border border-slate-200 bg-slate-50 shadow-sm 2xl:flex">
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
                active ? "text-blue-700" : "text-slate-400 group-hover:text-slate-700",
              ].join(" ")}
            />
            <span>{link.shortLabel ?? link.label}</span>

            {active && (
              <span className="absolute inset-x-0 top-0 h-0.5 bg-blue-700" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
