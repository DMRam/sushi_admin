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
  const addToCart = useCartStore((state) => state.addToCart)
  const cart = useCartStore((state) => state.cart)
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
      {/* Remove userProfile prop - LandingHeader now handles auth internally */}
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

      <LandingFeatured handleAddToCart={handleAddToCart} />

      <div id="contact">
        <LandingContact />
      </div>

      <LandingCTAFooter displaySimple={false} user={userProfile} isAdmin={isAdmin} />

      {itemCount > 0 && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div className="bg-white border border-gray-200 shadow-xl rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">${cartTotal.toFixed(2)}</div>
                <div className="text-xs text-gray-600 font-light tracking-wide">
                  {itemCount} {t('cart.items', 'ITEMS')}
                </div>
                {userProfile && (
                  <div className="text-xs text-green-600 font-medium mt-1">
                    +{Math.floor(cartTotal)} {t('cart.pointsEarned', 'pts earned')}
                  </div>
                )}
              </div>
              <Link
                to="/checkout"
                className="bg-red-600 text-white px-5 py-2.5 text-sm font-medium tracking-wider hover:bg-red-700 transition-all duration-300 rounded-sm hover:shadow-lg transform hover:-translate-y-0.5"
              >
                {t('cart.checkout', 'CHECKOUT')}
              </Link>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}