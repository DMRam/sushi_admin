// components/admin/tabs/maisuchi_rewards/reward_screen/OwnerRewardsDashboard.tsx
import { useState, useEffect } from 'react';
import { OwnerRewardsService } from '../services/OwnerRewardsService';
import type { Reward } from '../../../../../pages/client_hub/service/RewardsService';

interface OwnerRewardsDashboardProps {
  isMobile?: boolean;
}

export function OwnerRewardsDashboard({ isMobile = false }: OwnerRewardsDashboardProps) {
    const [rewards, setRewards] = useState<(Reward & any)[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<'management' | 'redemption'>('management');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [redeeming, setRedeeming] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [newReward, setNewReward] = useState({
        name: '',
        description: '',
        points_required: 0,
        type: 'discount' as 'discount' | 'free_item' | 'birthday' | 'special',
        discount_percentage: 0,
        free_item_name: '',
        valid_until: ''
    });

    useEffect(() => {
        loadRewards();
    }, []);

    const loadRewards = async () => {
        setLoading(true);
        const rewardsData = await OwnerRewardsService.getAllRewardsWithAnalytics();
        setRewards(rewardsData);
        setLoading(false);
    };

    const handleToggleActive = async (rewardId: string, isActive: boolean) => {
        const result = await OwnerRewardsService.toggleRewardActive(rewardId, isActive);
        if (result.success) {
            await loadRewards();
        }
        return result;
    };

    const handleCreateReward = async () => {
        if (!newReward.name || !newReward.description) {
            setMessage({ type: 'error', text: 'Please fill in all required fields' });
            return;
        }

        const result = await OwnerRewardsService.createReward({
            ...newReward,
            is_active: true,
            claimed: false,
            updated_at: ''
        });

        if (result.success) {
            setMessage({ type: 'success', text: 'Reward created successfully!' });
            setNewReward({
                name: '',
                description: '',
                points_required: 0,
                type: 'discount',
                discount_percentage: 0,
                free_item_name: '',
                valid_until: ''
            });
            await loadRewards();
        } else {
            setMessage({ type: 'error', text: `Failed to create reward: ${result.error}` });
        }
    };

    const handleSearch = async () => {
        if (!searchTerm.trim()) return;

        const results = await OwnerRewardsService.searchRewardsForStaff(searchTerm.trim());
        setSearchResults(results);
    };

    const handleRedeem = async (redemptionCode: string) => {
        setRedeeming(redemptionCode);
        setMessage(null);

        // Use current user's name or a generic staff identifier
        const staffName = "Admin User"; // You can get this from your auth context

        const result = await OwnerRewardsService.redeemRewardInPerson(redemptionCode, staffName);

        if (result.success) {
            setMessage({ type: 'success', text: `Reward redeemed successfully for ${result.rewardDetails?.user?.full_name}` });
            // Refresh search results
            handleSearch();
        } else {
            setMessage({ type: 'error', text: `Failed to redeem: ${result.error}` });
        }

        setRedeeming(null);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (activeSection === 'redemption') {
                handleSearch();
            }
        }
    };

    const clearMessage = () => {
        setTimeout(() => setMessage(null), 3000);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <div className={`border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4 ${isMobile ? 'w-12 h-12' : 'w-16 h-16'}`}></div>
                    <p className={`text-gray-600 ${isMobile ? 'text-sm' : ''}`}>Loading rewards...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`${isMobile ? 'p-3' : 'p-6'}`}>
            <h1 className={`font-bold mb-4 ${isMobile ? 'text-xl' : 'text-2xl'}`}>Rewards Management</h1>

            {/* Navigation Tabs - Responsive */}
            <div className={`flex border-b border-gray-200 mb-4 sm:mb-6 ${isMobile ? 'overflow-x-auto' : ''}`}>
                <button
                    onClick={() => setActiveSection('management')}
                    className={`font-medium whitespace-nowrap ${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2'} ${activeSection === 'management'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    {isMobile ? 'Management' : 'Reward Management'}
                </button>
                <button
                    onClick={() => setActiveSection('redemption')}
                    className={`font-medium whitespace-nowrap ${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2'} ${activeSection === 'redemption'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    {isMobile ? 'Redemption' : 'In-Person Redemption'}
                </button>
            </div>

            {/* Message Display */}
            {message && (
                <div 
                    className={`rounded-lg mb-4 ${isMobile ? 'p-3 text-sm' : 'p-4'} ${message.type === 'success'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                    onAnimationEnd={clearMessage}
                >
                    {message.text}
                </div>
            )}

            {/* Management Section */}
            {activeSection === 'management' && (
                <div className="space-y-4 sm:space-y-6">
                    {/* Create New Reward Form - Responsive */}
                    <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow mb-4 sm:mb-6">
                        <h2 className={`font-semibold mb-3 sm:mb-4 ${isMobile ? 'text-base' : 'text-lg'}`}>Create New Reward</h2>
                        <div className={`grid gap-3 sm:gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                            <div>
                                <label className={`block font-medium text-gray-700 mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>Name *</label>
                                <input
                                    type="text"
                                    value={newReward.name}
                                    onChange={(e) => setNewReward({ ...newReward, name: e.target.value })}
                                    className={`w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'}`}
                                    placeholder="Reward name"
                                />
                            </div>
                            <div>
                                <label className={`block font-medium text-gray-700 mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>Points Required</label>
                                <input
                                    type="number"
                                    value={newReward.points_required}
                                    onChange={(e) => setNewReward({ ...newReward, points_required: parseInt(e.target.value) || 0 })}
                                    className={`w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'}`}
                                    placeholder="0"
                                />
                            </div>
                            <div className={isMobile ? '' : 'md:col-span-2'}>
                                <label className={`block font-medium text-gray-700 mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>Description *</label>
                                <textarea
                                    value={newReward.description}
                                    onChange={(e) => setNewReward({ ...newReward, description: e.target.value })}
                                    className={`w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'}`}
                                    placeholder="Reward description"
                                    rows={isMobile ? 2 : 3}
                                />
                            </div>
                            <div>
                                <label className={`block font-medium text-gray-700 mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>Type</label>
                                <select
                                    value={newReward.type}
                                    onChange={(e) => setNewReward({ ...newReward, type: e.target.value as any })}
                                    className={`w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'}`}
                                >
                                    <option value="discount">Discount</option>
                                    <option value="free_item">Free Item</option>
                                    <option value="birthday">Birthday</option>
                                    <option value="special">Special</option>
                                </select>
                            </div>
                            <div>
                                <label className={`block font-medium text-gray-700 mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>Valid Until</label>
                                <input
                                    type="date"
                                    value={newReward.valid_until}
                                    onChange={(e) => setNewReward({ ...newReward, valid_until: e.target.value })}
                                    className={`w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'}`}
                                />
                            </div>
                            {newReward.type === 'discount' && (
                                <div>
                                    <label className={`block font-medium text-gray-700 mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>Discount %</label>
                                    <input
                                        type="number"
                                        value={newReward.discount_percentage}
                                        onChange={(e) => setNewReward({ ...newReward, discount_percentage: parseInt(e.target.value) || 0 })}
                                        className={`w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'}`}
                                        placeholder="10"
                                        min="0"
                                        max="100"
                                    />
                                </div>
                            )}
                            {newReward.type === 'free_item' && (
                                <div>
                                    <label className={`block font-medium text-gray-700 mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>Free Item Name</label>
                                    <input
                                        type="text"
                                        value={newReward.free_item_name}
                                        onChange={(e) => setNewReward({ ...newReward, free_item_name: e.target.value })}
                                        className={`w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'}`}
                                        placeholder="Free item name"
                                    />
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleCreateReward}
                            className={`mt-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors ${isMobile ? 'w-full py-2.5 text-sm' : 'px-6 py-2'}`}
                        >
                            Create Reward
                        </button>
                    </div>

                    {/* Quick Stats - Responsive */}
                    <div className={`grid gap-3 sm:gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
                        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
                            <h3 className={`font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>Total Rewards</h3>
                            <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold mt-1`}>{rewards.length}</p>
                        </div>
                        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
                            <h3 className={`font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>Active Rewards</h3>
                            <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-green-600 mt-1`}>
                                {rewards.filter(r => r.is_active).length}
                            </p>
                        </div>
                        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
                            <h3 className={`font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>Total Claims</h3>
                            <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-blue-600 mt-1`}>
                                {rewards.reduce((sum, r) => sum + (r.total_claimed || 0), 0)}
                            </p>
                        </div>
                        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
                            <h3 className={`font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>Avg. Redemption Rate</h3>
                            <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-orange-600 mt-1`}>
                                {rewards.length > 0 ? Math.round(rewards.reduce((sum, r) => sum + (r.redemption_rate || 0), 0) / rewards.length) : 0}%
                            </p>
                        </div>
                    </div>

                    {/* Rewards Table - Responsive */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        {isMobile ? (
                            /* Mobile Card View */
                            <div className="divide-y divide-gray-200">
                                {rewards.map((reward) => (
                                    <div key={reward.id} className="p-3 hover:bg-gray-50">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1">
                                                <h3 className="font-medium text-gray-900">{reward.name}</h3>
                                                <p className="text-xs text-gray-500 truncate">{reward.description}</p>
                                            </div>
                                            <button
                                                onClick={() => handleToggleActive(reward.id, !reward.is_active)}
                                                className={`px-2 py-1 rounded text-xs ml-2 ${reward.is_active
                                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                                    : 'bg-green-500 text-white hover:bg-green-600'
                                                    }`}
                                            >
                                                {reward.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-gray-600">Points: </span>
                                                <span className="font-medium">{reward.points_required}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Claims: </span>
                                                <span className="font-medium">{reward.total_claimed || 0}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Rate: </span>
                                                <span className={`px-1 rounded ${reward.redemption_rate >= 50 ? 'bg-green-100 text-green-800' :
                                                    reward.redemption_rate >= 25 ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                    {reward.redemption_rate}%
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Status: </span>
                                                <span className={`px-1 rounded ${reward.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {reward.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Desktop Table View */
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className={`font-medium text-left ${isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'}`}>Reward</th>
                                            <th className={`font-medium text-left ${isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'}`}>Points</th>
                                            <th className={`font-medium text-left ${isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'}`}>Claims</th>
                                            <th className={`font-medium text-left ${isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'}`}>Redemption Rate</th>
                                            <th className={`font-medium text-left ${isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'}`}>Status</th>
                                            <th className={`font-medium text-left ${isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'}`}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {rewards.map((reward) => (
                                            <tr key={reward.id} className="hover:bg-gray-50">
                                                <td className={`${isMobile ? 'px-3 py-2' : 'px-4 py-3'}`}>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{reward.name}</p>
                                                        <p className="text-sm text-gray-500">{reward.description}</p>
                                                    </div>
                                                </td>
                                                <td className={`${isMobile ? 'px-3 py-2' : 'px-4 py-3'}`}>{reward.points_required}</td>
                                                <td className={`${isMobile ? 'px-3 py-2' : 'px-4 py-3'}`}>
                                                    {reward.total_claimed} claimed<br />
                                                    <span className="text-sm text-gray-500">
                                                        {reward.total_used} used
                                                    </span>
                                                </td>
                                                <td className={`${isMobile ? 'px-3 py-2' : 'px-4 py-3'}`}>
                                                    <span className={`px-2 py-1 rounded-full text-xs ${reward.redemption_rate >= 50 ? 'bg-green-100 text-green-800' :
                                                        reward.redemption_rate >= 25 ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'
                                                        }`}>
                                                        {reward.redemption_rate}%
                                                    </span>
                                                </td>
                                                <td className={`${isMobile ? 'px-3 py-2' : 'px-4 py-3'}`}>
                                                    <span className={`px-2 py-1 rounded-full text-xs ${reward.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {reward.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className={`${isMobile ? 'px-3 py-2' : 'px-4 py-3'}`}>
                                                    <button
                                                        onClick={() => handleToggleActive(reward.id, !reward.is_active)}
                                                        className={`rounded text-sm ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-1'} ${reward.is_active
                                                            ? 'bg-red-500 text-white hover:bg-red-600'
                                                            : 'bg-green-500 text-white hover:bg-green-600'
                                                            }`}
                                                    >
                                                        {reward.is_active ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Redemption Section */}
            {activeSection === 'redemption' && (
                <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow space-y-4 sm:space-y-6">
                    <h2 className={`font-bold ${isMobile ? 'text-lg' : 'text-xl'}`}>Reward Redemption</h2>

                    {/* Search Section */}
                    <div>
                        <div className={`flex gap-2 sm:gap-4 mb-4 ${isMobile ? 'flex-col' : ''}`}>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Enter redemption code, customer name, or email..."
                                className={`border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isMobile ? 'w-full px-3 py-2 text-sm' : 'flex-1 px-4 py-2'}`}
                            />
                            <button
                                onClick={handleSearch}
                                disabled={!searchTerm.trim()}
                                className={`bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 ${isMobile ? 'w-full py-2.5 text-sm' : 'px-6 py-2'}`}
                            >
                                {isMobile ? 'Search' : 'Search'}
                            </button>
                        </div>

                        {/* QR Scanner Placeholder */}
                        <div className={`text-center border-2 border-dashed border-gray-300 rounded-lg mb-4 ${isMobile ? 'py-3' : 'py-4'}`}>
                            <p className={`text-gray-500 ${isMobile ? 'text-sm' : ''}`}>QR Scanner Placeholder</p>
                            <p className={`text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>(Camera integration for QR code scanning)</p>
                        </div>
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                            {isMobile ? (
                                /* Mobile Card View for Search Results */
                                <div className="divide-y divide-gray-200">
                                    {searchResults.map((result) => {
                                        const userName = result.user?.full_name || result.user?.[0]?.full_name || 'Unknown Customer';
                                        const userEmail = result.user?.email || result.user?.[0]?.email || 'No email';

                                        return (
                                            <div key={result.id} className="p-3 hover:bg-gray-50">
                                                <div className="mb-2">
                                                    <h3 className="font-medium text-gray-900">{userName}</h3>
                                                    <p className="text-xs text-gray-500">{userEmail}</p>
                                                </div>
                                                <div className="mb-2">
                                                    <p className="text-sm font-medium">{result.reward?.name || result.reward?.[0]?.name}</p>
                                                    <p className="text-xs text-gray-500 truncate">{result.reward?.description || result.reward?.[0]?.description}</p>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                                            {result.redemption_code}
                                                        </span>
                                                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${result.is_used
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                            {result.is_used ? 'Used' : 'Available'}
                                                        </span>
                                                    </div>
                                                    {!result.is_used && (
                                                        <button
                                                            onClick={() => handleRedeem(result.redemption_code)}
                                                            disabled={redeeming === result.redemption_code}
                                                            className={`bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 ${isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2'}`}
                                                        >
                                                            {redeeming === result.redemption_code ? '...' : 'Redeem'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                /* Desktop Table View for Search Results */
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-medium">Customer</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium">Reward</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium">Code</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {searchResults.map((result) => {
                                                const userName = result.user?.full_name || result.user?.[0]?.full_name || 'Unknown Customer';
                                                const userEmail = result.user?.email || result.user?.[0]?.email || 'No email';

                                                return (
                                                    <tr key={result.id} className="border-t hover:bg-gray-50">
                                                        <td className="px-4 py-3">
                                                            <div>
                                                                <p className="font-medium text-gray-900">{userName}</p>
                                                                <p className="text-sm text-gray-500">{userEmail}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <p className="font-medium">{result.reward?.name || result.reward?.[0]?.name}</p>
                                                            <p className="text-sm text-gray-500">{result.reward?.description || result.reward?.[0]?.description}</p>
                                                        </td>
                                                        <td className="px-4 py-3 font-mono text-sm">{result.redemption_code}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-1 rounded-full text-xs ${result.is_used
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                {result.is_used ? 'Used' : 'Available'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {!result.is_used && (
                                                                <button
                                                                    onClick={() => handleRedeem(result.redemption_code)}
                                                                    disabled={redeeming === result.redemption_code}
                                                                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                                                                >
                                                                    {redeeming === result.redemption_code ? 'Processing...' : 'Redeem'}
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {searchTerm && searchResults.length === 0 && (
                        <div className={`text-center text-gray-500 ${isMobile ? 'py-6 text-sm' : 'py-8'}`}>
                            No rewards found matching your search
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}