import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useUserProfile, UserRole } from '../../context/UserProfileContext'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface NavLink {
    path: string
    label: string
    allowedRoles: UserRole[]
}

// Simple super admin check function
const isSuperAdmin = (email: string): boolean => {
    const superAdminEmails = [
        'admin@sushi.com',
        'superadmin@sushi.com',
        // Add other super admin emails here
    ]
    return superAdminEmails.includes(email.toLowerCase())
}

export default function NavBar() {
    const { user, logout } = useAuth()
    const { userProfile, loading } = useUserProfile()
    const loc = useLocation()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const { t } = useTranslation()

    // Define navigation links with translation - using safe fallbacks
    const navLinks: NavLink[] = [
        { path: '/admin/sales-tracking', label: t('nav.salesTracking', 'Sales Tracking'), allowedRoles: [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN, UserRole.VIEWER] },
        { path: '/admin/purchases', label: t('nav.purchases', 'Purchases'), allowedRoles: [UserRole.MANAGER, UserRole.ADMIN] },
        { path: '/admin/products', label: t('nav.products', 'Products'), allowedRoles: [UserRole.MANAGER, UserRole.ADMIN, UserRole.VIEWER] },
        { path: '/admin/stock', label: t('nav.stock', 'Stock'), allowedRoles: [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN, UserRole.VIEWER] },
        { path: '/admin/cost-analysis', label: t('nav.costAnalysis', 'Cost Analysis'), allowedRoles: [UserRole.MANAGER, UserRole.ADMIN] },
        { path: '/admin/business-analytics', label: t('nav.businessAnalytics', 'Business Analytics'), allowedRoles: [UserRole.MANAGER, UserRole.ADMIN] },
        { path: '/admin/admin', label: t('nav.admin', 'Admin'), allowedRoles: [UserRole.ADMIN] },
    ]

    // Determine user role with fallback rules
    const getUserRoleForNav = (): UserRole => {
        if (userProfile?.role) return userProfile.role
        if (user?.email && isSuperAdmin(user.email)) return UserRole.ADMIN
        return UserRole.VIEWER // Default fallback
    }

    const userRole = getUserRoleForNav()
    const filteredNavLinks = navLinks.filter(link => link.allowedRoles.includes(userRole))

    const handleLogout = async () => {
        try {
            await logout()
            setIsMenuOpen(false)
        } catch (error) {
            console.error('Failed to log out', error)
        }
    }

    const getLinkClass = (path: string) => {
        const isActive = loc.pathname.startsWith(path)
        return `px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${isActive
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`
    }

    const getMobileLinkClass = (path: string) => {
        const isActive = loc.pathname.startsWith(path)
        return `block px-4 py-3 text-base font-medium transition-colors duration-200 ${isActive
                ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`
    }

    // Don't render navbar if no user
    if (!user) return null

    return (
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Left section - Title and Logo */}
                    <div className="flex items-center">
                        <h1 className="text-xl font-semibold text-gray-900">
                            Sushi Admin
                        </h1>
                        <span className="ml-3 text-sm text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded-md">
                            {userRole}
                            {!userProfile && !loading && ' • No Profile'}
                            {loading && ' • Loading...'}
                        </span>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-1">
                        {filteredNavLinks.map((link) => (
                            <Link
                                key={link.path}
                                className={getLinkClass(link.path)}
                                to={link.path}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Right section - User Info / Language / Logout */}
                    <div className="hidden md:flex items-center space-x-4">

                        <div className="flex items-center space-x-3">
                            <div className="text-right">
                                <div className="text-sm font-medium text-gray-900 max-w-32 truncate">
                                    {userProfile?.displayName || user.email?.split('@')[0]}
                                </div>
                                <div className="text-xs text-gray-500 capitalize">
                                    {userRole}
                                </div>
                            </div>

                            <Link
                                to="/admin/profile"
                                className="text-gray-500 hover:text-blue-600 p-2 rounded-md transition-colors duration-200"
                                title={t('nav.profile', 'Profile')}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </Link>

                            <button
                                onClick={handleLogout}
                                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors duration-200 flex items-center space-x-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <span>{t('nav.logout', 'Logout')}</span>
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center space-x-2">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200"
                            aria-label="Toggle menu"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden border-t border-gray-200 bg-white shadow-lg">
                        {/* Navigation Links */}
                        <nav className="px-2 pt-2 pb-3 space-y-1">
                            {filteredNavLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    className={getMobileLinkClass(link.path)}
                                    to={link.path}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>

                        {/* User Info and Actions */}
                        <div className="border-t border-gray-200 px-4 py-4 bg-gray-50 space-y-4">
                            <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                                        {(userProfile?.displayName || user.email?.[0] || 'U').toUpperCase()}
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-gray-900 truncate">
                                        {userProfile?.displayName || user.email}
                                    </div>
                                    <div className="text-sm text-gray-500 capitalize">
                                        {userRole}
                                    </div>
                                </div>
                            </div>

                            <div className="flex space-x-3">
                                <Link
                                    to="/admin/profile"
                                    className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors duration-200 text-center"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {t('nav.profile', 'Profile')}
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-red-700 transition-colors duration-200"
                                >
                                    {t('nav.logout', 'Logout')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </header>
    )
}