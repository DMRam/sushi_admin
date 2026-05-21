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

type PointsTxnResult =
    | {
        success: true;
        previousBalance: number;
        newBalance: number;
        pointsEarned: number;
    }
    | {
        success: false;
        error: string;
    };

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

function formatMoney(value: number | undefined | null) {
    return `$${money2(Number(value ?? 0)).toFixed(2)}`;
}

function firstText(...values: unknown[]) {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }

    return "";
}

export default function SuccessPage() {
    const [searchParams] = useSearchParams();

    const orderIdParam = searchParams.get("orderId") || searchParams.get("order_id");
    const rawSessionId = searchParams.get("session_id");
    const paymentIntent = searchParams.get("payment_intent");
    const localCheckoutId = searchParams.get("localCheckoutId");

    const pending = useMemo(() => {
        if (localCheckoutId) {
            return safeParseJSON<PendingCloverCheckout>(
                localStorage.getItem(`pendingCloverCheckout:${localCheckoutId}`)
            );
        }

        return (
            safeParseJSON<PendingCloverCheckout>(
                localStorage.getItem("pendingCloverCheckout")
            ) ||
            safeParseJSON<PendingCloverCheckout>(
                sessionStorage.getItem("pendingCloverCheckout")
            )
        );
    }, [localCheckoutId]);

    const storedSessionId =
        pending?.checkoutSessionId ||
        localStorage.getItem("cloverCheckoutSessionId") ||
        sessionStorage.getItem("cloverCheckoutSessionId");

    const sessionId =
        rawSessionId && rawSessionId !== "{CHECKOUT_SESSION_ID}"
            ? rawSessionId
            : storedSessionId || pending?.checkoutSessionId || null;

    const targetOrderId = useMemo(() => {
        return orderIdParam || pending?.orderId || sessionId || paymentIntent || null;
    }, [orderIdParam, pending?.orderId, sessionId, paymentIntent]);

    const clearCart = useCartStore((state) => state.clearCart);
    const { isClient, clientProfile, loading: authLoading } = useClientAuth();

    const [loading, setLoading] = useState(true);
    const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
    const [pointsData, setPointsData] = useState<PointsData | null>(null);
    const [_pointsHistory, setPointsHistory] = useState<PointsHistoryItem[]>([]);
    const [pointsError, setPointsError] = useState<string | null>(null);
    const [supabaseOrderId, setSupabaseOrderId] = useState<string | null>(null);
    const [giftCardsCreated, setGiftCardsCreated] = useState<CreatedGiftCard[]>([]);
    const [processedKey, setProcessedKey] = useState<string | null>(null);

    console.log("🔥 SUCCESS PAGE DEBUG", {
        rawSessionId,
        storedSessionId,
        pendingCheckoutSessionId: pending?.checkoutSessionId,
        localCheckoutId,
        sessionId,
        orderIdParam,
        paymentIntent,
        targetOrderId,
        pending,
    });

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
        const ref = doc(db, "cloverCheckoutSessions", orderIdentifier);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
            console.warn("📭 Order not found in Firestore, using fallback", {
                orderIdentifier,
            });

            return createFallbackOrder(orderIdentifier, pendingCheckout);
        }

        const data: any = snap.data();

        // Parse metadata/fullForm if they come as strings
        const fullForm =
            typeof data.fullForm === "string"
                ? safeParseJSON<any>(data.fullForm) || {}
                : data.fullForm || {};

        const metadata = data.metadata || {};

        const metadataTotals =
            typeof metadata.totals === "string"
                ? safeParseJSON<any>(metadata.totals) || {}
                : metadata.totals || {};

        const metadataCustomerInfo =
            typeof metadata.customerInfo === "string"
                ? safeParseJSON<any>(metadata.customerInfo) || {}
                : metadata.customerInfo || {};

        const metadataFullForm =
            typeof metadata.fullForm === "string"
                ? safeParseJSON<any>(metadata.fullForm) || {}
                : metadata.fullForm || {};

        const metadataDeliveryInfo =
            typeof metadata.deliveryInfo === "string"
                ? safeParseJSON<any>(metadata.deliveryInfo) || {}
                : metadata.deliveryInfo || {};

        // Build items safely
        const items = (data.items || []).map((item: any, i: number) => {
            const qty = Number(item.quantity ?? item.unitQty ?? 1) || 1;

            const rawPrice = Number(
                item.priceCents ??
                item.price ??
                0
            );

            // Clover values are cents
            const priceDollars =
                rawPrice > 100
                    ? rawPrice / 100
                    : rawPrice;

            return {
                id: item.productId || item.id || `item_${i}`,
                name: item.name || "Product",
                price: money2(priceDollars),
                quantity: qty,
            };
        });

        const pendingTotals = pendingCheckout?.totals || null;

        const computedSubtotal = items.reduce((sum: number, it: any) => {
            return sum + money2(it.price) * (Number(it.quantity) || 1);
        }, 0);

        const subtotal = money2(
            Number(
                metadataTotals.subtotal ??
                pendingTotals?.subtotal ??
                computedSubtotal
            )
        );

        const gst = money2(
            Number(
                metadataTotals.gst ??
                (metadata.gstCents
                    ? Number(metadata.gstCents) / 100
                    : undefined) ??
                pendingTotals?.gst ??
                0
            )
        );

        const qst = money2(
            Number(
                metadataTotals.qst ??
                (metadata.qstCents
                    ? Number(metadata.qstCents) / 100
                    : undefined) ??
                pendingTotals?.qst ??
                0
            )
        );

        const deliveryFee = money2(
            Number(
                metadataTotals.deliveryFee ??
                pendingTotals?.deliveryFee ??
                0
            )
        );

        const finalTotal = money2(
            Number(
                metadataTotals.finalTotal ??
                (data.expectedTotalCents
                    ? Number(data.expectedTotalCents) / 100
                    : undefined) ??
                (metadata.expectedTotalCents
                    ? Number(metadata.expectedTotalCents) / 100
                    : undefined) ??
                pendingTotals?.finalTotal ??
                subtotal + gst + qst + deliveryFee
            )
        );

        // REAL customer extraction
        const customerInfo = {
            name:
                data.customerName ||
                fullForm.firstName ||
                fullForm.name ||
                metadata.customerName ||
                metadataCustomerInfo.name ||
                "",

            email:
                data.customerEmail ||
                fullForm.email ||
                metadata.customerEmail ||
                metadataCustomerInfo.email ||
                "",

            phone:
                data.customerPhone ||
                fullForm.phone ||
                metadata.customerPhone ||
                metadataCustomerInfo.phone ||
                "",

            address:
                fullForm.address ||
                metadata.address ||
                "",

            city:
                fullForm.city ||
                metadata.city ||
                "",

            province: "QC",

            zipCode:
                fullForm.zipCode ||
                metadata.zipCode ||
                "",
        };

        const deliveryMethod =
            fullForm.deliveryMethod ||
            metadataFullForm.deliveryMethod ||
            metadata.deliveryMethod ||
            data.deliveryMethod ||
            "pickup";

        const orderNotes = firstText(
            fullForm.orderNotes,
            metadataFullForm.orderNotes,
            metadata.orderNotes,
            data.orderNotes
        );

        const pickupTime = firstText(
            fullForm.pickupTime,
            metadataFullForm.pickupTime,
            metadata.pickupTime,
            data.pickupTime
        );

        const deliveryInstructions = firstText(
            fullForm.deliveryInstructions,
            metadataFullForm.deliveryInstructions,
            metadataDeliveryInfo.instructions,
            metadata.deliveryInstructions,
            data.deliveryInstructions
        );

        const checkoutForm = {
            ...metadataFullForm,
            ...fullForm,
            orderNotes,
            pickupTime,
            deliveryInstructions,
            deliveryMethod,
        };

        const deliveryAddress =
            deliveryMethod === "delivery"
                ? [
                    customerInfo.address,
                    customerInfo.zipCode,
                    customerInfo.city,
                ]
                    .filter(Boolean)
                    .join(", ")
                : "";

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

            status:
                data.paymentStatus === "paid"
                    ? "completed"
                    : data.status || "completed",

            delivery_type: deliveryMethod,
            type: deliveryMethod,

            customerInfo,

            customer_name: customerInfo.name,
            customer_email: customerInfo.email,
            customer_phone: customerInfo.phone,

            delivery_address: deliveryAddress,
            orderNotes,
            order_notes: orderNotes,
            pickupTime,
            pickup_time: pickupTime,
            deliveryInstructions,
            delivery_instructions: deliveryInstructions,
            checkout_form: checkoutForm,

            totals: {
                subtotal,
                gst,
                qst,
                deliveryFee,
                finalTotal,
            },
        };
    };

    const processGiftCardPurchase = useCallback(async () => {
        console.log("🎁 Starting gift card processing...");

        if (!sessionId) {
            console.warn("⚠️ No sessionId found. Skipping gift card creation.", {
                rawSessionId,
                storedSessionId,
                pendingCheckoutSessionId: pending?.checkoutSessionId,
                localCheckoutId,
            });
            return;
        }

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

            const raw = await res.text();

            let data: any = {};
            try {
                data = raw ? JSON.parse(raw) : {};
            } catch (e) {
                console.error("❌ Failed to parse finalizeGiftCardOrder JSON:", e);
            }

            console.log("📡 finalizeGiftCardOrder response:", {
                status: res.status,
                data,
            });

            if (!res.ok) {
                console.error("❌ finalizeGiftCardOrder failed:", data);
                return;
            }

            if (data?.giftCards?.length) {
                setGiftCardsCreated(data.giftCards);
            }
        } catch (err) {
            console.error("❌ Gift card finalize error:", err);
        }
    }, [
        sessionId,
        rawSessionId,
        storedSessionId,
        pending?.checkoutSessionId,
        localCheckoutId,
    ]);

    const syncOrderToSupabase = async (
        userId: string,
        order: OrderDetails,
        profile: any
    ) => {
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
                    localCheckoutId,
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

                const orderData = await fetchOrderFromFirestore(targetOrderId, pending);
                setOrderDetails(orderData);

                await fetch("https://us-central1-sushi-admin.cloudfunctions.net/finalizeWebsiteOrder", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        checkoutSessionId: sessionId || targetOrderId,
                        orderNotes: orderData.orderNotes || "",
                        pickupTime: orderData.pickupTime || "",
                        deliveryInstructions: orderData.deliveryInstructions || "",
                    }),
                });

                fetch("https://automation.ulogicit.com/webhook/maisushi-web-sales", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ order: orderData }),
                }).catch((err) => console.warn("Staff notification failed:", err));

                await processGiftCardPurchase();

                setProcessedKey(key);

                if (ENABLE_SUPABASE_SYNC && isClient && clientProfile?.id && orderData) {
                    const supabaseOrder = await syncOrderToSupabase(
                        clientProfile.id,
                        orderData,
                        clientProfile
                    );

                    if (supabaseOrder) {
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

                if (localCheckoutId) {
                    localStorage.removeItem(`pendingCloverCheckout:${localCheckoutId}`);
                }

                localStorage.removeItem("pendingCloverCheckout");
                localStorage.removeItem("cloverCheckoutSessionId");
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
        localCheckoutId,
    ]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="text-white/70 text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-[#f26350]" />
                    <p className="text-sm font-semibold uppercase tracking-[0.18em]">Processing your order</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
                <div className="overflow-hidden border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(242,99,80,0.18),transparent_34%),linear-gradient(135deg,#101010,#050505)] shadow-2xl shadow-black/40">
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1fr)]">
                        <section className="border-b border-white/10 p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
                            <div className="inline-flex items-center gap-3 border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/15">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </span>
                                Payment received
                            </div>

                            <p className="mt-8 text-[11px] font-extrabold uppercase tracking-[0.28em] text-[#f26350]">
                                Mai Sushi
                            </p>

                            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                                Order confirmed
                            </h1>

                            <p className="mt-4 max-w-xl text-base leading-7 text-white/65">
                                Thank you for your order. The kitchen has received it and will prepare everything fresh for pickup.
                            </p>

                            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="border border-white/10 bg-black/20 p-4">
                                    <div className="text-2xl font-semibold text-white">20-30</div>
                                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                                        Min prep
                                    </div>
                                </div>
                                <div className="border border-white/10 bg-black/20 p-4">
                                    <div className="text-2xl font-semibold text-[#f26350]">
                                        {formatMoney(orderDetails?.final_total)}
                                    </div>
                                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                                        Total paid
                                    </div>
                                </div>
                                <div className="border border-white/10 bg-black/20 p-4">
                                    <div className="text-2xl font-semibold text-white">
                                        {orderDetails?.items?.length || 0}
                                    </div>
                                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                                        Items
                                    </div>
                                </div>
                            </div>

                            {supabaseOrderId && (
                                <div className="mt-5 border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                                    Added to your client account.
                                </div>
                            )}

                            {!isClient && (
                                <div className="mt-5 border border-[#f26350]/30 bg-[#f26350]/10 p-4">
                                    <p className="text-sm font-semibold text-white">Earn points next time</p>
                                    <p className="mt-1 text-sm leading-6 text-white/60">
                                        Create an account to save your details, track orders, and collect Mai Sushi rewards.
                                    </p>
                                </div>
                            )}

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Link
                                    to="/order"
                                    className="inline-flex items-center justify-center bg-[#f26350] px-6 py-4 text-[12px] font-extrabold uppercase tracking-[0.12em] text-white shadow-lg shadow-[#f26350]/20 transition hover:bg-[#ff725f]"
                                >
                                    Order Again
                                </Link>
                                <Link
                                    to="/"
                                    className="inline-flex items-center justify-center border border-white/15 px-6 py-4 text-[12px] font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
                                >
                                    Back Home
                                </Link>
                            </div>
                        </section>

                        <section className="p-6 sm:p-8 lg:p-10">
                            {orderDetails && (
                                <div className="border border-white/10 bg-[#0b0b0b] p-5 sm:p-6">
                                    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                                        <div>
                                            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#f26350]">
                                                Receipt
                                            </p>
                                            <h2 className="mt-2 text-2xl font-semibold text-white">Order summary</h2>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs uppercase tracking-[0.16em] text-white/40">Status</div>
                                            <div className="mt-1 text-sm font-semibold text-emerald-300">Paid</div>
                                        </div>
                                    </div>

                                    <div className="mt-5 space-y-3 text-sm text-white/70">
                                        <SummaryRow label="Subtotal" value={formatMoney(orderDetails.subtotal)} />
                                        <SummaryRow label="GST" value={formatMoney(orderDetails.gst)} />
                                        <SummaryRow label="QST" value={formatMoney(orderDetails.qst)} />
                                        <SummaryRow label="Delivery Fee" value={formatMoney(orderDetails.delivery_fee)} />
                                        <div className="border-t border-white/10 pt-4">
                                            <SummaryRow
                                                label="Total"
                                                value={formatMoney(orderDetails.final_total)}
                                                strong
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-6 border-t border-white/10 pt-5">
                                        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                                            Items
                                        </h3>
                                        <div className="mt-3 space-y-3">
                                            {orderDetails.items.length > 0 ? (
                                                orderDetails.items.map((item, index) => (
                                                    <div
                                                        key={item.id || index}
                                                        className="flex justify-between gap-4 border border-white/10 bg-white/[0.03] p-3 text-sm"
                                                    >
                                                        <span className="min-w-0 text-white/75">
                                                            <span className="font-semibold text-white">{item.quantity}x</span>{' '}
                                                            {item.name}
                                                        </span>
                                                        <span className="shrink-0 font-semibold text-white">
                                                            {formatMoney(item.price * item.quantity)}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="border border-white/10 bg-white/[0.03] p-3 text-sm text-white/50">
                                                    Receipt items are being finalized.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {(orderDetails.orderNotes ||
                                        orderDetails.pickupTime ||
                                        orderDetails.deliveryInstructions) && (
                                            <div className="mt-6 border-t border-white/10 pt-5">
                                                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                                                    Order details
                                                </h3>
                                                <div className="mt-3 space-y-3">
                                                    {orderDetails.pickupTime && (
                                                        <div className="border border-white/10 bg-white/[0.03] p-3 text-sm">
                                                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                                                                Pickup time
                                                            </div>
                                                            <div className="mt-1 font-semibold text-white">
                                                                {orderDetails.pickupTime === "asap"
                                                                    ? "As soon as possible"
                                                                    : orderDetails.pickupTime}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {orderDetails.orderNotes && (
                                                        <div className="border border-[#f26350]/25 bg-[#f26350]/10 p-3 text-sm">
                                                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#f26350]">
                                                                Order notes
                                                            </div>
                                                            <div className="mt-1 leading-6 text-white/85">
                                                                {orderDetails.orderNotes}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {orderDetails.deliveryInstructions && (
                                                        <div className="border border-white/10 bg-white/[0.03] p-3 text-sm">
                                                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                                                                Delivery instructions
                                                            </div>
                                                            <div className="mt-1 leading-6 text-white/75">
                                                                {orderDetails.deliveryInstructions}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                </div>
                            )}

                            {giftCardsCreated.length > 0 && (
                                <div className="mt-5 border border-[#f26350]/30 bg-[#f26350]/10 p-5">
                                    <h3 className="text-lg font-semibold text-white">Your Mai Sushi gift card</h3>

                                    <p className="mt-2 text-sm leading-6 text-white/65">
                                        Use this code at checkout on maisushi.ca. Please keep it safe.
                                    </p>

                                    <div className="mt-4 space-y-3">
                                        {giftCardsCreated.map((card) => (
                                            <div key={card.code} className="border border-white/10 bg-black/30 p-4">
                                                <SummaryRow label="Amount" value={formatMoney(card.amount)} />
                                                <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                                                    <span className="text-sm text-white/60">Code</span>
                                                    <span className="text-right font-bold tracking-widest text-white">
                                                        {card.code}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {pointsData && (
                                <div className="mt-5 border border-amber-400/20 bg-amber-400/10 p-5">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-sm font-semibold text-amber-300">Points earned</span>
                                        <span className="text-2xl font-semibold text-amber-300">
                                            +{pointsData.pointsEarned}
                                        </span>
                                    </div>
                                    <div className="mt-3 space-y-2 border-t border-amber-400/15 pt-3 text-xs">
                                        <SummaryRow label="Previous Balance" value={`${pointsData.previousBalance} pts`} />
                                        <SummaryRow label="New Balance" value={`${pointsData.newBalance} pts`} strong />
                                    </div>
                                </div>
                            )}

                            {pointsError && (
                                <div className="mt-5 border border-red-500/20 bg-red-500/10 p-4">
                                    <span className="text-sm text-red-300">{pointsError}</span>
                                </div>
                            )}

                            {orderDetails?.id && (
                                <div className="mt-5 text-xs leading-5 text-white/35">
                                    <div>Order Reference: {orderDetails.id}</div>
                                    {supabaseOrderId && <div>Client Order: {supabaseOrderId}</div>}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SummaryRow({
    label,
    value,
    strong = false,
}: {
    label: string;
    value: string;
    strong?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className={strong ? "font-semibold text-white" : "text-white/60"}>{label}</span>
            <span className={strong ? "font-semibold text-white" : "text-white/80"}>{value}</span>
        </div>
    );
}
