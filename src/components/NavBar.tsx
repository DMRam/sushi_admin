// components/NavBar.tsx - Fixed version
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUserProfile, UserRole } from '../context/UserProfileContext'
import { useState } from 'react'
import { isSuperAdmin } from '../utils/authUtils'

interface NavLink {
    path: string
    label: string
    allowedRoles: UserRole[]
}

export default function NavBar() {
    const { user, logout } = useAuth()
    const { userProfile, loading } = useUserProfile()
    const loc = useLocation()
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    // Debug logging
    console.log('🔍 NavBar Debug:', {
        user: user?.email,
        userProfile: userProfile,
        userProfileExists: !!userProfile,
        userProfileRole: userProfile?.role,
        loading: loading,
        isSuperAdmin: user?.email ? isSuperAdmin(user.email) : false
    })

    // Define navigation links with role permissions
    const navLinks: NavLink[] = [
        { path: '/admin/sales-tracking', label: 'Sales Tracking', allowedRoles: [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN, UserRole.VIEWER] },
        { path: '/admin/purchases', label: 'Purchases', allowedRoles: [UserRole.MANAGER, UserRole.ADMIN] },
        { path: '/admin/products', label: 'Products', allowedRoles: [UserRole.MANAGER, UserRole.ADMIN, UserRole.VIEWER] },
        { path: '/admin/stock', label: 'Stock', allowedRoles: [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN, UserRole.VIEWER] },
        { path: '/admin/cost-analysis', label: 'Cost Analysis', allowedRoles: [UserRole.MANAGER, UserRole.ADMIN] },
        { path: '/admin/business-analytics', label: 'Business Analytics', allowedRoles: [UserRole.MANAGER, UserRole.ADMIN] },
        { path: '/admin/admin', label: 'Admin', allowedRoles: [UserRole.ADMIN] },
    ]

    // In NavBar.tsx - update the getUserRoleForNav function
    const getUserRoleForNav = (): UserRole => {
        if (userProfile && userProfile.role) {
            return userProfile.role
        }

        // If profile exists but role is missing, check super admin status
        if (user?.email && isSuperAdmin(user.email)) {
            console.log('🔧 NavBar: Profile missing role, but user is super admin - using ADMIN')
            return UserRole.ADMIN
        }

        // If we have a profile but no role, default to VIEWER
        if (userProfile) {
            console.log('⚠️ NavBar: Profile exists but role is missing - using VIEWER')
            return UserRole.VIEWER
        }

        // No profile, check if super admin
        if (user?.email && isSuperAdmin(user.email)) {
            console.log('🎯 NavBar: No profile but user is super admin - using ADMIN')
            return UserRole.ADMIN
        }

        console.log('👤 NavBar: No profile or super admin - using VIEWER')
        return UserRole.VIEWER
    }

    // Filter links based on user role
    const userRole = getUserRoleForNav()
    const filteredNavLinks = navLinks.filter(link =>
        link.allowedRoles.includes(userRole)
    )

    console.log('🎯 Navigation calculated:', {
        userRole,
        filteredLinks: filteredNavLinks.map(l => l.label)
    })

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
        return `px-3 py-2 rounded transition-colors ${isActive
            ? 'bg-blue-100 text-blue-700 font-medium'
            : 'text-gray-600 hover:text-gray-900'
            }`
    }

    // Don't render navbar if no user
    if (!user) {
        console.log('❌ NavBar: No user, not rendering')
        return null
    }

    console.log('✅ NavBar: User exists, rendering navigation with', filteredNavLinks.length, 'links')

    return (
        <header className="bg-white shadow-lg sticky top-0 z-50">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between py-4">
                    <h1 className="text-xl font-semibold text-gray-800">
                        Sushi Admin
                        <span className="ml-2 text-sm font-normal text-gray-500 capitalize">
                            ({userRole})
                            {!userProfile && !loading && ' - No Profile'}
                            {loading && ' - Loading...'}
                        </span>
                    </h1>

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

                    {/* User Info and Mobile Menu Button */}
                    <div className="flex items-center space-x-4">
                        <div className="hidden md:flex items-center space-x-4">
                            <span className="text-sm text-gray-600 max-w-32 truncate">
                                {userProfile ? userProfile.displayName : user.email}
                            </span>
                            <Link
                                to="/admin/profile"
                                className="text-gray-600 hover:text-blue-600 text-sm px-3 py-2 rounded transition-colors"
                            >
                                Profile
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700 transition-colors whitespace-nowrap"
                            >
                                Logout
                            </button>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="md:hidden p-2 rounded text-gray-600 hover:bg-gray-100"
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
                {isMenuOpen && user && (
                    <div className="md:hidden border-t border-gray-200 bg-white">
                        <nav className="py-2">
                            {filteredNavLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    className={`block px-4 py-3 rounded transition-colors text-left ${loc.pathname.startsWith(link.path)
                                        ? 'bg-blue-100 text-blue-700 font-medium border-l-4 border-blue-600'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                    to={link.path}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                        <div className="border-t border-gray-200 p-4 bg-gray-50">
                            <div className="text-sm text-gray-600 mb-2 truncate">
                                {userProfile ? userProfile.displayName : user.email}
                                <span className="ml-2 text-xs capitalize text-gray-500">
                                    ({userRole})
                                </span>
                            </div>
                            <Link
                                to="/admin/profile"
                                className="block w-full text-left px-3 py-2 rounded text-gray-600 hover:bg-gray-100 transition-colors mb-2"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Profile
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    )
}