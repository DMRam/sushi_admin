import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export function LandingContact() {
    const { t } = useTranslation()
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        partySize: '',
        eventType: '',
        message: ''
    })

    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        // Simulate form submission
        await new Promise(resolve => setTimeout(resolve, 1000))

        console.log('Catering inquiry submitted:', formData)
        // Reset form
        setFormData({
            name: '',
            email: '',
            phone: '',
            partySize: '',
            eventType: '',
            message: ''
        })
        setIsSubmitting(false)
        alert(t('landing.thankYouMessage', 'Thank you for your catering inquiry! We\'ll contact you within 24 hours to discuss your event.'))
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }

    return (
        <section id="catering" className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-light text-gray-900 mb-4">
                        {t('landing.cateringEvents', 'Catering & Events')}
                    </h2>
                    <p className="text-gray-600 font-light max-w-2xl mx-auto">
                        {t('landing.cateringDescription', 'Elevate your events with our premium ceviche and sushi catering. From intimate gatherings to corporate events, we bring the ocean\'s freshness to you.')}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
                    {/* Catering Inquiry Form */}
                    <div className="bg-white p-8 shadow-sm border border-gray-200">
                        <form onSubmit={handleSubmit} className="space-y-6">
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
                                    className="w-full px-4 py-3 border border-gray-300 font-light focus:outline-none focus:border-gray-900 transition-colors"
                                    placeholder={t('landing.namePlaceholder', 'Your full name')}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        className="w-full px-4 py-3 border border-gray-300 font-light focus:outline-none focus:border-gray-900 transition-colors"
                                        placeholder={t('landing.emailPlaceholder', 'your.email@example.com')}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="phone" className="block text-sm font-light text-gray-700 mb-2">
                                        {t('landing.phoneNumber', 'Phone Number *')}
                                    </label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        required
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 font-light focus:outline-none focus:border-gray-900 transition-colors"
                                        placeholder={t('landing.phonePlaceholder', '(555) 123-4567')}
                                    />
                                </div>
                            </div>

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
                                        className="w-full px-4 py-3 border border-gray-300 font-light focus:outline-none focus:border-gray-900 transition-colors"
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
                                        className="w-full px-4 py-3 border border-gray-300 font-light focus:outline-none focus:border-gray-900 transition-colors"
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

                            <div>
                                <label htmlFor="message" className="block text-sm font-light text-gray-700 mb-2">
                                    {t('landing.eventDetails', 'Event Details *')}
                                </label>
                                <textarea
                                    id="message"
                                    name="message"
                                    required
                                    rows={4}
                                    value={formData.message}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 font-light focus:outline-none focus:border-gray-900 transition-colors resize-none"
                                    placeholder={t('landing.messagePlaceholder', 'Tell us about your event date, dietary restrictions, and any special requests...')}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-gray-900 text-white py-4 px-6 font-light tracking-wide hover:bg-gray-800 disabled:bg-gray-400 transition-all duration-300"
                            >
                                {isSubmitting ? t('landing.submitting', 'Submitting...') : t('landing.requestQuote', 'Request Catering Quote')}
                            </button>
                        </form>
                    </div>

                    {/* Catering Information & Loyalty Program */}
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xl font-light text-gray-900 mb-4">
                                {t('landing.cateringServices', 'Catering Services')}
                            </h3>
                            <p className="text-gray-600 font-light mb-6">
                                {t('landing.cateringServicesDescription', 'Experience the perfect blend of Peruvian ceviche and Japanese sushi artistry. Our catering brings restaurant-quality freshness to your location.')}
                            </p>
                            <ul className="space-y-3 text-gray-600 font-light">
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-gray-900 mr-3"></span>
                                    {t('landing.service1', 'Fresh ceviche bar with live preparation')}
                                </li>
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-gray-900 mr-3"></span>
                                    {t('landing.service2', 'Sushi platters & hand rolls')}
                                </li>
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-gray-900 mr-3"></span>
                                    {t('landing.service3', 'Professional sushi chefs on-site')}
                                </li>
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-gray-900 mr-3"></span>
                                    {t('landing.service4', 'Custom menu development')}
                                </li>
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-gray-900 mr-3"></span>
                                    {t('landing.service5', 'Full setup & cleanup included')}
                                </li>
                            </ul>
                        </div>

                        {/* Loyalty Program Preview */}
                        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 text-white">
                            <h3 className="text-xl font-light mb-3">
                                {t('landing.loyaltyProgram', 'Coming Soon: MaiSushi Rewards')}
                            </h3>
                            <p className="font-light mb-4 text-gray-200">
                                {t('landing.loyaltyDescription', 'Our mobile app with loyalty program. Earn points with every order and enjoy exclusive benefits.')}
                            </p>
                            <ul className="space-y-2 text-sm font-light text-gray-200">
                                <li>• {t('landing.benefit1', 'Earn 1 point per $1 spent')}</li>
                                <li>• {t('landing.benefit2', 'Free delivery on all app orders')}</li>
                                <li>• {t('landing.benefit3', 'Exclusive menu items')}</li>
                                <li>• {t('landing.benefit4', 'Birthday rewards & special offers')}</li>
                                <li>• {t('landing.benefit5', 'Priority catering booking')}</li>
                            </ul>
                            <div className="mt-4 text-xs font-light text-gray-300">
                                {t('landing.appLaunching', 'Mobile app launching next season')}
                            </div>
                        </div>

                        <div className="border-t border-gray-200 pt-8">
                            <h3 className="text-xl font-light text-gray-900 mb-4">
                                {t('landing.contactTeam', 'Contact Our Events Team')}
                            </h3>
                            <div className="space-y-3 text-gray-600 font-light">
                                <p>📧 events@maisushi.ca</p>
                                <p>📞 +1 (555) 123-SUSHI</p>
                                <p>📍 1647 King Ouest, Sherbrooke, QC, J5N 4R6</p>
                                <p className="text-sm mt-4">
                                    <strong>{t('landing.cateringHours', 'Catering Hours:')}</strong><br />
                                    {t('landing.hours', 'Mon-Sun: 7:00 AM - 9:00 PM')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}