// components/MenuItemCard.tsx
import { useState, type JSXElementConstructor, type Key, type ReactElement, type ReactNode, type ReactPortal } from 'react'
import type { MenuItem } from '../types/types'

interface MenuItemCardProps {
  item: MenuItem
  onAddToCart: (item: MenuItem) => void
}

export default function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
  const [showVideo, setShowVideo] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      {/* Image/Video Container */}
      <div 
        className="relative h-48 bg-gray-100 cursor-pointer overflow-hidden"
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
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-pulse bg-gray-200 w-full h-full"></div>
              </div>
            )}
          </>
        )}

        {/* Video Play Button Overlay */}
        {item.videoUrl && !showVideo && (
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <div className="bg-white bg-opacity-90 rounded-full p-3">
              <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <span className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
              Tap to see video
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col space-y-1">
          {item.popular && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              Popular
            </span>
          )}
          {item.spicyLevel > 0 && (
            <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
              <span>🌶️</span>
              {'•'.repeat(item.spicyLevel)}
            </span>
          )}
        </div>

        {/* Preparation Time */}
        <span className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
          {item.preparationTime}min
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
          <span className="text-xl font-bold text-red-600">${item.price.toFixed(2)}</span>
        </div>
        
        <p className="text-gray-600 text-sm mb-3">{item.description}</p>
        
        {/* Ingredients */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">Ingredients:</p>
          <div className="flex flex-wrap gap-1">
            {item.ingredients.slice(0, 3).map((ingredient: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined, index: Key | null | undefined) => (
              <span key={index} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                {ingredient}
              </span>
            ))}
            {item.ingredients.length > 3 && (
              <span className="text-gray-500 text-xs">+{item.ingredients.length - 3} more</span>
            )}
          </div>
        </div>

        {/* Allergens */}
        {item.allergens.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Contains:</p>
            <div className="flex flex-wrap gap-1">
              {item.allergens.map((allergen: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined, index: Key | null | undefined) => (
                <span key={index} className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                  {allergen}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={() => onAddToCart(item)}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            Add to Cart
          </button>
          {item.videoUrl && (
            <button
              onClick={() => setShowVideo(!showVideo)}
              className="bg-gray-200 text-gray-700 p-2 rounded-lg hover:bg-gray-300 transition-colors"
              title={showVideo ? "Show image" : "Watch preparation"}
            >
              {showVideo ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}