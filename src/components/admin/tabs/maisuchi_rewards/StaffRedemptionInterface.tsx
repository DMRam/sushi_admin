import { useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    Copy,
    Gift,
    Search,
    ShieldCheck,
    TicketCheck,
    UserRound,
} from 'lucide-react';

import { OwnerRewardsService } from './services/OwnerRewardsService';

interface StaffRedemptionInterfaceProps {
    staffId: string;
}

function formatDate(value?: string | null) {
    if (!value) return 'Not recorded';

    return new Intl.DateTimeFormat('en-CA', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

function rewardLabel(reward: any) {
    if (!reward) return 'Reward';
    const searchableText = `${reward.name || ''} ${reward.description || ''} ${reward.free_item_name || ''}`.toLowerCase();

    if (searchableText.includes('delivery')) return 'Free delivery';
    if (searchableText.includes('welcome') || searchableText.includes('bienvenue')) return 'Welcome reward';
    if (reward.type === 'discount') {
        const discount = Number(reward.discount_percentage || 0);
        return discount > 0 ? `${discount}% discount` : 'Staff-applied offer';
    }
    if (reward.type === 'free_item') return reward.free_item_name ? `Free ${reward.free_item_name}` : 'Free item';
    if (reward.type === 'birthday') return 'Birthday reward';
    return 'Special reward';
}

export function StaffRedemptionInterface({ staffId }: StaffRedemptionInterfaceProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [redeeming, setRedeeming] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async () => {
        if (!searchTerm.trim()) return;

        setLoading(true);
        setMessage(null);
        setHasSearched(true);

        const results = await OwnerRewardsService.searchRewardsForStaff(searchTerm.trim());
        setSearchResults(results);
        setLoading(false);
    };

    const handleRedeem = async (redemptionCode: string, rewardName: string, customerName: string) => {
        const confirmed = window.confirm(
            `Redeem ${rewardName} for ${customerName}?\n\nThis will mark code ${redemptionCode} as used and it cannot be redeemed again.`,
        );

        if (!confirmed) return;

        setRedeeming(redemptionCode);
        setMessage(null);

        const result = await OwnerRewardsService.redeemRewardInPerson(redemptionCode, staffId);

        if (result.success) {
            setMessage({ type: 'success', text: `Reward redeemed for ${result.rewardDetails?.user?.full_name || customerName}.` });
            await handleSearch();
        } else {
            setMessage({ type: 'error', text: `Failed to redeem: ${result.error}` });
        }

        setRedeeming(null);
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    };

    const handleCopy = async (code: string) => {
        await navigator.clipboard.writeText(code);
        setCopiedCode(code);
        window.setTimeout(() => setCopiedCode(''), 1400);
    };

    const unusedCount = searchResults.filter((result) => !result.is_used).length;
    const usedCount = searchResults.filter((result) => result.is_used).length;

    return (
        <div className="space-y-5">
            <section className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E62B2B]">
                            Reward validation
                        </p>
                        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                            Redeem customer rewards
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            Search by reward code, customer name, or email. Redeeming a reward marks the code as used immediately.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:min-w-[360px]">
                        <Metric icon={TicketCheck} label="Ready" value={String(unusedCount)} />
                        <Metric icon={ShieldCheck} label="Used" value={String(usedCount)} />
                    </div>
                </div>
            </section>

            <section className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Reward code, customer name, or email"
                            className="h-12 w-full border border-slate-300 bg-white pl-12 pr-4 text-base font-medium text-slate-950 outline-none transition focus:border-[#E62B2B] focus:ring-4 focus:ring-[#E62B2B]/10"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={loading || !searchTerm.trim()}
                        className="inline-flex h-12 items-center justify-center gap-2 bg-[#E62B2B] px-6 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#cf2525] disabled:cursor-not-allowed disabled:bg-slate-300"
                        type="button"
                    >
                        <Search className="h-4 w-4" />
                        {loading ? 'Searching' : 'Search'}
                    </button>
                </div>

                <div className="mt-4 border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                    QR scanning can be added here later. For production today, staff can validate by typing or pasting the code shown in the client app.
                </div>
            </section>

            {message && (
                <div
                    className={`flex items-start gap-3 border p-4 text-sm font-medium ${
                        message.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                >
                    {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    {message.text}
                </div>
            )}

            {searchResults.length > 0 && (
                <div className="grid gap-3">
                    {searchResults.map((result) => {
                        const reward = Array.isArray(result.reward) ? result.reward[0] : result.reward;
                        const user = Array.isArray(result.user) ? result.user[0] : result.user;
                        const customerName = user?.full_name || 'Unknown customer';
                        const customerEmail = user?.email || 'No email recorded';
                        const rewardName = reward?.name || 'Reward';
                        const code = result.redemption_code || '';

                        return (
                            <article key={result.id} className="border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
                                    <div className="grid gap-4 md:grid-cols-[1fr_1fr_220px]">
                                        <div className="flex gap-3">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#E62B2B]/10 text-[#E62B2B]">
                                                <UserRound className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-950">{customerName}</p>
                                                <p className="truncate text-sm text-slate-500">{customerEmail}</p>
                                                <p className="mt-1 text-xs text-slate-400">Claimed {formatDate(result.claimed_at)}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-slate-100 text-slate-700">
                                                <Gift className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-950">{rewardName}</p>
                                                <p className="text-sm text-slate-500">{rewardLabel(reward)}</p>
                                                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{reward?.description || 'No description recorded'}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`inline-flex px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                                                        result.is_used
                                                            ? 'bg-slate-100 text-slate-600'
                                                            : 'bg-emerald-50 text-emerald-700'
                                                    }`}
                                                >
                                                    {result.is_used ? 'Used' : 'Ready'}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-xs text-slate-400">
                                                {result.is_used ? `Used ${formatDate(result.used_at)}` : 'Single-use code'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
                                        <button
                                            onClick={() => handleCopy(code)}
                                            className="inline-flex items-center justify-center gap-2 border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                                            type="button"
                                        >
                                            <Copy className="h-4 w-4" />
                                            {copiedCode === code ? 'Copied' : code}
                                        </button>

                                        {!result.is_used ? (
                                            <button
                                                onClick={() => handleRedeem(code, rewardName, customerName)}
                                                disabled={redeeming === code}
                                                className="inline-flex items-center justify-center gap-2 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E62B2B] disabled:cursor-not-allowed disabled:bg-slate-300"
                                                type="button"
                                            >
                                                <TicketCheck className="h-4 w-4" />
                                                {redeeming === code ? 'Redeeming' : 'Redeem now'}
                                            </button>
                                        ) : (
                                            <div className="inline-flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400">
                                                <CheckCircle2 className="h-4 w-4" />
                                                Already used
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {hasSearched && searchResults.length === 0 && !loading && (
                <div className="border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                    No reward claims found for that search.
                </div>
            )}
        </div>
    );
}

function Metric({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof TicketCheck;
    label: string;
    value: string;
}) {
    return (
        <div className="border border-slate-200 bg-slate-50 p-4">
            <Icon className="h-5 w-5 text-[#E62B2B]" />
            <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        </div>
    );
}
