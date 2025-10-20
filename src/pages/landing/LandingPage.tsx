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

export default function LandingPage() {
  const addToCart = useCartStore((state) => state.addToCart)
  const cart = useCartStore((state) => state.cart)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const videos = [video1, video2]
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // Handle video end to switch to next video
  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    const handleVideoEnd = () => {
      setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % videos.length)
      setVideoLoaded(false) // Reset loaded state for next video
    }

    videoElement.addEventListener('ended', handleVideoEnd)
    return () => videoElement.removeEventListener('ended', handleVideoEnd)
  }, [videos.length])

  // Set timeout to show loading animation if video takes too long
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
    <div className="min-h-screen bg-white">
      {/* Elegant Header */}
      <LandingHeader />

      {/* Enhanced Hero Section with Smooth Video Transitions */}
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
      <LandingContact />

      <LandingCTAFooter displaySimple={false} />

      {/* Minimal Floating Cart */}
      {itemCount > 0 && (
        <div className="fixed bottom-6 right-6 bg-white border border-gray-300 shadow-lg p-4 z-50 animate-fade-in">
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-light text-gray-900">${cartTotal.toFixed(2)}</div>
              <div className="text-xs text-gray-500 font-light">{itemCount} ITEMS</div>
            </div>
            <Link
              to="/checkout"
              className="bg-gray-900 text-white px-4 py-2 text-xs font-light tracking-wide hover:bg-gray-800 transition-all duration-300"
            >
              RESERVE
            </Link>
          </div>
        </div>
      )}

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px);}
          to { opacity: 1; transform: translateY(0);}
        }
      `}</style>
    </div>
  )
}