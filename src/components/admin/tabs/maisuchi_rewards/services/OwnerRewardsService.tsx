import { supabase, supabaseAdmin } from "../../../../../lib/supabase";
import type { Reward, UserClaimedReward } from "../../../../../pages/client_hub/service/RewardsService";


export interface UserClaimedRewardWithCode extends UserClaimedReward {
    redemption_code?: string;
    qr_code_data?: string;
}

export class OwnerRewardsService {

    /**
     * Generate unique redemption code
     */
    // private static generateRedemptionCode(userId: string, rewardId: string): string {
    //     const timestamp = Date.now().toString(36);
    //     const random = Math.random().toString(36).substring(2, 8);
    //     return `RWD-${userId.slice(-4)}-${rewardId.slice(-4)}-${timestamp}-${random}`.toUpperCase();
    // }

    /**
     * Get all rewards with detailed analytics
     */
    static async getAllRewardsWithAnalytics(): Promise<(Reward & {
        total_claimed: number;
        total_used: number;
        redemption_rate: number;
        active_users: number;
    })[]> {
        try {
            // Get all rewards
            const { data: rewards, error: rewardsError } = await supabase
                .from('rewards')
                .select('*')
                .order('created_at', { ascending: false });

            if (rewardsError) throw rewardsError;

            // Get analytics for each reward
            const rewardsArray = (rewards || []) as Reward[];
            const rewardsWithAnalytics = await Promise.all(
                rewardsArray.map(async (reward: Reward) => {
                    const { data: claims, error: claimsError } = await supabase
                        .from('user_claimed_rewards')
                        .select('id, is_used, user_id')
                        .eq('reward_id', reward.id);

                    if (claimsError) throw claimsError;

                    const totalClaimed = claims?.length || 0;
                    const totalUsed = claims?.filter((claim: { is_used: any; }) => claim.is_used)?.length || 0;
                    const uniqueUsers = new Set(claims?.map((claim: { user_id: any; }) => claim.user_id) || []).size;
                    const redemptionRate = totalClaimed > 0 ? (totalUsed / totalClaimed) * 100 : 0;

                    return {
                        ...reward,
                        total_claimed: totalClaimed,
                        total_used: totalUsed,
                        redemption_rate: Math.round(redemptionRate),
                        active_users: uniqueUsers
                    } as Reward & {
                        total_claimed: number;
                        total_used: number;
                        redemption_rate: number;
                        active_users: number;
                    };
                })
            );

            return rewardsWithAnalytics;

        } catch (error) {
            console.error('💥 Error fetching rewards analytics:', error);
            return [];
        }
    }

