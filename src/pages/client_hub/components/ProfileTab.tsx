import { useState, useEffect } from "react";
import type { ClientProfile } from "../../../types/types";

interface ProfileTabProps {
    clientProfile: ClientProfile | null;
    formatCurrency: (amount: number) => string;
    stats: {
        totalSpent: number;
        averageOrder: number;
        favoriteCategory: string;
        monthlyOrders: number;
    };
    onProfileUpdate?: (updatedProfile: Partial<ClientProfile>) => Promise<boolean>;
    isMobile?: boolean;
}

export const ProfileTab = ({ clientProfile, formatCurrency, stats, onProfileUpdate, isMobile }: ProfileTabProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedProfile, setEditedProfile] = useState<Partial<ClientProfile>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Initialize editedProfile when clientProfile changes
    useEffect(() => {
        if (clientProfile) {
            setEditedProfile({
                full_name: clientProfile.full_name || '',
                phone: clientProfile.phone || '',
                address: clientProfile.address || '',
                city: clientProfile.city || '',
                zip_code: clientProfile.zip_code || '',
            });
        }
    }, [clientProfile]);

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleSave = async () => {
        if (!onProfileUpdate || !clientProfile) return;

        setIsLoading(true);
        setMessage(null);

        try {
            // Sanitize and validate the data
            const sanitizedProfile: Partial<ClientProfile> = {
                full_name: editedProfile.full_name?.trim() || '',
                phone: editedProfile.phone?.trim() || '',
                address: editedProfile.address?.trim() || '',
                city: editedProfile.city?.trim() || '',
                zip_code: editedProfile.zip_code?.trim() || '',
            };

            // Check if anything actually changed
            const hasChanges =
                sanitizedProfile.full_name !== clientProfile.full_name ||
                sanitizedProfile.phone !== clientProfile.phone ||
                sanitizedProfile.address !== clientProfile.address ||
                sanitizedProfile.city !== clientProfile.city ||
                sanitizedProfile.zip_code !== clientProfile.zip_code;

            if (!hasChanges) {
                showMessage('success', 'No changes detected');
                setIsEditing(false);
                return;
            }

            // Call the update function
            const success = await onProfileUpdate(sanitizedProfile);

            if (success) {
                showMessage('success', 'Profile updated successfully!');
                setIsEditing(false);
            } else {
                showMessage('error', 'Failed to update profile. Please try again.');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            showMessage('error', 'An error occurred while updating profile.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        // Reset to original values
        if (clientProfile) {
            setEditedProfile({
                full_name: clientProfile.full_name || '',
                phone: clientProfile.phone || '',
                address: clientProfile.address || '',
                city: clientProfile.city || '',
                zip_code: clientProfile.zip_code || '',
            });
        }
        setIsEditing(false);
        setMessage(null);
    };

    const handleChange = (field: keyof ClientProfile, value: string) => {
        setEditedProfile(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Format phone number for display
    const formatPhoneNumber = (phone: string) => {
        if (!phone) return 'Not provided';
        // Simple formatting: (514) 980-4595
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        return phone;
    };

    // Format address for display
    const formatAddress = (address: string, city: string, zipCode: string) => {
        if (!address && !city && !zipCode) return 'Not provided';

        const parts = [];
        if (address) parts.push(address);
        if (city) parts.push(city);
        if (zipCode) parts.push(zipCode.toUpperCase());

        return parts.join(', ');
    };

    // Responsive grid classes
    const getMainGridClasses = () => {
        if (isMobile) {
            return "grid grid-cols-1 gap-6";
        }
        return "grid grid-cols-1 lg:grid-cols-2 gap-8";
    };

    const getAddressGridClasses = () => {
        if (isMobile) {
            return "grid grid-cols-1 gap-4";
        }
        return "grid grid-cols-2 gap-4";
    };

    return (
        <>
            {/* Message Banner */}
            {message && (
                <div className={`mb-4 md:mb-6 p-3 md:p-4 rounded-lg ${message.type === 'success'
                        ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                        : 'bg-red-500/20 border border-red-500/50 text-red-300'
                    } text-sm md:text-base`}>
                    {message.text}
                </div>
            )}

            <div className={getMainGridClasses()}>
                <div>
                    <h3 className="text-lg md:text-xl font-light text-white mb-4">Personal Information</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-white/60 font-light text-sm">Full Name</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedProfile.full_name || ''}
                                    onChange={(e) => handleChange('full_name', e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white font-light focus:outline-none focus:border-white/40 text-sm md:text-base"
                                    placeholder="Enter your full name"
                                />
                            ) : (
                                <p className="text-white font-light text-base md:text-lg">{clientProfile?.full_name || 'Not provided'}</p>
                            )}
                        </div>

                        <div>
                            <label className="text-white/60 font-light text-sm">Email</label>
                            <p className="text-white font-light text-base md:text-lg">{clientProfile?.email}</p>
                            <p className="text-white/40 text-xs">Email cannot be changed</p>
                        </div>

                        <div>
                            <label className="text-white/60 font-light text-sm">Phone</label>
                            {isEditing ? (
                                <input
                                    type="tel"
                                    value={editedProfile.phone || ''}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white font-light focus:outline-none focus:border-white/40 text-sm md:text-base"
                                    placeholder="5149804595"
                                />
                            ) : (
                                <p className="text-white font-light text-base md:text-lg">
                                    {formatPhoneNumber(clientProfile?.phone || '')}
                                </p>
                            )}
                        </div>

                        {/* Address Fields */}
                        <div>
                            <label className="text-white/60 font-light text-sm">Address</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedProfile.address || ''}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white font-light focus:outline-none focus:border-white/40 text-sm md:text-base"
                                    placeholder="Enter your street address"
                                />
                            ) : (
                                <p className="text-white font-light text-base md:text-lg">
                                    {formatAddress(
                                        clientProfile?.address || '',
                                        clientProfile?.city || '',
                                        clientProfile?.zip_code || ''
                                    )}
                                </p>
                            )}
                        </div>

                        {isEditing && (
                            <div className={getAddressGridClasses()}>
                                <div>
                                    <label className="text-white/60 font-light text-sm">City</label>
                                    <input
                                        type="text"
                                        value={editedProfile.city || ''}
                                        onChange={(e) => handleChange('city', e.target.value)}
                                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white font-light focus:outline-none focus:border-white/40 text-sm md:text-base"
                                        placeholder="City"
                                    />
                                </div>
                                <div>
                                    <label className="text-white/60 font-light text-sm">ZIP Code</label>
                                    <input
                                        type="text"
                                        value={editedProfile.zip_code || ''}
                                        onChange={(e) => handleChange('zip_code', e.target.value)}
                                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white font-light focus:outline-none focus:border-white/40 text-sm md:text-base"
                                        placeholder="ZIP Code"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h3 className="text-lg md:text-xl font-light text-white mb-4">Loyalty Information</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-white/60 font-light text-sm">Member Since</label>
                            <p className="text-white font-light text-base md:text-lg">
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
                            <p className="text-white font-light text-base md:text-lg">{clientProfile?.total_points || 0}</p>
                        </div>
                        <div>
                            <label className="text-white/60 font-light text-sm">Current Tier</label>
                            <p className="text-white font-light text-base md:text-lg capitalize">{clientProfile?.current_tier || 'bronze'}</p>
                        </div>
                        <div>
                            <label className="text-white/60 font-light text-sm">Lifetime Value</label>
                            <p className="text-white font-light text-base md:text-lg">{formatCurrency(stats.totalSpent)}</p>
                        </div>
                    </div>

                    {isEditing ? (
                        <div className={`flex gap-3 mt-6 ${isMobile ? 'flex-col' : ''}`}>
                            <button
                                onClick={handleSave}
                                disabled={isLoading}
                                className={`${isMobile ? 'w-full' : 'flex-1'} bg-white text-black py-3 rounded-lg hover:bg-white/90 transition-all duration-300 font-light disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base`}
                            >
                                {isLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={isLoading}
                                className={`${isMobile ? 'w-full' : 'flex-1'} border border-white/20 text-white/60 py-3 rounded-lg hover:bg-white/10 hover:text-white transition-all duration-300 font-light disabled:opacity-50 text-sm md:text-base`}
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className={`w-full mt-6 border border-white/20 text-white/60 py-3 rounded-lg hover:bg-white/10 hover:text-white transition-all duration-300 font-light text-sm md:text-base`}
                        >
                            Edit Profile
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};