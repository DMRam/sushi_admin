import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X, LayoutDashboard, ShoppingCart } from 'lucide-react'
import { AuthModal } from '../../components/AuthModal'
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../../firebase/firebase'
import { supabase } from '../../../lib/supabase'
import logo from '../../../assets/logo/mai_sushi_v3_dark.png'
import { useCartStore } from '../../../stores/cartStore'

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

export const LandingHeader = () => {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)

    // Cart state
    const cart = useCartStore((state) => state.cart)
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

    // User state
    const [user, setUser] = useState<UserProfile | null>(null)
    const [isLoadingUser, setIsLoadingUser] = useState(true)

    // Auth modal state
    const [showAuthModal, setShowAuthModal] = useState(false)
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
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                await fetchUserProfile(firebaseUser.uid)
            } else {
                setUser(null)
                setIsLoadingUser(false)
            }
        })
        return () => unsubscribe()
    }, [])

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

    return (
        <>
            <header className="bg-white shadow-sm border-b border-gray-100 fixed inset-x-0 top-0 z-40">
                {/* ... rest of your JSX remains the same ... */}
                <div className="w-full px-3 sm:px-4 md:px-8 py-4 overflow-x-clip">
                    <div className="flex items-center justify-between gap-3">
                        <Link to="/" className="flex items-center min-w-0 shrink-0">
                            <img
                                src={logo}
                                alt="MaiSushi Logo"
                                className="block h-12 sm:h-16 w-auto max-w-[200px] object-contain"
                                loading="eager"
                                decoding="async"
                            />
                        </Link>

                        {/* Desktop Nav */}
                        <nav className="hidden md:flex items-center gap-8 shrink min-w-0">
                            <Link
                                to="/order"
                                className="text-gray-700 hover:text-red-600 text-sm font-light transition-colors duration-300 whitespace-nowrap"
                            >
                                {t('header.menu', 'Menu')}
                            </Link>

                            <a
                                href="#contact"
                                className="text-gray-700 hover:text-red-600 text-sm font-light transition-colors duration-300 whitespace-nowrap"
                            >
                                {t('header.contact', 'Contact')}
                            </a>

                            {user && (
                                <Link
                                    to="/client-dashboard"
                                    className="text-gray-700 hover:text-red-600 text-sm font-light transition-colors duration-300 flex items-center gap-1 whitespace-nowrap"
                                >
                                    <LayoutDashboard size={16} />
                                    <span>Dashboard</span>
                                </Link>
                            )}

                            {/* Cart for Desktop */}
                            <Link
                                to="/checkout"
                                className="relative text-gray-700 hover:text-red-600 transition-colors duration-300 flex items-center gap-2 whitespace-nowrap group"
                            >
                                <ShoppingCart size={18} />
                                <span className="text-sm font-light">Cart</span>
                                {itemCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium group-hover:scale-110 transition-transform">
                                        {itemCount}
                                    </span>
                                )}
                            </Link>

                            <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
                                {isLoadingUser ? (
                                    <div className="text-xs text-gray-400 whitespace-nowrap">Loading...</div>
                                ) : user ? (
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                            <span className="text-sm text-gray-600 font-light whitespace-nowrap">
                                                {user.points || 0} {t('header.points', 'pts')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-700 font-medium whitespace-nowrap">
                                                {user.first_name || 'User'}
                                            </span>
                                            <button
                                                onClick={handleLogout}
                                                className="text-xs text-gray-500 hover:text-gray-700 transition-colors duration-300 font-light whitespace-nowrap"
                                            >
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => openAuthModal(true)}
                                        className="text-xs text-gray-500 hover:text-gray-700 transition-colors duration-300 font-light whitespace-nowrap"
                                    >
                                        {t('header.signIn', 'Sign In')}
                                    </button>
                                )}
                            </div>
                        </nav>

                        {/* Mobile menu button and cart */}
                        <div className="flex items-center gap-3 md:hidden">
                            {/* Cart for Mobile */}
                            <Link
                                to="/checkout"
                                className="relative text-gray-700 hover:text-red-600 transition-colors duration-300 p-2"
                            >
                                <ShoppingCart size={20} />
                                {itemCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
                                        {itemCount}
                                    </span>
                                )}
                            </Link>

                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                className="text-gray-700 hover:text-red-600 focus:outline-none transition shrink-0"
                                aria-label="Toggle menu"
                            >
                                {isOpen ? <X size={22} /> : <Menu size={22} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Dropdown Menu - remains the same */}
                <div
                    className={`md:hidden bg-white shadow-sm border-t border-gray-100 transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                        }`}
                >
                    <div className="flex flex-col px-4 py-4 space-y-4">
                        <Link
                            to="/order"
                            onClick={() => setIsOpen(false)}
                            className="text-gray-700 hover:text-red-600 text-sm font-light transition"
                        >
                            {t('header.menu', 'Menu')}
                        </Link>

                        <a
                            href="#contact"
                            onClick={() => setIsOpen(false)}
                            className="text-gray-700 hover:text-red-600 text-sm font-light transition"
                        >
                            {t('header.contact', 'Contact')}
                        </a>

                        {/* Cart in Mobile Menu */}
                        <Link
                            to="/checkout"
                            onClick={() => setIsOpen(false)}
                            className="text-gray-700 hover:text-red-600 text-sm font-light transition flex items-center justify-between py-2 border-t border-gray-200"
                        >
                            <div className="flex items-center gap-2">
                                <ShoppingCart size={16} />
                                <span>Cart</span>
                            </div>
                            {itemCount > 0 && (
                                <span className="bg-red-600 text-white text-xs rounded-full px-2 py-1 min-w-6 text-center">
                                    {itemCount} items
                                </span>
                            )}
                        </Link>

                        {user && (
                            <Link
                                to="/client-dashboard"
                                onClick={() => setIsOpen(false)}
                                className="text-gray-700 hover:text-red-600 text-sm font-light transition flex items-center gap-2"
                            >
                                <LayoutDashboard size={16} />
                                <span>Dashboard</span>
                            </Link>
                        )}

                        {isLoadingUser ? (
                            <div className="pt-3 border-t border-gray-200 text-xs text-gray-400">
                                Loading...
                            </div>
                        ) : user ? (
                            <div className="pt-3 border-t border-gray-200 space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-sm text-gray-600 font-light">
                                        {user.points || 0} {t('header.points', 'pts')}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700 font-medium">
                                        {user.first_name || 'User'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        handleLogout()
                                        setIsOpen(false)
                                    }}
                                    className="text-xs text-gray-500 hover:text-gray-700 font-light transition text-left w-full pt-2 border-t border-gray-200"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    openAuthModal(true)
                                    setIsOpen(false)
                                }}
                                className="pt-3 border-t border-gray-200 text-xs text-gray-500 hover:text-gray-700 font-light transition text-left"
                            >
                                {t('header.signIn', 'Sign In')}
                            </button>
                        )}
                    </div>
                </div>
            </header>

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
        </>
    )
}