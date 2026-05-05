import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'

export const GlobalPromoBanner: React.FC = () => {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <div className="sticky top-0 z-[60] w-full">
      <div className="
        bg-[#0D0D0D] text-white
        text-[10px] sm:text-xs
        tracking-[0.14em] uppercase
        flex items-center justify-center
        px-4 py-2
        relative
      ">
        <Link
          to="/menu"
          className="flex items-center gap-2 hover:opacity-80 transition"
        >
          <span className="text-[#E62B2B]">●</span>
          <span className="hidden sm:inline">Online Special</span>
          <span className="text-[#E62B2B] font-semibold">10% Off</span>
          <span className="hidden sm:inline">with code</span>
          <span className="font-bold underline underline-offset-4">
            MAISUSHI10
          </span>
        </Link>

        {/* Close button */}
        <button
          onClick={() => setVisible(false)}
          className="absolute right-3 opacity-60 hover:opacity-100 transition"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}