import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, onSnapshot } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { Search, ChevronRight, Clock, Star, Sparkles, ChefHat } from 'lucide-react'
import { useCartStore } from '../../stores/cartStore'
import type { MenuItem, Product, ProductIngredient } from '../../types/types'
import { db } from '../../firebase/firebase'
import { LandingHeader } from '../landing/components/LandingHeader'
import MenuItemCard from '../../components/web/MenuItemCard'
import { LandingCTAFooter } from '../landing/components/LandingCTAFooter'
import BuildYourSushi from './components/BuildYourSushi'

export default function OrderPage() {
    const addToCart = useCartStore((state) => state.addToCart);
    const cart = useCartStore((state) => state.cart)
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { t } = useTranslation()
    const [showSushiBuilder, setShowSushiBuilder] = useState(false);

    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

    const [activeCategory, setActiveCategory] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        const setupFirestoreListener = async () => {
            try {
                setLoading(true)
                const snapshot = await getDocs(collection(db, 'products'))
                const productsData: Product[] = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Product))

                const activeProducts = productsData.filter(product => product.isActive !== false)
                setProducts(activeProducts)
                setLoading(false)

                unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
                    const updatedProducts: Product[] = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as Product))

                    const activeProducts = updatedProducts.filter(product => product.isActive !== false)
                    setProducts(activeProducts)
                })

            } catch (err) {
                console.error('Error setting up Firestore listener:', err)
                setError(t('orderPage.failedToLoad'))
                setLoading(false)
            }
        }

        setupFirestoreListener()

        return () => {
            if (unsubscribe) {
                unsubscribe()
            }
        }
    }, [t])

    const menuItems: MenuItem[] = useMemo(() => {
        return products.map(product => {
            const ingredientNames = (product.ingredients || []).map((ing: ProductIngredient) =>
                ing.name || 'Unknown Ingredient'
            )

            const menuItem: MenuItem = {
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
                popular: product.featured || false,
                quantity: product.quantity || 0
            }
            return menuItem
        })
    }, [products])

    const categories = useMemo(() => {
        const allCategories = ['all', ...new Set(menuItems.map(item => item.category).filter(Boolean))]
        return allCategories.filter(category => category !== 'uncategorized')
    }, [menuItems])

    const featuredItems = useMemo(() => {
        return menuItems.filter(item => item.popular)
    }, [menuItems])

    const filteredItems = useMemo(() => {
        return menuItems.filter(item => {
            const matchesCategory = activeCategory === 'all' || item.category === activeCategory
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.ingredients.some(ing => ing.toLowerCase().includes(searchTerm.toLowerCase()))
            return matchesCategory && matchesSearch
        })
    }, [activeCategory, searchTerm, menuItems])

    const handleAddToCart = (item: MenuItem) => {
        console.log('Adding to cart:', item.name)
        addToCart(item)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-2 border-[#E62B2B] rounded-full animate-spin mx-auto mb-4 border-t-transparent"></div>
                    <div className="flex items-center justify-center space-x-2 text-white/60">
                        <Sparkles className="w-4 h-4 text-[#E62B2B]" />
                        <p className="font-light text-sm">{t('orderPage.loadingMenu')}</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center max-w-md mx-4">
                    <div className="w-12 h-12 border border-[#E62B2B]/30 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-[#E62B2B]" />
                    </div>
                    <h3 className="text-lg font-light text-white mb-2">{t('orderPage.failedToLoad')}</h3>
                    <p className="text-white/40 text-sm mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-[#E62B2B] text-white px-6 py-2 rounded-lg hover:bg-[#ff4444] transition-colors font-light"
                    >
                        {t('orderPage.tryAgain')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black">
            {/* Simplified Background */}
            {/* <div className="fixed inset-0 bg-black z-0"></div> */}

            <header className="bg-black/80 backdrop-blur-lg sticky top-0 z-50 border-b border-white/10">
                <div className="w-full px-4 sm:px-6">
                    <LandingHeader />

                    {/* Mobile Search */}
                    <div className="md:hidden pb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                type="text"
                                placeholder={t('orderPage.searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#E62B2B] transition-colors text-sm"
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Clean Hero Section with Gradient Title */}
            <div className="relative pt-10 sm:pt-16 pb-8 mt-8 sm:mt-14">

                <div className="relative z-10 w-full px-4 sm:px-6">
                    <div className="max-w-4xl mx-auto text-center">
                        {/* Gradient Title */}
                        <div className="mb-6">
                            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-light text-white mb-6 tracking-tight leading-none">
                                <span className="bg-gradient-to-r from-white via-white to-[#E62B2B] bg-clip-text text-transparent">
                                    MAI
                                </span>
                                <span className="text-[#E62B2B] mx-2">|</span>
                                <span className="text-white">MENU</span>
                            </h1>
                            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-[#E62B2B] to-transparent mx-auto rounded-full"></div>
                        </div>

                        {/* Minimal Description */}
                        <p className="text-white/60 mb-6 max-w-xl mx-auto text-lg">
                            {t('landing.philosophy')}
                        </p>

                        {/* Simple CTA */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
                            <button
                                onClick={() => setShowSushiBuilder(true)}
                                className="bg-[#E62B2B] text-white px-6 py-3 rounded-lg hover:bg-[#ff4444] transition-colors flex items-center space-x-2"
                            >
                                <ChefHat className="w-4 h-4" />
                                <span>{t('buildYourSushi.title')}</span>
                            </button>

                            <Link
                                to="#menu"
                                className="border border-white/20 text-white px-6 py-3 rounded-lg hover:bg-white/5 transition-colors flex items-center space-x-2"
                            >
                                <Star className="w-4 h-4" />
                                <span>{t('featured.signatureCreations')}</span>
                            </Link>
                        </div>

                        {/* Simple Metrics */}
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center text-white/60">
                                <Clock className="w-4 h-4 mr-1 text-[#E62B2B]" />
                                <span>15-25min</span>
                            </div>
                            <div className="flex items-center text-white/60">
                                <Star className="w-4 h-4 mr-1 text-[#E62B2B]" />
                                <span>{featuredItems.length} signatures</span>
                            </div>
                            <div className="flex items-center text-white/60">
                                <ChefHat className="w-4 h-4 mr-1 text-[#E62B2B]" />
                                <span>Custom creations</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Clean Main Content */}
            <div id="menu" className="relative z-10 w-full px-4 sm:px-6 pb-12">
                {/* Simple Category Navigation */}
                <div className="max-w-4xl mx-auto mb-8">
                    <div className="flex flex-wrap justify-center gap-2">
                        {categories.map(category => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`px-4 py-2 capitalize transition-colors rounded-lg text-sm ${activeCategory === category
                                    ? 'bg-[#E62B2B] text-white'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                {category === 'all' ? t('orderPage.allItems') : category.replace('-', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Simple Results Summary */}
                {filteredItems.length > 0 && (
                    <div className="max-w-4xl mx-auto mb-6 text-center">
                        <p className="text-white/60 text-sm">
                            {searchTerm ? (
                                <>
                                    {t('orderPage.foundMatches', {
                                        count: filteredItems.length,
                                        term: searchTerm
                                    })}
                                </>
                            ) : activeCategory === 'all' ? (
                                <>
                                    {t('orderPage.showcasingCreations', { count: filteredItems.length })}
                                </>
                            ) : (
                                <>
                                    {t('orderPage.categorySelections', {
                                        count: filteredItems.length,
                                        category: activeCategory
                                    })}
                                </>
                            )}
                        </p>
                    </div>
                )}

                {/* Clean Menu Grid */}
                {filteredItems.length > 0 ? (
                    <div className="max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredItems.map(item => (
                                <div key={item.id} className="relative">
                                    {item.popular && (
                                        <div className="absolute -top-1 -right-1 z-10">
                                            <div className="bg-[#E62B2B] text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
                                                <Star className="w-3 h-3" />
                                                <span>{t('landing.signature')}</span>
                                            </div>
                                        </div>
                                    )}
                                    <MenuItemCard
                                        item={item}
                                        onAddToCart={handleAddToCart}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="max-w-md mx-auto text-center py-12">
                        <Search className="w-12 h-12 text-white/30 mx-auto mb-4" />
                        <h3 className="text-lg text-white mb-2">
                            {t('orderPage.noItemsFound')}
                        </h3>
                        <p className="text-white/40 text-sm mb-6">
                            {t('orderPage.adjustSearch')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 justify-center">
                            <button
                                onClick={() => {
                                    setSearchTerm('')
                                    setActiveCategory('all')
                                }}
                                className="bg-[#E62B2B] text-white px-4 py-2 rounded-lg hover:bg-[#ff4444] transition-colors text-sm"
                            >
                                {t('orderPage.allItems')}
                            </button>
                            <button
                                onClick={() => setShowSushiBuilder(true)}
                                className="border border-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm"
                            >
                                {t('buildYourSushi.title')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="relative z-10">
                <LandingCTAFooter displaySimple={true} />
            </div>

            {/* Simple Floating Cart */}
            {cart.length > 0 && (
                <div className="fixed bottom-4 right-4 z-50">
                    <Link
                        to="/checkout"
                        className="bg-[#E62B2B] text-white px-4 py-3 rounded-lg hover:bg-[#ff4444] transition-colors shadow-lg flex items-center space-x-3"
                    >
                        <div className="text-right">
                            <div className="font-medium text-sm">${cartTotal.toFixed(2)}</div>
                            <div className="text-white/80 text-xs">
                                {itemCount} {itemCount === 1 ? t('common.item') : t('common.items')}
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
            )}

            {/* Build Your Sushi Modal */}
            <BuildYourSushi
                isOpen={showSushiBuilder}
                onClose={() => setShowSushiBuilder(false)}
            />
        </div>
    )
}