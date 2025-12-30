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

interface ZapierContactPayload {
    name: string
    email: string
    phone: string
    message: string
    contactMethod: string
    partySize?: string
    eventType?: string
    timestamp: string
    source: string
    formType: string
}

export const useZapierContactForms = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const sendToZapier = async (formData: ContactFormData, activeTab: string): Promise<boolean> => {
        try {
            const zapierContactWebhookUrl =
                import.meta.env.VITE_ZAPIER_CONTACT_WEBHOOK_URL ||
                "https://hooks.zapier.com/hooks/catch/25366263/uz9amwt/";

            if (!zapierContactWebhookUrl || zapierContactWebhookUrl.includes("your-contact-webhook-id")) {
                console.warn("⚠️ Zapier contact webhook URL not configured");
                return false;
            }

            const payload: ZapierContactPayload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                message: formData.message,
                contactMethod: activeTab,
                timestamp: new Date().toISOString(),
                source: 'maisushi-website',
                formType: 'contact_form'
            };

            if (activeTab === 'catering') {
                payload.partySize = formData.partySize;
                payload.eventType = formData.eventType;
            }

            console.log("📤 Sending contact form to Zapier:", payload);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(zapierContactWebhookUrl, {
                method: "POST",
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Zapier failed: ${response.status}`);

            console.log("✅ Contact form sent to Zapier");
            return true;

        } catch (error) {
            console.error("❌ Failed to send to Zapier:", error);
            return false;
        }
    };

    const sendToEmailJS = async (formData: ContactFormData, activeTab: string): Promise<boolean> => {
        // Skip EmailJS for promotions - only send to Zapier for marketing list
        if (activeTab === 'promotions') {
            console.log("🔄 Skipping EmailJS for promotions signup");
            return true; // Return true since we don't want this to count as a failure
        }

        try {
            const emailjsServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
            const emailjsTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
            const emailjsPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

            console.log('EmailJS Config:', {
                serviceId: emailjsServiceId,
                templateId: emailjsTemplateId,
                publicKey: emailjsPublicKey ? 'Set' : 'Missing'
            });

            if (!emailjsServiceId || !emailjsTemplateId || !emailjsPublicKey) {
                console.warn("⚠️ EmailJS configuration missing");
                return false;
            }

            // Initialize EmailJS
            emailjs.init(emailjsPublicKey);

            // Template parameters must EXACTLY match your template variables
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

            console.log('Sending EmailJS with template params:', templateParams);

            const result = await emailjs.send(
                emailjsServiceId,
                emailjsTemplateId,
                templateParams
            );

            console.log("✅ Email sent via EmailJS", result);
            return true;

        } catch (error) {
            console.error("❌ Failed to send email via EmailJS:", error);

            // More detailed error logging
            if (error instanceof Error) {
                console.error("EmailJS error details:", {
                    message: error.message,
                    stack: error.stack
                });
            }
            return false;
        }
    };

    const submitContactForm = async (formData: ContactFormData, activeTab: string): Promise<boolean> => {
        setIsSubmitting(true);

        try {
            // For promotions: Only send to Zapier (for Google Sheet)
            if (activeTab === 'promotions') {
                console.log("🎯 Promotions form - only sending to Zapier for marketing list");
                const zapierSuccess = await sendToZapier(formData, activeTab);
                console.log(`📊 Promotions submission result - Zapier: ${zapierSuccess}`);
                return zapierSuccess;
            }

            // For catering and general inquiries: Send to both Zapier and EmailJS
            console.log("📨 Catering/General form - sending to both Zapier and EmailJS");
            const [zapierSuccess, emailSuccess] = await Promise.allSettled([
                sendToZapier(formData, activeTab),
                sendToEmailJS(formData, activeTab)
            ]);

            const zapierOk = zapierSuccess.status === 'fulfilled' && zapierSuccess.value;
            const emailOk = emailSuccess.status === 'fulfilled' && emailSuccess.value;

            console.log(`📊 Submission Results - Zapier: ${zapierOk}, EmailJS: ${emailOk}`);

            // For catering/general, consider it successful if at least one method worked
            return zapierOk || emailOk;

        } catch (error) {
            console.error("❌ Contact form submission error:", error);
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return { submitContactForm, isSubmitting };
};