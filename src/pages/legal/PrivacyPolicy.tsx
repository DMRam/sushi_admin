import { useTranslation } from 'react-i18next'
import { LandingHeader } from '../landing/components/LandingHeader'
import { LandingCTAFooter } from '../landing/components/LandingCTAFooter'


export const PrivacyPolicy = () => {
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
                                {t('privacy.title', 'Privacy Policy')}
                            </h1>
                            <div className="w-20 h-px bg-red-500 mx-auto mb-4"></div>
                            <p className="text-sm text-gray-500">
                                {t('privacy.lastUpdated', 'Last updated')}: {new Date().toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>

                        {/* Introduction */}
                        <div className="prose prose-lg max-w-none">
                            <p className="text-gray-600 leading-relaxed mb-8">
                                {t('privacy.intro', 'Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.')}
                            </p>

                            {/* Information We Collect */}
                            <section className="mb-8">
                                <h2 className="text-2xl font-light text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    {t('privacy.section1.title', 'Information We Collect')}
                                </h2>
                                <ul className="space-y-3 text-gray-600">
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('privacy.section1.name', 'Name and contact details')}</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('privacy.section1.email', 'Email address and phone number')}</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('privacy.section1.phone', 'Delivery address and location data')}</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('privacy.section1.orderHistory', 'Order history and preferences')}</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('privacy.section1.points', 'Loyalty points and rewards data')}</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('privacy.section1.ip', 'Device information and IP address')}</span>
                                    </li>
                                </ul>
                            </section>

                            {/* How We Use Your Information */}
                            <section className="mb-8">
                                <h2 className="text-2xl font-light text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    {t('privacy.section2.title', 'How We Use Your Information')}
                                </h2>
                                <ul className="space-y-3 text-gray-600">
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('privacy.section2.orders', 'Process and deliver your orders')}</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('privacy.section2.account', 'Manage your account and loyalty program')}</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('privacy.section2.notifications', 'Send order updates and promotions')}</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('privacy.section2.improvement', 'Improve our services and user experience')}</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('privacy.section2.compliance', 'Comply with legal obligations')}</span>
                                    </li>
                                </ul>
                            </section>

                            {/* Data Storage & Security */}
                            <section className="mb-8">
                                <h2 className="text-2xl font-light text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    {t('privacy.section3.title', 'Data Storage & Security')}
                                </h2>
                                <p className="text-gray-600 mb-4">
                                    We use industry-standard security measures and trusted providers:
                                </p>
                                <ul className="space-y-3 text-gray-600">
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span><strong>Supabase</strong> - Secure database and authentication</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span><strong>Firebase</strong> - Real-time data and user management</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span><strong>SherDev Automations</strong> - Business process automation</span>
                                    </li>
                                </ul>
                            </section>

                            {/* Data Sharing */}
                            <section className="mb-8">
                                <h2 className="text-2xl font-light text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    {t('privacy.section4.title', 'Data Sharing')}
                                </h2>
                                <ul className="space-y-3 text-gray-600">
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span><strong>Zapier</strong> - Automated workflow integrations</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span><strong>Delivery partners</strong> - To fulfill your orders</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('privacy.section4.law', 'When required by law or legal process')}</span>
                                    </li>
                                </ul>
                            </section>

                            {/* Your Rights */}
                            <section className="mb-8">
                                <h2 className="text-2xl font-light text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    {t('privacy.section5.title', 'Your Rights')}
                                </h2>
                                <ul className="space-y-3 text-gray-600">
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('privacy.section5.access', 'Access your personal data')}</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('privacy.section5.modify', 'Modify or update your information')}</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('privacy.section5.delete', 'Delete your account and data')}</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('privacy.section5.withdraw', 'Withdraw consent for marketing')}</span>
                                    </li>
                                </ul>
                            </section>

                            {/* Security Measures */}
                            <section className="mb-8">
                                <h2 className="text-2xl font-light text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    {t('privacy.section6.title', 'Security Measures')}
                                </h2>
                                <p className="text-gray-600 leading-relaxed">
                                    {t('privacy.section6.security', 'We implement appropriate technical and organizational security measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.')}
                                </p>
                            </section>

                            {/* Contact */}
                            <section>
                                <h2 className="text-2xl font-light text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    {t('privacy.section7.title', 'Contact Us')}
                                </h2>
                                <p className="text-gray-600">
                                    {t('privacy.section7.contact', 'For privacy-related questions or concerns, please contact our Data Protection Officer at')}{' '}
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