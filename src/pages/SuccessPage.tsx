import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { useTranslation } from 'react-i18next';

export default function SuccessPage() {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const clearCart = useCartStore((state) => state.clearCart);
    const { t } = useTranslation();

    useEffect(() => {
        clearCart();
        if (sessionId) {
            console.log('Order completed with session:', sessionId);
        }
    }, [sessionId, clearCart]);

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="container mx-auto px-6">
                <div className="max-w-md mx-auto text-center">
                    <div className="bg-white/5 border border-white/10 rounded-sm p-8 backdrop-blur-sm">
                        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-light text-white mb-3 tracking-wide">
                            {t('successPage.title')}
                        </h2>
                        <p className="text-white/60 mb-3 font-light tracking-wide text-sm">
                            {t('successPage.thanks')}
                        </p>

                        {sessionId && (
                            <div className="bg-white/5 rounded-sm p-4 mb-6 border border-white/10">
                                <p className="text-xs text-white/40 font-light tracking-wide mb-1">
                                    {t('successPage.orderReference')}
                                </p>
                                <p className="text-sm font-light text-white font-mono break-all">{sessionId}</p>
                            </div>
                        )}

                        <p className="text-white/60 mb-6 font-light tracking-wide leading-relaxed text-sm">
                            {t('successPage.confirmation')}
                        </p>
                        <div className="flex flex-col gap-3">
                            <Link
                                to="/order"
                                className="border border-white text-white px-4 py-3 rounded-sm hover:bg-white hover:text-gray-900 transition-all duration-300 font-light tracking-wide text-sm"
                            >
                                {t('successPage.orderAgain')}
                            </Link>
                            <Link
                                to="/"
                                className="bg-white/5 border border-white/10 text-white px-4 py-3 rounded-sm hover:bg-white/10 transition-all duration-300 font-light tracking-wide text-sm"
                            >
                                {t('successPage.backHome')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}