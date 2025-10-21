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

export interface ProfitAllocationComponentProps {
    fmtCurrency: (v: number, digits?: number) => string;
    currentMonthFinancials: {
        totalRevenue: number;
        monthlyExpenses: number;
        cogs: number;
        grossProfit: number;
        netProfit: number;
        salesCount: number;
    };
    allocationSettings: {
        taxRate: number;
        reinvestmentPercentage: number;
        ownerPayPercentage: number;
        emergencyFundPercentage: number;
        monthlyOwnerSalary: number;
        useFixedSalary: boolean;
    };
    setAllocationSettings: (value: React.SetStateAction<{
        taxRate: number;
        reinvestmentPercentage: number;
        ownerPayPercentage: number;
        emergencyFundPercentage: number;
        monthlyOwnerSalary: number;
        useFixedSalary: boolean;
    }>) => void;
    updatePercentage: (key: string, value: number) => void;
    totalPercentage: number;
    handleSaveAllocation: () => Promise<void>
    saving: boolean;
    profitAllocation: {
        taxes: number;
        reinvestment: number;
        ownerPay: number;
        emergencyFund: number;
        remaining: number;
    };
    totalAllocated: number
}