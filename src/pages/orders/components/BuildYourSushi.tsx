import { useState, useMemo, useEffect, useRef } from 'react';
import { X, Plus, Minus, RotateCcw, Loader, ChefHat } from 'lucide-react';
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
}

const categoryMapping: Record<string, SushiIngredient['category']> = {
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

export default function BuildYourSushi({ isOpen, onClose }: BuildYourSushiProps) {
    const { t } = useTranslation();
    const addToCart = useCartStore((state) => state.addToCart);
    const [ingredients, setIngredients] = useState<SushiIngredient[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIngredients, setSelectedIngredients] = useState<Record<string, number>>({});
    const [activeCategory, setActiveCategory] = useState<SushiIngredient['category']>('base');
    const ingredientsScrollRef = useRef<HTMLDivElement>(null);
    const previewScrollRef = useRef<HTMLDivElement>(null);
    const categories: SushiIngredient['category'][] = ['base', 'protein', 'vegetables', 'toppings', 'sauces'];

    // ===== Scroll lock for background =====
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const getMaxQuantity = (cat: SushiIngredient['category']) =>
        ({ base: 1, protein: 2, vegetables: 3, toppings: 2, sauces: 2 }[cat]);

    const calculatePrice = (pricePerKg: number, unit: string): number =>
        unit === 'kg' ? Math.round((pricePerKg / 20) * 100) / 100 : pricePerKg;

    useEffect(() => {
        if (!isOpen) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const snapshot = await getDocs(query(collection(db, 'ingredients'), where('currentStock', '>', 0)));
                const data = snapshot.docs.map((doc) => {
                    const d = doc.data();
                    const cat = categoryMapping[d.category?.toLowerCase()] || 'vegetables';
                    return {
                        id: doc.id,
                        name: d.name || 'Unknown',
                        category: cat,
                        price: calculatePrice(d.pricePerKg || 0, d.unit || 'kg'),
                        image: d.imageUrl || '',
                        maxQuantity: getMaxQuantity(cat),
                        currentStock: d.currentStock || 0,
                        unit: d.unit || 'kg',
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
    }, [isOpen]);

    useEffect(() => {
        if (ingredientsScrollRef.current) ingredientsScrollRef.current.scrollTop = 0;
    }, [activeCategory]);

    const totalPrice = useMemo(
        () =>
            Object.entries(selectedIngredients).reduce((total, [id, qty]) => {
                const ing = ingredients.find((i) => i.id === id);
                return total + (ing?.price || 0) * qty;
            }, 8),
        [selectedIngredients, ingredients]
    );

    const selectedIngredientsDetails = useMemo(
        () =>
            Object.entries(selectedIngredients)
                .map(([id, qty]) => {
                    const ing = ingredients.find((i) => i.id === id);
                    return ing ? { ...ing, quantity: qty } : null;
                })
                .filter(Boolean) as (SushiIngredient & { quantity: number })[],
        [selectedIngredients, ingredients]
    );

    const handleAdd = (id: string) => {
        const ing = ingredients.find((i) => i.id === id);
        setSelectedIngredients((prev) => {
            const current = prev[id] || 0;
            return ing && current < ing.maxQuantity ? { ...prev, [id]: current + 1 } : prev;
        });
    };
    const handleRemove = (id: string) =>
        setSelectedIngredients((prev) => {
            const current = prev[id] || 0;
            if (current <= 1) {
                const { [id]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [id]: current - 1 };
        });
    const handleReset = () => {
        setSelectedIngredients({});
        setActiveCategory('base');
    };

    const handleAddToCart = () => {
        const customSushi: MenuItem = {
            id: `custom-sushi-${Date.now()}`,
            name: 'Custom Sushi Creation',
            description: `Custom roll: ${selectedIngredientsDetails
                .map((i) => `${i.quantity}x ${i.name}`)
                .join(', ')}`,
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
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md">
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={onClose}></div>

            {/* Modal */}
            <div
                className="
                    relative w-full sm:max-w-6xl h-[95vh] sm:h-[90vh]
                    bg-black border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-black/50
                    flex flex-col overflow-hidden
                    animate-slide-up
                "
            >
                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-white/10 bg-black/80">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-light text-white">{t('buildYourSushi.title')}</h2>
                        <p className="text-white/60 text-sm mt-1">{t('buildYourSushi.subtitle')}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-6 h-6 text-white/70" />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col sm:flex-row min-h-0 overflow-hidden">
                    {/* Left Panel - Ingredients */}
                    <div className="flex-1 flex flex-col min-h-0 border-b sm:border-b-0 sm:border-r border-white/10">
                        {/* Category Tabs */}
                        <div className="flex-shrink-0 flex overflow-x-auto p-3 border-b border-white/10 bg-black/70">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all mx-1 first:ml-0 last:mr-0 ${
                                        activeCategory === cat
                                            ? 'bg-[#E62B2B] text-white shadow-md'
                                            : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {t(`buildYourSushi.categories.${cat}`)}
                                </button>
                            ))}
                        </div>

                        {/* Ingredients Grid - Scrollable */}
                        <div 
                            ref={ingredientsScrollRef}
                            className="flex-1 overflow-y-auto p-4"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center h-32">
                                    <Loader className="w-8 h-8 text-[#E62B2B] animate-spin" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {ingredients
                                        .filter((i) => i.category === activeCategory)
                                        .map((ing) => (
                                            <div
                                                key={ing.id}
                                                className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-all"
                                            >
                                                <div className="aspect-square rounded-lg overflow-hidden bg-white/5 mb-2">
                                                    {ing.image ? (
                                                        <img 
                                                            src={ing.image} 
                                                            alt={ing.name} 
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full">
                                                            <ChefHat className="w-6 h-6 text-amber-400/60" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-center text-sm text-white mb-2">
                                                    <span className="truncate">{ing.name}</span>
                                                    <span className="text-[#E62B2B] font-medium">+${ing.price.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-white/40">
                                                        {selectedIngredients[ing.id] || 0}/{ing.maxQuantity}
                                                    </span>
                                                    <button
                                                        onClick={() => handleAdd(ing.id)}
                                                        disabled={(selectedIngredients[ing.id] || 0) >= ing.maxQuantity}
                                                        className="bg-[#E62B2B] text-white p-1.5 rounded hover:bg-[#ff4444] disabled:bg-white/10 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Preview */}
                    <div className="w-full sm:w-80 xl:w-96 bg-black/60 flex flex-col min-h-0 border-t sm:border-t-0 border-white/10">
                        {/* Selected Ingredients - Scrollable */}
                        <div 
                            ref={previewScrollRef}
                            className="flex-1 overflow-y-auto p-4"
                        >
                            <h3 className="text-white text-lg font-light mb-3">{t('buildYourSushi.yourCreation')}</h3>
                            {selectedIngredientsDetails.length > 0 ? (
                                <div className="space-y-2">
                                    {selectedIngredientsDetails.map((i) => (
                                        <div 
                                            key={i.id} 
                                            className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/10"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm truncate">{i.name}</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <p className="text-[#E62B2B] text-sm font-medium">
                                                    ${(i.price * i.quantity).toFixed(2)}
                                                </p>
                                                <div className="flex items-center space-x-1">
                                                    <button 
                                                        onClick={() => handleRemove(i.id)} 
                                                        className="p-1 hover:bg-white/10 rounded transition-colors"
                                                    >
                                                        <Minus className="w-3 h-3 text-white/60" />
                                                    </button>
                                                    <span className="text-white text-sm w-4 text-center">{i.quantity}</span>
                                                    <button 
                                                        onClick={() => handleAdd(i.id)}
                                                        disabled={i.quantity >= i.maxQuantity}
                                                        className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-30"
                                                    >
                                                        <Plus className="w-3 h-3 text-white/60" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-white/40 py-8">
                                    {t('buildYourSushi.startSelecting')}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="flex-shrink-0 p-4 border-t border-white/10 bg-black/80 space-y-3">
                            <div className="flex items-center justify-between text-white">
                                <span className="font-light">{t('common.total')}</span>
                                <span className="text-xl text-[#E62B2B] font-light">${totalPrice.toFixed(2)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={handleReset}
                                    disabled={!selectedIngredientsDetails.length}
                                    className="flex items-center justify-center bg-white/5 border border-white/10 text-white/70 py-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                                >
                                    <RotateCcw className="w-4 h-4 mr-1" /> 
                                    {t('buildYourSushi.reset')}
                                </button>
                                <button
                                    onClick={handleAddToCart}
                                    disabled={!selectedIngredientsDetails.length}
                                    className="bg-[#E62B2B] text-white py-2 rounded-lg hover:bg-[#ff4444] disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                                >
                                    {t('buildYourSushi.addToCart')}
                                </button>
                            </div>
                        </div>
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
                    animation: slide-up 0.3s ease-out;
                }

                /* Custom scrollbar styling */
                .overflow-y-auto::-webkit-scrollbar {
                    width: 6px;
                }
                .overflow-y-auto::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 3px;
                }
                .overflow-y-auto::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 3px;
                }
                .overflow-y-auto::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
            `}</style>
        </div>
    );
}