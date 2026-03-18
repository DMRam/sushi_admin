export interface ProductDescription {
  en?: string
  fr?: string
  es?: string
}

export interface KitchenInfo {
  station?: string
  wrapper?: string
  rice?: boolean
  fillings?: string[]
  toppings?: string[]
  sauces?: string[]
  garnish?: string[]
  steps?: string[]
  notes?: string
  pieces?: number
  prepTimeMin?: number
}

export interface WebProduct {
  id: string
  name: string
  category?: string
  description?: ProductDescription
  imageUrls?: string[]
  isActive?: boolean
  sortOrder?: number
  kitchen?: KitchenInfo
}