import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import {
    Camera,
    ChevronRight,
    Gift,
    LogOut,
    ReceiptText,
    ShieldCheck,
    ShoppingBag,
    Sparkles,
    Star,
    WalletCards,
} from "lucide-react";

import type { ClientProfile } from "../../../types/types";
import { auth } from "../../../firebase/firebase";
import { uploadAvatar } from "../../../utils/avatarUtils";

interface SpecialOffer {
    id: string;
    title: string;
    description: string;
    discount_percentage: number;
    valid_until: string;
    min_order_amount: number;
    code: string;
    image_url?: string;
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
    };
    loadingData: boolean;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    specialOffers: SpecialOffer[];
    formatDate: (dateString: string) => string;
    isMobile?: boolean;
}

function tierLabel(tier?: string) {
    if (!tier) return "Member";
    return `${tier.charAt(0).toUpperCase()}${tier.slice(1)} member`;
}

function progress(points: number) {
    return Math.min(100, Math.max(0, (points / 1000) * 100));
}

export const EnhancedHeader = ({
    clientProfile,
    onProfileUpdate,
    formatCurrency,
    formatDate,
    stats,
    specialOffers,
    setActiveTab,
}: EnhancedHeaderProps) => {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const points = Number(clientProfile?.total_points || clientProfile?.points || 0);
    const firstName = clientProfile?.full_name?.split(" ")[0] || "there";
    const nextReward = Math.max(0, 500 - (points % 500));

    const handleLogout = async () => {
        await signOut(auth);
        navigate("/");
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file || !clientProfile) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select an image file.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("Image size should be less than 5MB.");
            return;
        }

        try {
            setIsUploading(true);
            const avatarUrl = await uploadAvatar(clientProfile.id, file);
            onProfileUpdate({
                ...clientProfile,
                avatar_url: avatarUrl ?? undefined,
            });
        } catch (error) {
            console.error("Avatar upload failed", error);
            alert("Failed to upload avatar. Please try again.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <section className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(244,93,79,0.18),transparent_34%),linear-gradient(135deg,#111,#060606)] p-5 shadow-2xl shadow-black/35 sm:p-7">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 gap-4">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="relative h-20 w-20 shrink-0 overflow-hidden border border-white/12 bg-white/[0.06] text-white"
                            aria-label="Update avatar"
                        >
                            {clientProfile?.avatar_url ? (
                                <img
                                    src={clientProfile.avatar_url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <span className="flex h-full w-full items-center justify-center text-3xl font-semibold">
                                    {clientProfile?.full_name?.charAt(0).toUpperCase() || "M"}
                                </span>
                            )}
                            <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center bg-[#F45D4F]">
                                {isUploading ? (
                                    <span className="h-4 w-4 animate-spin rounded-full border border-white/40 border-t-white" />
                                ) : (
                                    <Camera size={16} />
                                )}
                            </span>
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        <div className="min-w-0">
                            <div className="mb-3 inline-flex items-center gap-2 border border-[#F45D4F]/35 bg-[#F45D4F]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff8a7b]">
                                <ShieldCheck size={15} />
                                {tierLabel(clientProfile?.current_tier)}
                            </div>
                            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                                Bonjour, {firstName}
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58 sm:text-base">
                                Track your MaiSushi rewards, recent orders, and profile details from one account.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2 md:flex-col">
                        <button
                            type="button"
                            onClick={() => navigate("/order")}
                            className="inline-flex flex-1 items-center justify-center gap-2 bg-[#F45D4F] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#de4f43]"
                        >
                            <ShoppingBag size={18} />
                            Order
                        </button>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="inline-flex flex-1 items-center justify-center gap-2 border border-white/12 px-4 py-3 text-sm font-semibold text-white/66 transition hover:bg-white/8 hover:text-white"
                        >
                            <LogOut size={18} />
                            Logout
                        </button>
                    </div>
                </div>

                <div className="mt-7">
                    <div className="mb-3 flex items-center justify-between gap-4 text-sm">
                        <span className="font-semibold uppercase tracking-[0.16em] text-white/45">
                            Rewards progress
                        </span>
                        <span className="font-semibold text-white">{points}/1000 pts</span>
                    </div>
                    <div className="h-3 bg-white/10">
                        <div
                            className="h-full bg-[#F45D4F] transition-all duration-700"
                            style={{ width: `${progress(points)}%` }}
                        />
                    </div>
                    <p className="mt-3 text-sm text-white/50">
                        {nextReward === 0 ? "Reward ready to claim." : `${nextReward} points until the next reward milestone.`}
                    </p>
                </div>
            </div>

            <aside className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <Metric icon={Star} label="Points" value={`${points}`} />
                <Metric icon={WalletCards} label="Total spent" value={formatCurrency(stats.totalSpent)} />
                <Metric icon={ReceiptText} label="Monthly orders" value={`${stats.monthlyOrders}`} />
                <button
                    type="button"
                    onClick={() => setActiveTab("rewards")}
                    className="group border border-[#F45D4F]/45 bg-[#F45D4F]/10 p-4 text-left transition hover:bg-[#F45D4F]/16"
                >
                    <div className="flex items-center justify-between gap-3">
                        <div className="inline-flex h-10 w-10 items-center justify-center bg-[#F45D4F] text-white">
                            <Gift size={20} />
                        </div>
                        <ChevronRight className="text-white/40 transition group-hover:translate-x-1 group-hover:text-white" size={20} />
                    </div>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff8a7b]">
                        Rewards
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                        {specialOffers.length ? `${specialOffers.length} offer${specialOffers.length === 1 ? "" : "s"}` : "View available rewards"}
                    </p>
                    {specialOffers[0] && (
                        <p className="mt-2 text-sm text-white/50">
                            {specialOffers[0].title} · valid until {formatDate(specialOffers[0].valid_until)}
                        </p>
                    )}
                </button>
            </aside>
        </section>
    );
};

function Metric({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Sparkles;
    label: string;
    value: string;
}) {
    return (
        <div className="border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/42">
                        {label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                </div>
                <div className="inline-flex h-10 w-10 items-center justify-center bg-white/[0.06] text-[#F45D4F]">
                    <Icon size={20} />
                </div>
            </div>
        </div>
    );
}
