import { Link } from 'react-router-dom'
import { featuredItems } from '../Items'
import type { MenuItem } from '../../../types/types'

interface Props {
    handleAddToCart: (item: MenuItem) => void
}

export const LandingFeatured = ({ handleAddToCart }: Props) => {
    return (
        <>
            {/* Philosophy Section */}
            <section className="py-16 bg-white text-center">
                <div className="max-w-3xl mx-auto px-6">
                    <p className="text-lg text-gray-700 font-light leading-relaxed">
                        We focus on balance, freshness, and honest flavor in every dish.
                    </p>
                </div>
            </section>


            {/* Featured Creations */}
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-light text-gray-900 mb-4 tracking-tight">Featured Creations</h2>
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
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-4xl text-gray-400 opacity-50 group-hover:opacity-70 transition-opacity duration-500">
                                            {item.category === 'ceviche' ? '○' : item.category === 'signature' ? '◉' : '◎'}
                                        </span>
                                    </div>

                                    {/* Minimal Badges */}
                                    {item.popular && (
                                        <div className="absolute top-4 left-4 bg-white px-3 py-1 text-xs font-light tracking-wide text-gray-600 border border-gray-300">
                                            SIGNATURE
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
                                        <p className="text-xs text-gray-500 font-light tracking-wide mb-2">COMPOSITION</p>
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
                                            {item.preparationTime} MINUTES
                                        </span>
                                        <button
                                            onClick={() => handleAddToCart(item)}
                                            className="group/btn bg-gray-900 text-white px-4 py-2 text-xs font-light tracking-wide hover:bg-gray-800 transition-all duration-300 flex items-center space-x-2"
                                        >
                                            <span>ADD</span>
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
                            <span>VIEW COMPLETE MENU</span>
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
                                <h3 className="text-sm font-light text-gray-900 mb-2 tracking-wide">SELECTION</h3>
                                <p className="text-xs text-gray-600 font-light leading-relaxed">
                                    Daily curated ingredients from sustainable sources
                                </p>
                            </div>

                            <div>
                                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-white text-sm">❷</span>
                                </div>
                                <h3 className="text-sm font-light text-gray-900 mb-2 tracking-wide">CRAFTSMANSHIP</h3>
                                <p className="text-xs text-gray-600 font-light leading-relaxed">
                                    Traditional techniques meet contemporary vision
                                </p>
                            </div>

                            <div>
                                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-white text-sm">❸</span>
                                </div>
                                <h3 className="text-sm font-light text-gray-900 mb-2 tracking-wide">EXPERIENCE</h3>
                                <p className="text-xs text-gray-600 font-light leading-relaxed">
                                    Thoughtful presentation and seamless service
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}