    /**
     * Create a new reward
     */
    static async createReward(rewardData: Omit<Reward, 'id' | 'created_at'>): Promise<{ success: boolean; error?: string; reward?: Reward }> {
        try {
            const { data, error } = await supabaseAdmin
                .from('rewards')
                .insert([{
                    ...rewardData,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;

            return { success: true, reward: data as Reward };

        } catch (error: any) {
            console.error('💥 Error creating reward:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update an existing reward
     */
    static async updateReward(rewardId: string, updates: Partial<Reward>): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabaseAdmin
                .from('rewards')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', rewardId);

            if (error) throw error;

            return { success: true };

        } catch (error: any) {
            console.error('💥 Error updating reward:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Toggle reward active status
     */
    static async toggleRewardActive(rewardId: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabaseAdmin
                .from('rewards')
                .update({
                    is_active: isActive,
                    updated_at: new Date().toISOString()
                })
                .eq('id', rewardId);

            if (error) throw error;

            return { success: true };

        } catch (error: any) {
            console.error('💥 Error toggling reward status:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Redeem reward in-person (staff use)
     */
    /**
 * Redeem reward in-person (staff use)
 */
    static async redeemRewardInPerson(redemptionCode: string, staffName: string): Promise<{
        success: boolean;
        error?: string;
        rewardDetails?: any;
    }> {
        try {
            console.log('🔍 Looking for reward with code:', redemptionCode);

            // 1. Find the claimed reward using supabaseAdmin to bypass RLS
            const { data: claimedReward, error: findError } = await supabaseAdmin
                .from('user_claimed_rewards')
                .select(`
                *,
                reward:rewards(*),
                user:client_profiles(full_name, email)
            `)
                .eq('redemption_code', redemptionCode)
                .eq('is_used', false)
                .single();

            if (findError) {
                console.error('💥 Error finding reward:', findError);
                throw findError;
            }

            if (!claimedReward) {
                return { success: false, error: 'Reward not found or already used' };
            }

            console.log('✅ Found reward:', claimedReward);

            // 2. Mark as used (already using supabaseAdmin)
            const { error: updateError } = await supabaseAdmin
                .from('user_claimed_rewards')
                .update({
                    is_used: true,
                    used_at: new Date().toISOString(),
                    redeemed_by: staffName,
                    redemption_method: 'in_person'
                })
                .eq('id', claimedReward.id);

            if (updateError) {
                console.error('💥 Error updating reward:', updateError);
                throw updateError;
            }

            console.log('✅ Reward marked as used');

            // 3. Log redemption activity
            const { error: logError } = await supabaseAdmin
                .from('reward_redemption_logs')
                .insert({
                    claimed_reward_id: claimedReward.id,
                    redeemed_by: staffName,
                    redemption_code: redemptionCode,
                    redeemed_at: new Date().toISOString(),
                    method: 'in_person'
                });

            if (logError) {
                console.error('💥 Error logging redemption:', logError);
                // Don't throw here - the redemption already succeeded
                console.warn('⚠️ Redemption succeeded but logging failed');
            }

            console.log('✅ Reward redeemed in-person:', { redemptionCode, staffName });
            return {
                success: true,
                rewardDetails: claimedReward
            };

        } catch (error: any) {
            console.error('💥 Error redeeming reward in-person:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Staff: Search rewards by code, user, or status - WORKING VERSION
     */
    static async searchRewardsForStaff(searchTerm: string, filters: {
        status?: 'used' | 'unused';
        rewardType?: string;
    } = {}) {
        try {
            console.log('🔍 Searching for:', searchTerm, 'with filters:', filters);

            // Use supabaseAdmin to bypass RLS
            let query = supabaseAdmin
                .from('user_claimed_rewards')
                .select(`
                *,
                reward:rewards(*),
                user:client_profiles(*)
            `);

            // Apply status filters only
            if (filters.status === 'used') {
                query = query.eq('is_used', true);
            } else if (filters.status === 'unused') {
                query = query.eq('is_used', false);
            }

            const { data, error } = await query.order('claimed_at', { ascending: false });

            if (error) {
                console.error('💥 Database error:', error);
                throw error;
            }

            console.log('🔍 ALL rewards from database:', data);

            // If no search term, return all results
            if (!searchTerm) {
                return data || [];
            }

            // Client-side filtering for everything
            const searchLower = searchTerm.toLowerCase();
            const filteredData = (data || []).filter(reward => {
                // Check redemption code
                if (reward.redemption_code?.toLowerCase().includes(searchLower)) {
                    return true;
                }

                // Check user data
                const userName = reward.user?.full_name || '';
                const userEmail = reward.user?.email || '';

                if (userName.toLowerCase().includes(searchLower) ||
                    userEmail.toLowerCase().includes(searchLower)) {
                    return true;
                }

                // Check reward name
                const rewardName = reward.reward?.name || '';
                if (rewardName.toLowerCase().includes(searchLower)) {
                    return true;
                }

                return false;
            });

            console.log('🔍 Filtered results:', filteredData);
            return filteredData;

        } catch (error) {
            console.error('💥 Error searching rewards:', error);
            return [];
        }
    }


    // Add this method to your OwnerRewardsService
    static async debugSearchData() {
        try {
            console.log('🔍 DEBUG: Checking data structure...');

            // Get all claimed rewards to see the structure
            const { data, error } = await supabase
                .from('user_claimed_rewards')
                .select(`
                *,
                reward:rewards(*),
                user:client_profiles(*)
            `)
                .limit(5);

            if (error) throw error;

            console.log('🔍 DEBUG: Full data structure:', data);

            if (data && data.length > 0) {
                console.log('🔍 DEBUG: First reward user data:', data[0].user);
                console.log('🔍 DEBUG: First reward structure:', {
                    id: data[0].id,
                    redemption_code: data[0].redemption_code,
                    user: data[0].user,
                    reward: data[0].reward
                });
            }

            return data;
        } catch (error) {
            console.error('🔍 DEBUG Error:', error);
            return null;
        }
    }


    /**
     * Get detailed reward redemption analytics
     */
    static async getRewardRedemptionAnalytics(rewardId: string) {
        try {
            // Get reward details
            const { data: reward, error: rewardError } = await supabase
                .from('rewards')
                .select('*')
                .eq('id', rewardId)
                .single();

            if (rewardError) throw rewardError;

            // Get all claims for this reward
            const { data: claims, error: claimsError } = await supabase
                .from('user_claimed_rewards')
                .select(`
                    *,
                    user:client_profiles(full_name, email, total_points)
                `)
                .eq('reward_id', rewardId)
                .order('claimed_at', { ascending: false });

            if (claimsError) throw claimsError;

            // Calculate analytics
            const totalClaimed = claims?.length || 0;
            const totalUsed = claims?.filter((claim: { is_used: any; }) => claim.is_used)?.length || 0;
            const pendingRedemption = totalClaimed - totalUsed;
            const redemptionRate = totalClaimed > 0 ? (totalUsed / totalClaimed) * 100 : 0;

            // Monthly breakdown
            const monthlyClaims = claims?.reduce((acc: any, claim: { claimed_at: string | number | Date; }) => {
                const month = new Date(claim.claimed_at).toLocaleString('default', { month: 'short', year: 'numeric' });
                acc[month] = (acc[month] || 0) + 1;
                return acc;
            }, {});

            return {
                reward: reward as Reward,
                analytics: {
                    total_claimed: totalClaimed,
                    total_used: totalUsed,
                    pending_redemption: pendingRedemption,
                    redemption_rate: Math.round(redemptionRate),
                    monthly_breakdown: monthlyClaims
                },
                claims: claims || []
            };

        } catch (error) {
            console.error('💥 Error fetching reward analytics:', error);
            return null;
        }
    }

    /**
     * Create bulk rewards (for seasonal promotions)
     */
    static async createBulkRewards(rewards: Omit<Reward, 'id' | 'created_at'>[]): Promise<{ success: boolean; error?: string; created_count?: number }> {
        try {
            const rewardsWithTimestamps = rewards.map(reward => ({
                ...reward,
                created_at: new Date().toISOString()
            }));

            const { data, error } = await supabaseAdmin
                .from('rewards')
                .insert(rewardsWithTimestamps)
                .select();

            if (error) throw error;

            return { success: true, created_count: data?.length || 0 };

        } catch (error: any) {
            console.error('💥 Error creating bulk rewards:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Archive expired rewards
     */
    static async archiveExpiredRewards(): Promise<{ success: boolean; error?: string; archived_count?: number }> {
        try {
            const { data, error } = await supabaseAdmin
                .from('rewards')
                .update({ is_active: false })
                .lt('valid_until', new Date().toISOString())
                .eq('is_active', true)
                .select();

            if (error) throw error;

            return { success: true, archived_count: data?.length || 0 };

        } catch (error: any) {
            console.error('💥 Error archiving expired rewards:', error);
            return { success: false, error: error.message };
        }
    }
}