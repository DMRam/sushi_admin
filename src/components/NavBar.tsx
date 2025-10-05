import { Link, useLocation } from 'react-router-dom'

export default function NavBar() {
    const loc = useLocation()
    return (
        <header className="bg-white shadow">
            <div className="container mx-auto p-4 flex items-center justify-between">
                <h1 className="text-xl font-semibold">Ceviche Cost Calculator</h1>
                <nav className="space-x-4">
                    <Link
                        className={`px-3 py-2 rounded transition-colors ${loc.pathname.startsWith('/sales-tracking')
                            ? 'bg-blue-100 text-blue-700 font-medium'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                        to="/sales-tracking"
                    >
                        Sales Tracking
                    </Link>
                    <Link
                        className={`px-3 py-2 rounded transition-colors ${loc.pathname.startsWith('/purchases')
                            ? 'bg-blue-100 text-blue-700 font-medium'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                        to="/purchases"
                    >
                        Purchases
                    </Link>

                    <Link
                        className={`px-3 py-2 rounded transition-colors ${loc.pathname.startsWith('/products')
                            ? 'bg-blue-100 text-blue-700 font-medium'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                        to="/products"
                    >
                        Products
                    </Link>
                    <Link
                        className={`px-3 py-2 rounded transition-colors ${loc.pathname.startsWith('/ingredients')
                            ? 'bg-blue-100 text-blue-700 font-medium'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                        to="/ingredients"
                    >
                        Ingredients
                    </Link>
                    <Link to="/stock" className="hover:text-blue-600">
                        Stock
                    </Link>

                    <Link
                        className={`px-3 py-2 rounded transition-colors ${loc.pathname.startsWith('/cost-analysis')
                            ? 'bg-blue-100 text-blue-700 font-medium'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                        to="/cost-analysis"
                    >
                        Cost Analysis
                    </Link>

                    <Link
                        className={`px-3 py-2 rounded transition-colors ${loc.pathname.startsWith('/business-analytics')
                            ? 'bg-blue-100 text-blue-700 font-medium'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                        to="/business-analytics"
                    >
                        Business Analytics
                    </Link>

                </nav>
            </div>
        </header>
    )
}