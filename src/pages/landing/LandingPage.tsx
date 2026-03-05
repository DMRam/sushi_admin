import { Link } from 'react-router-dom'
import type { MenuItem } from '../../types/types'
import { useCartStore } from '../../stores/cartStore'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import video1 from '../../assets/videos/v1.mp4'
import video2 from '../../assets/videos/v2.mp4'
import { LandingHeader } from './components/LandingHeader'
import { LandingHero } from './components/LandingHero'
import { LandingFeatured } from './components/LandingFeatured'
import { LandingCTAFooter } from './components/LandingCTAFooter'
import { LandingContact } from './components/LandingContact'
import { useUserProfile } from '../../context/UserProfileContext'
import { useTranslation } from 'react-i18next'
// import { Facebook, Instagram } from 'lucide-react'
import { SocialMediaSection } from './components/SocialMediaSection'

// Constants
const VIDEOS = [video1, video2]
const VIDEO_LOAD_TIMEOUT = 5000
const ADMIN_EMAIL_PATTERN = /admin/i

// Types
// interface SocialLinkProps {
//   href: string
//   icon: typeof Facebook | typeof Instagram
//   label: string
//   'aria-label': string
// }

// Extracted Components for better maintainability
// const SocialLink: React.FC<SocialLinkProps> = ({ href, icon: Icon, label, ...props }) => (
//   <a
//     href={href}
//     target="_blank"
//     rel="noopener noreferrer"
//     className="group relative"
//     {...props}
//   >
//     <div className="relative bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl border border-white/20 rounded-lg p-3 sm:p-3.5 shadow-lg shadow-black/10 transition-all duration-500 ease-out hover:scale-105 hover:bg-white/95 hover:shadow-2xl hover:shadow-black/20">
//       <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
//       <div className="relative flex items-center justify-center">
//         <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-[#0D0D0D]/70 group-hover:text-[#E62B2B] transition-colors duration-300" />
//       </div>
//       <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#E62B2B]/10 to-transparent opacity-0 group-hover:opacity-100 blur-md -z-10 transition-opacity duration-500" />

//       {/* Tooltip */}
//       <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 hidden sm:block">
//         <div className="bg-[#0D0D0D] text-white text-[10px] font-medium tracking-[0.15em] uppercase px-2 py-1 rounded-sm shadow-lg whitespace-nowrap">
//           {label}
//         </div>
//       </div>
//     </div>
//   </a>
// )

