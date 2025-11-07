import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FooterLanguageSwitcher } from '../../../components/web/LanguageSelector'
import { HashLink } from 'react-router-hash-link'
import { useAuth } from '../../../context/AuthContext'
import { useState } from 'react'

interface Props {
    displaySimple: boolean
    user?: any
    isAdmin?: boolean
    isStaff?: boolean
}

export const LandingCTAFooter = ({ displaySimple, user, isAdmin, isStaff }: Props) => {
    const { t } = useTranslation()
    const { logout } = useAuth()
    const [showAdminLogin, setShowAdminLogin] = useState(false)

    const handleLogout = () => {
        logout()
        console.log('Logged out successfully')
    }

    const toggleAdminLogin = () => {
        setShowAdminLogin(!showAdminLogin)
    }

    return (
        <>
            {
                !displaySimple && (
                    <>
                        {/* Reservation CTA */}
                        <section className="py-20 bg-gray-900 text-white">
                            <div className="container mx-auto px-6 text-center">
                                <h2 className="text-2xl font-light mb-4 tracking-tight">
                                    {t('landing.experienceMaiSushi', 'Experience MaiSushi')}
                                </h2>
                                <div className="w-16 h-px bg-gray-600 mx-auto mb-6"></div>
                                <p className="text-gray-400 mb-8 text-sm font-light tracking-wide max-w-md mx-auto leading-relaxed">
                                    {t('landing.ctaDescription', 'Order for delivery. An elevated dining experience awaits.')}
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                    <Link
                                        to="/order"
                                        className="bg-white text-gray-900 px-8 py-3 text-sm font-light tracking-wide hover:bg-gray-100 transition-all duration-300"
                                    >
                                        {t('common.orderNow', 'ORDER NOW')}
                                    </Link>
                                    <Link
                                        to="/menu"
                                        className="border border-white text-white px-8 py-3 text-sm font-light tracking-wide hover:bg-white hover:text-gray-900 transition-all duration-300"
                                    >
                                        {t('landing.viewMenu', 'VIEW MENU')}
                                    </Link>
                                </div>
                            </div>
                        </section>
                    </>
                )
            }

            {/* Elegant Footer with Enhanced Auth Integration */}
            <footer className="bg-gray-950 text-white py-16">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                                    <span className="text-gray-900 text-sm font-light">M</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-light">MaiSushi</h3>
                                    <p className="text-xs text-gray-400 font-light tracking-wide">SUSHI | OMAKASE BAR</p>
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm font-light tracking-wide leading-relaxed max-w-md mb-6">
                                {t('landing.footerDescription', 'A sanctuary of Japanese culinary artistry in the heart of the city. Where every dish reflects masterful craftsmanship.')}
                            </p>
                            <div className="flex space-x-4">
                                <span className="text-gray-500 hover:text-white transition-colors duration-300 cursor-pointer text-sm">IG</span>
                                <span className="text-gray-500 hover:text-white transition-colors duration-300 cursor-pointer text-sm">FB</span>
                                <span className="text-gray-500 hover:text-white transition-colors duration-300 cursor-pointer text-sm">TW</span>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-light mb-4 tracking-wide">
                                {t('landing.navigation', 'NAVIGATION')}
                            </h4>
                            <ul className="space-y-2 text-gray-400 text-sm font-light">
                                <li><Link to="/order" className="hover:text-white transition-colors duration-300">{t('landing.menu', 'Menu')}</Link></li>
                                <li><a href="#philosophy" className="hover:text-white transition-colors duration-300">{t('landing.philosophy', 'Our Story')}</a></li>
                                <li>
                                    <HashLink
                                        to="#contact"
                                        className="hover:text-white transition-colors duration-300"
                                        scroll={(el) => el.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                    >
                                        {t('landing.contact', 'Contact')}
                                    </HashLink>
                                </li>
                                <li><Link to="/catering" className="hover:text-white transition-colors duration-300">{t('landing.cateringEvents', 'Catering')}</Link></li>

                                {/* Enhanced Auth Links */}
                                {user ? (
                                    <>
                                        <li>
                                            <Link to="/profile" className="hover:text-white transition-colors duration-300 flex items-center">
                                                {t('nav.profile', 'My Account')}
                                                {user.points && (
                                                    <span className="ml-2 text-xs bg-red-600 px-1.5 py-0.5 rounded-full">
                                                        {user.points} {t('header.points', 'pts')}
                                                    </span>
                                                )}
                                            </Link>
                                        </li>
                                        {(isAdmin || isStaff) && (
                                            <li>
                                                <Link
                                                    to={isAdmin ? "/admin" : "/staff"}
                                                    className="hover:text-yellow-400 transition-colors duration-300 text-yellow-500 flex items-center"
                                                >
                                                    {isAdmin ? t('nav.admin', 'Admin Dashboard') : t('nav.staff', 'Staff Portal')}
                                                    <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                                </Link>
                                            </li>
                                        )}
                                        <li>
                                            <button
                                                onClick={handleLogout}
                                                className="hover:text-red-400 transition-colors duration-300 text-gray-400"
                                            >
                                                {t('nav.logout', 'Sign Out')}
                                            </button>
                                        </li>
                                    </>
                                ) : (
                                    <>
                                        <li>
                                            <Link to="/login" className="hover:text-white transition-colors duration-300">
                                                {t('header.signIn', 'Customer Sign In')}
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to="/register" className="hover:text-white transition-colors duration-300">
                                                {t('common.createAccount', 'Create Account')}
                                            </Link>
                                        </li>
                                        <li>
                                            <button
                                                onClick={toggleAdminLogin}
                                                className="hover:text-yellow-400 transition-colors duration-300 text-gray-400 text-left"
                                            >
                                                {t('footer.staffAdminLogin', 'Staff/Admin Login')} →
                                            </button>
                                        </li>
                                    </>
                                )}
                            </ul>

                            {/* Admin/Staff Login Panel */}
                            {showAdminLogin && !user && (
                                <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                    <h5 className="text-xs font-medium mb-3 text-yellow-400">
                                        {t('footer.staffAdminAccess', 'STAFF & ADMIN ACCESS')}
                                    </h5>
                                    <p className="text-xs text-gray-300 mb-3">
                                        {t('footer.staffAdminDescription', 'Access your management dashboard with authorized credentials.')}
                                    </p>
                                    <div className="space-y-2">
                                        <Link
                                            to="/admin-login"
                                            className="block w-full text-center bg-yellow-600 text-white py-2 px-3 text-xs font-medium rounded hover:bg-yellow-700 transition-colors duration-300"
                                        >
                                            {t('footer.adminLogin', 'Admin Login')}
                                        </Link>
                                        <Link
                                            to="/staff-login"
                                            className="block w-full text-center bg-blue-600 text-white py-2 px-3 text-xs font-medium rounded hover:bg-blue-700 transition-colors duration-300"
                                        >
                                            {t('footer.staffLogin', 'Staff Login')}
                                        </Link>
                                    </div>
                                    <button
                                        onClick={toggleAdminLogin}
                                        className="w-full mt-2 text-xs text-gray-400 hover:text-gray-300 transition-colors duration-300"
                                    >
                                        {t('common.close', 'Close')}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div>
                            <h4 className="text-sm font-light mb-4 tracking-wide">
                                {t('landing.visit', 'VISIT')}
                            </h4>
                            <ul className="space-y-2 text-gray-400 text-sm font-light">
                                <li>{t('landing.location', 'SHERBROOKE, QC')}</li>
                                <li>{t('landing.days', 'Tuesday - Sunday')}</li>
                                <li>{t('landing.hours', '11:00 - 20:00')}</li>
                                <li>{t('landing.phone', '+1 (514) 867-5309')}</li>
                            </ul>

                            {/* Enhanced Loyalty Program Info */}
                            {!user && (
                                <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                    <h5 className="text-xs font-medium mb-2 text-gray-300">
                                        {t('landing.loyaltyProgram', 'LOYALTY PROGRAM')}
                                    </h5>
                                    <p className="text-xs text-gray-400 mb-3">
                                        {t('footer.loyaltyDescription', 'Earn points with every order. Redeem for exclusive rewards and discounts.')}
                                    </p>
                                    <Link
                                        to="/register"
                                        className="text-xs text-red-400 hover:text-red-300 transition-colors duration-300 flex items-center"
                                    >
                                        {t('footer.joinNow', 'Join now')} →
                                    </Link>
                                </div>
                            )}

                            {/* Quick Links for Staff/Admin */}
                            {(isAdmin || isStaff) && (
                                <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-yellow-500/30">
                                    <h5 className="text-xs font-medium mb-2 text-yellow-400">
                                        {t('footer.quickLinks', 'QUICK LINKS')}
                                    </h5>
                                    <div className="space-y-1 text-xs">
                                        <Link to="/admin/orders" className="block text-blue-400 hover:text-blue-300">
                                            {t('nav.orders', 'View Orders')}
                                        </Link>
                                        <Link to="/admin/products" className="block text-blue-400 hover:text-blue-300">
                                            {t('nav.products', 'Manage Products')}
                                        </Link>
                                        {isAdmin && (
                                            <Link to="/admin/users" className="block text-blue-400 hover:text-blue-300">
                                                {t('userManagement.title', 'User Management')}
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Language Switcher in Footer */}
                            <div className="mt-6 pt-4 border-t border-gray-800">
                                <FooterLanguageSwitcher />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-800 mt-12 pt-8 text-center">
                        <p className="text-gray-500 text-xs font-light tracking-wide">
                            © 2024 MaiSushi by Pacifique Resto.
                            {(isAdmin || isStaff) && (
                                <span className={`ml-2 ${isAdmin ? 'text-yellow-500' : 'text-blue-400'}`}>
                                    {isAdmin ? t('footer.adminMode', 'Admin Mode') : t('footer.staffMode', 'Staff Mode')}
                                </span>
                            )}
                        </p>
                        <p className="text-gray-600 text-xs mt-2">
                            {t('footer.version', 'Version 1.0.0')}
                        </p>
                    </div>
                </div>
            </footer>
        </>
    )
}