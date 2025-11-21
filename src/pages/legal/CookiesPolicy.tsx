import { useTranslation } from 'react-i18next'
export const CookiesPolicy = () => {
    const { t } = useTranslation()

    return (
        <div className="max-w-3xl mx-auto p-6 text-gray-800">
            <h1 className="text-3xl font-light mb-4">
                {t('cookies.title', 'Cookies Policy')}
            </h1>

            <p className="text-sm text-gray-500 mb-6">
                {t('cookies.lastUpdated', 'Last updated')}: {new Date().toLocaleDateString()}
            </p>

            <p className="mb-4">{t('cookies.intro')}</p>

            <h2 className="text-xl font-medium mt-6 mb-2">{t('cookies.essential')}</h2>
            <ul className="list-disc ml-6 mb-4">
                <li>{t('cookies.keepSession')}</li>
                <li>{t('cookies.saveCart')}</li>
                <li>{t('cookies.languagePreference')}</li>
            </ul>

            <h2 className="text-xl font-medium mt-6 mb-2">{t('cookies.functional')}</h2>
            <ul className="list-disc ml-6 mb-4">
                <li>{t('cookies.userPreferences')}</li>
                <li>{t('cookies.ui')}</li>
            </ul>

            <h2 className="text-xl font-medium mt-6 mb-2">{t('cookies.analyticsTitle')}</h2>
            <p className="mb-4">{t('cookies.analyticsDescription')}</p>

            <h2 className="text-xl font-medium mt-6 mb-2">{t('cookies.disableTitle')}</h2>
            <p className="mb-4">{t('cookies.disableDescription')}</p>

            <h2 className="text-xl font-medium mt-6 mb-2">{t('cookies.contactTitle')}</h2>
            <p>{t('cookies.contactDescription')} <strong>privacy@sherdev.com</strong></p>
        </div>
    )
}