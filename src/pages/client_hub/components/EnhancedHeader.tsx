import type { ClientProfile } from "../../../types/types";
import { useNavigate } from "react-router-dom";
import { signOut } from 'firebase/auth'
import { auth } from "../../../firebase/firebase";
import { useState, useRef } from "react";
import { uploadAvatar } from "../../../utils/avatarUtils";

interface SpecialOffer {
    id: string
    title: string
    description: string
    discount_percentage: number
    valid_until: string
    min_order_amount: number
    code: string
    image_url?: string
}

interface EnhancedHeaderProps {
    clientProfile: ClientProfile | null;
    onProfileUpdate: (updatedProfile: ClientProfile) => void;
    formatCurrency: (amount: number) => string;
    stats: {
        totalSpent: number;
        averageOrder: number;
        favoriteCategory: string;
        monthlyOrders: number;
    }
    loadingData: boolean;
    activeTab: string;
    setActiveTab: (tab: string) => void
    specialOffers: SpecialOffer[]
    formatDate: (dateString: string) => string;
    isMobile?: boolean;
}

export const EnhancedHeader = ({
    clientProfile,
    onProfileUpdate,
    formatCurrency,
    formatDate,
    stats,
    specialOffers,
    isMobile
}: EnhancedHeaderProps & { isMobile?: boolean }) => {

    const [isUploading, setIsUploading] = useState(false);
    const navigate = useNavigate()
    const fileInputRef = useRef<HTMLInputElement>(null);

    const copyPromoCode = (code: string) => {
        navigator.clipboard.writeText(code)
        alert(`Promo code ${code} copied to clipboard!`)
    }

    const getTierColor = (tier: string) => {
        switch (tier?.toLowerCase()) {
            case 'platinum': return 'from-purple-500 to-pink-500'
            case 'gold': return 'from-yellow-500 to-orange-500'
            case 'silver': return 'from-gray-400 to-gray-300'
            default: return 'from-emerald-400 to-cyan-400'
        }
    }

    const getTierBenefits = (tier: string) => {
        switch (tier?.toLowerCase()) {
            case 'platinum': return ['Free Delivery', '20% Bonus Points', 'Priority Support', 'Exclusive Offers']
            case 'gold': return ['15% Bonus Points', 'Priority Support', 'Special Discounts']
            case 'silver': return ['10% Bonus Points', 'Early Access to Sales']
            default: return ['5% Bonus Points']
        }
    }

    const getProgressPercentage = () => {
        const points = clientProfile?.total_points || 0
        if (points >= 1000) return 100
        return (points / 1000) * 100
    }

    const handleLogout = async () => {
        try {
            await signOut(auth)
            navigate('/')
        } catch (error) {
            console.error('Logout error:', error)
        }
    }

    const getDaysUntilTierUpgrade = () => {
        const points = clientProfile?.total_points || 0
        const pointsNeeded = 1000 - points
        const averagePointsPerDay = 50
        return Math.ceil(pointsNeeded / averagePointsPerDay)
    }

    const handleAvatarClick = () => {
        console.log('📷 Avatar clicked, opening file picker...');
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        console.log('📁 File selected:', file);

        if (!file || !clientProfile) {
            console.log('❌ No file or client profile');
            return;
        }

        // Validate file type and size
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file (JPEG, PNG, GIF, WebP)');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Image size should be less than 5MB');
            return;
        }

        console.log('✅ File validated, uploading directly...');

        try {
            setIsUploading(true);

            // Upload the original file directly
            console.log('📤 Uploading avatar...');
            const avatarUrl = await uploadAvatar(clientProfile.id, file);

            console.log('✅ Avatar upload successful, updating profile...');

            if (clientProfile) {
                const updatedProfile: ClientProfile = {
                    ...clientProfile,
                    avatar_url: avatarUrl ?? undefined
                };
                onProfileUpdate(updatedProfile);
            }

        } catch (error) {
            console.error('❌ Error uploading avatar:', error);
            alert('Failed to upload avatar. Please try again.');
        } finally {
            setIsUploading(false);
            // Clear the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Responsive grid classes
    const getStatsGridClasses = () => {
        if (isMobile) {
            return "grid grid-cols-2 gap-4";
        }
        return "grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6";
    };

    const getMainGridClasses = () => {
        if (isMobile) {
            return "grid grid-cols-1 gap-6";
        }
        return "grid grid-cols-1 lg:grid-cols-3 gap-6";
    };

    const getProgressSpanClasses = () => {
        if (isMobile) {
            return "lg:col-span-1";
        }
        return "lg:col-span-2";
    };

    const getOffersGridClasses = () => {
        if (isMobile) {
            return "grid grid-cols-1 gap-4";
        }
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";
    };

    return (
        <>
            {/* Enhanced Header */}
            <div className={`flex flex-col ${isMobile ? 'gap-4' : 'lg:flex-row lg:items-center gap-6'} justify-between items-start mb-6 md:mb-8`}>
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="relative">
                        <div
                            onClick={handleAvatarClick}
                            className={`
                            ${isMobile ? 'w-16 h-16' : 'w-20 h-20'}
                            rounded-full flex items-center justify-center 
                            text-white font-bold 
                            ${isMobile ? 'text-xl' : 'text-2xl'}
                            cursor-pointer hover:opacity-80 transition-opacity 
                            ${isUploading ? 'opacity-50' : ''}
                            overflow-hidden
                            relative
                            bg-gray-300
                            border-2 border-white/20
                        `}
                        >
                            {/* Avatar Image with proper styling */}
                            {clientProfile?.avatar_url ? (
                                <img
                                    src={clientProfile.avatar_url}
                                    alt={`${clientProfile.full_name}'s avatar`}
                                    className="w-full h-full object-cover"
                                    style={{
                                        objectPosition: 'center center'
                                    }}
                                    onError={(e) => {
                                        console.error('❌ Avatar image failed to load');
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            ) : (
                                // Fallback gradient with initial
                                <div className="w-full h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center">
                                    <span className="select-none">
                                        {clientProfile?.full_name?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}

                            {/* Uploading overlay */}
                            {isUploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                </div>
                            )}
                        </div>

                        {/* Edit icon overlay */}
                        {!isUploading && (
                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 shadow-lg border-2 border-white">
                                <svg
                                    className={isMobile ? "w-3 h-3" : "w-4 h-4"}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                        )}

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>
                    <div>
                        <h1 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-light text-white mb-1 md:mb-2`}>
                            Welcome back, {clientProfile?.full_name?.split(' ')[0]}!
                        </h1>
                        <p className="text-white/60 font-light flex items-center gap-2 text-sm md:text-base">
                            <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${getTierColor(clientProfile?.current_tier || 'bronze')}`}></span>
                            {clientProfile?.current_tier ? `${clientProfile.current_tier.charAt(0).toUpperCase() + clientProfile.current_tier.slice(1)} Tier Member` : 'Bronze Tier Member'}
                        </p>
                    </div>
                </div>
                <div className={`flex items-center gap-2 md:gap-3 ${isMobile ? 'w-full justify-stretch' : ''}`}>
                    <button
                        onClick={() => navigate('/menu')}
                        className={`${isMobile ? 'flex-1 px-4 py-2 text-sm' : 'px-6 py-2'} bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all duration-300 font-light shadow-lg shadow-emerald-500/20 flex items-center gap-2 justify-center`}
                    >
                        <span>🍽️</span>
                        Order Now
                    </button>
                    <button
                        onClick={handleLogout}
                        className={`${isMobile ? 'flex-1 px-4 py-2 text-sm' : 'px-6 py-2'} border border-white/20 text-white/60 rounded-lg hover:bg-white/10 hover:text-white transition-all duration-300 font-light flex items-center gap-2 justify-center`}
                    >
                        <span>🚪</span>
                        Logout
                    </button>
                </div>
            </div>

            {/* Enhanced Stats Cards */}
            <div className={`${getStatsGridClasses()} mb-6 md:mb-8`}>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-emerald-400/10 rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <span className={isMobile ? 'text-lg' : 'text-xl'}>⭐</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-white/60 font-light text-xs md:text-sm truncate">Total Points</p>
                            <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-light text-white truncate`}>{clientProfile?.total_points || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-purple-400/10 rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <span className={isMobile ? 'text-lg' : 'text-xl'}>💰</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-white/60 font-light text-xs md:text-sm truncate">Total Spent</p>
                            <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-light text-white truncate`}>{formatCurrency(stats.totalSpent)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-blue-400/10 rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <span className={isMobile ? 'text-lg' : 'text-xl'}>📊</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-white/60 font-light text-xs md:text-sm truncate">Monthly Orders</p>
                            <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-light text-white truncate`}>{stats.monthlyOrders}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-orange-400/10 rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <span className={isMobile ? 'text-lg' : 'text-xl'}>❤️</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-white/60 font-light text-xs md:text-sm truncate">Favorite</p>
                            <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-light text-white truncate capitalize`}>{stats.favoriteCategory || 'None'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress and Tier Benefits */}
            <div className={`${getMainGridClasses()} mb-6 md:mb-8`}>
                <div className={`${getProgressSpanClasses()} bg-white/5 border border-white/10 rounded-xl p-4 md:p-6 backdrop-blur-sm`}>
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-3">
                        <p className="text-white/60 font-light text-sm md:text-base">Progress to Next Tier</p>
                        <p className="text-white font-light text-sm md:text-base">{clientProfile?.total_points || 0}/1000 points</p>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 md:h-3 mb-2">
                        <div
                            className={`h-2 md:h-3 rounded-full bg-gradient-to-r ${getTierColor(clientProfile?.current_tier || 'bronze')} transition-all duration-1000 ease-out`}
                            style={{ width: `${getProgressPercentage()}%` }}
                        ></div>
                    </div>
                    <p className="text-white/40 text-xs md:text-sm font-light">
                        {1000 - (clientProfile?.total_points || 0)} points needed •
                        ~{getDaysUntilTierUpgrade()} days until next tier
                    </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6 backdrop-blur-sm">
                    <h4 className="text-white font-light text-base md:text-lg mb-3">Tier Benefits</h4>
                    <ul className="space-y-1 md:space-y-2">
                        {getTierBenefits(clientProfile?.current_tier || 'bronze').map((benefit, index) => (
                            <li key={index} className="text-white/60 text-xs md:text-sm font-light flex items-center gap-2">
                                <span className="text-emerald-400 flex-shrink-0">✓</span>
                                <span className="break-words">{benefit}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Special Offers Section */}
            {specialOffers.length > 0 && (
                <div className="mb-6 md:mb-8">
                    <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-light text-white mb-4 flex items-center gap-2`}>
                        <span>🎁</span>
                        Special Offers
                    </h3>
                    <div className={getOffersGridClasses()}>
                        {specialOffers.slice(0, isMobile ? 2 : 3).map((offer) => (
                            <div key={offer.id} className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-400/20 rounded-xl p-4 md:p-6 backdrop-blur-sm">
                                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-white font-light text-base md:text-lg line-clamp-2">{offer.title}</h4>
                                        <p className="text-white/60 text-xs md:text-sm font-light line-clamp-2 mt-1">{offer.description}</p>
                                    </div>
                                    <span className="bg-purple-400/20 text-purple-400 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-light flex-shrink-0 md:self-start">
                                        {offer.discount_percentage}% OFF
                                    </span>
                                </div>
                                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mt-3 md:mt-4">
                                    <button
                                        onClick={() => copyPromoCode(offer.code)}
                                        className="text-white/60 hover:text-white transition-colors font-light text-xs md:text-sm flex items-center gap-1 md:gap-2 justify-start"
                                    >
                                        Code: {offer.code}
                                        <span>📋</span>
                                    </button>
                                    <span className="text-white/40 text-xs">
                                        Valid until {formatDate(offer.valid_until)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}