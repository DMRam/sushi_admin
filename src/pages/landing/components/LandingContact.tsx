import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, Phone, MapPin, Calendar, Gift } from 'lucide-react'
import { useN8nContactForms } from '../hooks/useN8nContactForms'

interface FormData {
    name: string
    email: string
    phone: string
    partySize: string
    eventType: string
    message: string
    contactMethod: 'catering' | 'promotions' | 'general'
}

export function LandingContact() {
    const { t } = useTranslation()
    const [activeTab, setActiveTab] = useState<'catering' | 'promotions' | 'general'>('general')
    const [formData, setFormData] = useState<FormData>({
        name: '',
        email: '',
        phone: '',
        partySize: '',
        eventType: '',
        message: '',
        contactMethod: 'general'
    })

    const { submitContactForm, isSubmitting } = useN8nContactForms()

    // Define success messages once at the component level
    const successMessages = {
        catering: t('landing.thankYouCatering', 'Thank you for your catering inquiry! We\'ll contact you within 24 hours to discuss your event.'),
        promotions: t('landing.thankYouPromotions', 'Thank you for signing up! You\'ll receive our latest promotions and updates.'),
        general: t('landing.thankYouGeneral', 'Thank you for your message! We\'ll get back to you within 24 hours.')
    }

    // Email fallback (keep as backup)
    const sendEmailFallback = async (formData: FormData): Promise<boolean> => {
        try {
            const subject = `${activeTab.toUpperCase()} Inquiry from ${formData.name}`;
            const body = `
Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}
Contact Method: ${activeTab}
${formData.partySize ? `Party Size: ${formData.partySize}` : ''}
${formData.eventType ? `Event Type: ${formData.eventType}` : ''}

Message:
${formData.message}

Submitted: ${new Date().toLocaleString()}
            `.trim();

            window.location.href = `mailto:contact@maisushi.ca?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            return true;
        } catch (error) {
            console.error('Email fallback failed:', error);
            return false;
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            // Use the workflow hook for n8n + EmailJS
            const submissionSuccess = await submitContactForm(formData, activeTab);

            if (submissionSuccess) {
                // Reset form on success
                setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    partySize: '',
                    eventType: '',
                    message: '',
                    contactMethod: activeTab
                })

                alert(successMessages[activeTab])
            } else {
                // If both n8n and EmailJS failed, try email fallback
                console.log('All automated methods failed, trying email fallback');
                const fallbackSuccess = await sendEmailFallback(formData);

                if (fallbackSuccess) {
                    setFormData({
                        name: '',
                        email: '',
                        phone: '',
                        partySize: '',
                        eventType: '',
                        message: '',
                        contactMethod: activeTab
                    })

                    alert(`${successMessages[activeTab]}\n\n(Your message has been prepared in your email client. Please send it to complete your submission.)`)
                } else {
                    throw new Error('All submission methods failed')
                }
            }

        } catch (error) {
            console.error('Form submission error:', error)

            let userErrorMessage = t('landing.submissionError', 'There was an error submitting your form. Please try again or contact us directly.')

            if (error instanceof Error) {
                if (error.message.includes('All submission methods failed')) {
                    userErrorMessage = 'Unable to submit form. Please email us directly at contact@maisushi.ca or call us at +1 (819) 861-3889.'
                }
            }

            alert(userErrorMessage)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }

    const switchContactTab = (tab: 'catering' | 'general') => {
        setActiveTab(tab)
        setFormData(prev => ({
            ...prev,
            contactMethod: tab
        }))
    }

    // Simple email-only submission for promotions
    const handlePromotionsSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Only need email for promotions
        if (!formData.email) {
            alert('Please enter your email address');
            return;
        }

        try {
            const submissionSuccess = await submitContactForm({
                ...formData,
                name: formData.name || 'Promotions Subscriber', // Default name if not provided
                message: formData.message || 'Interested in promotions' // Default message
            }, 'promotions');

            if (submissionSuccess) {
                // Reset form on success
                setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    partySize: '',
                    eventType: '',
                    message: '',
                    contactMethod: 'promotions'
                })
                alert(successMessages.promotions)
            } else {
                throw new Error('Submission failed')
            }

        } catch (error) {
            console.error('Promotions submission error:', error)
            alert('There was an error signing up for promotions. Please try again.')
        }
    }

    // const quickQuestions = [
    //     {
    //         question: t('landing.quickQuestion1', 'What\'s the minimum order for catering?'),
    //         answer: t('landing.quickAnswer1', 'Minimum order is $200 for parties of 10+ people.')
    //     },
    //     {
    //         question: t('landing.quickQuestion2', 'Do you deliver to my area?'),
    //         answer: t('landing.quickAnswer2', 'We deliver within 25km of Sherbrooke. Contact us for specific locations.')
    //     },
    //     {
    //         question: t('landing.quickQuestion3', 'Can you accommodate dietary restrictions?'),
    //         answer: t('landing.quickAnswer3', 'Yes! We offer vegetarian, gluten-free, and other custom options.')
    //     },
    //     {
    //         question: t('landing.quickQuestion4', 'How far in advance should I book?'),
    //         answer: t('landing.quickAnswer4', 'We recommend booking 2+ weeks in advance for best availability.')
    //     }
    // ]

    return (
        <section id="contact" className="border-t border-white/10 py-16 bg-[#050505]">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.32em] text-[#f26350]">
                        {t('landing.contactEyebrow', 'Plan something fresh')}
                    </div>
                    <h2 className="text-3xl font-light uppercase tracking-[0.12em] text-white mb-4">
                        {t('landing.getInTouch', 'Get In Touch')}
                    </h2>
                    <p className="text-white/62 font-light max-w-2xl mx-auto">
                        {t('landing.contactDescription', 'Whether you need catering, want promotions, or just have questions - we\'re here to help.')}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-[1500px] mx-auto">
                    {/* Contact Options Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Quick Questions */}
                        {/* <div className="bg-[#0e0e0e] p-6 shadow-2xl shadow-black/30 border border-white/10">
                            <h3 className="text-lg font-light text-white mb-4 flex items-center">
                                <Zap className="w-5 h-5 mr-2 text-[#f26350]" />
                                {t('landing.quickQuestions', 'Quick Questions')}
                            </h3>
                            <div className="space-y-4">
                                {quickQuestions.map((item, index) => (
                                    <details key={index} className="group">
                                        <summary className="flex justify-between items-center cursor-pointer text-sm font-light text-white/78 hover:text-white">
                                            {item.question}
                                            <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                                        </summary>
                                        <p className="mt-2 text-sm text-white/62 font-light pl-4 border-l-2 border-[#f26350]">
                                            {item.answer}
                                        </p>
                                    </details>
                                ))}
                            </div>
                        </div> */}

                        {/* Contact Information */}
                        <div className="bg-[#0e0e0e] p-6 shadow-2xl shadow-black/30 border border-white/10">
                            <h3 className="text-lg font-light text-white mb-4">
                                {t('landing.directContact', 'Direct Contact')}
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center text-white/62">
                                    <Phone className="w-4 h-4 mr-3 text-[#f26350]" />
                                    <span className="font-light">{t('landing.phoneNumberDisplay', '+1 (819) 861-3889')}</span>
                                </div>
                                <div className="flex items-center text-white/62">
                                    <Mail className="w-4 h-4 mr-3 text-[#f26350]" />
                                    <span className="font-light">{t('landing.emailAddressDisplay', 'contact@maisushi.ca')}</span>
                                </div>
                                <div className="flex items-start text-white/62">
                                    <MapPin className="w-4 h-4 mr-3 mt-1 text-[#f26350]" />
                                    <span className="font-light">
                                        {t('landing.addressLine1', '1975 King Ouest,')}<br />
                                        {t('landing.addressLine2', 'Sherbrooke, QC J1J 2E6')}
                                    </span>
                                </div>
                                <div className="flex items-start text-white/62">
                                    <Calendar className="w-4 h-4 mr-3 mt-1 text-[#f26350]" />
                                    <div className="font-light space-y-1">
                                        <div>{t('landing.hoursTuesdayWednesday', 'Tue-Wed: 12:00 PM - 8:00 PM')}</div>
                                        <div>{t('landing.hoursThursday', 'Thu: 12:00 PM - 9:00 PM')}</div>
                                        <div>{t('landing.hoursThursdaySaturday', 'Fri-Sat: 12:00 PM - 10:00 PM')}</div>
                                        <div>{t('landing.hoursSunday', 'Sun: Closed')}</div>
                                        <div>{t('landing.hoursMonday', 'Mon: Closed')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Promotions Signup Mini - SIMPLIFIED */}
                        <div className="border border-[#f26350]/35 bg-[linear-gradient(135deg,#f26350_0%,#a62f25_100%)] p-6 text-white shadow-2xl shadow-[#f26350]/15">
                            <h3 className="text-lg font-light mb-3 flex items-center">
                                <Gift className="w-5 h-5 mr-2" />
                                {t('landing.getPromotions', 'Get Promotions')}
                            </h3>
                            <p className="font-light mb-4 text-white/90 text-sm">
                                {t('landing.promotionsDescription', 'Sign up for exclusive deals and menu updates.')}
                            </p>

                            {/* Simple Email-only Form */}
                            <form onSubmit={handlePromotionsSubmit} className="space-y-3">
                                <div>
                                    <label htmlFor="promo-email" className="sr-only">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        id="promo-email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full border border-white/20 bg-white px-3 py-2.5 text-[#111] placeholder-gray-500 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-white"
                                        placeholder={t("landing.email_placeholder")}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full border border-white/20 bg-white px-4 py-2.5 text-sm font-extrabold uppercase tracking-[0.08em] text-[#f26350] shadow-sm transition-all duration-200 hover:bg-white/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-white/45"
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#f26350] border-t-transparent"></div>
                                            Signing Up...
                                        </span>
                                    ) : (
                                        t('landing.signUpNow', 'Sign Up Now')
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Main Form Area */}
                    <div className="lg:col-span-2">
                        {/* Tab Navigation */}
                        <div className="flex border border-white/10 bg-[#0b0b0b]">
                            <button
                                type="button"
                                onClick={() => switchContactTab('general')}
                                className={`flex-1 py-4 px-6 text-center text-[12px] font-extrabold uppercase tracking-[0.1em] transition-colors ${activeTab === 'general'
                                    ? 'text-[#f26350] border-b-2 border-[#f26350]'
                                    : 'text-white/45 hover:text-white/78'
                                    }`}
                            >
                                {t('landing.generalInquiry', 'General Inquiry')}
                            </button>
                            <button
                                type="button"
                                onClick={() => switchContactTab('catering')}
                                className={`flex-1 py-4 px-6 text-center text-[12px] font-extrabold uppercase tracking-[0.1em] transition-colors ${activeTab === 'catering'
                                    ? 'text-[#f26350] border-b-2 border-[#f26350]'
                                    : 'text-white/45 hover:text-white/78'
                                    }`}
                            >
                                {t('landing.cateringEvents', 'Catering & Events')}
                            </button>
                        </div>

                        {/* Dynamic Form Content - Only for Catering & General */}
                        <div className="bg-[#0e0e0e] p-8 shadow-2xl shadow-black/30 border-x border-b border-white/10">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <input type="hidden" name="contactMethod" value={activeTab} />

                                {/* Name & Email - Always Required */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-light text-white/78 mb-2">
                                            {t('landing.contactName', 'Contact Name *')}
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full border border-white/12 bg-[#050505] px-4 py-3 font-light text-white placeholder-white/32 transition-colors focus:border-[#f26350] focus:outline-none"
                                            placeholder={t('landing.namePlaceholder', 'Your full name')}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-light text-white/78 mb-2">
                                            {t('landing.emailAddress', 'Email Address *')}
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full border border-white/12 bg-[#050505] px-4 py-3 font-light text-white placeholder-white/32 transition-colors focus:border-[#f26350] focus:outline-none"
                                            placeholder={t('landing.emailPlaceholder', 'your.email@example.com')}
                                        />
                                    </div>
                                </div>

                                {/* Phone - Required for catering, optional for general */}
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-light text-white/78 mb-2">
                                        {t('landing.phoneNumber', 'Phone Number')}
                                        {activeTab === 'catering' && ' *'}
                                    </label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        required={activeTab === 'catering'}
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full border border-white/12 bg-[#050505] px-4 py-3 font-light text-white placeholder-white/32 transition-colors focus:border-[#f26350] focus:outline-none"
                                        placeholder={t('landing.phonePlaceholder', '(555) 123-4567')}
                                    />
                                </div>

                                {/* Catering Specific Fields */}
                                {activeTab === 'catering' && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label htmlFor="partySize" className="block text-sm font-light text-white/78 mb-2">
                                                    {t('landing.partySize', 'Estimated Party Size *')}
                                                </label>
                                                <select
                                                    id="partySize"
                                                    name="partySize"
                                                    required
                                                    value={formData.partySize}
                                                    onChange={handleChange}
                                                    className="w-full border border-white/12 bg-[#050505] px-4 py-3 font-light text-white placeholder-white/32 transition-colors focus:border-[#f26350] focus:outline-none"
                                                >
                                                    <option value="">{t('landing.selectSize', 'Select size')}</option>
                                                    <option value="10-25">{t('landing.size10_25', '10-25 people')}</option>
                                                    <option value="26-50">{t('landing.size26_50', '26-50 people')}</option>
                                                    <option value="51-100">{t('landing.size51_100', '51-100 people')}</option>
                                                    <option value="100+">{t('landing.size100plus', '100+ people')}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="eventType" className="block text-sm font-light text-white/78 mb-2">
                                                    {t('landing.eventType', 'Event Type *')}
                                                </label>
                                                <select
                                                    id="eventType"
                                                    name="eventType"
                                                    required
                                                    value={formData.eventType}
                                                    onChange={handleChange}
                                                    className="w-full border border-white/12 bg-[#050505] px-4 py-3 font-light text-white placeholder-white/32 transition-colors focus:border-[#f26350] focus:outline-none"
                                                >
                                                    <option value="">{t('landing.selectType', 'Select type')}</option>
                                                    <option value="sushi-island">Sushi Island</option>
                                                    <option value="15th-birthday">15th birthday party</option>
                                                    <option value="office-team-trays">Office / team sushi trays</option>
                                                    <option value="private-sushi-night">Private sushi night</option>
                                                    <option value="karaoke">Karaoke night</option>
                                                    <option value="corporate">{t('landing.corporateEvent', 'Corporate Event')}</option>
                                                    <option value="wedding">{t('landing.wedding', 'Wedding')}</option>
                                                    <option value="birthday">{t('landing.birthdayParty', 'Birthday Party')}</option>
                                                    <option value="private">{t('landing.privateGathering', 'Private Gathering')}</option>
                                                    <option value="other">{t('landing.other', 'Other')}</option>
                                                </select>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Message */}
                                <div>
                                    <label htmlFor="message" className="block text-sm font-light text-white/78 mb-2">
                                        {activeTab === 'catering'
                                            ? t('landing.eventDetails', 'Event Details *')
                                            : t('landing.yourMessage', 'Your Message *')
                                        }
                                    </label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        required
                                        rows={4}
                                        value={formData.message}
                                        onChange={handleChange}
                                        className="w-full resize-none border border-white/12 bg-[#050505] px-4 py-3 font-light text-white placeholder-white/32 transition-colors focus:border-[#f26350] focus:outline-none"
                                        placeholder={
                                            activeTab === 'catering'
                                                ? t('landing.messagePlaceholder', 'Tell us about your event date, dietary restrictions, and any special requests...')
                                                : t('landing.generalPlaceholder', 'How can we help you today?')
                                        }
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex w-full items-center justify-center bg-[#f26350] px-6 py-4 font-extrabold uppercase tracking-[0.1em] text-white transition-all duration-300 hover:bg-[#ff725f] disabled:bg-gray-400"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            {t('landing.submitting', 'Submitting...')}
                                        </>
                                    ) : (
                                        activeTab === 'catering'
                                            ? t('landing.requestQuote', 'Request Catering Quote')
                                            : t('landing.sendMessage', 'Send Message')
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
