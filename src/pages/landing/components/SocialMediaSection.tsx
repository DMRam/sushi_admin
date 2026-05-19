import { Facebook, Instagram, MapPin, ExternalLink } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

// Types
interface SocialPlatform {
    id: string
    name: string
    icon: typeof Facebook | typeof Instagram
    href: string
    color: string
    gradient: string
    hoverColor: string
    ariaLabel: string
    followers?: string
    description?: string
}

interface SocialLinkProps extends SocialPlatform {
    index: number
    total: number
}

// Social media platforms data
const SOCIAL_PLATFORMS: SocialPlatform[] = [
    {
        id: 'facebook',
        name: 'Facebook',
        icon: Facebook,
        href: 'https://www.facebook.com/profile.php?id=61588022970280',
        color: '#1877F2',
        gradient: 'from-[#1877F2] to-[#0E5A9E]',
        hoverColor: 'group-hover:text-[#1877F2]',
        ariaLabel: 'MaiSushi Facebook',
        followers: '500+',
        description: 'Join our community'
    },
    {
        id: 'instagram',
        name: 'Instagram',
        icon: Instagram,
        href: 'https://www.instagram.com/maisushi.ca/',
        color: '#E4405F',
        gradient: 'from-[#E4405F] via-[#D62C7A] to-[#C13584]',
        hoverColor: 'group-hover:text-[#E4405F]',
        ariaLabel: 'MaiSushi Instagram',
        followers: '1k+',
        description: 'Follow our journey'
    }
]

// Enhanced SocialLink Component
const SocialLink: React.FC<SocialLinkProps> = ({
    name,
    icon: Icon,
    href,
    gradient,
    hoverColor,
    ariaLabel,
    description,
    followers,
    index,
}) => {
    const [isHovered, setIsHovered] = useState(false)
    const animationDelay = `${index * 0.1}s`

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block"
            aria-label={ariaLabel}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                className="relative animate-slide-in-left"
                style={{ animationDelay }}
            >
                <div className={`
                    relative rounded-[4px] border border-white/12 bg-[#080808]/90
                    p-3.5 shadow-xl shadow-black/35 backdrop-blur-xl
                    transition-all duration-500 ease-out
                    hover:scale-110 hover:border-[#f26350]/55 hover:bg-[#111]/95 hover:shadow-2xl
                    hover:shadow-[#f26350]/15 active:scale-95 sm:p-4
                `}>
                    <div className={`
                        absolute inset-0 rounded-xl bg-gradient-to-br ${gradient} 
                        opacity-0 group-hover:opacity-10 transition-opacity duration-500
                    `} />

                    {isHovered && (
                        <>
                            <div
                                className="absolute -top-1 -right-1 w-1 h-1 bg-current rounded-full animate-ping"
                                style={{ color: SOCIAL_PLATFORMS[index].color }}
                            />
                            <div
                                className="absolute -bottom-1 -left-1 w-1 h-1 bg-current rounded-full animate-ping delay-150"
                                style={{ color: SOCIAL_PLATFORMS[index].color }}
                            />
                        </>
                    )}

                    <div className="relative flex items-center justify-center">
                        <div className={`
                            absolute inset-0 rounded-full blur-md scale-150 opacity-0 
                            group-hover:opacity-30 transition-opacity duration-500
                            bg-gradient-to-r ${gradient}
                        `} />

                        <Icon className={`
                            w-4 h-4 sm:w-5 sm:h-5 
                            text-white/76 transition-all duration-300
                            ${hoverColor} group-hover:scale-110
                            relative z-10
                        `} />
                    </div>

                    <div className="absolute inset-0 rounded-xl overflow-hidden">
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="absolute inset-0 animate-ripple bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                        </div>
                    </div>
                </div>

                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 
                    opacity-0 translate-x-2 group-hover:opacity-100 
                    group-hover:translate-x-0 transition-all duration-300 
                    hidden sm:block z-50 pointer-events-none">
                    <div className="relative">
                        <div className="bg-[#0D0D0D] text-white rounded-lg shadow-2xl overflow-hidden min-w-[160px]">
                            <div className={`px-3 py-2 bg-gradient-to-r ${gradient} bg-opacity-90`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold tracking-wider uppercase">
                                        {name}
                                    </span>
                                    <ExternalLink className="w-3 h-3 opacity-70" />
                                </div>
                            </div>

                            <div className="px-3 py-2 space-y-1">
                                {description && (
                                    <p className="text-[10px] text-white/70 whitespace-nowrap">
                                        {description}
                                    </p>
                                )}
                                {followers && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] font-medium text-white/90">
                                            {followers}
                                        </span>
                                        <span className="text-[8px] text-white/50">followers</span>
                                    </div>
                                )}
                            </div>

                            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#0D0D0D] rotate-45" />
                        </div>

                        <div className={`
                            absolute inset-0 blur-md -z-10 opacity-0 
                            group-hover:opacity-50 transition-opacity duration-300
                            bg-gradient-to-r ${gradient}
                        `} />
                    </div>
                </div>
            </div>
        </a>
    )
}

