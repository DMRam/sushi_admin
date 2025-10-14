import React from 'react'
import { Link } from 'react-router-dom'

interface Props {
    videoRef: React.RefObject<HTMLVideoElement | null>
    currentVideoIndex: number
    setCurrentVideoIndex: React.Dispatch<React.SetStateAction<number>>
    videoLoaded: boolean;
    handleVideoLoad: () => void;
    handleVideoError: () => void
    videos: string[];
    videoError: boolean

}

export const LandingHero = ({ videoRef, currentVideoIndex, handleVideoLoad, videoLoaded, handleVideoError, videos, videoError }: Props) => {
    return (
        <>
            <section className="relative min-h-[85vh] flex items-center justify-center bg-gray-900 overflow-hidden">
                {/* Video Background with Smooth Transitions */}
                <div className="absolute inset-0">
                    {/* Single video element that switches source */}
                    <video
                        ref={videoRef}
                        key={currentVideoIndex}
                        autoPlay
                        muted
                        playsInline
                        className={`w-full h-full object-cover transition-opacity duration-1000 ${videoLoaded ? 'opacity-100' : 'opacity-0'
                            }`}
                        onLoadedData={handleVideoLoad}
                        onError={handleVideoError}
                    >
                        <source src={videos[currentVideoIndex]} type="video/mp4" />
                    </video>

                    {/* Loading Animation */}
                    {!videoLoaded && !videoError && (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-blue-900 flex items-center justify-center">
                            <div className="text-center">
                                <div className="wave-container mb-8">
                                    <div className="wave"></div>
                                    <div className="wave"></div>
                                    <div className="wave"></div>
                                </div>
                                <p className="text-white/60 text-sm font-light tracking-wide">Loading the Pacifique experience...</p>
                            </div>
                        </div>
                    )}

                    {/* Fallback Background */}
                    {videoError && (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-blue-900 to-teal-800">
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M0%200h60v60H0z%22%20fill%3D%22none%22/%3E%3Cpath%20d%3D%22M10%2030q10-5%2020%200t20%200%2210%205%22%20stroke%3D%22%23ffffff%22%20stroke-width%3D%220.1%22%20fill%3D%22none%22%20opacity%3D%220.1%22/%3E%3C/svg%3E')]"></div>
                        </div>
                    )}

                    {/* Enhanced Dark Overlay */}
                    <div className={`absolute inset-0 transition-opacity duration-1000 ${videoLoaded ? 'bg-gray-900/50' : 'bg-gray-900/70'
                        }`}></div>

                    {/* Sophisticated Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-gray-900/40 via-gray-900/15 to-gray-900/30">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.15)_0%,_transparent_70%)]"></div>
                    </div>        </div>

                {/* Hero Content - Improved Layout */}
                <div className="relative container mx-auto px-6 text-center text-white">
                    <div className="max-w-4xl mx-auto">
                        {/* Main Title with Better Typography */}
                        <div className="mb-5">
                            <div className="w-24 h-px bg-white/40 mx-auto mb-8"></div>

                            {/* Main Brand */}
                            <h1 className="text-4xl md:text-7xl font-light text-white mb-4 tracking-tight leading-none">
                                PACIFIQUE
                            </h1>

                            {/* Subtitle */}
                            <div className="flex justify-center items-center space-x-6 mb-6">
                                <div className="w-12 h-px bg-white/30"></div>
                                <p className="text-lg font-light tracking-widest text-white/80 uppercase">
                                    Ceviche & Sushi Bar
                                </p>
                                <div className="w-12 h-px bg-white/30"></div>
                            </div>

                            <div className="w-24 h-px bg-white/40 mx-auto mt-8"></div>
                        </div>

                        {/* Description */}
                        <p className="text-xl text-white/80 mb-12 font-light tracking-wide leading-relaxed max-w-2xl mx-auto">
                            Fresh, local, and delicious.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex justify-center items-center">
                            <Link
                                to="/order"
                                className="group border border-white text-white px-20 py-4 rounded-sm text-base font-light tracking-wider hover:bg-white hover:text-gray-900 transition-all duration-300 flex items-center justify-center space-x-2"
                            >
                                <span>EXPLORE OUR MENU</span>
                                <svg
                                    className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                                    />
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Enhanced Corner Accents */}
                <div className="absolute top-12 left-12 w-20 h-20 border-t border-l border-white/20"></div>
                <div className="absolute bottom-12 right-12 w-20 h-20 border-b border-r border-white/20"></div>

                {/* Video Progress Indicator */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {videos.map((_, index) => (
                        <div
                            key={index}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentVideoIndex ? 'bg-white' : 'bg-white/30'
                                }`}
                        />
                    ))}
                </div>
            </section>

        </>
    )
}
