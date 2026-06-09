import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useUserProfile, UserRole } from '../../context/UserProfileContext'
import { isSuperAdmin } from '../../utils/authUtils'

const adminDashboardRoles: UserRole[] = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.STAFF,
]

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { userProfile, loading: profileLoading } = useUserProfile()

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking access...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/admin-login" replace />
  }

  if (isSuperAdmin(user.email)) {
    return <>{children}</>
  }

  const profileBelongsToCurrentUser = userProfile?.uid === user.uid
  const canAccessAdmin =
    profileBelongsToCurrentUser &&
    userProfile?.isActive !== false &&
    Boolean(userProfile?.role && adminDashboardRoles.includes(userProfile.role))

  if (!canAccessAdmin) {
    return <Navigate to="/client-dashboard" replace />
  }

  return <>{children}</>
}
