import { useEffect, useState } from 'react'
import { collection, doc, getDocs, updateDoc, addDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../../../firebase/firebase'
import type { WebProduct } from '../../../../types/types'
// import PagesManager from './components/PagesManager'
import ProductForm from './components/ProductForm'
import ProductList from './components/ProductList'
// import SiteSettings from './components/SiteSettings'
import type { AdminSection, FirestoreData, PageContent, SiteConfig } from './types'
import { formatPrice, normalizeDate, normalizeDescription } from './hooks'
import { PREDEFINED_PAGES } from './constants'

export default function WebManagementPage() {
    const [productSearch, setProductSearch] = useState('')
    const [activeSection, setActiveSection] = useState<AdminSection>('products')
    const [_pages, setPages] = useState<PageContent[]>([])
    const [products, setProducts] = useState<WebProduct[]>([])
    const [_siteConfig, setSiteConfig] = useState<SiteConfig>({
        siteTitle: '',
        siteDescription: ' ',
        maintenanceMode: false,
        contactEmail: '',
    })
    const [editingProduct, setEditingProduct] = useState<WebProduct | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        void fetchAllData()
    }, [])

    const fetchAllData = async () => {
        try {
            setError(null)
            await Promise.all([fetchPages(), fetchProducts(), fetchSiteConfig()])
        } catch (err) {
            setError('Failed to load data')
            console.error('Error fetching data:', err)
        }
    }

    const fetchPages = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'pages'))
            const pagesData: PageContent[] = []

            for (const predefinedPage of PREDEFINED_PAGES) {
                const existingPage = snapshot.docs.find((d) => d.data().pageId === predefinedPage.id)

                if (existingPage) {
                    const data = existingPage.data()
                    pagesData.push({
                        id: existingPage.id,
                        pageId: data.pageId || predefinedPage.id,
                        title: data.title || predefinedPage.name,
                        description: data.description || predefinedPage.description,
                        content: data.content || `Welcome to ${predefinedPage.name}. Edit this content to customize your page.`,
                        lastUpdated: data.lastUpdated?.toDate() || new Date(),
                        isActive: data.isActive !== undefined ? data.isActive : true,
                    })
                } else {
                    pagesData.push({
                        pageId: predefinedPage.id,
                        title: predefinedPage.name,
                        description: predefinedPage.description,
                        content: `Welcome to ${predefinedPage.name}. Edit this content to customize your page.`,
                        lastUpdated: new Date(),
                        isActive: true,
                    })
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

            const productsData: WebProduct[] = snapshot.docs.map((d) => {
                const data = d.data()

                const price =
                    typeof data.sellingPrice === 'number'
                        ? data.sellingPrice
                        : typeof data.price === 'number'
                            ? data.price
                            : 0

                const imageUrl = data.imageUrls?.[0] || data.imageUrl || ''

                return {
                    id: d.id,
                    name: data.name || 'Unnamed Product',
                    description: normalizeDescription(data.description),
                    price,
                    imageUrl,
                    category: data.category || 'general',
                    isActive: data.isActive !== undefined ? data.isActive : true,
                    featured: !!data.featured,
                    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
                    costPrice: typeof data.costPrice === 'number' ? data.costPrice : 0,
                    sellingPrice: typeof data.sellingPrice === 'number' ? data.sellingPrice : price,
                    profitMargin: typeof data.profitMargin === 'number' ? data.profitMargin : 0,
                    portionSize: data.portionSize || '',
                    preparationTime: typeof data.preparationTime === 'number' ? data.preparationTime : 0,
                    tags: Array.isArray(data.tags) ? data.tags.filter((t: any) => typeof t === 'string') : [],
                    productType: data.productType || 'directCost',
                    ingredients: Array.isArray(data.ingredients)
                        ? data.ingredients.map((ing: any) => {
                            if (typeof ing === 'string') {
                                return {
                                    id: '',
                                    name: ing,
                                    quantity: 0,
                                    unit: '',
                                }
                            }

                            return {
                                id: ing.id || '',
                                name: ing.name || '',
                                quantity: typeof ing.quantity === 'number' ? ing.quantity : 0,
                                unit: ing.unit || '',
                            }
                        })
                        : [],
                    kitchen: data.kitchen || {},
                    lastUpdated: normalizeDate(data.lastUpdated),
                } as any
            })

            productsData.sort((a: any, b: any) => {
                const so = (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
                if (so !== 0) return so
                return String(a.name ?? '').localeCompare(String(b.name ?? ''))
            })

            setProducts(productsData)
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
                    contactEmail: docData.contactEmail || '',
                })
            }
        } catch (error) {
            console.error('Error fetching site config:', error)
            throw error
        }
    }

    // const savePage = async (page: PageContent) => {
    //     setLoading(true)
    //     setError(null)

    //     try {
    //         const pageData: FirestoreData = {
    //             pageId: page.pageId,
    //             title: page.title,
    //             description: page.description,
    //             content: page.content,
    //             lastUpdated: new Date(),
    //             isActive: page.isActive,
    //         }

    //         if (page.id) {
    //             await updateDoc(doc(db, 'pages', page.id), pageData)
    //         } else {
    //             await addDoc(collection(db, 'pages'), pageData)
    //         }

    //         await fetchPages()
    //         setEditingPage(null)
    //     } catch (error) {
    //         console.error('Error saving page:', error)
    //         setError('Failed to save page')
    //     } finally {
    //         setLoading(false)
    //     }
    // }

    const upsertLocalProduct = (p: WebProduct) => {
        setProducts((prev) => {
            const idx = prev.findIndex((x) => x.id === p.id)

            if (idx >= 0) {
                const next = [...prev]
                next[idx] = { ...prev[idx], ...p }
                return next.sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            }

            return [...prev, p].sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        })
    }

    const saveProduct = async (product: WebProduct) => {
        setLoading(true)
        setError(null)

        try {
            const normalizedIngredients = Array.isArray((product as any).ingredients)
                ? (product as any).ingredients.map((ing: any) => ({
                    id: ing.id || '',
                    name: ing.name || '',
                    quantity: typeof ing.quantity === 'number' ? ing.quantity : 0,
                    unit: ing.unit || '',
                }))
                : []

            const kitchen = (product as any).kitchen || {}

            const productData: FirestoreData = {
                name: product.name || '',
                description: product.description || { en: '', fr: '', es: '' },
                sellingPrice: typeof product.price === 'number' ? product.price : 0,
                costPrice: typeof product.costPrice === 'number' ? product.costPrice : 0,
                profitMargin: typeof product.profitMargin === 'number' ? product.profitMargin : 0,
                category: product.category || 'general',
                portionSize: product.portionSize || '',
                preparationTime: typeof product.preparationTime === 'number' ? product.preparationTime : 0,
                isActive: product.isActive !== undefined ? product.isActive : true,
                featured: !!product.featured,
                tags: Array.isArray(product.tags) ? product.tags : [],
                productType: product.productType || 'directCost',
                ingredients: normalizedIngredients,
                imageUrls: product.imageUrl ? [product.imageUrl] : [],
                lastUpdated: new Date(),
                sortOrder: typeof product.sortOrder === 'number' ? product.sortOrder : 0,
                kitchen: {
                    rollType: kitchen.rollType || '',
                    outerWrap: kitchen.outerWrap || '',
                    innerIngredients: Array.isArray(kitchen.innerIngredients) ? kitchen.innerIngredients : [],
                    finishes: Array.isArray(kitchen.finishes) ? kitchen.finishes : [],
                    sauces: Array.isArray(kitchen.sauces) ? kitchen.sauces : [],
                    displayNameKitchen: kitchen.displayNameKitchen || '',
                    notes: kitchen.notes || '',
                    containsCheese: !!kitchen.containsCheese,
                    requiresFrying: !!kitchen.requiresFrying,
                },
            }

            if (product.id) {
                await updateDoc(doc(db, 'products', product.id), productData)

                upsertLocalProduct({
                    ...product,
                    sellingPrice: productData.sellingPrice,
                    lastUpdated: new Date() as any,
                } as any)
            } else {
                const ref = await addDoc(collection(db, 'products'), productData)

                upsertLocalProduct({
                    ...product,
                    id: ref.id,
                    sellingPrice: productData.sellingPrice,
                    lastUpdated: new Date() as any,
                } as any)
            }

            setEditingProduct(null)
        } catch (error) {
            console.error('Error saving product:', error)
            setError('Failed to save product: ' + (error as Error).message)
        } finally {
            setLoading(false)
        }
    }

    const deleteProduct = async (id: string) => {
        if (!confirm('Are you sure you want to delete this product?')) return

        setError(null)

        try {
            await deleteDoc(doc(db, 'products', id))
            setProducts((prev) => prev.filter((p) => p.id !== id))
        } catch (error) {
            console.error('Error deleting product:', error)
            setError('Failed to delete product')
        }
    }

    // const saveSiteConfig = async () => {
    //     setLoading(true)
    //     setError(null)

    //     try {
    //         const configData: FirestoreData = {
    //             siteTitle: siteConfig.siteTitle,
    //             siteDescription: siteConfig.siteDescription,
    //             maintenanceMode: siteConfig.maintenanceMode,
    //             contactEmail: siteConfig.contactEmail,
    //         }

    //         if (siteConfig.id) {
    //             await updateDoc(doc(db, 'siteConfig', siteConfig.id), configData)
    //         } else {
    //             await addDoc(collection(db, 'siteConfig'), configData)
    //         }

    //         alert('Site configuration saved successfully!')
    //     } catch (error) {
    //         console.error('Error saving site config:', error)
    //         setError('Failed to save site configuration')
    //     } finally {
    //         setLoading(false)
    //     }
    // }

    // const getPageName = (pageId: string) => {
    //     return PREDEFINED_PAGES.find((p) => p.id === pageId)?.name || pageId
    // }

    return (
        <div className="space-y-6">
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

           

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
                    {[
                        // { id: 'pages', name: 'PAGES' },
                        { id: 'products', name: 'PRODUCTS' },
                        // { id: 'settings', name: 'SETTINGS' },
                    ].map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id as AdminSection)}
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

            {/* {activeSection === 'pages' && (
                <PagesManager
                    pages={pages}
                    editingPage={editingPage}
                    setEditingPage={setEditingPage}
                    savePage={savePage}
                    loading={loading}
                    getPageName={getPageName}
                />
            )} */}

            {activeSection === 'products' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-light text-gray-900 tracking-wide">PRODUCTS MANAGEMENT</h3>

                        <button
                            onClick={() =>
                                setEditingProduct({
                                    name: '',
                                    description: { en: '', es: '', fr: '' },
                                    price: 0,
                                    imageUrl: '',
                                    category: 'general',
                                    isActive: true,
                                    featured: false,
                                    sortOrder: products.length,
                                    costPrice: 0,
                                    sellingPrice: 0,
                                    portionSize: '',
                                    preparationTime: 0,
                                    tags: [],
                                    productType: 'directCost',
                                    ingredients: [],
                                    kitchen: {
                                        rollType: '',
                                        outerWrap: '',
                                        innerIngredients: [],
                                        finishes: [],
                                        sauces: [],
                                        displayNameKitchen: '',
                                        notes: '',
                                        containsCheese: false,
                                        requiresFrying: false,
                                    },
                                } as any)
                            }
                            className="px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-light bg-gray-900 hover:bg-gray-800 text-white"
                        >
                            ADD PRODUCT
                        </button>
                    </div>

                    {editingProduct ? (
                        <ProductForm
                            product={editingProduct}
                            onChange={setEditingProduct}
                            onSave={() => void saveProduct(editingProduct)}
                            onCancel={() => setEditingProduct(null)}
                            loading={loading}
                        />
                    ) : (
                        <ProductList
                            products={products}
                            onEdit={setEditingProduct}
                            onDelete={deleteProduct}
                            formatPrice={formatPrice}
                            search={productSearch}
                            setSearch={setProductSearch}
                        />
                    )}
                </div>
            )}

            {/* {activeSection === 'settings' && (
                <SiteSettings
                    config={siteConfig}
                    onChange={setSiteConfig}
                    onSave={saveSiteConfig}
                    loading={loading}
                />
            )} */}
        </div>
    )
}