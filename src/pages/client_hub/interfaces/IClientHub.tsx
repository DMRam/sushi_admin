import type { Dispatch, SetStateAction } from "react"
import type { ClientProfile } from "../../../types/types"

export interface PointsHistoryItem {
    id: string
    points: number
    description: string
    type: string
    transaction_type: string
    created_at: string
    order_id?: string
}

export interface OrderItem {
    id: string
    name: string
    quantity: number
    price: number
    productId: string
    image?: string
    category?: string
}

// export interface OrderDetails {
//     id: string
//     items: OrderItem[]
//     totals: {
//         subtotal: number
//         gst: number
//         qst: number
//         deliveryFee: number
//         finalTotal: number
//     }
//     created_at: string
//     status: string
//     type: 'delivery' | 'pickup'
//     delivery_address?: string
// }
export interface OrderDetails {
    id: string;

    // Totals
    amount: number;
    subtotal: number;
    gst: number;
    qst: number;
    delivery_fee: number;
    final_total: number;

    totals: {
        subtotal: number
        gst: number
        qst: number
        deliveryFee: number
        finalTotal: number
    }

    // Order metadata
    created_at: string;
    status?: string;
    delivery_type?: 'delivery' | 'pickup';
    type: 'delivery' | 'pickup'

    // Items
    items: Array<{
        id?: string;        // productId in Firestore
        name: string;
        price: number;
        quantity: number;
    }>;

    // Customer info (REAL Firestore structure)
    customerInfo?: {
        name?: string;
        email?: string;
        phone?: string;
        address?: string;
        city?: string;
        province?: string;
        zipCode?: string;
    };

    // Shipping info (REAL Firestore structure)
    shippingAddress?: {
        name?: string;
        address?: {
            line1?: string;
            line2?: string | null;
            city?: string;
            postal_code?: string;
            state?: string;
            country?: string;
        };
    };

    // LEGACY fields used by old code — keep optional
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    delivery_address?: string;
}


export interface SpecialOffer {
    id: string
    title: string
    description: string
    discount_percentage: number
    valid_until: string
    min_order_amount: number
    code: string
    image_url?: string
}

export interface QuickReorderItem {
    productId: string
    name: string
    price: number
    image?: string
    lastOrdered: string
    orderCount: number
}


// ======== Rewards ========

export interface ProfileTabProps {
    clientProfile: ClientProfile | null
    formatCurrency: (amount: number) => string;
    stats: {
        totalSpent: number;
        averageOrder: number;
        favoriteCategory: string;
        monthlyOrders: number;
    }
    loadingData: boolean;
    activeTab: string;
    setActiveTab: (tab: string) => void
    recentOrders: OrderDetails[];
    pointsHistory: PointsHistoryItem[];
    formatDate: (dateString: string) => string;
    quickReorderItems: QuickReorderItem[]
    setClientProfile: Dispatch<SetStateAction<ClientProfile | null>>
}