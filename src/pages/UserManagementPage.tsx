import { useState, useEffect } from 'react'
import { useUserProfile, UserRole } from '../context/UserProfileContext'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/firebase'


interface UserData {
  uid: string
  email: string
  displayName: string
  role: UserRole
  isActive: boolean
  createdAt: Date
}

export default function UserManagementPage() {
  const { userProfile, updateUserRole, hasPermission } = useUserProfile()
  const [users, setUsers] = useState<UserData[]>([])
  const [_loading, setLoading] = useState(true)


  useEffect(() => {
    if (userProfile && hasPermission(UserRole.ADMIN)) {
      loadUsers()
    }
  }, [userProfile])

  const loadUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'))
      const usersData: UserData[] = []
      usersSnapshot.forEach((doc) => {
        const data = doc.data()
        usersData.push({
          uid: doc.id,
          email: data.email,
          displayName: data.displayName,
          role: data.role,
          isActive: data.isActive,
          createdAt: data.createdAt?.toDate()
        })
      })
      setUsers(usersData)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateUserRole(userId, newRole)
      // Update local state
      setUsers(users.map(user =>
        user.uid === userId ? { ...user, role: newRole } : user
      ))
    } catch (error) {
      console.error('Error updating user role:', error)
    }
  }

  if (!hasPermission(UserRole.ADMIN)) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg font-light">
          Access denied. Admin privileges required.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-light text-gray-900 tracking-wide mb-2">USER MANAGEMENT</h3>
        <p className="text-sm text-gray-500 font-light">Manage user roles and permissions</p>
      </div>

      {/* Users Table/Cards */}
      <div className="bg-white border border-gray-200 rounded-lg">
        {/* Mobile Card View */}
        <div className="sm:hidden space-y-3 p-4">
          {users.map((user) => (
            <div key={user.uid} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-light text-gray-900 text-sm mb-1">
                    {user.displayName}
                  </div>
                  <div className="text-xs text-gray-500 font-light break-all">
                    {user.email}
                  </div>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-light rounded-full flex-shrink-0 ml-2 ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-800' :
                  user.role === UserRole.MANAGER ? 'bg-blue-100 text-blue-800' :
                    user.role === UserRole.STAFF ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                  }`}>
                  {user.role}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-3">
                <div>
                  <span className="font-medium">Joined:</span>
                  <div className="font-light">{user.createdAt?.toLocaleDateString()}</div>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <div className="font-light">{user.isActive ? 'Active' : 'Inactive'}</div>
                </div>
              </div>

              <select
                value={user.role}
                onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                disabled={user.uid === userProfile?.uid}
              >
                <option value={UserRole.VIEWER}>Viewer</option>
                <option value={UserRole.STAFF}>Staff</option>
                <option value={UserRole.MANAGER}>Manager</option>
                <option value={UserRole.ADMIN}>Admin</option>
              </select>

              {user.uid === userProfile?.uid && (
                <div className="text-xs text-gray-500 mt-2 font-light text-center">
                  Cannot change your own role
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.uid} className="hover:bg-gray-50">
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-light text-gray-900">
                      {user.displayName}
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-light">
                    {user.email}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-3 py-1 text-xs font-light rounded-full ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-800' :
                      user.role === UserRole.MANAGER ? 'bg-blue-100 text-blue-800' :
                        user.role === UserRole.STAFF ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                      }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-light rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-light">
                    {user.createdAt?.toLocaleDateString()}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                      className="text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                      disabled={user.uid === userProfile?.uid}
                    >
                      <option value={UserRole.VIEWER}>Viewer</option>
                      <option value={UserRole.STAFF}>Staff</option>
                      <option value={UserRole.MANAGER}>Manager</option>
                      <option value={UserRole.ADMIN}>Admin</option>
                    </select>
                    {user.uid === userProfile?.uid && (
                      <div className="text-xs text-gray-500 mt-1 font-light">
                        Your account
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {users.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <div className="text-gray-400 text-sm font-light">
              No users found
            </div>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-light text-gray-900 mb-3 text-sm tracking-wide">USER SUMMARY</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-light text-gray-900">{users.length}</div>
            <div className="text-xs text-gray-500 font-light">Total Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-light text-purple-600">
              {users.filter(u => u.role === UserRole.ADMIN).length}
            </div>
            <div className="text-xs text-gray-500 font-light">Admins</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-light text-blue-600">
              {users.filter(u => u.role === UserRole.MANAGER).length}
            </div>
            <div className="text-xs text-gray-500 font-light">Managers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-light text-green-600">
              {users.filter(u => u.isActive).length}
            </div>
            <div className="text-xs text-gray-500 font-light">Active</div>
          </div>
        </div>
      </div>
    </div>
  )
}