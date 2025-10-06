import { useAuth } from '../context/AuthContext'

export default function AuthDebug() {
    const { user, loading } = useAuth()

    return (
        <div className="fixed top-4 right-4 bg-blue-100 border border-blue-400 p-4 rounded-lg shadow-lg max-w-md z-50">
            <h3 className="font-bold mb-2">Auth Debug</h3>
            <div className="text-sm space-y-1">
                <div><strong>User:</strong> {user ? user.email : 'None'}</div>
                <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
                <div><strong>Current Path:</strong> {window.location.pathname}</div>
            </div>
        </div>
    )
}