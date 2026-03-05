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
    // total
}) => {
    const [isHovered, setIsHovered] = useState(false)

    // Calculate animation delay based on index
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
            {/* Animated container with staggered entrance */}
            <div
                className="relative animate-slide-in-left"
                style={{ animationDelay }}
            >
                {/* Main button with enhanced glass morphism */}
                <div className={`
          relative bg-gradient-to-br from-white/95 to-white/75 
          backdrop-blur-xl border border-white/30 rounded-xl 
          p-3.5 sm:p-4 shadow-lg shadow-black/5 
          transition-all duration-500 ease-out
          hover:scale-110 hover:bg-white/95 hover:shadow-2xl 
          hover:shadow-black/20 hover:border-white/40
          active:scale-95
        `}>

                    {/* Animated gradient overlay */}
                    <div className={`
            absolute inset-0 rounded-xl bg-gradient-to-br ${gradient} 
            opacity-0 group-hover:opacity-10 transition-opacity duration-500
          `} />

                    {/* Floating particles effect on hover */}
                    {isHovered && (
                        <>
                            <div className="absolute -top-1 -right-1 w-1 h-1 bg-current rounded-full animate-ping"
                                style={{ color: SOCIAL_PLATFORMS[index].color }} />
                            <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-current rounded-full animate-ping delay-150"
                                style={{ color: SOCIAL_PLATFORMS[index].color }} />
                        </>
                    )}

                    {/* Icon container with enhanced effects */}
                    <div className="relative flex items-center justify-center">
                        {/* Background glow on hover */}
                        <div className={`
              absolute inset-0 rounded-full blur-md scale-150 opacity-0 
              group-hover:opacity-30 transition-opacity duration-500
              bg-gradient-to-r ${gradient}
            `} />

                        {/* Icon with gradient on hover */}
                        <Icon className={`
              w-4 h-4 sm:w-5 sm:h-5 
              text-[#0D0D0D]/70 transition-all duration-300
              ${hoverColor} group-hover:scale-110
              relative z-10
            `} />
                    </div>

                    {/* Ripple effect on hover */}
                    <div className="absolute inset-0 rounded-xl overflow-hidden">
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="absolute inset-0 animate-ripple bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                        </div>
                    </div>
                </div>

                {/* Enhanced tooltip with more information */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 
                     opacity-0 translate-x-2 group-hover:opacity-100 
                     group-hover:translate-x-0 transition-all duration-300 
                     hidden sm:block z-50 pointer-events-none">
                    <div className="relative">
                        {/* Main tooltip content */}
                        <div className="bg-[#0D0D0D] text-white rounded-lg shadow-2xl 
                          overflow-hidden min-w-[160px]">

                            {/* Header with platform color */}
                            <div className={`px-3 py-2 bg-gradient-to-r ${gradient} bg-opacity-90`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold tracking-wider uppercase">
                                        {name}
                                    </span>
                                    <ExternalLink className="w-3 h-3 opacity-70" />
                                </div>
                            </div>

                            {/* Body with additional info */}
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

                            {/* Decorative corner */}
                            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 
                            bg-[#0D0D0D] rotate-45" />
                        </div>

                        {/* Subtle glow effect */}
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

// Business info component for additional context
const BusinessInfo: React.FC = () => {
    const [currentTime, setCurrentTime] = useState(new Date())

    // Update time every minute
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000)
        return () => clearInterval(timer)
    }, [])

    // Check if restaurant is open (example: 11 AM - 8 PM)
    const hour = currentTime.getHours()
    const isOpen = hour >= 11 && hour < 20

    return (
        <div className="fixed left-3 sm:left-6 bottom-8 z-50 hidden lg:block">
            <div className="relative group">
                {/* Main container */}
                <div className="relative bg-gradient-to-br from-white/90 to-white/70 
                      backdrop-blur-xl border border-white/20 rounded-lg p-4
                      shadow-lg shadow-black/5 hover:shadow-xl 
                      transition-all duration-300 w-48">

                    {/* Decorative line */}
                    <div className="absolute top-0 left-4 right-4 h-[1px] 
                        bg-gradient-to-r from-transparent via-[#E62B2B]/30 
                        to-transparent" />

                    {/* Business name */}
                    <div className="text-[#0D0D0D] text-xs font-light tracking-[0.2em] 
                        uppercase mb-3 text-center">
                        MaiSushi
                    </div>

                    {/* Status indicator */}
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                            }`} />
                        <span className="text-[10px] font-medium uppercase tracking-wider">
                            {isOpen ? 'Open Now' : 'Closed'}
                        </span>
                    </div>

                    {/* Hours */}
                    <div className="text-[9px] text-[#0D0D0D]/60 text-center 
                        font-light tracking-wide">
                        {isOpen ? 'Closes 8:00 PM' : 'Opens 11:00 AM'}
                    </div>

                    {/* Location link */}
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

                {/* Decorative elements */}
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

    // Entrance animation on mount
    useEffect(() => {
        setIsVisible(true)
    }, [])

    return (
        <>
            {/* Main social links container */}
            <div className={`
        fixed left-3 sm:left-6 top-1/2 -translate-y-1/2 z-50 
        flex flex-col gap-2
        transition-all duration-1000 transform
        ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}
      `}>
                {/* Label */}
                <div className="text-[8px] text-[#0D0D0D]/30 font-light tracking-[0.3em] 
                      uppercase mb-2 text-center hidden sm:block">
                    Connect
                </div>

                {/* Social links with enhanced animations */}
                <div className="relative">
                    {/* Connecting line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] 
                        bg-gradient-to-b from-transparent via-[#E62B2B]/20 
                        to-transparent -translate-x-1/2" />

                    {/* Social icons */}
                    {SOCIAL_PLATFORMS.map((platform, index) => (
                        <div key={platform.id} className="relative. mt-1">
                            <SocialLink
                                {...platform}
                                index={index}
                                total={SOCIAL_PLATFORMS.length}
                            />

                            {/* Connector dot */}
                            {index < SOCIAL_PLATFORMS.length - 1 && (
                                <div className="absolute left-1/2 -bottom-1 w-1 h-1 
                              bg-[#E62B2B]/30 rounded-full -translate-x-1/2" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Scroll indicator */}
                <div className="mt-4 text-[8px] text-[#0D0D0D]/20 font-light 
                      tracking-[0.2em] uppercase rotate-90 hidden sm:block">
                    <span className="animate-pulse">↗</span>
                </div>
            </div>

            {/* Business info panel (desktop only) */}
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
        
        /* Custom animation delays */
        .delay-150 {
          animation-delay: 150ms;
        }
        
        /* Mobile optimizations */
        @media (max-width: 640px) {
          .backdrop-blur-xl {
            backdrop-filter: blur(16px);
          }
        }
      `}</style>
        </>
    )
}