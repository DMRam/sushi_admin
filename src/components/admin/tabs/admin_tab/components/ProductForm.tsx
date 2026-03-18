import { useEffect, useState } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import type { ProductFormProps } from '../types'
import { storage } from '../../../../../firebase/firebase'
import { normalizeUnit } from '../utils'
import type { ProductIngredient, Unit } from '../../../../../types/types'

function normalizeIngredientInput(ingredients: any[] = []) {
    return ingredients
        .map((ing: any) => {
            if (typeof ing === 'string') {
                return {
                    id: '',
                    name: ing,
                    quantity: 0,
                    unit: '',
                }
            }

            return {
                id: ing?.id || '',
                name: ing?.name || '',
                quantity: typeof ing?.quantity === 'number' ? ing.quantity : 0,
                unit: normalizeUnit(ing?.unit),
            }
        })
        .filter((ing: any) => ing.name)
}

function getRawKitchenInput(kitchen: any = {}) {
    return {
        rollType: typeof kitchen.rollType === 'string' ? kitchen.rollType : '',
        outerWrap: typeof kitchen.outerWrap === 'string' ? kitchen.outerWrap : '',
        innerIngredients: Array.isArray(kitchen.innerIngredients) ? kitchen.innerIngredients : [],
        finishes: Array.isArray(kitchen.finishes) ? kitchen.finishes : [],
        sauces: Array.isArray(kitchen.sauces) ? kitchen.sauces : [],
        displayNameKitchen:
            typeof kitchen.displayNameKitchen === 'string' ? kitchen.displayNameKitchen : '',
        notes: typeof kitchen.notes === 'string' ? kitchen.notes : '',
        containsCheese: !!kitchen.containsCheese,
        requiresFrying: !!kitchen.requiresFrying,

        // legacy fields, shown separately if they exist in DB
        wrapper: typeof kitchen.wrapper === 'string' ? kitchen.wrapper : '',
        fillings: Array.isArray(kitchen.fillings) ? kitchen.fillings : [],
        toppings: Array.isArray(kitchen.toppings) ? kitchen.toppings : [],
    }
}

