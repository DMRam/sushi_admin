import { useTranslation } from 'react-i18next'

export const TermsConditions = () => {
    const { t } = useTranslation()

    return (
        <div className="max-w-3xl mx-auto p-6 text-gray-800">
            <h1 className="text-3xl font-light mb-4">
                {t('terms.title', 'Terms & Conditions')}
            </h1>

            <p className="text-sm text-gray-500 mb-6">
                {t('terms.lastUpdated', 'Last updated')}: {new Date().toLocaleDateString()}
            </p>

            <p className="mb-4">{t('terms.intro')}</p>

            <h2 className="text-xl font-medium mt-6 mb-2">{t('terms.section1.title')}</h2>
            <p className="mb-4">{t('terms.section1.content')}</p>

            <h2 className="text-xl font-medium mt-6 mb-2">{t('terms.section2.title')}</h2>
            <ul className="list-disc ml-6 mb-4">
                <li>{t('terms.section2.trueInfo')}</li>
                <li>{t('terms.section2.security')}</li>
                <li>{t('terms.section2.suspension')}</li>
            </ul>

            <h2 className="text-xl font-medium mt-6 mb-2">{t('terms.section3.title')}</h2>
            <ul className="list-disc ml-6 mb-4">
                <li>{t('terms.section3.prices')}</li>
                <li>{t('terms.section3.finalOrders')}</li>
                <li>{t('terms.section3.refunds')}</li>
            </ul>

            <h2 className="text-xl font-medium mt-6 mb-2">{t('terms.section4.title')}</h2>
            <p className="mb-4">{t('terms.section4.content')}</p>

            <h2 className="text-xl font-medium mt-6 mb-2">{t('terms.section5.title')}</h2>
            <p className="mb-4">{t('terms.section5.content')}</p>

            <h2 className="text-xl font-medium mt-6 mb-2">{t('terms.section6.title')}</h2>
            <p>{t('terms.section6.contact')} <strong>legal@sherdev.com</strong></p>
        </div>
    )
}