import { useState, useEffect } from 'react'
import { collection, doc, getDocs, updateDoc, addDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase/firebase'

interface WebsiteContent {
    id?: string
    title: string
    content: string
    section: string
    lastUpdated: Date
}

interface SiteSettings {
    id?: string
    siteTitle: string
    siteDescription: string
    maintenanceMode: boolean
    contactEmail: string
}

// Helper type for Firestore data
type FirestoreData = {
    [key: string]: any
}

export default function WebManagementPage() {
    const [activeSection, setActiveSection] = useState<'content' | 'settings' | 'analytics'>('content')
    const [websiteContent, setWebsiteContent] = useState<WebsiteContent[]>([])
    const [siteSettings, setSiteSettings] = useState<SiteSettings>({
        siteTitle: 'My Sports League',
        siteDescription: 'Welcome to our sports league management system',
        maintenanceMode: false,
        contactEmail: ''
    })
    const [editingContent, setEditingContent] = useState<WebsiteContent | null>(null)
    const [loading, setLoading] = useState(false)

    // Fetch website content and settings
    useEffect(() => {
        fetchWebsiteContent()
        fetchSiteSettings()
    }, [])

    const fetchWebsiteContent = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'websiteContent'))
            const content: WebsiteContent[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as WebsiteContent))
            setWebsiteContent(content)
        } catch (error) {
            console.error('Error fetching website content:', error)
        }
    }

    const fetchSiteSettings = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'siteSettings'))
            if (!snapshot.empty) {
                const docData = snapshot.docs[0].data()
                const settings: SiteSettings = {
                    id: snapshot.docs[0].id,
                    siteTitle: docData.siteTitle || '',
                    siteDescription: docData.siteDescription || '',
                    maintenanceMode: docData.maintenanceMode || false,
                    contactEmail: docData.contactEmail || ''
                }
                setSiteSettings(settings)
            }
        } catch (error) {
            console.error('Error fetching site settings:', error)
        }
    }

    const saveContent = async (content: WebsiteContent) => {
        setLoading(true)
        try {
            const contentData: FirestoreData = {
                title: content.title,
                content: content.content,
                section: content.section,
                lastUpdated: new Date()
            }

            if (content.id) {
                // Update existing content
                await updateDoc(doc(db, 'websiteContent', content.id), contentData)
            } else {
                // Create new content
                await addDoc(collection(db, 'websiteContent'), contentData)
            }
            await fetchWebsiteContent()
            setEditingContent(null)
        } catch (error) {
            console.error('Error saving content:', error)
        } finally {
            setLoading(false)
        }
    }

    const saveSiteSettings = async () => {
        setLoading(true)
        try {
            const settingsData: FirestoreData = {
                siteTitle: siteSettings.siteTitle,
                siteDescription: siteSettings.siteDescription,
                maintenanceMode: siteSettings.maintenanceMode,
                contactEmail: siteSettings.contactEmail
            }

            if (siteSettings.id) {
                await updateDoc(doc(db, 'siteSettings', siteSettings.id), settingsData)
            } else {
                await addDoc(collection(db, 'siteSettings'), settingsData)
            }
            alert('Site settings saved successfully!')
        } catch (error) {
            console.error('Error saving site settings:', error)
        } finally {
            setLoading(false)
        }
    }

    const deleteContent = async (id: string) => {
        if (confirm('Are you sure you want to delete this content?')) {
            try {
                await deleteDoc(doc(db, 'websiteContent', id))
                await fetchWebsiteContent()
            } catch (error) {
                console.error('Error deleting content:', error)
            }
        }
    }

    return (
        <div className="space-y-6">
            {/* Section Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {['content', 'settings', 'analytics'].map((section) => (
                        <button
                            key={section}
                            onClick={() => setActiveSection(section as any)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize ${activeSection === section
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {section}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Management */}
            {activeSection === 'content' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold">Website Content</h2>
                        <button
                            onClick={() => setEditingContent({
                                title: '',
                                content: '',
                                section: 'home',
                                lastUpdated: new Date()
                            })}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                            Add New Content
                        </button>
                    </div>

                    {editingContent ? (
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-medium mb-4">
                                {editingContent.id ? 'Edit Content' : 'Add New Content'}
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        value={editingContent.title}
                                        onChange={(e) => setEditingContent({ ...editingContent, title: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Section
                                    </label>
                                    <select
                                        value={editingContent.section}
                                        onChange={(e) => setEditingContent({ ...editingContent, section: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="home">Homepage</option>
                                        <option value="about">About</option>
                                        <option value="rules">Rules</option>
                                        <option value="contact">Contact</option>
                                        <option value="news">News</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Content
                                    </label>
                                    <textarea
                                        value={editingContent.content}
                                        onChange={(e) => setEditingContent({ ...editingContent, content: e.target.value })}
                                        rows={10}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => saveContent(editingContent)}
                                        disabled={loading}
                                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {loading ? 'Saving...' : 'Save Content'}
                                    </button>
                                    <button
                                        onClick={() => setEditingContent(null)}
                                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Title
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Section
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Last Updated
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {websiteContent.map((content) => (
                                            <tr key={content.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    {content.title}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">
                                                    {content.section}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {content.lastUpdated?.toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                                    <button
                                                        onClick={() => setEditingContent(content)}
                                                        className="text-blue-600 hover:text-blue-900"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => deleteContent(content.id!)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Site Settings */}
            {activeSection === 'settings' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold mb-4">Site Settings</h2>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Site Title
                            </label>
                            <input
                                type="text"
                                value={siteSettings.siteTitle}
                                onChange={(e) => setSiteSettings({ ...siteSettings, siteTitle: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Site Description
                            </label>
                            <textarea
                                value={siteSettings.siteDescription}
                                onChange={(e) => setSiteSettings({ ...siteSettings, siteDescription: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Contact Email
                            </label>
                            <input
                                type="email"
                                value={siteSettings.contactEmail}
                                onChange={(e) => setSiteSettings({ ...siteSettings, contactEmail: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="maintenanceMode"
                                checked={siteSettings.maintenanceMode}
                                onChange={(e) => setSiteSettings({ ...siteSettings, maintenanceMode: e.target.checked })}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="maintenanceMode" className="ml-2 block text-sm text-gray-700">
                                Enable Maintenance Mode
                            </label>
                        </div>
                        <button
                            onClick={saveSiteSettings}
                            disabled={loading}
                            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </div>
            )}

            {/* Analytics */}
            {activeSection === 'analytics' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold mb-4">Website Analytics</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gray-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-blue-600">{websiteContent.length}</div>
                            <div className="text-sm text-gray-600">Content Pages</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {websiteContent.filter(c => c.section === 'home').length}
                            </div>
                            <div className="text-sm text-gray-600">Homepage Sections</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-purple-600">
                                {new Set(websiteContent.map(c => c.section)).size}
                            </div>
                            <div className="text-sm text-gray-600">Active Sections</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}