// Business info component
const BusinessInfo: React.FC = () => {
    const { t } = useTranslation()
    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000)
        return () => clearInterval(timer)
    }, [])

    const toMinutes = (hours: number, minutes: number = 0) => hours * 60 + minutes

    const formatMinutesLeft = (minutesLeft: number) => {
        if (minutesLeft <= 0) return ''

        const hours = Math.floor(minutesLeft / 60)
        const minutes = minutesLeft % 60

        if (hours > 0 && minutes > 0) {
            return `${hours}h ${minutes}m left`
        }

        if (hours > 0) {
            return `${hours}h left`
        }

        return `${minutes} min left`
    }

    const now = currentTime
    const day = now.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    let isOpen = false
    let openingTime = ''
    let closingTime = ''
    let nextOpeningTime = ''
    let minutesToClose = 0

    let openMinutes = 0
    let closeMinutes = 0

    if (day === 2 || day === 3) {
        // Tue-Wed: 12:00 PM - 8:00 PM
        openMinutes = toMinutes(12)
        closeMinutes = toMinutes(20)
        openingTime = '12:00 PM'
        closingTime = '8:00 PM'
    } else if (day === 4) {
        // Thu: 12:00 PM - 9:00 PM
        openMinutes = toMinutes(12)
        closeMinutes = toMinutes(21)
        openingTime = '12:00 PM'
        closingTime = '9:00 PM'
    } else if (day === 5 || day === 6) {
        // Fri-Sat: 12:00 PM - 10:00 PM
        openMinutes = toMinutes(12)
        closeMinutes = toMinutes(22)
        openingTime = '12:00 PM'
        closingTime = '10:00 PM'
    }

    if (day >= 2 && day <= 6) {
        isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes

        if (isOpen) {
            minutesToClose = closeMinutes - currentMinutes
        } else if (currentMinutes < openMinutes) {
            nextOpeningTime = openingTime
        } else if (day === 6) {
            nextOpeningTime = t('landing.business.tuesdayNoon', 'Tuesday 12:00 PM')
        } else {
            nextOpeningTime = t('landing.business.tomorrowNoon', 'Tomorrow 12:00 PM')
        }
    } else {
        isOpen = false
        nextOpeningTime = t('landing.business.tuesdayNoon', 'Tuesday 12:00 PM')
    }

    const statusText = isOpen
        ? t('landing.business.openNow', 'Open Now')
        : t('landing.business.closed', 'Closed')

    const hoursText = isOpen
        ? t('landing.business.closesAt', 'Closes {{time}} · {{remaining}}', {
            time: closingTime,
            remaining: formatMinutesLeft(minutesToClose)
        })
        : t('landing.business.opensAt', 'Opens {{time}}', { time: nextOpeningTime })

    return (
        <div className="fixed bottom-6 left-6 z-50 hidden lg:block">
            <div className="relative group">
                <div className="relative w-52 overflow-hidden rounded-[4px] border border-white/12 bg-[#080808]/92 p-4 text-white shadow-2xl shadow-black/45 backdrop-blur-xl transition-all duration-300 hover:border-[#f26350]/45">

                    <div className="absolute left-0 top-0 h-[2px] w-full bg-[#f26350]" />

                    <div className="mb-3 text-center text-[12px] font-extrabold uppercase tracking-[0.22em] text-white">
                        MaiSushi
                    </div>

                    <div className="mb-2 flex items-center justify-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/90">
                            {statusText}
                        </span>
                    </div>

                    <div className="text-center text-[10px] font-medium leading-4 text-white/62">
                        {hoursText}
                    </div>

                    <a
                        href="https://maps.google.com/?q=MaiSushi"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/link mt-3 flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white/45 transition-colors duration-200 hover:text-[#f26350]"
                    >
                        <MapPin className="w-2 h-2" />
                        <span>{t('landing.business.findUs', 'Find us')}</span>
                    </a>
                </div>

                <div className="absolute -inset-1 -z-10 rounded-lg bg-[#f26350]/10 opacity-0 blur transition-opacity duration-500 group-hover:opacity-100" />
            </div>
        </div>
    )
}

// Main Social Media Section Component
export const SocialMediaSection: React.FC = () => {
    const { t } = useTranslation()
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        setIsVisible(true)
    }, [])

    return (
        <>
            <div className={`
                fixed left-3 sm:left-5 top-1/2 -translate-y-1/2 z-50 
                flex flex-col gap-2
                transition-all duration-1000 transform
                ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}
            `}>
                <div className="mb-2 hidden text-center text-[8px] font-bold uppercase tracking-[0.3em] text-white/35 sm:block">
                    {t('landing.social.connect', 'Connect')}
                </div>

                <div className="relative">
                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] 
                        bg-gradient-to-b from-transparent via-[#f26350]/35 
                        to-transparent -translate-x-1/2" />

                    {SOCIAL_PLATFORMS.map((platform, index) => (
                        <div key={platform.id} className="relative mt-1">
                            <SocialLink
                                {...platform}
                                index={index}
                                total={SOCIAL_PLATFORMS.length}
                            />

                            {index < SOCIAL_PLATFORMS.length - 1 && (
                                <div className="absolute left-1/2 -bottom-1 w-1 h-1 
                                    bg-[#f26350]/40 rounded-full -translate-x-1/2" />
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-4 text-[8px] text-white/20 font-light 
                    tracking-[0.2em] uppercase rotate-90 hidden sm:block">
                    <span className="animate-pulse">↗</span>
                </div>
            </div>

            <BusinessInfo />

            <style>{`
                @keyframes slide-in-left {
                    0% {
                        opacity: 0;
                        transform: translateX(-20px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                @keyframes ripple {
                    0% {
                        transform: translateX(-100%) skewX(-15deg);
                    }
                    100% {
                        transform: translateX(200%) skewX(-15deg);
                    }
                }
                
                .animate-slide-in-left {
                    animation: slide-in-left 0.5s ease-out forwards;
                    opacity: 0;
                }
                
                .animate-ripple {
                    animation: ripple 1.5s ease-in-out infinite;
                }
                
                .delay-150 {
                    animation-delay: 150ms;
                }
                
                @media (max-width: 640px) {
                    .backdrop-blur-xl {
                        backdrop-filter: blur(16px);
                    }
                }
            `}</style>
        </>
    )
}
