import type { RefObject } from "react"

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
  return (
    <section className="relative h-72 sm:h-96 md:h-[28rem] overflow-hidden pt-16">
      {/* Video Background */}
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
            className="w-full h-full object-cover"
          >
            <source src={videos[currentVideoIndex]} type="video/mp4" />
          </video>
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-center">
            <span className="text-white text-sm sm:text-lg">Video unavailable</span>
          </div>
        )}

        {/* Loading overlay */}
        {!videoLoaded && !videoError && (
          <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
            <div className="animate-pulse text-white text-sm sm:text-lg">Loading...</div>
          </div>
        )}
      </div>

      {/* Reduced darkness overlays */}
      <div className="absolute inset-0 bg-black/20 z-10"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/50 to-slate-800/30 z-10"></div>

      {/* Hero content */}
      <div className="relative z-20 container mx-auto px-4 sm:px-6 h-full flex items-center">
        <div className="max-w-2xl text-white">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-light mb-3 sm:mb-4 tracking-tight">
            Authentic
            <span className="block font-medium mt-1 sm:mt-2">Sushi Experience</span>
          </h2>
          <p className="text-slate-200 text-sm sm:text-base md:text-lg font-light mb-6 sm:mb-8 max-w-md">
            Masterful sushi craftsmanship meets contemporary elegance
          </p>
          {/* <button className="bg-white text-slate-900 px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base font-medium tracking-wide hover:bg-slate-100 transition-all duration-300 transform hover:-translate-y-0.5 sm:hover:-translate-y-1">
            Reserve Your Table
          </button> */}
        </div>
      </div>

      {/* Video indicator dots - more subtle */}
      <div className="absolute bottom-3 sm:bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex space-x-1">
        {videos.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentVideoIndex(index)
              handleVideoLoad()
            }}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${index === currentVideoIndex ? 'bg-white' : 'bg-white/40'
              }`}
          />
        ))}
      </div>
    </section>
  )
}