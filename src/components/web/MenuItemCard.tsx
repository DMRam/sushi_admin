import { useState, type Dispatch, type SetStateAction } from 'react'
import type { MenuItem } from '../../types/types'
import { useTranslation } from 'react-i18next'
import { Eye, Clock, Star, Plus, Play, Image as ImageIcon } from 'lucide-react'

interface MenuItemCardProps {
  item: MenuItem
  onAddToCart: (item: MenuItem) => void
  setIsModalOpenOP: Dispatch<SetStateAction<boolean>>
  isModalOpenOP: boolean
  onItemSelect?: (item: MenuItem) => void
}

export default function MenuItemCard({ item, onAddToCart, onItemSelect }: MenuItemCardProps) {
  const [showVideo, setShowVideo] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const { i18n, t } = useTranslation()

  // Function to get the current language description
  const getCurrentLanguageDescription = (description: { es: string; fr: string; en: string } | string) => {
    if (typeof description === 'string') {
      return description
    }

    const currentLanguage = i18n.language
    switch (currentLanguage) {
      case 'es':
        return description.es
      case 'fr':
        return description.fr
      case 'en':
      default:
        return description.en
    }
  }

  // Enhanced add to cart with pop animation
  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsAddingToCart(true)
    onAddToCart(item)

    // Reset animation after 600ms
    setTimeout(() => {
      setIsAddingToCart(false)
    }, 600)
  }

  // Simple open modal function
  const openImageModal = () => {
    // Call the parent component's handler if provided
    if (onItemSelect) {
      onItemSelect(item)
    }
  }

  const descriptionText = getCurrentLanguageDescription(item.description)

  return (
    <>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-500 group flex flex-col h-full hover:shadow-2xl hover:shadow-[#E62B2B]/10 hover:border-white/20">
        {/* Enhanced Image/Video Container */}
        <div
          className="relative h-56 bg-gradient-to-br from-gray-800 to-gray-900 cursor-pointer overflow-hidden flex-shrink-0 group"
          onClick={openImageModal}
        >
          {showVideo && item.videoUrl ? (
            <div className="relative w-full h-full">
              <video
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              >
                <source src={item.videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              {/* Video Overlay */}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/20 transform group-hover:scale-110 transition-transform duration-300">
                  <Eye className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ) : (
            <>
              <img
                src={item.image}
                alt={item.name}
                className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                onLoad={() => setImageLoaded(true)}
              />
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-pulse bg-gray-700 w-full h-full"></div>
                </div>
              )}
            </>
          )}

          {/* Enhanced Video Play Button Overlay */}
          {item.videoUrl && !showVideo && (
            <div
              className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                setShowVideo(!showVideo)
              }}
            >
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-5 border border-white/20 transform group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                <Play className="w-8 h-8 text-white fill-white" />
              </div>
              <span className="absolute bottom-4 left-4 text-white text-sm bg-black/50 px-3 py-2 rounded-lg font-medium tracking-wide backdrop-blur-sm border border-white/10">
                {t('common.watchVideo')}
              </span>
            </div>
          )}

          {/* Enhanced Hover overlay for image modal */}
          {!showVideo && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-500 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/20 transform group-hover:scale-110 transition-transform duration-300 flex items-center space-x-3">
                <Eye className="w-5 h-5 text-white" />
                <span className="text-white font-semibold text-sm">
                  {t('common.viewDetails')}
                </span>
              </div>
            </div>
          )}

          {/* Enhanced Badges */}
          <div className="absolute top-4 left-4 flex flex-col space-y-2">
            {item.popular && (
              <span className="bg-[#E62B2B] text-white text-sm px-4 py-2 rounded-xl border border-[#E62B2B] font-semibold tracking-wide shadow-lg shadow-[#E62B2B]/25 flex items-center space-x-2">
                <Star className="w-4 h-4" />
                <span>{t('common.popular')}</span>
              </span>
            )}
            {item.spicyLevel > 0 && (
              <span className="bg-orange-500/20 backdrop-blur-sm text-orange-300 text-sm px-4 py-2 rounded-xl border border-orange-500/30 flex items-center space-x-2 font-semibold">
                <span>🌶️</span>
                <span>{'•'.repeat(item.spicyLevel)}</span>
              </span>
            )}
          </div>

          {/* Enhanced Preparation Time */}
          <span className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-xl border border-white/10 font-semibold tracking-wide flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>{item.preparationTime}{t('common.min')}</span>
          </span>
        </div>

        {/* Enhanced Content - Simplified layout */}
        <div className="p-4 flex flex-col flex-1 min-h-0"> {/* Use flex-1 and min-h-0 for proper flex behavior */}
          {/* Header Section */}
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-white tracking-wide leading-tight pr-2 flex-1 line-clamp-2">
              {item.name}
            </h3>
            <span className="text-xl font-bold text-[#E62B2B] tracking-wide shrink-0 ml-2">
              ${item.price.toFixed(2)}
            </span>
          </div>

          {/* Description - Limited to 2 lines */}
          <div className="mb-3">
            <p className="text-white/60 text-sm font-light tracking-wide leading-relaxed line-clamp-2">
              {descriptionText}
            </p>
          </div>

          {/* Ingredients & Allergens - Compact layout */}
          <div className="space-y-2 mb-3 flex-1 min-h-0 overflow-hidden">
            {/* Enhanced Ingredients */}
            {item.ingredients && item.ingredients.length > 0 && (
              <div>
                <p className="text-xs text-white/40 mb-1 font-medium tracking-wide uppercase">{t('common.ingredients')}:</p>
                <div className="flex flex-wrap gap-1">
                  {item.ingredients.slice(0, 2).map((ingredient, index) => ( // Reduced to 2 items
                    <span
                      key={index}
                      className="bg-white/5 text-white/80 text-xs px-2 py-1 rounded border border-white/10 font-medium"
                    >
                      {ingredient}
                    </span>
                  ))}
                  {item.ingredients.length > 2 && (
                    <span className="text-white/40 text-xs font-medium bg-white/5 px-2 py-1 rounded border border-white/10">
                      +{item.ingredients.length - 2} {t('common.more')}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Enhanced Allergens */}
            {item.allergens && item.allergens.length > 0 && (
              <div>
                <p className="text-xs text-white/40 mb-1 font-medium tracking-wide uppercase">{t('common.contains')}:</p>
                <div className="flex flex-wrap gap-1">
                  {item.allergens.slice(0, 2).map((allergen, index) => ( // Reduced to 2 items
                    <span
                      key={index}
                      className="bg-red-500/10 text-red-300 text-xs px-2 py-1 rounded border border-red-500/20 font-medium"
                    >
                      {allergen}
                    </span>
                  ))}
                  {item.allergens.length > 2 && (
                    <span className="text-red-300/60 text-xs font-medium bg-red-500/5 px-2 py-1 rounded border border-red-500/10">
                      +{item.allergens.length - 2}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Fixed Action Buttons - Always visible at bottom */}
          <div className="flex space-x-2 pt-3 border-t border-white/10 mt-auto"> {/* mt-auto pushes to bottom */}
            <button
              onClick={handleAddToCart}
              className={`flex-1 bg-[#E62B2B] text-white py-2 px-3 rounded-lg transition-all duration-300 font-semibold tracking-wide text-center text-sm transform hover:scale-105 active:scale-95 shadow-lg shadow-[#E62B2B]/25 flex items-center justify-center space-x-2 relative overflow-hidden ${isAddingToCart
                  ? 'bg-green-600 scale-105 shadow-green-500/25'
                  : 'hover:bg-[#ff4444]'
                }`}
            >
              {/* Pop animation element */}
              {isAddingToCart && (
                <div className="absolute inset-0 bg-green-500 rounded-lg animate-ping opacity-20"></div>
              )}

              <Plus className={`w-3 h-3 transition-transform duration-300 ${isAddingToCart ? 'rotate-180 scale-125' : ''
                }`} />

              <span className={`transition-all duration-300 ${isAddingToCart ? 'scale-110' : ''
                }`}>
                {isAddingToCart ? t('common.added') : t('common.addToCart')}
              </span>
            </button>

            {item.videoUrl && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowVideo(!showVideo)
                }}
                className="bg-white/5 border border-white/10 text-white p-2 rounded-lg hover:bg-white/10 transition-all duration-300 flex-shrink-0 transform hover:scale-105 active:scale-95"
                title={showVideo ? t('common.showImage') : t('common.watchPreparation')}
              >
                {showVideo ? (
                  <ImageIcon className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 fill-white" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}