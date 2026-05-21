import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
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
    const margin =
        product.price && product.price > 0
            ? (((product.price - (product.costPrice || 0)) / product.price) * 100).toFixed(0)
            : '0'

    return (
        <div className="space-y-5">
            <div className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E62B2B]">
                            {product.id ? 'Edit product' : 'New product'}
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                            {product.name || 'Untitled menu item'}
                        </h3>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            Update catalog fields used by ordering, featured sections, and kitchen preparation.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
                        <SummaryTile label="Price" value={`$${(product.price || 0).toFixed(2)}`} />
                        <SummaryTile label="Margin" value={`${margin}%`} />
                        <SummaryTile label="Status" value={product.isActive ? 'Live' : 'Hidden'} dark />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-5">
                    <FormSection title="Core details" description="Name, pricing, category, timing, and sorting.">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field label="Product Name" className="md:col-span-2">
                                <input
                                    type="text"
                                    value={product.name}
                                    onChange={(e) => onChange({ ...product, name: e.target.value })}
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Selling Price ($)">
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
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Cost Price ($)">
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
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Category">
                                <input
                                    type="text"
                                    value={product.category}
                                    onChange={(e) => onChange({ ...product, category: e.target.value })}
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Portion Size">
                                <input
                                    type="text"
                                    value={product.portionSize || ''}
                                    onChange={(e) => onChange({ ...product, portionSize: e.target.value })}
                                    className={inputClass}
                                    placeholder="200g bowl"
                                />
                            </Field>

                            <Field label="Preparation Time (min)">
                                <input
                                    type="number"
                                    min="0"
                                    value={product.preparationTime || 0}
                                    onChange={(e) => onChange({ ...product, preparationTime: parseInt(e.target.value) || 0 })}
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Sort Order">
                                <input
                                    type="number"
                                    value={product.sortOrder}
                                    onChange={(e) => onChange({ ...product, sortOrder: parseInt(e.target.value) || 0 })}
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Tags" className="md:col-span-2">
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
                                    className={inputClass}
                                    placeholder="Popular, Spicy, Vegan"
                                />
                                <p className="mt-1 text-xs text-slate-500">Separate tags with commas.</p>
                            </Field>
                        </div>
                    </FormSection>

                    <FormSection title="Descriptions" description="Keep the public menu clear in all supported languages.">
                        <div className="space-y-4">
                            <Field label="Quick Fill">
                                <textarea
                                    value={description.en}
                                    onChange={(e) => handleSingleDescriptionChange(e.target.value)}
                                    rows={2}
                                    className={textareaClass}
                                    placeholder="Enter description to set for all languages"
                                />
                            </Field>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                <Field label="English">
                                    <textarea
                                        value={description.en}
                                        onChange={(e) => handleDescriptionChange('en', e.target.value)}
                                        rows={4}
                                        className={textareaClass}
                                        placeholder="English description"
                                    />
                                </Field>

                                <Field label="French">
                                    <textarea
                                        value={description.fr}
                                        onChange={(e) => handleDescriptionChange('fr', e.target.value)}
                                        rows={4}
                                        className={textareaClass}
                                        placeholder="Description francaise"
                                    />
                                </Field>

                                <Field label="Spanish">
                                    <textarea
                                        value={description.es}
                                        onChange={(e) => handleDescriptionChange('es', e.target.value)}
                                        rows={4}
                                        className={textareaClass}
                                        placeholder="Descripcion en espanol"
                                    />
                                </Field>
                            </div>
                        </div>
                    </FormSection>

                    <FormSection title="Media" description="Use one clean product image for the website and ordering flow.">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                            <div className="md:col-span-8">
                                <Field label="Image URL">
                                    <input
                                        type="url"
                                        value={product.imageUrl}
                                        onChange={(e) => onChange({ ...product, imageUrl: e.target.value })}
                                        className={inputClass}
                                        placeholder="https://example.com/image.jpg"
                                    />
                                    <p className="mt-1 text-xs text-slate-500">Paste an image URL or upload a file.</p>
                                </Field>
                            </div>

                            <div className="md:col-span-4">
                                <Field label="Upload image">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0]
                                            if (f) void handleImageFileUpload(f)
                                            e.currentTarget.value = ''
                                        }}
                                        className="block w-full text-sm text-slate-600 file:mr-3 file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800 disabled:opacity-50"
                                        disabled={uploading}
                                    />

                                    {uploading && <div className="mt-2 text-xs text-slate-500">Uploading...</div>}
                                    {uploadError && <div className="mt-2 text-xs text-red-600">{uploadError}</div>}
                                </Field>
                            </div>
                        </div>

                        {product.imageUrl?.trim() && (
                            <div className="mt-4">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                    Preview
                                </div>
                                <img
                                    src={product.imageUrl}
                                    alt={product.name || 'Product image'}
                                    className="h-40 w-40 border border-slate-200 object-cover"
                                    onError={() => setUploadError('Image URL is not valid or cannot be loaded.')}
                                />
                            </div>
                        )}
                    </FormSection>

                    <FormSection title="Kitchen and ingredients" description="Operational fields for prep, assembly, and kitchen visibility.">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field label="Ingredients" className="md:col-span-2">
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
                                    className={inputClass}
                                    placeholder="Shrimp, Avocado, Cream Cheese"
                                />
                            </Field>

                            <Field label="Kitchen Name">
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
                                    className={inputClass}
                                    placeholder="SUMOOKU AVOCADO"
                                />
                            </Field>

                            <Field label="Outer Wrap">
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
                                    className={inputClass}
                                    placeholder="avocat / saumon / massago"
                                />
                            </Field>

                            <Field label="Inner Ingredients" className="md:col-span-2">
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
                                    className={inputClass}
                                    placeholder="saumon_fume, fromage_creme, ciboulette"
                                />
                            </Field>

                            <Field label="Finishes">
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
                                    className={inputClass}
                                    placeholder="oignon_frit, massago"
                                />
                            </Field>

                            <Field label="Sauces">
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
                                    className={inputClass}
                                    placeholder="teriyaki"
                                />
                            </Field>

                            <Field label="Kitchen Notes" className="md:col-span-2">
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
                                    className={textareaClass}
                                    placeholder="Use cheese lightly. Premium seafood profile."
                                />
                            </Field>

                            <CheckboxField
                                id="containsCheese"
                                checked={!!kitchen.containsCheese}
                                label="Contains cheese"
                                onChange={(checked) =>
                                    onChange({
                                        ...product,
                                        kitchen: {
                                            ...(product as any).kitchen,
                                            containsCheese: checked,
                                        },
                                    } as any)
                                }
                            />

                            <CheckboxField
                                id="requiresFrying"
                                checked={!!kitchen.requiresFrying}
                                label="Requires frying"
                                onChange={(checked) =>
                                    onChange({
                                        ...product,
                                        kitchen: {
                                            ...(product as any).kitchen,
                                            requiresFrying: checked,
                                        },
                                    } as any)
                                }
                            />
                        </div>

                        <details className="mt-5 border border-dashed border-slate-300 bg-slate-50 p-4">
                            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Raw Kitchen Object
                            </summary>
                            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs text-slate-700">
                                {JSON.stringify((product as any).kitchen || {}, null, 2)}
                            </pre>
                        </details>

                        {((product as any).kitchen?.wrapper ||
                            (product as any).kitchen?.fillings?.length ||
                            (product as any).kitchen?.toppings?.length) && (
                            <details className="mt-4 border border-yellow-200 bg-yellow-50 p-4">
                                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-yellow-700">
                                    Legacy kitchen fields detected
                                </summary>
                                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs text-yellow-900">
                                    {JSON.stringify(
                                        {
                                            wrapper: (product as any).kitchen?.wrapper,
                                            fillings: (product as any).kitchen?.fillings,
                                            toppings: (product as any).kitchen?.toppings,
                                        },
                                        null,
                                        2
                                    )}
                                </pre>
                            </details>
                        )}
                    </FormSection>
                </div>

                <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
                    <div className="border border-slate-200 bg-white p-4 shadow-sm">
                        <h4 className="text-sm font-semibold text-slate-950">Publishing</h4>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            Control website visibility and landing-page promotion.
                        </p>

                        <div className="mt-4 space-y-3">
                            <CheckboxField
                                id="productActive"
                                checked={product.isActive}
                                label="Visible to customers"
                                onChange={(checked) => onChange({ ...product, isActive: checked })}
                            />

                            <CheckboxField
                                id="productFeatured"
                                checked={product.featured || false}
                                label="Featured on landing page"
                                onChange={(checked) => onChange({ ...product, featured: checked })}
                            />
                        </div>
                    </div>

                    <div className="border border-slate-200 bg-white p-4 shadow-sm">
                        <h4 className="text-sm font-semibold text-slate-950">Save changes</h4>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            Saving updates the existing Firebase product document.
                        </p>

                        <div className="mt-4 flex flex-col gap-2">
                            <button
                                onClick={onSave}
                                disabled={loading}
                                className={`px-5 py-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950/10 ${
                                    loading
                                        ? 'cursor-not-allowed bg-slate-300 text-white'
                                        : 'bg-slate-950 text-white hover:bg-slate-800'
                                }`}
                            >
                                {loading ? 'Saving...' : 'Save Product'}
                            </button>

                            <button
                                onClick={onCancel}
                                className="border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    )
}

