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
  id: string
  name: string
  quantity: number
  unit: Unit
}

export type Product = {
  allergens: never[]
  id: string
  name: string
  description: string
  preparation: string
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
  productType: 'ingredientBased' | 'directCost'
  preparationVideoUrl?: string;
  imageUrls: string[];
  quantity: number
  featured?: boolean
}

// In your types file (types.ts)
export type Purchase = {
  id: string
  purchaseType: 'ingredient' | 'supply'
  ingredientId: string
  ingredientName: string
  supplyName?: string
  supplyCategory?: 'packaging' | 'cleaning' | 'delivery' | 'office' | 'other'
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

export interface SaleProduct {
  id: string
  name: string
  quantity: number
  salePrice: number
  originalPrice: number
  costPrice?: number
}

export interface SalesRecord {
  id: string
  orderId: string
  products: SaleProduct[]
  subtotal: number
  discountAmount?: number
  taxes?: {
    gst: number
    qst: number
    total: number
  }
  totalAmount: number
  costTotal?: number
  profitTotal?: number
  saleDate: string
  createdAt: string | Date
  customerName: string
  customerEmail: string
  saleType: string
  paymentStatus: string
  lowStockFlag: boolean
  stripeSessionId?: string
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

// New types for enhanced functionality
export type ProductVariant = {
  id: string
  productId: string
  name: string // e.g., "Small", "Large", "Spicy"
  priceAdjustment: number // positive or negative adjustment from base price
  costAdjustment?: number
  isActive: boolean
}

export type RecipeStep = {
  stepNumber: number
  description: string
  duration?: number // in minutes
  ingredients?: ProductIngredient[] // ingredients added at this step
}

export type ProductRecipe = {
  id: string
  productId: string
  steps: RecipeStep[]
  totalPreparationTime: number
  yield: string // e.g., "4 servings", "500g"
  notes?: string
}

export type InventoryAlert = {
  id: string
  ingredientId: string
  alertType: 'low_stock' | 'out_of_stock' | 'expiring_soon'
  currentStock: number
  minimumStock: number
  alertDate: string
  isResolved: boolean
  resolvedDate?: string
}

export type ProductPerformance = {
  productId: string
  productName: string
  totalSales: number
  totalRevenue: number
  profitContribution: number
  averageRating?: number
  salesTrend: 'increasing' | 'decreasing' | 'stable'
}

export type Customer = {
  id: string
  name: string
  email?: string
  phone?: string
  customerType: 'walk_in' | 'regular' | 'wholesale'
  preferences?: string[]
  totalSpent: number
  lastVisit?: string
  createdAt: string
}

export type Order = {
  id: string
  customerId?: string
  items: OrderItem[]
  totalAmount: number
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  orderType: 'dine_in' | 'takeaway' | 'delivery'
  orderDate: string
  completedDate?: string
  notes?: string
  createdAt: string
}

export type OrderItem = {
  productId: string
  variantId?: string
  quantity: number
  unitPrice: number
  specialInstructions?: string
}

export type Payment = {
  id: string
  orderId: string
  amount: number
  paymentMethod: 'cash' | 'card' | 'digital_wallet'
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  transactionId?: string
  paymentDate: string
  createdAt: string
}

export type Table = {
  id: string
  number: number
  capacity: number
  status: 'available' | 'occupied' | 'reserved' | 'cleaning'
  currentOrderId?: string
  location: string // 'indoor', 'outdoor', 'bar'
}

// Analytics and Reporting Types
export type SalesReport = {
  period: string
  dateRange: {
    start: string
    end: string
  }
  totalRevenue: number
  totalOrders: number
  averageOrderValue: number
  topProducts: ProductPerformance[]
  salesByCategory: Array<{
    category: string
    revenue: number
    orders: number
  }>
  salesByHour?: Array<{
    hour: number
    revenue: number
    orders: number
  }>
}

export type InventoryReport = {
  generatedAt: string
  totalIngredients: number
  lowStockItems: number
  outOfStockItems: number
  totalInventoryValue: number
  stockTurnoverRate: number
  wastageThisMonth: number
  upcomingExpirations: Array<{
    ingredientId: string
    ingredientName: string
    expiryDate: string
    quantity: number
  }>
}

export type FinancialReport = {
  period: string
  dateRange: {
    start: string
    end: string
  }
  revenue: {
    total: number
    productSales: number
    otherIncome: number
  }
  expenses: {
    total: number
    ingredientCosts: number
    labor: number
    rent: number
    utilities: number
    other: number
  }
  netProfit: number
  profitMargin: number
  breakEvenAnalysis: BreakEvenAnalysis
}

export interface MenuItem {
  id: string
  name: string
  description: string
  preparation: string
  price: number
  image: string
  category: string
  videoUrl?: string
  ingredients: string[]
  allergens: string[]
  preparationTime: number
  spicyLevel: 0 | 1 | 2 | 3
  popular: boolean;
  quantity: number;
}

export interface WebProduct {
  id?: string
  name: string
  description: string
  price: number
  imageUrl: string
  category: string
  isActive: boolean
  sortOrder: number
  costPrice?: number
  sellingPrice?: number
  profitMargin?: number
  portionSize?: string
  preparationTime?: number
  tags?: string[]
  productType?: 'ingredientBased' | 'directCost'
  ingredients?: ProductIngredient[];
  featured?: boolean
}

export interface ClientProfile {
  id: string
  firebase_uid: string
  email: string
  full_name: string
  phone?: string
  created_at: string
  updated_at: string
  total_points: number
  current_tier: string
}