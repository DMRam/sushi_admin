import type { RefObject } from "react"
import { useTranslation } from "react-i18next"

interface Props {
  currentVideoIndex: number
  handleVideoError: () => void
  handleVideoLoad: () => void
  setCurrentVideoIndex: (index: number) => void
  videoError: boolean
  videoLoaded: boolean
  videoRef: RefObject<HTMLVideoElement | null>
  videos: string[]
}

export const LandingHero = ({
  currentVideoIndex,
  handleVideoError,
  handleVideoLoad,
  setCurrentVideoIndex,
  videoError,
  videoLoaded,
  videoRef,
  videos
}: Props) => {
  const { t } = useTranslation()

  return (
    <section className="relative min-h-[456px] overflow-hidden pt-[100px] sm:min-h-[368px] lg:min-h-[388px]">
      <div className="absolute inset-0 z-0">
        {!videoError ? (
          <video
            ref={videoRef}
            key={currentVideoIndex}
            autoPlay
            muted
            playsInline
            onLoadedData={handleVideoLoad}
            onError={handleVideoError}
            className="h-full w-full object-cover opacity-100"
          >
            <source src={videos[currentVideoIndex]} type="video/mp4" />
          </video>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-r from-[#050505] to-[#17110f]">
            <span className="text-sm text-white sm:text-lg">Video unavailable</span>
          </div>
        )}

        {/* Loading overlay */}
        {!videoLoaded && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#050505]">
            <div className="animate-pulse text-sm text-white sm:text-lg">Loading...</div>
          </div>
        )}
      </div>

      <div className="absolute inset-0 z-10 bg-black/10" />
      <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.52)_42%,rgba(0,0,0,0.08)_100%)]" />
      <div className="absolute inset-y-0 left-0 z-10 w-[58%] bg-[radial-gradient(circle_at_20%_52%,rgba(0,0,0,0.35),transparent_42%)]" />

      <div className="relative z-20 mx-auto flex min-h-[356px] max-w-[1600px] items-center px-6 sm:min-h-[268px] lg:min-h-[288px] lg:px-10">
        <div className="max-w-[780px] text-white sm:max-w-[720px]">
          <div className="mb-3 text-[14px] font-light uppercase tracking-[0.38em] text-white/78 sm:text-[15px] lg:text-[17px]">
            {t('hero.eyebrow', 'Une expérience')}
          </div>
          <h2 className="font-calligraphy mb-3 text-[43px] font-semibold uppercase leading-[0.95] tracking-normal sm:text-[42px] lg:text-[58px] xl:text-[64px]">
            {t('hero.sushi', 'Sushi')} <span className="text-[#f26350]">{t('hero.authentic', 'authentique')}</span>
          </h2>
          <p className="mb-5 max-w-[390px] text-[14px] font-semibold leading-5 text-white/90 sm:text-[14px] sm:leading-5 lg:text-[16px] lg:leading-6">
            {t('hero.tagline', "Un savoir-faire artisanal qui rencontre l'élégance contemporaine.")}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <a
              href="/order"
              className="inline-flex h-11 min-w-[190px] items-center justify-center rounded-[3px] bg-[#f26350] px-7 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white shadow-lg shadow-[#f26350]/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ff725f]"
            >
              {t('hero.orderNow', 'Commander maintenant')}
            </a>
            <a
              href="/menu"
              className="inline-flex h-11 min-w-[170px] items-center justify-center rounded-[3px] border border-white/35 bg-black/20 px-7 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/10"
            >
              {t('hero.viewMenu', 'Voir le menu')}
            </a>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 space-x-3">
        {videos.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentVideoIndex(index)
              handleVideoLoad()
            }}
            aria-label={`Show hero video ${index + 1}`}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${index === currentVideoIndex ? 'bg-[#f26350]' : 'bg-white/70'
              }`}
          />
        ))}
      </div>
    </section>
  )
}
