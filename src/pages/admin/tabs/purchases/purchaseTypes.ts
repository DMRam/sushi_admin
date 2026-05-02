export type PurchaseSource = 'app' | 'n8n' | 'import'
export type PurchaseStatus = 'draft' | 'recorded' | 'validated'
export type PurchaseLocale = 'fr-CA' | 'en-CA' | 'es'
export type PurchasePaymentStatus = 'paid' | 'unpaid'

export type MappingStatus = 'mapped' | 'pending' | 'ignored'

export type PurchaseItem = {
    id?: string

    name: string
    rawName?: string

    ingredientId?: string | null
    ingredientName?: string | null

    category?: string | null
    quantity: number
    unit?: string | null
    unitPrice: number
    lineTotal: number

    mappingStatus?: MappingStatus
}

export type PurchaseRecord = {
    id: string

    source: PurchaseSource
    status: PurchaseStatus
    locale: PurchaseLocale
    purchaseDate: string

    supplierName: string
    supplierAddress?: string | null

    paymentStatus: PurchasePaymentStatus
    paymentTerms?: string | null
    paymentAccount?: string | null

    invoiceNumber?: string | null
    notes?: string | null
    currency: 'CAD'

    subtotal: number
    taxes: number
    total: number

    items: PurchaseItem[]

    attachmentUrl?: string | null
    externalRef?: string | null

    imageUrl?: string | null
    imageUrls?: string[]

    createdAt?: any
    updatedAt?: any
}