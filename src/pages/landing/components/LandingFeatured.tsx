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
    const { t } = useTranslation()
    const [featuredItems, setFeaturedItems] = useState<MenuItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Real-time listener for featured products
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

                    // Convert to MenuItem format
                    const menuItems: MenuItem[] = productsData.map(product => {
                        const ingredientNames = (product.ingredients || []).map((ing: ProductIngredient) =>
                            ing.name || 'Unknown Ingredient'
                        )

                        return {
                            id: product.id,
                            name: product.name || 'Unnamed Product',
                            description: product.description || '',
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
                    setError('Failed to load featured items')
                    setLoading(false)
                }
            },
            (error) => {
                console.error('Error fetching featured products:', error)
                setError('Failed to connect to server')
                setLoading(false)
            }
        )

        // Cleanup subscription on unmount
        return () => unsubscribe()
    }, [])

    if (loading) {
        return (
            <>
                {/* Philosophy Section */}
                <section className="py-16 bg-white text-center">
                    <div className="max-w-3xl mx-auto px-6">
                        <p className="text-lg text-gray-700 font-light leading-relaxed">
                            {t('landing.philosophy', 'We focus on balance, freshness, and honest flavor in every dish.')}
                        </p>
                    </div>
                </section>

                {/* Featured Creations Loading */}
                <section className="py-20 bg-gray-50">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-light text-gray-900 mb-4 tracking-tight">
                                {t('landing.featuredCreations', 'Featured Creations')}
                            </h2>
                            <div className="w-16 h-px bg-gray-300 mx-auto"></div>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-600 font-light">{t('landing.loadingFeatured', 'Loading featured creations...')}</p>
                        </div>
                    </div>
                </section>

                {/* Experience Section */}
                <section className="py-20 bg-white">
                    <div className="container mx-auto px-6">
                        <div className="max-w-4xl mx-auto">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                                <div>
                                    <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-white text-sm">❶</span>
                                    </div>
                                    <h3 className="text-sm font-light text-gray-900 mb-2 tracking-wide">
                                        {t('landing.selection', 'SELECTION')}
                                    </h3>
                                    <p className="text-xs text-gray-600 font-light leading-relaxed">
                                        {t('landing.selectionDescription', 'Daily curated ingredients from sustainable sources')}
                                    </p>
                                </div>

                                <div>
                                    <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-white text-sm">❷</span>
                                    </div>
                                    <h3 className="text-sm font-light text-gray-900 mb-2 tracking-wide">
                                        {t('landing.craftsmanship', 'CRAFTSMANSHIP')}
                                    </h3>
                                    <p className="text-xs text-gray-600 font-light leading-relaxed">
                                        {t('landing.craftsmanshipDescription', 'Traditional techniques meet contemporary vision')}
                                    </p>
                                </div>

                                <div>
                                    <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-white text-sm">❸</span>
                                    </div>
                                    <h3 className="text-sm font-light text-gray-900 mb-2 tracking-wide">
                                        {t('landing.experience', 'EXPERIENCE')}
                                    </h3>
                                    <p className="text-xs text-gray-600 font-light leading-relaxed">
                                        {t('landing.experienceDescription', 'Thoughtful presentation and seamless service')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </>
        )
    }

    if (error) {
        return (
            <>
                {/* Philosophy Section */}
                <section className="py-16 bg-white text-center">
                    <div className="max-w-3xl mx-auto px-6">
                        <p className="text-lg text-gray-700 font-light leading-relaxed">
                            {t('landing.philosophy', 'We focus on balance, freshness, and honest flavor in every dish.')}
                        </p>
                    </div>
                </section>

                {/* Featured Creations Error */}
                <section className="py-20 bg-gray-50">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-light text-gray-900 mb-4 tracking-tight">
                                {t('landing.featuredCreations', 'Featured Creations')}
                            </h2>
                            <div className="w-16 h-px bg-gray-300 mx-auto"></div>
                        </div>

                        <div className="text-center">
                            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <h3 className="text-lg font-light text-gray-600 mb-2">{t('landing.errorLoading', 'Unable to load featured items')}</h3>
                            <p className="text-gray-500 font-light text-sm mb-4">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="border border-gray-300 text-gray-600 px-4 py-2 rounded-sm hover:bg-gray-100 transition-all duration-300 font-light"
                            >
                                {t('landing.tryAgain', 'Try Again')}
                            </button>
                        </div>
                    </div>
                </section>

                {/* Experience Section */}
                <section className="py-20 bg-white">
                    <div className="container mx-auto px-6">
                        <div className="max-w-4xl mx-auto">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                                <div>
                                    <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-white text-sm">❶</span>
                                    </div>
                                    <h3 className="text-sm font-light text-gray-900 mb-2 tracking-wide">
                                        {t('landing.selection', 'SELECTION')}
                                    </h3>
                                    <p className="text-xs text-gray-600 font-light leading-relaxed">
                                        {t('landing.selectionDescription', 'Daily curated ingredients from sustainable sources')}
                                    </p>
                                </div>

                                <div>
                                    <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-white text-sm">❷</span>
                                    </div>
                                    <h3 className="text-sm font-light text-gray-900 mb-2 tracking-wide">
                                        {t('landing.craftsmanship', 'CRAFTSMANSHIP')}
                                    </h3>
                                    <p className="text-xs text-gray-600 font-light leading-relaxed">
                                        {t('landing.craftsmanshipDescription', 'Traditional techniques meet contemporary vision')}
                                    </p>
                                </div>

                                <div>
                                    <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-white text-sm">❸</span>
                                    </div>
                                    <h3 className="text-sm font-light text-gray-900 mb-2 tracking-wide">
                                        {t('landing.experience', 'EXPERIENCE')}
                                    </h3>
                                    <p className="text-xs text-gray-600 font-light leading-relaxed">
                                        {t('landing.experienceDescription', 'Thoughtful presentation and seamless service')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </>
        )
    }

    if (featuredItems.length === 0) {
        return (
            <>
                {/* Philosophy Section */}
                <section className="py-16 bg-white text-center">
                    <div className="max-w-3xl mx-auto px-6">
                        <p className="text-lg text-gray-700 font-light leading-relaxed">
                            {t('landing.philosophy', 'We focus on balance, freshness, and honest flavor in every dish.')}
                        </p>
                    </div>
                </section>

                {/* No Featured Items */}
                <section className="py-20 bg-gray-50">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-light text-gray-900 mb-4 tracking-tight">
                                {t('landing.featuredCreations', 'Featured Creations')}
                            </h2>
                            <div className="w-16 h-px bg-gray-300 mx-auto"></div>
                        </div>

                        <div className="text-center">
                            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <h3 className="text-lg font-light text-gray-600 mb-2">{t('landing.noFeaturedItems', 'No Featured Items')}</h3>
                            <p className="text-gray-500 font-light text-sm mb-4">
                                {t('landing.noFeaturedDescription', 'Mark products as featured in the admin panel to display them here.')}
                            </p>
                        </div>

                        <div className="text-center mt-12">
                            <Link
                                to="/order"
                                className="group inline-flex items-center space-x-3 border border-gray-900 text-gray-900 px-6 py-3 text-sm font-light tracking-wide hover:bg-gray-900 hover:text-white transition-all duration-300"
                            >
                                <span>{t('landing.viewCompleteMenu', 'VIEW COMPLETE MENU')}</span>
                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Experience Section */}
                <section className="py-20 bg-white">
                    <div className="container mx-auto px-6">
                        <div className="max-w-4xl mx-auto">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                                <div>
                                    <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-white text-sm">❶</span>
                                    </div>
                                    <h3 className="text-sm font-light text-gray-900 mb-2 tracking-wide">
                                        {t('landing.selection', 'SELECTION')}
                                    </h3>
                                    <p className="text-xs text-gray-600 font-light leading-relaxed">
                                        {t('landing.selectionDescription', 'Daily curated ingredients from sustainable sources')}
                                    </p>
                                </div>

                                <div>
                                    <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-white text-sm">❷</span>
                                    </div>
                                    <h3 className="text-sm font-light text-gray-900 mb-2 tracking-wide">
                                        {t('landing.craftsmanship', 'CRAFTSMANSHIP')}
                                    </h3>
                                    <p className="text-xs text-gray-600 font-light leading-relaxed">
                                        {t('landing.craftsmanshipDescription', 'Traditional techniques meet contemporary vision')}
                                    </p>
                                </div>

                                <div>
                                    <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-white text-sm">❸</span>
                                    </div>
                                    <h3 className="text-sm font-light text-gray-900 mb-2 tracking-wide">
                                        {t('landing.experience', 'EXPERIENCE')}
                                    </h3>
                                    <p className="text-xs text-gray-600 font-light leading-relaxed">
                                        {t('landing.experienceDescription', 'Thoughtful presentation and seamless service')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </>
        )
    }

    return (
        <>
            {/* Philosophy Section */}
            <section className="py-16 bg-white text-center">
                <div className="max-w-3xl mx-auto px-6">
                    <p className="text-lg text-gray-700 font-light leading-relaxed">
                        {t('landing.philosophy', 'We focus on balance, freshness, and honest flavor in every dish.')}
                    </p>
                </div>
            </section>

            {/* Featured Creations */}
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-light text-gray-900 mb-4 tracking-tight">
                            {t('landing.featuredCreations', 'Featured Creations')}
                        </h2>
                        <div className="w-16 h-px bg-gray-300 mx-auto"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {featuredItems.map((item) => (
                            <div
                                key={item.id}
                                className="group bg-white border border-gray-200 hover:border-gray-300 transition-all duration-500 overflow-hidden"
                            >
                                {/* Image Container */}
                                <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                                    {item.image && item.image !== '/images/placeholder-food.jpg' ? (
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-4xl text-gray-400 opacity-50 group-hover:opacity-70 transition-opacity duration-500">
                                                {item.category === 'ceviche' ? '○' : item.category === 'signature' ? '◉' : '◎'}
                                            </span>
                                        </div>
                                    )}

                                    {/* Featured Badge */}
                                    <div className="absolute top-4 left-4 bg-white px-3 py-1 text-xs font-light tracking-wide text-gray-600 border border-gray-300">
                                        {t('landing.featured', 'FEATURED')}
                                    </div>

                                    {/* Popular Badge */}
                                    {item.popular && (
                                        <div className="absolute top-4 right-4 bg-white px-3 py-1 text-xs font-light tracking-wide text-gray-600 border border-gray-300">
                                            {t('landing.signature', 'SIGNATURE')}
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-lg font-light text-gray-900 tracking-wide">
                                            {item.name}
                                        </h3>
                                        <span className="text-lg font-light text-gray-700">
                                            ${item.price.toFixed(2)}
                                        </span>
                                    </div>

                                    <p className="text-gray-600 mb-4 text-sm font-light leading-relaxed tracking-wide">
                                        {item.description}
                                    </p>

                                    {/* Minimal Ingredients */}
                                    <div className="mb-4">
                                        <p className="text-xs text-gray-500 font-light tracking-wide mb-2">
                                            {t('landing.composition', 'COMPOSITION')}
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {item.ingredients.slice(0, 2).map((ingredient, idx) => (
                                                <span
                                                    key={idx}
                                                    className="text-xs text-gray-600 font-light border border-gray-300 px-2 py-1"
                                                >
                                                    {ingredient}
                                                </span>
                                            ))}
                                            {item.ingredients.length > 2 && (
                                                <span className="text-xs text-gray-400 font-light px-2 py-1">
                                                    +{item.ingredients.length - 2}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                        <span className="text-xs text-gray-500 font-light tracking-wide">
                                            {item.preparationTime} {t('landing.minutes', 'MINUTES')}
                                        </span>
                                        <button
                                            onClick={() => handleAddToCart(item)}
                                            className="group/btn bg-gray-900 text-white px-4 py-2 text-xs font-light tracking-wide hover:bg-gray-800 transition-all duration-300 flex items-center space-x-2"
                                        >
                                            <span>{t('landing.add', 'ADD')}</span>
                                            <svg className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-12">
                        <Link
                            to="/order"
                            className="group inline-flex items-center space-x-3 border border-gray-900 text-gray-900 px-6 py-3 text-sm font-light tracking-wide hover:bg-gray-900 hover:text-white transition-all duration-300"
                        >
                            <span>{t('landing.viewCompleteMenu', 'VIEW COMPLETE MENU')}</span>
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Experience Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                            <div>
                                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-white text-sm">❶</span>
                                </div>
                                <h3 className="text-sm font-light text-gray-900 mb-2 tracking-wide">
                                    {t('landing.selection', 'SELECTION')}
                                </h3>
                                <p className="text-xs text-gray-600 font-light leading-relaxed">
                                    {t('landing.selectionDescription', 'Daily curated ingredients from sustainable sources')}
                                </p>
                            </div>

                            <div>
                                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-white text-sm">❷</span>
                                </div>
                                <h3 className="text-sm font-light text-gray-900 mb-2 tracking-wide">
                                    {t('landing.craftsmanship', 'CRAFTSMANSHIP')}
                                </h3>
                                <p className="text-xs text-gray-600 font-light leading-relaxed">
                                    {t('landing.craftsmanshipDescription', 'Traditional techniques meet contemporary vision')}
                                </p>
                            </div>

                            <div>
                                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-white text-sm">❸</span>
                                </div>
                                <h3 className="text-sm font-light text-gray-900 mb-2 tracking-wide">
                                    {t('landing.experience', 'EXPERIENCE')}
                                </h3>
                                <p className="text-xs text-gray-600 font-light leading-relaxed">
                                    {t('landing.experienceDescription', 'Thoughtful presentation and seamless service')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}