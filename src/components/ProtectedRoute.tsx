import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  console.log('🛡️ ProtectedRoute check:', { user: user?.email, loading, path: window.location.pathname })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    console.log('🔐 No user, redirecting to login')
    return <Navigate to="/login" replace />
  }

  console.log('✅ User authenticated, rendering children')
  return <>{children}</>
}