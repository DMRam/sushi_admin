import type { PurchaseLocale } from './purchaseTypes'

export function resolvePurchaseLocale(language?: string): PurchaseLocale {
  if (language?.startsWith('fr')) return 'fr-CA'
  if (language?.startsWith('es')) return 'es'
  return 'en-CA'
}

export function formatMoney(
  value: number | null | undefined,
  locale: PurchaseLocale = 'fr-CA'
) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'CAD',
  }).format(Number(value ?? 0))
}

export function formatDate(value: string, locale: PurchaseLocale = 'fr-CA') {
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat(locale).format(date)
}