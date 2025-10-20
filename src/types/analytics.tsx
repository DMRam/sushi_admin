// types/analytics.ts
export interface PurchaseAnalytics {
    totalSpent: number
    orderCount: number
    averageOrderValue: number
    favoriteItems: string[]
    purchaseHistory: PurchaseRecord[]
    monthlyTrends: TrendData[]
}

export interface PurchaseRecord {
    date: string
    amount: number
    items: string[]
}

export interface TrendData {
    month: string
    purchases: number
    revenue: number
}