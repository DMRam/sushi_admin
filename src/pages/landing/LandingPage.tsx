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
            {/* Primary Container - Enhanced with gradient and better shadows */}
            <div className="relative bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl border border-white/20 rounded-lg p-4 sm:p-6 transition-all duration-500 ease-out group-hover:bg-white/95 group-hover:shadow-2xl group-hover:shadow-black/20 hover:backdrop-blur-2xl hover:scale-105 hover:border-white/30 shadow-lg shadow-black/10">

              {/* Enhanced Background Pattern */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

              {/* Logo Geometry - Enhanced with animation */}
              <div className="absolute -left-2 sm:-left-3 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-16 sm:h-16 opacity-40 group-hover:opacity-60 transition-all duration-500">
                {/* Animated Lines */}
                <div className="absolute w-full h-[0.5px] sm:h-[1px] bg-gradient-to-r from-transparent via-[#0D0D0D] to-transparent transform rotate-[3.43deg] origin-left top-3 sm:top-4 opacity-30 sm:opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                <div className="absolute w-full h-[0.5px] sm:h-[1px] bg-gradient-to-r from-transparent via-[#0D0D0D] to-transparent transform -rotate-[1.72deg] origin-left top-6 sm:top-8 opacity-30 sm:opacity-40 group-hover:opacity-60 transition-opacity duration-500 delay-75" />
                {/* Enhanced Red Accent Line with glow */}
                <div className="absolute left-3 sm:left-4 top-1/2 w-[0.5px] sm:w-[1px] h-6 sm:h-8 bg-gradient-to-b from-[#E62B2B] to-[#ff4444] transform -translate-y-1/2 rotate-90 opacity-70 sm:opacity-90 group-hover:opacity-100 group-hover:h-8 sm:group-hover:h-10 transition-all duration-500 delay-150" />

                {/* Floating Particles */}
                <div className="absolute -top-1 -right-1 w-1 h-1 bg-[#E62B2B] rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-500 delay-300" />
              </div>

              {/* Content Masterpiece - Enhanced typography */}
              <div className="relative z-10 pl-6 sm:pl-8">
                {/* Primary Calligraphy with gradient text */}
                <div className="text-transparent bg-gradient-to-r from-[#0D0D0D] to-[#0D0D0D]/80 bg-clip-text text-xs sm:text-[15px] font-light tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-1 sm:mb-2 leading-none transition-all duration-500 group-hover:tracking-[0.2em] sm:group-hover:tracking-[0.25em] group-hover:bg-gradient-to-r group-hover:from-[#E62B2B] group-hover:to-[#ff4444] group-hover:bg-clip-text">
                  {t('nav.orders', 'Explore Menu')}
                </div>

                {/* Secondary Script with enhanced styling */}
                <div className="text-[#0D0D0D]/40 text-[9px] sm:text-[11px] font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase leading-none transition-all duration-500 group-hover:text-[#0D0D0D]/60 group-hover:tracking-[0.25em] sm:group-hover:tracking-[0.35em]">
                  {t('landing.maisushi', 'MaiSushi')}
                </div>
              </div>

              {/* Enhanced Perfection Line with gradient */}
              <div className="absolute bottom-0 left-4 sm:left-6 right-4 sm:right-6 h-[0.5px] sm:h-[1px] bg-gradient-to-r from-transparent via-[#0D0D0D]/10 to-transparent transform origin-left transition-all duration-700 group-hover:scale-x-100 scale-x-0" />

              {/* Corner Accents */}
              <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-[#0D0D0D]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-200" />
              <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-[#0D0D0D]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-300" />
              <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-[#0D0D0D]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-400" />
              <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-[#0D0D0D]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-500" />
            </div>

            {/* Enhanced Floating Signature with animation */}
            <div className="absolute -bottom-6 sm:-bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-700 delay-300 translate-y-2 group-hover:translate-y-0 hidden sm:block">
              <div className="text-transparent bg-gradient-to-r from-[#0D0D0D]/20 to-[#0D0D0D]/10 bg-clip-text text-[8px] sm:text-[9px] font-light tracking-[0.3em] sm:tracking-[0.4em] uppercase whitespace-nowrap">
                {t('landing.craftsmanship', 'Craftsmanship')}
                <div className="absolute -bottom-1 left-0 right-0 h-[0.5px] bg-gradient-to-r from-transparent via-[#0D0D0D]/5 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 delay-500" />
              </div>
            </div>

            {/* Enhanced Glow Effect */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#E62B2B]/5 to-transparent opacity-0 group-hover:opacity-100 blur-xl -z-10 transition-opacity duration-700" />
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
        <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50 animate-in fade-in duration-500">
          <Link
            to="/checkout"
            className="group relative block transform hover:scale-105 transition-transform duration-300"
          >
            <div className="relative">
              {/* Enhanced Cart Container with Better Visibility */}
              <div className="relative bg-gradient-to-br from-white/95 to-white/85 backdrop-blur-xl border border-white/30 rounded-lg p-4 sm:p-5 transition-all duration-500 ease-out group-hover:bg-white/98 group-hover:shadow-2xl group-hover:shadow-black/25 hover:backdrop-blur-2xl shadow-lg shadow-black/15">

                {/* Pulsing Notification Badge */}
                <div className="absolute -top-2 -right-2 z-20">
                  <div className="relative">
                    <div className="bg-[#E62B2B] text-white text-xs font-medium rounded-full w-6 h-6 flex items-center justify-center shadow-lg shadow-[#E62B2B]/40 slow-pulse">
                      {itemCount}
                    </div>
                    <div className="absolute inset-0 bg-[#E62B2B] rounded-full slow-ping"></div>
                  </div>
                </div>

                {/* Enhanced Geometric Pattern */}
                <div className="absolute -left-2 sm:-left-2.5 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 opacity-40 group-hover:opacity-60 transition-all duration-500">
                  {/* Animated Cart Icon Lines */}
                  <div className="absolute w-full h-[0.5px] sm:h-[1px] bg-gradient-to-r from-transparent via-[#0D0D0D] to-transparent transform rotate-[3.43deg] origin-left top-2 sm:top-3 opacity-40 group-hover:opacity-70 transition-opacity duration-500" />
                  <div className="absolute w-full h-[0.5px] sm:h-[1px] bg-gradient-to-r from-transparent via-[#0D0D0D] to-transparent transform -rotate-[1.72deg] origin-left top-4 sm:top-5 opacity-40 group-hover:opacity-70 transition-opacity duration-500 delay-75" />
                  {/* Enhanced Red Accent */}
                  <div className="absolute left-2 sm:left-2.5 top-1/2 w-[0.5px] sm:w-[1px] h-5 sm:h-6 bg-gradient-to-b from-[#E62B2B] to-[#ff4444] transform -translate-y-1/2 rotate-90 opacity-80 group-hover:opacity-100 group-hover:h-6 sm:group-hover:h-7 transition-all duration-500" />
                </div>

                {/* Enhanced Content with Better Hierarchy */}
                <div className="relative z-10 pl-5 sm:pl-6">
                  {/* Total Amount - More Prominent */}
                  <div className="text-transparent bg-gradient-to-r from-[#0D0D0D] to-[#0D0D0D]/90 bg-clip-text text-[13px] sm:text-[16px] font-medium tracking-[0.05em] sm:tracking-[0.1em] uppercase mb-1 leading-none transition-all duration-500 group-hover:bg-gradient-to-r group-hover:from-[#E62B2B] group-hover:to-[#ff4444] group-hover:bg-clip-text">
                    ${cartTotal.toFixed(2)}
                  </div>

                  {/* Item Count - Clearer */}
                  <div className="text-[#0D0D0D]/60 text-[9px] sm:text-[11px] font-normal tracking-[0.1em] sm:tracking-[0.15em] uppercase leading-none mb-1 transition-all duration-500 group-hover:text-[#0D0D0D]/80">
                    {itemCount} {itemCount === 1 ? t('cart.item', 'Item') : t('cart.items', 'Items')}
                  </div>

                  {/* Points - More Visible */}
                  {userProfile && (
                    <div className="text-transparent bg-gradient-to-r from-[#E62B2B] to-[#ff6b6b] bg-clip-text text-[9px] sm:text-[11px] font-medium tracking-[0.1em] sm:tracking-[0.15em] uppercase leading-none transition-all duration-500 group-hover:from-[#ff4444] group-hover:to-[#ff8585]">
                      +{Math.floor(cartTotal)} {t('cart.points', 'Points')}
                    </div>
                  )}
                </div>

                {/* Enhanced Progress Line */}
                <div className="absolute bottom-0 left-3 sm:left-4 right-3 sm:right-4 h-[1px] sm:h-[1.5px] bg-gradient-to-r from-transparent via-[#E62B2B]/40 to-transparent transform origin-left transition-all duration-700 group-hover:scale-x-100 scale-x-0" />

                {/* Subtle Corner Accents */}
                <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-[#E62B2B]/30 rounded-tl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-[#E62B2B]/30 rounded-tr opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100" />
              </div>

              {/* Enhanced Floating Label */}
              <div className="absolute -bottom-5 sm:-bottom-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-200 translate-y-1 group-hover:translate-y-0">
                <div className="bg-[#0D0D0D] text-white text-[9px] sm:text-[10px] font-medium tracking-[0.15em] sm:tracking-[0.2em] uppercase whitespace-nowrap px-2 py-1 rounded-sm shadow-lg">
                  {t('cart.checkout', 'Checkout')}
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-[#0D0D0D] rotate-45"></div>
                </div>
              </div>

              {/* Enhanced Glow Effect */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#E62B2B]/10 to-transparent opacity-0 group-hover:opacity-100 blur-md -z-10 transition-opacity duration-500" />
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