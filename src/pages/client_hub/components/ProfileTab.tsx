import type { ClientProfile } from "../../../types/types"

interface ProfileTabProps {
    clientProfile: ClientProfile | null
    formatCurrency: (amount: number) => string;
    stats: {
        totalSpent: number;
        averageOrder: number;
        favoriteCategory: string;
        monthlyOrders: number;
    }
}
export const ProfileTab = ({ clientProfile, formatCurrency, stats }: ProfileTabProps) => {
    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xl font-light text-white mb-4">Personal Information</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-white/60 font-light text-sm">Full Name</label>
                            <p className="text-white font-light text-lg">{clientProfile?.full_name}</p>
                        </div>
                        <div>
                            <label className="text-white/60 font-light text-sm">Email</label>
                            <p className="text-white font-light text-lg">{clientProfile?.email}</p>
                        </div>
                        <div>
                            <label className="text-white/60 font-light text-sm">Phone</label>
                            <p className="text-white font-light text-lg">{clientProfile?.phone || 'Not provided'}</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-light text-white mb-4">Loyalty Information</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-white/60 font-light text-sm">Member Since</label>
                            <p className="text-white font-light text-lg">
                                {clientProfile?.created_at
                                    ? new Date(clientProfile.created_at).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })
                                    : 'N/A'}
                            </p>
                        </div>
                        <div>
                            <label className="text-white/60 font-light text-sm">Total Points</label>
                            <p className="text-white font-light text-lg">{clientProfile?.total_points || 0}</p>
                        </div>
                        <div>
                            <label className="text-white/60 font-light text-sm">Current Tier</label>
                            <p className="text-white font-light text-lg capitalize">{clientProfile?.current_tier || 'Bronze'}</p>
                        </div>
                        <div>
                            <label className="text-white/60 font-light text-sm">Lifetime Value</label>
                            <p className="text-white font-light text-lg">{formatCurrency(stats.totalSpent)}</p>
                        </div>
                    </div>

                    <button className="w-full mt-6 border border-white/20 text-white/60 py-3 rounded-lg hover:bg-white/10 hover:text-white transition-all duration-300 font-light">
                        Edit Profile
                    </button>
                </div>
            </div>
        </>
    )
}
