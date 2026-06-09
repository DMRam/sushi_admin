import type { OrderDetails } from "../../client_hub/interfaces/IClientHub";
import type { N8nOrderPayload } from "../interfaces/IN8nOrderWorkflow";

export const useN8nOrderWorkflow = () => {
    const sendToN8n = async (order: OrderDetails, _isClient: boolean, clientProfile: any) => {
        try {
            const n8nWebhookUrl = import.meta.env.VITE_N8N_ORDER_WEBHOOK_URL || "";

            if (!n8nWebhookUrl) {
                console.warn("n8n order webhook URL not configured");
                return false;
            }

            const customerName =
                order.customer_name ||
                order.customerInfo?.name ||
                order.shippingAddress?.name ||
                clientProfile?.full_name ||
                [clientProfile?.firstName, clientProfile?.lastName]
                    .filter(Boolean)
                    .join(" ") ||
                "Unknown";

            const customerEmail =
                order.customer_email ||
                order.customerInfo?.email ||
                clientProfile?.email ||
                "unknown@email.com";

            const customerPhone =
                order.customer_phone ||
                order.customerInfo?.phone ||
                clientProfile?.phone ||
                "unknown";

            const payload: N8nOrderPayload = {
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
                currency: "CAD",
                subtotal: order.subtotal,
                tax: order.gst + order.qst,
                shipping: order.delivery_fee,
                delivery_type: order.delivery_type || "delivery"
            };

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(n8nWebhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`n8n order webhook failed: ${response.status} ${response.statusText}`);
            }

            return true;

        } catch (error: any) {
            if (error.name === "AbortError") {
                console.warn("n8n order workflow request timed out");
            } else {
                console.error("Failed to send order data to n8n:", error);
            }
            return false;
        }
    };

    return { sendToN8n };
};
