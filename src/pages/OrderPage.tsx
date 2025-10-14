// OrderPage.tsx - Updated version
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import MenuItemCard from '../components/MenuItemCard'
import type { MenuItem } from '../types/types'
import { useCartStore } from '../stores/cartStore'



export default function OrderPage() {
    const addToCart = useCartStore((state) => state.addToCart)
    const cart = useCartStore((state) => state.cart)

    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

    
    const [activeCategory, setActiveCategory] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')


    // Enhanced sample data with videos
    const menuItems: MenuItem[] = [
        {
            id: '1',
            name: 'Salmon Nigiri',
            description: 'Fresh Atlantic salmon on perfectly seasoned sushi rice',
            price: 5.99,
            image: '/images/salmon-nigiri.jpg',
            videoUrl: '/videos/salmon-nigiri-prep.mp4',
            category: 'nigiri',
            ingredients: ['Fresh Salmon', 'Sushi Rice', 'Nori', 'Soy Sauce'],
            allergens: ['Fish'],
            preparationTime: 5,
            spicyLevel: 0,
            popular: true
        },
        {
            id: '2',
            name: 'Spicy Tuna Roll',
            description: 'Spicy tuna with cucumber and avocado, topped with spicy mayo',
            price: 12.99,
            image: '/images/spicy-tuna-roll.jpg',
            videoUrl: '/videos/spicy-tuna-prep.mp4',
            category: 'rolls',
            ingredients: ['Tuna', 'Spicy Mayo', 'Cucumber', 'Avocado', 'Sesame'],
            allergens: ['Fish', 'Sesame'],
            preparationTime: 8,
            spicyLevel: 2,
            popular: true
        },
        {
            id: '3',
            name: 'Dragon Roll',
            description: 'Eel, cucumber, and avocado topped with avocado slices and eel sauce',
            price: 15.99,
            image: '/images/dragon-roll.jpg',
            videoUrl: '/videos/dragon-roll-prep.mp4',
            category: 'specialty-rolls',
            ingredients: ['Eel', 'Avocado', 'Cucumber', 'Eel Sauce', 'Sesame'],
            allergens: ['Fish', 'Sesame'],
            preparationTime: 10,
            spicyLevel: 1,
            popular: false
        },
        // Add more items...
    ]

    const categories = useMemo(() => {
        const allCategories = ['all', ...new Set(menuItems.map(item => item.category))]
        return allCategories
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


    return (
        <div className="min-h-screen bg-gray-50">
            {/* Enhanced Header */}
            <header className="bg-white shadow-sm sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <Link to="/" className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-red-600 rounded-full"></div>
                            <span className="text-xl font-bold text-gray-800">Sushi Delight</span>
                        </Link>

                        {/* Search Bar */}
                        <div className="flex-1 max-w-md mx-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search dishes, ingredients..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                                <svg className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <Link to="/" className="text-gray-600 hover:text-red-600 hidden md:block">
                                Home
                            </Link>
                            <Link
                                to="/admin-login"
                                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 hidden md:block"
                            >
                                Admin
                            </Link>
                            <div className="relative">
                                <Link
                                    to="/checkout"
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <span>Cart ({itemCount})</span> {/* Changed from cart.length to itemCount */}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-4">Our Menu</h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Discover our authentic sushi creations. Tap on any dish to watch how it's made!
                    </p>
                </div>

                {/* Enhanced Category Filters */}
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                    {categories.map(category => (
                        <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            className={`px-4 py-2 rounded-full capitalize transition-all ${activeCategory === category
                                ? 'bg-red-600 text-white shadow-lg'
                                : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
                                }`}
                        >
                            {category === 'all' ? 'All Items' : category.replace('-', ' ')}
                        </button>
                    ))}
                </div>

                {/* Results Info */}
                <div className="text-center mb-6">
                    <p className="text-gray-600">
                        Showing {filteredItems.length} of {menuItems.length} items
                        {searchTerm && ` for "${searchTerm}"`}
                    </p>
                </div>

                {/* Menu Items Grid */}
                {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredItems.map(item => (
                            <MenuItemCard
                                key={item.id}
                                item={item}
                                onAddToCart={addToCart}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-xl font-semibold text-gray-600 mb-2">No items found</h3>
                        <p className="text-gray-500">Try adjusting your search or filter</p>
                    </div>
                )}
            </div>

            {/* Floating Cart Summary */}
            {cart.length > 0 && (
                <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border">
                    <div className="flex items-center space-x-3">
                        <span className="font-semibold">${cartTotal.toFixed(2)}</span>
                        <Link
                            to="/checkout"
                            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                        >
                            Checkout ({cart.length})
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}