import { useEffect, useMemo, useState } from 'react'
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
    const [activeSection] = useState<AdminSection>('products')
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

    const productStats = useMemo(() => {
        const active = products.filter((product) => product.isActive !== false).length
        const featured = products.filter((product) => product.featured).length
        const categories = new Set(products.map((product) => product.category || 'general')).size
        return {
            active,
            inactive: Math.max(products.length - active, 0),
            featured,
            categories,
        }
    }, [products])

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
                <div className="border border-red-200 bg-red-50 p-4">
                    <div className="text-red-700 text-sm font-light">{error}</div>
                    <button
                        onClick={() => setError(null)}
                        className="text-red-600 hover:text-red-800 text-xs mt-2 font-light"
                    >
                        Dismiss
                    </button>
                </div>
            )}

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
                <div className="space-y-4">
                    <div className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E62B2B]">
                                    Products Management
                                </p>
                                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                                    Menu catalog
                                </h2>
                                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                                    Maintain pricing, visibility, categories, and kitchen details used by the website.
                                </p>
                            </div>

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
                                        productType: 'ingredientBased',
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
                                className="inline-flex items-center justify-center bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-950/20"
                            >
                                Add Product
                            </button>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
                            <ProductStat label="Total" value={products.length} />
                            <ProductStat label="Active" value={productStats.active} tone="green" />
                            <ProductStat label="Hidden" value={productStats.inactive} tone="red" />
                            <ProductStat label="Featured" value={productStats.featured} tone="amber" />
                            <ProductStat label="Categories" value={productStats.categories} />
                        </div>
                    </div>

                    {editingProduct && (
                        <ProductForm
                            product={editingProduct}
                            onChange={setEditingProduct}
                            onSave={() => void saveProduct(editingProduct)}
                            onCancel={() => setEditingProduct(null)}
                            loading={loading}
                        />
                    )}

                    <div className={editingProduct ? 'hidden' : 'block'}>
                        <ProductList
                            products={products}
                            onEdit={setEditingProduct}
                            onDelete={deleteProduct}
                            formatPrice={formatPrice}
                            search={productSearch}
                            setSearch={setProductSearch}
                        />
                    </div>
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

function ProductStat({
    label,
    value,
    tone = 'slate',
}: {
    label: string
    value: number
    tone?: 'slate' | 'green' | 'red' | 'amber'
}) {
    const toneClass = {
        slate: 'text-slate-950',
        green: 'text-emerald-700',
        red: 'text-red-700',
        amber: 'text-amber-700',
    }[tone]

    return (
        <div className="border border-slate-200 bg-slate-50 px-3 py-3">
            <div className={`text-xl font-semibold ${toneClass}`}>{value}</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {label}
            </div>
        </div>
    )
}
