import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../../firebase/firebase'
import type { MenuItem, Product, ProductIngredient } from '../../../types/types'
import { useTranslation } from 'react-i18next'

interface Props {
    handleAddToCart: (item: MenuItem) => void
}

export const LandingFeatured = ({ handleAddToCart }: Props) => {
    const { t, i18n } = useTranslation()
    const [featuredItems, setFeaturedItems] = useState<MenuItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isClosing, setIsClosing] = useState(false)

    // Function to get the description based on current language
    const getLocalizedDescription = (description: { es: string; fr: string; en: string } | string) => {
        if (typeof description === 'string') {
            // If it's a string, convert it to the multilingual object format
            return {
                en: description,
                es: description,
                fr: description
            }
        }

        // If it's already an object, return it as is
        return description
    }

    // Function to get the current language description for display
    const getCurrentLanguageDescription = (description: { es: string; fr: string; en: string }) => {
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

    // Open modal with selected item
    const openItemModal = (item: MenuItem) => {
        setSelectedItem(item)
        setIsModalOpen(true)
        setIsClosing(false)
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden'
    }

    // Close modal with animation
    const closeItemModal = () => {
        setIsClosing(true)
        // Wait for animation to complete before removing from DOM
        setTimeout(() => {
            setIsModalOpen(false)
            setSelectedItem(null)
            setIsClosing(false)
            // Restore body scroll
            document.body.style.overflow = 'unset'
        }, 300)
    }

    // Handle add to cart from modal
    const handleAddToCartFromModal = () => {
        if (selectedItem) {
            handleAddToCart(selectedItem)
            closeItemModal()
        }
    }

    // Close modal on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isModalOpen) {
                closeItemModal()
            }
        }

        document.addEventListener('keydown', handleEscape)
        return () => {
            document.removeEventListener('keydown', handleEscape)
        }
    }, [isModalOpen])

    useEffect(() => {
        const q = query(
            collection(db, 'products'),
            where('featured', '==', true),
        )

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                try {
                    console.log('Featured products updated:', snapshot.docs.length)

                    const productsData: Product[] = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as Product))

                    const menuItems: MenuItem[] = productsData.map(product => {
                        const ingredientNames = (product.ingredients || []).map((ing: ProductIngredient) =>
                            ing.name || 'Unknown Ingredient'
                        )

                        // Convert description to multilingual object format
                        const multilingualDescription = getLocalizedDescription(product.description || '')

                        return {
                            id: product.id,
                            name: product.name || 'Unnamed Product',
                            description: multilingualDescription, // This now matches the MenuItem interface
                            preparation: product.preparation || '',
                            price: product.sellingPrice || 0,
                            image: product.imageUrls?.[0] || '/images/placeholder-food.jpg',
                            category: product.category || 'uncategorized',
                            videoUrl: product.preparationVideoUrl,
                            ingredients: ingredientNames,
                            allergens: product.allergens || [],
                            preparationTime: product.preparationTime || 15,
                            spicyLevel: product.tags?.includes('spicy') || product.tags?.includes('Spicy') ? 2 : 0,
                            popular: product.tags?.includes('popular') || product.tags?.includes('Popular') || false,
                            quantity: product.quantity || 0,
                            featured: product.featured || false
                        }
                    })

                    setFeaturedItems(menuItems)
                    setLoading(false)
                    setError(null)
                } catch (err) {
                    console.error('Error processing featured products:', err)
                    setError(t('featured.errorLoading', 'Failed to load featured items'))
                    setLoading(false)
                }
            },
            (error) => {
                console.error('Error fetching featured products:', error)
                setError(t('featured.connectionError', 'Failed to connect to server'))
                setLoading(false)
            }
        )

        return () => unsubscribe()
    }, [t, i18n.language])

    // Modal Component
    const ItemModal = () => {
        if (!selectedItem) return null

        return (
            <div
                className={`fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 transition-all duration-300 ${isClosing
                        ? 'bg-black bg-opacity-0 backdrop-blur-0'
                        : 'bg-black bg-opacity-75 backdrop-blur-sm'
                    }`}
                onClick={closeItemModal}
            >
                <div
                    className={`relative bg-white w-full md:max-w-4xl md:rounded-2xl md:max-h-[90vh] overflow-hidden transform transition-all duration-300 ${isClosing
                            ? 'translate-y-full md:translate-y-4 md:scale-95 opacity-0'
                            : 'translate-y-0 md:scale-100 opacity-100'
                        } h-[85vh] md:h-auto flex flex-col`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close Button - Moved to top left to avoid price overlap */}
                    <button
                        onClick={closeItemModal}
                        className="absolute top-4 left-4 z-20 w-10 h-10 bg-white bg-opacity-90 text-gray-800 rounded-full flex items-center justify-center hover:bg-opacity-100 hover:scale-110 transition-all duration-200 shadow-lg border border-gray-200"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="flex flex-col md:flex-row h-full overflow-hidden">
                        {/* Image Section - Fixed height on mobile */}
                        <div className="md:w-1/2 relative h-64 md:h-auto shrink-0">
                            {selectedItem.image && selectedItem.image !== '/images/placeholder-food.jpg' ? (
                                <img
                                    src={selectedItem.image}
                                    alt={selectedItem.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-linear-to-br from-slate-300 to-slate-400 flex items-center justify-center">
                                    <span className="text-6xl text-slate-600 opacity-50">
                                        {selectedItem.category === 'ceviche' ? '○' : selectedItem.category === 'signature' ? '◉' : '◎'}
                                    </span>
                                </div>
                            )}

                            {/* Badge on image - moved to top right since close is now top left */}
                            <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 text-sm font-medium rounded shadow-lg">
                                {selectedItem.popular ? t('featured.chefsPick', 'Chef\'s Pick') : t('featured.featured', 'Featured')}
                            </div>
                        </div>

                        {/* Content Section - Scrollable on mobile */}
                        <div className="md:w-1/2 p-6 md:p-8 flex flex-col h-full overflow-hidden">
                            {/* Scrollable content */}
                            <div className="flex-1 overflow-y-auto pb-4">
                                <div className="flex justify-between items-start mb-4">
                                    <h2 className="text-2xl md:text-3xl font-light text-gray-900 pr-4">
                                        {selectedItem.name}
                                    </h2>
                                    <span className="text-2xl font-light text-red-600 whitespace-nowrap flex-shrink-0">
                                        ${selectedItem.price.toFixed(2)}
                                    </span>
                                </div>

                                {/* Description */}
                                <p className="text-gray-600 mb-6 leading-relaxed">
                                    {getCurrentLanguageDescription(selectedItem.description)}
                                </p>

                                {/* Ingredients */}
                                {selectedItem.ingredients && selectedItem.ingredients.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-sm font-medium text-gray-900 mb-2 uppercase tracking-wide">
                                            {t('featured.ingredients', 'Ingredients')}
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedItem.ingredients.map((ingredient, index) => (
                                                <span
                                                    key={index}
                                                    className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm border border-gray-200"
                                                >
                                                    {ingredient}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Allergens */}
                                {selectedItem.allergens && selectedItem.allergens.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-sm font-medium text-gray-900 mb-2 uppercase tracking-wide">
                                            {t('featured.allergens', 'Allergens')}
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedItem.allergens.map((allergen, index) => (
                                                <span
                                                    key={index}
                                                    className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm border border-red-200"
                                                >
                                                    {allergen}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Additional Info */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    {selectedItem.preparationTime && (
                                        <div className="text-center bg-gray-50 rounded-lg p-3 border border-gray-200">
                                            <div className="text-gray-500 text-sm mb-1">
                                                {t('featured.preparationTime', 'Prep Time')}
                                            </div>
                                            <div className="text-gray-900 font-medium flex items-center justify-center">
                                                <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {selectedItem.preparationTime} min
                                            </div>
                                        </div>
                                    )}
                                    {selectedItem.spicyLevel > 0 && (
                                        <div className="text-center bg-gray-50 rounded-lg p-3 border border-gray-200">
                                            <div className="text-gray-500 text-sm mb-1">
                                                {t('featured.spiceLevel', 'Spice Level')}
                                            </div>
                                            <div className="text-gray-900 font-medium flex justify-center">
                                                {Array.from({ length: 3 }).map((_, i) => (
                                                    <span
                                                        key={i}
                                                        className={`w-2 h-2 rounded-full mx-1 ${i < selectedItem.spicyLevel ? 'bg-red-500' : 'bg-gray-300'}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons - Fixed at bottom on mobile */}
                            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200 bg-white sticky bottom-0">
                                <button
                                    onClick={handleAddToCartFromModal}
                                    className="flex-1 bg-red-600 text-white py-3 px-4 rounded-md font-medium 
               hover:bg-red-700 transition-all duration-200 transform 
               hover:scale-102 active:scale-95 shadow-md text-sm"
                                >
                                    {t('featured.addToCart', 'Add to Order')}
                                </button>

                                <button
                                    onClick={closeItemModal}
                                    className="px-4 py-3 border border-gray-300 text-gray-700 rounded-md font-medium 
               hover:bg-gray-50 transition-all duration-200 transform 
               hover:scale-102 active:scale-95 text-sm"
                                >
                                    {t('featured.close', 'Close')}
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <section className="py-16 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-12">
                        <h3 className="text-3xl font-light text-gray-900 mb-4">
                            {t('featured.signatureCreations', 'Signature Creations')}
                        </h3>
                        <div className="w-20 h-0.5 bg-red-600 mx-auto"></div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="bg-slate-50 border border-gray-200 rounded-lg overflow-hidden group hover:shadow-lg transition-all duration-300">
                                <div className="h-48 bg-linear-to-br from-slate-300 to-slate-400 relative overflow-hidden">
                                    <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 text-sm font-medium">
                                        {t('featured.chefsPick', 'Chef\'s Pick')}
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="text-xl font-medium text-gray-900">
                                            {t('featured.loading', 'Loading...')}
                                        </h4>
                                        <span className="text-lg font-light text-red-600">$--</span>
                                    </div>
                                    <p className="text-gray-600 text-sm font-light mb-4 leading-relaxed">
                                        {t('featured.loadingDescription', 'Loading description...')}
                                    </p>
                                    <button className="w-full bg-gray-900 text-white py-3 text-sm font-medium tracking-wide hover:bg-red-600 transition-colors duration-300 opacity-50 cursor-not-allowed">
                                        {t('featured.loading', 'Loading...')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        )
    }

    if (error) {
        return (
            <section className="py-16 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-12">
                        <h3 className="text-3xl font-light text-gray-900 mb-4">
                            {t('featured.signatureCreations', 'Signature Creations')}
                        </h3>
                        <div className="w-20 h-0.5 bg-red-600 mx-auto"></div>
                    </div>
                    <div className="text-center text-red-600">
                        <p>{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            {t('featured.tryAgain', 'Try Again')}
                        </button>
                    </div>
                </div>
            </section>
        )
    }

    if (featuredItems.length === 0) {
        return (
            <section className="py-16 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-12">
                        <h3 className="text-3xl font-light text-gray-900 mb-4">
                            {t('featured.signatureCreations', 'Signature Creations')}
                        </h3>
                        <div className="w-20 h-0.5 bg-red-600 mx-auto"></div>
                    </div>
                    <div className="text-center text-gray-600">
                        <p>{t('featured.noItems', 'No featured items available')}</p>
                        <Link
                            to="/order"
                            className="inline-block mt-4 bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
                        >
                            {t('featured.viewMenu', 'View Complete Menu')}
                        </Link>
                    </div>
                </div>
            </section>
        )
    }

    return (
        <>
            <section className="py-16 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-12">
                        <h3 className="text-3xl font-light text-gray-900 mb-4">
                            {t('featured.signatureCreations', 'Signature Creations')}
                        </h3>
                        <div className="w-20 h-0.5 bg-red-600 mx-auto"></div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {featuredItems.map((item) => (
                            <div
                                key={item.id}
                                className="bg-slate-50 border border-gray-200 rounded-lg overflow-hidden group hover:shadow-lg transition-all duration-300 h-full flex flex-col"
                            >
                                {/* Clickable Image */}
                                <div
                                    className="h-48 bg-linear-to-br from-slate-300 to-slate-400 relative overflow-hidden cursor-pointer"
                                    onClick={() => openItemModal(item)}
                                >
                                    {item.image && item.image !== '/images/placeholder-food.jpg' ? (
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-linear-to-br from-slate-300 to-slate-400 flex items-center justify-center">
                                            <span className="text-4xl text-slate-600 opacity-50">
                                                {item.category === 'ceviche' ? '○' : item.category === 'signature' ? '◉' : '◎'}
                                            </span>
                                        </div>
                                    )}

                                    <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 text-sm font-medium">
                                        {item.popular ? t('featured.chefsPick', 'Chef\'s Pick') : t('featured.featured', 'Featured')}
                                    </div>

                                    {/* Hover overlay with view details text */}
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <span className="text-white font-medium bg-black bg-opacity-50 px-4 py-2 rounded-lg">
                                            {t('featured.viewDetails', 'View Details')}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-6 flex flex-col grow">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="text-xl font-medium text-gray-900">{item.name}</h4>
                                        <span className="text-lg font-light text-red-600">${item.price.toFixed(2)}</span>
                                    </div>
                                    <p className="text-gray-600 text-sm font-light mb-4 leading-relaxed">
                                        {getCurrentLanguageDescription(item.description)}
                                    </p>
                                    <button
                                        onClick={() => handleAddToCart(item)}
                                        className="w-full bg-gray-900 text-white py-3 text-sm font-medium tracking-wide hover:bg-red-600 transition-colors duration-300 mt-auto"
                                    >
                                        {t('featured.addToCart', 'Add to Order')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Modal */}
            {isModalOpen && <ItemModal />}
        </>
    )
}