import { useState } from 'react';
import emailjs from '@emailjs/browser';

interface ContactFormData {
    name: string
    email: string
    phone: string
    partySize: string
    eventType: string
    message: string
    contactMethod: 'catering' | 'promotions' | 'general'
}

interface N8nContactPayload {
    name: string
    email: string
    phone: string
    message: string
    contactMethod: string
    partySize?: string
    eventType?: string
    timestamp: string
    submittedAt: string
    source: string
    pageUrl: string
    locale: string
    destination: string
    formType: string
    formSource: 'catering & events' | 'general inquiry' | 'get promotions'
}

export const useN8nContactForms = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const sendToN8n = async (formData: ContactFormData, activeTab: string): Promise<boolean> => {
        try {
            const n8nContactWebhookUrl =
                import.meta.env.VITE_MAISUSHI_CONTACT_WEBHOOK_URL ||
                import.meta.env.VITE_N8N_MAISUSHI_CONTACT_WEBHOOK_URL;

            if (!n8nContactWebhookUrl || n8nContactWebhookUrl.includes("your-contact-webhook-id")) {
                console.warn("Contact webhook URL not configured");
                return false;
            }

            const formSource =
                activeTab === 'catering'
                    ? 'catering & events'
                    : activeTab === 'promotions'
                        ? 'get promotions'
                        : 'general inquiry';
            const submittedAt = new Date().toISOString();
            const payload: N8nContactPayload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                message: formData.message,
                contactMethod: activeTab,
                timestamp: submittedAt,
                submittedAt,
                source: 'maisushi.ca',
                pageUrl: typeof window !== 'undefined' ? window.location.href : 'server-render',
                locale: typeof document !== 'undefined' ? document.documentElement.lang || navigator.language : 'unknown',
                destination: 'contact@maisushi.ca',
                formType: 'contact_form',
                formSource,
            };

            if (activeTab === 'catering') {
                payload.partySize = formData.partySize;
                payload.eventType = formData.eventType;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(n8nContactWebhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Contact webhook failed: ${response.status}`);

            return true;

        } catch (error) {
            console.error("Failed to send contact form:", error);
            return false;
        }
    };

    const sendToEmailJS = async (formData: ContactFormData, activeTab: string): Promise<boolean> => {
        if (activeTab === 'promotions') {
            return true;
        }

        try {
            const emailjsServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
            const emailjsTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
            const emailjsPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

            if (!emailjsServiceId || !emailjsTemplateId || !emailjsPublicKey) {
                console.warn("EmailJS configuration missing");
                return false;
            }

            emailjs.init(emailjsPublicKey);

            const templateParams = {
                from_name: formData.name,
                from_email: formData.email,
                phone: formData.phone || 'Not provided',
                message: formData.message,
                contact_method: activeTab.toUpperCase(),
                party_size: formData.partySize || 'Not specified',
                event_type: formData.eventType || 'Not specified',
                timestamp: new Date().toLocaleString(),
                subject: `${activeTab.toUpperCase()} Inquiry from ${formData.name}`,
                reply_to: formData.email
            };

            await emailjs.send(
                emailjsServiceId,
                emailjsTemplateId,
                templateParams
            );

            return true;

        } catch (error) {
            console.error("Failed to send email via EmailJS:", error);
            return false;
        }
    };

    const submitContactForm = async (formData: ContactFormData, activeTab: string): Promise<boolean> => {
        setIsSubmitting(true);

        try {
            if (activeTab === 'promotions') {
                return await sendToN8n(formData, activeTab);
            }

            const [n8nSuccess, emailSuccess] = await Promise.allSettled([
                sendToN8n(formData, activeTab),
                sendToEmailJS(formData, activeTab)
            ]);

            const n8nOk = n8nSuccess.status === 'fulfilled' && n8nSuccess.value;
            const emailOk = emailSuccess.status === 'fulfilled' && emailSuccess.value;

            return n8nOk || emailOk;

        } catch (error) {
            console.error("Contact form submission error:", error);
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return { submitContactForm, isSubmitting };
};
