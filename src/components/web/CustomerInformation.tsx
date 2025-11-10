import React from 'react'
import { useTranslation } from 'react-i18next'

interface CustomerInformationProps {
    formData: {
        firstName: string
        lastName: string
        email: string
        phone: string
        address: string
        city: string
        zipCode: string
        deliveryInstructions: string
    }
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

export default function CustomerInformation({ formData, onInputChange }: CustomerInformationProps) {
    const { t } = useTranslation()

    return (
        <div className="bg-white/5 border border-white/10 rounded-sm p-6 backdrop-blur-sm">
            <h2 className="text-lg font-light text-white mb-6 tracking-wide flex items-center">
                <svg className="w-5 h-5 text-white mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {t('checkoutPage.deliveryInfo')}
            </h2>

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-light text-white/60 mb-2">{t('common.firstName')} *</label>
                        <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={onInputChange}
                            required
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-all duration-300 font-light"
                            placeholder={t('customerInformation.firstNamePlaceholder')}
                        />
                    </div>
                    {/* <div>
                        <label className="block text-sm font-light text-white/60 mb-2">{t('common.lastName')} *</label>
                        <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={onInputChange}
                            required
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-all duration-300 font-light"
                            placeholder={t('customerInformation.lastNamePlaceholder')}
                        />
                    </div> */}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-light text-white/60 mb-2">{t('common.email')} *</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={onInputChange}
                            required
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-all duration-300 font-light"
                            placeholder={t('customerInformation.emailPlaceholder')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-light text-white/60 mb-2">{t('common.phone')} *</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={onInputChange}
                            required
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-all duration-300 font-light"
                            placeholder={t('customerInformation.phonePlaceholder')}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-light text-white/60 mb-2">{t('common.address')} *</label>
                    <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={onInputChange}
                        required
                        placeholder={t('customerInformation.addressPlaceholder')}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-all duration-300 font-light"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-light text-white/60 mb-2">{t('common.city')} *</label>
                        <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={onInputChange}
                            required
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-all duration-300 font-light"
                            placeholder={t('customerInformation.cityPlaceholder')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-light text-white/60 mb-2">{t('common.zipCode')} *</label>
                        <input
                            type="text"
                            name="zipCode"
                            value={formData.zipCode}
                            onChange={onInputChange}
                            required
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-all duration-300 font-light"
                            placeholder={t('customerInformation.zipCodePlaceholder')}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-light text-white/60 mb-2">{t('common.deliveryInstructions')}</label>
                    <textarea
                        name="deliveryInstructions"
                        value={formData.deliveryInstructions}
                        onChange={onInputChange}
                        rows={3}
                        placeholder={t('customerInformation.instructionsPlaceholder')}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-all duration-300 font-light resize-none"
                    />
                </div>
            </div>
        </div>
    )
}