import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { X, Cookie, Shield, Settings, FileText } from 'lucide-react';

export default function CookieBanner() {
    const { t } = useTranslation();
    const [show, setShow] = useState(false);
    const [showPreferences, setShowPreferences] = useState(false);
    const [showPolicyModal, setShowPolicyModal] = useState(false);
    const [currentPolicy, setCurrentPolicy] = useState<'privacy' | 'cookies' | null>(null);
    const [cookiePreferences, setCookiePreferences] = useState({
        essential: true, // Always enabled
        functional: false,
        analytics: false
    });

    useEffect(() => {
        const consent = localStorage.getItem("cookieConsent");
        if (!consent) {
            setShow(true);
        }

        // Load saved preferences if they exist
        const savedPreferences = localStorage.getItem("cookiePreferences");
        if (savedPreferences) {
            setCookiePreferences(JSON.parse(savedPreferences));
        }
    }, []);

    const acceptAll = () => {
        const preferences = {
            essential: true,
            functional: true,
            analytics: true
        };
        localStorage.setItem("cookieConsent", "true");
        localStorage.setItem("cookiePreferences", JSON.stringify(preferences));
        setCookiePreferences(preferences);
        setShow(false);
    };

    const acceptSelected = () => {
        localStorage.setItem("cookieConsent", "true");
        localStorage.setItem("cookiePreferences", JSON.stringify(cookiePreferences));
        setShow(false);
    };

    const rejectAll = () => {
        const preferences = {
            essential: true, // Essential cookies cannot be rejected
            functional: false,
            analytics: false
        };
        localStorage.setItem("cookieConsent", "true");
        localStorage.setItem("cookiePreferences", JSON.stringify(preferences));
        setCookiePreferences(preferences);
        setShow(false);
    };

    const togglePreference = (type: 'functional' | 'analytics') => {
        setCookiePreferences(prev => ({
            ...prev,
            [type]: !prev[type]
        }));
    };

    const openPolicyModal = (policy: 'privacy' | 'cookies') => {
        setCurrentPolicy(policy);
        setShowPolicyModal(true);
    };

    const closePolicyModal = () => {
        setShowPolicyModal(false);
        setCurrentPolicy(null);
    };

    if (!show) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[999998]" />

            {/* Main Banner */}
            <div className="
                fixed bottom-4 left-4 right-4
                sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md
                lg:max-w-lg
                bg-white/95 backdrop-blur-xl border border-gray-200/80 
                shadow-2xl rounded-2xl p-6 text-sm z-[999999]
                animate-slide-up
            ">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-red-50 rounded-lg">
                            <Cookie className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-light text-gray-900">
                                {t('cookieBanner.title', 'Cookie Preferences')}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                {t('cookieBanner.subtitle', 'We care about your privacy')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShow(false)}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-4">
                    <p className="text-gray-600 leading-relaxed font-light">
                        {t('cookieBanner.description', 'We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. You can choose which types of cookies to allow.')}
                    </p>

                    {/* Cookie Preferences - Show when preferences panel is open */}
                    {showPreferences && (
                        <div className="space-y-3 bg-gray-50/50 rounded-lg p-4 border border-gray-200">
                            {/* Essential Cookies - Always enabled */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <Shield className="w-4 h-4 text-green-600" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {t('cookieBanner.essential', 'Essential Cookies')}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {t('cookieBanner.essentialDesc', 'Required for basic site functionality')}
                                        </p>
                                    </div>
                                </div>
                                <div className="relative inline-flex items-center cursor-not-allowed">
                                    <div className="w-10 h-6 bg-green-600 rounded-full"></div>
                                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform"></div>
                                </div>
                            </div>

                            {/* Functional Cookies */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <Settings className="w-4 h-4 text-blue-600" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {t('cookieBanner.functional', 'Functional Cookies')}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {t('cookieBanner.functionalDesc', 'Remember your preferences and settings')}
                                        </p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cookiePreferences.functional}
                                        onChange={() => togglePreference('functional')}
                                        className="sr-only peer"
                                    />
                                    <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {/* Analytics Cookies */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <Cookie className="w-4 h-4 text-purple-600" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {t('cookieBanner.analytics', 'Analytics Cookies')}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {t('cookieBanner.analyticsDesc', 'Help us improve our website')}
                                        </p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cookiePreferences.analytics}
                                        onChange={() => togglePreference('analytics')}
                                        className="sr-only peer"
                                    />
                                    <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Links */}
                    <div className="flex items-center justify-between text-xs">
                        <button
                            onClick={() => openPolicyModal('privacy')}
                            className="text-red-600 hover:text-red-700 underline transition-colors"
                        >
                            {t('cookieBanner.privacyPolicy', 'Privacy Policy')}
                        </button>
                        <button
                            onClick={() => openPolicyModal('cookies')}
                            className="text-gray-600 hover:text-gray-700 underline transition-colors"
                        >
                            {t('cookieBanner.cookiePolicy', 'Cookie Policy')}
                        </button>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    {showPreferences ? (
                        <>
                            <button
                                onClick={acceptSelected}
                                className="flex-1 bg-red-600 text-white px-4 py-2.5 text-sm font-light rounded-lg hover:bg-red-700 transition-colors"
                            >
                                {t('cookieBanner.savePreferences', 'Save Preferences')}
                            </button>
                            <button
                                onClick={() => setShowPreferences(false)}
                                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2.5 text-sm font-light rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                {t('common.back', 'Back')}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={rejectAll}
                                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2.5 text-sm font-light rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                {t('cookieBanner.rejectAll', 'Reject All')}
                            </button>
                            <button
                                onClick={() => setShowPreferences(true)}
                                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2.5 text-sm font-light rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                {t('cookieBanner.customize', 'Customize')}
                            </button>
                            <button
                                onClick={acceptAll}
                                className="flex-1 bg-red-600 text-white px-4 py-2.5 text-sm font-light rounded-lg hover:bg-red-700 transition-colors"
                            >
                                {t('cookieBanner.acceptAll', 'Accept All')}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Policy Modal */}
            {showPolicyModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000000] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <div className="flex items-center space-x-3">
                                <FileText className="w-6 h-6 text-red-600" />
                                <h2 className="text-xl font-light text-gray-900">
                                    {currentPolicy === 'privacy'
                                        ? t('cookieBanner.privacyPolicy', 'Privacy Policy')
                                        : t('cookieBanner.cookiePolicy', 'Cookie Policy')
                                    }
                                </h2>
                            </div>
                            <button
                                onClick={closePolicyModal}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {currentPolicy === 'privacy' ? (
                                <div className="prose prose-sm max-w-none">
                                    <h3 className="text-lg font-medium mb-4">Privacy Policy Summary</h3>
                                    <p className="text-gray-600 mb-4">
                                        We respect your privacy and are committed to protecting your personal data.
                                        This summary outlines how we handle your information.
                                    </p>

                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-2">Information We Collect</h4>
                                            <ul className="text-gray-600 space-y-1 text-sm">
                                                <li>• Contact details (name, email, phone)</li>
                                                <li>• Order history and preferences</li>
                                                <li>• Device and usage information</li>
                                                <li>• Location data for delivery</li>
                                            </ul>
                                        </div>

                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-2">How We Use Your Data</h4>
                                            <ul className="text-gray-600 space-y-1 text-sm">
                                                <li>• Process and deliver your orders</li>
                                                <li>• Manage your account and loyalty program</li>
                                                <li>• Improve our services</li>
                                                <li>• Send relevant promotions (with consent)</li>
                                            </ul>
                                        </div>

                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-2">Your Rights</h4>
                                            <ul className="text-gray-600 space-y-1 text-sm">
                                                <li>• Access and update your information</li>
                                                <li>• Delete your account and data</li>
                                                <li>• Opt-out of marketing communications</li>
                                                <li>• Request data portability</li>
                                            </ul>
                                        </div>

                                        <p className="text-sm text-gray-500 mt-4">
                                            For the complete Privacy Policy, visit our dedicated page.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="prose prose-sm max-w-none">
                                    <h3 className="text-lg font-medium mb-4">Cookie Policy Summary</h3>
                                    <p className="text-gray-600 mb-4">
                                        Cookies help us provide you with a better experience on our website.
                                        Here's how we use different types of cookies.
                                    </p>

                                    <div className="space-y-4">
                                        <div className="bg-green-50 p-4 rounded-lg">
                                            <h4 className="font-medium text-green-900 mb-2 flex items-center">
                                                <Shield className="w-4 h-4 mr-2" />
                                                Essential Cookies
                                            </h4>
                                            <p className="text-green-800 text-sm">
                                                Required for the website to function. They enable basic features like page navigation and access to secure areas.
                                            </p>
                                        </div>

                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                                                <Settings className="w-4 h-4 mr-2" />
                                                Functional Cookies
                                            </h4>
                                            <p className="text-blue-800 text-sm">
                                                Remember your preferences and settings to enhance your experience, such as language selection and cart items.
                                            </p>
                                        </div>

                                        <div className="bg-purple-50 p-4 rounded-lg">
                                            <h4 className="font-medium text-purple-900 mb-2 flex items-center">
                                                <Cookie className="w-4 h-4 mr-2" />
                                                Analytics Cookies
                                            </h4>
                                            <p className="text-purple-800 text-sm">
                                                Help us understand how visitors interact with our website, allowing us to improve our services and user experience.
                                            </p>
                                        </div>

                                        <p className="text-sm text-gray-500 mt-4">
                                            You can manage your cookie preferences at any time through this banner.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                            <div className="flex justify-end">
                                <button
                                    onClick={closePolicyModal}
                                    className="bg-red-600 text-white px-6 py-2 text-sm font-light rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    {t('common.close', 'Close')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}