export interface ZapierPayload {
    order_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string
    delivery_address:string

    customer_info_name?: string;
    shipping_name?: string;

    total: number;
    created_at: string;

    items: Array<{
        id: string;
        name: string;
        price: number;
        quantity: number;
    }>;

    status: string;
    currency?: string;
    subtotal?: number;
    tax?: number;
    shipping?: number;
    delivery_type?: 'delivery' | 'pickup';
}
