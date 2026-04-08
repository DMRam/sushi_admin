export type TableOrderStatus =
    | 'draft'
    | 'sent_to_kitchen'
    | 'preparing'
    | 'ready_for_pickup'
    | 'delivered'
    | 'paid'


export type KitchenStatus =
    | 'pending'
    | 'preparing'
    | 'ready'
    | 'delivered'
export type PaymentStatus = 'pending' | 'paid' | 'voided'
export type PaymentMethod = 'cash' | 'card' | 'clover'
export type CloverStatus = 'not_sent' | 'sent' | 'matched' | 'failed'
export type SeatType = 'person' | 'shared'

export interface ProductDescription {
    en?: string
    es?: string
    fr?: string
}

export interface ProductKitchenInfo {
    containsCheese?: boolean
    requiresFrying?: boolean
    preparationTime?: number

    displayNameKitchen?: string
    innerIngredients?: string[]
    protein?: string[]
    sauces?: string[]
    finishes?: string[]
    allergens?: string[]
}

export interface ProductItem {
    id: string
    name: string
    category: string
    description?: ProductDescription
    imageUrls?: string[]
    isActive: boolean
    sellingPrice: number
    sortOrder?: number
    kitchen?: ProductKitchenInfo
}

export interface TableOrderSeatItem {
    productId: string
    productName: string
    category?: string
    quantity: number
    unitPrice: number
    imageUrl?: string | null
    notes?: string
    description?: string
    itemStatus?: 'pending' | 'preparing' | 'ready'
    kitchen?: ProductKitchenInfo
}

export interface TableOrderSeat {
    id: string
    type: SeatType
    label: string
    personNumber?: number
    items: TableOrderSeatItem[]
}

export type TableOrder = {
    id: string
    tableNumber: string
    guestCount: number
    orderNumber: string
    cloverRef: string | null
    status: 'draft' | 'sent_to_kitchen' | 'preparing' | 'ready_for_pickup' | 'delivered' | 'paid'
    kitchenStatus: 'pending' | 'preparing' | 'ready' | 'delivered'
    paymentStatus: 'pending' | 'paid'
    paymentMethod: 'cash' | 'card' | 'clover' | null
    cloverStatus: 'not_sent' | 'matched' | 'sent' | 'error'
    seats: TableOrderSeat[]
    subtotal: number
    taxes: number
    total: number
    totalItems: number

    kitchenCallCount?: number
    pickupCallCount?: number

    createdAt?: any
    updatedAt?: any
    sentToKitchenAt?: any
    kitchenStartedAt?: any
    readyForPickupAt?: any
    deliveredAt?: any
    paidAt?: any
}