import { useCallback, useEffect, useMemo, useState } from "react";
import {
    BadgeCheck,
    CalendarClock,
    CheckCircle2,
    Copy,
    Gift,
    LockKeyhole,
    ReceiptText,
    ShieldCheck,
    Sparkles,
    TicketPercent,
    WalletCards,
} from "lucide-react";

import { useClientAuth } from "../hooks/useClientAuth";
import { PointsService } from "../service/PointsService";
import type { Reward } from "../interfaces/IClientHub";
import { RewardsService } from "../service/rewardsService";

interface RewardsTabProps {
    onRewardClaimed?: () => void;
    isMobile?: boolean;
}

type DailyClaimStatus = {
    used: number;
    remaining: number;
    limit: number;
    canClaim: boolean;
};

type ClaimedRewardRow = {
    id: string;
    user_id: string;
    reward_id: string;
    claimed_at: string;
    is_used: boolean;
    used_at?: string | null;
    redemption_code?: string | null;
    reward?: Reward | null;
};

function formatDate(value?: string | null) {
    if (!value) return "No expiry listed";

    return new Intl.DateTimeFormat("en-CA", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(value));
}

function rewardInfo(reward: Reward) {
    const searchableText = `${reward.name || ""} ${reward.description || ""} ${reward.free_item_name || ""}`.toLowerCase();
    const isDeliveryReward = searchableText.includes("delivery");
    const isWelcomeReward = searchableText.includes("welcome") || searchableText.includes("bienvenue");
    const isBirthdayReward = reward.type === "birthday" || searchableText.includes("birthday");

    if (isDeliveryReward) {
        return {
            icon: TicketPercent,
            label: "Free delivery",
            detail: "Use this code to remove the delivery fee on an eligible online delivery order.",
            howItWorks: [
                "Valid for one eligible delivery order only.",
                "Staff validates the code before the delivery discount is applied.",
                "Not paid as cash and cannot be combined with another delivery offer.",
            ],
        };
    }

    if (isWelcomeReward) {
        return {
            icon: Sparkles,
            label: "Welcome reward",
            detail: "A one-time thank-you for joining MaiSushi rewards.",
            howItWorks: [
                "Claim once from your rewards account.",
                "Show the code to staff before paying in restaurant.",
                "Staff marks it used after applying the welcome offer.",
            ],
        };
    }

    if (reward.type === "discount") {
        const discount = Number(reward.discount_percentage || 0);

        return {
            icon: TicketPercent,
            label: discount > 0 ? `${discount}% off` : "Staff-applied offer",
            detail: discount > 0
                ? "Use this code for a percentage discount on an eligible order."
                : "Staff will validate the code and apply the offer shown in the reward description.",
            howItWorks: [
                "Show the code before payment.",
                "One code can be used once only.",
                "Cannot be exchanged for cash or stacked with another reward.",
            ],
        };
    }

    if (reward.type === "free_item") {
        return {
            icon: Gift,
            label: reward.free_item_name ? `Free ${reward.free_item_name}` : "Free menu item",
            detail: "Redeem this in restaurant with an active reward code.",
            howItWorks: [
                "Show the code before ordering or before payment.",
                "Valid for the listed item only unless staff approves a substitution.",
                "One code can be used once only.",
            ],
        };
    }

    if (isBirthdayReward) {
        return {
            icon: Sparkles,
            label: "Birthday reward",
            detail: "A birthday offer for MaiSushi rewards members.",
            howItWorks: [
                "Staff may verify the customer profile.",
                "Valid during the active birthday reward period.",
                "One code can be used once only.",
            ],
        };
    }

    return {
        icon: BadgeCheck,
        label: "MaiSushi reward",
        detail: "Available while the offer remains active.",
        howItWorks: [
            "Show the code to staff before payment.",
            "Staff validates the reward and marks it used.",
            "Used codes cannot be redeemed again.",
        ],
    };
}

