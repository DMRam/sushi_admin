import type { ProductDetailsProps } from "../../../../../../types/form_types"

type LocaleKey = 'fr' | 'en' | 'es'

const locales: Array<{
    key: LocaleKey
    label: string
    hint: string
    placeholder: string
}> = [
    {
        key: 'fr',
        label: 'Français',
        hint: 'Primary storefront language.',
        placeholder: 'Description du produit en français...',
    },
    {
        key: 'en',
        label: 'English',
        hint: 'Shown when customers switch to English.',
        placeholder: 'Product description in English...',
    },
    {
        key: 'es',
        label: 'Español',
        hint: 'Shown when customers switch to Spanish.',
        placeholder: 'Descripción del producto en español...',
    },
]

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
    return (
        <span className="mb-1.5 block">
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">{label}</span>
            {hint && <span className="block text-xs leading-4 text-slate-500">{hint}</span>}
        </span>
    )
}

export const ProductDetails = ({ formData, setFormData }: ProductDetailsProps) => {
    const initializeDescription = () => {
        if (typeof formData.description === 'string') {
            return {
                fr: '',
                en: formData.description,
                es: '',
            }
        }

        return formData.description || { fr: '', en: '', es: '' }
    }

    const currentDescription = initializeDescription()
    const completedLocales = locales.filter((locale) => currentDescription[locale.key]?.trim()).length

    const handleDescriptionChange = (language: LocaleKey, value: string) => {
        setFormData({
            ...formData,
            description: {
                ...currentDescription,
                [language]: value,
            },
        })
    }

    return (
        <section className="overflow-hidden rounded-2xl border border-[#f0dfd8] bg-white shadow-sm">
            <div className="border-b border-[#f0dfd8] bg-[#fffaf7] p-4 sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f45f4f]">Product details</p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-950">Storefront information</h3>
                    </div>
                    <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${completedLocales === locales.length
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                        }`}>
                        {completedLocales}/{locales.length} locales
                    </span>
                </div>
            </div>

            <div className="space-y-5 p-4 sm:p-5">
                <div className="grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
                    <label>
                        <FieldLabel label="Product name" hint="Single customer-facing name used across the menu and checkout." />
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="h-12 w-full rounded-xl border border-[#eadbd4] bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#fb6a57] focus:ring-2 focus:ring-[#fb6a57]/20"
                            placeholder="e.g., Maki saumon avocat"
                            required
                        />
                    </label>

                    <label>
                        <FieldLabel label="Menu category" hint="Used for filtering and grouping products." />
                        <input
                            type="text"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="h-12 w-full rounded-xl border border-[#eadbd4] bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#fb6a57] focus:ring-2 focus:ring-[#fb6a57]/20"
                            placeholder="e.g., Makis, Entrées, Boissons"
                        />
                    </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                        className={`rounded-2xl border p-4 text-left transition ${
                            formData.isActive
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                                : 'border-amber-200 bg-amber-50 text-amber-900'
                        }`}
                    >
                        <span className="block text-xs font-semibold uppercase tracking-[0.14em]">
                            Visibility
                        </span>
                        <span className="mt-1 block text-base font-semibold">
                            {formData.isActive ? 'Active on menu' : 'Hidden from menu'}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                            Tap to switch between visible and hidden.
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, featured: !formData.featured })}
                        className={`rounded-2xl border p-4 text-left transition ${
                            formData.featured
                                ? 'border-blue-200 bg-blue-50 text-blue-900'
                                : 'border-slate-200 bg-slate-50 text-slate-700'
                        }`}
                    >
                        <span className="block text-xs font-semibold uppercase tracking-[0.14em]">
                            Merchandising
                        </span>
                        <span className="mt-1 block text-base font-semibold">
                            {formData.featured ? 'Featured item' : 'Standard item'}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                            Use featured for popular or promoted products.
                        </span>
                    </button>
                </div>

                <div>
                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Localized descriptions</p>
                            <p className="text-xs text-slate-500">Fill all three so the storefront stays consistent in FR, EN, and SP.</p>
                        </div>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-3">
                        {locales.map((locale) => {
                            const hasValue = Boolean(currentDescription[locale.key]?.trim())

                            return (
                                <label key={locale.key} className="block rounded-2xl border border-[#eadbd4] bg-[#fffaf7] p-3">
                                    <div className="mb-2 flex items-start justify-between gap-3">
                                        <div>
                                            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">{locale.label}</span>
                                            <span className="block text-xs text-slate-500">{locale.hint}</span>
                                        </div>
                                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${hasValue
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : 'border-amber-200 bg-amber-50 text-amber-700'
                                            }`}>
                                            {hasValue ? 'Ready' : 'Missing'}
                                        </span>
                                    </div>
                                    <textarea
                                        value={currentDescription[locale.key]}
                                        onChange={(e) => handleDescriptionChange(locale.key, e.target.value)}
                                        className="min-h-28 w-full resize-y rounded-xl border border-[#eadbd4] bg-white px-3 py-2 text-sm leading-5 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#fb6a57] focus:ring-2 focus:ring-[#fb6a57]/20"
                                        placeholder={locale.placeholder}
                                    />
                                </label>
                            )
                        })}
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <label>
                        <FieldLabel label="Preparation time" hint="Minutes shown to customers and staff." />
                        <input
                            type="number"
                            min="0"
                            value={formData.preparationTime}
                            onChange={(e) => setFormData({ ...formData, preparationTime: e.target.value })}
                            className="h-12 w-full rounded-xl border border-[#eadbd4] bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#fb6a57] focus:ring-2 focus:ring-[#fb6a57]/20"
                            placeholder="15"
                        />
                    </label>

                    <label>
                        <FieldLabel label="Portion size" hint="Short size shown internally and in product cards." />
                        <input
                            type="text"
                            value={formData.portionSize}
                            onChange={(e) => setFormData({ ...formData, portionSize: e.target.value })}
                            className="h-12 w-full rounded-xl border border-[#eadbd4] bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#fb6a57] focus:ring-2 focus:ring-[#fb6a57]/20"
                            placeholder="e.g., 8 pcs, 500 ml"
                        />
                    </label>

                    <label>
                        <FieldLabel label="Tags" hint="Comma separated, for search and merchandising." />
                        <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            className="h-12 w-full rounded-xl border border-[#eadbd4] bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#fb6a57] focus:ring-2 focus:ring-[#fb6a57]/20"
                            placeholder="spicy, popular, seasonal"
                        />
                    </label>
                </div>
            </div>
        </section>
    )
}
