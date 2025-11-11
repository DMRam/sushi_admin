export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD'
    }).format(amount);
};

export type PointTransactionType =
    | 'order'
    | 'bonus'
    | 'reward'
    | 'birthday'
    | 'referral'
    | 'tier_upgrade'
    | 'welcome'
    | 'review'
    | 'social_share';

export interface PointTransaction {
    userId: string;
    orderId?: string;
    points: number;
    type: PointTransactionType;
    metadata?: any;
}

export const getPointDescription = (type: PointTransactionType, metadata: any = {}): string => {
    const descriptions: Record<PointTransactionType, (metadata: any) => string> = {
        order: (meta) => `Order • ${formatCurrency(meta.amount || 0)}`,
        bonus: (meta) => `Bonus • ${meta.reason || 'Special offer'}`,
        reward: (meta) => `Reward • ${meta.rewardName || 'Claimed reward'}`,
        birthday: () => `Birthday surprise 🎉`,
        referral: (meta) => `Referral • ${meta.friendName || 'Friend signed up'}`,
        tier_upgrade: (meta) => `${meta.tier || 'New'} tier welcome 🏆`,
        welcome: () => `Welcome bonus 🎁`,
        review: (meta) => `Review • ${meta.platform || 'Feedback'}`,
        social_share: (meta) => `Social share • ${meta.platform || 'Social media'}`
    };

    return descriptions[type](metadata);
};

export const getPointType = (transactionType: PointTransactionType): string => {
    const types: Record<PointTransactionType, string> = {
        order: 'earned',
        bonus: 'bonus',
        reward: 'reward',
        birthday: 'bonus',
        referral: 'bonus',
        tier_upgrade: 'bonus',
        welcome: 'bonus',
        review: 'bonus',
        social_share: 'bonus'
    };

    return types[transactionType];
};