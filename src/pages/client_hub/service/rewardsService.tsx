import { supabase, supabaseAdmin } from "../../../lib/supabase";

export interface Reward {
    id: string;
    name: string;
    description: string;
    points_required: number;
    type: 'discount' | 'free_item' | 'birthday' | 'special';
    discount_percentage?: number;
    free_item_name?: string;
    is_active: boolean;
    valid_until: string;
    created_at: string;
}

export interface UserClaimedReward {
    id: string;
    user_id: string;
    reward_id: string;
    claimed_at: string;
    used_at?: string;
    is_used: boolean;
    reward?: Reward;
}

// Interface for the partial reward data when selecting specific fields
interface RewardPoints {
    points_required: number;
    name?: string; // Make optional since we're not always selecting it
}

// Interface for the full reward data with joined tables
interface UserClaimedRewardWithReward extends UserClaimedReward {
    reward: Reward;
}

export class RewardsService {
    static async getAvailableRewards(userId: string): Promise<(Reward & { claimed: boolean })[]> {
        try {
            // Get all active rewards
            const { data: rewards, error: rewardsError } = await supabase
                .from('rewards')
                .select('*')
                .eq('is_active', true)
                .gte('valid_until', new Date().toISOString())
                .order('points_required', { ascending: true });

            if (rewardsError) throw rewardsError;

            // Get user's claimed rewards
            const { data: claimedRewards, error: claimedError } = await supabase
                .from('user_claimed_rewards')
                .select('reward_id')
                .eq('user_id', userId)
                .eq('is_used', false);

            if (claimedError) throw claimedError;

            const claimedRewardIds = new Set(claimedRewards?.map((cr: { reward_id: string }) => cr.reward_id) || []);

            // Combine rewards with claimed status
            return (rewards as Reward[] | undefined)?.map((reward) => ({
                ...reward,
                claimed: claimedRewardIds.has(reward.id)
            })) || [];

        } catch (error) {
            console.error('💥 Error fetching rewards:', error);
            return [];
        }
    }

    static async claimReward(userId: string, rewardId: string): Promise<{ success: boolean; error?: string }> {
        try {
            // 1. Check if user has already claimed this reward
            const { data: existingClaim, error: checkError } = await supabase
                .from('user_claimed_rewards')
                .select('id')
                .eq('user_id', userId)
                .eq('reward_id', rewardId)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existingClaim) {
                return { success: false, error: 'Reward already claimed' };
            }

            // 2. Get reward details to check points requirement AND name
            const { data: reward, error: rewardError } = await supabase
                .from('rewards')
                .select('points_required, name')
                .eq('id', rewardId)
                .single();

            if (rewardError) throw rewardError;

            const rewardData = reward as RewardPoints;

            // 3. Check if user has enough points (for non-free rewards)
            if (rewardData.points_required > 0) {
                const { data: userPoints, error: pointsError } = await supabase
                    .from('user_points')
                    .select('points')
                    .eq('user_id', userId)
                    .single();

                if (pointsError) throw pointsError;

                if ((userPoints?.points || 0) < rewardData.points_required) {
                    return { success: false, error: 'Insufficient points' };
                }

                // 4. Deduct points if required
                const newBalance = (userPoints.points || 0) - rewardData.points_required;
                const { error: updateError } = await supabaseAdmin
                    .from('user_points')
                    .update({ points: newBalance, updated_at: new Date().toISOString() })
                    .eq('user_id', userId);

                if (updateError) throw updateError;

                // 5. Record points deduction
                const { error: pointsHistoryError } = await supabaseAdmin
                    .from('points_history')
                    .insert({
                        user_id: userId,
                        points: -rewardData.points_required,
                        description: `Points redeemed for reward: ${rewardData.name || 'Unknown Reward'}`,
                        type: 'redeemed',
                        transaction_type: 'redeem',
                        created_at: new Date().toISOString()
                    });

                if (pointsHistoryError) throw pointsHistoryError;
            }

            // 6. Claim the reward
            const { error: claimError } = await supabaseAdmin
                .from('user_claimed_rewards')
                .insert({
                    user_id: userId,
                    reward_id: rewardId,
                    claimed_at: new Date().toISOString()
                });

            if (claimError) throw claimError;

            console.log('✅ Reward claimed successfully:', { userId, rewardId });
            return { success: true };

        } catch (error: any) {
            console.error('💥 Error claiming reward:', error);
            return { success: false, error: error.message };
        }
    }

    static async getUserClaimedRewards(userId: string): Promise<UserClaimedReward[]> {
        try {
            const { data, error } = await supabase
                .from('user_claimed_rewards')
                .select(`
                    *,
                    reward:rewards(*)
                `)
                .eq('user_id', userId)
                .order('claimed_at', { ascending: false });

            if (error) throw error;

            // Type assertion for the joined data
            return (data as UserClaimedRewardWithReward[] | undefined)?.map(item => ({
                ...item,
                reward: item.reward
            })) || [];

        } catch (error) {
            console.error('💥 Error fetching claimed rewards:', error);
            return [];
        }
    }

    static async getRewardUsageStats(userId: string) {
        try {
            const { data, error } = await supabase
                .from('user_claimed_rewards')
                .select(`
                    is_used,
                    reward:rewards(name, points_required)
                `)
                .eq('user_id', userId);

            if (error) throw error;

            // Type for the joined reward data in stats
            interface RewardStats {
                is_used: boolean;
                reward: {
                    name: string;
                    points_required: number;
                }[];
            }

            const statsData = data as RewardStats[] | undefined;

            const stats = {
                totalClaimed: statsData?.length || 0,
                used: statsData?.filter(item => item.is_used)?.length || 0,
                available: statsData?.filter(item => !item.is_used)?.length || 0,
                totalPointsSpent: statsData?.reduce((sum: number, item) => {
                    const points = item.reward?.[0]?.points_required || 0;
                    return sum + points;
                }, 0) || 0
            };

            return stats;

        } catch (error) {
            console.error('💥 Error fetching reward stats:', error);
            return null;
        }
    }
}