import { useState } from 'react';
import emailjs from '@emailjs/browser';
import type { ContactFormData, ZapierContactPayload } from '../interfaces/IContactForm';

export const useZapierContactForms = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const sendToZapier = async (formData: ContactFormData): Promise<boolean> => {
        try {
            const zapierContactWebhookUrl =
                import.meta.env.VITE_ZAPIER_CONTACT_WEBHOOK_URL ||
                "https://hooks.zapier.com/hooks/catch/your-contact-webhook-id/";

            if (!zapierContactWebhookUrl || zapierContactWebhookUrl.includes("your-contact-webhook-id")) {
                console.warn("⚠️ Zapier contact webhook URL not configured");
                return false;
            }

            const payload: ZapierContactPayload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                message: formData.message,
                contactMethod: formData.contactMethod,
                timestamp: new Date().toISOString(),
                source: 'maisushi-website',
                formType: 'contact_form'
            };

            if (formData.contactMethod === 'catering') {
                payload.partySize = formData.partySize;
                payload.eventType = formData.eventType;
            }

            console.log("📤 Sending contact form to Zapier:", payload);

            const response = await fetch(zapierContactWebhookUrl, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`Zapier failed: ${response.status}`);

            console.log("✅ Contact form sent to Zapier");
            return true;

        } catch (error) {
            console.error("❌ Failed to send to Zapier:", error);
            return false;
        }
    };

    const sendToEmailJS = async (formData: ContactFormData): Promise<boolean> => {
        try {
            const emailjsPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
            if (!emailjsPublicKey) {
                console.warn("⚠️ EmailJS public key not configured");
                return false;
            }

            emailjs.init(emailjsPublicKey);

            const templateParams = {
                from_name: formData.name,
                from_email: formData.email,
                phone: formData.phone || 'Not provided',
                message: formData.message,
                contact_method: formData.contactMethod.toUpperCase(),
                timestamp: new Date().toLocaleString(),
                // Catering fields (will be empty for non-catering forms)
                party_size: formData.partySize || '',
                event_type: formData.eventType || ''
            };

            const result = await emailjs.send(
                'service_hi268iq',
                'template_xyhfzwc', // Your template ID
                templateParams
            );


            console.log("✅ Email sent via EmailJS", result);
            return true;

        } catch (error) {
            console.error("❌ Failed to send email via EmailJS:", error);
            return false;
        }
    };

    const submitContactForm = async (formData: ContactFormData): Promise<boolean> => {
        setIsSubmitting(true);

        try {
            const [zapierSuccess, emailSuccess] = await Promise.allSettled([
                sendToZapier(formData),
                sendToEmailJS(formData)
            ]);

            const zapierOk = zapierSuccess.status === 'fulfilled' && zapierSuccess.value;
            const emailOk = emailSuccess.status === 'fulfilled' && emailSuccess.value;

            console.log(`📊 Results - Zapier: ${zapierOk}, EmailJS: ${emailOk}`);
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