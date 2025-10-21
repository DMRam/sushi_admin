export interface CheckoutResponse {
    success: boolean;
    sessionId: string;
    url: string;
    error?: string;
}

export interface CashOrderResponse {
    success: boolean;
    orderId: string;
    error?: string;
}

export interface CartItemRequest {
    productId: string;
    name: string;
    description: string;
    category: string;
    sellingPrice: number;
    costPrice?: number;
    profitMargin?: number;
    quantity: number;
    imageUrls: string[];
    ingredients: any[];
    preparationTime?: number;
    allergens: string[];
    tags: string[];
}

export interface CustomerInfo {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zipCode: string;
    deliveryInstructions: string;
    province: string;
}

export interface Totals {
    subtotal: number;
    gst: number;
    qst: number;
    deliveryFee: number;
    finalTotal: number;
}