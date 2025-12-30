import { supabase, supabaseAdmin } from '../../../lib/supabase';
import { getPointDescription, getPointType, type PointTransaction } from '../utils/pointDescriptions';

export class PointsService {
    // Map transaction types to the allowed values from the constraint
    private static getSafeTransactionType(originalType: string): string {
        const safeTypes: Record<string, string> = {
            'order': 'earn',
            'bonus': 'earn', 
            'reward': 'earn',
            'birthday': 'earn',
            'referral': 'earn',
            'tier_upgrade': 'earn',
            'welcome': 'earn',
            'review': 'earn',
            'social_share': 'earn',
            'redemption': 'redeem',
            'adjustment': 'adjustment'
        };
        
        return safeTypes[originalType] || 'earn'; // Default to 'earn'
    }

    static async addTransaction(transaction: PointTransaction) {
        try {
            const description = getPointDescription(transaction.type, transaction.metadata);
            const type = getPointType(transaction.type);
            
            // Use safe transaction type that passes constraints
            const safeTransactionType = this.getSafeTransactionType(transaction.type);

            console.log('🔄 Processing points transaction:', {
                userId: transaction.userId,
                originalType: transaction.type,
                safeType: safeTransactionType,
                points: transaction.points
            });

            // 1. Ensure user points record exists first
            await this.ensureUserPointsRecord(transaction.userId);

            // 2. Get current balance to calculate new total
            const currentBalance = await this.getCurrentBalance(transaction.userId);
            const newBalance = currentBalance + transaction.points;

            console.log('💰 Balance calculation:', {
                currentBalance,
                pointsToAdd: transaction.points,
                newBalance
            });

            // 3. Update user_points table with new total using UPSERT
            const { error: pointsError } = await supabaseAdmin
                .from('user_points')
                .upsert({
                    user_id: transaction.userId,
                    points: newBalance,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (pointsError) {
                console.error('❌ Error updating user_points:', pointsError);
                throw new Error(`Failed to update points: ${pointsError.message}`);
            }

            // 4. Add to points_history with valid transaction type
            const pointsHistoryData = {
                user_id: transaction.userId,
                order_id: transaction.orderId,
                points: transaction.points, // This is the points earned in this transaction
                description,
                type,
                transaction_type: safeTransactionType, // Now using valid 'earn' value
                created_at: new Date().toISOString(),
                metadata: transaction.metadata || {}
            };

            console.log('📝 Inserting points history:', pointsHistoryData);

            const { data: historyResult, error: historyError } = await supabaseAdmin
                .from('points_history')
                .insert(pointsHistoryData)
                .select();

            if (historyError) {
                console.error('❌ Error adding points history:', historyError);
                console.error('📋 History data that failed:', pointsHistoryData);
                throw new Error(`Failed to record points history: ${historyError.message}`);
            }

            console.log('✅ Points history inserted:', historyResult);

            // 5. Update client_profiles for consistency
            const { error: profileError } = await supabaseAdmin
                .from('client_profiles')
                .update({
                    total_points: newBalance,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', transaction.userId);

            if (profileError) {
                console.error('❌ Error updating client profile:', profileError);
                // Don't throw - this is less critical
            }

            console.log('✅ Points transaction completed:', {
                userId: transaction.userId,
                type: transaction.type,
                safeType: safeTransactionType,
                points: transaction.points,
                description,
                newBalance
            });

            return { 
                success: true,
                previousBalance: currentBalance,
                newBalance,
                pointsEarned: transaction.points
            };

        } catch (error: any) {
            console.error('💥 Points transaction failed:', error);
            throw error;
        }
    }

    // ... rest of your methods remain the same
    static async ensureUserPointsRecord(userId: string) {
        try {
            const { data, error } = await supabaseAdmin
                .from('user_points')
                .select('user_id, points')
                .eq('user_id', userId)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (!data) {
                console.log('📝 Creating new user_points record for:', userId);
                const { error: insertError } = await supabaseAdmin
                    .from('user_points')
                    .insert({
                        user_id: userId,
                        points: 0,
                        earned_at: new Date().toISOString(),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    });

                if (insertError) {
                    console.error('❌ Error creating user_points record:', insertError);
                    throw insertError;
                }
                console.log('✅ Created user_points record for:', userId);
            } else {
                console.log('✅ User_points record exists with balance:', data.points);
            }

        } catch (error: any) {
            console.error('💥 Error ensuring user points record:', error);
            throw error;
        }
    }

    static async getUserPointsHistory(userId: string, limit: number = 10) {
        try {
            const { data, error } = await supabase
                .from('points_history')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];

        } catch (error) {
            console.error('💥 Error fetching points history:', error);
            return [];
        }
    }

    static async getCurrentBalance(userId: string): Promise<number> {
        try {
            const { data, error } = await supabase
                .from('user_points')
                .select('points')
                .eq('user_id', userId)
                .single();

            if (error) throw error;
            return data?.points || 0;

        } catch (error) {
            console.error('💥 Error fetching current balance:', error);
            return 0;
        }
    }
}