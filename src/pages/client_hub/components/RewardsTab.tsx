// components/RewardsTab.tsx
import { useState, useEffect } from 'react';
import { useClientAuth } from '../hooks/useClientAuth';
import { RewardsService, type Reward } from '../service/rewardsService';
import { PointsService } from '../service/PointsService';

interface RewardsTabProps {
    onRewardClaimed?: () => void;
}

export const RewardsTab = ({ onRewardClaimed }: RewardsTabProps) => {
    const { clientProfile } = useClientAuth();
    const [rewards, setRewards] = useState<(Reward & { claimed: boolean })[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentBalance, setCurrentBalance] = useState(0);
    const [claimingId, setClaimingId] = useState<string | null>(null);

    useEffect(() => {
        loadRewardsAndBalance();
    }, [clientProfile?.id]);

    const loadRewardsAndBalance = async () => {
        if (!clientProfile?.id) return;

        try {
            setLoading(true);
            const [rewardsData, balance] = await Promise.all([
                RewardsService.getAvailableRewards(clientProfile.id),
                PointsService.getCurrentBalance(clientProfile.id)
            ]);

            setRewards(rewardsData);
            setCurrentBalance(balance);
        } catch (error) {
            console.error('Error loading rewards:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClaimReward = async (rewardId: string, pointsRequired: number) => {
        if (!clientProfile?.id) return;

        if (pointsRequired > 0 && currentBalance < pointsRequired) {
            alert('Insufficient points to claim this reward');
            return;
        }

        setClaimingId(rewardId);
        try {
            const result = await RewardsService.claimReward(clientProfile.id, rewardId);

            if (result.success) {
                // Refresh data
                await loadRewardsAndBalance();
                onRewardClaimed?.();
                alert('Reward claimed successfully!');
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
            <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-400/20 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-white font-light text-lg">Your Points Balance</h3>
                        <p className="text-white/60 text-sm">Available for redeeming rewards</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-light text-emerald-400">{currentBalance} pts</p>
                        <p className="text-white/40 text-sm">Current balance</p>
                    </div>
                </div>
            </div>

            {/* Available Rewards */}
            <div>
                <h3 className="text-xl font-light text-white mb-4">Available Rewards</h3>
                {rewards.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rewards.map((reward) => {
                            const { icon, subtitle } = getRewardDisplayInfo(reward);
                            const canClaim = !reward.claimed && (reward.points_required === 0 || currentBalance >= reward.points_required);

                            return (
                                <div key={reward.id} className={`p-4 rounded-lg border ${reward.claimed
                                        ? 'bg-white/5 border-white/10'
                                        : 'bg-gradient-to-r from-emerald-400/10 to-cyan-400/10 border-emerald-400/20'
                                    }`}>
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="text-2xl">{icon}</div>
                                        <div className="flex-1">
                                            <h4 className="text-white font-light">{reward.name}</h4>
                                            <p className="text-white/60 text-sm font-light mt-1">{subtitle}</p>
                                            {reward.valid_until && (
                                                <p className="text-white/40 text-xs mt-1">
                                                    Valid until {new Date(reward.valid_until).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center mb-3">
                                        <span className={`px-2 py-1 rounded text-sm font-light ${reward.points_required === 0
                                                ? 'bg-green-400/20 text-green-400'
                                                : reward.claimed
                                                    ? 'bg-white/10 text-white/60'
                                                    : 'bg-emerald-400/20 text-emerald-400'
                                            }`}>
                                            {reward.points_required === 0 ? 'FREE' : `${reward.points_required} pts`}
                                        </span>
                                        {reward.claimed && (
                                            <span className="text-emerald-400 text-sm">✓ Claimed</span>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => handleClaimReward(reward.id, reward.points_required)}
                                        disabled={reward.claimed || !canClaim || claimingId === reward.id}
                                        className={`w-full py-2 rounded-lg font-light transition-all duration-300 ${reward.claimed
                                                ? 'bg-white/10 text-white/60 cursor-not-allowed'
                                                : !canClaim
                                                    ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                                                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                                            }`}
                                    >
                                        {claimingId === reward.id ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                Claiming...
                                            </span>
                                        ) : reward.claimed ? (
                                            'Claimed'
                                        ) : !canClaim ? (
                                            'Need More Points'
                                        ) : (
                                            'Claim Reward'
                                        )}
                                    </button>
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