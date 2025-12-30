import type { OrderDetails } from "../../client_hub/interfaces/IClientHub";
import type { ZapierPayload } from "../interfaces/IZapier";

export const useZapier = () => {
    const sendToZapier = async (order: OrderDetails, _isClient: boolean, clientProfile: any) => {
        try {
            const zapierWebhookUrl =
                import.meta.env.VITE_ZAPIER_WEBHOOK_URL ||
                "https://hooks.zapier.com/hooks/catch/XXXXXXX/XXXXXXX/";

            if (!zapierWebhookUrl || zapierWebhookUrl.includes("XXXXXXX")) {
                console.warn("⚠️ Zapier webhook URL not configured properly");
                return false;
            }

            // Build customer_name safely with fallbacks
            const customerName =
                order.customer_name ||
                order.customerInfo?.name ||
                order.shippingAddress?.name ||
                clientProfile?.full_name ||
                [clientProfile?.firstName, clientProfile?.lastName]
                    .filter(Boolean)
                    .join(" ") ||
                "Unknown";

            // Build customer email fallback
            const customerEmail =
                order.customer_email ||
                order.customerInfo?.email ||
                clientProfile?.email ||
                "unknown@email.com";

            const customerPhone =
                order.customer_phone ||
                order.customerInfo?.phone ||
                clientProfile?.phone ||
                "unknown@email.com";

            // Build Zapier Payload
            const payload: ZapierPayload = {
                order_id: order.id,
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: customerPhone,
                delivery_address: order.delivery_address || '',
                total: order.final_total,
                created_at: order.created_at,
                status: order.status || "completed",
                items: order.items.map((item) => ({
                    id: String(item.id ?? ""),
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity
                })),

                // Optional fields
                currency: "CAD",
                subtotal: order.subtotal,
                tax: order.gst + order.qst,
                shipping: order.delivery_fee,
                delivery_type: order.delivery_type || "delivery"
            };

            console.log("📤 Sending to Zapier Payload:", payload);

            // Add timeout safety
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(zapierWebhookUrl, {
                method: "POST",
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Zapier webhook failed: ${response.status} ${response.statusText}`);
            }

            console.log("✅ Order data sent to Zapier");
            return true;

        } catch (error: any) {
            if (error.name === "AbortError") {
                console.warn("⚠️ Zapier request timed out");
            } else {
                console.error("❌ Failed to send data to Zapier:", error);
            }
            return false;
        }
    };

    return { sendToZapier };
};
