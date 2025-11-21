import { useTranslation } from 'react-i18next'

export const PrivacyPolicy = () => {
    const { t } = useTranslation()

    return (
        <div className="max-w-3xl mx-auto p-6 text-gray-800">
            <h1 className="text-3xl font-light mb-4">
                {t('privacy.title', 'Privacy Policy')}
            </h1>

            <p className="text-sm text-gray-500 mb-6">
                {t('privacy.lastUpdated', 'Last updated')}: {new Date().toLocaleDateString()}
            </p>

            <p className="mb-4">{t('privacy.intro')}</p>

            <h2 className="text-xl font-medium mt-6 mb-2">{t('privacy.section1.title')}</h2>
            <ul className="list-disc ml-6 mb-4">
                <li>{t('privacy.section1.name')}</li>
                <li>{t('privacy.section1.email')}</li>
                <li>{t('privacy.section1.phone')}</li>
                <li>{t('privacy.section1.orderHistory')}</li>
                <li>{t('privacy.section1.points')}</li>
                <li>{t('privacy.section1.ip')}</li>
            </ul>

            <h2 className="text-xl font-medium mt-6 mb-2">{t('privacy.section2.title')}</h2>
            <ul className="list-disc ml-6 mb-4">
                <li>{t('privacy.section2.orders')}</li>
                <li>{t('privacy.section2.account')}</li>
                <li>{t('privacy.section2.notifications')}</li>
                <li>{t('privacy.section2.improvement')}</li>
                <li>{t('privacy.section2.compliance')}</li>
            </ul>

            <h2 className="text-xl font-medium mt-6 mb-2">{t('privacy.section3.title')}</h2>
            <ul className="list-disc ml-6 mb-4">
                <li>Supabase</li>
                <li>Firebase / Firestore</li>
                <li>SherDev Automations</li>
            </ul>

            <h2 className="text-xl font-medium mt-6 mb-2">{t('privacy.section4.title')}</h2>
            <ul className="list-disc ml-6 mb-4">
                <li>Zapier</li>
                <li>Delivery partners</li>
                <li>{t('privacy.section4.law')}</li>
            </ul>

            <h2 className="text-xl font-medium mt-6 mb-2">{t('privacy.section5.title')}</h2>
            <ul className="list-disc ml-6 mb-4">
                <li>{t('privacy.section5.access')}</li>
                <li>{t('privacy.section5.modify')}</li>
                <li>{t('privacy.section5.delete')}</li>
                <li>{t('privacy.section5.withdraw')}</li>
            </ul>

            <h2 className="text-xl font-medium mt-6 mb-2">{t('privacy.section6.title')}</h2>
            <p className="mb-4">{t('privacy.section6.security')}</p>

            <h2 className="text-xl font-medium mt-6 mb-2">{t('privacy.section7.title')}</h2>
            <p>{t('privacy.section7.contact')} <strong>support@sherdev.com</strong></p>
        </div>
    )
}
