import { useState, useEffect, useMemo } from 'react'
import { collection, doc, getDocs, updateDoc, addDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../../../firebase/firebase'
import type { WebProduct } from '../../../../types/types'
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../../../firebase/firebase";

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
    const [productSearch, setProductSearch] = useState("");
    const [activeSection, setActiveSection] = useState<'pages' | 'products' | 'settings'>('pages')
    const [pages, setPages] = useState<PageContent[]>([])
    const [products, setProducts] = useState<WebProduct[]>([])
    const [siteConfig, setSiteConfig] = useState<SiteConfig>({
        siteTitle: '',
        siteDescription: ' ',
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

    const normalizeDescription = (desc: any): { en: string; fr: string; es: string } => {
        if (!desc) return { en: "", fr: "", es: "" };
        if (typeof desc === "string") return { en: desc, fr: "", es: "" };
        return {
            en: typeof desc.en === "string" ? desc.en : "",
            fr: typeof desc.fr === "string" ? desc.fr : "",
            es: typeof desc.es === "string" ? desc.es : "",
        };
    };

    const normalizeDate = (v: any): Date => {
        // Firestore Timestamp -> toDate()
        if (v?.toDate) return v.toDate();
        // ISO string
        if (typeof v === "string") {
            const d = new Date(v);
            return isNaN(d.getTime()) ? new Date() : d;
        }
        // Date
        if (v instanceof Date) return v;
        return new Date();
    };

    const fetchProducts = async () => {
        try {
            const snapshot = await getDocs(collection(db, "products"));

            const productsData: WebProduct[] = snapshot.docs.map((d) => {
                const data = d.data();

                const price =
                    typeof data.sellingPrice === "number"
                        ? data.sellingPrice
                        : typeof data.price === "number"
                            ? data.price
                            : 0;

                const imageUrl = data.imageUrls?.[0] || data.imageUrl || "";

                return {
                    id: d.id,
                    name: data.name || "Unnamed Product",
                    description: normalizeDescription(data.description),
                    price,
                    imageUrl,
                    category: data.category || "general",
                    isActive: data.isActive !== undefined ? data.isActive : true,
                    featured: !!data.featured,
                    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
                    costPrice: typeof data.costPrice === "number" ? data.costPrice : 0,
                    sellingPrice: typeof data.sellingPrice === "number" ? data.sellingPrice : price,
                    profitMargin: typeof data.profitMargin === "number" ? data.profitMargin : 0,
                    portionSize: data.portionSize || "",
                    preparationTime: typeof data.preparationTime === "number" ? data.preparationTime : 0,
                    tags: Array.isArray(data.tags) ? data.tags.filter((t: any) => typeof t === "string") : [],
                    productType: data.productType || "directCost",
                    ingredients: Array.isArray(data.ingredients)
                        ? data.ingredients.map((ing: any) => ({
                            id: ing.id || "",
                            name: ing.name || "",
                            quantity: typeof ing.quantity === "number" ? ing.quantity : 0,
                            unit: ing.unit || "",
                        }))
                        : [],
                    // opcional: si tu tipo WebProduct lo soporta
                    lastUpdated: normalizeDate(data.lastUpdated),
                } as any as WebProduct;
            });

            // sort inicial: sortOrder, luego name
            productsData.sort((a: any, b: any) => {
                const so = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
                if (so !== 0) return so;
                return String(a.name ?? "").localeCompare(String(b.name ?? ""));
            });

            setProducts(productsData);
        } catch (error) {
            console.error("Error fetching products:", error);
            throw error;
        }
    };

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

    const upsertLocalProduct = (p: WebProduct) => {
        setProducts((prev) => {
            const idx = prev.findIndex((x) => x.id === p.id);
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = { ...prev[idx], ...p };
                return next.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
            }
            return [...prev, p].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        });
    };

    const saveProduct = async (product: WebProduct) => {
        setLoading(true);
        setError(null);

        try {
            const productData: FirestoreData = {
                name: product.name || "",
                description: product.description || { en: "", fr: "", es: "" },
                sellingPrice: typeof product.price === "number" ? product.price : 0,
                costPrice: typeof product.costPrice === "number" ? product.costPrice : 0,
                profitMargin: typeof product.profitMargin === "number" ? product.profitMargin : 0,
                category: product.category || "general",
                portionSize: product.portionSize || "",
                preparationTime: typeof product.preparationTime === "number" ? product.preparationTime : 0,
                isActive: product.isActive !== undefined ? product.isActive : true,
                featured: !!product.featured,
                tags: Array.isArray(product.tags) ? product.tags : [],
                productType: product.productType || "directCost",
                ingredients: Array.isArray(product.ingredients)
                    ? product.ingredients.map((ing) => ({
                        id: ing.id || "",
                        name: ing.name || "",
                        quantity: typeof ing.quantity === "number" ? ing.quantity : 0,
                        unit: ing.unit || "",
                    }))
                    : [],
                imageUrls: product.imageUrl ? [product.imageUrl] : [],
                lastUpdated: new Date(), // 🔥 timestamp
                sortOrder: typeof product.sortOrder === "number" ? product.sortOrder : 0,
            };

            if (product.id) {
                await updateDoc(doc(db, "products", product.id), productData);

                upsertLocalProduct({
                    ...product,
                    sellingPrice: productData.sellingPrice,
                    lastUpdated: new Date() as any,
                } as any);
            } else {
                const ref = await addDoc(collection(db, "products"), productData);

                upsertLocalProduct({
                    ...product,
                    id: ref.id,
                    sellingPrice: productData.sellingPrice,
                    lastUpdated: new Date() as any,
                } as any);
            }

            setEditingProduct(null);
        } catch (error) {
            console.error("Error saving product:", error);
            setError("Failed to save product: " + (error as Error).message);
        } finally {
            setLoading(false);
        }
    };


    const deleteProduct = async (id: string) => {
        if (!confirm("Are you sure you want to delete this product?")) return;

        setError(null);
        try {
            await deleteDoc(doc(db, "products", id));
            setProducts((prev) => prev.filter((p) => p.id !== id)); // ✅ update local only
        } catch (error) {
            console.error("Error deleting product:", error);
            setError("Failed to delete product");
        }
    };

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
                            search={productSearch}
                            setSearch={setProductSearch}
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

// Product Form Component with Multi-language Support
function ProductForm({ product, onChange, onSave, onCancel, loading }: {
    product: WebProduct
    onChange: (product: WebProduct) => void
    onSave: () => void
    onCancel: () => void
    loading: boolean
}) {
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [tagsText, setTagsText] = useState("");


    const [priceInput, setPriceInput] = useState<string>(
        product.price?.toString() ?? ""
    );

    const [costInput, setCostInput] = useState<string>(
        product.costPrice?.toString() ?? ""
    );


    useEffect(() => {
        setPriceInput(String(product.price ?? ""));
        setCostInput(String(product.costPrice ?? ""));
        setTagsText((product.tags ?? []).join(", "));
    }, [product.id]); // si cambias de producto, se actualiza el input

    // Helper to ensure description object has all required languages
    const getDescriptionObject = (): { en: string; fr: string; es: string } => {
        if (typeof product.description === 'string') {
            // Convert string to multi-language object
            return {
                en: product.description,
                fr: '',
                es: ''
            };
        }

        // Ensure all languages are present
        return {
            en: product.description?.en || '',
            fr: product.description?.fr || '',
            es: product.description?.es || ''
        };
    };

    const handleImageFileUpload = async (file: File) => {
        setUploadError(null);

        if (!file.type.startsWith("image/")) {
            setUploadError("Invalid file type. Please select an image.");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setUploadError("Image too large. Max 10MB.");
            return;
        }

        try {
            setUploading(true);

            // si no hay id (producto nuevo), subimos a un path temporal
            const baseId = product.id || `temp_${Date.now()}`;
            const safeName = file.name.replace(/\s+/g, "_");
            const path = `web-products/${baseId}/${Date.now()}_${safeName}`;

            const r = ref(storage, path);
            await uploadBytes(r, file);
            const url = await getDownloadURL(r);

            // ✅ setea el url en el form
            onChange({ ...product, imageUrl: url });
        } catch (e: any) {
            console.error("Upload error:", e);
            setUploadError(e?.message || "Failed to upload image.");
        } finally {
            setUploading(false);
        }
    };

    const description = getDescriptionObject();

    const handleDescriptionChange = (lang: 'en' | 'fr' | 'es', value: string) => {
        const updatedDescription = {
            ...description,
            [lang]: value
        };
        onChange({
            ...product,
            description: updatedDescription
        });
    };

    const handleSingleDescriptionChange = (value: string) => {
        // Set all languages to the same value
        const updatedDescription = {
            en: value,
            fr: value,
            es: value
        };
        onChange({
            ...product,
            description: updatedDescription
        });
    };

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
                        value={priceInput}
                        onChange={(e) => {
                            const value = e.target.value;
                            setPriceInput(value);

                            if (value !== "" && !isNaN(Number(value))) {
                                onChange({
                                    ...product,
                                    price: Number(value),
                                });
                            }
                        }}
                        onBlur={() => {
                            if (priceInput === "") {
                                setPriceInput("0");
                                onChange({
                                    ...product,
                                    price: 0,
                                });
                            }
                        }}
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
                        value={costInput}
                        onChange={(e) => {
                            const value = e.target.value;
                            setCostInput(value);

                            if (value !== "" && !isNaN(Number(value))) {
                                onChange({
                                    ...product,
                                    costPrice: Number(value),
                                });
                            }
                        }}
                        onBlur={() => {
                            if (costInput === "") {
                                setCostInput("0");
                                onChange({
                                    ...product,
                                    costPrice: 0,
                                });
                            }
                        }}
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

                {/* Multi-language Description */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-light text-gray-700 mb-2">
                        Description (Multi-language)
                    </label>

                    {/* Quick Fill - Set all languages to same value */}
                    <div className="mb-3">
                        <label className="block text-xs text-gray-500 mb-1">
                            Quick Fill (sets all languages to same value):
                        </label>
                        <textarea
                            value={description.en}
                            onChange={(e) => handleSingleDescriptionChange(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light text-sm"
                            placeholder="Enter description to set for all languages"
                        />
                    </div>

                    {/* Individual Language Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">
                                English Description
                            </label>
                            <textarea
                                value={description.en}
                                onChange={(e) => handleDescriptionChange('en', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light text-sm"
                                placeholder="English description"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">
                                French Description
                            </label>
                            <textarea
                                value={description.fr}
                                onChange={(e) => handleDescriptionChange('fr', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light text-sm"
                                placeholder="Description française"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">
                                Spanish Description
                            </label>
                            <textarea
                                value={description.es}
                                onChange={(e) => handleDescriptionChange('es', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light text-sm"
                                placeholder="Descripción en español"
                            />
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-light text-gray-700 mb-2">Image</label>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                        {/* URL input */}
                        <div className="md:col-span-8">
                            <input
                                type="url"
                                value={product.imageUrl}
                                onChange={(e) => onChange({ ...product, imageUrl: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                                placeholder="https://example.com/image.jpg"
                            />
                            <p className="text-xs text-gray-500 font-light mt-1">
                                Paste an image URL or upload a file.
                            </p>
                        </div>

                        {/* Upload button */}
                        <div className="md:col-span-4">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleImageFileUpload(f);
                                    e.currentTarget.value = ""; // permite subir el mismo archivo otra vez
                                }}
                                className="block w-full text-sm font-light text-gray-600
                   file:mr-3 file:py-2 file:px-4
                   file:rounded-md file:border-0
                   file:text-sm file:font-light
                   file:bg-gray-900 file:text-white
                   hover:file:bg-gray-800
                   disabled:opacity-50"
                                disabled={uploading}
                            />

                            {uploading && (
                                <div className="mt-2 text-xs text-gray-500 font-light">Uploading…</div>
                            )}
                            {uploadError && (
                                <div className="mt-2 text-xs text-red-600 font-light">{uploadError}</div>
                            )}
                        </div>
                    </div>

                    {/* Preview */}
                    {product.imageUrl?.trim() && (
                        <div className="mt-3">
                            <div className="text-xs text-gray-500 font-light mb-2">Preview</div>
                            <img
                                src={product.imageUrl}
                                alt={product.name || "Product image"}
                                className="h-32 w-32 object-cover rounded-lg border border-gray-200"
                                onError={() => setUploadError("Image URL is not valid or cannot be loaded.")}
                            />
                        </div>
                    )}
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
                        value={tagsText}
                        onChange={(e) => {
                            const value = e.target.value;
                            setTagsText(value);

                            const tags = value
                                .split(",")
                                .map((t) => t.trim())
                                .filter(Boolean);

                            onChange({ ...product, tags });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                        placeholder="Popular, Spicy, Vegan"
                    />
                </div>

                {/* Add Featured Toggle */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
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
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="productFeatured"
                            checked={product.featured || false}
                            onChange={(e) => onChange({ ...product, featured: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="productFeatured" className="ml-2 block text-sm text-gray-700 font-light">
                            Featured product (shows on landing page)
                        </label>
                    </div>
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

function useDebouncedValue<T>(value: T, delay = 250) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function safeLower(s: any) {
    return String(s ?? "").toLowerCase();
}

function productSearchText(p: any) {
    const desc = p?.description ?? {};
    const descAll = [desc.en, desc.fr, desc.es].filter(Boolean).join(" ");
    const tags = Array.isArray(p?.tags) ? p.tags.join(" ") : "";
    return [p?.name, p?.category, tags, descAll].filter(Boolean).join(" ");
}


function ProductList({
    products,
    onEdit,
    onDelete,
    formatPrice,
    search,
    setSearch,
}: {
    products: WebProduct[];
    onEdit: (product: WebProduct) => void;
    onDelete: (id: string) => void;
    formatPrice: (price: number | undefined) => string;
    search: string;
    setSearch: (v: string) => void;
}) {

    // UI state
    const debouncedSearch = useDebouncedValue(search, 250);

    const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
    const [featured, setFeatured] = useState<"all" | "featured" | "not_featured">("all");
    const [category, setCategory] = useState<string>("all");
    const [tag, setTag] = useState<string>("all");

    const [sortKey, setSortKey] = useState<"sortOrder" | "name" | "price" | "updated">("sortOrder");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    // computed options
    const categories = useMemo(() => {
        const s = new Set<string>();
        products.forEach((p: any) => s.add(p.category || "general"));
        return ["all", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
    }, [products]);

    const tags = useMemo(() => {
        const s = new Set<string>();
        products.forEach((p: any) => (p.tags || []).forEach((t: any) => typeof t === "string" && s.add(t)));
        return ["all", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
    }, [products]);

    // filter + search
    const filtered = useMemo(() => {
        const q = safeLower(debouncedSearch).trim();

        return products.filter((p: any) => {
            if (status === "active" && !p.isActive) return false;
            if (status === "inactive" && p.isActive) return false;

            if (featured === "featured" && !p.featured) return false;
            if (featured === "not_featured" && !!p.featured) return false;

            if (category !== "all" && (p.category || "general") !== category) return false;

            if (tag !== "all") {
                const t = Array.isArray(p.tags) ? p.tags : [];
                if (!t.includes(tag)) return false;
            }

            if (!q) return true;
            return safeLower(productSearchText(p)).includes(q);
        });
    }, [products, debouncedSearch, status, featured, category, tag]);

    // sorting
    const sorted = useMemo(() => {
        const copy = [...filtered];

        copy.sort((a: any, b: any) => {
            let v = 0;

            if (sortKey === "sortOrder") {
                v = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
                if (v === 0) v = String(a.name ?? "").localeCompare(String(b.name ?? ""));
            } else if (sortKey === "name") {
                v = String(a.name ?? "").localeCompare(String(b.name ?? ""));
            } else if (sortKey === "price") {
                v = (a.price ?? 0) - (b.price ?? 0);
            } else if (sortKey === "updated") {
                const ad = a.lastUpdated?.getTime?.() ?? (a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0);
                const bd = b.lastUpdated?.getTime?.() ?? (b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0);
                v = ad - bd;
            }

            return sortDir === "asc" ? v : -v;
        });

        return copy;
    }, [filtered, sortKey, sortDir]);

    // pagination
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = clamp(page, 1, totalPages);

    useEffect(() => {
        // reset to page 1 when changing filters/search/sort/pageSize
        setPage(1);
    }, [debouncedSearch, status, featured, category, tag, sortKey, sortDir, pageSize]);

    const paged = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return sorted.slice(start, start + pageSize);
    }, [sorted, safePage, pageSize]);

    // descriptions (same as you had, but safer)
    const truncateText = (text: string | undefined, maxLength = 80): string => {
        if (!text || !text.trim()) return "No description";
        const clean = text.trim();
        if (clean.length <= maxLength) return clean;
        return clean.slice(0, maxLength - 1).trimEnd() + "…";
    };

    const getDescription = (product: any, preferredLanguage: string = "en"): string => {
        const desc = product?.description ?? { en: "", fr: "", es: "" };

        if (desc?.[preferredLanguage]?.trim()) return desc[preferredLanguage];
        if (desc?.en?.trim()) return desc.en;

        const available = ["en", "fr", "es"].find((lang) => desc?.[lang]?.trim());
        if (available) return desc[available];

        return "No description";
    };

    const getDescriptionForTitle = (product: any): string => {
        const desc = product?.description ?? {};
        const lines: string[] = [];
        (["en", "fr", "es"] as const).forEach((lang) => {
            const v = desc?.[lang];
            if (typeof v === "string" && v.trim()) lines.push(`${lang.toUpperCase()}: ${v}`);
        });
        return lines.join("\n") || "No description";
    };

    const clearFilters = () => {
        setSearch("");
        setStatus("all");
        setFeatured("all");
        setCategory("all");
        setTag("all");
        setSortKey("sortOrder");
        setSortDir("asc");
        setPageSize(25);
        setPage(1);
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 space-y-4">
            {/* Toolbar */}
            <div className="sticky top-[56px] z-10 bg-white border border-gray-200 rounded-xl p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                        <div className="text-sm font-light text-gray-900">
                            Showing <span className="text-gray-700">{total}</span> of{" "}
                            <span className="text-gray-700">{products.length}</span>
                        </div>
                        <div className="text-xs text-gray-500 font-light mt-1">
                            Search + filters + sorting for large catalogs
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm font-light"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-6">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name / category / tags / description…"
                            className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900/10 font-light"
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 font-light"
                        >
                            <option value="all">All status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <select
                            value={featured}
                            onChange={(e) => setFeatured(e.target.value as any)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 font-light"
                        >
                            <option value="all">All</option>
                            <option value="featured">Featured</option>
                            <option value="not_featured">Not featured</option>
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <select
                            value={pageSize}
                            onChange={(e) => setPageSize(parseInt(e.target.value) || 25)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 font-light"
                        >
                            <option value={10}>10 / page</option>
                            <option value={25}>25 / page</option>
                            <option value={50}>50 / page</option>
                            <option value={100}>100 / page</option>
                        </select>
                    </div>
                </div>

                <div className="mt-2 grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-4">
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 font-light"
                        >
                            {categories.map((c) => (
                                <option key={c} value={c}>
                                    {c === "all" ? "All categories" : c}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="sm:col-span-4">
                        <select
                            value={tag}
                            onChange={(e) => setTag(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 font-light"
                        >
                            {tags.map((t) => (
                                <option key={t} value={t}>
                                    {t === "all" ? "All tags" : t}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="sm:col-span-3">
                        <select
                            value={sortKey}
                            onChange={(e) => setSortKey(e.target.value as any)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 font-light"
                        >
                            <option value="sortOrder">Sort order</option>
                            <option value="name">Name</option>
                            <option value="price">Price</option>
                            <option value="updated">Updated</option>
                        </select>
                    </div>

                    <div className="sm:col-span-1">
                        <button
                            type="button"
                            onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                            className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm font-light"
                            title="Toggle sort direction"
                        >
                            {sortDir === "asc" ? "Asc" : "Desc"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
                {paged.map((product: any) => (
                    <div key={product.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start mb-3">
                            <div className="min-w-0 flex-1">
                                <div className="font-light text-gray-900 text-sm mb-1 truncate">
                                    {product.name || "Unnamed Product"}
                                </div>
                                <div className="text-xs text-gray-500 font-light truncate">
                                    {product.category || "No category"}
                                </div>
                            </div>

                            <div className="flex flex-col items-end space-y-1 flex-shrink-0 ml-2">
                                <span
                                    className={`inline-flex px-2 py-1 text-xs font-light rounded-full ${product.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                        }`}
                                >
                                    {product.isActive ? "Active" : "Inactive"}
                                </span>
                                {product.featured && (
                                    <span className="inline-flex px-2 py-1 text-xs font-light rounded-full bg-yellow-100 text-yellow-800">
                                        Featured
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="text-xs text-gray-600 mb-2 font-light line-clamp-2" title={getDescriptionForTitle(product)}>
                            {truncateText(getDescription(product), 80)}
                        </div>

                        <div className="flex justify-between items-center mb-3">
                            <div className="text-sm font-light text-green-600">{formatPrice(product.price)}</div>
                            <div className="text-xs text-gray-500 font-light">Cost: {formatPrice(product.costPrice)}</div>
                        </div>

                        {product.portionSize && (
                            <div className="text-xs text-gray-500 mb-2 font-light truncate">Portion: {product.portionSize}</div>
                        )}

                        {Array.isArray(product.tags) && product.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                                {product.tags.slice(0, 4).map((t: string) => (
                                    <span key={t} className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-600">
                                        {t}
                                    </span>
                                ))}
                                {product.tags.length > 4 && (
                                    <span className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-500">
                                        +{product.tags.length - 4}
                                    </span>
                                )}
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

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider w-2/5">
                                Product
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider w-1/6">
                                Category
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider w-1/6">
                                Price
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider w-1/6">
                                Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider w-1/6">
                                Actions
                            </th>
                        </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-gray-200">
                        {paged.map((product: any) => (
                            <tr key={product.id} className="hover:bg-gray-50">
                                <td className="px-4 py-4 w-2/5 min-w-0 overflow-hidden">
                                    <div className="flex flex-col min-w-0 overflow-hidden">
                                        <div className="text-sm font-light text-gray-900 truncate" title={product.name}>
                                            {product.name || "Unnamed Product"}
                                        </div>

                                        <div className="text-xs text-gray-500 font-light mt-1" title={getDescriptionForTitle(product)}>
                                            {truncateText(getDescription(product), 80)}
                                        </div>

                                        {product.portionSize && (
                                            <div className="text-xs text-gray-400 font-light truncate mt-1" title={product.portionSize}>
                                                {product.portionSize}
                                            </div>
                                        )}

                                        {Array.isArray(product.tags) && product.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {product.tags.slice(0, 3).map((t: string) => (
                                                    <span
                                                        key={t}
                                                        className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-600"
                                                        title={t}
                                                    >
                                                        {t}
                                                    </span>
                                                ))}
                                                {product.tags.length > 3 && (
                                                    <span className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-500">
                                                        +{product.tags.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </td>

                                <td className="px-4 py-4 w-1/6">
                                    <div className="text-sm text-gray-600 font-light truncate" title={product.category}>
                                        {product.category || "No category"}
                                    </div>
                                </td>

                                <td className="px-4 py-4 w-1/6">
                                    <div className="text-sm font-light text-green-600">{formatPrice(product.price)}</div>
                                    <div className="text-xs text-gray-500 font-light">Cost: {formatPrice(product.costPrice)}</div>
                                </td>

                                <td className="px-4 py-4 w-1/6">
                                    <div className="flex flex-col space-y-1">
                                        <span
                                            className={`inline-flex px-2 py-1 text-xs font-light rounded-full ${product.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                                }`}
                                        >
                                            {product.isActive ? "Active" : "Inactive"}
                                        </span>
                                        {product.featured && (
                                            <span className="inline-flex px-2 py-1 text-xs font-light rounded-full bg-yellow-100 text-yellow-800">
                                                Featured
                                            </span>
                                        )}
                                    </div>
                                </td>

                                <td className="px-4 py-4 w-1/6">
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => onEdit(product)}
                                            className="text-blue-600 hover:text-blue-900 font-light text-sm px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => product.id && onDelete(product.id)}
                                            className="text-red-600 hover:text-red-900 font-light text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-500 font-light">
                    Page {safePage} / {totalPages} · {total} results
                </p>

                <div className="flex gap-2">
                    <button
                        className="px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm font-light disabled:opacity-50"
                        disabled={safePage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Prev
                    </button>
                    <button
                        className="px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm font-light disabled:opacity-50"
                        disabled={safePage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </button>
                </div>
            </div>

            {products.length === 0 && (
                <div className="text-center py-8">
                    <div className="text-gray-400 text-sm font-light">No products found. Add your first product to get started.</div>
                </div>
            )}
        </div>
    );
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