import  { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useInvitation } from '../context/InvitationContext'

export default function RegisterPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [invitationCode, setInvitationCode] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [codeValidation, setCodeValidation] = useState<{ isValid: boolean; message: string } | null>(null)

    const { register } = useAuth()
    const { validateCode, markCodeAsUsed } = useInvitation()
    const navigate = useNavigate()

    // Validate invitation code as user types
    const handleCodeChange = async (code: string) => {
        setInvitationCode(code)
        if (code.length >= 4) {
            const validation = await validateCode(code)
            setCodeValidation(validation)
        } else {
            setCodeValidation(null)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            return setError('Passwords do not match')
        }

        if (!invitationCode.trim()) {
            return setError('Invitation code is required')
        }

        // Final validation before submitting
        const finalValidation = await validateCode(invitationCode)
        if (!finalValidation.isValid) {
            return setError(finalValidation.message)
        }

        try {
            setError('')
            setLoading(true)

            // Register the user first
            await register(email, password)

            // Then mark invitation code as used
            try {
                await markCodeAsUsed(invitationCode)
                console.log('✅ Invitation code marked as used successfully')
            } catch (codeError) {
                console.warn('⚠️ Could not mark invitation code as used:', codeError)
                // Don't fail the registration if code marking fails
            }

            navigate('/dashboard')
        } catch (error: any) {
            console.error('❌ Registration failed:', error)
            setError('Failed to create an account: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-amber-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            {/* Ocean-themed background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute top-40 left-40 w-80 h-80 bg-amber-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
                {/* Combined Chile-Canada Icon */}
                <div className="flex justify-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-red-500 to-white rounded-full flex items-center justify-center shadow-lg mb-4 relative overflow-hidden">
                        <div className="absolute inset-0 bg-blue-500"></div>
                        <div className="absolute left-0 top-0 w-1/2 h-full bg-red-500"></div>
                        <div className="absolute w-4 h-4 bg-white rounded-full z-10"></div>
                        <svg className="w-8 h-8 text-white relative z-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                </div>

                <h2 className="mt-2 text-center text-4xl font-bold bg-gradient-to-r from-blue-600 via-red-500 to-amber-600 bg-clip-text text-transparent">
                    海の味 Admin
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 font-medium">
                    Ocean Flavors • Sabores del Océano
                </p>
                <p className="mt-1 text-center text-xs text-gray-500">
                    Sushi • Ceviche • Sea Food • Sherbrooke, QC
                </p>

                <p className="mt-4 text-center text-sm text-gray-600">
                    Already have access?{' '}
                    <Link
                        to="/login"
                        className="font-semibold text-blue-600 hover:text-blue-500 transition-colors duration-200"
                    >
                        Sign in here
                    </Link>
                </p>
            </div>

            <div className="relative mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white/80 backdrop-blur-sm py-8 px-6 shadow-2xl sm:rounded-2xl sm:px-10 border border-white/20">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Invitation Code Field */}
                        <div>
                            <label htmlFor="invitationCode" className="block text-sm font-semibold text-gray-700 mb-2">
                                Staff Invitation Code *
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                </div>
                                <input
                                    id="invitationCode"
                                    name="invitationCode"
                                    type="text"
                                    required
                                    value={invitationCode}
                                    onChange={(e) => handleCodeChange(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 uppercase font-mono"
                                    placeholder="e.g., SUSHI-2024"
                                />
                            </div>
                            {codeValidation && (
                                <p className={`mt-2 text-sm flex items-center ${codeValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                                    {codeValidation.isValid ? (
                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                    {codeValidation.message}
                                </p>
                            )}
                        </div>

                        {/* Email Field */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                                Email Address
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                    </svg>
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50"
                                    placeholder="chef@oceanflavors.ca"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {/* Confirm Password Field */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                                Confirm Password
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading || (!!codeValidation && !codeValidation.isValid)}
                                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Creating Staff Account...
                                    </>
                                ) : (
                                    'Create Staff Account'
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Additional seafood-themed decorative element */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="flex justify-center space-x-4 text-xs text-gray-500">
                            <span>🍣 Sushi Bar</span>
                            <span>•</span>
                            <span>🐟 Ceviche Station</span>
                            <span>•</span>
                            <span>🦐 Sea Food</span>
                        </div>
                        <p className="text-center text-xs text-gray-400 mt-2">
                            Staff Access Only • Sherbrooke, Québec
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}