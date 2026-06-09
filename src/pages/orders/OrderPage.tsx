import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import {
    Search,
    ChevronRight,
    Clock,
    Star,
    Sparkles,
    X,
    Filter,
    Plus,
    Check,
    Info,
    AlertCircle,
    ShoppingBag,
    Heart,
    Leaf,
    Flame,
    DollarSign,
    ArrowUpDown,
    ChevronDown,
    ChevronUp,
    SlidersHorizontal,
} from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import type { MenuItem, Product } from '../../types/types';
import { db } from '../../firebase/firebase';
import { LandingHeader } from '../landing/components/LandingHeader';
import { LandingCTAFooter } from '../landing/components/LandingCTAFooter';
import BuildYourSushi from './components/BuildYourSushi';

interface FilterState {
    dietary: {
        vegetarian: boolean;
        vegan: boolean;
        glutenFree: boolean;
    };
    spicyLevel: number;
    maxPrice: number;
}

type SortBy = 'popular' | 'price-low' | 'price-high' | 'name';
type ModalTab = 'details' | 'ingredients' | 'allergens';

const DEFAULT_MAX_PRICE = 200;

const getDietaryFromTags = (tags: string[] = []) => {
    const tagSet = new Set(tags.map((tag) => tag.toLowerCase()));
    return {
        vegetarian: tagSet.has('vegetarian') || tagSet.has('veg'),
        vegan: tagSet.has('vegan'),
        glutenFree: tagSet.has('gluten-free') || tagSet.has('gluten free'),
    };
};

