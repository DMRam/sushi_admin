import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Minus, RotateCcw, Loader, ChefHat, Sparkles, ShoppingCart, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useCartStore } from '../../../stores/cartStore';
import { db } from '../../../firebase/firebase';
import type { MenuItem } from '../../../types/types';

interface BuildYourSushiProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SushiIngredient {
    id: string;
    name: string;
    category: 'base' | 'protein' | 'vegetables' | 'toppings' | 'sauces';
    price: number;
    image: string;
    maxQuantity: number;
    currentStock: number;
    unit: string;
    displayOnBYOS: boolean;
}

// Constants
const CATEGORY_MAPPING: Record<string, SushiIngredient['category']> = {
    rice: 'base',
    grains: 'base',
    proteins: 'protein',
    seafood: 'protein',
    vegetables: 'vegetables',
    sauces: 'sauces',
    condiments: 'sauces',
    toppings: 'toppings',
    garnishes: 'toppings',
};

const CATEGORIES: SushiIngredient['category'][] = ['base', 'protein', 'vegetables', 'toppings', 'sauces'];
const BASE_PRICE = 8;

const CATEGORY_MAX_QUANTITIES = {
    base: 1,
    protein: 2,
    vegetables: 3,
    toppings: 2,
    sauces: 2,
} as const;

const COLOR_SCHEME = {
    primary: {
        50: 'bg-red-50',
        100: 'bg-red-100',
        200: 'bg-red-200',
        300: 'bg-red-300',
        400: 'bg-red-400',
        500: 'bg-red-500',
        600: 'bg-red-600',
        700: 'bg-red-700',
        text: 'text-red-600',
        textLight: 'text-red-500',
        textDark: 'text-red-700',
        border: 'border-red-200',
        borderDark: 'border-red-300',
    },
    background: {
        light: 'bg-red-25',
        card: 'bg-white',
        sidebar: 'bg-gradient-to-b from-white to-red-25',
    }
} as const;

const CATEGORY_COLORS = {
    base: {
        bg: 'bg-amber-500',
        text: 'text-amber-700',
        light: 'bg-amber-50',
        border: 'border-amber-200',
        indicator: 'bg-amber-500',
        gradient: 'from-amber-400 to-amber-500'
    },
    protein: {
        bg: 'bg-red-500',
        text: 'text-red-700',
        light: 'bg-red-50',
        border: 'border-red-200',
        indicator: 'bg-red-500',
        gradient: 'from-red-400 to-red-500'
    },
    vegetables: {
        bg: 'bg-emerald-500',
        text: 'text-emerald-700',
        light: 'bg-emerald-50',
        border: 'border-emerald-200',
        indicator: 'bg-emerald-500',
        gradient: 'from-emerald-400 to-emerald-500'
    },
    toppings: {
        bg: 'bg-purple-500',
        text: 'text-purple-700',
        light: 'bg-purple-50',
        border: 'border-purple-200',
        indicator: 'bg-purple-500',
        gradient: 'from-purple-400 to-purple-500'
    },
    sauces: {
        bg: 'bg-orange-500',
        text: 'text-orange-700',
        light: 'bg-orange-50',
        border: 'border-orange-200',
        indicator: 'bg-orange-500',
        gradient: 'from-orange-400 to-orange-500'
    },
} as const;

