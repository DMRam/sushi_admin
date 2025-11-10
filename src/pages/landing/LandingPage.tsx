import { Link } from 'react-router-dom'
import type { MenuItem } from '../../types/types'
import { useCartStore } from '../../stores/cartStore'
import { useState, useRef, useEffect } from 'react'
import video1 from '../../assets/videos/v1.mp4'
import video2 from '../../assets/videos/v2.mp4'
import { LandingHeader } from './components/LandingHeader'
import { LandingHero } from './components/LandingHero'
import { LandingFeatured } from './components/LandingFeatured'
import { LandingCTAFooter } from './components/LandingCTAFooter'
import { LandingContact } from './components/LandingContact'
import { useUserProfile } from '../../context/UserProfileContext'
import { useTranslation } from 'react-i18next'

export default function LandingPage() {
  const { cart } = useCartStore();
  const addToCart = useCartStore((state) => state.addToCart);
  const { userProfile } = useUserProfile()
  const { t } = useTranslation()
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const videos = [video1, video2]
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const isAdmin = userProfile?.role === 'admin' || userProfile?.email?.includes('admin') || false

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    const handleVideoEnd = () => {
      setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % videos.length)
      setVideoLoaded(false)
    }

    videoElement.addEventListener('ended', handleVideoEnd)
    return () => videoElement.removeEventListener('ended', handleVideoEnd)
  }, [videos.length])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!videoLoaded && !videoError) {
        console.log('Video loading taking longer than expected...')
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [videoLoaded, videoError])

  const handleVideoLoad = () => {
    setVideoLoaded(true)
  }

  const handleVideoError = () => {
    setVideoError(true)
    setVideoLoaded(true)
  }

  const handleAddToCart = (item: MenuItem) => {
    console.log('🛒 Adding to cart:', item.name)
    addToCart(item)
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <LandingHeader />

      <LandingHero
        currentVideoIndex={currentVideoIndex}
        handleVideoError={handleVideoError}
        handleVideoLoad={handleVideoLoad}
        setCurrentVideoIndex={setCurrentVideoIndex}
        videoError={videoError}
        videoLoaded={videoLoaded}
        videoRef={videoRef}
        videos={videos}
      />

      {/* Masterpiece Menu Navigation - Mobile Optimized */}
      <div className="fixed top-24 right-4 sm:top-32 sm:right-8 z-50">
        <Link
          to="/menu"
          className="group relative block"
        >
          {/* Architectural Foundation */}
          <div className="relative">
            {/* Primary Container - Enhanced Transparency */}
            <div className="relative bg-white/80 backdrop-blur-xl border border-[#0D0D0D]/[0.06] rounded-sm p-4 sm:p-6 transition-all duration-1000 ease-out group-hover:bg-white/90 group-hover:shadow-2xl group-hover:shadow-black/[0.08] hover:backdrop-blur-2xl">

              {/* Logo Geometry - Mobile Responsive */}
              <div className="absolute -left-2 sm:-left-3 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-16 sm:h-16 opacity-30">
                {/* Line 6 Inspiration */}
                <div className="absolute w-full h-[0.5px] sm:h-[1px] bg-[#0D0D0D] transform rotate-[3.43deg] origin-left top-3 sm:top-4 opacity-25 sm:opacity-35" />
                {/* Line 7 Inspiration */}
                <div className="absolute w-full h-[0.5px] sm:h-[1px] bg-[#0D0D0D] transform -rotate-[1.72deg] origin-left top-6 sm:top-8 opacity-25 sm:opacity-35" />
                {/* Line 8 Inspiration - Red Accent */}
                <div className="absolute left-3 sm:left-4 top-1/2 w-[0.5px] sm:w-[1px] h-6 sm:h-8 bg-[#E62B2B] transform -translate-y-1/2 rotate-90 opacity-60 sm:opacity-80" />
              </div>

              {/* Content Masterpiece - Mobile Optimized */}
              <div className="relative z-10 pl-6 sm:pl-8">
                {/* Primary Calligraphy */}
                <div className="text-[#0D0D0D] text-xs sm:text-[15px] font-light tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-1 sm:mb-2 leading-none transition-all duration-700 group-hover:tracking-[0.2em] sm:group-hover:tracking-[0.25em]">
                  {t('nav.orders', 'Explore Menu')}
                </div>

                {/* Secondary Script */}
                <div className="text-[#0D0D0D]/30 text-[9px] sm:text-[11px] font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase leading-none">
                  {t('landing.maisushi', 'MaiSushi')}
                </div>
              </div>

              {/* Perfection Line - Mobile Adjusted */}
              <div className="absolute bottom-0 left-4 sm:left-6 right-4 sm:right-6 h-[0.5px] sm:h-[1px] bg-[#0D0D0D]/5 transform origin-left transition-all duration-1000 group-hover:scale-x-100 scale-x-0" />
            </div>

            {/* Floating Signature - Mobile Hidden */}
            <div className="absolute -bottom-6 sm:-bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-1000 delay-300 hidden sm:block">
              <div className="text-[#0D0D0D]/15 text-[8px] sm:text-[9px] font-light tracking-[0.3em] sm:tracking-[0.4em] uppercase whitespace-nowrap">
                {t('landing.craftsmanship', 'Craftsmanship')}
              </div>
            </div>
          </div>
        </Link>
      </div>

      <LandingFeatured handleAddToCart={handleAddToCart} />

      <div id="contact">
        <LandingContact />
      </div>

      <LandingCTAFooter displaySimple={false} user={userProfile} isAdmin={isAdmin} />

      {/* Perfection Cart Component - Mobile Optimized */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50">
          <Link
            to="/checkout"
            className="group relative block"
          >
            <div className="relative">
              {/* Cart Architecture - Enhanced Transparency */}
              <div className="relative bg-white/80 backdrop-blur-xl border border-[#0D0D0D]/[0.06] rounded-sm p-3 sm:p-5 transition-all duration-1000 ease-out group-hover:bg-white/90 group-hover:shadow-2xl group-hover:shadow-black/[0.08] hover:backdrop-blur-2xl">

                {/* Geometric Perfection - Mobile Responsive */}
                <div className="absolute -left-1.5 sm:-left-2 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 opacity-25 sm:opacity-30">
                  <div className="absolute w-full h-[0.5px] sm:h-[1px] bg-[#0D0D0D] transform rotate-[3.43deg] origin-left top-2 sm:top-3 opacity-20 sm:opacity-35" />
                  <div className="absolute left-2 sm:left-3 top-1/2 w-[0.5px] sm:w-[1px] h-4 sm:h-6 bg-[#E62B2B] transform -translate-y-1/2 rotate-90 opacity-50 sm:opacity-60" />
                </div>

                {/* Content Excellence - Mobile Optimized */}
                <div className="relative z-10 pl-5 sm:pl-6">
                  <div className="text-[#0D0D0D] text-[11px] sm:text-[14px] font-light tracking-[0.1em] sm:tracking-[0.15em] uppercase mb-0.5 sm:mb-1 leading-none">
                    ${cartTotal.toFixed(2)}
                  </div>
                  <div className="text-[#0D0D0D]/30 text-[8px] sm:text-[10px] font-extralight tracking-[0.15em] sm:tracking-[0.25em] uppercase leading-none mb-0.5 sm:mb-1">
                    {itemCount} {t('cart.items', 'Items')}
                  </div>
                  {userProfile && (
                    <div className="text-[#E62B2B] text-[8px] sm:text-[10px] font-light tracking-[0.1em] sm:tracking-[0.2em] uppercase leading-none">
                      +{Math.floor(cartTotal)} {t('cart.points', 'Points')}
                    </div>
                  )}
                </div>

                {/* Animated Perfection Line - Mobile Adjusted */}
                <div className="absolute bottom-0 left-3 sm:left-4 right-3 sm:right-4 h-[0.5px] sm:h-[1px] bg-[#0D0D0D]/5 transform origin-left transition-all duration-1000 group-hover:scale-x-100 scale-x-0" />
              </div>

              {/* Cart Signature - Mobile Hidden */}
              <div className="absolute -bottom-4 sm:-bottom-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-1000 delay-300 hidden sm:block">
                <div className="text-[#0D0D0D]/15 text-[7px] sm:text-[8px] font-light tracking-[0.2em] sm:tracking-[0.3em] uppercase whitespace-nowrap">
                  {t('cart.checkout', 'Checkout')}
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;1,300&display=swap');
        
        .font-calligraphy {
          font-family: 'Playfair Display', serif;
        }
        
        /* Enhanced transparency animations */
        @keyframes glassFloat {
          0% { 
            opacity: 0;
            transform: translateY(20px) scale(0.98);
            backdrop-filter: blur(0px);
          }
          100% { 
            opacity: 1;
            transform: translateY(0) scale(1);
            backdrop-filter: blur(24px);
          }
        }
        
        .animate-glass-float {
          animation: glassFloat 1.2s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }

        /* Mobile-specific optimizations */
        @media (max-width: 640px) {
          .backdrop-blur-xl {
            backdrop-filter: blur(16px);
          }
          .hover\\:backdrop-blur-2xl:hover {
            backdrop-filter: blur(20px);
          }
        }
      `}</style>
    </div>
  )
}