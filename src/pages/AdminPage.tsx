import { useState } from 'react'
import { useInvitation } from '../context/InvitationContext'
import UserManagementPage from './UserManagementPage'
import WebManagementPage from '../components/admin/tabs/admin_tab/WebManagementPage'

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
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
                {/* Header */}
                <div className="mb-4 sm:mb-6 lg:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-light text-gray-900 tracking-wide">Admin Panel</h1>
                    <p className="text-sm sm:text-base text-gray-500 font-light mt-1 sm:mt-2">Manage invitation codes, users, and website settings</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg">
                    {/* Navigation Tabs - Mobile optimized */}
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-2 sm:space-x-4 lg:space-x-8 px-3 sm:px-4 lg:px-6 overflow-x-auto">
                            {[
                                { id: 'invitations', name: 'INVITATIONS' },
                                { id: 'users', name: 'USERS' },
                                { id: 'web', name: 'WEB' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                    className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-light text-xs sm:text-sm tracking-wide whitespace-nowrap flex-shrink-0 ${activeTab === tab.id
                                        ? 'border-gray-900 text-gray-900'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    {tab.name}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-3 sm:p-4 lg:p-6">
                        {activeTab === 'invitations' && (
                            <div className="space-y-4 sm:space-y-6">
                                {/* Generate New Code */}
                                <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                                    <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">GENERATE NEW CODE</h3>
                                    <div className="space-y-4 sm:space-y-0 sm:flex sm:flex-row sm:gap-4 sm:items-end">
                                        <div className="flex-1">
                                            <label className="block text-sm font-light text-gray-700 mb-2">
                                                Maximum Uses
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={maxUses}
                                                onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light text-sm sm:text-base"
                                            />
                                        </div>
                                        <button
                                            onClick={handleGenerateCode}
                                            disabled={loading}
                                            className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-light text-sm sm:text-base ${loading
                                                ? 'bg-gray-400 cursor-not-allowed text-white'
                                                : 'bg-gray-900 hover:bg-gray-800 text-white'
                                                }`}
                                        >
                                            {loading ? 'GENERATING...' : 'GENERATE CODE'}
                                        </button>
                                    </div>

                                    {generatedCode && (
                                        <div className="mt-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                                            <p className="text-green-800 font-light text-sm sm:text-base">
                                                <strong>Generated Code:</strong>{' '}
                                                <span className="font-mono bg-green-100 px-2 py-1 rounded text-sm break-all">
                                                    {generatedCode}
                                                </span>
                                            </p>
                                            <p className="text-xs sm:text-sm text-green-700 mt-2 font-light">
                                                Share this code with users who want to register. Maximum uses: {maxUses}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Existing Codes */}
                                <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                                    <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">EXISTING CODES</h3>
                                    <div className="overflow-x-auto -mx-2 sm:mx-0">
                                        <div className="min-w-full inline-block align-middle">
                                            {/* Mobile Card View */}
                                            <div className="sm:hidden space-y-3">
                                                {invitationCodes.map((code) => (
                                                    <div key={code.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="font-mono text-sm text-gray-900 break-all">
                                                                {code.code}
                                                            </div>
                                                            <span className={`inline-flex px-2 py-1 text-xs font-light rounded-full flex-shrink-0 ml-2 ${code.used || code.currentUses >= code.maxUses
                                                                ? 'bg-red-100 text-red-800'
                                                                : 'bg-green-100 text-green-800'
                                                                }`}>
                                                                {code.used || code.currentUses >= code.maxUses ? 'Used' : 'Active'}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                                            <div>
                                                                <span className="font-medium">Uses:</span>{' '}
                                                                {code.currentUses} / {code.maxUses}
                                                            </div>
                                                            <div>
                                                                <span className="font-medium">Created:</span>{' '}
                                                                {code.createdAt?.toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Desktop Table View */}
                                            <table className="min-w-full divide-y divide-gray-200 hidden sm:table">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                                                            Code
                                                        </th>
                                                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                                                            Uses
                                                        </th>
                                                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                                                            Status
                                                        </th>
                                                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                                                            Created
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {invitationCodes.map((code) => (
                                                        <tr key={code.id} className="hover:bg-gray-50">
                                                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                                                                {code.code}
                                                            </td>
                                                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-light">
                                                                {code.currentUses} / {code.maxUses}
                                                            </td>
                                                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                                                <span className={`inline-flex px-3 py-1 text-xs font-light rounded-full ${code.used || code.currentUses >= code.maxUses
                                                                    ? 'bg-red-100 text-red-800'
                                                                    : 'bg-green-100 text-green-800'
                                                                    }`}>
                                                                    {code.used || code.currentUses >= code.maxUses ? 'Used' : 'Active'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-light">
                                                                {code.createdAt?.toLocaleDateString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'users' && <UserManagementPage />}
                        {activeTab === 'web' && <WebManagementPage />}
                    </div>
                </div>
            </div>
        </div>
    )
}