import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FooterLanguageSwitcher } from '../../../components/web/LanguageSelector'
import { HashLink } from 'react-router-hash-link';


interface Props {
    displaySimple: boolean
}

export const LandingCTAFooter = ({ displaySimple }: Props) => {
    const { t } = useTranslation()

    return (
        <>
            {
                !displaySimple && (
                    <>
                        {/* Reservation CTA */}
                        <section className="py-20 bg-gray-900 text-white">
                            <div className="container mx-auto px-6 text-center">
                                <h2 className="text-2xl font-light mb-4 tracking-tight">
                                    {t('landing.experiencePacifique', 'Experience Pacifique')}
                                </h2>
                                <div className="w-16 h-px bg-gray-600 mx-auto mb-6"></div>
                                <p className="text-gray-400 mb-8 text-sm font-light tracking-wide max-w-md mx-auto leading-relaxed">
                                    {t('landing.ctaDescription', 'Reserve your table or order for delivery. An elevated dining experience awaits.')}
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                    <Link
                                        to="/order"
                                        className="bg-white text-gray-900 px-8 py-3 text-sm font-light tracking-wide hover:bg-gray-100 transition-all duration-300"
                                    >
                                        {t('landing.reserveTable', 'RESERVE TABLE')}
                                    </Link>
                                    <Link
                                        to="/order"
                                        className="border border-white text-white px-8 py-3 text-sm font-light tracking-wide hover:bg-white hover:text-gray-900 transition-all duration-300"
                                    >
                                        {t('landing.orderDelivery', 'ORDER DELIVERY')}
                                    </Link>
                                </div>
                            </div>
                        </section>
                    </>
                )
            }

            {/* Elegant Footer */}
            <footer className="bg-gray-950 text-white py-16">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                                    <span className="text-gray-900 text-sm font-light">P</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-light">Pacifique</h3>
                                    <p className="text-xs text-gray-400 font-light tracking-wide">CEVICHE | SUSHI BAR</p>
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm font-light tracking-wide leading-relaxed max-w-md mb-6">
                                {t('landing.footerDescription', 'A sanctuary of coastal flavors in the heart of the city. Where every dish tells a story of the sea.')}
                            </p>
                            <div className="flex space-x-4">
                                <span className="text-gray-500 hover:text-white transition-colors duration-300 cursor-pointer text-sm">IG</span>
                                <span className="text-gray-500 hover:text-white transition-colors duration-300 cursor-pointer text-sm">FB</span>
                                <span className="text-gray-500 hover:text-white transition-colors duration-300 cursor-pointer text-sm">TW</span>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-light mb-4 tracking-wide">
                                {t('landing.navigation', 'NAVIGATION')}
                            </h4>
                            <ul className="space-y-2 text-gray-400 text-sm font-light">
                                {/* <li><Link to="/order" className="hover:text-white transition-colors duration-300">{t('landing.reservations', 'Reservations')}</Link></li> */}
                                <li><Link to="/menu" className="hover:text-white transition-colors duration-300">{t('landing.menu', 'Menu')}</Link></li>
                                <li><a href="#philosophy" className="hover:text-white transition-colors duration-300">{t('landing.philosophy', 'Philosophy')}</a></li>
                                <li>
                                    <HashLink
                                        to="#contact"
                                        className="hover:text-white transition-colors duration-300"
                                        scroll={(el) => el.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                    >
                                        {t('landing.contact', 'Contact')}
                                    </HashLink>                                    </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-sm font-light mb-4 tracking-wide">
                                {t('landing.visit', 'VISIT')}
                            </h4>
                            <ul className="space-y-2 text-gray-400 text-sm font-light">
                                <li>{t('landing.location', 'SHERBROOKE, QC')}</li>
                                <li>{t('landing.days', 'Tuesday - Sunday')}</li>
                                <li>{t('landing.hours', '11:00 - 20:00')}</li>
                                <li>{t('landing.phone', '+1 (514) 867-5309')}</li>
                            </ul>

                            {/* Language Switcher in Footer */}
                            <div className="mt-6 pt-4 border-t border-gray-800">
                                <FooterLanguageSwitcher />                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-800 mt-12 pt-8 text-center">
                        <p className="text-gray-500 text-xs font-light tracking-wide">
                            © 2024 PACIFIQUE.
                        </p>
                    </div>
                </div>
            </footer>
        </>
    )
}