const inputClass =
    'w-full border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10'

const textareaClass =
    'w-full border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10'

function SummaryTile({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
    return (
        <div className={dark ? 'border border-slate-200 bg-slate-950 px-3 py-3' : 'border border-slate-200 bg-slate-50 px-3 py-3'}>
            <div className={dark ? 'text-lg font-semibold text-white' : 'text-lg font-semibold text-slate-950'}>{value}</div>
            <div className={dark ? 'text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55' : 'text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500'}>
                {label}
            </div>
        </div>
    )
}

function FormSection({
    title,
    description,
    children,
}: {
    title: string
    description: string
    children: ReactNode
}) {
    return (
        <section className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 border-b border-slate-100 pb-3">
                <h4 className="text-base font-semibold text-slate-950">{title}</h4>
                <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
            </div>
            {children}
        </section>
    )
}

function Field({
    label,
    className = '',
    children,
}: {
    label: string
    className?: string
    children: ReactNode
}) {
    return (
        <label className={`block ${className}`}>
            <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
            {children}
        </label>
    )
}

function CheckboxField({
    id,
    checked,
    label,
    onChange,
}: {
    id: string
    checked: boolean
    label: string
    onChange: (checked: boolean) => void
}) {
    return (
        <label htmlFor={id} className="flex items-center gap-3 border border-slate-200 bg-slate-50 px-3 py-3">
            <input
                type="checkbox"
                id={id}
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="h-4 w-4 border-slate-300 text-slate-950 focus:ring-slate-950/10"
            />
            <span className="text-sm font-medium text-slate-700">{label}</span>
        </label>
    )
}
