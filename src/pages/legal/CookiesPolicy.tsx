import { useTranslation } from 'react-i18next'
import { LandingHeader } from '../landing/components/LandingHeader'
import { LandingCTAFooter } from '../landing/components/LandingCTAFooter'

export const CookiesPolicy = () => {
    const { t } = useTranslation()

    return (
        <div className="min-h-screen bg-gray-50">
            <LandingHeader />
            
            <div className="pt-24 pb-16">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <h1 className="text-4xl font-light text-gray-900 mb-4">
                                {t('cookies.title', 'Cookies Policy')}
                            </h1>
                            <div className="w-20 h-px bg-red-500 mx-auto mb-4"></div>
                            <p className="text-sm text-gray-500">
                                {t('cookies.lastUpdated', 'Last updated')}: {new Date().toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                            </p>
                        </div>

                        <div className="prose prose-lg max-w-none">
                            {/* Introduction */}
                            <p className="text-gray-600 leading-relaxed mb-8">
                                {t('cookies.intro', 'We use cookies and similar technologies to enhance your experience on our website. This policy explains how we use these technologies.')}
                            </p>

                            {/* Essential Cookies */}
                            <section className="mb-8">
                                <h2 className="text-2xl font-light text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    {t('cookies.essential', 'Essential Cookies')}
                                </h2>
                                <p className="text-gray-600 mb-4">These cookies are necessary for the website to function properly:</p>
                                <ul className="space-y-3 text-gray-600">
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('cookies.keepSession', 'Keep you logged in during your session')}</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('cookies.saveCart', 'Save your cart items and preferences')}</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('cookies.languagePreference', 'Remember your language and region settings')}</span>
                                    </li>
                                </ul>
                            </section>

                            {/* Functional Cookies */}
                            <section className="mb-8">
                                <h2 className="text-2xl font-light text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    {t('cookies.functional', 'Functional Cookies')}
                                </h2>
                                <p className="text-gray-600 mb-4">These cookies enhance your browsing experience:</p>
                                <ul className="space-y-3 text-gray-600">
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('cookies.userPreferences', 'Remember your user preferences and settings')}</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('cookies.ui', 'Personalize your interface and layout preferences')}</span>
                                    </li>
                                </ul>
                            </section>

                            {/* Analytics */}
                            <section className="mb-8">
                                <h2 className="text-2xl font-light text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    {t('cookies.analyticsTitle', 'Analytics & Performance')}
                                </h2>
                                <p className="text-gray-600 leading-relaxed">
                                    {t('cookies.analyticsDescription', 'We use analytics cookies to understand how visitors interact with our website. This helps us improve our services and user experience. These cookies collect anonymous information about page visits and user behavior.')}
                                </p>
                            </section>

                            {/* Managing Cookies */}
                            <section className="mb-8">
                                <h2 className="text-2xl font-light text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    {t('cookies.disableTitle', 'Managing Your Cookie Preferences')}
                                </h2>
                                <p className="text-gray-600 leading-relaxed">
                                    {t('cookies.disableDescription', 'You can control and manage cookies through your browser settings. Most browsers allow you to refuse cookies or alert you when cookies are being sent. However, disabling essential cookies may affect the functionality of our website.')}
                                </p>
                            </section>

                            {/* Contact */}
                            <section>
                                <h2 className="text-2xl font-light text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    {t('cookies.contactTitle', 'Questions & Contact')}
                                </h2>
                                <p className="text-gray-600">
                                    {t('cookies.contactDescription', 'If you have any questions about our use of cookies, please contact us at')}{' '}
                                    <strong className="text-red-600">privacy@maisushi.ca</strong>
                                </p>
                            </section>
                        </div>
                    </div>
                </div>
            </div>

            <LandingCTAFooter displaySimple={false} />
        </div>
    )
}