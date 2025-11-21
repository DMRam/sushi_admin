// Updated LandingCTAFooter.tsx
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FooterLanguageSwitcher } from '../../../components/web/LanguageSelector'
import { HashLink } from 'react-router-hash-link'
import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../../firebase/firebase'
import { supabase } from '../../../lib/supabase'
import logo from '../../../assets/logo/mai_sushi_v3_white.png'
import { AuthModal } from '../../../pages/components/AuthModal'

interface UserProfile {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    points: number;
    address?: string;
    city?: string;
    zip_code?: string;
}

interface Props {
    displaySimple: boolean
    user?: any
    isAdmin?: boolean
    isStaff?: boolean
}

export const LandingCTAFooter = ({ displaySimple, user: propUser, isAdmin, isStaff }: Props) => {
    const { t } = useTranslation()

    // User state
    const [user, setUser] = useState<UserProfile | null>(null)
    const [isLoadingUser, setIsLoadingUser] = useState(true)

    // Auth modal state
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [showAdminLogin, setShowAdminLogin] = useState(false)
    const [isLoginMode, setIsLoginMode] = useState(true)
    const [authForm, setAuthForm] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: ''
    })
    const [isAuthLoading, setIsAuthLoading] = useState(false)
    const [authError, setAuthError] = useState('')

    // Check user authentication state
    useEffect(() => {
        // If user is passed as prop, use it
        if (propUser) {
            setUser(propUser)
            setIsLoadingUser(false)
            return
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                await fetchUserProfile(firebaseUser.uid)
            } else {
                setUser(null)
                setIsLoadingUser(false)
            }
        })
        return () => unsubscribe()
    }, [propUser])

    const fetchUserProfile = async (firebaseUid: string) => {
        try {
            const { data: clientProfile, error } = await supabase
                .from('client_profiles')
                .select('*')
                .eq('firebase_uid', firebaseUid)
                .single()

            if (error) {
                console.error('Error fetching client profile:', error)
                setUser(null)
                setIsLoadingUser(false)
                return
            }

            if (clientProfile) {
                const fullName = clientProfile.full_name || ''
                const nameParts = fullName.split(' ')
                const firstName = nameParts[0] || ''
                const lastName = nameParts.slice(1).join(' ') || ''

                // Safely handle missing points column
                const userPoints = clientProfile.points !== undefined ? clientProfile.points : 0

                setUser({
                    id: clientProfile.id,
                    email: clientProfile.email,
                    first_name: firstName,
                    last_name: lastName,
                    phone: clientProfile.phone,
                    points: userPoints,
                    address: clientProfile.address,
                    city: clientProfile.city,
                    zip_code: clientProfile.zip_code
                })
            }
            setIsLoadingUser(false)
        } catch (error) {
            console.error('Error fetching user profile:', error)
            setUser(null)
            setIsLoadingUser(false)
        }
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsAuthLoading(true)
        setAuthError('')

        try {
            const { signInWithEmailAndPassword } = await import('firebase/auth')
            const userCredential = await signInWithEmailAndPassword(
                auth,
                authForm.email,
                authForm.password
            )

            const firebaseUser = userCredential.user
            const { data: clientProfile, error } = await supabase
                .from('client_profiles')
                .select('*')
                .eq('firebase_uid', firebaseUser.uid)
                .single()

            if (error) {
                console.error('Error fetching client profile:', error)
                setAuthError('User profile not found')
                return
            }

            if (clientProfile) {
                const fullName = clientProfile.full_name || ''
                const nameParts = fullName.split(' ')
                const firstName = nameParts[0] || ''
                const lastName = nameParts.slice(1).join(' ') || ''

                // Safely handle missing points column
                const userPoints = clientProfile.points !== undefined ? clientProfile.points : 0

                setUser({
                    id: clientProfile.id,
                    email: clientProfile.email,
                    first_name: firstName,
                    last_name: lastName,
                    phone: clientProfile.phone,
                    points: userPoints,
                    address: clientProfile.address,
                    city: clientProfile.city,
                    zip_code: clientProfile.zip_code
                })

                setShowAuthModal(false)
                setAuthForm({ email: '', password: '', firstName: '', lastName: '', phone: '' })
            }
        } catch (error: any) {
            console.error('Login error:', error)
            setAuthError(error.message || 'Login failed')
        } finally {
            setIsAuthLoading(false)
        }
    }

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsAuthLoading(true)
        setAuthError('')

        try {
            // Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                authForm.email,
                authForm.password
            )

            const firebaseUser = userCredential.user
            const fullName = `${authForm.firstName} ${authForm.lastName}`.trim()

            // Create user profile in Supabase - only include fields that exist
            const profileData: any = {
                firebase_uid: firebaseUser.uid,
                email: authForm.email,
                full_name: fullName,
                phone: authForm.phone,
                created_at: new Date().toISOString(),
            }

            // Only include points if the column exists
            // You can remove this if you don't have points column
            // profileData.points = 0

            const { data: clientProfile, error: profileError } = await supabase
                .from('client_profiles')
                .insert(profileData)
                .select()
                .single()

            if (profileError) {
                console.error('Supabase profile error:', profileError)

                // If it's a column error, try without the problematic column
                if (profileError.message.includes('points')) {
                    delete profileData.points
                    const { data: retryProfile, error: retryError } = await supabase
                        .from('client_profiles')
                        .insert(profileData)
                        .select()
                        .single()

                    if (retryError) {
                        await firebaseUser.delete()
                        throw retryError
                    }

                    if (retryProfile) {
                        setUser({
                            id: retryProfile.id,
                            email: retryProfile.email,
                            first_name: authForm.firstName,
                            last_name: authForm.lastName,
                            phone: retryProfile.phone,
                            points: 0 // Default value
                        })
                    }
                } else {
                    await firebaseUser.delete()
                    throw profileError
                }
            } else if (clientProfile) {
                setUser({
                    id: clientProfile.id,
                    email: clientProfile.email,
                    first_name: authForm.firstName,
                    last_name: authForm.lastName,
                    phone: clientProfile.phone,
                    points: clientProfile.points || 0
                })
            }

            setShowAuthModal(false)
            setAuthForm({ email: '', password: '', firstName: '', lastName: '', phone: '' })
        } catch (error: any) {
            console.error('Signup error:', error)

            // Handle specific error cases
            if (error.code === 'auth/email-already-in-use') {
                setAuthError('This email is already registered. Please sign in instead.')
            } else if (error.message?.includes('points')) {
                setAuthError('Account created successfully! Please sign in.')
            } else {
                setAuthError(error.message || 'Signup failed. Please try again.')
            }
        } finally {
            setIsAuthLoading(false)
        }
    }

    const handleLogout = async () => {
        try {
            await signOut(auth)
            setUser(null)
        } catch (error) {
            console.error('Logout error:', error)
        }
    }

    const openAuthModal = (loginMode: boolean = true) => {
        setIsLoginMode(loginMode)
        setShowAuthModal(true)
        setAuthError('')
        if (loginMode) {
            setAuthForm(prev => ({ ...prev, firstName: '', lastName: '', phone: '' }))
        }
    }

    const toggleAdminLogin = () => {
        setShowAdminLogin(!showAdminLogin)
    }

    return (
        <>
            {
                !displaySimple && (
                    <>
                        {/* Optional CTA section can be added back if needed */}
                    </>
                )
            }

            {/* Auth Modal */}
            {showAuthModal && (
                <AuthModal
                    isLoginMode={isLoginMode}
                    setIsLoginMode={setIsLoginMode}
                    authForm={authForm}
                    setAuthForm={setAuthForm}
                    handleLogin={handleLogin}
                    handleSignup={handleSignup}
                    isAuthLoading={isAuthLoading}
                    authError={authError}
                    setAuthError={setAuthError}
                    setShowAuthModal={setShowAuthModal}
                />
            )}

            {/* Enhanced Footer */}
            <footer className="bg-gray-950 text-white py-16">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
                        {/* Brand Section */}
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center space-x-3 mb-6">
                                <img src={logo} alt="MaiSushi Logo" className="h-12 w-auto" />
                            </div>
                            <p className="text-gray-400 text-sm font-light tracking-wide leading-relaxed max-w-md mb-6">
                                {t('landing.footerDescription', 'A sanctuary of Japanese culinary artistry in the heart of the city. Where every dish reflects masterful craftsmanship.')}
                            </p>
                            <div className="flex space-x-4">
                                <span className="text-gray-500 hover:text-white transition-colors duration-300 cursor-pointer text-sm">IG</span>
                                <span className="text-gray-500 hover:text-white transition-colors duration-300 cursor-pointer text-sm">FB</span>
                                <span className="text-gray-500 hover:text-white transition-colors duration-300 cursor-pointer text-sm">TW</span>
                            </div>

                            {/* Enhanced Loyalty Program Info */}
                            {!user && (
                                <div className="mt-6 p-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700">
                                    <h5 className="text-sm font-medium mb-3 text-white flex items-center">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                        {t('landing.loyaltyProgram', 'LOYALTY PROGRAM')}
                                    </h5>
                                    <p className="text-xs text-gray-300 mb-4 leading-relaxed">
                                        {t('footer.loyaltyDescription', 'Earn points with every order. Track your rewards, redeem discounts, and manage your account through our web dashboard. Mobile app coming soon!')}
                                    </p>

                                    {/* Web Dashboard CTA */}
                                    <div className="mb-4">
                                        <button
                                            onClick={() => openAuthModal(false)}
                                            className="w-full bg-red-600 hover:bg-red-700 text-white text-center py-2 px-4 rounded text-xs font-medium transition-all duration-300 transform hover:scale-105"
                                        >
                                            {t('footer.joinWebDashboard', 'Join Web Dashboard')}
                                        </button>
                                        <p className="text-xs text-gray-400 text-center mt-2">
                                            {t('footer.instantAccess', 'Instant access to rewards')}
                                        </p>
                                    </div>

                                    {/* Coming Soon App Section */}
                                    <div className="border-t border-gray-700 pt-4">
                                        <p className="text-xs text-gray-400 mb-3 text-center">
                                            {t('footer.mobileAppComing', 'Mobile App Coming Soon')}
                                        </p>

                                        <div className="flex justify-center space-x-2">
                                            {/* Apple App Store - Coming Soon */}
                                            <div className="relative group">
                                                <div className="flex items-center justify-center w-24 h-8 bg-black rounded-lg border border-gray-600 opacity-60 cursor-not-allowed">
                                                    <div className="flex items-center space-x-1">
                                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M18.71 19.5c-.83 1.24-1.85 1.24-2.68 0-1.21-1.81-2.84-1.81-4.05 0-.83 1.24-1.85 1.24-2.68 0-1.48-2.22-2.67-5.22-1.13-7.77 1.54-2.55 4.12-2.93 5.86-2.93 1.74 0 4.32.38 5.86 2.93 1.54 2.55.35 5.55-1.13 7.77zM16.5 4.5c0 1.93-1.43 3.5-3.5 3.5s-3.5-1.57-3.5-3.5S11.43 1 13.5 1s3.5 1.57 3.5 3.5z" />
                                                        </svg>
                                                        <div className="text-white text-xs">
                                                            <div className="text-[9px] leading-none">Download on</div>
                                                            <div className="font-semibold leading-none text-[10px]">App Store</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                                    {t('footer.comingSoon', 'Coming Soon')}
                                                </div>
                                            </div>

                                            {/* Google Play Store - Coming Soon */}
                                            <div className="relative group">
                                                <div className="flex items-center justify-center w-24 h-8 bg-black rounded-lg border border-gray-600 opacity-60 cursor-not-allowed">
                                                    <div className="flex items-center space-x-1">
                                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.25-.84-.76-.84-1.35zm14.15-8.15L5.46 3.04C5.55 3.02 5.64 3 5.73 3h12.54c.21 0 .41.06.58.18l-5.7 5.7-5.7 5.7 5.7 5.7 5.7-5.7zm0-2.7l5.7-5.7c.17.12.27.32.27.52v12c0 .2-.1.4-.27.52l-5.7-5.7-5.7-5.7 5.7-5.7z" />
                                                        </svg>
                                                        <div className="text-white text-xs">
                                                            <div className="text-[9px] leading-none">GET IT ON</div>
                                                            <div className="font-semibold leading-none text-[10px]">Google Play</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                                    {t('footer.comingSoon', 'Coming Soon')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Features List */}
                                    <div className="mt-4 space-y-2">
                                        <div className="flex items-center text-xs text-gray-300">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                                            {t('footer.featureTrackOrders', 'Track orders & points')}
                                        </div>
                                        <div className="flex items-center text-xs text-gray-300">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                                            {t('footer.featureRedeemRewards', 'Redeem exclusive rewards')}
                                        </div>
                                        <div className="flex items-center text-xs text-gray-300">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                                            {t('footer.featureMobileComing', 'Mobile app in development')}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Navigation & Auth Section */}
                        <div>
                            <h4 className="text-sm font-light mb-4 tracking-wide">
                                {t('landing.navigation', 'NAVIGATION')}
                            </h4>
                            <ul className="space-y-2 text-gray-400 text-sm font-light">
                                <li><Link to="/order" className="hover:text-white transition-colors duration-300">{t('landing.menu', 'Menu')}</Link></li>
                                <li>
                                    <HashLink
                                        to="#contact"
                                        className="hover:text-white transition-colors duration-300"
                                        scroll={(el) => el.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                    >
                                        {t('landing.contact', 'Contact')}
                                    </HashLink>
                                </li>
                                <li><Link to="/catering" className="hover:text-white transition-colors duration-300">{t('landing.cateringEvents', 'Catering & Events')}</Link></li>

                                {user ? (
                                    <>
                                        {(isAdmin || isStaff) && (
                                            <li>
                                                <Link
                                                    to="/admin"
                                                    className="hover:text-yellow-400 transition-colors duration-300 text-yellow-500 flex items-center"
                                                >
                                                    {t('nav.teamPortal', 'MaiSushi Team Portal')}
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
                                            <button
                                                onClick={() => openAuthModal(true)}
                                                className="hover:text-white transition-colors duration-300 text-gray-400 text-left"
                                            >
                                                {t('header.signIn', 'Customer Sign In')}
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                onClick={toggleAdminLogin}
                                                className="hover:text-yellow-400 transition-colors duration-300 text-gray-400 text-left flex items-center"
                                            >
                                                {t('footer.teamLogin', 'Team Member Login')}
                                                <span className="ml-1">→</span>
                                            </button>
                                        </li>
                                    </>
                                )}
                            </ul>

                            {/* Team Login Panel */}
                            {showAdminLogin && !user && (
                                <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                    <h5 className="text-xs font-medium mb-3 text-yellow-400">
                                        {t('footer.teamAccess', 'TEAM MEMBER ACCESS')}
                                    </h5>
                                    <p className="text-xs text-gray-300 mb-3">
                                        {t('footer.teamDescription', 'Access the MaiSushi team portal with authorized credentials.')}
                                    </p>
                                    <div className="space-y-2">
                                        <Link
                                            to="/admin-login"
                                            className="block w-full text-center bg-yellow-600 text-white py-2 px-3 text-xs font-medium rounded hover:bg-yellow-700 transition-colors duration-300"
                                        >
                                            {t('footer.teamLogin', 'Team Portal Login')}
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

                        {/* Visit & Info Section */}
                        <div>
                            <h4 className="text-sm font-light mb-4 tracking-wide">
                                {t('landing.visit', 'VISIT')}
                            </h4>
                            <ul className="space-y-2 text-gray-400 text-sm font-light">
                                <li>{t('landing.addressLine1', '1975 King Ouest,')}</li>
                                <li>{t('landing.addressLine2', 'Sherbrooke, QC J1J 2E6')}</li>
                                <li className="pt-2">{t('landing.hoursTuesdayWednesday', 'Tue-Wed: 11:00 AM - 8:00 PM')}</li>
                                <li>{t('landing.hoursThursdaySaturday', 'Thu-Sat: 11:00 AM - 9:00 PM')}</li>
                                <li>{t('landing.hoursSunday', 'Sun: Closed')}</li>
                                <li>{t('landing.hoursMonday', 'Mon: Closed')}</li>
                                <li className="pt-2">{t('landing.phoneNumberDisplay', '+1 (555) 123-SUSHI')}</li>
                                <li>{t('landing.emailAddressDisplay', 'contact@maisushi.ca')}</li>
                            </ul>

                            {/* Quick Links for Team Members */}
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

                            {/* Language Switcher */}
                            <div className="mt-6 pt-4 border-t border-gray-800">
                                <FooterLanguageSwitcher />
                            </div>
                        </div>
                    </div>

                    {/* Footer Bottom */}
                    <div className="border-t border-gray-800 mt-12 pt-8 text-center space-y-2">
                        <p className="text-gray-500 text-xs font-light tracking-wide">
                            © 2024 MaiSushi by Pacifique Resto.
                            {(isAdmin || isStaff) && (
                                <span className="ml-2 text-yellow-500">
                                    {t('footer.teamMode', 'Team Mode')}
                                </span>
                            )}
                        </p>

                        <div className="flex justify-center items-center space-x-4 text-gray-500 text-xs font-light">
                            <Link to="/privacy" className="hover:text-white transition-colors duration-200">
                                {t('footer.privacy', 'Privacy Policy')}
                            </Link>

                            <span className="text-gray-600">•</span>

                            <Link to="/cookies-policy" className="hover:text-white transition-colors duration-200">
                                {t('footer.cookies', 'Cookies Policy')}
                            </Link>

                            <span className="text-gray-600">•</span>

                            <Link to="/terms" className="hover:text-white transition-colors duration-200">
                                {t('footer.terms', 'Terms & Conditions')}
                            </Link>
                        </div>

                        <p className="text-gray-600 text-xs font-light">
                            {t('footer.version', 'Version 1.3.0')}
                        </p>

                        <p className="text-gray-700 text-xs font-light tracking-wide">
                            Powered by{" "}
                            <span className="text-red-400">
                                <a
                                    href="https://sherdev.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                >
                                    SherDev
                                </a>
                            </span>
                        </p>
                    </div>
                </div>
            </footer>
        </>
    )
}