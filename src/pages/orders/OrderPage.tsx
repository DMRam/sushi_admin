import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, onSnapshot } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { Search, ChevronRight, Clock, Star, Sparkles, ChefHat, X, Filter } from 'lucide-react'
import { useCartStore } from '../../stores/cartStore'
import type { MenuItem, Product, ProductIngredient } from '../../types/types'
import { db } from '../../firebase/firebase'
import { LandingHeader } from '../landing/components/LandingHeader'
import MenuItemCard from '../../components/web/MenuItemCard'
import { LandingCTAFooter } from '../landing/components/LandingCTAFooter'
import BuildYourSushi from './components/BuildYourSushi'

interface FilterState {
    dietary: {
        vegetarian: boolean
        vegan: boolean
        glutenFree: boolean
    }
    spicyLevel: number
    maxPrice: number
}

// Helper function to check dietary preferences from tags
const getDietaryFromTags = (tags: string[] = []) => {
    const tagSet = new Set(tags.map(tag => tag.toLowerCase()))
    return {
        vegetarian: tagSet.has('vegetarian') || tagSet.has('veg'),
        vegan: tagSet.has('vegan'),
        glutenFree: tagSet.has('gluten-free') || tagSet.has('gluten free')
    }
}

export default function OrderPage() {
    const addToCart = useCartStore((state) => state.addToCart);
    const cart = useCartStore((state) => state.cart)
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { t } = useTranslation()
    const [showSushiBuilder, setShowSushiBuilder] = useState(false);
    const [showFilters, setShowFilters] = useState(false)

    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

    const [activeCategory, setActiveCategory] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [searchInput, setSearchInput] = useState('')

    // Enhanced filter state
    const [filters, setFilters] = useState<FilterState>({
        dietary: {
            vegetarian: false,
            vegan: false,
            glutenFree: false
        },
        spicyLevel: 0,
        maxPrice: 100
    })

    // Debounce search implementation
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput)
        }, 300)

        return () => clearTimeout(timer)
    }, [searchInput])

    // Simplified Firestore query to avoid index requirements
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        const setupFirestoreListener = async () => {
            try {
                setLoading(true)
                // Use simple query without complex ordering to avoid index requirements
                const snapshot = await getDocs(collection(db, 'products'))
                const productsData: Product[] = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Product))

                // Filter active products client-side (same as before)
                const activeProducts = productsData.filter(product => product.isActive !== false)

                // Sort client-side to avoid Firestore index requirements
                const sortedProducts = activeProducts.sort((a, b) => {
                    // Featured first
                    if (a.featured && !b.featured) return -1
                    if (!a.featured && b.featured) return 1
                    // Then by name
                    return (a.name || '').localeCompare(b.name || '')
                })

                setProducts(sortedProducts)
                setLoading(false)

                // Real-time listener with same client-side filtering
                unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
                    const updatedProducts: Product[] = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as Product))

                    const activeProducts = updatedProducts.filter(product => product.isActive !== false)
                    const sortedProducts = activeProducts.sort((a, b) => {
                        if (a.featured && !b.featured) return -1
                        if (!a.featured && b.featured) return 1
                        return (a.name || '').localeCompare(b.name || '')
                    })
                    setProducts(sortedProducts)
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

    // Enhanced menu items with safe data transformation
    const menuItems: MenuItem[] = useMemo(() => {
        return products.map(product => {
            // Safe ingredient handling
            const ingredientNames = (product.ingredients || []).map((ing: ProductIngredient) =>
                ing?.name || 'Unknown Ingredient'
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

    // Enhanced categories with counts
    const categories = useMemo(() => {
        const categoryCounts = menuItems.reduce((acc, item) => {
            const category = item.category || 'uncategorized'
            acc[category] = (acc[category] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        const allCategories = [
            { id: 'all', name: t('orderPage.allItems'), count: menuItems.length },
            ...Object.entries(categoryCounts)
                .filter(([category]) => category !== 'uncategorized')
                .map(([category, count]) => ({
                    id: category,
                    name: category.replace(/-/g, ' '),
                    count
                }))
        ]

        return allCategories
    }, [menuItems, t])

    const featuredItems = useMemo(() => {
        return menuItems.filter(item => item.popular)
    }, [menuItems])

    // Enhanced filtering with additional criteria
    const filteredItems = useMemo(() => {
        return menuItems.filter(item => {
            const matchesCategory = activeCategory === 'all' || item.category === activeCategory

            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.ingredients.some(ing => ing.toLowerCase().includes(searchTerm.toLowerCase()))

            // Get dietary info from product tags for filtering
            const product = products.find(p => p.id === item.id)
            const dietary = getDietaryFromTags(product?.tags || [])

            // Enhanced filter matching (safe with fallbacks)
            const matchesDietary = (
                (!filters.dietary.vegetarian || dietary.vegetarian) &&
                (!filters.dietary.vegan || dietary.vegan) &&
                (!filters.dietary.glutenFree || dietary.glutenFree)
            )

            const matchesSpicyLevel = item.spicyLevel <= filters.spicyLevel
            const matchesPrice = item.price <= filters.maxPrice

            return matchesCategory && matchesSearch && matchesDietary && matchesSpicyLevel && matchesPrice
        })
    }, [activeCategory, searchTerm, menuItems, filters, products])

    // Reset filters when category changes
    useEffect(() => {
        setFilters({
            dietary: {
                vegetarian: false,
                vegan: false,
                glutenFree: false
            },
            spicyLevel: 0,
            maxPrice: 100
        })
    }, [activeCategory])

    const handleAddToCart = useCallback((item: MenuItem) => {
        console.log('Adding to cart:', item.name)
        addToCart(item)
    }, [addToCart])

    const clearAllFilters = useCallback(() => {
        setFilters({
            dietary: {
                vegetarian: false,
                vegan: false,
                glutenFree: false
            },
            spicyLevel: 0,
            maxPrice: 100
        })
        setSearchInput('')
        setSearchTerm('')
    }, [])

    // Calculate active filter count
    const activeFiltersCount = Object.values(filters.dietary).filter(Boolean).length +
        (filters.spicyLevel > 0 ? 1 : 0) +
        (filters.maxPrice < 100 ? 1 : 0)

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
            <LandingHeader />
            <div className="h-22"></div>

            {/* Unified Sticky Header with Search and Filters */}
            <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-white/10 shadow-lg">
                <div className="w-full px-4 sm:px-6">
                    <div className="max-w-7xl mx-auto">
                        {/* Search and Filter Bar */}
                        <div className="flex flex-col md:flex-row gap-4 py-6">
                            {/* Enhanced Search */}
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                                <input
                                    type="text"
                                    placeholder={t('orderPage.searchPlaceholder')}
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="w-full pl-12 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#E62B2B] focus:bg-white/10 transition-all duration-300 text-sm backdrop-blur-sm"
                                />
                                {searchInput && (
                                    <button
                                        onClick={() => setSearchInput('')}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Filter Controls */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`px-5 py-3 rounded-xl border transition-all duration-300 flex items-center space-x-2 ${showFilters || activeFiltersCount > 0
                                            ? 'bg-[#E62B2B] border-[#E62B2B] text-white shadow-lg shadow-[#E62B2B]/25'
                                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <Filter className="w-4 h-4" />
                                    <span className="text-sm font-medium">Filters</span>
                                    {activeFiltersCount > 0 && (
                                        <span className="bg-white text-[#E62B2B] text-xs rounded-full w-6 h-6 flex items-center justify-center font-medium">
                                            {activeFiltersCount}
                                        </span>
                                    )}
                                </button>

                                <button
                                    onClick={() => setShowSushiBuilder(true)}
                                    className="bg-[#E62B2B] text-white px-5 py-3 rounded-xl hover:bg-[#ff4444] transition-all duration-300 flex items-center space-x-2 shadow-lg shadow-[#E62B2B]/25 hover:shadow-[#E62B2B]/40"
                                >
                                    <ChefHat className="w-4 h-4" />
                                    <span className="text-sm font-medium">{t('buildYourSushi.title')}</span>
                                </button>
                            </div>
                        </div>

                        {/* Enhanced Filters Panel */}
                        {showFilters && (
                            <div className="pb-6">
                                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-white font-medium">Filters</h3>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={clearAllFilters}
                                                className="text-white/60 hover:text-white text-sm transition-colors font-medium"
                                            >
                                                Clear all
                                            </button>
                                            <button
                                                onClick={() => setShowFilters(false)}
                                                className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Dietary Filters */}
                                        <div>
                                            <label className="text-white/80 text-sm font-medium mb-4 block">Dietary</label>
                                            <div className="space-y-3">
                                                {[
                                                    { key: 'vegetarian', label: 'Vegetarian' },
                                                    { key: 'vegan', label: 'Vegan' },
                                                    { key: 'glutenFree', label: 'Gluten Free' }
                                                ].map(({ key, label }) => (
                                                    <label key={key} className="flex items-center space-x-3 text-white/60 hover:text-white cursor-pointer transition-colors group">
                                                        <input
                                                            type="checkbox"
                                                            checked={filters.dietary[key as keyof typeof filters.dietary]}
                                                            onChange={(e) => setFilters(prev => ({
                                                                ...prev,
                                                                dietary: { ...prev.dietary, [key]: e.target.checked }
                                                            }))}
                                                            className="rounded border-white/20 bg-white/5 text-[#E62B2B] focus:ring-[#E62B2B] focus:ring-2 focus:ring-offset-2 focus:ring-offset-black transition-colors group-hover:border-white/40"
                                                        />
                                                        <span className="text-sm font-medium">{label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Spicy Level */}
                                        <div>
                                            <label className="text-white/80 text-sm font-medium mb-4 block">Spicy Level</label>
                                            <div className="space-y-3">
                                                {[0, 1, 2].map(level => (
                                                    <label key={level} className="flex items-center space-x-3 text-white/60 hover:text-white cursor-pointer transition-colors group">
                                                        <input
                                                            type="radio"
                                                            name="spicyLevel"
                                                            checked={filters.spicyLevel === level}
                                                            onChange={() => setFilters(prev => ({ ...prev, spicyLevel: level }))}
                                                            className="border-white/20 bg-white/5 text-[#E62B2B] focus:ring-[#E62B2B] focus:ring-2 focus:ring-offset-2 focus:ring-offset-black transition-colors group-hover:border-white/40"
                                                        />
                                                        <span className="text-sm font-medium">
                                                            {level === 0 ? 'Mild' : level === 1 ? 'Medium' : 'Spicy'}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Price Range */}
                                        <div>
                                            <label className="text-white/80 text-sm font-medium mb-4 block">
                                                Max Price: <span className="text-[#E62B2B]">${filters.maxPrice}</span>
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="5"
                                                value={filters.maxPrice}
                                                onChange={(e) => setFilters(prev => ({
                                                    ...prev,
                                                    maxPrice: parseInt(e.target.value)
                                                }))}
                                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#E62B2B] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-lg hover:[&::-webkit-slider-thumb]:scale-110 transition-transform"
                                            />
                                            <div className="flex justify-between text-xs text-white/40 mt-2">
                                                <span>$0</span>
                                                <span>$100</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Enhanced Hero Section with Better Spacing */}
            <div className="relative pt-16 pb-12">
                <div className="relative z-10 w-full px-4 sm:px-6">
                    <div className="max-w-4xl mx-auto text-center">
                        {/* Gradient Title */}
                        <div className="mb-8">
                            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-light text-white mb-8 tracking-tight leading-none">
                                <span className="bg-gradient-to-r from-white via-white to-[#E62B2B] bg-clip-text text-transparent">
                                    MAI
                                </span>
                                <span className="text-[#E62B2B] mx-3">|</span>
                                <span className="text-white">MENU</span>
                            </h1>
                            <div className="w-32 h-1 bg-gradient-to-r from-transparent via-[#E62B2B] to-transparent mx-auto rounded-full shadow-lg shadow-[#E62B2B]/30"></div>
                        </div>

                        {/* Minimal Description */}
                        <p className="text-white/60 mb-8 max-w-xl mx-auto text-lg leading-relaxed">
                            {t('landing.philosophy')}
                        </p>

                        {/* Enhanced CTA Buttons */}
                        {/* <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
                            <button
                                onClick={() => setShowSushiBuilder(true)}
                                className="bg-[#E62B2B] text-white px-8 py-4 rounded-xl hover:bg-[#ff4444] transition-all duration-300 flex items-center space-x-3 shadow-lg shadow-[#E62B2B]/25 hover:shadow-[#E62B2B]/40 hover:scale-105"
                            >
                                <ChefHat className="w-5 h-5" />
                                <span className="font-medium">{t('buildYourSushi.title')}</span>
                            </button>

                            <Link
                                to="#menu"
                                className="border border-white/20 text-white px-8 py-4 rounded-xl hover:bg-white/5 transition-all duration-300 flex items-center space-x-3 hover:scale-105"
                            >
                                <Star className="w-5 h-5" />
                                <span className="font-medium">{t('featured.signatureCreations')}</span>
                            </Link>
                        </div> */}

                        {/* Enhanced Metrics */}
                        <div className="flex flex-wrap justify-center gap-6 text-sm">
                            <div className="flex items-center text-white/60 bg-white/5 rounded-full px-4 py-2 border border-white/10">
                                <Clock className="w-4 h-4 mr-2 text-[#E62B2B]" />
                                <span>15-25min</span>
                            </div>
                            <div className="flex items-center text-white/60 bg-white/5 rounded-full px-4 py-2 border border-white/10">
                                <Star className="w-4 h-4 mr-2 text-[#E62B2B]" />
                                <span>{featuredItems.length} signatures</span>
                            </div>
                            <div className="flex items-center text-white/60 bg-white/5 rounded-full px-4 py-2 border border-white/10">
                                <ChefHat className="w-4 h-4 mr-2 text-[#E62B2B]" />
                                <span>Custom creations</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Main Content with Better Spacing */}
            <div id="menu" className="relative z-10 w-full px-4 sm:px-6 pb-20">
                {/* Enhanced Category Navigation */}
                <div className="max-w-4xl mx-auto mb-12">
                    <div className="flex flex-wrap justify-center gap-3">
                        {categories.map(category => (
                            <button
                                key={category.id}
                                onClick={() => setActiveCategory(category.id)}
                                className={`px-6 py-3 capitalize transition-all duration-300 rounded-xl border text-sm font-medium flex items-center space-x-2 group ${activeCategory === category.id
                                        ? 'bg-[#E62B2B] text-white border-[#E62B2B] shadow-lg shadow-[#E62B2B]/25'
                                        : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'
                                    }`}
                            >
                                <span>{category.id === 'all' ? t('orderPage.allItems') : category.name}</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${activeCategory === category.id
                                        ? 'bg-white/20 text-white'
                                        : 'bg-white/10 text-white/40'
                                    }`}>
                                    {category.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Enhanced Results Summary */}
                {filteredItems.length > 0 && (
                    <div className="max-w-4xl mx-auto mb-8 text-center">
                        <div className="inline-flex items-center space-x-3 text-white/60 text-sm bg-white/5 rounded-full px-6 py-3 border border-white/10">
                            {searchTerm ? (
                                <>
                                    <Search className="w-4 h-4 text-[#E62B2B]" />
                                    <span className="font-medium">
                                        {t('orderPage.foundMatches', {
                                            count: filteredItems.length,
                                            term: searchTerm
                                        })}
                                    </span>
                                </>
                            ) : activeCategory === 'all' ? (
                                <>
                                    <Sparkles className="w-4 h-4 text-[#E62B2B]" />
                                    <span className="font-medium">
                                        {t('orderPage.showcasingCreations', { count: filteredItems.length })}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Star className="w-4 h-4 text-[#E62B2B]" />
                                    <span className="font-medium">
                                        {t('orderPage.categorySelections', {
                                            count: filteredItems.length,
                                            category: activeCategory
                                        })}
                                    </span>
                                </>
                            )}
                            {activeFiltersCount > 0 && (
                                <span className="flex items-center space-x-2">
                                    <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                                    <span className="text-xs">{activeFiltersCount} filters active</span>
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Enhanced Menu Grid */}
                {filteredItems.length > 0 ? (
                    <div className="max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredItems.map(item => (
                                <div key={item.id} className="relative">
                                    {item.popular && (
                                        <div className="absolute -top-2 -right-2 z-10">
                                            <div className="bg-[#E62B2B] text-white px-3 py-2 rounded-full text-xs font-medium flex items-center space-x-1 shadow-lg">
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
                    <div className="max-w-md mx-auto text-center py-16">
                        <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10">
                            <Search className="w-8 h-8 text-white/30" />
                        </div>
                        <h3 className="text-xl text-white mb-3 font-light">
                            {t('orderPage.noItemsFound')}
                        </h3>
                        <p className="text-white/50 text-sm mb-8 leading-relaxed">
                            {t('orderPage.adjustSearch')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={() => {
                                    setSearchInput('')
                                    setSearchTerm('')
                                    setActiveCategory('all')
                                    clearAllFilters()
                                }}
                                className="bg-[#E62B2B] text-white px-6 py-3 rounded-xl hover:bg-[#ff4444] transition-colors font-medium text-sm flex items-center justify-center space-x-2"
                            >
                                <span>{t('orderPage.allItems')}</span>
                            </button>
                            <button
                                onClick={() => setShowSushiBuilder(true)}
                                className="border border-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/5 transition-colors font-medium text-sm flex items-center justify-center space-x-2"
                            >
                                <ChefHat className="w-4 h-4" />
                                <span>{t('buildYourSushi.title')}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="relative z-10">
                <LandingCTAFooter displaySimple={true} />
            </div>

            {/* Enhanced Floating Cart */}
            {cart.length > 0 && (
                <div className="fixed bottom-6 right-6 z-50">
                    <Link
                        to="/checkout"
                        className="bg-[#E62B2B] text-white px-6 py-4 rounded-xl hover:bg-[#ff4444] transition-all duration-300 shadow-2xl shadow-[#E62B2B]/25 hover:shadow-[#E62B2B]/40 hover:scale-105 flex items-center space-x-4"
                    >
                        <div className="text-right">
                            <div className="font-semibold text-sm">${cartTotal.toFixed(2)}</div>
                            <div className="text-white/90 text-xs">
                                {itemCount} {itemCount === 1 ? t('common.item') : t('common.items')}
                            </div>
                        </div>
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                            <ChevronRight className="w-4 h-4" />
                        </div>
                    </Link>
                </div>
            )}

            {/* Build Your Sushi Modal */}
            {showSushiBuilder && (
                <div className="fixed inset-0 z-50">
                    <BuildYourSushi
                        isOpen={showSushiBuilder}
                        onClose={() => setShowSushiBuilder(false)}
                    />
                </div>
            )}
        </div>
    )
}