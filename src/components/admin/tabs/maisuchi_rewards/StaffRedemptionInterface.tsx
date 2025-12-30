import { useState } from 'react';
import { OwnerRewardsService } from './services/OwnerRewardsService';

interface StaffRedemptionInterfaceProps {
    staffId: string;
}

export function StaffRedemptionInterface({ staffId }: StaffRedemptionInterfaceProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [redeeming, setRedeeming] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSearch = async () => {
        if (!searchTerm.trim()) return;

        setLoading(true);
        const results = await OwnerRewardsService.searchRewardsForStaff(searchTerm.trim());
        setSearchResults(results);
        setLoading(false);
    };

    const handleRedeem = async (redemptionCode: string) => {
        setRedeeming(redemptionCode);
        setMessage(null);

        const result = await OwnerRewardsService.redeemRewardInPerson(redemptionCode, staffId);

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
            handleSearch();
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow">
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
                        disabled={loading || !searchTerm.trim()}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    >
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </div>

                {/* QR Scanner Placeholder */}
                <div className="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">QR Scanner Placeholder</p>
                    <p className="text-sm text-gray-400">(Camera integration for QR code scanning)</p>
                </div>
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
                            {searchResults.map((result) => (
                                <tr key={result.id} className="border-t">
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="font-medium">{result.user?.full_name}</p>
                                            <p className="text-sm text-gray-500">{result.user?.email}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="font-medium">{result.reward?.name}</p>
                                        <p className="text-sm text-gray-500">{result.reward?.description}</p>
                                    </td>
                                    <td className="px-4 py-3 font-mono">{result.redemption_code}</td>
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
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {searchTerm && searchResults.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                    No rewards found matching your search
                </div>
            )}
        </div>
    );
}