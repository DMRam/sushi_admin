import { useTranslation } from 'react-i18next'
import { LandingCTAFooter } from '../landing/components/LandingCTAFooter'
import { LandingHeader } from '../landing/components/LandingHeader'


export const TermsConditions = () => {
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
                                {t('terms.title', 'Terms & Conditions')}
                            </h1>
                            <div className="w-20 h-px bg-red-500 mx-auto mb-4"></div>
                            <p className="text-sm text-gray-500">
                                {t('terms.lastUpdated', 'Last updated')}: {new Date().toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>

                        <div className="prose prose-lg max-w-none">
                            {/* Introduction */}
                            <p className="text-gray-600 leading-relaxed mb-8">
                                {t('terms.intro', 'Welcome to MaiSushi. By accessing our website and using our services, you agree to these terms and conditions. Please read them carefully.')}
                            </p>

                            {/* Account Registration */}
                            <section className="mb-8">
                                <h2 className="text-2xl font-light text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    {t('terms.section1.title', 'Account Registration')}
                                </h2>
                                <p className="text-gray-600 leading-relaxed">
                                    {t('terms.section1.content', 'To place orders and access certain features, you may need to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.')}
                                </p>
                            </section>

                            {/* User Responsibilities */}
                            <section className="mb-8">
                                <h2 className="text-2xl font-light text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    {t('terms.section2.title', 'User Responsibilities')}
                                </h2>
                                <ul className="space-y-3 text-gray-600">
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('terms.section2.trueInfo', 'Provide accurate and complete information')}</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('terms.section2.security', 'Maintain account security and notify us of unauthorized use')}</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('terms.section2.suspension', 'Accept that we may suspend accounts for violations of these terms')}</span>
                                    </li>
                                </ul>
                            </section>

                            {/* Orders & Payments */}
                            <section className="mb-8">
                                <h2 className="text-2xl font-light text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    {t('terms.section3.title', 'Orders & Payments')}
                                </h2>
                                <ul className="space-y-3 text-gray-600">
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('terms.section3.prices', 'All prices are in CAD and subject to change without notice')}</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('terms.section3.finalOrders', 'Orders are final once payment is processed')}</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        <span>{t('terms.section3.refunds', 'Refunds are processed according to our refund policy')}</span>
                                    </li>
                                </ul>
                            </section>

                            {/* Loyalty Program */}
                            <section className="mb-8">
                                <h2 className="text-2xl font-light text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    {t('terms.section4.title', 'Loyalty Program')}
                                </h2>
                                <p className="text-gray-600 leading-relaxed">
                                    {t('terms.section4.content', 'Our loyalty program allows you to earn points on qualifying purchases. Points are non-transferable and have no cash value. We reserve the right to modify or terminate the loyalty program at any time.')}
                                </p>
                            </section>

                            {/* Limitation of Liability */}
                            <section className="mb-8">
                                <h2 className="text-2xl font-light text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    {t('terms.section5.title', 'Limitation of Liability')}
                                </h2>
                                <p className="text-gray-600 leading-relaxed">
                                    {t('terms.section5.content', 'MaiSushi shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of our services or inability to use our services.')}
                                </p>
                            </section>

                            {/* Contact */}
                            <section>
                                <h2 className="text-2xl font-light text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    {t('terms.section6.title', 'Contact Information')}
                                </h2>
                                <p className="text-gray-600">
                                    {t('terms.section6.contact', 'For questions about these terms, please contact us at')}{' '}
                                    <strong className="text-red-600">legal@maisushi.ca</strong>
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