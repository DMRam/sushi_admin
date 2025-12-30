// pages/LoginPage.tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setError('')
      setLoading(true)
      await login(email, password)
      navigate('/admin/sales-tracking')
    } catch (error: any) {
      setError('Failed to log in: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.02)_25%,rgba(0,0,0,0.02)_50%,transparent_50%,transparent_75%,rgba(0,0,0,0.02)_75%)] bg-[length:4px_4px] opacity-20"></div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
        {/* Enhanced Logo */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center shadow-lg mb-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-500 rounded-full border-4 border-white shadow-sm"></div>
          </div>
        </div>

        <div className="text-center mb-10">
          <h2 className="text-3xl font-light text-gray-900 tracking-tight mb-2">
            Admin Login
          </h2>
          <p className="text-sm text-gray-600 font-light tracking-wide">
            Restaurant Management System
          </p>
        </div>
      </div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/60 py-10 px-8 shadow-xl sm:rounded-xl sm:px-12">
          <form className="space-y-7" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50/80 border border-red-200 p-4 rounded-lg backdrop-blur-sm">
                <div className="flex items-center">
                  <svg className="h-4 w-4 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-700 font-light">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs font-medium text-gray-600 uppercase tracking-widest">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-4 border border-gray-300/80 bg-white/50 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all duration-200 font-light tracking-wide shadow-sm"
                placeholder="admin@restaurant.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-xs font-medium text-gray-600 uppercase tracking-widest">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-4 py-4 border border-gray-300/80 bg-white/50 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all duration-200 font-light tracking-wide shadow-sm"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded transition-colors duration-200"
                />
                <label htmlFor="remember-me" className="ml-3 block text-sm text-gray-600 font-light">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-light text-gray-500 hover:text-gray-700 transition-colors duration-200">
                  Forgot password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-4 px-4 border border-transparent text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 transition-all duration-200 tracking-wider rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    SIGNING IN...
                  </>
                ) : (
                  'SIGN IN TO DASHBOARD'
                )}
              </button>
            </div>
          </form>

          <div className="mt-10 pt-8 border-t border-gray-200/60">
            <p className="text-center text-sm text-gray-500 font-light">
              Don't have access?{' '}
              <Link
                to="/register"
                className="font-medium text-gray-900 hover:text-gray-700 transition-colors duration-200 underline decoration-gray-300 hover:decoration-gray-500"
              >
                Request account
              </Link>
            </p>
          </div>

          {/* Enhanced footer */}
          <div className="mt-8">
            <div className="flex justify-center space-x-6 text-xs text-gray-400 font-light tracking-wide">
              <span className="hover:text-gray-600 transition-colors duration-200 cursor-pointer">MENU</span>
              <span className="text-gray-300">•</span>
              <span className="hover:text-gray-600 transition-colors duration-200 cursor-pointer">ANALYTICS</span>
              <span className="text-gray-300">•</span>
              <span className="hover:text-gray-600 transition-colors duration-200 cursor-pointer">STAFF</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}