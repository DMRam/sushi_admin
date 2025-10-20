import { useState } from 'react'
import type { MenuItem } from '../../types/types'

interface MenuItemCardProps {
  item: MenuItem
  onAddToCart: (item: MenuItem) => void
}

export default function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
  const [showVideo, setShowVideo] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <div className="bg-white/5 border border-white/10 rounded-sm overflow-hidden hover:bg-white/10 transition-all duration-300 group flex flex-col h-full">
      {/* Image/Video Container */}
      <div
        className="relative h-48 bg-gray-800 cursor-pointer overflow-hidden flex-shrink-0"
        onClick={() => setShowVideo(!showVideo)}
      >
        {showVideo && item.videoUrl ? (
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
        ) : (
          <>
            <img
              src={item.image}
              alt={item.name}
              className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'
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

        {/* Video Play Button Overlay */}
        {item.videoUrl && !showVideo && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-white/20 backdrop-blur-sm rounded-sm p-4 border border-white/20">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="absolute bottom-3 left-3 text-white text-xs bg-black/50 px-2 py-1 rounded-sm font-light tracking-wide">
              Tap to see video
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col space-y-2">
          {item.popular && (
            <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-sm border border-white/20 font-light tracking-wide">
              Popular
            </span>
          )}
          {item.spicyLevel > 0 && (
            <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-sm border border-white/20 flex items-center font-light">
              <span>🌶️</span>
              <span className="ml-1">{'•'.repeat(item.spicyLevel)}</span>
            </span>
          )}
        </div>

        {/* Preparation Time */}
        <span className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-sm font-light tracking-wide">
          {item.preparationTime}min
        </span>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-light text-white tracking-wide leading-tight pr-2">{item.name}</h3>
          <span className="text-2xl font-light text-white tracking-wide flex-shrink-0">${item.price.toFixed(2)}</span>
        </div>

        <p className="text-white/60 text-sm mb-4 font-light tracking-wide leading-relaxed line-clamp-2">
          {item.description}
        </p>

        {/* Ingredients */}
        <div className="mb-4">
          <p className="text-xs text-white/40 mb-2 font-light tracking-wide">Ingredients:</p>
          <div className="flex flex-wrap gap-2">
            {item.ingredients.slice(0, 3).map((ingredient, index) => (
              <span
                key={index}
                className="bg-white/5 text-white/80 text-xs px-3 py-1 rounded-sm border border-white/10 font-light tracking-wide"
              >
                {ingredient}
              </span>
            ))}
            {item.ingredients.length > 3 && (
              <span className="text-white/40 text-xs font-light tracking-wide">+{item.ingredients.length - 3} more</span>
            )}
          </div>
        </div>

        {/* Allergens */}
        {item.allergens.length > 0 && (
          <div className="mb-6">
            <p className="text-xs text-white/40 mb-2 font-light tracking-wide">Contains:</p>
            <div className="flex flex-wrap gap-2">
              {item.allergens.map((allergen, index) => (
                <span
                  key={index}
                  className="bg-white/10 text-white/80 text-xs px-3 py-1 rounded-sm border border-white/20 font-light tracking-wide"
                >
                  {allergen}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Spacer to push buttons to bottom */}
        <div className="flex-grow"></div>

        {/* Action Buttons - Always at the bottom */}
        <div className="flex space-x-3 mt-auto pt-4">
          <button
            onClick={() => onAddToCart(item)}
            className="flex-1 border border-white text-white py-3 px-4 rounded-sm hover:bg-white hover:text-gray-900 transition-all duration-300 font-light tracking-wide text-center text-sm"
          >
            Add to Cart
          </button>
          {item.videoUrl && (
            <button
              onClick={() => setShowVideo(!showVideo)}
              className="bg-white/5 border border-white/10 text-white p-3 rounded-sm hover:bg-white/10 transition-all duration-300 flex-shrink-0"
              title={showVideo ? "Show image" : "Watch preparation"}
            >
              {showVideo ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}