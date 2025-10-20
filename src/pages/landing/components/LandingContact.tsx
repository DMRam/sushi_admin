import { useState } from 'react'

export function LandingContact() {
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
        alert('Thank you for your catering inquiry! We\'ll contact you within 24 hours to discuss your event.')
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
                        Catering & Events
                    </h2>
                    <p className="text-gray-600 font-light max-w-2xl mx-auto">
                        Elevate your events with our premium ceviche and sushi catering.
                        From intimate gatherings to corporate events, we bring the ocean's freshness to you.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
                    {/* Catering Inquiry Form */}
                    <div className="bg-white p-8 shadow-sm border border-gray-200">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-light text-gray-700 mb-2">
                                    Contact Name *
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 font-light focus:outline-none focus:border-gray-900 transition-colors"
                                    placeholder="Your full name"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-light text-gray-700 mb-2">
                                        Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 font-light focus:outline-none focus:border-gray-900 transition-colors"
                                        placeholder="your.email@example.com"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="phone" className="block text-sm font-light text-gray-700 mb-2">
                                        Phone Number *
                                    </label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        required
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 font-light focus:outline-none focus:border-gray-900 transition-colors"
                                        placeholder="(555) 123-4567"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="partySize" className="block text-sm font-light text-gray-700 mb-2">
                                        Estimated Party Size *
                                    </label>
                                    <select
                                        id="partySize"
                                        name="partySize"
                                        required
                                        value={formData.partySize}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 font-light focus:outline-none focus:border-gray-900 transition-colors"
                                    >
                                        <option value="">Select size</option>
                                        <option value="10-25">10-25 people</option>
                                        <option value="26-50">26-50 people</option>
                                        <option value="51-100">51-100 people</option>
                                        <option value="100+">100+ people</option>
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="eventType" className="block text-sm font-light text-gray-700 mb-2">
                                        Event Type *
                                    </label>
                                    <select
                                        id="eventType"
                                        name="eventType"
                                        required
                                        value={formData.eventType}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 font-light focus:outline-none focus:border-gray-900 transition-colors"
                                    >
                                        <option value="">Select type</option>
                                        <option value="corporate">Corporate Event</option>
                                        <option value="wedding">Wedding</option>
                                        <option value="birthday">Birthday Party</option>
                                        <option value="private">Private Gathering</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="message" className="block text-sm font-light text-gray-700 mb-2">
                                    Event Details *
                                </label>
                                <textarea
                                    id="message"
                                    name="message"
                                    required
                                    rows={4}
                                    value={formData.message}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 font-light focus:outline-none focus:border-gray-900 transition-colors resize-none"
                                    placeholder="Tell us about your event date, dietary restrictions, and any special requests..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-gray-900 text-white py-4 px-6 font-light tracking-wide hover:bg-gray-800 disabled:bg-gray-400 transition-all duration-300"
                            >
                                {isSubmitting ? 'Submitting...' : 'Request Catering Quote'}
                            </button>
                        </form>
                    </div>

                    {/* Catering Information & Loyalty Program */}
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xl font-light text-gray-900 mb-4">Catering Services</h3>
                            <p className="text-gray-600 font-light mb-6">
                                Experience the perfect blend of Peruvian ceviche and Japanese sushi artistry.
                                Our catering brings restaurant-quality freshness to your location.
                            </p>
                            <ul className="space-y-3 text-gray-600 font-light">
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-gray-900 mr-3"></span>
                                    Fresh ceviche bar with live preparation
                                </li>
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-gray-900 mr-3"></span>
                                    Sushi platters & hand rolls
                                </li>
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-gray-900 mr-3"></span>
                                    Professional sushi chefs on-site
                                </li>
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-gray-900 mr-3"></span>
                                    Custom menu development
                                </li>
                                <li className="flex items-center">
                                    <span className="w-2 h-2 bg-gray-900 mr-3"></span>
                                    Full setup & cleanup included
                                </li>
                            </ul>
                        </div>

                        {/* Loyalty Program Preview */}
                        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 text-white">
                            <h3 className="text-xl font-light mb-3">Coming Soon: Pacifique Rewards</h3>
                            <p className="font-light mb-4 text-gray-200">
                                Our mobile app with loyalty program. Earn points with every order and enjoy exclusive benefits.
                            </p>
                            <ul className="space-y-2 text-sm font-light text-gray-200">
                                <li>• Earn 1 point per $1 spent</li>
                                <li>• Free delivery on all app orders</li>
                                <li>• Exclusive menu items</li>
                                <li>• Birthday rewards & special offers</li>
                                <li>• Priority catering booking</li>
                            </ul>
                            <div className="mt-4 text-xs font-light text-gray-300">
                                Mobile app launching next season
                            </div>
                        </div>

                        <div className="border-t border-gray-200 pt-8">
                            <h3 className="text-xl font-light text-gray-900 mb-4">Contact Our Events Team</h3>
                            <div className="space-y-3 text-gray-600 font-light">
                                <p>📧 events@ceviche-sushi.com</p>
                                <p>📞 +1 (555) 123-SUSHI</p>
                                <p>📍 123 Ocean Drive, Miami, FL 33101</p>
                                <p className="text-sm mt-4">
                                    <strong>Catering Hours:</strong><br />
                                    Mon-Sun: 7:00 AM - 9:00 PM
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}