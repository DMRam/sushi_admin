// Update your AdminPage to include tabs for different admin functions
import { useState } from 'react'
import { useInvitation } from '../context/InvitationContext'
import UserManagementPage from './UserManagementPage'
import WebManagementPage from '../components/WebManagementPage'

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<'invitations' | 'users' | 'web'>('invitations')
    const { invitationCodes, createInvitationCode } = useInvitation()
    const [maxUses, setMaxUses] = useState(1)
    const [loading, setLoading] = useState(false)
    const [generatedCode, setGeneratedCode] = useState('')

    const handleGenerateCode = async () => {
        setLoading(true)
        try {
            const code = await createInvitationCode(maxUses)
            setGeneratedCode(code)
        } catch (error) {
            console.error('Error generating code:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Panel</h1>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('invitations')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'invitations'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Invitation Codes
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'users'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        User Management
                    </button>
                    <button
                        onClick={() => setActiveTab('web')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'web'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Web
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'invitations' && (
                <div className="space-y-6">
                    {/* Generate New Code */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-semibold mb-4">Generate New Invitation Code</h2>
                        <div className="flex flex-col sm:flex-row gap-4 items-end">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Maximum Uses
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={maxUses}
                                    onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <button
                                onClick={handleGenerateCode}
                                disabled={loading}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? 'Generating...' : 'Generate Code'}
                            </button>
                        </div>

                        {generatedCode && (
                            <div className="mt-4 p-3 bg-green-100 border border-green-400 rounded">
                                <p className="text-green-700">
                                    <strong>Generated Code:</strong> {generatedCode}
                                </p>
                                <p className="text-sm text-green-600 mt-1">
                                    Share this code with users who want to register. Maximum uses: {maxUses}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Existing Codes */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-semibold mb-4">Existing Invitation Codes</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Code
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Uses
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Created
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {invitationCodes.map((code) => (
                                        <tr key={code.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                                                {code.code}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {code.currentUses} / {code.maxUses}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${code.used || code.currentUses >= code.maxUses
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {code.used || code.currentUses >= code.maxUses ? 'Used' : 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {code.createdAt?.toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'users' && <UserManagementPage />}
            {activeTab === 'web' && <WebManagementPage />}
        </div>
    )
}