export const RewardsTab = ({ onRewardClaimed, isMobile }: RewardsTabProps) => {
    const { clientProfile } = useClientAuth();

    const [rewards, setRewards] = useState<Reward[]>([]);
    const [claimedRewards, setClaimedRewards] = useState<ClaimedRewardRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentBalance, setCurrentBalance] = useState(0);
    const [claimingId, setClaimingId] = useState<string | null>(null);
    const [showRedemptionCodes, setShowRedemptionCodes] = useState(false);
    const [copiedCode, setCopiedCode] = useState("");
    const [dailyClaimStatus, setDailyClaimStatus] = useState<DailyClaimStatus>({
        used: 0,
        remaining: 1,
        limit: 1,
        canClaim: true,
    });

    const loadRewardsAndBalance = useCallback(async () => {
        if (!clientProfile?.id) return;

        try {
            setLoading(true);

            const [rewardsData, balance, claimedData, claimStatus] = await Promise.all([
                RewardsService.getAvailableRewards(clientProfile.id),
                PointsService.getCurrentBalance(clientProfile.id),
                RewardsService.getUserClaimedRewards(clientProfile.id),
                RewardsService.getDailyClaimStatus(clientProfile.id),
            ]);

            setRewards(Array.isArray(rewardsData) ? rewardsData : []);
            setCurrentBalance(Number(balance ?? 0) || 0);
            setClaimedRewards((Array.isArray(claimedData) ? claimedData : []) as ClaimedRewardRow[]);
            setDailyClaimStatus({
                used: Number(claimStatus?.used ?? 0) || 0,
                remaining: Number(claimStatus?.remaining ?? 0) || 0,
                limit: Number(claimStatus?.limit ?? 1) || 1,
                canClaim: !!claimStatus?.canClaim,
            });
        } catch (error) {
            console.error("Error loading rewards:", error);
        } finally {
            setLoading(false);
        }
    }, [clientProfile?.id]);

    useEffect(() => {
        loadRewardsAndBalance();
    }, [loadRewardsAndBalance]);

    const activeClaims = useMemo(
        () => claimedRewards.filter((claim) => !claim.is_used),
        [claimedRewards],
    );

    const usedClaims = useMemo(
        () => claimedRewards.filter((claim) => claim.is_used).slice(0, 4),
        [claimedRewards],
    );

    const rewardClaimCount = useCallback(
        (rewardId: string) =>
            claimedRewards.filter((claim) => claim.reward_id === rewardId || claim.reward?.id === rewardId).length,
        [claimedRewards],
    );

    const claimProgress = dailyClaimStatus.limit > 0
        ? Math.min(100, (dailyClaimStatus.used / dailyClaimStatus.limit) * 100)
        : 0;

    const handleClaimReward = async (rewardId: string, pointsRequired: number) => {
        if (!clientProfile?.id) return;

        if (pointsRequired > 0 && currentBalance < pointsRequired) {
            alert("You do not have enough points for this reward yet.");
            return;
        }

        if (dailyClaimStatus.used >= dailyClaimStatus.limit || dailyClaimStatus.remaining <= 0 || !dailyClaimStatus.canClaim) {
            alert(`You can claim ${dailyClaimStatus.limit} reward per day. Please try another reward tomorrow.`);
            return;
        }

        setClaimingId(rewardId);

        try {
            const result = await RewardsService.claimReward(clientProfile.id, rewardId);

            if (result?.success) {
                await loadRewardsAndBalance();
                onRewardClaimed?.();
                window.dispatchEvent(new CustomEvent("points:updated"));

                if (result.redemptionCode) {
                    setShowRedemptionCodes(true);
                    alert(`Reward claimed. Show this code to staff: ${result.redemptionCode}`);
                } else {
                    alert("Reward claimed.");
                }
            } else {
                alert(result?.error || "Failed to claim reward.");
            }
        } catch (error) {
            console.error("Error claiming reward:", error);
            alert("Failed to claim reward.");
        } finally {
            setClaimingId(null);
        }
    };

    const handleCopyCode = async (code: string) => {
        await navigator.clipboard.writeText(code);
        setCopiedCode(code);
        window.setTimeout(() => setCopiedCode(""), 1600);
    };

    if (loading) {
        return (
            <div className="flex min-h-[260px] items-center justify-center border border-white/10 bg-black/30">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#F45F51]" />
                    <p className="text-sm font-medium text-white/60">Loading rewards...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 md:space-y-5">
            <section className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
                <div className="border border-white/10 bg-[#0B0B0B] p-4 md:p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#F45F51]">
                                Rewards wallet
                            </p>
                            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                                {currentBalance} pts
                            </h3>
                            <p className="mt-2 max-w-xl text-sm leading-6 text-white/58">
                                Claim carefully selected rewards and show the code to staff. Each claimed code is single use.
                            </p>
                        </div>
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[#F45F51]/30 bg-[#F45F51]/12 text-[#F45F51]">
                            <WalletCards className="h-6 w-6" />
                        </div>
                    </div>
                </div>

                <div className="border border-white/10 bg-[#0B0B0B] p-4 md:p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                                Today
                            </p>
                            <p className="mt-2 text-xl font-semibold text-white">
                                {dailyClaimStatus.used} / {dailyClaimStatus.limit} claimed
                            </p>
                        </div>
                        <ShieldCheck className="h-6 w-6 text-[#F45F51]" />
                    </div>
                    <div className="mt-4 h-2 bg-white/10">
                        <div className="h-full bg-[#F45F51]" style={{ width: `${claimProgress}%` }} />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-white/50">
                        Limit set to one claim per day while the program is new.
                    </p>
                </div>
            </section>

            {activeClaims.length > 0 && (
                <section className="border border-white/10 bg-[#080808] p-4 md:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Ready to redeem</h3>
                            <p className="mt-1 text-sm text-white/50">
                                Show one of these codes when paying in restaurant.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowRedemptionCodes((value) => !value)}
                            className="inline-flex items-center justify-center gap-2 border border-white/12 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-white transition hover:border-[#F45F51]/50 hover:text-[#F45F51]"
                            type="button"
                        >
                            <LockKeyhole className="h-4 w-4" />
                            {showRedemptionCodes ? "Hide codes" : "Show codes"}
                        </button>
                    </div>

                    <div className={`mt-4 grid gap-3 ${isMobile ? "grid-cols-1" : "md:grid-cols-2"}`}>
                        {activeClaims.map((claim) => {
                            const code = claim.redemption_code || "";
                            const reward = claim.reward;
                            const RewardIcon = reward ? rewardInfo(reward).icon : Gift;

                            return (
                                <article key={claim.id} className="border border-white/10 bg-white/[0.035] p-4">
                                    <div className="flex gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#F45F51]/14 text-[#F45F51]">
                                            <RewardIcon className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="font-semibold text-white">{reward?.name || "Reward"}</h4>
                                                <span className="border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
                                                    Active
                                                </span>
                                            </div>
                                            <p className="mt-1 text-sm text-white/52">
                                                Claimed {formatDate(claim.claimed_at)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 border border-white/10 bg-black/35 p-3">
                                        {showRedemptionCodes && code ? (
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                <p className="break-all font-mono text-sm font-semibold tracking-wide text-white">
                                                    {code}
                                                </p>
                                                <button
                                                    onClick={() => handleCopyCode(code)}
                                                    className="inline-flex items-center justify-center gap-2 border border-white/12 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-[#F45F51]/60 hover:text-[#F45F51]"
                                                    type="button"
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                    {copiedCode === code ? "Copied" : "Copy"}
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="font-mono text-sm font-semibold tracking-wide text-white/70">
                                                Code: ****{code.slice(-6)}
                                            </p>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            )}

            <section>
                <div className="mb-3 flex items-end justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-semibold text-white">Available rewards</h3>
                        <p className="mt-1 text-sm text-white/48">
                            Offers are designed for loyalty without heavy discount stacking.
                        </p>
                    </div>
                </div>

                {rewards.length > 0 ? (
                    <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "md:grid-cols-2 xl:grid-cols-3"}`}>
                        {rewards.map((reward) => {
                            const pointsRequired = Number(reward.points_required ?? 0) || 0;
                            const info = rewardInfo(reward);
                            const RewardIcon = info.icon;
                            const canAfford = pointsRequired === 0 || currentBalance >= pointsRequired;
                            const hasDailyClaim = dailyClaimStatus.remaining > 0 && dailyClaimStatus.canClaim;
                            const canClaim = canAfford && hasDailyClaim;
                            const neededPoints = Math.max(0, pointsRequired - currentBalance);
                            const claimCount = rewardClaimCount(reward.id);

                            return (
                                <article key={reward.id} className="flex min-h-[300px] flex-col border border-white/10 bg-[#0B0B0B] p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#F45F51]/14 text-[#F45F51]">
                                            <RewardIcon className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-base font-semibold leading-6 text-white">{reward.name}</h4>
                                            <p className="mt-1 text-sm font-medium text-[#FFB8AE]">{info.label}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 min-h-[76px] space-y-2">
                                        <p className="text-sm leading-6 text-white/68">
                                            {info.detail}
                                        </p>
                                        {reward.description && reward.description !== info.detail && (
                                            <p className="text-xs leading-5 text-white/42">
                                                {reward.description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="mt-4 grid gap-2 text-sm">
                                        <div className="flex items-center justify-between border border-white/8 bg-white/[0.035] px-3 py-2">
                                            <span className="inline-flex items-center gap-2 text-white/48">
                                                <ReceiptText className="h-4 w-4" />
                                                Cost
                                            </span>
                                            <span className="font-semibold text-white">
                                                {pointsRequired === 0 ? "One-time" : `${pointsRequired} pts`}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between border border-white/8 bg-white/[0.035] px-3 py-2">
                                            <span className="inline-flex items-center gap-2 text-white/48">
                                                <CalendarClock className="h-4 w-4" />
                                                Valid until
                                            </span>
                                            <span className="font-semibold text-white">{formatDate(reward.valid_until)}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-xs leading-5 text-white/48">
                                        <p className="font-semibold uppercase tracking-[0.16em] text-white/58">How it works</p>
                                        {info.howItWorks.map((item) => (
                                            <p key={item} className="flex gap-2">
                                                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F45F51]" />
                                                {item}
                                            </p>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => handleClaimReward(reward.id, pointsRequired)}
                                        disabled={!canClaim || claimingId === reward.id}
                                        className={`mt-auto inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition ${
                                            canClaim
                                                ? "bg-[#F45F51] text-white shadow-[0_14px_30px_rgba(244,95,81,0.18)] hover:bg-[#ff6b5d]"
                                                : "border border-white/10 bg-white/[0.04] text-white/35"
                                        }`}
                                        type="button"
                                    >
                                        {claimingId === reward.id ? "Claiming..." : !canAfford ? `Need ${neededPoints} pts` : !hasDailyClaim ? "Claim tomorrow" : "Claim reward"}
                                    </button>

                                    {claimCount > 0 && (
                                        <p className="mt-3 text-center text-xs text-white/38">
                                            Claimed {claimCount} time{claimCount === 1 ? "" : "s"} before.
                                        </p>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="border border-white/10 bg-[#0B0B0B] p-8 text-center">
                        <Gift className="mx-auto h-10 w-10 text-[#F45F51]" />
                        <p className="mt-4 font-semibold text-white">No rewards available right now</p>
                        <p className="mt-2 text-sm text-white/48">New offers will appear here when they are active.</p>
                    </div>
                )}
            </section>

            {usedClaims.length > 0 && (
                <section className="border border-white/10 bg-[#080808] p-4 md:p-5">
                    <h3 className="text-lg font-semibold text-white">Recent redeemed rewards</h3>
                    <div className="mt-4 divide-y divide-white/8">
                        {usedClaims.map((claim) => (
                            <div key={claim.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="font-semibold text-white">{claim.reward?.name || "Reward"}</p>
                                    <p className="text-sm text-white/45">Code {claim.redemption_code || "recorded"}</p>
                                </div>
                                <span className="text-sm text-white/45">Used {formatDate(claim.used_at)}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};