export default function ProductForm({
    product,
    onChange,
    onSave,
    onCancel,
    loading,
}: ProductFormProps) {
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [tagsText, setTagsText] = useState('')
    const [priceInput, setPriceInput] = useState<string>(product.price?.toString() ?? '')
    const [costInput, setCostInput] = useState<string>(product.costPrice?.toString() ?? '')
    const [ingredientsText, setIngredientsText] = useState('')
    const [kitchenInnerText, setKitchenInnerText] = useState('')
    const [kitchenFinishesText, setKitchenFinishesText] = useState('')
    const [kitchenSaucesText, setKitchenSaucesText] = useState('')

    useEffect(() => {
        setPriceInput(String(product.price ?? ''))
        setCostInput(String(product.costPrice ?? ''))
        setTagsText((product.tags ?? []).join(', '))

        const normalizedIngredients = normalizeIngredientInput((product as any).ingredients ?? [])
        setIngredientsText(normalizedIngredients.map((i: any) => i.name).join(', '))

        const kitchen = getRawKitchenInput((product as any).kitchen)
        setKitchenInnerText((kitchen.innerIngredients || []).join(', '))
        setKitchenFinishesText((kitchen.finishes || []).join(', '))
        setKitchenSaucesText((kitchen.sauces || []).join(', '))
    }, [product.id])

    const getDescriptionObject = (): { en: string; fr: string; es: string } => {
        if (typeof product.description === 'string') {
            return {
                en: product.description,
                fr: '',
                es: '',
            }
        }

        return {
            en: product.description?.en || '',
            fr: product.description?.fr || '',
            es: product.description?.es || '',
        }
    }

    const handleDescriptionChange = (lang: 'en' | 'fr' | 'es', value: string) => {
        const current = getDescriptionObject()
        onChange({
            ...product,
            description: {
                ...current,
                [lang]: value,
            },
        })
    }

    const handleSingleDescriptionChange = (value: string) => {
        onChange({
            ...product,
            description: {
                en: value,
                fr: value,
                es: value,
            },
        })
    }

    const handleImageFileUpload = async (file: File) => {
        setUploadError(null)

        if (!file.type.startsWith('image/')) {
            setUploadError('Invalid file type. Please select an image.')
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            setUploadError('Image too large. Max 10MB.')
            return
        }

        try {
            setUploading(true)

            const baseId = product.id || `temp_${Date.now()}`
            const safeName = file.name.replace(/\s+/g, '_')
            const path = `web-products/${baseId}/${Date.now()}_${safeName}`

            const fileRef = ref(storage, path)
            await uploadBytes(fileRef, file)
            const url = await getDownloadURL(fileRef)

            onChange({ ...product, imageUrl: url })
        } catch (e: any) {
            console.error('Upload error:', e)
            setUploadError(e?.message || 'Failed to upload image.')
        } finally {
            setUploading(false)
        }
    }

    const description = getDescriptionObject()
    const kitchen = getRawKitchenInput((product as any).kitchen)

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">
                {product.id ? 'EDIT PRODUCT' : 'ADD NEW PRODUCT'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">Product Name</label>
                    <input
                        type="text"
                        value={product.name}
                        onChange={(e) => onChange({ ...product, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                    />
                </div>

                <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">Selling Price ($)</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={priceInput}
                        onChange={(e) => {
                            const value = e.target.value
                            setPriceInput(value)

                            if (value !== '' && !Number.isNaN(Number(value))) {
                                onChange({
                                    ...product,
                                    price: Number(value),
                                    sellingPrice: Number(value),
                                })
                            }
                        }}
                        onBlur={() => {
                            if (priceInput === '') {
                                setPriceInput('0')
                                onChange({
                                    ...product,
                                    price: 0,
                                    sellingPrice: 0,
                                })
                            }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                    />
                </div>

                <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">Cost Price ($)</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={costInput}
                        onChange={(e) => {
                            const value = e.target.value
                            setCostInput(value)

                            if (value !== '' && !Number.isNaN(Number(value))) {
                                onChange({
                                    ...product,
                                    costPrice: Number(value),
                                })
                            }
                        }}
                        onBlur={() => {
                            if (costInput === '') {
                                setCostInput('0')
                                onChange({
                                    ...product,
                                    costPrice: 0,
                                })
                            }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                    />
                </div>

                <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">Category</label>
                    <input
                        type="text"
                        value={product.category}
                        onChange={(e) => onChange({ ...product, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-light text-gray-700 mb-2">
                        Description (Multi-language)
                    </label>

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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">English Description</label>
                            <textarea
                                value={description.en}
                                onChange={(e) => handleDescriptionChange('en', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light text-sm"
                                placeholder="English description"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">French Description</label>
                            <textarea
                                value={description.fr}
                                onChange={(e) => handleDescriptionChange('fr', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light text-sm"
                                placeholder="Description française"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Spanish Description</label>
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

                        <div className="md:col-span-4">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const f = e.target.files?.[0]
                                    if (f) void handleImageFileUpload(f)
                                    e.currentTarget.value = ''
                                }}
                                className="block w-full text-sm font-light text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-light file:bg-gray-900 file:text-white hover:file:bg-gray-800 disabled:opacity-50"
                                disabled={uploading}
                            />

                            {uploading && <div className="mt-2 text-xs text-gray-500 font-light">Uploading…</div>}
                            {uploadError && <div className="mt-2 text-xs text-red-600 font-light">{uploadError}</div>}
                        </div>
                    </div>

                    {product.imageUrl?.trim() && (
                        <div className="mt-3">
                            <div className="text-xs text-gray-500 font-light mb-2">Preview</div>
                            <img
                                src={product.imageUrl}
                                alt={product.name || 'Product image'}
                                className="h-32 w-32 object-cover rounded-lg border border-gray-200"
                                onError={() => setUploadError('Image URL is not valid or cannot be loaded.')}
                            />
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">Portion Size</label>
                    <input
                        type="text"
                        value={product.portionSize || ''}
                        onChange={(e) => onChange({ ...product, portionSize: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                        placeholder="200g bowl"
                    />
                </div>

                <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">Preparation Time (min)</label>
                    <input
                        type="number"
                        min="0"
                        value={product.preparationTime || 0}
                        onChange={(e) => onChange({ ...product, preparationTime: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                    />
                </div>

                <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">Sort Order</label>
                    <input
                        type="number"
                        value={product.sortOrder}
                        onChange={(e) => onChange({ ...product, sortOrder: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                    />
                </div>

                <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">Tags (comma separated)</label>
                    <input
                        type="text"
                        value={tagsText}
                        onChange={(e) => {
                            const value = e.target.value
                            setTagsText(value)

                            const tags = value
                                .split(',')
                                .map((t) => t.trim())
                                .filter(Boolean)

                            onChange({ ...product, tags })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                        placeholder="Popular, Spicy, Vegan"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-light text-gray-700 mb-2">
                        Ingredients (comma separated display names)
                    </label>
                    <input
                        type="text"
                        value={ingredientsText}
                        onChange={(e) => {
                            const value = e.target.value
                            setIngredientsText(value)

                            const ingredients = value
                                .split(',')
                                .map((v) => v.trim())
                                .filter(Boolean)
                                .map((name): ProductIngredient => ({
                                    id: '',
                                    name,
                                    quantity: 0,
                                    unit: 'unit' as Unit,
                                }))

                            onChange({
                                ...product,
                                ingredients,
                            })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                        placeholder="Shrimp, Avocado, Cream Cheese"
                    />
                </div>

                <div className="md:col-span-2 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-4">Kitchen Fields</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-light text-gray-700 mb-2">Kitchen Name</label>
                            <input
                                type="text"
                                value={kitchen.displayNameKitchen}
                                onChange={(e) =>
                                    onChange({
                                        ...product,
                                        kitchen: {
                                            ...(product as any).kitchen,
                                            displayNameKitchen: e.target.value,
                                        },
                                    } as any)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                                placeholder="SUMOOKU AVOCADO"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-light text-gray-700 mb-2">Outer Wrap</label>
                            <input
                                type="text"
                                value={kitchen.outerWrap}
                                onChange={(e) =>
                                    onChange({
                                        ...product,
                                        kitchen: {
                                            ...(product as any).kitchen,
                                            outerWrap: e.target.value,
                                        },
                                    } as any)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                                placeholder="avocat / saumon / massago / philadelphia"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-light text-gray-700 mb-2">
                                Inner Ingredients (comma separated)
                            </label>
                            <input
                                type="text"
                                value={kitchenInnerText}
                                onChange={(e) => {
                                    const value = e.target.value
                                    setKitchenInnerText(value)

                                    onChange({
                                        ...product,
                                        kitchen: {
                                            ...(product as any).kitchen,
                                            innerIngredients: value.split(',').map((v) => v.trim()).filter(Boolean),
                                        },
                                    } as any)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                                placeholder="saumon_fume, fromage_creme, ciboulette"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-light text-gray-700 mb-2">
                                Finishes (comma separated)
                            </label>
                            <input
                                type="text"
                                value={kitchenFinishesText}
                                onChange={(e) => {
                                    const value = e.target.value
                                    setKitchenFinishesText(value)

                                    onChange({
                                        ...product,
                                        kitchen: {
                                            ...(product as any).kitchen,
                                            finishes: value.split(',').map((v) => v.trim()).filter(Boolean),
                                        },
                                    } as any)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                                placeholder="oignon_frit, massago"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-light text-gray-700 mb-2">
                                Sauces (comma separated)
                            </label>
                            <input
                                type="text"
                                value={kitchenSaucesText}
                                onChange={(e) => {
                                    const value = e.target.value
                                    setKitchenSaucesText(value)

                                    onChange({
                                        ...product,
                                        kitchen: {
                                            ...(product as any).kitchen,
                                            sauces: value.split(',').map((v) => v.trim()).filter(Boolean),
                                        },
                                    } as any)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                                placeholder="teriyaki"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-light text-gray-700 mb-2">Kitchen Notes</label>
                            <textarea
                                value={kitchen.notes}
                                onChange={(e) =>
                                    onChange({
                                        ...product,
                                        kitchen: {
                                            ...(product as any).kitchen,
                                            notes: e.target.value,
                                        },
                                    } as any)
                                }
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-light"
                                placeholder="Use cheese lightly. Premium seafood profile."
                            />
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="containsCheese"
                                checked={!!kitchen.containsCheese}
                                onChange={(e) =>
                                    onChange({
                                        ...product,
                                        kitchen: {
                                            ...(product as any).kitchen,
                                            containsCheese: e.target.checked,
                                        },
                                    } as any)
                                }
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="containsCheese" className="ml-2 block text-sm text-gray-700 font-light">
                                Contains cheese
                            </label>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="requiresFrying"
                                checked={!!kitchen.requiresFrying}
                                onChange={(e) =>
                                    onChange({
                                        ...product,
                                        kitchen: {
                                            ...(product as any).kitchen,
                                            requiresFrying: e.target.checked,
                                        },
                                    } as any)
                                }
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="requiresFrying" className="ml-2 block text-sm text-gray-700 font-light">
                                Requires frying
                            </label>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2 mt-4 border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                    <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                        Raw Kitchen Object (Firestore)
                    </div>

                    <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all overflow-x-auto">
                        {JSON.stringify((product as any).kitchen || {}, null, 2)}
                    </pre>
                </div>

                {((product as any).kitchen?.wrapper ||
                    (product as any).kitchen?.fillings?.length ||
                    (product as any).kitchen?.toppings?.length) && (
                        <div className="md:col-span-2 border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                            <div className="text-xs font-medium text-yellow-700 mb-2 uppercase tracking-wide">
                                Legacy kitchen fields detected
                            </div>

                            <pre className="text-xs text-yellow-900 whitespace-pre-wrap break-all overflow-x-auto">
                                {JSON.stringify({
                                    wrapper: (product as any).kitchen?.wrapper,
                                    fillings: (product as any).kitchen?.fillings,
                                    toppings: (product as any).kitchen?.toppings,
                                }, null, 2)}
                            </pre>
                        </div>
                    )}

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