import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X, LayoutDashboard } from 'lucide-react'
import { AuthModal } from '../../components/AuthModal'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../../../firebase/firebase'
import { supabase } from '../../../lib/supabase'

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
                // Split full_name into first and last name
                const fullName = clientProfile.full_name || ''
                const nameParts = fullName.split(' ')
                const firstName = nameParts[0] || ''
                const lastName = nameParts.slice(1).join(' ') || ''

                setUser({
                    id: clientProfile.id,
                    email: clientProfile.email,
                    first_name: firstName,
                    last_name: lastName,
                    phone: clientProfile.phone,
                    points: clientProfile.points,
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
            // Import the auth functions
            const { signInWithEmailAndPassword } = await import('firebase/auth')

            const userCredential = await signInWithEmailAndPassword(
                auth,
                authForm.email,
                authForm.password
            )

            const firebaseUser = userCredential.user

            // Fetch the client profile from Supabase
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
                // Split full_name into first and last name
                const fullName = clientProfile.full_name || ''
                const nameParts = fullName.split(' ')
                const firstName = nameParts[0] || ''
                const lastName = nameParts.slice(1).join(' ') || ''

                setUser({
                    id: clientProfile.id,
                    email: clientProfile.email,
                    first_name: firstName,
                    last_name: lastName,
                    phone: clientProfile.phone,
                    points: clientProfile.points,
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
            // Import the auth functions
            const { createUserWithEmailAndPassword } = await import('firebase/auth')

            const userCredential = await createUserWithEmailAndPassword(
                auth,
                authForm.email,
                authForm.password
            )

            const firebaseUser = userCredential.user

            // Combine first and last name into full_name for Supabase
            const fullName = `${authForm.firstName} ${authForm.lastName}`.trim()

            // Create client profile in Supabase
            const { data: clientProfile, error: profileError } = await supabase
                .from('client_profiles')
                .insert({
                    firebase_uid: firebaseUser.uid,
                    email: authForm.email,
                    full_name: fullName,
                    phone: authForm.phone,
                    points: 0,
                    created_at: new Date().toISOString(),
                })
                .select()
                .single()

            if (profileError) throw profileError

            if (clientProfile) {
                setUser({
                    id: clientProfile.id,
                    email: clientProfile.email,
                    first_name: authForm.firstName,
                    last_name: authForm.lastName,
                    phone: clientProfile.phone,
                    points: clientProfile.points
                })

                setShowAuthModal(false)
                setAuthForm({ email: '', password: '', firstName: '', lastName: '', phone: '' })
            }

        } catch (error: any) {
            console.error('Signup error:', error)
            setAuthError(error.message || 'Signup failed')
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
        // Reset form when opening modal
        if (loginMode) {
            setAuthForm(prev => ({ ...prev, firstName: '', lastName: '', phone: '' }))
        }
    }

    return (
        <>
            <header className="bg-white shadow-sm border-b border-gray-100 fixed w-full top-0 left-0 z-40">
                {/* Add viewport meta tag enforcement */}
                <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center max-w-full overflow-hidden">
                    {/* Brand - made more compact for mobile */}
                    <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
                        <div className="w-2 h-6 sm:w-3 sm:h-8 bg-red-600 rounded-full"></div>
                        <h1 className="text-xl sm:text-2xl font-light tracking-tight text-gray-900 whitespace-nowrap">
                            Mai<span className="font-medium">Sushi</span>
                        </h1>
                        <span className="hidden xs:inline text-xs text-gray-500 font-light ml-2 border-l border-gray-300 pl-2">
                            {t('header.byPacifique', 'by Pacifique')}
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex space-x-8 items-center flex-shrink-0">
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

                        {/* Dashboard Link - Only show when user is logged in */}
                        {user && (
                            <Link
                                to="/client-dashboard"
                                className="text-gray-700 hover:text-red-600 text-sm font-light transition-colors duration-300 flex items-center space-x-1 whitespace-nowrap"
                            >
                                <LayoutDashboard size={16} />
                                <span>Dashboard</span>
                            </Link>
                        )}

                        {/* User Section */}
                        <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-gray-200 flex-shrink-0">
                            {isLoadingUser ? (
                                <div className="text-xs text-gray-400 whitespace-nowrap">Loading...</div>
                            ) : user ? (
                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
                                        <span className="text-sm text-gray-600 font-light whitespace-nowrap">
                                            {user.points || 0} {t('header.points', 'pts')}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
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

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden text-gray-700 hover:text-red-600 focus:outline-none transition flex-shrink-0 ml-2"
                        aria-label="Toggle menu"
                    >
                        {isOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                {/* Mobile Dropdown Menu */}
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

                        {/* Dashboard Link - Mobile - Only show when user is logged in */}
                        {user && (
                            <Link
                                to="/client-dashboard"
                                onClick={() => setIsOpen(false)}
                                className="text-gray-700 hover:text-red-600 text-sm font-light transition flex items-center space-x-2"
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
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
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