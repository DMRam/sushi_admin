export function normalizeDescription(desc: any): { en: string; fr: string; es: string } {
  if (!desc) return { en: '', fr: '', es: '' }
  if (typeof desc === 'string') return { en: desc, fr: '', es: '' }

  return {
    en: typeof desc.en === 'string' ? desc.en : '',
    fr: typeof desc.fr === 'string' ? desc.fr : '',
    es: typeof desc.es === 'string' ? desc.es : '',
  }
}

export function normalizeDate(v: any): Date {
  if (v?.toDate) return v.toDate()
  if (typeof v === 'string') {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? new Date() : d
  }
  if (v instanceof Date) return v
  return new Date()
}

export function formatPrice(price: number | undefined): string {
  if (typeof price !== 'number' || Number.isNaN(price)) return '$0.00'
  return `$${price.toFixed(2)}`
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function safeLower(s: any) {
  return String(s ?? '').toLowerCase()
}

export function productSearchText(p: any) {
  const desc = p?.description ?? {}
  const descAll = [desc.en, desc.fr, desc.es].filter(Boolean).join(' ')
  const tags = Array.isArray(p?.tags) ? p.tags.join(' ') : ''

  const ingredientText = Array.isArray(p?.ingredients)
    ? p.ingredients
        .map((ing: any) => {
          if (typeof ing === 'string') return ing
          if (ing && typeof ing === 'object') return ing.name || ''
          return ''
        })
        .filter(Boolean)
        .join(' ')
    : ''

  const kitchen = p?.kitchen ?? {}
  const kitchenText = [
    kitchen.outerWrap,
    kitchen.wrapper,
    ...(Array.isArray(kitchen.innerIngredients) ? kitchen.innerIngredients : []),
    ...(Array.isArray(kitchen.fillings) ? kitchen.fillings : []),
    ...(Array.isArray(kitchen.finishes) ? kitchen.finishes : []),
    ...(Array.isArray(kitchen.toppings) ? kitchen.toppings : []),
    ...(Array.isArray(kitchen.sauces) ? kitchen.sauces : []),
    kitchen.displayNameKitchen,
    kitchen.notes,
  ]
    .filter(Boolean)
    .join(' ')

  return [
    p?.name,
    p?.category,
    tags,
    descAll,
    ingredientText,
    kitchenText,
  ]
    .filter(Boolean)
    .join(' ')
}

export function truncateText(text: string | undefined, maxLength = 80): string {
  if (!text || !text.trim()) return 'No description'
  const clean = text.trim()
  if (clean.length <= maxLength) return clean
  return clean.slice(0, maxLength - 1).trimEnd() + '…'
}

export function getDescription(product: any, preferredLanguage: string = 'en'): string {
  const desc = product?.description ?? { en: '', fr: '', es: '' }

  if (desc?.[preferredLanguage]?.trim()) return desc[preferredLanguage]
  if (desc?.en?.trim()) return desc.en

  const available = ['en', 'fr', 'es'].find((lang) => desc?.[lang]?.trim())
  if (available) return desc[available]

  return 'No description'
}

export function getDescriptionForTitle(product: any): string {
  const desc = product?.description ?? {}
  const lines: string[] = []

  ;(['en', 'fr', 'es'] as const).forEach((lang) => {
    const v = desc?.[lang]
    if (typeof v === 'string' && v.trim()) lines.push(`${lang.toUpperCase()}: ${v}`)
  })

  return lines.join('\n') || 'No description'
}