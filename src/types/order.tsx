export interface Order {
  id: string;
  createdAt: any;
  status: string;
  customerInfo?: {
    name: string;
    address: string;
    city: string;
    phone: string;
    email: string;
  };
  items?: Array<{
    productId: string;
    name: string;
    quantity: number;
    category: string;
    price: number;
    sellingPrice: number;
  }>;
  totals?: {
    finalTotal: number;
    subtotal: number;
    taxTotal: number;
  };
}

export interface Product {
  id: string;
  name: string;
  description: string | Record<string, string>;
  ingredients?: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
  }>;
  costPrice: number;
  sellingPrice: number;
  profitMargin: number;
  category: string;
  portionSize: string;
  preparationTime?: number;
  isActive: boolean;
  tags: string[];
  productType: 'ingredientBased' | 'directCost';
  createdAt: string;
  quantity?: number;
  allergens?: string[];
  imageUrls?: string[];
  preparation?: string;
}