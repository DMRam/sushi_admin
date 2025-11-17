// RewardsService.ts — WITH DAILY CLAIM LIMIT
import { supabase, supabaseAdmin } from "../../../lib/supabase";

export interface BaseReward {
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
    updated_at: string;
}

export interface Reward extends BaseReward {
    claimed: boolean;
    claimed_at?: string;
    used_at?: string;
    is_used?: boolean;
    has_active_claim?: boolean;
}

export interface UserClaimedReward {
    id: string;
    user_id: string;
    reward_id: string;
    claimed_at: string;
    used_at?: string;
    is_used: boolean;
    redemption_code?: string;
    qr_code_data?: string | null;
    reward?: Reward;
}

export class RewardsService {

    /** Generate redemption code */
    private static generateRedemptionCode(userId: string, rewardId: string): string {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `RWD-${userId.slice(-4)}-${rewardId.slice(-4)}-${timestamp}-${random}`;
    }

    /**
     * Check if user has reached daily claim limit
     */
    private static async checkDailyClaimLimit(userId: string): Promise<{ canClaim: boolean; error?: string }> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const { data: todaysClaims, error } = await supabaseAdmin
                .from('user_claimed_rewards')
                .select('id, claimed_at')
                .eq('user_id', userId)
                .gte('claimed_at', today.toISOString())
                .lt('claimed_at', tomorrow.toISOString());

            if (error) throw error;

            const claimCount = todaysClaims?.length || 0;
            const MAX_DAILY_CLAIMS = 3;

            if (claimCount >= MAX_DAILY_CLAIMS) {
                return {
                    canClaim: false,
                    error: `You have reached the daily limit of ${MAX_DAILY_CLAIMS} reward claims. Please try again tomorrow.`
                };
            }

