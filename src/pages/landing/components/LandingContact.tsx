import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, Phone, MapPin, Calendar, Gift, Zap } from 'lucide-react'

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
    const [activeTab, setActiveTab] = useState<'catering' | 'promotions' | 'general'>('catering')
    const [formData, setFormData] = useState<FormData>({
        name: '',
        email: '',
        phone: '',
        partySize: '',
        eventType: '',
        message: '',
        contactMethod: 'catering'
    })

    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            // Send to Zapier Webhook
            const zapierWebhookUrl = 'https://hooks.zapier.com/hooks/catch/your-account-id/your-zap-id/'

            const payload = {
                ...formData,
                contactMethod: activeTab,
                timestamp: new Date().toISOString(),
                source: 'maisushi-website'
            }

            const response = await fetch(zapierWebhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            })

            if (response.ok) {
                console.log('Form submitted to Zapier:', payload)

                // Reset form
                setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    partySize: '',
                    eventType: '',
                    message: '',
                    contactMethod: activeTab
                })

                // Show success message based on tab
                const successMessages = {
                    catering: t('landing.thankYouCatering', 'Thank you for your catering inquiry! We\'ll contact you within 24 hours to discuss your event.'),
                    promotions: t('landing.thankYouPromotions', 'Thank you for signing up! You\'ll receive our latest promotions and updates.'),
                    general: t('landing.thankYouGeneral', 'Thank you for your message! We\'ll get back to you within 24 hours.')
                }

                alert(successMessages[activeTab])
            } else {
                throw new Error('Failed to submit form')
            }
        } catch (error) {
            console.error('Form submission error:', error)
            alert(t('landing.submissionError', 'There was an error submitting your form. Please try again or contact us directly.'))
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }

    const quickQuestions = [
        {
            question: t('landing.quickQuestion1', 'What\'s the minimum order for catering?'),
            answer: t('landing.quickAnswer1', 'Minimum order is $200 for parties of 10+ people.')
        },
        {
            question: t('landing.quickQuestion2', 'Do you deliver to my area?'),
            answer: t('landing.quickAnswer2', 'We deliver within 25km of Sherbrooke. Contact us for specific locations.')
        },
        {
            question: t('landing.quickQuestion3', 'Can you accommodate dietary restrictions?'),
            answer: t('landing.quickAnswer3', 'Yes! We offer vegetarian, gluten-free, and other custom options.')
        },
        {
            question: t('landing.quickQuestion4', 'How far in advance should I book?'),
            answer: t('landing.quickAnswer4', 'We recommend booking 2+ weeks in advance for best availability.')
        }
    ]

    return (
        <section id="contact" className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-light text-gray-900 mb-4">
                        {t('landing.getInTouch', 'Get In Touch')}
                    </h2>
                    <p className="text-gray-600 font-light max-w-2xl mx-auto">
                        {t('landing.contactDescription', 'Whether you need catering, want promotions, or just have questions - we\'re here to help.')}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {/* Contact Options Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Quick Questions */}
                        <div className="bg-white p-6 shadow-sm border border-gray-200">
                            <h3 className="text-lg font-light text-gray-900 mb-4 flex items-center">
                                <Zap className="w-5 h-5 mr-2 text-[#E62B2B]" />
                                {t('landing.quickQuestions', 'Quick Questions')}
                            </h3>
                            <div className="space-y-4">
                                {quickQuestions.map((item, index) => (
                                    <details key={index} className="group">
                                        <summary className="flex justify-between items-center cursor-pointer text-sm font-light text-gray-700 hover:text-gray-900">
                                            {item.question}
                                            <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                                        </summary>
                                        <p className="mt-2 text-sm text-gray-600 font-light pl-4 border-l-2 border-[#E62B2B]">
                                            {item.answer}
                                        </p>
                                    </details>
                                ))}
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="bg-white p-6 shadow-sm border border-gray-200">
                            <h3 className="text-lg font-light text-gray-900 mb-4">
                                {t('landing.directContact', 'Direct Contact')}
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center text-gray-600">
                                    <Phone className="w-4 h-4 mr-3 text-[#E62B2B]" />
                                    <span className="font-light">{t('landing.phoneNumberDisplay', '+1 (555) 123-SUSHI')}</span>
                                </div>
                                <div className="flex items-center text-gray-600">
                                    <Mail className="w-4 h-4 mr-3 text-[#E62B2B]" />
                                    <span className="font-light">{t('landing.emailAddressDisplay', 'contact@maisushi.ca')}</span>
                                </div>
                                <div className="flex items-start text-gray-600">
                                    <MapPin className="w-4 h-4 mr-3 mt-1 text-[#E62B2B]" />
                                    <span className="font-light">
                                        {t('landing.addressLine1', '1975 King Ouest,')}<br />
                                        {t('landing.addressLine2', 'Sherbrooke, QC J1J 2E6')}
                                    </span>
                                </div>
                                <div className="flex items-start text-gray-600">
                                    <Calendar className="w-4 h-4 mr-3 mt-1 text-[#E62B2B]" />
                                    <div className="font-light space-y-1">
                                        <div>{t('landing.hoursTuesdayWednesday', 'Tue-Wed: 11:00 AM - 8:00 PM')}</div>
                                        <div>{t('landing.hoursThursdaySaturday', 'Thu-Sat: 11:00 AM - 10:00 PM')}</div>
                                        <div>{t('landing.hoursSunday', 'Sun: Closed')}</div>
                                        <div>{t('landing.hoursMonday', 'Mon: Closed')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Promotions Signup Mini */}
                        <div className="bg-gradient-to-r from-[#E62B2B] to-[#ff6b6b] p-6 text-white">
                            <h3 className="text-lg font-light mb-3 flex items-center">
                                <Gift className="w-5 h-5 mr-2" />
                                {t('landing.getPromotions', 'Get Promotions')}
                            </h3>
                            <p className="font-light mb-4 text-white/90 text-sm">
                                {t('landing.promotionsDescription', 'Sign up for exclusive deals and menu updates.')}
                            </p>
                            <button
                                onClick={() => setActiveTab('promotions')}
                                className="w-full bg-white text-[#E62B2B] py-2 px-4 font-light text-sm hover:bg-gray-100 transition-colors"
                            >
                                {t('landing.signUpNow', 'Sign Up Now')}
                            </button>
                        </div>
                    </div>

                    {/* Main Form Area */}
                    <div className="lg:col-span-2">
                        {/* Tab Navigation */}
                        <div className="flex border-b border-gray-200 mb-8">
                            <button
                                onClick={() => setActiveTab('catering')}
                                className={`flex-1 py-4 px-6 text-center font-light transition-colors ${activeTab === 'catering'
                                    ? 'text-[#E62B2B] border-b-2 border-[#E62B2B]'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {t('landing.cateringEvents', 'Catering & Events')}
                            </button>
                            <button
                                onClick={() => setActiveTab('promotions')}
                                className={`flex-1 py-4 px-6 text-center font-light transition-colors ${activeTab === 'promotions'
                                    ? 'text-[#E62B2B] border-b-2 border-[#E62B2B]'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {t('landing.promotions', 'Promotions')}
                            </button>
                            <button
                                onClick={() => setActiveTab('general')}
                                className={`flex-1 py-4 px-6 text-center font-light transition-colors ${activeTab === 'general'
                                    ? 'text-[#E62B2B] border-b-2 border-[#E62B2B]'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {t('landing.generalInquiry', 'General Inquiry')}
                            </button>
                        </div>

                        {/* Dynamic Form Content */}
                        <div className="bg-white p-8 shadow-sm border border-gray-200">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <input type="hidden" name="contactMethod" value={activeTab} />

                                {/* Name & Email - Always Required */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-light text-gray-700 mb-2">
                                            {t('landing.contactName', 'Contact Name *')}
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 font-light focus:outline-none focus:border-[#E62B2B] transition-colors"
                                            placeholder={t('landing.namePlaceholder', 'Your full name')}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-light text-gray-700 mb-2">
                                            {t('landing.emailAddress', 'Email Address *')}
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 font-light focus:outline-none focus:border-[#E62B2B] transition-colors"
                                            placeholder={t('landing.emailPlaceholder', 'your.email@example.com')}
                                        />
                                    </div>
                                </div>

                                {/* Phone - Required for catering, optional for others */}
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-light text-gray-700 mb-2">
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
                                        className="w-full px-4 py-3 border border-gray-300 font-light focus:outline-none focus:border-[#E62B2B] transition-colors"
                                        placeholder={t('landing.phonePlaceholder', '(555) 123-4567')}
                                    />
                                </div>

                                {/* Catering Specific Fields */}
                                {activeTab === 'catering' && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label htmlFor="partySize" className="block text-sm font-light text-gray-700 mb-2">
                                                    {t('landing.partySize', 'Estimated Party Size *')}
                                                </label>
                                                <select
                                                    id="partySize"
                                                    name="partySize"
                                                    required
                                                    value={formData.partySize}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 border border-gray-300 font-light focus:outline-none focus:border-[#E62B2B] transition-colors"
                                                >
                                                    <option value="">{t('landing.selectSize', 'Select size')}</option>
                                                    <option value="10-25">{t('landing.size10_25', '10-25 people')}</option>
                                                    <option value="26-50">{t('landing.size26_50', '26-50 people')}</option>
                                                    <option value="51-100">{t('landing.size51_100', '51-100 people')}</option>
                                                    <option value="100+">{t('landing.size100plus', '100+ people')}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="eventType" className="block text-sm font-light text-gray-700 mb-2">
                                                    {t('landing.eventType', 'Event Type *')}
                                                </label>
                                                <select
                                                    id="eventType"
                                                    name="eventType"
                                                    required
                                                    value={formData.eventType}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 border border-gray-300 font-light focus:outline-none focus:border-[#E62B2B] transition-colors"
                                                >
                                                    <option value="">{t('landing.selectType', 'Select type')}</option>
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

                                {/* Message - Dynamic label and placeholder */}
                                <div>
                                    <label htmlFor="message" className="block text-sm font-light text-gray-700 mb-2">
                                        {activeTab === 'catering'
                                            ? t('landing.eventDetails', 'Event Details *')
                                            : activeTab === 'promotions'
                                                ? t('landing.promotionsInterest', 'What interests you most? (Optional)')
                                                : t('landing.yourMessage', 'Your Message *')
                                        }
                                    </label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        required={activeTab !== 'promotions'}
                                        rows={4}
                                        value={formData.message}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 font-light focus:outline-none focus:border-[#E62B2B] transition-colors resize-none"
                                        placeholder={
                                            activeTab === 'catering'
                                                ? t('landing.messagePlaceholder', 'Tell us about your event date, dietary restrictions, and any special requests...')
                                                : activeTab === 'promotions'
                                                    ? t('landing.promotionsPlaceholder', 'Let us know what type of promotions you\'re interested in...')
                                                    : t('landing.generalPlaceholder', 'How can we help you today?')
                                        }
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-[#E62B2B] text-white py-4 px-6 font-light tracking-wide hover:bg-[#ff4444] disabled:bg-gray-400 transition-all duration-300 flex items-center justify-center"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            {t('landing.submitting', 'Submitting...')}
                                        </>
                                    ) : (
                                        activeTab === 'catering'
                                            ? t('landing.requestQuote', 'Request Catering Quote')
                                            : activeTab === 'promotions'
                                                ? t('landing.signUpPromotions', 'Sign Up for Promotions')
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