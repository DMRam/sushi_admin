import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCartStore } from "../stores/cartStore";
import { useClientAuth } from "./client_hub/hooks/useClientAuth";
import { supabase, supabaseAdmin } from "../lib/supabase";
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { PointsService } from "./client_hub/service/PointsService";
import type { OrderDetails } from "./client_hub/interfaces/IClientHub";

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

type PointsTxnSuccess = {
    success: true;
    previousBalance: number;
    newBalance: number;
    pointsEarned: number;
};

type PointsTxnFail = {
    success: false;
    error: string;
};

type PointsTxnResult = PointsTxnSuccess | PointsTxnFail;

type CreatedGiftCard = {
    code: string;
    amount: number;
};

const ENABLE_SUPABASE_SYNC = true;

type PendingCloverCheckout = {
    orderId?: string;
    checkoutSessionId?: string | null;
    totals?: {
        subtotal: number;
        gst: number;
        qst: number;
        deliveryFee: number;
        finalTotal: number;
    };
};

function safeParseJSON<T>(raw: string | null): T | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

function money2(n: number) {
    return Number.isFinite(n) ? n : 0;
}

export default function SuccessPage() {
    const [searchParams] = useSearchParams();

    const orderIdParam = searchParams.get("orderId") || searchParams.get("order_id");
    const rawSessionId = searchParams.get("session_id");
    const paymentIntent = searchParams.get("payment_intent");

    const storedSessionId = sessionStorage.getItem("cloverCheckoutSessionId");

    const pending = useMemo(() => {
        return safeParseJSON<PendingCloverCheckout>(
            sessionStorage.getItem("pendingCloverCheckout")
        );
    }, []);

    const sessionId =
        rawSessionId && rawSessionId !== "{CHECKOUT_SESSION_ID}"
            ? rawSessionId
            : storedSessionId || pending?.checkoutSessionId || null;

    const targetOrderId = useMemo(() => {
        return orderIdParam || pending?.orderId || sessionId || paymentIntent || null;
    }, [orderIdParam, pending?.orderId, sessionId, paymentIntent]);

    console.log("🔥 SUCCESS PAGE DEBUG", {
        rawSessionId,
        storedSessionId,
        pendingCheckoutSessionId: pending?.checkoutSessionId,
        sessionId,
        orderIdParam,
        paymentIntent,
        targetOrderId,
        pending,
    });

    const clearCart = useCartStore((state) => state.clearCart);
    const { isClient, clientProfile, loading: authLoading } = useClientAuth();

    const [loading, setLoading] = useState(true);
    const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);

    const [pointsData, setPointsData] = useState<PointsData | null>(null);
    const [pointsHistory, setPointsHistory] = useState<PointsHistoryItem[]>([]);
    const [pointsError, setPointsError] = useState<string | null>(null);

    const [supabaseOrderId, setSupabaseOrderId] = useState<string | null>(null);
    const [giftCardsCreated, setGiftCardsCreated] = useState<CreatedGiftCard[]>([]);

    const [processedKey, setProcessedKey] = useState<string | null>(null);

    console.log(
        "🔥 Stored checkout session:",
        sessionStorage.getItem("cloverCheckoutSessionId")
    );

    useEffect(() => {
        clearCart();
    }, [clearCart]);

    const createFallbackOrder = (
        id: string,
        pendingCheckout: PendingCloverCheckout | null
    ): OrderDetails => {
        const pendingTotals = pendingCheckout?.totals;
        const subtotal = money2(pendingTotals?.subtotal ?? 0);
        const gst = money2(pendingTotals?.gst ?? 0);
        const qst = money2(pendingTotals?.qst ?? 0);
        const deliveryFee = money2(pendingTotals?.deliveryFee ?? 0);
        const finalTotal = money2(
            pendingTotals?.finalTotal ?? subtotal + gst + qst + deliveryFee
        );

        return {
            id,
            amount: finalTotal,
            subtotal,
            gst,
            qst,
            delivery_fee: deliveryFee,
            final_total: finalTotal,
            created_at: new Date().toISOString(),
            items: [],
            status: "completed",
            delivery_type: "pickup",
            totals: { subtotal, gst, qst, deliveryFee, finalTotal },
            type: "pickup",
        };
    };

    const fetchOrderFromFirestore = async (
        orderIdentifier: string,
        pendingCheckout: PendingCloverCheckout | null
    ): Promise<OrderDetails> => {
        const ref = doc(db, "orders", orderIdentifier);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
            console.warn("📭 Order not found in Firestore, using fallback", {
                orderIdentifier,
            });
            return createFallbackOrder(orderIdentifier, pendingCheckout);
        }

        const data: any = snap.data();

        const items = (data.items || []).map((item: any, i: number) => {
            const qty = Number(item.quantity ?? 1) || 1;
            const priceDollars = Number.isFinite(Number(item.priceCents))
                ? Number(item.priceCents) / 100
                : Number.isFinite(Number(item.price))
                    ? Number(item.price)
                    : 0;

            return {
                id: item.productId || item.id || `item_${i}`,
                name: item.name || "Product",
                price: money2(priceDollars),
                quantity: qty,
            };
        });

        const totals = data.totals || null;

        const computedSubtotal = items.reduce((sum: number, it: any) => {
            return sum + money2(it.price) * (Number(it.quantity) || 1);
        }, 0);

        const pendingTotals = pendingCheckout?.totals || null;

        const subtotal = money2(totals?.subtotal ?? pendingTotals?.subtotal ?? computedSubtotal);
        const gst = money2(totals?.gst ?? pendingTotals?.gst ?? 0);
        const qst = money2(totals?.qst ?? pendingTotals?.qst ?? 0);
        const deliveryFee = money2(totals?.deliveryFee ?? pendingTotals?.deliveryFee ?? 0);

        const finalTotal = money2(
            totals?.finalTotal ?? pendingTotals?.finalTotal ?? subtotal + gst + qst + deliveryFee
        );

        const customerInfo = data.customerInfo || {};

        const createdAtISO = data.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : new Date(data.createdAt || Date.now()).toISOString();

        return {
            id: orderIdentifier,
            amount: finalTotal,
            subtotal,
            gst,
            qst,
            delivery_fee: deliveryFee,
            final_total: finalTotal,
            created_at: createdAtISO,
            items,
            status: data.paymentStatus === "paid" ? "completed" : data.status || "confirmed",
            delivery_type: customerInfo.deliveryMethod || data.deliveryType || "pickup",
            delivery_address: data.shippingAddress?.address
                ? `${data.shippingAddress.address.line1 ?? ""}, ${data.shippingAddress.address.postal_code ?? ""}, ${data.shippingAddress.address.city ?? ""}`
                : "",
            customer_name: customerInfo.firstName || customerInfo.name || "",
            customer_email: customerInfo.email || data.customerEmail || "",
            customer_phone: customerInfo.phoneNumber || customerInfo.phone || "",
            totals: { subtotal, gst, qst, deliveryFee, finalTotal },
            type: customerInfo.deliveryMethod || data.deliveryType || "pickup",
        };
    };

    const processGiftCardPurchase = useCallback(async () => {
        console.log("🎁 Starting gift card processing...");

        if (!sessionId) {
            console.warn("⚠️ No sessionId found. Skipping gift card creation.", {
                rawSessionId,
                storedSessionId,
                pendingCheckoutSessionId: pending?.checkoutSessionId,
            });
            return;
        }

        console.log("📦 Using sessionId for gift card:", sessionId);

        try {
            const res = await fetch(
                "https://us-central1-sushi-admin.cloudfunctions.net/finalizeGiftCardOrder",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        checkoutSessionId: sessionId,
                    }),
                }
            );

            console.log("📡 finalizeGiftCardOrder response status:", res.status);

            const raw = await res.text();
            console.log("📡 finalizeGiftCardOrder raw response:", raw);

            let data: any = {};
            try {
                data = raw ? JSON.parse(raw) : {};
            } catch (e) {
                console.error("❌ Failed to parse finalizeGiftCardOrder response JSON:", e);
            }

            console.log("📡 finalizeGiftCardOrder parsed response:", data);

            if (!res.ok) {
                console.error("❌ finalizeGiftCardOrder failed:", data);
                return;
            }

            if (data?.giftCards?.length) {
                console.log("✅ Gift cards created:", data.giftCards);
                setGiftCardsCreated(data.giftCards);
            } else {
                console.warn("⚠️ No gift cards returned from backend", data);
            }

            if (data?.message) {
                console.log("ℹ️ Backend message:", data.message);
            }
        } catch (err) {
            console.error("❌ Gift card finalize error:", err);
        }
    }, [sessionId, rawSessionId, storedSessionId, pending?.checkoutSessionId]);

    const syncOrderToSupabase = async (userId: string, order: OrderDetails, profile: any) => {
        try {
            const { data: existingOrder, error: checkError } = await supabase
                .from("orders")
                .select("id")
                .eq("firebase_order_id", order.id)
                .eq("user_id", userId)
                .maybeSingle();

            if (checkError && (checkError as any).code !== "PGRST116") {
                throw new Error(`Failed to check existing order: ${checkError.message}`);
            }

            if (existingOrder) return existingOrder;

            const supabaseOrderData = {
                user_id: userId,
                firebase_order_id: order.id,
                order_number: `ORD-${order.id.slice(-8).toUpperCase()}`,
                status: order.status || "completed",
                delivery_type: order.delivery_type,
                delivery_address: order.delivery_address,
                customer_name: order.customer_name || profile?.full_name,
                customer_email: order.customer_email || profile?.email,
                customer_phone: order.customer_phone || profile?.phone,
                subtotal: order.subtotal,
                gst: order.gst,
                qst: order.qst,
                delivery_fee: order.delivery_fee,
                final_total: order.final_total,
                items: order.items,
                order_date: order.created_at,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            const { data: newOrder, error: insertError } = await supabaseAdmin
                .from("orders")
                .insert(supabaseOrderData)
                .select()
                .single();

            if (insertError) throw new Error(`Failed to sync order: ${insertError.message}`);

            return newOrder;
        } catch (error) {
            console.error("💥 Supabase sync error:", error);
            return null;
        }
    };

    const trackConversion = (order: OrderDetails) => {
        if ((window as any).gtag && order) {
            (window as any).gtag("event", "purchase", {
                transaction_id: order.id,
                value: order.final_total,
                currency: "CAD",
                items: order.items.map((item) => ({
                    item_id: item.id,
                    item_name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                })),
            });
        }

        window.fbq?.("track", "Purchase", {
            value: order.final_total,
            currency: "CAD",
            contents: order.items.map((item) => ({
                id: item.id,
                quantity: item.quantity,
            })),
            content_type: "product",
        });
    };

    useEffect(() => {
        const run = async () => {
            if (!targetOrderId) {
                console.error("❌ No order ID/session/payment found", {
                    orderIdParam,
                    rawSessionId,
                    storedSessionId,
                    paymentIntent,
                    pending,
                });
                setLoading(false);
                return;
            }

            if (authLoading) {
                console.log("⏳ Waiting for auth to finish...");
                return;
            }

            const userId = clientProfile?.id ?? "guest";
            const key = `${targetOrderId}:${userId}`;

            if (processedKey === key) {
                console.log("⚠️ Success flow already processed. Skipping.", { key });
                return;
            }

            setPointsError(null);

            try {
                setLoading(true);

                console.log("🚀 Running success flow with:", {
                    targetOrderId,
                    sessionId,
                    pending,
                    userId,
                });

                const orderData = await fetchOrderFromFirestore(targetOrderId, pending);
                setOrderDetails(orderData);

                await processGiftCardPurchase();

                setProcessedKey(key);

                if (ENABLE_SUPABASE_SYNC && isClient && clientProfile?.id && orderData) {
                    const supabaseOrder = await syncOrderToSupabase(
                        clientProfile.id,
                        orderData,
                        clientProfile
                    );

                    if (supabaseOrder) {
                        console.log("✅ Order synced to Supabase:", supabaseOrder.id);
                        setSupabaseOrderId(supabaseOrder.id);
                    }
                }

                if (isClient && clientProfile?.id && orderData) {
                    const pointsEarned = Math.floor(money2(orderData.final_total));

                    if (pointsEarned > 0) {
                        const result = (await PointsService.addTransaction({
                            userId: clientProfile.id,
                            orderId: orderData.id,
                            points: pointsEarned,
                            type: "order",
                            metadata: {
                                amount: orderData.final_total,
                                orderNumber: `#${orderData.id.slice(-8)}`,
                            },
                        })) as PointsTxnResult;

                        if (result.success) {
                            setPointsData({
                                pointsEarned: result.pointsEarned,
                                previousBalance: result.previousBalance,
                                newBalance: result.newBalance,
                            });
                        } else {
                            setPointsError(result.error || "Points transaction failed");
                        }

                        const history = await PointsService.getUserPointsHistory(clientProfile.id);
                        setPointsHistory(history);
                    }
                } else {
                    setPointsData(null);
                    setPointsHistory([]);
                }

                trackConversion(orderData);

                sessionStorage.removeItem("pendingCloverCheckout");
                sessionStorage.removeItem("cloverCheckoutSessionId");

                console.log("✅ Success flow completed.");
            } catch (err: any) {
                console.error("❌ Error processing success:", err);
                setPointsError(err?.message || "Error processing success page");
            } finally {
                setLoading(false);
            }
        };

        run();
    }, [
        targetOrderId,
        authLoading,
        isClient,
        clientProfile?.id,
        pending,
        processedKey,
        processGiftCardPurchase,
        orderIdParam,
        rawSessionId,
        storedSessionId,
        paymentIntent,
        sessionId,
    ]);

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
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-400/30">
                            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <h1 className="text-3xl font-bold text-white mb-2">Order Confirmed 🎉</h1>
                        <p className="text-white/70">Thank you for your purchase!</p>

                        {supabaseOrderId && (
                            <p className="text-green-400/80 text-sm mt-1">✅ Added to your client account</p>
                        )}
                    </div>

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

                    {giftCardsCreated.length > 0 && (
                        <div className="bg-[#E62B2B]/10 border border-[#E62B2B]/30 rounded-xl p-6 mb-6">
                            <h3 className="text-lg font-semibold text-white mb-3">
                                🎁 Your Maisushi Gift Card
                            </h3>

                            <p className="text-white/70 text-sm mb-4">
                                Use this code at checkout on maisushi.ca. Please keep it safe.
                            </p>

                            <div className="space-y-3">
                                {giftCardsCreated.map((card) => (
                                    <div key={card.code} className="bg-black/30 border border-white/10 rounded-lg p-4">
                                        <div className="flex justify-between gap-3 text-sm text-white/70 mb-1">
                                            <span>Amount</span>
                                            <span>${card.amount.toFixed(2)}</span>
                                        </div>

                                        <div className="flex justify-between gap-3 items-center">
                                            <span className="text-white/70 text-sm">Code</span>
                                            <span className="text-white font-bold tracking-widest">
                                                {card.code}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {pointsData && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-yellow-400 text-sm">Points Earned</span>
                                <span className="text-yellow-400 font-bold text-lg">+{pointsData.pointsEarned}</span>
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

                    {pointsError && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                            <span className="text-red-400 text-sm">{pointsError}</span>
                        </div>
                    )}

                    {pointsHistory.length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                            <h3 className="text-lg font-semibold text-white mb-3">Recent Points Activity</h3>
                            <ul className="space-y-2 text-sm text-white/80">
                                {pointsHistory.map((item) => (
                                    <li key={item.id} className="flex justify-between border-b border-white/10 pb-2 last:border-0 last:pb-0">
                                        <span className="truncate mr-2">{item.description}</span>
                                        <span className="text-yellow-400 font-semibold whitespace-nowrap">
                                            {item.points >= 0 ? "+" : ""}
                                            {item.points} pts
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {!isClient && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                            <span className="text-blue-400 text-sm">Create an account to earn points!</span>
                        </div>
                    )}

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
                                {supabaseOrderId && ` • Client Order: ${supabaseOrderId}`}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}