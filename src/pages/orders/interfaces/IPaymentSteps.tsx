export interface CartItemCheckOut {
    id?: string;
    name: string;
    price: number;
    quantity?: number;
    description: {
        es: string;
        fr: string;
        en: string;
    };
    category?: string;
    image?: string;
    imageUrl?: string;
    thumbnail?: string;
    mainImage?: string;
    photo?: string;
    img?: string;
    picture?: string;
    images?: string[];
    imageUrls?: string[];
};