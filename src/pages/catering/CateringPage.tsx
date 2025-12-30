import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import emailjs from '@emailjs/browser'
import { useZapierContactForms } from '../landing/hooks/useZapierContactForms'
import { LandingHeader } from '../landing/components/LandingHeader'
import { LandingCTAFooter } from '../landing/components/LandingCTAFooter'


interface ContactFormData {
    name: string
    email: string
    phone: string
    partySize: string
    eventType: string
    message: string
    contactMethod: 'catering' | 'promotions' | 'general'
}

interface CateringFormData extends ContactFormData {
    cateringPackage: string
    seafoodOptions: string[]
    dietaryRestrictions: string
    venueAddress: string
    setupRequirements: string
}

export const CateringPage = () => {
    const { t } = useTranslation()
    const { submitContactForm, isSubmitting } = useZapierContactForms()

    const [formData, setFormData] = useState<CateringFormData>({
        name: '',
        email: '',
        phone: '',
        partySize: '',
        eventType: '',
        message: '',
        contactMethod: 'catering',
        cateringPackage: '',
        seafoodOptions: [],
        dietaryRestrictions: '',
        venueAddress: '',
        setupRequirements: ''
    })

    const [selectedPackage, setSelectedPackage] = useState('')

    const successMessages = {
        catering: t('catering.successMessage', 'Thank you for your catering inquiry! Our team will contact you within 24 hours to discuss your event details and provide a customized quote.'),
        promotions: t('landing.promotionsSuccess', "You're all set! You'll receive exclusive offers and updates."),
        general: t('landing.generalSuccess', 'Thank you for your message! We will get back to you soon.')
    }

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    const sendEmailFallback = async (formData: CateringFormData): Promise<boolean> => {
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
                phone: formData.phone,
                message: `CATERING INQUIRY:
Package: ${formData.cateringPackage}
Event Type: ${formData.eventType}
Guests: ${formData.partySize}
Date: ${formData.message.includes('Event Date:') ? formData.message.split('Event Date:')[1]?.split('\n')[0] : 'Not specified'}
Seafood Options: ${formData.seafoodOptions.join(', ')}
Dietary Restrictions: ${formData.dietaryRestrictions}
Venue: ${formData.venueAddress}
Setup: ${formData.setupRequirements}
Additional Details: ${formData.message}
                `,
                contact_method: 'CATERING',
                party_size: formData.partySize,
                event_type: formData.eventType,
                timestamp: new Date().toLocaleString(),
                subject: `Catering Inquiry from ${formData.name}`,
                reply_to: formData.email
            };

            await emailjs.send(emailjsServiceId, emailjsTemplateId, templateParams);
            return true;

        } catch (error) {
            console.error("Email fallback failed:", error);
            return false;
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            // Add catering-specific details to the message
            const enhancedFormData = {
                ...formData,
                message: `${formData.message}\n\n--- CATERING DETAILS ---\nSelected Package: ${formData.cateringPackage}\nEvent Date: ${formData.message}\nSeafood Preferences: ${formData.seafoodOptions.join(', ')}\nDietary Restrictions: ${formData.dietaryRestrictions}\nVenue Address: ${formData.venueAddress}\nSetup Requirements: ${formData.setupRequirements}`
            }

            const submissionSuccess = await submitContactForm(enhancedFormData, 'catering');

            if (submissionSuccess) {
                // Reset form on success
                setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    partySize: '',
                    eventType: '',
                    message: '',
                    contactMethod: 'catering',
                    cateringPackage: '',
                    seafoodOptions: [],
                    dietaryRestrictions: '',
                    venueAddress: '',
                    setupRequirements: ''
                })
                setSelectedPackage('')

                alert(successMessages.catering)
            } else {
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
                        contactMethod: 'catering',
                        cateringPackage: '',
                        seafoodOptions: [],
                        dietaryRestrictions: '',
                        venueAddress: '',
                        setupRequirements: ''
                    })
                    setSelectedPackage('')

                    alert(`${successMessages.catering}\n\n(Your catering inquiry has been prepared in your email client. Please send it to complete your submission.)`)
                } else {
                    throw new Error('All submission methods failed')
                }
            }

        } catch (error) {
            console.error('Catering form submission error:', error)

            let userErrorMessage = t('catering.submissionError', 'There was an error submitting your catering inquiry. Please try again or contact us directly.')

            if (error instanceof Error) {
                if (error.message.includes('All submission methods failed')) {
                    userErrorMessage = 'Unable to submit catering form. Please email us directly at catering@maisushi.ca or call us at +1 (819) 861-3889.'
                }
            }

            alert(userErrorMessage)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleSeafoodOptionChange = (option: string) => {
        setFormData(prev => ({
            ...prev,
            seafoodOptions: prev.seafoodOptions.includes(option)
                ? prev.seafoodOptions.filter(item => item !== option)
                : [...prev.seafoodOptions, option]
        }))
    }

    const handlePackageSelect = (packageName: string) => {
        setSelectedPackage(packageName)
        setFormData(prev => ({ ...prev, cateringPackage: packageName }))
    }

    const cateringPackages = [
        {
            id: 'essential',
            name: t('catering.essential', 'Essential Package'),
            price: t('catering.startingAt', 'Starting at') + ' $25',
            description: t('catering.essentialDescription', 'Perfect for office lunches and small gatherings'),
            features: [
                t('catering.features.3rollTypes', '3 Signature Roll Types'),
                t('catering.features.edamame', 'Steamed Edamame'),
                t('catering.features.salad', 'Green Salad'),
                t('catering.features.sauces', 'Assorted Sauces'),
                t('catering.features.serves10', 'Serves 10-15 people')
            ],
            seafoodOptions: ['sushi', 'sashimi']
        },
        {
            id: 'premium',
            name: t('catering.premium', 'Premium Experience'),
            price: t('catering.startingAt', 'Starting at') + ' $45',
            description: t('catering.premiumDescription', 'Elevated experience for corporate events and celebrations'),
            features: [
                t('catering.features.5rollTypes', '5 Premium Roll Types'),
                t('catering.features.sashimi', 'Chef\'s Selection Sashimi'),
                t('catering.features.appetizers', '2 Appetizer Choices'),
                t('catering.features.dessert', 'Mochi Ice Cream'),
                t('catering.features.ceviche', 'Fresh Ceviche Station'),
                t('catering.features.serves25', 'Serves 20-25 people')
            ],
            seafoodOptions: ['sushi', 'sashimi', 'ceviche', 'crudos']
        },
        {
            id: 'omakase',
            name: t('catering.omakase', 'Omakase Catering'),
            price: t('catering.customQuote', 'Custom Quote'),
            description: t('catering.omakaseDescription', 'Ultimate luxury experience with chef consultation'),
            features: [
                t('catering.features.chefConsultation', 'Personal Chef Consultation'),
                t('catering.features.seasonalSelection', 'Seasonal Selection'),
                t('catering.features.liveStation', 'Live Sushi & Ceviche Station'),
                t('catering.features.premiumIngredients', 'Premium Imported Ingredients'),
                t('catering.features.customMenu', 'Fully Customized Menu'),
                t('catering.features.rawBar', 'Raw Bar with Oysters & Crudos')
            ],
            seafoodOptions: ['sushi', 'sashimi', 'ceviche', 'crudos', 'oysters', 'lobster']
        }
    ]

    const seafoodOptionsList = [
        { id: 'sushi', label: t('catering.seafood.sushi', 'Assorted Sushi Rolls') },
        { id: 'sashimi', label: t('catering.seafood.sashimi', 'Sashimi Selection') },
        { id: 'ceviche', label: t('catering.seafood.ceviche', 'Fresh Ceviche') },
        { id: 'crudos', label: t('catering.seafood.crudos', 'Crudo Platter') },
        { id: 'oysters', label: t('catering.seafood.oysters', 'Fresh Oysters') },
        { id: 'lobster', label: t('catering.seafood.lobster', 'Lobster Specialties') },
        { id: 'scallops', label: t('catering.seafood.scallops', 'Scallop Crudo') },
        { id: 'tuna', label: t('catering.seafood.tuna', 'Tuna Specialties') }
    ]

    return (
        <div className="min-h-screen bg-white">
            <LandingHeader />

            {/* Hero Section */}
            <section className="relative bg-gray-900 text-white py-20 mt-16">
                <div className="absolute inset-0 bg-black/50"></div>
                <div className="relative container mx-auto px-6 text-center">
                    <h1 className="text-4xl md:text-5xl font-light mb-6 tracking-tight">
                        {t('catering.title', 'MaiSushi Catering')}
                    </h1>
                    <div className="w-20 h-px bg-white mx-auto mb-6"></div>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed font-light">
                        {t('catering.subtitle', 'Elevate your events with authentic Japanese cuisine and fresh seafood, crafted with precision and brought to your venue.')}
                    </p>
                </div>
            </section>

            {/* Introduction */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-2xl font-light mb-6 text-gray-900">
                            {t('catering.experienceTitle', 'The Art of Japanese Catering & Seafood')}
                        </h2>
                        <p className="text-gray-600 leading-relaxed mb-8 font-light">
                            {t('catering.experienceDescription', 'For over a decade, MaiSushi has been bringing the authentic taste of Japan and fresh seafood to Sherbrooke\'s most memorable events. From intimate gatherings to grand celebrations, our catering service combines traditional techniques with modern presentation, featuring our signature ceviche and raw bar selections.')}
                        </p>
                    </div>
                </div>
            </section>

            {/* Catering Packages */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-6">
                    <h2 className="text-3xl font-light text-center mb-12 text-gray-900">
                        {t('catering.packagesTitle', 'Catering Packages')}
                    </h2>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {cateringPackages.map((pkg, index) => (
                            <div
                                key={index}
                                className={`bg-white rounded-lg shadow-lg overflow-hidden border-2 transition-all duration-300 flex flex-col h-full ${selectedPackage === pkg.id
                                    ? 'border-red-500 shadow-xl'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="p-8 flex-1 flex flex-col">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-light mb-2 text-gray-900">{pkg.name}</h3>
                                        <div className="text-2xl font-light text-red-600 mb-4">{pkg.price}</div>
                                        <p className="text-gray-600 mb-6 font-light">{pkg.description}</p>

                                        <ul className="space-y-3 mb-8">
                                            {pkg.features.map((feature, featureIndex) => (
                                                <li key={featureIndex} className="flex items-center text-sm text-gray-700">
                                                    <span className="w-2 h-2 bg-red-500 rounded-full mr-3 flex-shrink-0"></span>
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Button container at bottom */}
                                    <div className="mt-auto pt-4">
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => handlePackageSelect(pkg.id)}
                                                className={`px-8 py-3 font-light transition-colors duration-300 w-full max-w-xs ${selectedPackage === pkg.id
                                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                                    : 'bg-gray-900 text-white hover:bg-gray-800'
                                                    }`}
                                            >
                                                {selectedPackage === pkg.id
                                                    ? t('catering.selected', 'Selected')
                                                    : t('catering.selectPackage', 'Select Package')
                                                }
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Process Section */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-6">
                    <h2 className="text-3xl font-light text-center mb-12 text-gray-900">
                        {t('catering.processTitle', 'How It Works')}
                    </h2>

                    <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
                        {[
                            { step: '1', title: t('catering.step1Title', 'Consultation'), description: t('catering.step1Desc', 'Discuss your event needs and menu preferences') },
                            { step: '2', title: t('catering.step2Title', 'Customization'), description: t('catering.step2Desc', 'Tailor your menu with our chef\'s guidance') },
                            { step: '3', title: t('catering.step3Title', 'Confirmation'), description: t('catering.step3Desc', 'Finalize details and secure your date') },
                            { step: '4', title: t('catering.step4Title', 'Experience'), description: t('catering.step4Desc', 'Enjoy authentic Japanese cuisine at your event') }
                        ].map((step, index) => (
                            <div key={index} className="text-center">
                                <div className="w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center text-lg font-light mb-4 mx-auto">
                                    {step.step}
                                </div>
                                <h3 className="text-lg font-light mb-2 text-gray-900">{step.title}</h3>
                                <p className="text-gray-600 text-sm font-light">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact Form */}
            <section className="py-16 bg-gray-900 text-white">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-3xl font-light text-center mb-12">
                            {t('catering.contactTitle', 'Start Your Catering Experience')}
                        </h2>

                        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-light mb-2">{t('catering.fullName', 'Full Name')} *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-white font-light focus:outline-none focus:border-red-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-light mb-2">{t('catering.email', 'Email Address')} *</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-white font-light focus:outline-none focus:border-red-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-light mb-2">{t('catering.phone', 'Phone Number')} *</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-white font-light focus:outline-none focus:border-red-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-light mb-2">{t('catering.cateringPackage', 'Catering Package')} *</label>
                                <select
                                    name="cateringPackage"
                                    value={formData.cateringPackage}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-white font-light focus:outline-none focus:border-red-500"
                                    required
                                >
                                    <option value="">{t('catering.selectPackage', 'Select a Package...')}</option>
                                    {cateringPackages.map((pkg) => (
                                        <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-light mb-2">{t('catering.eventDate', 'Event Date')} *</label>
                                <input
                                    type="date"
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-white font-light focus:outline-none focus:border-red-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-light mb-2">{t('catering.guestCount', 'Number of Guests')} *</label>
                                <select
                                    name="partySize"
                                    value={formData.partySize}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-white font-light focus:outline-none focus:border-red-500"
                                    required
                                >
                                    <option value="">{t('catering.selectGuests', 'Select...')}</option>
                                    <option value="10-25">10-25</option>
                                    <option value="26-50">26-50</option>
                                    <option value="51-100">51-100</option>
                                    <option value="100+">100+</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-light mb-2">{t('catering.eventType', 'Event Type')} *</label>
                                <select
                                    name="eventType"
                                    value={formData.eventType}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-white font-light focus:outline-none focus:border-red-500"
                                    required
                                >
                                    <option value="">{t('catering.selectEventType', 'Select...')}</option>
                                    <option value="corporate">{t('catering.corporate', 'Corporate Event')}</option>
                                    <option value="wedding">{t('catering.wedding', 'Wedding')}</option>
                                    <option value="birthday">{t('catering.birthday', 'Birthday Party')}</option>
                                    <option value="anniversary">{t('catering.anniversary', 'Anniversary')}</option>
                                    <option value="other">{t('catering.other', 'Other')}</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-light mb-2">{t('catering.venueAddress', 'Venue Address')}</label>
                                <input
                                    type="text"
                                    name="venueAddress"
                                    value={formData.venueAddress}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-white font-light focus:outline-none focus:border-red-500"
                                    placeholder={t('catering.venuePlaceholder', 'Full address of your event venue')}
                                />
                            </div>

                            {/* Seafood Options */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-light mb-3">{t('catering.seafoodPreferences', 'Seafood Preferences')}</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {seafoodOptionsList.map((option) => (
                                        <label key={option.id} className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.seafoodOptions.includes(option.id)}
                                                onChange={() => handleSeafoodOptionChange(option.id)}
                                                className="rounded border-gray-600 bg-gray-700 text-red-500 focus:ring-red-500"
                                            />
                                            <span className="text-sm text-gray-300">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-light mb-2">{t('catering.dietaryRestrictions', 'Dietary Restrictions & Allergies')}</label>
                                <input
                                    type="text"
                                    name="dietaryRestrictions"
                                    value={formData.dietaryRestrictions}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-white font-light focus:outline-none focus:border-red-500"
                                    placeholder={t('catering.dietaryPlaceholder', 'e.g., vegetarian, gluten-free, shellfish allergies...')}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-light mb-2">{t('catering.setupRequirements', 'Setup & Service Requirements')}</label>
                                <select
                                    name="setupRequirements"
                                    value={formData.setupRequirements}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-white font-light focus:outline-none focus:border-red-500"
                                >
                                    <option value="">{t('catering.selectSetup', 'Select setup type...')}</option>
                                    <option value="buffet">{t('catering.buffet', 'Buffet Style')}</option>
                                    <option value="plated">{t('catering.plated', 'Plated Service')}</option>
                                    <option value="stations">{t('catering.stations', 'Food Stations')}</option>
                                    <option value="family">{t('catering.family', 'Family Style')}</option>
                                    <option value="custom">{t('catering.custom', 'Custom Setup')}</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-light mb-2">{t('catering.additionalDetails', 'Additional Details & Special Requests')}</label>
                                <textarea
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-white font-light focus:outline-none focus:border-red-500"
                                    placeholder={t('catering.messagePlaceholder', 'Tell us about your event vision, theme, or any special requests...')}
                                ></textarea>
                            </div>

                            <div className="md:col-span-2">
                                <div className="flex justify-center">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-12 py-4 bg-red-600 text-white font-light hover:bg-red-700 transition-colors duration-300 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting
                                            ? t('catering.submitting', 'Submitting...')
                                            : t('catering.submitRequest', 'Submit Catering Request')
                                        }
                                    </button>
                                </div>
                                <p className="text-gray-400 text-sm text-center mt-3">
                                    {t('catering.responseTime', 'We respond to all catering inquiries within 24 hours')}
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </section>

            <LandingCTAFooter displaySimple={false} />
        </div>
    )
}