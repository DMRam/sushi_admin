// components/admin/tabs/maisuchi_rewards/reward_screen/OwnerRewardsDashboard.tsx
import { useState, useEffect } from 'react';
import { OwnerRewardsService } from '../services/OwnerRewardsService';
import type { Reward } from '../../../../../pages/client_hub/service/RewardsService';

export function OwnerRewardsDashboard() {
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

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading rewards...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Rewards Management</h1>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveSection('management')}
                    className={`px-4 py-2 font-medium ${activeSection === 'management'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Reward Management
                </button>
                <button
                    onClick={() => setActiveSection('redemption')}
                    className={`px-4 py-2 font-medium ${activeSection === 'redemption'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    In-Person Redemption
                </button>
            </div>

            {/* Message Display */}
            {message && (
                <div className={`p-4 rounded-lg mb-4 ${message.type === 'success'
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Management Section */}
            {activeSection === 'management' && (
                <div>
                    {/* Create New Reward Form */}
                    <div className="bg-white p-6 rounded-lg shadow mb-6">
                        <h2 className="text-lg font-semibold mb-4">Create New Reward</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={newReward.name}
                                    onChange={(e) => setNewReward({ ...newReward, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Reward name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Points Required</label>
                                <input
                                    type="number"
                                    value={newReward.points_required}
                                    onChange={(e) => setNewReward({ ...newReward, points_required: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="0"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                                <textarea
                                    value={newReward.description}
                                    onChange={(e) => setNewReward({ ...newReward, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Reward description"
                                    rows={2}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select
                                    value={newReward.type}
                                    onChange={(e) => setNewReward({ ...newReward, type: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="discount">Discount</option>
                                    <option value="free_item">Free Item</option>
                                    <option value="birthday">Birthday</option>
                                    <option value="special">Special</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                                <input
                                    type="date"
                                    value={newReward.valid_until}
                                    onChange={(e) => setNewReward({ ...newReward, valid_until: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            {newReward.type === 'discount' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Percentage</label>
                                    <input
                                        type="number"
                                        value={newReward.discount_percentage}
                                        onChange={(e) => setNewReward({ ...newReward, discount_percentage: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="10"
                                        min="0"
                                        max="100"
                                    />
                                </div>
                            )}
                            {newReward.type === 'free_item' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Free Item Name</label>
                                    <input
                                        type="text"
                                        value={newReward.free_item_name}
                                        onChange={(e) => setNewReward({ ...newReward, free_item_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Free item name"
                                    />
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleCreateReward}
                            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            Create Reward
                        </button>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold">Total Rewards</h3>
                            <p className="text-2xl">{rewards.length}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold">Active Rewards</h3>
                            <p className="text-2xl text-green-600">
                                {rewards.filter(r => r.is_active).length}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold">Total Claims</h3>
                            <p className="text-2xl text-blue-600">
                                {rewards.reduce((sum, r) => sum + (r.total_claimed || 0), 0)}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold">Avg. Redemption Rate</h3>
                            <p className="text-2xl text-orange-600">
                                {rewards.length > 0 ? Math.round(rewards.reduce((sum, r) => sum + (r.redemption_rate || 0), 0) / rewards.length) : 0}%
                            </p>
                        </div>
                    </div>

                    {/* Rewards Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left">Reward</th>
                                    <th className="px-6 py-3 text-left">Points</th>
                                    <th className="px-6 py-3 text-left">Claims</th>
                                    <th className="px-6 py-3 text-left">Redemption Rate</th>
                                    <th className="px-6 py-3 text-left">Status</th>
                                    <th className="px-6 py-3 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rewards.map((reward) => (
                                    <tr key={reward.id} className="border-t">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium">{reward.name}</p>
                                                <p className="text-sm text-gray-500">{reward.description}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{reward.points_required}</td>
                                        <td className="px-6 py-4">
                                            {reward.total_claimed} claimed<br />
                                            <span className="text-sm text-gray-500">
                                                {reward.total_used} used
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs ${reward.redemption_rate >= 50 ? 'bg-green-100 text-green-800' :
                                                reward.redemption_rate >= 25 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {reward.redemption_rate}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs ${reward.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {reward.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggleActive(reward.id, !reward.is_active)}
                                                className={`px-3 py-1 rounded text-sm ${reward.is_active
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
                </div>
            )}

            {/* Redemption Section */}
            {activeSection === 'redemption' && (
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4">Reward Redemption</h2>

                    {/* Search Section */}
                    <div className="mb-6">
                        <div className="flex gap-4 mb-4">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Enter redemption code, customer name, or email..."
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={handleSearch}
                                disabled={!searchTerm.trim()}
                                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                            >
                                Search
                            </button>
                        </div>

                        {/* QR Scanner Placeholder */}
                        <div className="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg mb-4">
                            <p className="text-gray-500">QR Scanner Placeholder</p>
                            <p className="text-sm text-gray-400">(Camera integration for QR code scanning)</p>
                        </div>
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                            <table className="min-w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Customer</th>
                                        <th className="px-4 py-3 text-left">Reward</th>
                                        <th className="px-4 py-3 text-left">Code</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                        <th className="px-4 py-3 text-left">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* In the search results table - ENHANCED VERSION */}
                                    {searchResults.map((result) => {
                                        // Handle different user data structures
                                        const userName = result.user?.full_name || result.user?.[0]?.full_name || 'Unknown Customer';
                                        const userEmail = result.user?.email || result.user?.[0]?.email || 'No email';

                                        return (
                                            <tr key={result.id} className="border-t">
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

                    {searchTerm && searchResults.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No rewards found matching your search
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}