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
    <div className="fixed inset-x-3 bottom-3 z-50 animate-in fade-in duration-500 sm:inset-x-auto sm:bottom-6 sm:right-6">
      <Link
        to="/checkout"
        className="group flex w-full items-center justify-between gap-4 rounded-md border border-[#f26350]/40 bg-[#0b0b0b]/95 px-4 py-3 text-white shadow-2xl shadow-black/40 backdrop-blur-xl transition hover:border-[#f26350] hover:bg-[#111] sm:w-auto sm:min-w-[220px]"
        aria-label={`${t('cart.checkout', 'Checkout')} ${itemCount} ${itemCount === 1 ? t('cart.item', 'Item') : t('cart.items', 'Items')}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#f26350] text-white">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full border border-[#0b0b0b] bg-white px-1 text-[10px] font-bold text-[#f26350]">
              {itemCount}
            </span>
          </div>

          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
              {t('cart.checkout', 'Checkout')}
            </div>
            <div className="mt-0.5 text-base font-bold tracking-[0.04em] text-white">
              ${cartTotal.toFixed(2)}
            </div>
            {userProfile && (
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#f26350]">
                +{Math.floor(cartTotal)} {t('cart.points', 'Points')}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">
            {itemCount} {itemCount === 1 ? t('cart.item', 'Item') : t('cart.items', 'Items')}
          </div>
          <div className="mt-1 h-0.5 w-12 bg-[#f26350] transition group-hover:w-16" />
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

      <main className={`relative overflow-hidden ${cartSummary.itemCount > 0 ? 'pb-24 sm:pb-0' : ''}`}>
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

        <div className="bg-[#050505]">
          <LandingContact />
        </div>

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
