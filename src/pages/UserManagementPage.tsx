import { useEffect, useMemo, useState } from 'react'
import { useUserProfile, UserRole } from '../context/UserProfileContext'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/firebase'
import { getFunctions, httpsCallable } from 'firebase/functions'

interface UserData {
  uid: string
  email: string
  displayName: string
  role: UserRole
  isActive: boolean
  createdAt: Date
}

type StatusFilter = 'all' | 'active' | 'inactive'
type SortBy = 'createdAt' | 'name'
type SortDir = 'asc' | 'desc'

export default function UserManagementPage() {
  const { userProfile, updateUserRole, hasPermission } = useUserProfile()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

  // Toolbar state
  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    if (userProfile && hasPermission(UserRole.ADMIN)) {
      loadUsers()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'))
      const usersData: UserData[] = []
      usersSnapshot.forEach((d) => {
        const data: any = d.data()
        usersData.push({
          uid: d.id,
          email: data.email ?? '',
          displayName: data.displayName ?? '',
          role: data.role ?? UserRole.VIEWER,
          isActive: data.isActive ?? true,
          createdAt: data.createdAt?.toDate?.() ?? new Date(0)
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
      setUsers((prev) => prev.map((u) => (u.uid === userId ? { ...u, role: newRole } : u)))
    } catch (error) {
      console.error('Error updating user role:', error)
    }
  }

  const toggleActive = async (uid: string, next: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isActive: next })
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, isActive: next } : u)))
    } catch (error) {
      console.error('Error toggling active:', error)
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!window.confirm(`Are you sure you want to delete user ${userEmail}?`)) {
      return
    }

    setDeletingUserId(userId)
    try {
      // Make sure to get functions with the current auth context
      const functions = getFunctions()
      // Optional: explicitly set region if needed
      // const functions = getFunctions(undefined, 'us-central1')

      const deleteUserFn = httpsCallable(functions, 'adminDeleteUser')

      const result = await deleteUserFn({
        uid: userId,
        hardDeleteDoc: false
      })

      console.log('Delete result:', result.data)
      setUsers(prev => prev.filter(u => u.uid !== userId))
      alert('User deleted successfully')
    } catch (error: any) {
      console.error('Error deleting user:', error)

      // Better error message
      if (error.code === 'permission-denied') {
        alert('You do not have permission to delete users. Make sure you are logged in as an admin.')
      } else if (error.code === 'unauthenticated') {
        alert('You must be logged in to delete users.')
      } else {
        alert(`Failed to delete user: ${error.message || 'Unknown error'}`)
      }
    } finally {
      setDeletingUserId(null)
    }
  }

  const filteredUsers = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return users
      .filter((u) => {
        const hay = `${u.displayName ?? ''} ${u.email ?? ''}`.toLowerCase()
        const matchesQ = !qq || hay.includes(qq)
        const matchesRole = roleFilter === 'all' || u.role === roleFilter
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' ? u.isActive : !u.isActive)
        return matchesQ && matchesRole && matchesStatus
      })
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1
        if (sortBy === 'name') {
          return (a.displayName || '').localeCompare(b.displayName || '') * dir
        }
        const da = a.createdAt ? a.createdAt.getTime() : 0
        const dbb = b.createdAt ? b.createdAt.getTime() : 0
        return (da - dbb) * dir
      })
  }, [users, q, roleFilter, statusFilter, sortBy, sortDir])

  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((u) => u.role === UserRole.ADMIN).length,
      managers: users.filter((u) => u.role === UserRole.MANAGER).length,
      active: users.filter((u) => u.isActive).length
    }
  }, [users])

  if (!hasPermission(UserRole.ADMIN)) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl font-light">
          Access denied. Admin privileges required.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-light text-gray-900 tracking-wide">User Management</h3>
          <p className="text-sm text-gray-500 font-light mt-1">
            Search, filter, and manage roles + active status.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadUsers}
            className="px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm font-light"
          >
            Refresh
          </button>

          {/* Placeholder: real create/delete should be Cloud Function (admin) */}
          <button
            type="button"
            onClick={() => alert('Create user should be done via invitation flow or admin Cloud Function.')}
            className="px-3 py-2 rounded-md bg-gray-900 hover:bg-gray-800 text-white text-sm font-light"
          >
            + New User
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 sm:p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-5">
            <label className="block text-xs text-gray-500 font-light mb-1">Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs text-gray-500 font-light mb-1">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white"
            >
              <option value="all">All</option>
              <option value={UserRole.ADMIN}>Admin</option>
              <option value={UserRole.MANAGER}>Manager</option>
              <option value={UserRole.STAFF}>Staff</option>
              <option value={UserRole.VIEWER}>Viewer</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs text-gray-500 font-light mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs text-gray-500 font-light mb-1">Sort</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white"
            >
              <option value="createdAt">Created</option>
              <option value="name">Name</option>
            </select>
          </div>

          <div className="lg:col-span-1 flex items-end">
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm"
              title="Toggle sort direction"
            >
              {sortDir === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-500 font-light">
          Showing <span className="text-gray-900">{filteredUsers.length}</span> of{' '}
          <span className="text-gray-900">{users.length}</span> users
        </div>
      </div>

      {/* Users */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-light text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500 font-light">
                    Loading users…
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500 font-light">
                    No users match your filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isMe = user.uid === userProfile?.uid
                  return (
                    <tr key={user.uid} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-light text-gray-900">{user.displayName || '—'}</div>
                        <div className="text-xs text-gray-400 font-light">{user.uid}</div>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600 font-light">{user.email}</td>

                      <td className="px-6 py-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                          className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 font-light disabled:bg-gray-50"
                          disabled={isMe}
                        >
                          <option value={UserRole.VIEWER}>Viewer</option>
                          <option value={UserRole.STAFF}>Staff</option>
                          <option value={UserRole.MANAGER}>Manager</option>
                          <option value={UserRole.ADMIN}>Admin</option>
                        </select>
                        {isMe && <div className="text-xs text-gray-400 mt-1">Your account</div>}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={[
                            'inline-flex px-2.5 py-1 text-xs font-light rounded-full border',
                            user.isActive
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          ].join(' ')}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-500 font-light">
                        {user.createdAt?.toLocaleDateString?.() ?? '—'}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => toggleActive(user.uid, !user.isActive)}
                            className="px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm font-light disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                            disabled={isMe}
                            title={isMe ? "You can't disable yourself" : 'Toggle active status'}
                          >
                            {user.isActive ? 'Disable' : 'Enable'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.uid, user.email)}
                            className="px-3 py-2 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-light disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                            disabled={isMe || deletingUserId === user.uid}
                          >
                            {deletingUserId === user.uid ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden p-3 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-sm text-gray-500 font-light">Loading users…</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500 font-light">
              No users match your filters.
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isMe = user.uid === userProfile?.uid
              return (
                <div key={user.uid} className="border border-gray-200 rounded-xl p-4 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-gray-900 font-light truncate">
                        {user.displayName || '—'}
                      </div>
                      <div className="text-xs text-gray-500 font-light break-all">{user.email}</div>
                    </div>

                    <span
                      className={[
                        'inline-flex px-2 py-1 text-xs font-light rounded-full border flex-shrink-0',
                        user.isActive
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      ].join(' ')}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-600">
                    <div>
                      <div className="text-gray-500">Joined</div>
                      <div className="font-light">{user.createdAt?.toLocaleDateString?.() ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Role</div>
                      <div className="font-light">{user.role}</div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                      className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 bg-white font-light disabled:bg-gray-50"
                      disabled={isMe}
                    >
                      <option value={UserRole.VIEWER}>Viewer</option>
                      <option value={UserRole.STAFF}>Staff</option>
                      <option value={UserRole.MANAGER}>Manager</option>
                      <option value={UserRole.ADMIN}>Admin</option>
                    </select>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleActive(user.uid, !user.isActive)}
                        className="flex-1 px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm font-light disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                        disabled={isMe}
                      >
                        {user.isActive ? 'Disable' : 'Enable'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteUser(user.uid, user.email)}
                        className="px-3 py-2 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-light disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                        disabled={isMe || deletingUserId === user.uid}
                      >
                        {deletingUserId === user.uid ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>

                    {isMe && (
                      <div className="text-xs text-gray-400 font-light text-center">
                        You can’t change/disable your own account
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <h4 className="text-sm font-light text-gray-900 tracking-wide mb-3">User Summary</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-light text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500 font-light">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-light text-purple-600">{stats.admins}</div>
            <div className="text-xs text-gray-500 font-light">Admins</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-light text-blue-600">{stats.managers}</div>
            <div className="text-xs text-gray-500 font-light">Managers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-light text-green-600">{stats.active}</div>
            <div className="text-xs text-gray-500 font-light">Active</div>
          </div>
        </div>
      </div>
    </div>
  )
}