export default function BuildYourSushi({ isOpen, onClose }: BuildYourSushiProps) {
    const { t, i18n } = useTranslation();
    const addToCart = useCartStore((state) => state.addToCart);
    const [ingredients, setIngredients] = useState<SushiIngredient[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIngredients, setSelectedIngredients] = useState<Record<string, number>>({});
    const [activeCategory, setActiveCategory] = useState<SushiIngredient['category']>('base');
    const [mobileView, setMobileView] = useState<'ingredients' | 'preview'>('ingredients');
    const [showInstructions, setShowInstructions] = useState(true);

    const ingredientsScrollRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    const translations = useMemo(() => ({
        title: t('buildYourSushi.title'),
        subtitle: t('buildYourSushi.subtitle'),
        categories: CATEGORIES.reduce((acc, cat) => ({
            ...acc,
            [cat]: t(`buildYourSushi.categories.${cat}`)
        }), {} as Record<string, string>),
        yourCreation: t('buildYourSushi.yourCreation'),
        items: t('buildYourSushi.items'),
        startSelecting: t('buildYourSushi.startSelecting'),
        chooseIngredients: t('buildYourSushi.chooseIngredients'),
        browseIngredients: t('buildYourSushi.browseIngredients') || 'Browse Ingredients',
        noIngredients: t('buildYourSushi.noIngredients') || 'No ingredients available',
        checkBackLater: t('buildYourSushi.checkBackLater') || 'Check back later for more options',
        basePrice: t('buildYourSushi.basePrice'),
        reset: t('buildYourSushi.reset'),
        addToCart: t('buildYourSushi.addToCart'),
        total: t('common.total'),
        instructions: t('buildYourSushi.instructions') || 'Select ingredients from each category to build your custom sushi roll',
        minIngredients: t('buildYourSushi.minIngredients') || 'Select at least one ingredient to continue',
    }), [t]);

    // Scroll lock effect
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setMobileView('ingredients');
            setShowInstructions(true);
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Close modal on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Auto-hide instructions after 5 seconds
    useEffect(() => {
        if (showInstructions) {
            const timer = setTimeout(() => setShowInstructions(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [showInstructions]);

    const calculatePrice = useCallback((pricePerKg: number, unit: string): number =>
        unit === 'kg' ? Math.round((pricePerKg / 20) * 100) / 100 : pricePerKg
        , []);

    // Data fetching
    useEffect(() => {
        if (!isOpen) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                let snapshot;
                try {
                    snapshot = await getDocs(
                        query(
                            collection(db, 'ingredients'),
                            where('currentStock', '>', 0),
                            where('displayOnBYOS', '==', true)
                        )
                    );
                } catch (error) {
                    console.log('BYOS query failed, fetching all ingredients:', error);
                    snapshot = await getDocs(
                        query(collection(db, 'ingredients'), where('currentStock', '>', 0))
                    );
                }

                const data = snapshot.docs.map((doc) => {
                    const d = doc.data();
                    const cat = CATEGORY_MAPPING[d.category?.toLowerCase()] || 'vegetables';
                    return {
                        id: doc.id,
                        name: d.name || 'Unknown',
                        category: cat,
                        price: calculatePrice(d.pricePerKg || 0, d.unit || 'kg'),
                        image: d.imageUrl || '',
                        maxQuantity: CATEGORY_MAX_QUANTITIES[cat],
                        currentStock: d.currentStock || 0,
                        unit: d.unit || 'kg',
                        displayOnBYOS: d.displayOnBYOS || false,
                    };
                });

                setIngredients(data);
            } catch (e) {
                console.error('Error fetching ingredients:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isOpen, calculatePrice]);

    // Reset scroll on category change
    useEffect(() => {
        ingredientsScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [activeCategory]);

    // Memoized calculations
    const totalPrice = useMemo(() =>
        Object.entries(selectedIngredients).reduce((total, [id, qty]) => {
            const ing = ingredients.find((i) => i.id === id);
            return total + (ing?.price || 0) * qty;
        }, BASE_PRICE),
        [selectedIngredients, ingredients]);

    const selectedIngredientsDetails = useMemo(() =>
        Object.entries(selectedIngredients)
            .map(([id, qty]) => {
                const ing = ingredients.find((i) => i.id === id);
                return ing ? { ...ing, quantity: qty } : null;
            })
            .filter(Boolean) as (SushiIngredient & { quantity: number })[],
        [selectedIngredients, ingredients]);

    const displayedIngredients = useMemo(() =>
        ingredients.filter(ingredient =>
            ingredient.displayOnBYOS === true &&
            ingredient.category === activeCategory
        ),
        [ingredients, activeCategory]);

    // Progress calculation
    const selectionProgress = useMemo(() => {
        const selectedCategories = new Set(selectedIngredientsDetails.map(item => item.category));
        return Math.round((selectedCategories.size / CATEGORIES.length) * 100);
    }, [selectedIngredientsDetails]);

    // Event handlers
    const handleAdd = useCallback((id: string) => {
        const ing = ingredients.find((i) => i.id === id);
        if (!ing) return;

        setSelectedIngredients(prev => {
            const current = prev[id] || 0;
            if (current >= ing.maxQuantity) return prev;
            return { ...prev, [id]: current + 1 };
        });
    }, [ingredients]);

    const handleRemove = useCallback((id: string) => {
        setSelectedIngredients(prev => {
            const current = prev[id] || 0;
            if (current <= 1) {
                const { [id]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [id]: current - 1 };
        });
    }, []);

    const handleReset = useCallback(() => {
        setSelectedIngredients({});
        setActiveCategory('base');
        setMobileView('ingredients');
        setShowInstructions(true);
    }, []);

    const getLocalizedDescription = useCallback((ingredientsList: (SushiIngredient & { quantity: number })[]) => {
        const baseText = {
            en: 'Custom roll: ',
            es: 'Roll personalizado: ',
            fr: 'Rouleau personnalisé: '
        };

        const ingredientsText = ingredientsList
            .map(i => `${i.quantity}x ${i.name}`)
            .join(', ');

        const lang = i18n.language as keyof typeof baseText;
        return (baseText[lang] || baseText.en) + ingredientsText;
    }, [i18n.language]);

    const handleAddToCart = useCallback(() => {
        const description = getLocalizedDescription(selectedIngredientsDetails);

        const customSushi: MenuItem = {
            id: `custom-sushi-${Date.now()}`,
            name: 'Custom Sushi Creation',
            description: {
                en: description,
                es: description,
                fr: description
            },
            price: totalPrice,
            image: '/images/custom-sushi.jpg',
            category: 'custom',
            ingredients: selectedIngredientsDetails.map((i) => i.name),
            allergens: [],
            preparationTime: 20,
            spicyLevel: 0,
            popular: false,
            quantity: 1,
            preparation: '',
        };

        addToCart(customSushi);
        handleReset();
        onClose();
    }, [selectedIngredientsDetails, totalPrice, getLocalizedDescription, addToCart, handleReset, onClose]);

    // Sub-components
    const ProgressIndicator = useMemo(() => (
        <div className="px-4 sm:px-6 pb-3">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Build Progress</span>
                <span className="font-semibold">{selectionProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className="bg-linear-to-r from-red-400 to-red-500 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${selectionProgress}%` }}
                />
            </div>
        </div>
    ), [selectionProgress]);

    const MobileNavigation = useMemo(() => (
        <div className="sm:hidden flex border-b border-red-200 bg-white shadow-sm relative">
            <button
                onClick={() => setMobileView('ingredients')}
                className={`flex-1 py-4 text-center font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${mobileView === 'ingredients'
                    ? 'bg-white text-red-600 border-b-2 border-red-500'
                    : 'text-gray-500 bg-gray-50'
                    }`}
            >
                <ChefHat className="w-4 h-4" />
                <span>Ingredients</span>
            </button>
            <button
                onClick={() => setMobileView('preview')}
                className={`flex-1 py-4 text-center font-semibold transition-all duration-300 flex items-center justify-center space-x-2 relative ${mobileView === 'preview'
                    ? 'bg-white text-red-600 border-b-2 border-red-500'
                    : 'text-gray-500 bg-gray-50'
                    }`}
            >
                <ShoppingCart className="w-4 h-4" />
                <span>Preview</span>
                {selectedIngredientsDetails.length > 0 && (
                    <span className="absolute -top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-bounce">
                        {selectedIngredientsDetails.length}
                    </span>
                )}
            </button>
        </div>
    ), [mobileView, selectedIngredientsDetails.length]);

    const CategoryTabs = useMemo(() => (
        <div className="shrink-0 border-b border-red-100 bg-white">
            <div className="flex overflow-x-auto scrollbar-hide space-x-2 p-4">
                {CATEGORIES.map((cat) => {
                    const isActive = activeCategory === cat;
                    const hasSelection = selectedIngredientsDetails.some(item => item.category === cat);
                    const categoryColor = CATEGORY_COLORS[cat];

                    const ringColorMap = {
                        'bg-amber-500': 'ring-amber-400',
                        'bg-red-500': 'ring-red-400',
                        'bg-emerald-500': 'ring-emerald-400',
                        'bg-purple-500': 'ring-purple-400',
                        'bg-orange-500': 'ring-orange-400'
                    };

                    const ringColorClass = ringColorMap[categoryColor.indicator] || 'ring-gray-400';

                    return (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`
              flex items-center space-x-2 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap 
              transition-all duration-300 shrink-0 border
              ${isActive
                                    ? `bg-linear-to-r ${categoryColor.gradient} text-white shadow-lg scale-105 border-transparent`
                                    : `bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50`
                                }
              ${hasSelection && !isActive ? `ring-2 ring-offset-2 ${ringColorClass} ring-opacity-50` : ''}
            `}
                        >
                            <div className={`w-2 h-2 rounded-full ${hasSelection ? categoryColor.indicator : 'bg-gray-300'}`} />
                            <span>{translations.categories[cat]}</span>
                            {hasSelection && (
                                <span className={`text-xs ${isActive ? 'text-white' : categoryColor.text}`}>
                                    ✓
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    ), [activeCategory, selectedIngredientsDetails, translations.categories]);

    const IngredientCard = useCallback(({ ing }: { ing: SushiIngredient }) => {
        const currentQty = selectedIngredients[ing.id] || 0;
        const isMaxReached = currentQty >= ing.maxQuantity;
        const categoryColor = CATEGORY_COLORS[ing.category];

        return (
            <div
                className={`bg-white rounded-2xl p-4 transition-all duration-300 hover:shadow-lg border-2 ${currentQty > 0
                    ? `${categoryColor.border} shadow-md`
                    : 'border-gray-100 hover:border-red-100'
                    }`}
            >
                <div className="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 mb-4 relative group">
                    {ing.image ? (
                        <>
                            <img
                                src={ing.image}
                                alt={ing.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300" />
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <ChefHat className="w-8 h-8 text-gray-400" />
                        </div>
                    )}
                    {currentQty > 0 && (
                        <div className={`absolute -top-2 -right-2 w-8 h-8 ${categoryColor.bg} text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg`}>
                            {currentQty}
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-start">
                        <h3 className="text-gray-900 font-semibold text-sm leading-tight flex-1 pr-2">
                            {ing.name}
                        </h3>
                        <span className={`${COLOR_SCHEME.primary.text} font-bold text-sm flex-shrink-0`}>
                            +${ing.price.toFixed(2)}
                        </span>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className={`text-xs font-medium ${isMaxReached ? 'text-red-500' : 'text-gray-500'}`}>
                            {currentQty}/{ing.maxQuantity}
                        </span>
                        <button
                            onClick={() => handleAdd(ing.id)}
                            disabled={isMaxReached}
                            className={`p-2 rounded-xl transition-all duration-200 ${isMaxReached
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : `bg-gradient-to-r ${categoryColor.gradient} text-white shadow-md hover:shadow-lg active:scale-95 hover:scale-105`
                                }`}
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }, [selectedIngredients, handleAdd]);

    const IngredientGrid = useMemo(() => {
        if (loading) {
            return (
                <div className="flex items-center justify-center h-48">
                    <div className="text-center">
                        <Loader className="w-8 h-8 text-red-400 animate-spin mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">Loading ingredients...</p>
                    </div>
                </div>
            );
        }

        if (displayedIngredients.length === 0) {
            return (
                <div className="text-center text-gray-500 py-12">
                    <div className={`w-20 h-20 ${COLOR_SCHEME.primary[100]} rounded-full flex items-center justify-center mx-auto mb-4`}>
                        <ChefHat className="w-10 h-10 text-red-400" />
                    </div>
                    <p className="font-semibold text-gray-600 text-lg mb-2">{translations.noIngredients}</p>
                    <p className="text-gray-400">{translations.checkBackLater}</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedIngredients.map((ing) => (
                    <IngredientCard key={ing.id} ing={ing} />
                ))}
            </div>
        );
    }, [loading, displayedIngredients, translations, IngredientCard]);

    const PreviewItem = useCallback(({ item }: { item: SushiIngredient & { quantity: number } }) => {
        const categoryColor = CATEGORY_COLORS[item.category];

        return (
            <div className="bg-white rounded-2xl p-4 border border-gray-200 hover:shadow-md transition-all duration-300 group">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className={`w-3 h-3 rounded-full ${categoryColor.indicator} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                            <p className="text-gray-900 font-semibold text-sm truncate">{item.name}</p>
                            <p className={`${categoryColor.text} text-xs font-medium`}>
                                ${item.price.toFixed(2)} each
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <p className="text-gray-900 font-bold text-sm whitespace-nowrap">
                            ${(item.price * item.quantity).toFixed(2)}
                        </p>
                        <div className={`flex items-center space-x-2 ${categoryColor.light} rounded-xl p-1`}>
                            <button
                                onClick={() => handleRemove(item.id)}
                                className="p-1 hover:bg-white rounded-lg transition-all duration-200 active:scale-95"
                            >
                                <Minus className="w-3 h-3 text-gray-600" />
                            </button>
                            <span className="text-gray-900 font-bold text-sm w-6 text-center">
                                {item.quantity}
                            </span>
                            <button
                                onClick={() => handleAdd(item.id)}
                                disabled={item.quantity >= item.maxQuantity}
                                className="p-1 hover:bg-white rounded-lg transition-all duration-200 active:scale-95 disabled:opacity-30"
                            >
                                <Plus className="w-3 h-3 text-gray-600" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }, [handleAdd, handleRemove]);

    const PreviewPanel = useMemo(() => (
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-white to-red-25">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-gray-900 text-xl font-bold">{translations.yourCreation}</h3>
                    <p className="text-gray-500 text-sm mt-1">Base price: ${BASE_PRICE}.00</p>
                </div>
                <div className={`text-sm ${COLOR_SCHEME.primary[500]} ${COLOR_SCHEME.primary[50]} px-3 py-1 rounded-full font-semibold`}>
                    {selectedIngredientsDetails.length} {translations.items}
                </div>
            </div>

            {selectedIngredientsDetails.length > 0 ? (
                <div className="space-y-3">
                    {selectedIngredientsDetails.map((item) => (
                        <PreviewItem key={item.id} item={item} />
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-500 py-12">
                    <div className={`w-20 h-20 ${COLOR_SCHEME.primary[100]} rounded-full flex items-center justify-center mx-auto mb-4`}>
                        <ChefHat className="w-10 h-10 text-red-400" />
                    </div>
                    <p className="font-semibold text-gray-600 text-lg mb-2">{translations.startSelecting}</p>
                    <p className="text-gray-400 mb-6">{translations.chooseIngredients}</p>
                    <button
                        onClick={() => setMobileView('ingredients')}
                        className={`bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105`}
                    >
                        {translations.browseIngredients}
                    </button>
                </div>
            )}
        </div>
    ), [selectedIngredientsDetails, translations, PreviewItem]);

    const FooterActions = useMemo(() => (
        <div className="flex-shrink-0 p-6 border-t border-red-100 bg-white space-y-4">
            <div className={`flex items-center justify-between ${COLOR_SCHEME.primary[50]} p-4 rounded-2xl`}>
                <div>
                    <span className="text-gray-700 font-semibold">{translations.total}</span>
                    <p className="text-xs text-gray-500 mt-1">{translations.basePrice}</p>
                </div>
                <div className="text-right">
                    <span className={`text-2xl ${COLOR_SCHEME.primary.textDark} font-bold`}>
                        ${totalPrice.toFixed(2)}
                    </span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={handleReset}
                    disabled={!selectedIngredientsDetails.length}
                    className="flex items-center justify-center bg-white border border-gray-300 text-gray-700 py-4 rounded-xl hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 font-semibold hover:border-red-200 active:scale-95"
                >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {translations.reset}
                </button>
                <button
                    onClick={handleAddToCart}
                    disabled={!selectedIngredientsDetails.length}
                    className={`flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-xl hover:from-red-600 hover:to-red-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg font-bold active:scale-95 group`}
                >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {translations.addToCart}
                </button>
            </div>
        </div>
    ), [totalPrice, selectedIngredientsDetails.length, translations, handleReset, handleAddToCart]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

            <div
                ref={modalRef}
                className="
          relative w-full sm:max-w-7xl h-[95vh] sm:h-[90vh] max-h-screen
          bg-white border border-red-100 rounded-t-3xl sm:rounded-3xl shadow-2xl
          flex flex-col overflow-hidden
          animate-slide-up
        "
            >
                {/* Header */}
                <div className={`flex-shrink-0 flex items-center justify-between p-6 border-b ${COLOR_SCHEME.primary.border} ${COLOR_SCHEME.background.sidebar}`}>
                    <div className="flex items-center space-x-4">
                        <div className={`p-3 ${COLOR_SCHEME.primary[100]} rounded-2xl`}>
                            <Sparkles className="w-6 h-6 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                                {translations.title}
                            </h2>
                            <p className="text-gray-600 text-sm mt-1 hidden sm:block">
                                {translations.subtitle}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-3 hover:${COLOR_SCHEME.primary[100]} rounded-2xl transition-all duration-300 group flex-shrink-0 active:scale-95`}
                        aria-label="Close"
                    >
                        <X className="w-6 h-6 text-gray-500 group-hover:text-red-500 transition-colors" />
                    </button>
                </div>

                {/* Progress Indicator */}
                {ProgressIndicator}

                {/* Instructions Banner */}
                {showInstructions && (
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mx-6 mt-2 rounded-r-lg">
                        <div className="flex items-start space-x-3">
                            <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-blue-800 text-sm font-medium">{translations.instructions}</p>
                            </div>
                            <button
                                onClick={() => setShowInstructions(false)}
                                className="text-blue-500 hover:text-blue-700 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Mobile Navigation */}
                {MobileNavigation}

                {/* Main Content */}
                <div className="flex-1 flex flex-col sm:flex-row min-h-0 overflow-hidden bg-red-25">
                    {/* Ingredients Panel */}
                    <div className={`
            flex-1 flex flex-col min-h-0 border-b sm:border-b-0 sm:border-r border-red-100 bg-white
            ${mobileView === 'preview' ? 'hidden sm:flex' : 'flex'}
          `}>
                        {CategoryTabs}
                        <div
                            ref={ingredientsScrollRef}
                            className="flex-1 overflow-y-auto p-6 bg-red-25 scrollbar-thin"
                        >
                            {IngredientGrid}
                        </div>
                    </div>

                    {/* Preview Panel */}
                    <div className={`
            w-full sm:w-96 xl:w-[28rem] bg-white flex flex-col min-h-0 border-t sm:border-t-0 border-red-100
            ${mobileView === 'ingredients' ? 'hidden sm:flex' : 'flex'}
          `}>
                        {PreviewPanel}
                        {FooterActions}
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes slide-up {
          from { 
            transform: translateY(100%); 
            opacity: 0; 
          }
          to { 
            transform: translateY(0); 
            opacity: 1; 
          }
        }
        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .bg-red-25 {
          background-color: #fef7f7;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(239, 68, 68, 0.1);
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(239, 68, 68, 0.3);
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(239, 68, 68, 0.5);
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
        </div>
    );
}