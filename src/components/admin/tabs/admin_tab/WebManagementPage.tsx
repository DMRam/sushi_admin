import { useState, useEffect } from 'react'
import { collection, doc, getDocs, updateDoc, addDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../../../firebase/firebase'
import type { WebProduct } from '../../../../types/types'

interface PageContent {
    id?: string
    pageId: string // unique identifier for the page
    title: string
    description?: string
    content: string
    lastUpdated: Date
    isActive: boolean
}

interface SiteConfig {
    id?: string
    siteTitle: string
    siteDescription: string
    maintenanceMode: boolean
    contactEmail: string
}

type FirestoreData = {
    [key: string]: any
}

const PREDEFINED_PAGES = [
    { id: 'landing', name: 'Landing Page', description: 'Main homepage content' },
    { id: 'about', name: 'About Us', description: 'About page content' },
    { id: 'contact', name: 'Contact', description: 'Contact information' },
    { id: 'products', name: 'Products', description: 'Products listing page' }
] as const


export default function WebManagementPage() {
    const [activeSection, setActiveSection] = useState<'pages' | 'products' | 'settings'>('pages')
    const [pages, setPages] = useState<PageContent[]>([])
    const [products, setProducts] = useState<WebProduct[]>([])
    const [siteConfig, setSiteConfig] = useState<SiteConfig>({
        siteTitle: 'My Sports League',
        siteDescription: 'Welcome to our sports league management system',
        maintenanceMode: false,
        contactEmail: ''
    })
    const [editingPage, setEditingPage] = useState<PageContent | null>(null)
    const [editingProduct, setEditingProduct] = useState<WebProduct | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchAllData()
    }, [])

    const fetchAllData = async () => {
        try {
            setError(null)
            await Promise.all([
                fetchPages(),
                fetchProducts(),
                fetchSiteConfig()
            ])
        } catch (err) {
            setError('Failed to load data')
            console.error('Error fetching data:', err)
        }
    }

    const fetchPages = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'pages'))
            const pagesData: PageContent[] = []

            // For each predefined page, get its content or create default
            for (const predefinedPage of PREDEFINED_PAGES) {
                const existingPage = snapshot.docs.find(doc => doc.data().pageId === predefinedPage.id)

                if (existingPage) {
                    const data = existingPage.data()
                    pagesData.push({
                        id: existingPage.id,
                        pageId: data.pageId || predefinedPage.id,
                        title: data.title || predefinedPage.name,
                        description: data.description || predefinedPage.description,
                        content: data.content || `Welcome to ${predefinedPage.name}. Edit this content to customize your page.`,
                        lastUpdated: data.lastUpdated?.toDate() || new Date(),
                        isActive: data.isActive !== undefined ? data.isActive : true
                    } as PageContent)
                } else {
                    // Create default page content if it doesn't exist
                    const defaultPage: PageContent = {
                        pageId: predefinedPage.id,
                        title: predefinedPage.name,
                        description: predefinedPage.description,
                        content: `Welcome to ${predefinedPage.name}. Edit this content to customize your page.`,
                        lastUpdated: new Date(),
                        isActive: true
                    }
                    pagesData.push(defaultPage)
                }
            }

            setPages(pagesData)
        } catch (error) {
            console.error('Error fetching pages:', error)
            throw error
        }
    }

    const fetchProducts = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'products'))
            const productsData: WebProduct[] = snapshot.docs.map(doc => {
                const data = doc.data()

                return {
                    id: doc.id,
                    name: data.name || 'Unnamed Product',
                    description: data.description || '',
                    price: typeof data.sellingPrice === 'number' ? data.sellingPrice :
                        typeof data.price === 'number' ? data.price : 0, // Fallback to price if sellingPrice doesn't exist
                    imageUrl: data.imageUrls?.[0] || data.imageUrl || '', // Support both imageUrls and imageUrl
                    category: data.category || 'general',
                    isActive: data.isActive !== undefined ? data.isActive : true,
                    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
                    costPrice: typeof data.costPrice === 'number' ? data.costPrice : 0,
                    sellingPrice: typeof data.sellingPrice === 'number' ? data.sellingPrice : 0,
                    profitMargin: typeof data.profitMargin === 'number' ? data.profitMargin : 0,
                    portionSize: data.portionSize || '',
                    preparationTime: typeof data.preparationTime === 'number' ? data.preparationTime : 0,
                    tags: Array.isArray(data.tags) ? data.tags : [],
                    productType: data.productType || 'directCost',
                    ingredients: Array.isArray(data.ingredients) ? data.ingredients.map((ing: any) => ({
                        id: ing.id || '',
                        name: ing.name || '',
                        quantity: typeof ing.quantity === 'number' ? ing.quantity : 0,
                        unit: ing.unit || ''
                    })) : []
                } as WebProduct
            })

            setProducts(productsData.sort((a, b) => a.sortOrder - b.sortOrder))
        } catch (error) {
            console.error('Error fetching products:', error)
            throw error
        }
    }

    const fetchSiteConfig = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'siteConfig'))
            if (!snapshot.empty) {
                const docData = snapshot.docs[0].data()
                setSiteConfig({
                    id: snapshot.docs[0].id,
                    siteTitle: docData.siteTitle || '',
                    siteDescription: docData.siteDescription || '',
                    maintenanceMode: docData.maintenanceMode || false,
                    contactEmail: docData.contactEmail || ''
                })
            }
        } catch (error) {
            console.error('Error fetching site config:', error)
            throw error
        }
    }

    const savePage = async (page: PageContent) => {
        setLoading(true)
        setError(null)
        try {
            const pageData: FirestoreData = {
                pageId: page.pageId,
                title: page.title,
                description: page.description,
                content: page.content,
                lastUpdated: new Date(),
                isActive: page.isActive
            }

            if (page.id) {
                await updateDoc(doc(db, 'pages', page.id), pageData)
            } else {
                await addDoc(collection(db, 'pages'), pageData)
            }
            await fetchPages()
            setEditingPage(null)
        } catch (error) {
            console.error('Error saving page:', error)
            setError('Failed to save page')
        } finally {
            setLoading(false)
        }
    }

    const saveProduct = async (product: WebProduct) => {
        setLoading(true)
        setError(null)
        try {
            // Prepare product data with proper defaults
            const productData: FirestoreData = {
                name: product.name || '',
                description: product.description || '',
                sellingPrice: typeof product.price === 'number' ? product.price : 0,
                costPrice: typeof product.costPrice === 'number' ? product.costPrice : 0,
                profitMargin: typeof product.profitMargin === 'number' ? product.profitMargin : 0,
                category: product.category || 'general',
                portionSize: product.portionSize || '',
                preparationTime: typeof product.preparationTime === 'number' ? product.preparationTime : 0,
                isActive: product.isActive !== undefined ? product.isActive : true,
                tags: Array.isArray(product.tags) ? product.tags : [],
                productType: product.productType || 'directCost',
                // Ensure ingredients array is properly formatted
                ingredients: Array.isArray(product.ingredients)
                    ? product.ingredients.map(ing => ({
                        id: ing.id || '',
                        name: ing.name || '',
                        quantity: typeof ing.quantity === 'number' ? ing.quantity : 0,
                        unit: ing.unit || ''
                    }))
                    : [],
                imageUrls: product.imageUrl ? [product.imageUrl] : [],
                lastUpdated: new Date().toISOString(),
                sortOrder: typeof product.sortOrder === 'number' ? product.sortOrder : 0
            }

            console.log('Saving product data:', productData)

            if (product.id) {
                await updateDoc(doc(db, 'products', product.id), productData)
                console.log('Product updated successfully')
            } else {
                const docRef = await addDoc(collection(db, 'products'), productData)
                console.log('Product created with ID:', docRef.id)
            }
            await fetchProducts()
            setEditingProduct(null)
        } catch (error) {
            console.error('Error saving product:', error)
            setError('Failed to save product: ' + (error as Error).message)
        } finally {
            setLoading(false)
        }
    }

    const deleteProduct = async (id: string) => {
        if (confirm('Are you sure you want to delete this product?')) {
            setError(null)
            try {
                await deleteDoc(doc(db, 'products', id))
                await fetchProducts()
            } catch (error) {
                console.error('Error deleting product:', error)
                setError('Failed to delete product')
            }
        }
    }

    const saveSiteConfig = async () => {
        setLoading(true)
        setError(null)
        try {
            const configData: FirestoreData = {
                siteTitle: siteConfig.siteTitle,
                siteDescription: siteConfig.siteDescription,
                maintenanceMode: siteConfig.maintenanceMode,
                contactEmail: siteConfig.contactEmail
            }

            if (siteConfig.id) {
                await updateDoc(doc(db, 'siteConfig', siteConfig.id), configData)
            } else {
                await addDoc(collection(db, 'siteConfig'), configData)
            }
            alert('Site configuration saved successfully!')
        } catch (error) {
            console.error('Error saving site config:', error)
            setError('Failed to save site configuration')
        } finally {
            setLoading(false)
        }
    }

    const getPageName = (pageId: string) => {
        return PREDEFINED_PAGES.find(p => p.id === pageId)?.name || pageId
    }

    // Safe price formatter
    const formatPrice = (price: number | undefined): string => {
        if (typeof price !== 'number' || isNaN(price)) {
            return '$0.00'
        }
        return `$${price.toFixed(2)}`
    }

    return (
        <div className="space-y-6">
            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-red-700 text-sm font-light">{error}</div>
                    <button
                        onClick={() => setError(null)}
                        className="text-red-600 hover:text-red-800 text-xs mt-2 font-light"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Header */}
            <div>
                <h3 className="text-lg font-light text-gray-900 tracking-wide mb-2">WEB MANAGEMENT</h3>
                <p className="text-sm text-gray-500 font-light">Manage website content, products, and settings</p>
            </div>

            {/* Section Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
                    {[
                        { id: 'pages', name: 'PAGES' },
                        { id: 'products', name: 'PRODUCTS' },
                        { id: 'settings', name: 'SETTINGS' }
                    ].map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id as any)}
                            className={`py-4 px-1 border-b-2 font-light text-sm tracking-wide whitespace-nowrap flex-shrink-0 ${activeSection === section.id
                                ? 'border-gray-900 text-gray-900'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {section.name}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Pages Management */}
            {activeSection === 'pages' && (
                <div className="space-y-6">
                    {editingPage ? (
                        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                            <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">
                                EDIT {getPageName(editingPage.pageId).toUpperCase()}
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-light text-gray-700 mb-2">
                                        Page Title
                                    </label>
                                    <input
                                        type="text"
                                        value={editingPage.title}
                                        onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-light text-gray-700 mb-2">
                                        Page Description
                                    </label>
                                    <input
                                        type="text"
                                        value={editingPage.description || ''}
                                        onChange={(e) => setEditingPage({ ...editingPage, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-light text-gray-700 mb-2">
                                        Content
                                    </label>
                                    <textarea
                                        value={editingPage.content}
                                        onChange={(e) => setEditingPage({ ...editingPage, content: e.target.value })}
                                        rows={12}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                                        placeholder="Enter your page content here..."
                                    />
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="pageActive"
                                        checked={editingPage.isActive}
                                        onChange={(e) => setEditingPage({ ...editingPage, isActive: e.target.checked })}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="pageActive" className="ml-2 block text-sm text-gray-700 font-light">
                                        Page is active and visible to visitors
                                    </label>
                                </div>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => savePage(editingPage)}
                                        disabled={loading}
                                        className={`px-6 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-light ${loading
                                            ? 'bg-gray-400 cursor-not-allowed text-white'
                                            : 'bg-gray-900 hover:bg-gray-800 text-white'
                                            }`}
                                    >
                                        {loading ? 'SAVING...' : 'SAVE PAGE'}
                                    </button>
                                    <button
                                        onClick={() => setEditingPage(null)}
                                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-light"
                                    >
                                        CANCEL
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                            <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">WEBSITE PAGES</h3>

                            {/* Mobile Card View */}
                            <div className="sm:hidden space-y-3">
                                {pages.map((page) => (
                                    <div key={page.pageId} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="font-light text-gray-900 text-sm mb-1">
                                                    {page.title}
                                                </div>
                                                <div className="text-xs text-gray-500 font-light">
                                                    {getPageName(page.pageId)}
                                                </div>
                                            </div>
                                            <span className={`inline-flex px-2 py-1 text-xs font-light rounded-full ${page.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {page.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-600 mb-3 font-light line-clamp-2">
                                            {page.description}
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => setEditingPage(page)}
                                                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm font-light hover:bg-blue-700"
                                            >
                                                EDIT
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                                                Page
                                            </th>
                                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                                                Title
                                            </th>
                                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                                                Last Updated
                                            </th>
                                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {pages.map((page) => (
                                            <tr key={page.pageId} className="hover:bg-gray-50">
                                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-light text-gray-900">
                                                    {getPageName(page.pageId)}
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-light">
                                                    {page.title}
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex px-3 py-1 text-xs font-light rounded-full ${page.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {page.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-light">
                                                    {page.lastUpdated?.toLocaleDateString()}
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                                                    <button
                                                        onClick={() => setEditingPage(page)}
                                                        className="text-blue-600 hover:text-blue-900 font-light"
                                                    >
                                                        Edit
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

            {/* Products Management */}
            {activeSection === 'products' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-light text-gray-900 tracking-wide">PRODUCTS MANAGEMENT</h3>
                        <button
                            onClick={() => setEditingProduct({
                                name: '',
                                description: '',
                                price: 0,
                                imageUrl: '',
                                category: 'general',
                                isActive: true,
                                sortOrder: products.length,
                                costPrice: 0,
                                sellingPrice: 0,
                                portionSize: '',
                                preparationTime: 0,
                                tags: [],
                                productType: 'directCost',
                                ingredients: []
                            })}
                            className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-light bg-gray-900 hover:bg-gray-800 text-white`}
                        >
                            ADD PRODUCT
                        </button>
                    </div>

                    {editingProduct ? (
                        <ProductForm
                            product={editingProduct}
                            onChange={setEditingProduct}
                            onSave={() => saveProduct(editingProduct)}
                            onCancel={() => setEditingProduct(null)}
                            loading={loading}
                        />
                    ) : (
                        <ProductList
                            products={products}
                            onEdit={setEditingProduct}
                            onDelete={deleteProduct}
                            formatPrice={formatPrice}
                        />
                    )}
                </div>
            )}

            {/* Site Settings */}
            {activeSection === 'settings' && (
                <SiteSettings
                    config={siteConfig}
                    onChange={setSiteConfig}
                    onSave={saveSiteConfig}
                    loading={loading}
                />
            )}
        </div>
    )
}

// Product Form Component
function ProductForm({ product, onChange, onSave, onCancel, loading }: {
    product: WebProduct
    onChange: (product: WebProduct) => void
    onSave: () => void
    onCancel: () => void
    loading: boolean
}) {
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">
                {product.id ? 'EDIT PRODUCT' : 'ADD NEW PRODUCT'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">
                        Product Name
                    </label>
                    <input
                        type="text"
                        value={product.name}
                        onChange={(e) => onChange({ ...product, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                    />
                </div>
                <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">
                        Selling Price ($)
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={product.price}
                        onChange={(e) => onChange({ ...product, price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                    />
                </div>
                <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">
                        Cost Price ($)
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={product.costPrice || 0}
                        onChange={(e) => onChange({ ...product, costPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                    />
                </div>
                <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">
                        Category
                    </label>
                    <input
                        type="text"
                        value={product.category}
                        onChange={(e) => onChange({ ...product, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-light text-gray-700 mb-2">
                        Description
                    </label>
                    <textarea
                        value={product.description}
                        onChange={(e) => onChange({ ...product, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-light text-gray-700 mb-2">
                        Image URL
                    </label>
                    <input
                        type="url"
                        value={product.imageUrl}
                        onChange={(e) => onChange({ ...product, imageUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                        placeholder="https://example.com/image.jpg"
                    />
                </div>
                <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">
                        Portion Size
                    </label>
                    <input
                        type="text"
                        value={product.portionSize || ''}
                        onChange={(e) => onChange({ ...product, portionSize: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                        placeholder="200g bowl"
                    />
                </div>
                <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">
                        Preparation Time (min)
                    </label>
                    <input
                        type="number"
                        min="0"
                        value={product.preparationTime || 0}
                        onChange={(e) => onChange({ ...product, preparationTime: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                    />
                </div>
                <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">
                        Sort Order
                    </label>
                    <input
                        type="number"
                        value={product.sortOrder}
                        onChange={(e) => onChange({ ...product, sortOrder: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                    />
                </div>
                <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">
                        Tags (comma separated)
                    </label>
                    <input
                        type="text"
                        value={product.tags?.join(', ') || ''}
                        onChange={(e) => onChange({ ...product, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                        placeholder="Popular, Spicy, Vegan"
                    />
                </div>
                <div className="md:col-span-2 flex items-center">
                    <input
                        type="checkbox"
                        id="productActive"
                        checked={product.isActive}
                        onChange={(e) => onChange({ ...product, isActive: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="productActive" className="ml-2 block text-sm text-gray-700 font-light">
                        Product is active and visible to customers
                    </label>
                </div>
            </div>
            <div className="flex space-x-3 mt-6">
                <button
                    onClick={onSave}
                    disabled={loading}
                    className={`px-6 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-light ${loading
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                        }`}
                >
                    {loading ? 'SAVING...' : 'SAVE PRODUCT'}
                </button>
                <button
                    onClick={onCancel}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-light"
                >
                    CANCEL
                </button>
            </div>
        </div>
    )
}

// Product List Component
function ProductList({ products, onEdit, onDelete, formatPrice }: {
    products: WebProduct[]
    onEdit: (product: WebProduct) => void
    onDelete: (id: string) => void
    formatPrice: (price: number | undefined) => string
}) {
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            {/* Mobile Card View */}
            <div className="sm:hidden space-y-3">
                {products.map((product) => (
                    <div key={product.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div className="font-light text-gray-900 text-sm mb-1">
                                    {product.name || 'Unnamed Product'}
                                </div>
                                <div className="text-xs text-gray-500 font-light">
                                    {product.category || 'No category'}
                                </div>
                            </div>
                            <span className={`inline-flex px-2 py-1 text-xs font-light rounded-full ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {product.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div className="text-xs text-gray-600 mb-2 font-light line-clamp-2">
                            {product.description || 'No description'}
                        </div>
                        <div className="flex justify-between items-center mb-3">
                            <div className="text-sm font-light text-green-600">
                                {formatPrice(product.price)}
                            </div>
                            <div className="text-xs text-gray-500 font-light">
                                Cost: {formatPrice(product.costPrice)}
                            </div>
                        </div>
                        {product.portionSize && (
                            <div className="text-xs text-gray-500 mb-2 font-light">
                                Portion: {product.portionSize}
                            </div>
                        )}
                        <div className="flex space-x-2">
                            <button
                                onClick={() => onEdit(product)}
                                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm font-light hover:bg-blue-700"
                            >
                                EDIT
                            </button>
                            <button
                                onClick={() => product.id && onDelete(product.id)}
                                className="flex-1 bg-red-600 text-white px-3 py-2 rounded text-sm font-light hover:bg-red-700"
                            >
                                DELETE
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                                Product
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                                Category
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                                Price
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                                Cost
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {products.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-50">
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-light text-gray-900">{product.name || 'Unnamed Product'}</div>
                                    <div className="text-xs text-gray-500 font-light line-clamp-1">
                                        {product.description || 'No description'}
                                    </div>
                                    {product.portionSize && (
                                        <div className="text-xs text-gray-400 font-light">
                                            {product.portionSize}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-light">
                                    {product.category || 'No category'}
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-light text-green-600">
                                    {formatPrice(product.price)}
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-light text-gray-600">
                                    {formatPrice(product.costPrice)}
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-3 py-1 text-xs font-light rounded-full ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {product.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                    <button
                                        onClick={() => onEdit(product)}
                                        className="text-blue-600 hover:text-blue-900 font-light"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => product.id && onDelete(product.id)}
                                        className="text-red-600 hover:text-red-900 font-light"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {products.length === 0 && (
                <div className="text-center py-8">
                    <div className="text-gray-400 text-sm font-light">
                        No products found. Add your first product to get started.
                    </div>
                </div>
            )}
        </div>
    )
}

// Site Settings Component (keep the same as before)
function SiteSettings({ config, onChange, onSave, loading }: {
    config: SiteConfig
    onChange: (config: SiteConfig) => void
    onSave: () => void
    loading: boolean
}) {
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">SITE SETTINGS</h3>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">
                        Site Title
                    </label>
                    <input
                        type="text"
                        value={config.siteTitle}
                        onChange={(e) => onChange({ ...config, siteTitle: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                    />
                </div>
                <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">
                        Site Description
                    </label>
                    <textarea
                        value={config.siteDescription}
                        onChange={(e) => onChange({ ...config, siteDescription: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                    />
                </div>
                <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">
                        Contact Email
                    </label>
                    <input
                        type="email"
                        value={config.contactEmail}
                        onChange={(e) => onChange({ ...config, contactEmail: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                    />
                </div>
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="maintenanceMode"
                        checked={config.maintenanceMode}
                        onChange={(e) => onChange({ ...config, maintenanceMode: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="maintenanceMode" className="ml-2 block text-sm text-gray-700 font-light">
                        Enable Maintenance Mode
                    </label>
                </div>
                <button
                    onClick={onSave}
                    disabled={loading}
                    className={`px-6 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-light ${loading
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                        }`}
                >
                    {loading ? 'SAVING...' : 'SAVE SETTINGS'}
                </button>
            </div>
        </div>
    )
}