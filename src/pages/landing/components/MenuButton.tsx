import { Link } from "react-router-dom";
import { UtensilsCrossed } from "lucide-react"; 

export const MenuButton = ({ label }: { label: string }) => (
  <div className="fixed top-24 right-8 z-50">
    <Link
      to="/orders"
      className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-white/90 backdrop-blur-md border border-black/10 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
    >
      <UtensilsCrossed
        size={26}
        className="text-[#E62B2B] group-hover:rotate-12 transition-transform duration-300"
      />
      <div className="absolute -bottom-6 text-xs text-black/70 font-light tracking-widest uppercase">
        {label}
      </div>

      {/* Punto rojo decorativo */}
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#E62B2B] rounded-full animate-pulse" />
    </Link>
  </div>
);
