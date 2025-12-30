export interface ContactFormData {
    name: string;
    email: string;
    phone: string;
    partySize: string;
    eventType: string;
    message: string;
    contactMethod: 'catering' | 'promotions' | 'general';
}

export interface ZapierContactPayload {
    name: string;
    email: string;
    phone: string;
    partySize?: string;
    eventType?: string;
    message: string;
    contactMethod: string;
    timestamp: string;
    source: string;
    formType: 'contact_form';
}