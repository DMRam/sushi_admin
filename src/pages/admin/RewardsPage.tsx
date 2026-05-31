import { useMemo } from 'react';
import { Award, ShieldCheck, TicketCheck } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { StaffRedemptionInterface } from '../../components/admin/tabs/maisuchi_rewards/StaffRedemptionInterface';

export default function RewardsPage() {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();

  const staffId = useMemo(() => {
    return userProfile?.displayName || user?.email || user?.uid || 'Admin staff';
  }, [user?.email, user?.uid, userProfile?.displayName]);

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-950">
      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
        <section className="mb-4 border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E62B2B]">
                Loyalty desk
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Rewards control
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Validate client reward codes from the dashboard. Once staff redeems a code, it is locked and cannot be used again.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <StatusPill icon={TicketCheck} label="Redeem" />
              <StatusPill icon={ShieldCheck} label="Single use" />
              <StatusPill icon={Award} label="Loyalty" />
            </div>
          </div>
        </section>

        <StaffRedemptionInterface staffId={staffId} />
      </div>
    </div>
  );
}

function StatusPill({
  icon: Icon,
  label,
}: {
  icon: typeof TicketCheck;
  label: string;
}) {
  return (
    <div className="flex min-w-[112px] items-center justify-center gap-2 border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
      <Icon className="h-4 w-4 text-[#E62B2B]" />
      {label}
    </div>
  );
}
