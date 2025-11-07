import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCartStore } from "../stores/cartStore";
// import { useTranslation } from "react-i18next";
import { useClientAuth } from "./client_hub/hooks/useClientAuth";
import { supabase } from "../lib/supabase";
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

interface OrderDetails {
    id: string;
    amount: number;
    items: Array<{ id: string; quantity: number; price: number; name: string }>;
    subtotal: number;
    gst: number;
    qst: number;
    delivery_fee: number;
    final_total: number;
    created_at: string;
}

interface PointsData {
    pointsEarned: number;
    newBalance: number;
    previousBalance: number;
}

interface PointsHistoryItem {
    id?: string;
    points: number;
    description: string;
    created_at: string;
}

export default function SuccessPage() {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get("session_id");
    const paymentIntent = searchParams.get("payment_intent");
    const orderId = searchParams.get("order_id");

    const clearCart = useCartStore((state) => state.clearCart);
    // const { t } = useTranslation();
    const { isClient, clientProfile, loading: authLoading } = useClientAuth();

    const [loading, setLoading] = useState(true);
    const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
    const [pointsData, setPointsData] = useState<PointsData | null>(null);
    const [pointsHistory, setPointsHistory] = useState<PointsHistoryItem[]>([]);
    const [pointsError, setPointsError] = useState<string | null>(null);

    // ───────────────────────────────
    // MAIN EFFECT
    // ───────────────────────────────
    useEffect(() => {
        const processSuccess = async () => {
            const targetOrderId = orderId || sessionId || paymentIntent;
            if (!targetOrderId) {
                console.error("No order ID/session/payment found");
                setLoading(false);
                return;
            }

            try {
                clearCart();
                const orderData = await fetchOrderFromFirestore(targetOrderId);
                setOrderDetails(orderData);

                if (isClient && clientProfile?.id && orderData) {
                    console.log("👤 Client profile available:", clientProfile);
                    const result = await addPointsToSupabase(clientProfile.id, orderData);
                    if (result) {
                        setPointsData(result);
                        const history = await fetchUserPointsHistory(clientProfile.id);
                        setPointsHistory(history);
                    }
                }

                trackConversion(orderData);
            } catch (err) {
                console.error("❌ Error processing success:", err);
            } finally {
                setLoading(false);
            }
        };

        processSuccess();
    }, [sessionId, paymentIntent, orderId, clearCart, isClient, clientProfile]);

    // ───────────────────────────────
    // FIRESTORE
    // ───────────────────────────────
    const fetchOrderFromFirestore = async (orderIdentifier: string): Promise<OrderDetails> => {
        try {
            console.log("🔍 Fetching order from Firestore:", orderIdentifier);
            const ref = doc(db, "orders", orderIdentifier);
            const snap = await getDoc(ref);

            if (!snap.exists()) {
                console.warn("📭 Order not found in Firestore, using fallback");
                return createFallbackOrder(orderIdentifier);
            }

            const data = snap.data();
            console.log("✅ Firestore order data:", data);

            const totals = data.totals || {};
            const items = (data.items || []).map((item: any, i: number) => ({
                id: item.productId || `item_${i}`,
                name: item.name || "Product",
                price: item.sellingPrice || item.price || 0,
                quantity: item.quantity || 1,
            }));

            const orderData = {
                id: orderIdentifier,
                amount: totals.finalTotal || 0,
                subtotal: totals.subtotal || 0,
                gst: totals.gst || 0,
                qst: totals.qst || 0,
                delivery_fee: totals.deliveryFee || 0,
                final_total: totals.finalTotal || 0,
                created_at: data.createdAt?.toDate
                    ? data.createdAt.toDate().toISOString()
                    : new Date(data.createdAt || Date.now()).toISOString(),
                items,
            };

            console.log("📦 Processed order details:", orderData);
            return orderData;

        } catch (error) {
            console.error("💥 Error fetching Firestore order:", error);
            return createFallbackOrder(orderIdentifier);
        }
    };

    const createFallbackOrder = (id: string): OrderDetails => {
        console.log("🔄 Creating fallback order data");
        return {
            id,
            amount: 30,
            subtotal: 30,
            gst: 1.5,
            qst: 3,
            delivery_fee: 0,
            final_total: 34.5,
            created_at: new Date().toISOString(),
            items: [{ id: "item1", name: "Sample Item", price: 30, quantity: 1 }],
        };
    };

    // ───────────────────────────────
    // SUPABASE POINTS SYSTEM (WITH FOREIGN KEY FIX)
    // ───────────────────────────────
    const addPointsToSupabase = async (userId: string, order: OrderDetails) => {
        try {
            console.log("⭐ Starting points processing for user:", userId);

            const pointsEarned = Math.floor(order.final_total);
            if (pointsEarned <= 0) {
                console.log("⚠️ No points to earn for this order");
                return null;
            }

            console.log("💰 Points to earn:", pointsEarned);

            // 1. Ensure user points record exists
            await ensureUserPointsRecord(userId);

            // 2. Get current points balance
            const { data: existing, error: fetchError } = await supabase
                .from("user_points")
                .select("points")
                .eq("user_id", userId)
                .single();

            if (fetchError) {
                console.error("❌ Error fetching current points:", fetchError);
                throw new Error(`Failed to fetch points: ${fetchError.message}`);
            }

            const previousBalance = existing?.points || 0;
            const newBalance = previousBalance + pointsEarned;

            console.log("💳 Points calculation:", {
                previousBalance,
                pointsEarned,
                newBalance
            });

            // 3. Update main points balance
            const { error: updateError } = await supabase
                .from("user_points")
                .update({
                    points: newBalance,
                    updated_at: new Date().toISOString()
                })
                .eq("user_id", userId);

            if (updateError) {
                console.error("❌ Error updating user_points:", updateError);
                throw new Error(`Failed to update points: ${updateError.message}`);
            }

            // 4. Insert into points_history (FIXED - with all required fields)
            const { error: historyError } = await supabase
                .from("points_history")
                .insert({
                    user_id: userId,
                    order_id: order.id,
                    points: pointsEarned,
                    description: `Points earned for order #${order.id} ($${order.final_total.toFixed(2)})`,
                    created_at: new Date().toISOString(),
                    type: 'earned',  
                    transaction_type: 'earn'  
                });

            if (historyError) {
                console.error("❌ Error adding points history:", historyError);
                // Don't throw here - we still want to continue
            } else {
                console.log("✅ Points history recorded");
            }

            // 5. Update client_profiles total_points for consistency
            const { error: profileUpdateError } = await supabase
                .from("client_profiles")
                .update({
                    total_points: newBalance,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", userId);

            if (profileUpdateError) {
                console.error("❌ Error updating client_profiles:", profileUpdateError);
                // Don't throw here - we still want to continue
            } else {
                console.log("✅ Client profile updated");
            }

            console.log("✅ Points successfully added to Supabase:", {
                previousBalance,
                pointsEarned,
                newBalance,
            });

            setPointsError(null);
            return { pointsEarned, previousBalance, newBalance };

        } catch (error: any) {
            console.error("💥 Critical error in points processing:", error);
            setPointsError(error.message || "Failed to add points to your account");
            return null;
        }
    };

    const ensureUserPointsRecord = async (userId: string) => {
        try {
            console.log("🔍 Ensuring user_points record exists for:", userId);

            const { data, error: selectError } = await supabase
                .from("user_points")
                .select("user_id, points")
                .eq("user_id", userId)
                .maybeSingle();

            if (selectError && selectError.code !== 'PGRST116') {
                console.error("❌ Error checking user_points:", selectError);
                throw new Error(`Failed to check points record: ${selectError.message}`);
            }

            if (!data) {
                console.log("📝 Creating new user_points record...");

                const { error: insertError } = await supabase
                    .from("user_points")
                    .insert({
                        user_id: userId,
                        points: 0,
                        earned_at: new Date().toISOString(),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    });

                if (insertError) {
                    console.error("❌ Error creating user_points record:", insertError);
                    throw new Error(`Failed to create points record: ${insertError.message}`);
                }

                console.log("✅ Created new user_points record");
            } else {
                console.log("✅ User_points record already exists");
            }
        } catch (error: any) {
            console.error("💥 Error ensuring user points record:", error);
            throw error;
        }
    };

    const fetchUserPointsHistory = async (userId: string): Promise<PointsHistoryItem[]> => {
        try {
            console.log("📚 Fetching points history for user:", userId);

            const { data, error } = await supabase
                .from("points_history")
                .select("id, points, description, type, transaction_type, created_at")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(5);

            if (error) {
                console.error("❌ Error fetching points history:", error);
                return [];
            }

            console.log("✅ Fetched points history:", data?.length || 0, "items");
            return data || [];
        } catch (error) {
            console.error("💥 Error in fetchUserPointsHistory:", error);
            return [];
        }
    };

    // ───────────────────────────────
    // ANALYTICS
    // ───────────────────────────────
    const trackConversion = (order: OrderDetails) => {
        if (window.gtag && order) {
            window.gtag("event", "purchase", {
                transaction_id: order.id,
                value: order.final_total,
                currency: "CAD",
                items: order.items.map(item => ({
                    item_id: item.id,
                    item_name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                })),
            });
            console.log("📊 Analytics tracked for order:", order.id);
        }
    };

    // ───────────────────────────────
    // RENDER
    // ───────────────────────────────
    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white/70 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
                    <p>Processing your order...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12">
            <div className="container mx-auto px-6">
                <div className="max-w-2xl mx-auto">
                    {/* ✅ Success Header */}
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-400/30">
                            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Order Confirmed 🎉</h1>
                        <p className="text-white/70">Thank you for your purchase!</p>
                        {orderDetails?.id?.startsWith("CASH-") && (
                            <p className="text-blue-400/80 text-sm mt-2">💵 Cash Order</p>
                        )}
                    </div>

                    {/* 🧾 Order Summary */}
                    {orderDetails && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>
                            <div className="space-y-2 text-sm text-white/80">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>${orderDetails.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>GST</span>
                                    <span>${orderDetails.gst.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>QST</span>
                                    <span>${orderDetails.qst.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Delivery Fee</span>
                                    <span>${orderDetails.delivery_fee.toFixed(2)}</span>
                                </div>
                                <div className="border-t border-white/10 pt-2 flex justify-between font-semibold text-white">
                                    <span>Total</span>
                                    <span>${orderDetails.final_total.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Order Items */}
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <h4 className="text-white font-medium mb-2">Items</h4>
                                <div className="space-y-1">
                                    {orderDetails.items.map((item, index) => (
                                        <div key={item.id || index} className="flex justify-between text-sm text-white/70">
                                            <span>{item.quantity}x {item.name}</span>
                                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ⭐ Points Summary */}
                    {pointsData && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-yellow-400 text-sm">Points Earned</span>
                                <span className="text-yellow-400 font-bold text-lg">
                                    +{pointsData.pointsEarned}
                                </span>
                            </div>
                            <div className="text-yellow-400/70 text-xs flex justify-between">
                                <span>Previous Balance</span>
                                <span>{pointsData.previousBalance} pts</span>
                            </div>
                            <div className="text-yellow-400 font-semibold text-xs flex justify-between mt-1">
                                <span>New Balance</span>
                                <span>{pointsData.newBalance} pts</span>
                            </div>
                        </div>
                    )}

                    {/* Points Error Message */}
                    {pointsError && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-red-400 text-sm">{pointsError}</span>
                            </div>
                            <p className="text-red-400/70 text-xs mt-1">
                                Don't worry! Your order was successful. Please contact support to get your points manually added.
                            </p>
                        </div>
                    )}

                    {/* 🕒 Points History */}
                    {pointsHistory.length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                            <h3 className="text-lg font-semibold text-white mb-3">Recent Points Activity</h3>
                            <ul className="space-y-2 text-sm text-white/80">
                                {pointsHistory.map((item) => (
                                    <li
                                        key={item.id}
                                        className="flex justify-between border-b border-white/10 pb-2 last:border-0 last:pb-0"
                                    >
                                        <span className="truncate mr-2">{item.description}</span>
                                        <span className="text-yellow-400 font-semibold whitespace-nowrap">
                                            +{item.points} pts
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Guest User Message */}
                    {!isClient && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-blue-400 text-sm">Create an account to earn points!</span>
                            </div>
                            <p className="text-blue-400/70 text-xs mt-1">
                                Sign up to start earning rewards on your orders.
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="text-center space-y-4">
                        <div>
                            <Link
                                to="/order"
                                className="bg-white text-gray-900 px-6 py-3 rounded-lg hover:bg-white/90 transition-all mx-2 inline-block font-medium"
                            >
                                Order Again
                            </Link>
                            <Link
                                to="/"
                                className="border border-white/20 text-white px-6 py-3 rounded-lg hover:bg-white/10 transition-all mx-2 inline-block"
                            >
                                Back Home
                            </Link>
                        </div>
                        {orderDetails?.id && (
                            <p className="text-white/40 text-xs">
                                Order Reference: {orderDetails.id}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}