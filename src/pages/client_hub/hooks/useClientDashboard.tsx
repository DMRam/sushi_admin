// hooks/useClientDashboard.ts
import { useState, useCallback, useEffect } from 'react';
import { query, collection, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { supabase, supabaseAdmin } from "../../../lib/supabase";
import type { ClientProfile } from "../../../types/types";
import type { OrderDetails, PointsHistoryItem, QuickReorderItem, SpecialOffer } from "../interfaces/IClientHub";
import { PointsService } from "../service/PointsService";

interface DashboardStats {
    totalSpent: number;
    averageOrder: number;
    favoriteCategory: string;
    monthlyOrders: number;
}

interface UseClientDashboardReturn {
    // State
    activeTab: string;
    setActiveTab: (tab: string) => void;
    pointsHistory: PointsHistoryItem[];
    recentOrders: OrderDetails[];
    specialOffers: SpecialOffer[];
    quickReorderItems: QuickReorderItem[];
    loadingData: boolean;
    stats: DashboardStats;
    isMobile: boolean;

    // Functions
    fetchDashboardData: () => Promise<void>;
    handleProfileUpdate: (updatedProfile: ClientProfile) => Promise<void>;
    formatDate: (dateString: string) => string;
    formatCurrency: (amount: number) => string;
}

export const useClientDashboard = (clientProfile: ClientProfile | null, setClientProfile: (profile: ClientProfile) => void): UseClientDashboardReturn => {
    const [activeTab, setActiveTab] = useState('overview');
    const [pointsHistory, setPointsHistory] = useState<PointsHistoryItem[]>([]);
    const [recentOrders, setRecentOrders] = useState<OrderDetails[]>([]);
    const [specialOffers, setSpecialOffers] = useState<SpecialOffer[]>([]);
    const [quickReorderItems, setQuickReorderItems] = useState<QuickReorderItem[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({
        totalSpent: 0,
        averageOrder: 0,
        favoriteCategory: '',
        monthlyOrders: 0
    });
    const [isMobile, setIsMobile] = useState(false);

    // Mobile detection
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Real-time subscriptions
    useEffect(() => {
        if (!clientProfile?.id) return;

        // Points subscription
        const pointsSubscription = supabase
            .channel('points-changes')
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'points_history',
                    filter: `user_id=eq.${clientProfile.id}`
                },
                (payload) => {
                    console.log('New points activity received:', payload);
                    PointsService.getUserPointsHistory(clientProfile.id, isMobile ? 5 : 10)
                        .then(setPointsHistory)
                        .catch(console.error);
                }
            )
            .subscribe();

        // Orders subscription
        const ordersSubscription = supabase
            .channel('orders-changes')
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'orders',
                    filter: `user_id=eq.${clientProfile.id}`
                },
                (payload) => {
                    console.log('New order received:', payload);
                    fetchDashboardData();
                }
            )
            .subscribe();

        return () => {
            pointsSubscription.unsubscribe();
            ordersSubscription.unsubscribe();
        };
    }, [clientProfile?.id, isMobile]);

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoadingData(true);
            if (!clientProfile) return;

            // Fetch points history
            const pointsHistoryData = await PointsService.getUserPointsHistory(clientProfile.id, isMobile ? 5 : 10);
            setPointsHistory(pointsHistoryData);

            // Fetch recent orders using supabaseAdmin to bypass RLS
            const { data: ordersData, error: ordersError } = await supabaseAdmin
                .from('orders')
                .select('*')
                .eq('user_id', clientProfile.id)
                .order('created_at', { ascending: false })
                .limit(isMobile ? 25 : 50);

            let totalSpent = 0;
            const categoryCount: { [key: string]: number } = {};
            const productOrderCount: {
                [key: string]: {
                    count: number;
                    totalQuantity: number;
                    lastOrdered: string;
                    name: string;
                    price: number;
                    image?: string;
                    category?: string;
                };
            } = {};

            const processedOrders: OrderDetails[] = [];

            if (!ordersError && ordersData) {
                console.log('✅ Orders fetched successfully:', ordersData.length, 'orders');
                ordersData.forEach((order) => {
                    const orderTotal = parseFloat(order.final_total) || 0;
                    totalSpent += orderTotal;

                    // Parse items
                    let items = [];
                    try {
                        items = typeof order.items === 'string'
                            ? JSON.parse(order.items)
                            : order.items || [];
                    } catch (e) {
                        console.error('Error parsing order items:', e);
                        items = [];
                    }

                    const processedOrder: OrderDetails = {
                        id: order.firebase_order_id || order.id,
                        items: items.map((item: any) => {
                            const productId = item.productId || item.id;
                            const quantity = item.quantity || 1;

                            // Enhanced product tracking
                            if (productId) {
                                const existing = productOrderCount[productId] || {
                                    count: 0,
                                    totalQuantity: 0,
                                    lastOrdered: '',
                                    name: item.name,
                                    price: item.price || 0,
                                    image: item.image,
                                    category: item.category
                                };

                                productOrderCount[productId] = {
                                    ...existing,
                                    count: existing.count + 1,
                                    totalQuantity: existing.totalQuantity + quantity,
                                    lastOrdered: order.created_at || new Date().toISOString()
                                };
                            }

                            // Enhanced category tracking
                            if (item.category) {
                                categoryCount[item.category] = (categoryCount[item.category] || 0) + quantity;
                            }

                            return {
                                id: productId,
                                name: item.name,
                                quantity: quantity,
                                price: item.price || 0,
                                productId: productId,
                                image: item.image,
                                category: item.category
                            };
                        }),
                        totals: {
                            subtotal: parseFloat(order.subtotal) || 0,
                            gst: parseFloat(order.gst) || 0,
                            qst: parseFloat(order.qst) || 0,
                            deliveryFee: parseFloat(order.delivery_fee) || 0,
                            finalTotal: orderTotal
                        },
                        created_at: order.order_date || order.created_at,
                        status: order.status || 'Completed',
                        type: order.delivery_type as 'delivery' | 'pickup' || 'delivery',
                        delivery_address: order.delivery_address,
                        amount: 0,
                        subtotal: 0,
                        gst: 0,
                        qst: 0,
                        delivery_fee: 0,
                        final_total: 0
                    };
                    processedOrders.push(processedOrder);
                });

                setRecentOrders(processedOrders.slice(0, isMobile ? 3 : 5));
            } else {
                console.error('❌ Error fetching orders from Supabase:', ordersError);
                await fetchOrdersFromFirebase(clientProfile.id);
            }

            // Calculate favorite category (considering quantity)
            const favoriteCategory = Object.keys(categoryCount).length > 0
                ? Object.keys(categoryCount).reduce((a, b) =>
                    categoryCount[a] > categoryCount[b] ? a : b
                )
                : 'No favorites yet';

            // Calculate monthly orders
            const monthlyOrders = processedOrders.filter(order => {
                const orderDate = new Date(order.created_at);
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return orderDate > monthAgo;
            }).length;

            setStats({
                totalSpent,
                averageOrder: processedOrders.length > 0 ? totalSpent / processedOrders.length : 0,
                favoriteCategory,
                monthlyOrders
            });

            const quickReorder = Object.entries(productOrderCount)
                .sort(([, a], [, b]) => {
                    if (b.totalQuantity !== a.totalQuantity) {
                        return b.totalQuantity - a.totalQuantity;
                    }
                    return b.count - a.count;
                })
                .slice(0, isMobile ? 4 : 8)
                .map(([productId, data]) => ({
                    productId,
                    name: data.name,
                    price: data.price,
                    image: data.image,
                    lastOrdered: data.lastOrdered,
                    orderCount: data.count,
                    totalQuantity: data.totalQuantity,
                    category: data.category
                }));

            setQuickReorderItems(quickReorder);

            // Fetch special offers using supabaseAdmin
            const { data: offers, error: offersError } = await supabaseAdmin
                .from('special_offers')
                .select('*')
                .gte('valid_until', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(isMobile ? 3 : 6);

            if (!offersError && offers) {
                setSpecialOffers(offers);
            } else {
                console.error('❌ Error fetching special offers:', offersError);
            }

        } catch (error) {
            console.error('💥 Error fetching dashboard data:', error);
        } finally {
            setLoadingData(false);
        }
    }, [clientProfile, isMobile]);

    const fetchOrdersFromFirebase = async (userId: string) => {
        try {
            console.log('🔄 Falling back to Firebase for orders...');
            const ordersQuery = query(
                collection(db, 'orders'),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            );

            const ordersSnapshot = await getDocs(ordersQuery);
            const ordersData: OrderDetails[] = [];
            let totalSpent = 0;
            const categoryCount: { [key: string]: number } = {};
            const productOrderCount: {
                [key: string]: {
                    count: number;
                    totalQuantity: number;
                    lastOrdered: string;
                    name: string;
                    price: number;
                    image?: string;
                    category?: string;
                };
            } = {};

            ordersSnapshot.forEach((doc) => {
                const data = doc.data();
                const orderTotal = data.totals?.finalTotal || 0;
                totalSpent += orderTotal;

                const order: OrderDetails = {
                    id: doc.id,
                    items: data.items?.map((item: any) => {
                        const productId = item.productId;
                        const quantity = item.quantity || 1;

                        // Enhanced product tracking (matching Supabase logic)
                        if (productId) {
                            const existing = productOrderCount[productId] || {
                                count: 0,
                                totalQuantity: 0,
                                lastOrdered: '',
                                name: item.name,
                                price: item.sellingPrice || item.price || 0,
                                image: item.image,
                                category: item.category
                            };

                            productOrderCount[productId] = {
                                ...existing,
                                count: existing.count + 1,
                                totalQuantity: existing.totalQuantity + quantity,
                                lastOrdered: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
                            };
                        }

                        // Enhanced category tracking
                        if (item.category) {
                            categoryCount[item.category] = (categoryCount[item.category] || 0) + quantity;
                        }

                        return {
                            id: productId,
                            name: item.name,
                            quantity: quantity,
                            price: item.sellingPrice || item.price || 0,
                            productId: productId,
                            image: item.image,
                            category: item.category
                        };
                    }) || [],
                    totals: data.totals || {
                        subtotal: 0,
                        gst: 0,
                        qst: 0,
                        deliveryFee: 0,
                        finalTotal: 0
                    },
                    created_at: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
                    status: data.paymentStatus === 'paid' ? 'Completed' : data.status || 'Processing',
                    type: data.deliveryType || 'delivery',
                    delivery_address: data.deliveryAddress,
                    amount: 0,
                    subtotal: 0,
                    gst: 0,
                    qst: 0,
                    delivery_fee: 0,
                    final_total: 0
                };
                ordersData.push(order);
            });

            setRecentOrders(ordersData.slice(0, isMobile ? 3 : 5));

            // Update stats with enhanced Firebase data
            const favoriteCategory = Object.keys(categoryCount).length > 0
                ? Object.keys(categoryCount).reduce((a, b) =>
                    categoryCount[a] > categoryCount[b] ? a : b
                )
                : 'No favorites yet';

            const monthlyOrders = ordersData.filter(order => {
                const orderDate = new Date(order.created_at);
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return orderDate > monthAgo;
            }).length;

            setStats(prev => ({
                ...prev,
                totalSpent,
                averageOrder: ordersData.length > 0 ? totalSpent / ordersData.length : 0,
                favoriteCategory,
                monthlyOrders
            }));

            // Update quick reorder with enhanced Firebase data
            const quickReorder = Object.entries(productOrderCount)
                .sort(([, a], [, b]) => {
                    if (b.totalQuantity !== a.totalQuantity) {
                        return b.totalQuantity - a.totalQuantity;
                    }
                    return b.count - a.count;
                })
                .slice(0, isMobile ? 4 : 8)
                .map(([productId, data]) => ({
                    productId,
                    name: data.name,
                    price: data.price,
                    image: data.image,
                    lastOrdered: data.lastOrdered,
                    orderCount: data.count,
                    totalQuantity: data.totalQuantity,
                    category: data.category
                }));

            setQuickReorderItems(quickReorder);

        } catch (firebaseError) {
            console.error('💥 Error fetching from Firebase fallback:', firebaseError);
        }
    };

    const handleProfileUpdate = async (updatedProfile: ClientProfile) => {
        console.log('🔄 Updating client profile:', updatedProfile);

        // Update local state immediately
        setClientProfile(updatedProfile);

        // Silently update database in background
        try {
            const { error } = await supabase
                .from('client_profiles')
                .update({
                    avatar_url: updatedProfile.avatar_url,
                    updated_at: new Date().toISOString()
                })
                .eq('id', updatedProfile.id);

            if (error) {
                console.warn('⚠️ Database update failed (avatar still uploaded):', error);
            } else {
                console.log('✅ Profile updated in database');
            }
        } catch (error) {
            console.warn('⚠️ Database update failed silently:', error);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD'
        }).format(amount);
    };

    // Auto-fetch data when clientProfile changes
    useEffect(() => {
        if (clientProfile?.id) {
            fetchDashboardData();
        }
    }, [clientProfile?.id, fetchDashboardData]);

    return {
        // State
        activeTab,
        setActiveTab,
        pointsHistory,
        recentOrders,
        specialOffers,
        quickReorderItems,
        loadingData,
        stats,
        isMobile,

        // Functions
        fetchDashboardData,
        handleProfileUpdate,
        formatDate,
        formatCurrency
    };
};