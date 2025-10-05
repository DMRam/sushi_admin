export type Unit = 'kg' | 'g' | 'ml' | 'l' | 'unit'

export type Ingredient = {
  id: string
  name: string
  pricePerKg: number
  unit: Unit
  category: string
  supplier?: string
  minimumStock: number
  currentStock: number
  createdAt: string
  stockGrams: number
}

export type ProductIngredient = {
  ingredientId: string
  quantity: number
  unit: Unit
}

export type Product = {
  id: string
  name: string
  description: string
  ingredients: ProductIngredient[]
  costPrice?: number
  sellingPrice?: number
  profitMargin?: number
  category: string
  portionSize: string
  preparationTime?: number 
  isActive?: boolean  
  tags?: string[]  
  createdAt: string
}

export type Purchase = {
  id: string
  ingredientId: string
  quantity: number
  unit: Unit
  totalCost: number
  pricePerKg: number
  supplier: string
  purchaseDate: string
  deliveryDate?: string
  invoiceNumber?: string
  notes?: string
  createdAt: string
  quantityGrams: number
}

export type Supplier = {
  id: string
  name: string
  contactPerson: string
  phone: string
  email: string
  address: string
  specialty: string // seafood, vegetables, etc.
  rating: number // 1-5
  isActive: boolean
  createdAt: string
}

export type MenuCategory = {
  id: string
  name: string
  description: string
  displayOrder: number
  isActive: boolean
}

export type DailySpecial = {
  id: string
  productId: string
  discountPercentage: number
  startDate: string
  endDate: string
  isActive: boolean
}

export type WasteRecord = {
  id: string
  ingredientId: string
  quantity: number
  unit: Unit
  reason: string // spoilage, preparation, etc.
  date: string
  cost: number
  notes?: string
}

// Add these to your existing types
export type SalesRecord = {
  id: string
  productId: string
  quantity: number
  salePrice: number
  saleDate: string
  createdAt: string
}

export type BusinessExpense = {
  id: string
  name: string
  amount: number
  category: string // rent, utilities, salaries, marketing, etc.
  date: string
  recurring: boolean // monthly recurring expense
  notes?: string
  createdAt: string
}

export type BreakEvenAnalysis = {
  fixedCosts: number
  variableCostPerUnit: number
  sellingPricePerUnit: number
  breakEvenUnits: number
  breakEvenRevenue: number
  marginOfSafety?: number
}

// Add these types
export type TaxSettings = {
  taxRate: number // percentage
  taxType: 'income' | 'vat' | 'both'
  vatRate?: number
}

export type ProfitAllocation = {
  id: string
  month: string // YYYY-MM
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  allocations: {
    taxes: number
    reinvestment: number
    ownerPay: number
    emergencyFund: number
  }
  createdAt: string
}