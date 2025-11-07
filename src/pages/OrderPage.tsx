import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/firebase'
import type { MenuItem, Product, ProductIngredient } from '../types/types'
import { useCartStore } from '../stores/cartStore'
import { LandingCTAFooter } from './landing/components/LandingCTAFooter'
import MenuItemCard from '../components/web/MenuItemCard'
import { useTranslation } from 'react-i18next'

export default function OrderPage() {
    const addToCart = useCartStore((state) => state.addToCart)
    const cart = useCartStore((state) => state.cart)
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { t } = useTranslation()

    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

    const [activeCategory, setActiveCategory] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
                    console.log('Products updated in real-time:', snapshot.docs.length)
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
        console.log('Converting products to menu items:', products.length)
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
                popular: product.tags?.includes('popular') || product.tags?.includes('Popular') || false,
                quantity: product.quantity || 0
            }
            return menuItem
        })
    }, [products])

    const categories = useMemo(() => {
        const allCategories = ['all', ...new Set(menuItems.map(item => item.category).filter(Boolean))]
        return allCategories.filter(category => category !== 'uncategorized')
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

    useEffect(() => {
        console.log('Products updated:', products.length)
        console.log('Menu items:', menuItems.length)
    }, [products, menuItems])

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white/60 font-light tracking-wide">{t('orderPage.loadingMenu')}</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <svg className="w-16 h-16 text-white/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <h3 className="text-lg font-light text-white/60 mb-2">{t('orderPage.failedToLoad')}</h3>
                    <p className="text-white/40 font-light text-sm mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="border border-white/20 text-white/60 px-4 py-2 rounded-sm hover:bg-white/10 hover:text-white transition-all duration-300 font-light"
                    >
                        {t('orderPage.tryAgain')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-900">
            <header className="bg-gray-900/95 backdrop-blur-md sticky top-0 z-50 border-b border-white/10">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/" className="flex items-center space-x-3 flex-shrink-0">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                                    <span className="text-gray-900 bg-white text-lg font-light">P</span>
                                </div>
                                <div className="text-left">
                                    <span className="text-xl font-light text-white tracking-wider hidden sm:block">MaiSushi</span>
                                    <p className="text-xs text-gray-500 font-light tracking-wider">{t('orderPage.cevicheSushiBar')}</p>
                                </div>
                            </div>
                        </Link>

                        <div className="hidden md:flex flex-1 max-w-lg mx-4 lg:mx-8">
                            <div className="relative w-full">
                                <input
                                    type="text"
                                    placeholder={t('orderPage.searchPlaceholder')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all duration-300 font-light tracking-wide text-sm"
                                />
                                <svg className="absolute right-3 top-2.5 w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        <div className="hidden md:flex items-center space-x-4">
                            <Link to="/" className="text-white/60 hover:text-white transition-colors duration-300 font-light tracking-wide text-sm">
                                {t('orderPage.home')}
                            </Link>
                            <Link
                                to="/admin-login"
                                className="bg-white/5 text-white/60 px-4 py-2 rounded-sm hover:bg-white/10 hover:text-white transition-all duration-300 border border-white/10 font-light tracking-wide text-sm"
                            >
                                {t('orderPage.admin')}
                            </Link>
                            <Link
                                to="/client-login"
                                className="bg-white/5 text-white/60 px-4 py-2 rounded-sm hover:bg-white/10 hover:text-white transition-all duration-300 border border-white/10 font-light tracking-wide text-sm"
                            >
                                {t('nav.client', 'Client')}
                            </Link>
                            <div className="relative">
                                <Link
                                    to="/checkout"
                                    className="border border-white text-white px-6 py-2 rounded-sm hover:bg-white hover:text-gray-900 transition-all duration-300 flex items-center space-x-2 group font-light tracking-wide text-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <span>{t('orderPage.cart')} ({itemCount})</span>
                                </Link>
                            </div>
                        </div>

                        <div className="flex md:hidden items-center space-x-3">
                            <Link
                                to="/checkout"
                                className="relative border border-white/20 text-white p-2 rounded-sm hover:bg-white/10 transition-all duration-300"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                {itemCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-white text-gray-900 text-xs rounded-full w-4 h-4 flex items-center justify-center font-light">
                                        {itemCount}
                                    </span>
                                )}
                            </Link>

                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="border border-white/20 text-white p-2 rounded-sm hover:bg-white/10 transition-all duration-300"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="md:hidden pb-4 px-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={t('orderPage.searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all duration-300 font-light tracking-wide text-sm"
                            />
                            <svg className="absolute right-3 top-3 w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    {isMobileMenuOpen && (
                        <div className="md:hidden absolute top-full left-0 right-0 bg-gray-900/95 backdrop-blur-md border-b border-white/10">
                            <div className="container mx-auto px-4 py-4 space-y-4">
                                <Link
                                    to="/"
                                    className="block text-white/60 hover:text-white transition-colors duration-300 font-light tracking-wide py-2 border-b border-white/10"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {t('orderPage.home')}
                                </Link>
                                <Link
                                    to="/admin-login"
                                    className="block text-white/60 hover:text-white transition-colors duration-300 font-light tracking-wide py-2 border-b border-white/10"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {t('orderPage.admin')}
                                </Link>
                                <Link
                                    to="/client-login"
                                    className="block text-white/60 hover:text-white transition-colors duration-300 font-light tracking-wide py-2 border-b border-white/10"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {t('nav.client', 'Client')}
                                </Link>
                                <div className="pt-2">
                                    <Link
                                        to="/checkout"
                                        className="block border border-white text-white text-center py-3 rounded-sm hover:bg-white hover:text-gray-900 transition-all duration-300 font-light tracking-wide"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {t('orderPage.checkout')} ({itemCount} {t('common.items')})
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            <div className="container mx-auto px-4 sm:px-6 py-8">
                <div className="text-center mb-12">
                    <div className="w-16 h-px bg-white/40 mx-auto mb-6"></div>

                    <h1 className="text-3xl sm:text-4xl font-light text-white mb-4 tracking-tight leading-none">
                        {t('orderPage.ourMenu')}
                    </h1>

                    <div className="flex justify-center items-center space-x-4 sm:space-x-6 mb-6">
                        <div className="w-8 sm:w-12 h-px bg-white/30"></div>
                        <p className="text-sm sm:text-lg font-light tracking-widest text-white/60 uppercase">
                            {t('orderPage.cevicheSushiBar')}
                        </p>
                        <div className="w-8 sm:w-12 h-px bg-white/30"></div>
                    </div>

                    <p className="text-white/60 max-w-2xl mx-auto font-light tracking-wide leading-relaxed text-sm sm:text-base mb-6">
                        {t('orderPage.discoverDescription')}
                    </p>

                    <div className="w-16 h-px bg-white/40 mx-auto"></div>
                </div>

                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8">
                    {categories.map(category => (
                        <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-sm capitalize transition-all duration-300 font-light tracking-wide text-sm ${activeCategory === category
                                ? 'bg-white text-gray-900 border border-white'
                                : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {category === 'all' ? t('orderPage.allItems') : category.replace('-', ' ')}
                        </button>
                    ))}
                </div>

                <div className="text-center mb-8">
                    <p className="text-white/60 font-light tracking-wide text-sm">
                        {searchTerm
                            ? t('orderPage.searchResults', { count: filteredItems.length, total: menuItems.length, term: searchTerm })
                            : t('orderPage.showingResults', { count: filteredItems.length, total: menuItems.length })
                        }
                    </p>
                </div>

                {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                        {filteredItems.map(item => (
                            <MenuItemCard
                                key={item.id}
                                item={item}
                                onAddToCart={handleAddToCart}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-lg sm:text-xl font-light text-white/60 mb-2 tracking-wide">
                            {t('orderPage.noItemsFound')}
                        </h3>
                        <p className="text-white/40 font-light tracking-wide text-sm">
                            {t('orderPage.adjustSearch')}
                        </p>
                    </div>
                )}
            </div>

            {cart.length > 0 && (
                <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 bg-white/10 backdrop-blur-sm rounded-sm p-4 sm:p-6 border border-white/20">
                    <div className="flex items-center space-x-4 sm:space-x-6">
                        <span className="font-light text-white tracking-wide text-sm sm:text-base">${cartTotal.toFixed(2)}</span>
                        <Link
                            to="/checkout"
                            className="border border-white text-white px-4 sm:px-6 py-2 sm:py-3 rounded-sm hover:bg-white hover:text-gray-900 transition-all duration-300 font-light tracking-wide text-sm"
                        >
                            {t('orderPage.checkout')} ({itemCount})
                        </Link>
                    </div>
                </div>
            )}

            <div className="hidden sm:block absolute top-12 left-12 w-16 h-16 border-t border-l border-white/10"></div>
            <div className="hidden sm:block absolute bottom-12 right-12 w-16 h-16 border-b border-r border-white/10"></div>

            <LandingCTAFooter displaySimple={true} />
        </div>
    )
}