const MenuNavigation: React.FC = () => {
  const { t } = useTranslation()

  return (
    <div className="fixed top-24 right-4 sm:top-32 sm:right-8 z-50">
      <Link to="/menu" className="group relative block">
        <div className="relative">
          <div className="relative bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl border border-white/20 rounded-lg p-4 sm:p-6 transition-all duration-500 ease-out group-hover:bg-white/95 group-hover:shadow-2xl group-hover:shadow-black/20 hover:backdrop-blur-2xl hover:scale-105 hover:border-white/30 shadow-lg shadow-black/10">

            {/* Background Pattern */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            {/* Logo Geometry */}
            <div className="absolute -left-2 sm:-left-3 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-16 sm:h-16 opacity-40 group-hover:opacity-60 transition-all duration-500">
              <div className="absolute w-full h-[0.5px] sm:h-[1px] bg-gradient-to-r from-transparent via-[#0D0D0D] to-transparent transform rotate-[3.43deg] origin-left top-3 sm:top-4 opacity-30 sm:opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
              <div className="absolute w-full h-[0.5px] sm:h-[1px] bg-gradient-to-r from-transparent via-[#0D0D0D] to-transparent transform -rotate-[1.72deg] origin-left top-6 sm:top-8 opacity-30 sm:opacity-40 group-hover:opacity-60 transition-opacity duration-500 delay-75" />
              <div className="absolute left-3 sm:left-4 top-1/2 w-[0.5px] sm:w-[1px] h-6 sm:h-8 bg-gradient-to-b from-[#E62B2B] to-[#ff4444] transform -translate-y-1/2 rotate-90 opacity-70 sm:opacity-90 group-hover:opacity-100 group-hover:h-8 sm:group-hover:h-10 transition-all duration-500 delay-150" />
              <div className="absolute -top-1 -right-1 w-1 h-1 bg-[#E62B2B] rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-500 delay-300" />
            </div>

            {/* Content */}
            <div className="relative z-10 pl-6 sm:pl-8">
              <div className="text-transparent bg-gradient-to-r from-[#0D0D0D] to-[#0D0D0D]/80 bg-clip-text text-xs sm:text-[15px] font-light tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-1 sm:mb-2 leading-none transition-all duration-500 group-hover:tracking-[0.2em] sm:group-hover:tracking-[0.25em] group-hover:bg-gradient-to-r group-hover:from-[#E62B2B] group-hover:to-[#ff4444] group-hover:bg-clip-text">
                {t('nav.orders', 'Explore Menu')}
              </div>
              <div className="text-[#0D0D0D]/40 text-[9px] sm:text-[11px] font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase leading-none transition-all duration-500 group-hover:text-[#0D0D0D]/60 group-hover:tracking-[0.25em] sm:group-hover:tracking-[0.35em]">
                {t('landing.maisushi', 'MaiSushi')}
              </div>
            </div>

            {/* Accents */}
            <div className="absolute bottom-0 left-4 sm:left-6 right-4 sm:right-6 h-[0.5px] sm:h-[1px] bg-gradient-to-r from-transparent via-[#0D0D0D]/10 to-transparent transform origin-left transition-all duration-700 group-hover:scale-x-100 scale-x-0" />

            {/* Corner Accents */}
            {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((position, index) => (
              <div
                key={position}
                className={`absolute ${position} w-2 h-2 border-${position.includes('left') ? 'l' : 'r'} border-${position.includes('top') ? 't' : 'b'} border-[#0D0D0D]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-${(index + 2) * 100}`}
              />
            ))}
          </div>

          {/* Floating Signature */}
          <div className="absolute -bottom-6 sm:-bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-700 delay-300 translate-y-2 group-hover:translate-y-0 hidden sm:block">
            <div className="text-transparent bg-gradient-to-r from-[#0D0D0D]/20 to-[#0D0D0D]/10 bg-clip-text text-[8px] sm:text-[9px] font-light tracking-[0.3em] sm:tracking-[0.4em] uppercase whitespace-nowrap">
              {t('landing.craftsmanship', 'Craftsmanship')}
              <div className="absolute -bottom-1 left-0 right-0 h-[0.5px] bg-gradient-to-r from-transparent via-[#0D0D0D]/5 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 delay-500" />
            </div>
          </div>

          {/* Glow Effect */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#E62B2B]/5 to-transparent opacity-0 group-hover:opacity-100 blur-xl -z-10 transition-opacity duration-700" />
        </div>
      </Link>
    </div>
  )
}

interface CartSummaryProps {
  itemCount: number
  cartTotal: number
  userProfile: any
}

const CartSummary: React.FC<CartSummaryProps> = ({ itemCount, cartTotal, userProfile }) => {
  const { t } = useTranslation()

  if (itemCount === 0) return null

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50 animate-in fade-in duration-500">
      <Link to="/checkout" className="group relative block transform hover:scale-105 transition-transform duration-300">
        <div className="relative">
          <div className="relative bg-gradient-to-br from-white/95 to-white/85 backdrop-blur-xl border border-white/30 rounded-lg p-4 sm:p-5 transition-all duration-500 ease-out group-hover:bg-white/98 group-hover:shadow-2xl group-hover:shadow-black/25 hover:backdrop-blur-2xl shadow-lg shadow-black/15">

            {/* Notification Badge */}
            <div className="absolute -top-2 -right-2 z-20">
              <div className="relative">
                <div className="bg-[#E62B2B] text-white text-xs font-medium rounded-full w-6 h-6 flex items-center justify-center shadow-lg shadow-[#E62B2B]/40 animate-pulse-slow">
                  {itemCount}
                </div>
                <div className="absolute inset-0 bg-[#E62B2B] rounded-full animate-ping-slow" />
              </div>
            </div>

            {/* Geometric Pattern */}
            <div className="absolute -left-2 sm:-left-2.5 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 opacity-40 group-hover:opacity-60 transition-all duration-500">
              <div className="absolute w-full h-[0.5px] sm:h-[1px] bg-gradient-to-r from-transparent via-[#0D0D0D] to-transparent transform rotate-[3.43deg] origin-left top-2 sm:top-3 opacity-40 group-hover:opacity-70 transition-opacity duration-500" />
              <div className="absolute w-full h-[0.5px] sm:h-[1px] bg-gradient-to-r from-transparent via-[#0D0D0D] to-transparent transform -rotate-[1.72deg] origin-left top-4 sm:top-5 opacity-40 group-hover:opacity-70 transition-opacity duration-500 delay-75" />
              <div className="absolute left-2 sm:left-2.5 top-1/2 w-[0.5px] sm:w-[1px] h-5 sm:h-6 bg-gradient-to-b from-[#E62B2B] to-[#ff4444] transform -translate-y-1/2 rotate-90 opacity-80 group-hover:opacity-100 group-hover:h-6 sm:group-hover:h-7 transition-all duration-500" />
            </div>

            {/* Content */}
            <div className="relative z-10 pl-5 sm:pl-6">
              <div className="text-transparent bg-gradient-to-r from-[#0D0D0D] to-[#0D0D0D]/90 bg-clip-text text-[13px] sm:text-[16px] font-medium tracking-[0.05em] sm:tracking-[0.1em] uppercase mb-1 leading-none transition-all duration-500 group-hover:bg-gradient-to-r group-hover:from-[#E62B2B] group-hover:to-[#ff4444] group-hover:bg-clip-text">
                ${cartTotal.toFixed(2)}
              </div>
              <div className="text-[#0D0D0D]/60 text-[9px] sm:text-[11px] font-normal tracking-[0.1em] sm:tracking-[0.15em] uppercase leading-none mb-1 transition-all duration-500 group-hover:text-[#0D0D0D]/80">
                {itemCount} {itemCount === 1 ? t('cart.item', 'Item') : t('cart.items', 'Items')}
              </div>
              {userProfile && (
                <div className="text-transparent bg-gradient-to-r from-[#E62B2B] to-[#ff6b6b] bg-clip-text text-[9px] sm:text-[11px] font-medium tracking-[0.1em] sm:tracking-[0.15em] uppercase leading-none transition-all duration-500 group-hover:from-[#ff4444] group-hover:to-[#ff8585]">
                  +{Math.floor(cartTotal)} {t('cart.points', 'Points')}
                </div>
              )}
            </div>

            {/* Progress Line */}
            <div className="absolute bottom-0 left-3 sm:left-4 right-3 sm:right-4 h-[1px] sm:h-[1.5px] bg-gradient-to-r from-transparent via-[#E62B2B]/40 to-transparent transform origin-left transition-all duration-700 group-hover:scale-x-100 scale-x-0" />
          </div>

          {/* Floating Label */}
          <div className="absolute -bottom-5 sm:-bottom-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-200 translate-y-1 group-hover:translate-y-0">
            <div className="bg-[#0D0D0D] text-white text-[9px] sm:text-[10px] font-medium tracking-[0.15em] sm:tracking-[0.2em] uppercase whitespace-nowrap px-2 py-1 rounded-sm shadow-lg relative">
              {t('cart.checkout', 'Checkout')}
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-[#0D0D0D] rotate-45" />
            </div>
          </div>

          {/* Glow Effect */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#E62B2B]/10 to-transparent opacity-0 group-hover:opacity-100 blur-md -z-10 transition-opacity duration-500" />
        </div>
      </Link>
    </div>
  )
}

// Main Component
export default function LandingPage() {
  const { cart, addToCart } = useCartStore()
  const { userProfile } = useUserProfile()
  // const { t } = useTranslation()

  const [videoState, setVideoState] = useState({
    loaded: false,
    error: false,
    currentIndex: 0
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  // Use browser-native timer type instead of NodeJS.Timeout
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Memoized calculations
  const cartSummary = useMemo(() => ({
    itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }), [cart])

  const isAdmin = useMemo(() =>
    userProfile?.role === 'admin' || ADMIN_EMAIL_PATTERN.test(userProfile?.email || ''),
    [userProfile]
  )

  // Video handlers
  const handleVideoEnd = useCallback(() => {
    setVideoState(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % VIDEOS.length,
      loaded: false
    }))
  }, [])

  const handleVideoLoad = useCallback(() => {
    setVideoState(prev => ({ ...prev, loaded: true, error: false }))
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current)
    }
  }, [])

  const handleVideoError = useCallback(() => {
    setVideoState(prev => ({ ...prev, error: true, loaded: true }))
    console.error('Video failed to load')
  }, [])

  const handleAddToCart = useCallback((item: MenuItem) => {
    console.log('🛒 Adding to cart:', item.name)
    addToCart(item)
  }, [addToCart])

  // Video event listeners
  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    videoElement.addEventListener('ended', handleVideoEnd)
    return () => videoElement.removeEventListener('ended', handleVideoEnd)
  }, [handleVideoEnd])

  // Video load timeout
  useEffect(() => {
    loadTimeoutRef.current = setTimeout(() => {
      if (!videoState.loaded && !videoState.error) {
        console.warn('Video loading timeout - proceeding with fallback')
      }
    }, VIDEO_LOAD_TIMEOUT)

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
      }
    }
  }, [videoState.loaded, videoState.error])

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <LandingHeader />

      <LandingHero
        currentVideoIndex={videoState.currentIndex}
        handleVideoError={handleVideoError}
        handleVideoLoad={handleVideoLoad}
        setCurrentVideoIndex={(index) => setVideoState(prev => ({ ...prev, currentIndex: index }))}
        videoError={videoState.error}
        videoLoaded={videoState.loaded}
        videoRef={videoRef}
        videos={VIDEOS}
      />

      <SocialMediaSection />

      <MenuNavigation />

      <LandingFeatured handleAddToCart={handleAddToCart} />

      <div id="contact">
        <LandingContact />
      </div>

      <LandingCTAFooter displaySimple={false} user={userProfile} isAdmin={isAdmin} />

      <CartSummary
        itemCount={cartSummary.itemCount}
        cartTotal={cartSummary.total}
        userProfile={userProfile}
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;1,300&display=swap');
        
        .font-calligraphy {
          font-family: 'Playfair Display', serif;
        }
        
        @keyframes ping-slow {
          75%, 100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
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

        /* Mobile optimizations */
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