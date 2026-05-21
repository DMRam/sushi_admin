import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export const GlobalPromoBanner: React.FC = () => {
  const { t } = useTranslation()

  return (
    <div className="fixed inset-x-0 top-0 z-[80] h-8 overflow-hidden bg-[#f26350] px-0">
      <div
        className="
          relative mx-auto flex h-full w-full items-center justify-center overflow-hidden
          bg-[#f26350] px-4 text-center text-white
          shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_8px_22px_rgba(0,0,0,0.22)]
        "
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-px bg-white/18" />
        <div className="pointer-events-none absolute -left-10 bottom-[-9px] z-0 h-4 w-[58%] rotate-[-1.1deg] bg-[#c94639]/45" />
        <div className="pointer-events-none absolute right-[-8%] bottom-[-10px] z-0 h-5 w-[46%] rotate-[1deg] bg-[#ff7a68]/35" />
        <div className="pointer-events-none absolute left-1/2 bottom-0 z-0 h-px w-[42%] -translate-x-1/2 bg-white/30" />

        <Link
          to="/menu"
          className="
            relative z-10 inline-flex h-full max-w-full items-center justify-center gap-2
            truncate text-[10px] font-extrabold uppercase leading-none tracking-[0.1em]
            transition hover:text-white/85 sm:text-[11px] sm:tracking-[0.12em]
          "
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
          <span className="truncate">
            {t('landing.promoPrefix', 'Offre en ligne - 10% de rabais avec le code')}{' '}
            <span className="underline underline-offset-2">MAISUSHI10</span>
          </span>
        </Link>
      </div>
    </div>
  )
}