const formatIngredientLabel = (value: string, language: string = 'en') => {
    const translations: Record<string, { en: string; fr: string; es: string }> = {
        crevette: { en: 'Shrimp', fr: 'Crevette', es: 'Camarón' },
        avocat: { en: 'Avocado', fr: 'Avocat', es: 'Palta' },
        saumon: { en: 'Salmon', fr: 'Saumon', es: 'Salmón' },
        tuna: { en: 'Tuna', fr: 'Thon', es: 'Atún' },
        concombre: { en: 'Cucumber', fr: 'Concombre', es: 'Pepino' },
        oignon_vert: { en: 'Green onion', fr: 'Oignon vert', es: 'Cebollín' },
        fromage_creme: { en: 'Cream cheese', fr: 'Fromage à la crème', es: 'Queso crema' },
        sauce_maison: { en: 'House sauce', fr: 'Sauce maison', es: 'Salsa de la casa' },
        riz_sushi: { en: 'Sushi rice', fr: 'Riz à sushi', es: 'Arroz sushi' },
        sesame: { en: 'Sesame', fr: 'Sésame', es: 'Sésamo' },
        massago: { en: 'Massago', fr: 'Massago', es: 'Massago' },
        edamame: { en: 'Edamame', fr: 'Edamame', es: 'Edamame' },
        carotte: { en: 'Carrot', fr: 'Carotte', es: 'Zanahoria' },
    };

    const normalizedLanguage = language.startsWith('fr')
        ? 'fr'
        : language.startsWith('es')
            ? 'es'
            : 'en';

    const cleaned = value.trim().toLowerCase();

    if (translations[cleaned]?.[normalizedLanguage]) {
        return translations[cleaned][normalizedLanguage];
    }

    return cleaned.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const normalizeIngredients = (rawIngredients: unknown, language: string): string[] => {
    if (!rawIngredients) return [];

    if (typeof rawIngredients === 'string') {
        return rawIngredients
            .split('|')
            .map((part) => part.trim())
            .filter(Boolean)
            .map((part) => formatIngredientLabel(part, language));
    }

    if (Array.isArray(rawIngredients)) {
        return rawIngredients
            .map((ing: unknown) => {
                if (typeof ing === 'string') return formatIngredientLabel(ing.trim(), language);

                if (
                    ing &&
                    typeof ing === 'object' &&
                    'name' in ing &&
                    typeof (ing as { name?: unknown }).name === 'string'
                ) {
                    return formatIngredientLabel((ing as { name: string }).name.trim(), language);
                }

                return null;
            })
            .filter((value): value is string => Boolean(value));
    }

    return [];
};

const ImageModal = ({
    item,
    isOpen,
    onClose,
    onAddToCart,
}: {
    item: MenuItem;
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (item: MenuItem) => void;
}) => {
    const { t, i18n } = useTranslation();
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState<ModalTab>('details');

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!item.ingredients?.length && activeTab === 'ingredients') setActiveTab('details');
        if (!item.allergens?.length && activeTab === 'allergens') setActiveTab('details');
    }, [item, activeTab]);

    const handleAddToCart = () => {
        setIsAddingToCart(true);
        for (let i = 0; i < quantity; i += 1) onAddToCart(item);
        setTimeout(() => {
            setIsAddingToCart(false);
            onClose();
            setQuantity(1);
        }, 800);
    };

    if (!isOpen) return null;

    const getCurrentLanguageDescription = (description: { es: string; fr: string; en: string }) =>
        description[i18n.language as keyof typeof description] || description.en;

    const descriptionText = getCurrentLanguageDescription(item.description);

    const tabs = [
        { id: 'details' as const, label: 'Details', icon: Info, visible: true },
        { id: 'ingredients' as const, label: 'Ingredients', icon: Leaf, visible: Boolean(item.ingredients?.length) },
        { id: 'allergens' as const, label: 'Allergens', icon: AlertCircle, visible: Boolean(item.allergens?.length) },
    ].filter((tab) => tab.visible);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/95 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative bg-gradient-to-b from-gray-900 to-black w-full max-w-4xl max-h-[95vh] sm:rounded-[4px] overflow-hidden shadow-2xl border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-all border border-white/20 hover:border-white/40"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col lg:flex-row h-full">
                    <div className="lg:w-1/2 relative bg-gray-900">
                        <div className="aspect-[4/3] lg:aspect-square w-full relative">
                            {!imageLoaded && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-8 h-8 border-2 border-[#f26350] rounded-full animate-spin border-t-transparent" />
                                </div>
                            )}
                            <img
                                src={item.image || '/images/placeholder-food.jpg'}
                                alt={item.name}
                                className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                                onLoad={() => setImageLoaded(true)}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                            <div className="absolute bottom-4 left-4 right-4">
                                <div className="flex items-center justify-between">
                                    <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                                        <span className="text-white font-bold text-2xl">${item.price.toFixed(2)}</span>
                                    </div>
                                    {item.popular && (
                                        <div className="bg-[#f26350] px-4 py-2 rounded-full flex items-center space-x-1">
                                            <Star className="w-4 h-4 fill-current" />
                                            <span className="text-white text-sm font-medium">{t('landing.popular', 'Popular')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:w-1/2 flex flex-col bg-gray-900/95">
                        <div className="p-6 pb-2">
                            <h2 className="text-2xl font-bold text-white mb-2">{item.name}</h2>
                            <div className="flex items-center space-x-3 text-white/60 text-sm">
                                <div className="flex items-center">
                                    <Clock className="w-4 h-4 mr-1 text-[#f26350]" />
                                    <span>{item.preparationTime} min</span>
                                </div>
                                {item.spicyLevel > 0 && (
                                    <div className="flex items-center">
                                        <Flame className="w-4 h-4 mr-1 text-orange-500" />
                                        <span>{item.spicyLevel === 1 ? 'Mild' : 'Spicy'}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex border-b border-white/10 px-6">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center space-x-2 ${activeTab === tab.id
                                        ? 'border-[#f26350] text-white'
                                        : 'border-transparent text-white/40 hover:text-white/60'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === 'details' && (
                                <p className="text-white/70 leading-relaxed">{descriptionText}</p>
                            )}

                            {activeTab === 'ingredients' && (
                                <div className="flex flex-wrap gap-2">
                                    {item.ingredients?.map((ingredient, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1.5 bg-[#0e0e0e] rounded-full text-white/80 text-sm border border-white/10"
                                        >
                                            {ingredient}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'allergens' && (
                                <div className="flex flex-wrap gap-2">
                                    {item.allergens?.map((allergen, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1.5 bg-red-500/10 rounded-full text-red-300 text-sm border border-red-500/20"
                                        >
                                            {allergen}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-white/10 bg-black/30">
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center bg-[#0e0e0e] rounded-[4px] border border-white/10">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white hover:bg-[#0e0e0e] rounded-l-xl transition-colors"
                                    >
                                        −
                                    </button>
                                    <span className="w-12 text-center text-white font-medium">{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white hover:bg-[#0e0e0e] rounded-r-xl transition-colors"
                                    >
                                        +
                                    </button>
                                </div>

                                <button
                                    onClick={handleAddToCart}
                                    disabled={isAddingToCart}
                                    className={`flex-1 py-3 rounded-[4px] font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${isAddingToCart
                                        ? 'bg-green-500 text-white'
                                        : 'bg-[#f26350] text-white hover:bg-[#ff725f] active:scale-95'
                                        }`}
                                >
                                    {isAddingToCart ? (
                                        <>
                                            <Check className="w-5 h-5" />
                                            <span>Added!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-5 h-5" />
                                            <span>Add to Cart · ${(item.price * quantity).toFixed(2)}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

function ListItemCard({
    item,
    isFavorite,
    onToggleFavorite,
    onOpen,
    onAddToCart,
    getCurrentLanguageDescription,
}: {
    item: MenuItem;
    isFavorite: boolean;
    onToggleFavorite: (id: string) => void;
    onOpen: (item: MenuItem) => void;
    onAddToCart: (item: MenuItem) => void;
    getCurrentLanguageDescription: (description: { es: string; fr: string; en: string }) => string;
}) {
    const { t } = useTranslation();

    return (
        <div
            className="group cursor-pointer overflow-hidden border border-white/10 bg-[#0e0e0e] transition-all hover:-translate-y-0.5 hover:border-[#f26350]/45 hover:shadow-2xl hover:shadow-black/35"
            onClick={() => onOpen(item)}
        >
            <div className="flex h-full flex-col">
                <div className="relative h-44 w-full flex-shrink-0 overflow-hidden lg:h-52">
                    <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {item.popular && (
                        <div className="absolute top-2 right-2 z-10">
                            <div className="flex items-center space-x-1 bg-[#f26350] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.06em]">
                                <Star className="w-3 h-3 fill-current" />
                                <span>Popular</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-between p-4 lg:p-5">
                    <div>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h3 className="truncate text-[16px] font-extrabold text-white">{item.name}</h3>
                                <p className="mt-2 line-clamp-2 text-sm leading-5 text-white/62">
                                    {getCurrentLanguageDescription(item.description)}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleFavorite(item.id);
                                    }}
                                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/60 backdrop-blur-sm transition-all hover:text-white"
                                >
                                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-[#f26350] text-[#f26350]' : ''}`} />
                                </button>
                                <span className="text-[#f26350] font-bold whitespace-nowrap">${item.price.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 gap-3">
                        <div className="flex items-center space-x-3 text-xs text-white/40 min-w-0">
                            <span className="flex items-center shrink-0">
                                <Clock className="w-3 h-3 mr-1" />
                                {item.preparationTime}min
                            </span>
                            {item.spicyLevel > 0 && (
                                <span className="flex items-center shrink-0">
                                    <Flame className="w-3 h-3 mr-1 text-orange-500" />
                                    {item.spicyLevel === 1 ? 'Mild' : 'Spicy'}
                                </span>
                            )}
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddToCart(item);
                            }}
                            className="shrink-0 bg-[#f26350] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#ff725f]"
                        >
                            {t('landing.add', 'Add')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function OrderPage() {
    const addToCart = useCartStore((state) => state.addToCart);
    const cart = useCartStore((state) => state.cart);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { t, i18n } = useTranslation();

    const [showSushiBuilder, setShowSushiBuilder] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [sortBy, setSortBy] = useState<SortBy>('popular');
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

    const [favorites, setFavorites] = useState<string[]>(() => {
        const saved = localStorage.getItem('favorites');
        return saved ? JSON.parse(saved) : [];
    });

    const [activeCategory, setActiveCategory] = useState('all');
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [filters, setFilters] = useState<FilterState>({
        dietary: { vegetarian: false, vegan: false, glutenFree: false },
        spicyLevel: 0,
        maxPrice: DEFAULT_MAX_PRICE,
    });

    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const handleAddToCartTracked = (item: MenuItem) => {
        if (window.fbq) {
            window.fbq('track', 'AddToCart', {
                value: item.price,
                currency: 'CAD',
                content_name: item.name,
                content_type: 'product',
            });
        }

        addToCart(item);
    };


    useEffect(() => {
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }, [favorites]);

    useEffect(() => {
        const timer = setTimeout(() => setSearchTerm(searchInput), 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        const setupFirestoreListener = async () => {
            try {
                setLoading(true);

                const snapshot = await getDocs(collection(db, 'products'));
                const productsData: Product[] = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                } as Product));

                const activeProducts = productsData.filter((p) => p.isActive !== false);
                const sortedProducts = activeProducts.sort((a, b) => {
                    if (a.featured && !b.featured) return -1;
                    if (!a.featured && b.featured) return 1;
                    return (a.name || '').localeCompare(b.name || '');
                });

                setProducts(sortedProducts);
                setLoading(false);

                unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
                    const updatedProducts = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    } as Product));

                    const activeProducts = updatedProducts.filter((p) => p.isActive !== false);
                    const sortedProducts = activeProducts.sort((a, b) => {
                        if (a.featured && !b.featured) return -1;
                        if (!a.featured && b.featured) return 1;
                        return (a.name || '').localeCompare(b.name || '');
                    });

                    setProducts(sortedProducts);
                });
            } catch (err) {
                console.error('Error:', err);
                setError(t('orderPage.failedToLoad'));
                setLoading(false);
            }
        };

        setupFirestoreListener();
        return () => unsubscribe?.();
    }, [t]);

    const getLocalizedDescription = useCallback((description: unknown) => {
        if (typeof description === 'string') {
            return { en: description, es: description, fr: description };
        }
        if (
            description &&
            typeof description === 'object' &&
            'en' in description &&
            'es' in description &&
            'fr' in description
        ) {
            return description as { en: string; es: string; fr: string };
        }
        return { en: '', es: '', fr: '' };
    }, []);

    const getCurrentLanguageDescription = useCallback(
        (description: { es: string; fr: string; en: string }) => {
            return description[i18n.language as keyof typeof description] || description.en;
        },
        [i18n.language]
    );

    const menuItems: MenuItem[] = useMemo(() => {
        return products.map((product) => ({
            id: product.id,
            name: product.name || 'Unnamed Product',
            description: getLocalizedDescription(product.description || ''),
            preparation: product.preparation || '',
            price: product.sellingPrice || 0,
            image:
                Array.isArray(product.imageUrls) && product.imageUrls.length > 0
                    ? product.imageUrls[0]
                    : '/images/placeholder-food.jpg',
            category: product.category || 'uncategorized',
            videoUrl: product.preparationVideoUrl,
            ingredients: normalizeIngredients(product.ingredients, i18n.language),
            allergens: Array.isArray(product.allergens) ? product.allergens : [],
            preparationTime: product.preparationTime || 15,
            spicyLevel: product.tags?.some((tag) => tag.toLowerCase().includes('spicy')) ? 2 : 0,
            popular: product.featured || false,
            quantity: product.quantity || 0,
        }));
    }, [products, getLocalizedDescription, i18n.language]);

    const categories = useMemo(() => {
        const cats = Array.from(new Set(menuItems.map((item) => item.category).filter(Boolean)));
        return cats.sort((a, b) => a.localeCompare(b));
    }, [menuItems]);

    const filteredItems = useMemo(() => {
        let items = [...menuItems];

        if (!showFavoritesOnly && activeCategory !== 'all') {
            items = items.filter((item) => item.category === activeCategory);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            items = items.filter(
                (item) =>
                    item.name.toLowerCase().includes(term) ||
                    getCurrentLanguageDescription(item.description).toLowerCase().includes(term) ||
                    item.ingredients.some((i) => i.toLowerCase().includes(term))
            );
        }

        const activeDietary = Object.entries(filters.dietary)
            .filter(([, value]) => value)
            .map(([key]) => key);

        if (activeDietary.length > 0) {
            items = items.filter((item) => {
                const product = products.find((p) => p.id === item.id);
                const dietary = getDietaryFromTags(product?.tags || []);
                return activeDietary.every((key) => dietary[key as keyof typeof dietary]);
            });
        }

        if (filters.spicyLevel > 0) {
            items = items.filter((item) => item.spicyLevel <= filters.spicyLevel);
        }

        items = items.filter((item) => item.price <= filters.maxPrice);

        if (showFavoritesOnly) {
            items = items.filter((item) => favorites.includes(item.id));
        }

        switch (sortBy) {
            case 'popular':
                items.sort((a, b) => Number(b.popular) - Number(a.popular));
                break;
            case 'price-low':
                items.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                items.sort((a, b) => b.price - a.price);
                break;
            case 'name':
                items.sort((a, b) => a.name.localeCompare(b.name));
                break;
        }

        return items;
    }, [
        menuItems,
        activeCategory,
        showFavoritesOnly,
        searchTerm,
        filters,
        favorites,
        products,
        getCurrentLanguageDescription,
        sortBy,
    ]);

    const itemsByCategory = useMemo(() => {
        if (showFavoritesOnly) {
            return {
                Favorites: filteredItems,
            };
        }

        if (activeCategory !== 'all') {
            return {
                [activeCategory]: filteredItems,
            };
        }

        return categories.reduce<Record<string, MenuItem[]>>((acc, category) => {
            const categoryItems = filteredItems.filter((item) => item.category === category);
            if (categoryItems.length > 0) acc[category] = categoryItems;
            return acc;
        }, {});
    }, [showFavoritesOnly, activeCategory, categories, filteredItems]);

    useEffect(() => {
        const nextSections: Record<string, boolean> = {};
        Object.keys(itemsByCategory).forEach((key) => {
            nextSections[key] = false;
        });
        setOpenSections(nextSections);
    }, [showFavoritesOnly, activeCategory, searchTerm, filteredItems.length]);

    const activeFiltersCount =
        Object.values(filters.dietary).filter(Boolean).length +
        (filters.spicyLevel > 0 ? 1 : 0) +
        (filters.maxPrice < DEFAULT_MAX_PRICE ? 1 : 0);

    const toggleFavorite = (itemId: string) => {
        setFavorites((prev) =>
            prev.includes(itemId)
                ? prev.filter((id) => id !== itemId)
                : [...prev, itemId]
        );
    };

    const clearAllFilters = () => {
        setFilters({
            dietary: { vegetarian: false, vegan: false, glutenFree: false },
            spicyLevel: 0,
            maxPrice: DEFAULT_MAX_PRICE,
        });
        setSearchInput('');
        setSearchTerm('');
        setActiveCategory('all');
        setShowFavoritesOnly(false);
    };

    const toggleSection = (section: string) => {
        setOpenSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="relative">
                        <div className="w-16 h-16 border-2 border-[#f26350] rounded-full animate-spin border-t-transparent mx-auto" />
                        <Sparkles className="w-6 h-6 text-[#f26350] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <p className="text-white/60 mt-4">{t('orderPage.loadingMenu')}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center max-w-md mx-4">
                    <div className="w-20 h-20 bg-red-500/10 rounded-[4px] flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl text-white mb-2">{t('orderPage.failedToLoad')}</h3>
                    <p className="text-white/40 text-sm mb-8">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-[#f26350] text-white px-8 py-3 rounded-[4px] hover:bg-[#ff725f] transition-colors"
                    >
                        {t('orderPage.tryAgain')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            {selectedItem && (
                <ImageModal
                    item={selectedItem}
                    isOpen={isModalOpen}
                    onClose={() => {
                        setSelectedItem(null);
                        setIsModalOpen(false);
                    }}
                    onAddToCart={handleAddToCartTracked}
                />
            )}

            <div className="relative z-40">
                <LandingHeader />
            </div>

            <div className="h-28" />

            <section className="border-b border-white/10 bg-[radial-gradient(circle_at_70%_20%,rgba(242,99,80,0.16),transparent_28rem),linear-gradient(180deg,#080808_0%,#050505_100%)]">
                <div className="mx-auto max-w-[1600px] px-6 py-10 lg:px-10">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.36em] text-[#f26350]">
                                {t('orderPage.cevicheSushiBar', 'Ceviche & Sushi Bar')}
                            </div>
                            <h1 className="font-calligraphy text-4xl font-semibold uppercase leading-none text-white sm:text-5xl lg:text-6xl">
                                {t('orderPage.ourMenu', 'Menu')}
                            </h1>
                            <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-white/68 sm:text-base">
                                {t('orderPage.discoverDescription', 'Discover our authentic sushi creations. Tap on any dish to watch how it is made!')}
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center sm:min-w-[420px]">
                            <div className="border border-white/10 bg-black/35 p-4">
                                <div className="text-2xl font-extrabold text-white">{menuItems.length}</div>
                                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                                    {t('orderPage.totalCreations', 'Creations')}
                                </div>
                            </div>
                            <div className="border border-white/10 bg-black/35 p-4">
                                <div className="text-2xl font-extrabold text-white">{categories.length}</div>
                                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                                    {t('orderPage.categories', 'Categories')}
                                </div>
                            </div>
                            <div className="border border-white/10 bg-black/35 p-4">
                                <div className="text-2xl font-extrabold text-[#f26350]">{cart.length}</div>
                                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                                    {t('orderPage.cart', 'Cart')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="sticky top-[108px] z-30 border-b border-white/10 bg-[#050505]/94 backdrop-blur-xl">
                <div className="max-w-[1600px] mx-auto px-6 lg:px-10">
                    <div className="py-5">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                            <input
                                type="text"
                                placeholder={t('orderPage.searchPlaceholder')}
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="w-full border border-white/10 bg-[#0e0e0e] py-4 pl-12 pr-4 text-white placeholder-white/40 transition-all focus:border-[#f26350] focus:bg-[#151515] focus:outline-none"
                            />
                            {searchInput && (
                                <button
                                    onClick={() => setSearchInput('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pb-5">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center space-x-2 border px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.08em] transition-all ${showFilters || activeFiltersCount > 0
                                ? 'bg-[#f26350] border-[#f26350] text-white'
                                : 'bg-[#0e0e0e] border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Filter className="w-4 h-4" />
                            <span className="text-sm">Filters</span>
                            {activeFiltersCount > 0 && (
                                <span className="bg-white text-[#f26350] text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                            className={`flex items-center space-x-2 border px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.08em] transition-all ${showFavoritesOnly
                                ? 'bg-[#f26350] border-[#f26350] text-white'
                                : 'bg-[#0e0e0e] border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                            <span className="text-sm">Favorites</span>
                        </button>

                        <div className="relative">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortBy)}
                                className="cursor-pointer appearance-none border border-white/10 bg-[#0e0e0e] px-4 py-2.5 pr-10 text-[12px] font-bold uppercase tracking-[0.08em] text-white/60 hover:text-white"
                            >
                                <option value="popular">Popular</option>
                                <option value="price-low">Price: Low to High</option>
                                <option value="price-high">Price: High to Low</option>
                                <option value="name">Name</option>
                            </select>
                            <ArrowUpDown className="w-4 h-4 text-white/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        <div className="flex-1" />

                        <button
                            onClick={() => setShowSushiBuilder(true)}
                            className="flex items-center space-x-2 bg-[#f26350] px-5 py-2.5 text-[12px] font-extrabold uppercase tracking-[0.08em] text-white shadow-lg shadow-[#f26350]/20 transition-all hover:bg-[#ff725f]"
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            <span className="text-sm hidden sm:inline">{t('buildYourSushi.menuButton', 'Customize a roll')}</span>
                        </button>
                    </div>

                    {showFilters && (
                        <div className="pb-6">
                            <div className="border border-white/10 bg-[#0e0e0e] p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-white font-medium">All Filters</h3>
                                    <button
                                        onClick={clearAllFilters}
                                        className="text-sm text-[#f26350] hover:text-[#ff725f] transition-colors"
                                    >
                                        Clear all
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div>
                                        <h4 className="text-white/80 text-sm font-medium mb-3 flex items-center">
                                            <Leaf className="w-4 h-4 mr-2 text-[#f26350]" />
                                            Dietary
                                        </h4>
                                        <div className="space-y-2">
                                            {[
                                                { key: 'vegetarian', label: 'Vegetarian' },
                                                { key: 'vegan', label: 'Vegan' },
                                                { key: 'glutenFree', label: 'Gluten Free' },
                                            ].map(({ key, label }) => (
                                                <label key={key} className="flex items-center space-x-3 text-white/60">
                                                    <input
                                                        type="checkbox"
                                                        checked={filters.dietary[key as keyof typeof filters.dietary]}
                                                        onChange={(e) =>
                                                            setFilters((prev) => ({
                                                                ...prev,
                                                                dietary: { ...prev.dietary, [key]: e.target.checked },
                                                            }))
                                                        }
                                                        className="rounded border-white/20 bg-[#0e0e0e] text-[#f26350] focus:ring-[#f26350]"
                                                    />
                                                    <span className="text-sm">{label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-white/80 text-sm font-medium mb-3 flex items-center">
                                            <Flame className="w-4 h-4 mr-2 text-[#f26350]" />
                                            Spice Level
                                        </h4>
                                        <div className="space-y-2">
                                            {[
                                                { value: 0, label: 'Mild' },
                                                { value: 1, label: 'Medium' },
                                                { value: 2, label: 'Spicy' },
                                            ].map((level) => (
                                                <label key={level.value} className="flex items-center space-x-3 text-white/60">
                                                    <input
                                                        type="radio"
                                                        name="spicyLevel"
                                                        checked={filters.spicyLevel === level.value}
                                                        onChange={() =>
                                                            setFilters((prev) => ({ ...prev, spicyLevel: level.value }))
                                                        }
                                                        className="border-white/20 bg-[#0e0e0e] text-[#f26350] focus:ring-[#f26350]"
                                                    />
                                                    <span className="text-sm">{level.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-white/80 text-sm font-medium mb-3 flex items-center">
                                            <DollarSign className="w-4 h-4 mr-2 text-[#f26350]" />
                                            Max Price: <span className="ml-2 text-[#f26350]">${filters.maxPrice}</span>
                                        </h4>
                                        <input
                                            type="range"
                                            min="0"
                                            max={DEFAULT_MAX_PRICE}
                                            step="5"
                                            value={filters.maxPrice}
                                            onChange={(e) =>
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    maxPrice: parseInt(e.target.value, 10),
                                                }))
                                            }
                                            className="w-full"
                                        />
                                        <div className="flex justify-between text-xs text-white/40 mt-2">
                                            <span>$0</span>
                                            <span>${DEFAULT_MAX_PRICE}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* {!showFavoritesOnly && (
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
                    <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                        <button
                            onClick={() => setActiveCategory('all')}
                            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm ${activeCategory === 'all'
                                    ? 'bg-[#f26350] text-white'
                                    : 'bg-[#0e0e0e] text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            All Categories
                        </button>

                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm ${activeCategory === category
                                        ? 'bg-[#f26350] text-white'
                                        : 'bg-[#0e0e0e] text-white/60 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>
            )} */}

            <div className="max-w-[1600px] mx-auto px-6 pt-6 pb-4 lg:px-10">
                <div className="flex items-center justify-between text-sm">
                    <p className="text-white/60">
                        <span className="text-white font-medium">{filteredItems.length}</span> items found
                        {searchTerm && <span> for "{searchTerm}"</span>}
                        {showFavoritesOnly && <span> in favorites</span>}
                    </p>
                    {activeFiltersCount > 0 && (
                        <button
                            onClick={clearAllFilters}
                            className="text-[#f26350] hover:text-[#ff725f] transition-colors"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-6 pb-20 lg:px-10 space-y-4">
                {filteredItems.length > 0 ? (
                    Object.entries(itemsByCategory).map(([section, items]) => {
                        const isOpen = openSections[section] ?? true;

                        return (
                            <div
                                key={section}
                                className="overflow-hidden border border-white/10 bg-[#0b0b0b]"
                            >
                                <button
                                    onClick={() => toggleSection(section)}
                                    className="w-full px-5 py-4 flex items-center justify-between bg-[#0e0e0e] hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-3 text-left">
                                        <div className="w-8 h-8 rounded-full bg-[#f26350]/15 flex items-center justify-center">
                                            {showFavoritesOnly ? (
                                                <Heart className="w-4 h-4 text-[#f26350] fill-current" />
                                            ) : (
                                                <Sparkles className="w-4 h-4 text-[#f26350]" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-white font-medium">{section}</h3>
                                            <p className="text-white/40 text-sm">{items.length} item{items.length !== 1 ? 's' : ''}</p>
                                        </div>
                                    </div>

                                    <div className="text-white/60">
                                        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </div>
                                </button>

                                {isOpen && (
                                    <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3">
                                        {items.map((item) => (
                                            <ListItemCard
                                                key={item.id}
                                                item={item}
                                                isFavorite={favorites.includes(item.id)}
                                                onToggleFavorite={toggleFavorite}
                                                onOpen={(selected) => {
                                                    setSelectedItem(selected);
                                                    setIsModalOpen(true);
                                                }}
                                                onAddToCart={handleAddToCartTracked}
                                                getCurrentLanguageDescription={getCurrentLanguageDescription}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-[#0e0e0e] rounded-[4px] flex items-center justify-center mx-auto mb-6 border border-white/10">
                            <Search className="w-8 h-8 text-white/30" />
                        </div>
                        <h3 className="text-xl text-white mb-3 font-light">No items found</h3>
                        <p className="text-white/50 text-sm mb-8 max-w-md mx-auto">
                            Try adjusting your search or filters to find what you're looking for.
                        </p>
                        <button
                            onClick={clearAllFilters}
                            className="bg-[#f26350] text-white px-6 py-3 rounded-[4px] hover:bg-[#ff725f] transition-colors inline-flex items-center space-x-2"
                        >
                            <span>Clear all filters</span>
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            <LandingCTAFooter displaySimple={true} />

            {cart.length > 0 && (
                <div className="fixed bottom-6 right-6 z-40">
                    <Link
                        to="/checkout"
                        className="bg-[#f26350] text-white px-6 py-4 rounded-[4px] hover:bg-[#ff725f] transition-all shadow-2xl shadow-[#f26350]/25 hover:shadow-[#f26350]/40 hover:scale-105 flex items-center space-x-4"
                    >
                        <div className="relative">
                            <ShoppingBag className="w-6 h-6" />
                            <span className="absolute -top-2 -right-2 bg-white text-[#f26350] text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                {itemCount}
                            </span>
                        </div>
                        <div className="text-right">
                            <div className="font-semibold">${cartTotal.toFixed(2)}</div>
                            <div className="text-white/80 text-xs">Checkout</div>
                        </div>
                        <ChevronRight className="w-5 h-5" />
                    </Link>
                </div>
            )}

            {showSushiBuilder && (
                <div className="fixed inset-0 z-[9998]">
                    <BuildYourSushi
                        isOpen={showSushiBuilder}
                        onClose={() => setShowSushiBuilder(false)}
                    />
                </div>
            )}
        </div>
    );
}
