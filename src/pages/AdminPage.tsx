import { useMemo, useState } from 'react'
import { useInvitation } from '../context/InvitationContext'
import UserManagementPage from './UserManagementPage'
import WebManagementPage from '../components/admin/tabs/admin_tab/WebManagementPage'

type AdminTab = 'invitations' | 'users' | 'web'

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<AdminTab>('invitations')
    const { invitationCodes, createInvitationCode } = useInvitation()
    const [maxUses, setMaxUses] = useState(1)
    const [loading, setLoading] = useState(false)
    const [generatedCode, setGeneratedCode] = useState('')

    const tabs = useMemo(
        () => [
            { id: 'invitations' as const, name: 'Invitations' },
            { id: 'users' as const, name: 'Users' },
            { id: 'web' as const, name: 'Web' }
        ],
        []
    )

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

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
        } catch (e) {
            console.error('Clipboard error:', e)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
                {/* Header */}
                <div className="mb-4 sm:mb-6 lg:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-light text-gray-900 tracking-wide">Admin Panel</h1>
                    <p className="text-sm sm:text-base text-gray-500 font-light mt-1 sm:mt-2">
                        Manage invitation codes, users, and website settings
                    </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    {/* Tabs */}
                    <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
                        <div className="px-3 sm:px-4 lg:px-6 py-2">
                            <nav className="flex gap-2 sm:gap-3 overflow-x-auto">
                                {tabs.map((tab) => {
                                    const active = activeTab === tab.id
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={[
                                                'px-3 sm:px-4 py-2 rounded-full text-sm whitespace-nowrap transition flex-shrink-0',
                                                active
                                                    ? 'bg-gray-900 text-white shadow-sm'
                                                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                                            ].join(' ')}
                                        >
                                            {tab.name}
                                        </button>
                                    )
                                })}
                            </nav>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-3 sm:p-4 lg:p-6">
                        {activeTab === 'invitations' && (
                            <div className="space-y-4 sm:space-y-6">
                                {/* Generate */}
                                <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                        <div>
                                            <h3 className="text-lg font-light text-gray-900 tracking-wide">Generate New Code</h3>
                                            <p className="text-sm text-gray-500 font-light mt-1">
                                                Create invitation codes for new users to register.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
                                        <div className="sm:col-span-7">
                                            <label className="block text-xs text-gray-500 font-light mb-1">Maximum Uses</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={maxUses}
                                                onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900/10 font-light"
                                            />
                                            <p className="text-xs text-gray-400 font-light mt-1">
                                                Example: 1 = single use, 10 = can be used by 10 people.
                                            </p>
                                        </div>

                                        <div className="sm:col-span-5 flex items-end">
                                            <button
                                                onClick={handleGenerateCode}
                                                disabled={loading}
                                                className={[
                                                    'w-full px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900/20 transition font-light',
                                                    loading
                                                        ? 'bg-gray-300 cursor-not-allowed text-white'
                                                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                                                ].join(' ')}
                                            >
                                                {loading ? 'Generating…' : 'Generate Code'}
                                            </button>
                                        </div>
                                    </div>

                                    {generatedCode && (
                                        <div className="mt-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-xl">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-green-800 font-light text-sm sm:text-base">
                                                        <span className="font-medium">Generated Code:</span>{' '}
                                                        <span className="font-mono bg-green-100 px-2 py-1 rounded text-sm break-all">
                                                            {generatedCode}
                                                        </span>
                                                    </p>
                                                    <p className="text-xs sm:text-sm text-green-700 mt-1 font-light">
                                                        Share this code with users. Maximum uses: {maxUses}
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard(generatedCode)}
                                                    className="px-3 py-2 rounded-md border border-green-200 bg-white hover:bg-green-100 text-sm font-light"
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Existing */}
                                <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="text-lg font-light text-gray-900 tracking-wide">Existing Codes</h3>
                                            <p className="text-sm text-gray-500 font-light mt-1">
                                                Active codes can still be used until they hit their limit.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Mobile cards */}
                                    <div className="sm:hidden mt-4 space-y-3">
                                        {invitationCodes.map((code) => {
                                            const inactive = code.used || code.currentUses >= code.maxUses
                                            return (
                                                <div key={code.id} className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                                                    <div className="flex justify-between items-start gap-2 mb-2">
                                                        <div className="font-mono text-sm text-gray-900 break-all">{code.code}</div>
                                                        <span
                                                            className={[
                                                                'inline-flex px-2 py-1 text-xs font-light rounded-full border flex-shrink-0',
                                                                inactive
                                                                    ? 'bg-red-50 text-red-700 border-red-200'
                                                                    : 'bg-green-50 text-green-700 border-green-200'
                                                            ].join(' ')}
                                                        >
                                                            {inactive ? 'Used' : 'Active'}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                                        <div>
                                                            <span className="text-gray-500">Uses</span>
                                                            <div className="font-light">
                                                                {code.currentUses} / {code.maxUses}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500">Created</span>
                                                            <div className="font-light">{code.createdAt?.toLocaleDateString?.() ?? ''}</div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(code.code)}
                                                            className="flex-1 px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-100 text-sm font-light"
                                                        >
                                                            Copy
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Desktop table */}
                                    <div className="hidden sm:block mt-4 overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                                                        Code
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                                                        Uses
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                                                        Created
                                                    </th>
                                                    <th className="px-6 py-3 text-right text-xs font-light text-gray-500 uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {invitationCodes.map((code) => {
                                                    const inactive = code.used || code.currentUses >= code.maxUses
                                                    return (
                                                        <tr key={code.id} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                                                                {code.code}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-light">
                                                                {code.currentUses} / {code.maxUses}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span
                                                                    className={[
                                                                        'inline-flex px-2.5 py-1 text-xs font-light rounded-full border',
                                                                        inactive
                                                                            ? 'bg-red-50 text-red-700 border-red-200'
                                                                            : 'bg-green-50 text-green-700 border-green-200'
                                                                    ].join(' ')}
                                                                >
                                                                    {inactive ? 'Used' : 'Active'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-light">
                                                                {code.createdAt?.toLocaleDateString?.() ?? ''}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => copyToClipboard(code.code)}
                                                                    className="px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-100 text-sm font-light"
                                                                >
                                                                    Copy
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {invitationCodes.length === 0 && (
                                        <div className="text-center py-8 text-sm text-gray-500 font-light">
                                            No invitation codes found.
                                        </div>
                                    )}
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
