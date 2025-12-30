import { useState, useEffect } from 'react';
import { useClientAuth } from '../hooks/useClientAuth';
import { PointsService } from '../service/PointsService';
import { RewardsService, type Reward } from '../service/RewardsService';

interface RewardsTabProps {
    onRewardClaimed?: () => void;
    isMobile?: boolean;
}

export const RewardsTab = ({ onRewardClaimed, isMobile }: RewardsTabProps) => {
    const { clientProfile } = useClientAuth();
    const [rewards, setRewards] = useState<Reward[]>([]); // Remove the claimed property
    const [claimedRewards, setClaimedRewards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentBalance, setCurrentBalance] = useState(0);
    const [claimingId, setClaimingId] = useState<string | null>(null);
    const [showRedemptionCodes, setShowRedemptionCodes] = useState(false);

    const [dailyClaimStatus, setDailyClaimStatus] = useState({
        used: 0,
        remaining: 3,
        limit: 3,
        canClaim: true
    });

    useEffect(() => {
        loadRewardsAndBalance();
    }, [clientProfile?.id]);

    const loadRewardsAndBalance = async () => {
        if (!clientProfile?.id) return;

        try {
            setLoading(true);
            const [rewardsData, balance, claimedData, claimStatus] = await Promise.all([
                RewardsService.getAvailableRewards(clientProfile.id),
                PointsService.getCurrentBalance(clientProfile.id),
                RewardsService.getUserClaimedRewards(clientProfile.id),
                RewardsService.getDailyClaimStatus(clientProfile.id)
            ]);

            // Don't merge claimed status into rewards - keep them separate
            setRewards(rewardsData);
            setCurrentBalance(balance);
            setClaimedRewards(claimedData);
            setDailyClaimStatus(claimStatus);
        } catch (error) {
            console.error('Error loading rewards:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClaimReward = async (rewardId: string, pointsRequired: number) => {
        if (!clientProfile?.id) return;

        // Check if user has enough points
        if (pointsRequired > 0 && currentBalance < pointsRequired) {
            alert('Insufficient points to claim this reward');
            return;
        }

        // Check daily claim limit
        if (dailyClaimStatus.used >= dailyClaimStatus.limit) {
            alert(`Daily claim limit reached! You can only claim ${dailyClaimStatus.limit} rewards per day. Please try again tomorrow.`);
            return;
        }

        // Check if user has remaining claims for today
        if (dailyClaimStatus.remaining <= 0) {
            alert(`You've reached your daily claim limit of ${dailyClaimStatus.limit} rewards. Please try again tomorrow.`);
            return;
        }

        setClaimingId(rewardId);
        try {
            const result = await RewardsService.claimReward(clientProfile.id, rewardId);

            if (result.success) {
                // Refresh data
                await loadRewardsAndBalance();
                onRewardClaimed?.();

                // Show redemption code if available
                if (result.redemptionCode) {
                    alert(`Reward claimed successfully!\n\nYour redemption code: ${result.redemptionCode}\n\nShow this code to staff when redeeming in-store.`);
                    setShowRedemptionCodes(true);
                } else {
                    alert('Reward claimed successfully!');
                }
            } else {
                alert(result.error || 'Failed to claim reward');
            }
        } catch (error) {
            console.error('Error claiming reward:', error);
            alert('Failed to claim reward');
        } finally {
            setClaimingId(null);
        }
    };

    const getRewardDisplayInfo = (reward: Reward) => {
        switch (reward.type) {
            case 'discount':
                return {
                    icon: '🤑',
                    subtitle: `${reward.discount_percentage}% off your order`
                };
            case 'free_item':
                return {
                    icon: '🍽️',
                    subtitle: `Free ${reward.free_item_name}`
                };
            case 'birthday':
                return {
                    icon: '🎉',
                    subtitle: 'Birthday special'
                };
            case 'special':
                return {
                    icon: '⭐',
                    subtitle: 'Special offer'
                };
            default:
                return {
                    icon: '🎁',
                    subtitle: reward.description
                };
        }
    };

    // Check if user can claim a specific reward
    const canClaimReward = (pointsRequired: number) => {
        const hasPoints = pointsRequired === 0 || currentBalance >= pointsRequired;
        const hasDailyClaims = dailyClaimStatus.remaining > 0;
        return hasPoints && hasDailyClaims;
    };

    // Count how many times a reward has been claimed by the user (for display only)
    const getRewardClaimCount = (rewardId: string): number => {
        return claimedRewards.filter(claimed =>
            claimed.reward_id === rewardId || claimed.reward?.id === rewardId
        ).length;
    };

    // Responsive grid classes
    const getRewardsGridClasses = () => {
        if (isMobile) {
            return "grid grid-cols-1 gap-4";
        }
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";
    };

    const getClaimedRewardsGridClasses = () => {
        if (isMobile) {
            return "grid grid-cols-1 gap-4";
        }
        return "grid grid-cols-1 md:grid-cols-2 gap-4";
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="text-center py-8">
                    <div className="w-12 h-12 border-4 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white/60 font-light">Loading rewards...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Points Balance */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-400/20 rounded-xl p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-white font-light text-base md:text-lg">Your Points Balance</h3>
                        <p className="text-white/60 text-xs md:text-sm">Available for redeeming rewards</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xl md:text-2xl font-light text-emerald-400">{currentBalance} pts</p>
                        <p className="text-white/40 text-xs md:text-sm">Current balance</p>
                    </div>
                </div>
            </div>

            {/* Daily Claim Limit */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-400/20 rounded-xl p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-white font-light text-base md:text-lg">Daily Claim Limit</h3>
                        <p className="text-white/60 text-xs md:text-sm">Rewards claimed today</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xl md:text-2xl font-light text-blue-400">
                            {dailyClaimStatus.used} / {dailyClaimStatus.limit}
                        </p>
                        <p className="text-white/40 text-xs md:text-sm">
                            {dailyClaimStatus.remaining > 0
                                ? `${dailyClaimStatus.remaining} remaining today`
                                : 'Limit reached for today'
                            }
                        </p>
                    </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 w-full bg-white/10 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all duration-300 ${dailyClaimStatus.remaining > 0 ? 'bg-blue-400' : 'bg-red-400'
                            }`}
                        style={{ width: `${(dailyClaimStatus.used / dailyClaimStatus.limit) * 100}%` }}
                    ></div>
                </div>
                {dailyClaimStatus.remaining <= 0 && (
                    <p className="text-red-400 text-xs mt-2 text-center">
                        Daily limit reached. Resets at midnight.
                    </p>
                )}
            </div>

            {/* My Rewards Section */}
            {claimedRewards.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg md:text-xl font-light text-white">My Rewards</h3>
                        <button
                            onClick={() => setShowRedemptionCodes(!showRedemptionCodes)}
                            className="px-3 py-1 bg-white/10 text-white/80 rounded-lg text-xs md:text-sm hover:bg-white/20 transition-colors"
                        >
                            {showRedemptionCodes ? 'Hide Codes' : 'Show Codes'}
                        </button>
                    </div>

                    <div className={getClaimedRewardsGridClasses()}>
                        {claimedRewards.filter(reward => !reward.is_used).map((claimedReward) => (
                            <div key={claimedReward.id} className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-400/20 rounded-lg p-3 md:p-4">
                                <div className="flex items-start gap-2 md:gap-3 mb-3">
                                    <div className="text-xl md:text-2xl">🎁</div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-white font-light text-sm md:text-base line-clamp-2">{claimedReward.reward?.name}</h4>
                                        <p className="text-white/60 text-xs md:text-sm font-light mt-1">
                                            Claimed on {new Date(claimedReward.claimed_at).toLocaleDateString()}
                                        </p>
                                        {showRedemptionCodes && claimedReward.redemption_code && (
                                            <div className="mt-2 p-2 bg-black/20 rounded border border-white/10">
                                                <p className="text-white/80 text-xs md:text-sm font-mono text-center break-all">
                                                    {claimedReward.redemption_code}
                                                </p>
                                                <p className="text-white/40 text-xs text-center mt-1">
                                                    Show this code to staff
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="px-2 py-1 bg-yellow-400/20 text-yellow-400 rounded text-xs md:text-sm">
                                        Ready to Use
                                    </span>
                                    {!showRedemptionCodes && claimedReward.redemption_code && (
                                        <span className="text-white/60 text-xs md:text-sm truncate ml-2">
                                            Code: •••{claimedReward.redemption_code.slice(-6)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Available Rewards */}
            <div>
                <h3 className="text-lg md:text-xl font-light text-white mb-4">Available Rewards</h3>
                {rewards.length > 0 ? (
                    <div className={getRewardsGridClasses()}>
                        {rewards.map((reward) => {
                            const { icon, subtitle } = getRewardDisplayInfo(reward);
                            const canClaim = canClaimReward(reward.points_required);
                            const hasPoints = reward.points_required === 0 || currentBalance >= reward.points_required;
                            const hasDailyClaims = dailyClaimStatus.remaining > 0;
                            const claimCount = getRewardClaimCount(reward.id);

                            return (
                                <div key={reward.id} className="bg-gradient-to-r from-emerald-400/10 to-cyan-400/10 border border-emerald-400/20 rounded-lg p-3 md:p-4">
                                    <div className="flex items-start gap-2 md:gap-3 mb-3">
                                        <div className="text-xl md:text-2xl flex-shrink-0">{icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-light text-sm md:text-base line-clamp-2">{reward.name}</h4>
                                            <p className="text-white/60 text-xs md:text-sm font-light mt-1 line-clamp-2">{subtitle}</p>
                                            {claimCount > 0 && (
                                                <p className="text-yellow-400 text-xs mt-1">
                                                    Claimed {claimCount} time{claimCount !== 1 ? 's' : ''} before
                                                </p>
                                            )}
                                            {reward.valid_until && (
                                                <p className="text-white/40 text-xs mt-1">
                                                    Valid until {new Date(reward.valid_until).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center mb-3">
                                        <span className={`px-2 py-1 rounded text-xs md:text-sm font-light ${reward.points_required === 0
                                                ? 'bg-green-400/20 text-green-400'
                                                : 'bg-emerald-400/20 text-emerald-400'
                                            }`}>
                                            {reward.points_required === 0 ? 'FREE' : `${reward.points_required} pts`}
                                        </span>
                                        {claimCount > 0 && (
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-1">
                                                    <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                                                    <span className="text-yellow-400 text-xs md:text-sm">Previously Claimed</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => handleClaimReward(reward.id, reward.points_required)}
                                        disabled={!canClaim || claimingId === reward.id}
                                        className={`w-full py-2 rounded-lg font-light transition-all duration-300 text-sm md:text-base ${!canClaim
                                                ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                                                : 'bg-emerald-500 text-white hover:bg-emerald-600'
                                            }`}
                                    >
                                        {claimingId === reward.id ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                Claiming...
                                            </span>
                                        ) : !hasPoints ? (
                                            'Need More Points'
                                        ) : !hasDailyClaims ? (
                                            'Daily Limit Reached'
                                        ) : claimCount > 0 ? (
                                            'Claim Again'
                                        ) : (
                                            'Claim Reward'
                                        )}
                                    </button>

                                    {/* Additional info for disabled state */}
                                    {!canClaim && (
                                        <div className="mt-2 text-xs text-white/60">
                                            {!hasPoints && (
                                                <p>You need {reward.points_required - currentBalance} more points</p>
                                            )}
                                            {!hasDailyClaims && hasPoints && (
                                                <p>Daily claim limit reached</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-emerald-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl text-emerald-400">🎁</span>
                        </div>
                        <p className="text-white/60 font-light">No rewards available at the moment</p>
                        <p className="text-white/40 text-sm mt-1">Check back later for new rewards!</p>
                    </div>
                )}
            </div>
        </div>
    );
};