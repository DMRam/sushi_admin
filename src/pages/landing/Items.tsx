import type { MenuItem } from "../../types/types";

export const featuredItems: MenuItem[] = [
    {
        id: '1',
        name: 'Hamachi Ceviche',
        description: 'Yellowtail tuna with yuzu, sea salt, and micro shiso',
        price: 18.99,
        image: '/images/hamachi-ceviche.jpg',
        category: 'ceviche',
        ingredients: ['Yellowtail Tuna', 'Yuzu', 'Sea Salt', 'Micro Shiso', 'White Soy'],
        allergens: ['Fish'],
        preparationTime: 8,
        spicyLevel: 0,
        popular: true
    },
    {
        id: '2',
        name: 'Uni & Caviar',
        description: 'Sea urchin with osetra caviar and gold leaf',
        price: 24.99,
        image: '/images/uni-caviar.jpg',
        category: 'signature',
        ingredients: ['Sea Urchin', 'Osetra Caviar', 'Gold Leaf', 'Dashi Gelée'],
        allergens: ['Fish', 'Shellfish'],
        preparationTime: 6,
        spicyLevel: 0,
        popular: false
    },
    {
        id: '3',
        name: 'Black Cod Miso',
        description: '48-hour marinated black cod with white miso',
        price: 22.99,
        image: '/images/black-cod-miso.jpg',
        category: 'main',
        ingredients: ['Black Cod', 'White Miso', 'Sake', 'Mirin', 'Ginger'],
        allergens: ['Fish'],
        preparationTime: 15,
        spicyLevel: 0,
        popular: true
    }
]