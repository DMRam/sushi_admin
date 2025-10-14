import  { useState } from 'react'
import { useUserProfile } from '../context/UserProfileContext'

export default function ProfilePage() {
  const { userProfile, updateProfile } = useUserProfile()
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) return

    setLoading(true)
    try {
      await updateProfile({ displayName: displayName.trim() })
      setMessage('Profile updated successfully!')
      setIsEditing(false)
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('Error updating profile')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setDisplayName(userProfile?.displayName || '')
    setIsEditing(false)
    setMessage('')
  }

  if (!userProfile) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">User Profile</h1>
        
        {message && (
          <div className={`mb-4 p-3 rounded ${
            message.includes('Error') 
              ? 'bg-red-100 text-red-700' 
              : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={userProfile.email}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your display name"
              />
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-gray-800">{userProfile.displayName}</span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {isEditing && (
            <div className="flex space-x-3 pt-2">
              <button
                onClick={handleSave}
                disabled={loading || !displayName.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}