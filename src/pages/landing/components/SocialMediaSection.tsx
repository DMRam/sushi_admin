import { Facebook, Instagram, MapPin, ExternalLink } from 'lucide-react'
import { useState, useEffect } from 'react'

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
                    relative bg-gradient-to-br from-white/95 to-white/75 
                    backdrop-blur-xl border border-white/30 rounded-xl 
                    p-3.5 sm:p-4 shadow-lg shadow-black/5 
                    transition-all duration-500 ease-out
                    hover:scale-110 hover:bg-white/95 hover:shadow-2xl 
                    hover:shadow-black/20 hover:border-white/40
                    active:scale-95
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
                            text-[#0D0D0D]/70 transition-all duration-300
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
            nextOpeningTime = 'Tuesday 12:00 PM'
        } else {
            nextOpeningTime = 'Tomorrow 12:00 PM'
        }
    } else {
        isOpen = false
        nextOpeningTime = 'Tuesday 12:00 PM'
    }

    const statusText = isOpen ? 'Open Now' : 'Closed'

    const hoursText = isOpen
        ? `Closes ${closingTime} · ${formatMinutesLeft(minutesToClose)}`
        : `Opens ${nextOpeningTime}`

    return (
        <div className="fixed left-3 sm:left-6 bottom-8 z-50 hidden lg:block">
            <div className="relative group">
                <div className="relative bg-gradient-to-br from-white/90 to-white/70 
                    backdrop-blur-xl border border-white/20 rounded-lg p-4
                    shadow-lg shadow-black/5 hover:shadow-xl 
                    transition-all duration-300 w-48">

                    <div className="absolute top-0 left-4 right-4 h-[1px] 
                        bg-gradient-to-r from-transparent via-[#E62B2B]/30 
                        to-transparent" />

                    <div className="text-[#0D0D0D] text-xs font-light tracking-[0.2em] 
                        uppercase mb-3 text-center">
                        MaiSushi
                    </div>

                    <div className="flex items-center justify-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-[10px] font-medium uppercase tracking-wider">
                            {statusText}
                        </span>
                    </div>

                    <div className="text-[9px] text-[#0D0D0D]/60 text-center font-light tracking-wide">
                        {hoursText}
                    </div>

                    <a
                        href="https://maps.google.com/?q=MaiSushi"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex items-center justify-center gap-1 
                            text-[8px] text-[#0D0D0D]/40 hover:text-[#E62B2B] 
                            transition-colors duration-200 group/link"
                    >
                        <MapPin className="w-2 h-2" />
                        <span className="tracking-wider uppercase">Find us</span>
                    </a>
                </div>

                <div className="absolute -inset-1 bg-gradient-to-r from-[#E62B2B]/10 
                    to-transparent rounded-lg blur opacity-0 
                    group-hover:opacity-100 transition-opacity duration-500 -z-10" />
            </div>
        </div>
    )
}

// Main Social Media Section Component
export const SocialMediaSection: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        setIsVisible(true)
    }, [])

    return (
        <>
            <div className={`
                fixed left-3 sm:left-6 top-1/2 -translate-y-1/2 z-50 
                flex flex-col gap-2
                transition-all duration-1000 transform
                ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}
            `}>
                <div className="text-[8px] text-[#0D0D0D]/30 font-light tracking-[0.3em] 
                    uppercase mb-2 text-center hidden sm:block">
                    Connect
                </div>

                <div className="relative">
                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] 
                        bg-gradient-to-b from-transparent via-[#E62B2B]/20 
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
                                    bg-[#E62B2B]/30 rounded-full -translate-x-1/2" />
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-4 text-[8px] text-[#0D0D0D]/20 font-light 
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