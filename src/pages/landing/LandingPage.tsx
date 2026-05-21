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
import { ChefHat, Leaf, ShoppingBag, Star } from 'lucide-react'
import { SocialMediaSection } from './components/SocialMediaSection'

const VIDEOS = [video1, video2]
const VIDEO_LOAD_TIMEOUT = 5000
const ADMIN_EMAIL_PATTERN = /admin/i

interface CartSummaryProps {
  itemCount: number
  cartTotal: number
  userProfile: any
}

const CartSummary: React.FC<CartSummaryProps> = ({ itemCount, cartTotal, userProfile }) => {
  const { t } = useTranslation()

  if (itemCount === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in duration-500 sm:bottom-8 sm:right-8">
      <Link to="/checkout" className="group relative block transition-transform duration-300 hover:scale-105">
        <div className="relative overflow-hidden rounded-md border border-[#f26350]/30 bg-[#0b0b0b]/95 p-4 text-white shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-5">
          <div className="absolute -right-2 -top-2 z-20">
            <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-[#f26350] text-xs font-bold text-white shadow-lg shadow-[#f26350]/40">
              {itemCount}
            </div>
          </div>

          <div className="relative z-10 min-w-[132px]">
            <div className="mb-1 text-[15px] font-bold uppercase tracking-[0.1em] text-white sm:text-[17px]">
              ${cartTotal.toFixed(2)}
            </div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/65">
              {itemCount} {itemCount === 1 ? t('cart.item', 'Item') : t('cart.items', 'Items')}
            </div>
            {userProfile && (
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#f26350]">
                +{Math.floor(cartTotal)} {t('cart.points', 'Points')}
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 h-[2px] w-full origin-left scale-x-0 bg-[#f26350] transition-transform duration-500 group-hover:scale-x-100" />
        </div>
      </Link>
    </div>
  )
}

const ValueProps: React.FC = () => {
  const { t } = useTranslation()
  const items = [
    {
      title: t('landing.valueProps.fresh.title', 'Ingrédients frais'),
      copy: t('landing.valueProps.fresh.copy', 'Sélectionnés avec soin chaque jour'),
      Icon: Leaf,
    },
    {
      title: t('landing.valueProps.handmade.title', 'Fait à la main'),
      copy: t('landing.valueProps.handmade.copy', 'Sushi préparé avec passion par nos chefs'),
      Icon: ChefHat,
    },
    {
      title: t('landing.valueProps.flavors.title', 'Saveurs uniques'),
      copy: t('landing.valueProps.flavors.copy', 'Des créations originales et raffinées'),
      Icon: Star,
    },
    {
      title: t('landing.valueProps.takeout.title', 'À emporter'),
      copy: t('landing.valueProps.takeout.copy', 'Commandez facilement en ligne'),
      Icon: ShoppingBag,
    },
  ]

  return (
    <section className="border-y border-white/10 bg-[#060606]">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 divide-y divide-white/10 px-5 sm:grid-cols-4 sm:divide-x sm:divide-y-0 lg:px-10">
        {items.map(({ Icon, ...item }) => (
          <div key={item.title} className="flex gap-5 py-7 sm:gap-4 sm:px-5 sm:py-7 lg:px-8 lg:py-9">
            <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center text-[#f26350] sm:h-11 sm:w-11 lg:h-14 lg:w-14">
              <Icon strokeWidth={1.6} className="h-10 w-10 sm:h-9 sm:w-9 lg:h-12 lg:w-12" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-white sm:text-[10px] lg:text-[13px]">
                {item.title}
              </h3>
              <p className="mt-2 max-w-[240px] text-[13px] leading-5 text-white/72 sm:text-[11px] sm:leading-5 lg:text-[14px] lg:leading-6">{item.copy}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function LandingPage() {
  const { cart, addToCart } = useCartStore()
  const { userProfile } = useUserProfile()

  const [videoState, setVideoState] = useState({
    loaded: false,
    error: false,
    currentIndex: VIDEOS.length > 1 ? 1 : 0
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const cartSummary = useMemo(() => ({
    itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }), [cart])

  const isAdmin = useMemo(() =>
    userProfile?.role === 'admin' || ADMIN_EMAIL_PATTERN.test(userProfile?.email || ''),
    [userProfile]
  )

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
    window.fbq?.('track', 'AddToCart', {
      value: item.price,
      currency: 'CAD',
      content_name: item.name,
      content_type: 'product',
    })

    addToCart(item)
  }, [addToCart])

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    videoElement.addEventListener('ended', handleVideoEnd)
    return () => videoElement.removeEventListener('ended', handleVideoEnd)
  }, [handleVideoEnd])

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
    <div className="min-h-screen bg-[#050505] font-sans text-white">
      <LandingHeader />

      <main className="relative overflow-hidden">
        <div className="landing-premium-hero">
          <LandingHero
            currentVideoIndex={videoState.currentIndex}
            handleVideoError={handleVideoError}
            handleVideoLoad={handleVideoLoad}
            setCurrentVideoIndex={(index) =>
              setVideoState(prev => ({ ...prev, currentIndex: index }))
            }
            videoError={videoState.error}
            videoLoaded={videoState.loaded}
            videoRef={videoRef}
            videos={VIDEOS}
          />
        </div>

        <SocialMediaSection />
        <ValueProps />

        <LandingFeatured handleAddToCart={handleAddToCart} />

        <section id="contact" className="bg-[#050505]">
          <LandingContact />
        </section>

        <LandingCTAFooter displaySimple={false} user={userProfile} isAdmin={isAdmin} />
      </main>

      <CartSummary
        itemCount={cartSummary.itemCount}
        cartTotal={cartSummary.total}
        userProfile={userProfile}
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap');

        .font-calligraphy {
          font-family: 'Playfair Display', serif;
        }

        .landing-premium-hero {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: #050505;
        }

        .landing-premium-hero video,
        .landing-premium-hero img {
          filter: contrast(1.08) saturate(1.08);
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

        @media (max-width: 640px) {
          .backdrop-blur-xl {
            backdrop-filter: blur(16px);
          }
        }
      `}</style>
    </div>
  )
}
