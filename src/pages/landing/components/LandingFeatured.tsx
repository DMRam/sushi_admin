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
    }, [t])

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
                                <div className="h-48 bg-gradient-to-br from-slate-300 to-slate-400 relative overflow-hidden">
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
                        <div key={item.id} className="bg-slate-50 border border-gray-200 rounded-lg overflow-hidden group hover:shadow-lg transition-all duration-300">
                            <div className="h-48 bg-gradient-to-br from-slate-300 to-slate-400 relative overflow-hidden">
                                {item.image && item.image !== '/images/placeholder-food.jpg' ? (
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center">
                                        <span className="text-4xl text-slate-600 opacity-50">
                                            {item.category === 'ceviche' ? '○' : item.category === 'signature' ? '◉' : '◎'}
                                        </span>
                                    </div>
                                )}

                                <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 text-sm font-medium">
                                    {item.popular ? t('featured.chefsPick', 'Chef\'s Pick') : t('featured.featured', 'Featured')}
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-xl font-medium text-gray-900">{item.name}</h4>
                                    <span className="text-lg font-light text-red-600">${item.price.toFixed(2)}</span>
                                </div>
                                <p className="text-gray-600 text-sm font-light mb-4 leading-relaxed">
                                    {item.description}
                                </p>
                                <button
                                    onClick={() => handleAddToCart(item)}
                                    className="w-full bg-gray-900 text-white py-3 text-sm font-medium tracking-wide hover:bg-red-600 transition-colors duration-300"
                                >
                                    {t('featured.addToCart', 'Add to Order')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}