            return { canClaim: true };

        } catch (error) {
            console.error('💥 Error checking daily claim limit:', error);
            // If there's an error checking the limit, allow the claim to proceed
            return { canClaim: true };
        }
    }

    /**
     * Get available rewards
     */
    static async getAvailableRewards(userId: string): Promise<Reward[]> {
        try {
            // 1. Fetch all active rewards
            const { data: rewards, error: rewardsError } = await supabase
                .from("rewards")
                .select("*")
                .eq("is_active", true)
                .gte("valid_until", new Date().toISOString())
                .order("points_required", { ascending: true });

            if (rewardsError) throw rewardsError;

            // 2. Fetch all claims from this user
            const { data: claimedRewards, error: claimedError } = await supabaseAdmin
                .from("user_claimed_rewards")
                .select("reward_id, is_used, used_at, claimed_at")
                .eq("user_id", userId);

            if (claimedError) throw claimedError;

            const claimedMap = new Map<string, any>();
            claimedRewards?.forEach(c => claimedMap.set(c.reward_id, c));

            // 3. Process rewards
            const processedRewards = (rewards || []).map((reward) => {
                const userClaim = claimedMap.get(reward.id);
                const hasClaim = !!userClaim;
                const hasActiveClaim = hasClaim && !userClaim.is_used;

                return {
                    ...reward,
                    claimed: hasClaim,
                    has_active_claim: hasActiveClaim,
                    is_used: userClaim?.is_used ?? false,
                    used_at: userClaim?.used_at,
                    claimed_at: userClaim?.claimed_at,
                };
            });

            // 4. Filtering logic
            const filtered = processedRewards.filter(reward => {
                const userClaim = claimedMap.get(reward.id);

                // For FREE one-time rewards: hide if already claimed
                if (reward.points_required === 0 && userClaim) {
                    console.log(`❌ Hiding one-time reward: ${reward.name} - already claimed`);
                    return false;
                }

                // For PAID rewards: only hide if there's an ACTIVE (unused) claim
                if (reward.points_required > 0 && userClaim && !userClaim.is_used) {
                    console.log(`❌ Hiding paid reward: ${reward.name} - has active claim`);
                    return false;
                }

                console.log(`✅ Showing reward: ${reward.name} (${reward.points_required} pts)`);
                return true;
            });

            console.log("🎯 Final available rewards:", filtered.map(r => ({
                name: r.name,
                points: r.points_required,
                claimed: r.claimed,
                has_active_claim: r.has_active_claim,
                is_used: r.is_used
            })));

            return filtered;

        } catch (error) {
            console.error("💥 Error loading available rewards:", error);
            return [];
        }
    }

    /**
     * Claim reward - WITH DAILY LIMIT CHECK
     */
    static async claimReward(userId: string, rewardId: string): Promise<{
        success: boolean;
        error?: string;
        redemptionCode?: string;
        dailyLimitInfo?: { used: number; remaining: number; limit: number };
    }> {
        try {
            // 1. Check daily claim limit FIRST
            const limitCheck = await this.checkDailyClaimLimit(userId);
            if (!limitCheck.canClaim) {
                return {
                    success: false,
                    error: limitCheck.error
                };
            }

            // 2. Get reward details
            const { data: reward, error: rewardError } = await supabase
                .from('rewards')
                .select('points_required, name, type')
                .eq('id', rewardId)
                .single();

            if (rewardError) throw rewardError;

            // 3. Claim check logic
            let existingClaimQuery = supabase
                .from('user_claimed_rewards')
                .select('id, is_used')
                .eq('user_id', userId)
                .eq('reward_id', rewardId);

            if (reward.points_required > 0) {
                existingClaimQuery = existingClaimQuery.eq('is_used', false);
            }

            const { data: existingClaims, error: checkError } = await existingClaimQuery;

            if (checkError) throw checkError;

            // Block claiming if existing claim found based on reward type
            if (existingClaims && existingClaims.length > 0) {
                if (reward.points_required === 0) {
                    return {
                        success: false,
                        error: 'This one-time reward has already been claimed'
                    };
                } else {
                    return {
                        success: false,
                        error: 'You already have an unused claim for this reward'
                    };
                }
            }

            // 4. Deduct points if needed
            if (reward.points_required > 0) {
                const { data: userPoints, error: pointsError } = await supabase
                    .from('user_points')
                    .select('points')
                    .eq('user_id', userId)
                    .single();

                if (pointsError) throw pointsError;

                if ((userPoints?.points || 0) < reward.points_required) {
                    return { success: false, error: 'Insufficient points' };
                }

                const newBalance = (userPoints.points || 0) - reward.points_required;
                const { error: updateError } = await supabaseAdmin
                    .from('user_points')
                    .update({
                        points: newBalance,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userId);

                if (updateError) throw updateError;

                // Record points deduction
                const { error: pointsHistoryError } = await supabaseAdmin
                    .from('points_history')
                    .insert({
                        user_id: userId,
                        points: -reward.points_required,
                        description: `Points redeemed for reward: ${reward.name}`,
                        type: 'spent',
                        transaction_type: 'redeem',
                        created_at: new Date().toISOString()
                    });

                if (pointsHistoryError) throw pointsHistoryError;
            }

            // 5. Generate redemption code
            const redemptionCode = this.generateRedemptionCode(userId, rewardId);

            // 6. Save claim
            const { error: claimError } = await supabaseAdmin
                .from('user_claimed_rewards')
                .insert({
                    user_id: userId,
                    reward_id: rewardId,
                    claimed_at: new Date().toISOString(),
                    is_used: false,
                    redemption_code: redemptionCode
                });

            if (claimError) {
                if (claimError.code === '23505') {
                    return {
                        success: false,
                        error: 'This reward has already been claimed. Please refresh the page.'
                    };
                }
                throw claimError;
            }

            // 7. Get updated daily claim count for user feedback
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const { data: todaysClaims } = await supabaseAdmin
                .from('user_claimed_rewards')
                .select('id')
                .eq('user_id', userId)
                .gte('claimed_at', today.toISOString())
                .lt('claimed_at', tomorrow.toISOString());

            const claimCount = todaysClaims?.length || 0;
            const MAX_DAILY_CLAIMS = 3;
            const remainingClaims = MAX_DAILY_CLAIMS - claimCount;

            console.log('✅ Reward claimed:', {
                userId,
                rewardId,
                redemptionCode,
                pointsRequired: reward.points_required,
                dailyClaims: claimCount,
                remainingClaims
            });

            return {
                success: true,
                redemptionCode,
                dailyLimitInfo: {
                    used: claimCount,
                    remaining: remainingClaims,
                    limit: MAX_DAILY_CLAIMS
                }
            };

        } catch (error: any) {
            console.error('💥 Error claiming reward:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get user's daily claim status
     */
    static async getDailyClaimStatus(userId: string): Promise<{
        used: number;
        remaining: number;
        limit: number;
        canClaim: boolean;
    }> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const { data: todaysClaims, error } = await supabaseAdmin
                .from('user_claimed_rewards')
                .select('id')
                .eq('user_id', userId)
                .gte('claimed_at', today.toISOString())
                .lt('claimed_at', tomorrow.toISOString());

            if (error) throw error;

            const claimCount = todaysClaims?.length || 0;
            const MAX_DAILY_CLAIMS = 3;
            const remainingClaims = MAX_DAILY_CLAIMS - claimCount;

            return {
                used: claimCount,
                remaining: remainingClaims,
                limit: MAX_DAILY_CLAIMS,
                canClaim: claimCount < MAX_DAILY_CLAIMS
            };

        } catch (error) {
            console.error('💥 Error getting daily claim status:', error);
            // Return default values if there's an error
            return {
                used: 0,
                remaining: 3,
                limit: 3,
                canClaim: true
            };
        }
    }

    /**
     * Get all user claims
     */
    static async getUserClaimedRewards(userId: string): Promise<UserClaimedReward[]> {
        try {
            const { data, error } = await supabaseAdmin
                .from("user_claimed_rewards")
                .select("*, reward:rewards(*)")
                .eq("user_id", userId)
                .order("claimed_at", { ascending: false });

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error("💥 Error loading claimed rewards:", error);
            return [];
        }
    }
}