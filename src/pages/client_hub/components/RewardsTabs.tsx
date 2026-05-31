import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Gift,
  History,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  Star,
} from "lucide-react";

import { ProfileTab } from "./ProfileTab";
import { RewardsTab } from "./RewardsTab";
import { BookingTab } from "./BookingTab";
import type { OrderDetails, ProfileTabProps } from "../interfaces/IClientHub";
import { ProfileService } from "../service/ProfileService";
import type { ClientProfile } from "../../../types/types";

export type PointsHistoryItem = {
  id: string;
  user_id?: string;
  order_id?: string | null;
  type?: string;
  points: number;
  description: string;
  created_at: string;
};

type RewardsTabsProps = ProfileTabProps & {
  isMobile?: boolean;
  pointsBalance?: number;
  pointsHistory: PointsHistoryItem[];
};

function getOrderTotal(order: any): number {
  return (
    Number(order?.final_total) ||
    Number(order?.totals?.finalTotal) ||
    Number(order?.totals?.final_total) ||
    Number(order?.amount) ||
    0
  );
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EmptyState({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof Gift;
  title: string;
  detail: string;
}) {
  return (
    <div className="border border-white/10 bg-white/[0.03] p-8 text-center">
      <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center bg-white/[0.06] text-[#F45D4F]">
        <Icon size={24} />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/50">{detail}</p>
    </div>
  );
}

export const RewardsTabs = ({
  clientProfile,
  setClientProfile,
  formatCurrency,
  stats,
  loadingData,
  activeTab,
  setActiveTab,
  recentOrders,
  pointsHistory,
  formatDate,
  quickReorderItems,
  isMobile,
  pointsBalance,
}: RewardsTabsProps) => {
  const navigate = useNavigate();

  const derivedBalance = useMemo(() => {
    if (typeof pointsBalance === "number") return pointsBalance;
    return (pointsHistory || []).reduce((sum, item) => sum + (Number(item.points) || 0), 0);
  }, [pointsBalance, pointsHistory]);

  const getPointsForOrder = (orderId: string): number => {
    const entry = (pointsHistory || []).find(
      (h) => h.order_id === orderId && (h.type === "order" || !h.type)
    );
    if (entry) return Number(entry.points) || 0;

    const order = (recentOrders || []).find((o) => o.id === orderId);
    return order ? Math.floor(getOrderTotal(order)) : 0;
  };

  const handleProfileUpdate = async (
    updatedProfile: Partial<ClientProfile>
  ): Promise<boolean> => {
    if (!clientProfile) return false;

    try {
      const result = await ProfileService.updateProfile(clientProfile.id, updatedProfile);
      if (!result.success) return false;

      const updated = await ProfileService.getProfile(clientProfile.id);
      if (updated) setClientProfile(updated);
      return true;
    } catch (error) {
      console.error("Profile update error:", error);
      return false;
    }
  };

  const handleQuickReorder = async (productId: string) => {
    console.log("Adding product to cart:", productId);
  };

  const handleReorderEntireOrder = async (order: OrderDetails) => {
    console.log("Reordering entire order:", order.id);
  };

  if (loadingData) {
    return (
      <section className="border border-white/10 bg-white/[0.035] p-10 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-[#F45D4F]" />
        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-white/45">
          Loading account data
        </p>
      </section>
    );
  }

  return (
    <section className="border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/25 sm:p-6">
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-3">
            <ActionButton icon={ShoppingBag} label="Order food" onClick={() => navigate("/order")} />
            <ActionButton icon={CalendarDays} label="Book a table" onClick={() => setActiveTab("booking")} />
            <ActionButton icon={RefreshCw} label="Quick reorder" onClick={() => setActiveTab("quick-reorder")} />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <Panel title="Recent orders" icon={ReceiptText}>
              {recentOrders?.length ? (
                <div className="space-y-3">
                  {recentOrders.slice(0, isMobile ? 2 : 4).map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      points={getPointsForOrder(order.id)}
                      formatCurrency={formatCurrency}
                      onReorder={() => handleReorderEntireOrder(order)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState icon={ReceiptText} title="No orders yet" detail="Your online order history will appear here." />
              )}
            </Panel>

            <Panel title="Rewards wallet" icon={Star}>
              <div className="border border-[#F45D4F]/35 bg-[#F45D4F]/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ff8a7b]">
                  Available points
                </p>
                <p className="mt-2 text-5xl font-semibold text-white">{Number(derivedBalance || 0)}</p>
                <p className="mt-3 text-sm text-white/56">
                  Points can be redeemed for MaiSushi rewards when available.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("rewards")}
                  className="mt-5 inline-flex items-center gap-2 bg-[#F45D4F] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#de4f43]"
                >
                  <Gift size={18} />
                  Browse rewards
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MiniStat label="Monthly orders" value={`${stats.monthlyOrders}`} />
                <MiniStat label="Average order" value={formatCurrency(stats.averageOrder || 0)} />
              </div>
            </Panel>
          </div>
        </div>
      )}

      {activeTab === "orders" && (
        <Panel title="Order history" icon={ReceiptText}>
          {recentOrders?.length ? (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <article key={order.id} className="border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-white">Order #{order.id.slice(-8)}</p>
                      <p className="mt-1 text-sm text-white/50">{formatDateTime(order.created_at)}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xl font-semibold text-white">{formatCurrency(getOrderTotal(order))}</p>
                      <p className="text-sm capitalize text-[#ff8a7b]">{(order as any).status ?? "completed"}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/42">Items</p>
                      <div className="space-y-1 text-sm text-white/62">
                        {(order.items || []).map((item, index) => (
                          <div key={index} className="flex justify-between gap-3">
                            <span className="min-w-0 truncate">{item.quantity}x {item.name}</span>
                            <span className="shrink-0">{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/42">Details</p>
                      <div className="space-y-1 text-sm text-white/62">
                        <p>Type: {(order as any).type ?? "order"}</p>
                        <p>Items: {(order.items || []).length}</p>
                        {getPointsForOrder(order.id) > 0 && (
                          <p className="text-[#ff8a7b]">Points earned: +{getPointsForOrder(order.id)}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleReorderEntireOrder(order)}
                    className="mt-4 inline-flex items-center gap-2 border border-white/12 px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/8 hover:text-white"
                  >
                    <RefreshCw size={17} />
                    Reorder
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon={ReceiptText} title="No orders yet" detail="Completed online orders will appear here." />
          )}
        </Panel>
      )}

      {activeTab === "booking" && clientProfile && (
        <BookingTab clientProfile={clientProfile} />
      )}

      {activeTab === "quick-reorder" && (
        <Panel title="Quick reorder" icon={RefreshCw}>
          {quickReorderItems?.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {quickReorderItems.map((item) => (
                <article key={item.productId} className="border border-white/10 bg-black/20 p-4">
                  <div className="flex gap-3">
                    {item.image ? (
                      <img src={item.image} alt="" className="h-14 w-14 object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center bg-white/[0.06] text-[#F45D4F]">
                        <PackageCheck size={24} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 font-semibold text-white">{item.name}</h3>
                      <p className="mt-1 text-sm text-[#ff8a7b]">{formatCurrency(item.price)}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-white/50">
                    Ordered {item.orderCount} times · Last {formatDate(item.lastOrdered)}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleQuickReorder(item.productId)}
                    className="mt-4 w-full bg-[#F45D4F] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#de4f43]"
                  >
                    Add to cart
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon={RefreshCw} title="No reorder history yet" detail="Your frequent favorites will appear after a few orders." />
          )}
        </Panel>
      )}

      {activeTab === "points" && (
        <Panel title="Points history" icon={History}>
          {pointsHistory?.length ? (
            <div className="space-y-3">
              {pointsHistory.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 border border-white/10 bg-black/20 p-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{item.description}</p>
                    <p className="mt-1 text-sm text-white/48">{formatDate(item.created_at)}</p>
                    {item.order_id && <p className="mt-1 text-xs text-white/35">Order #{item.order_id.slice(-8)}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xl font-semibold text-[#ff8a7b]">
                      {item.points >= 0 ? "+" : ""}{item.points} pts
                    </p>
                    <p className="text-xs uppercase tracking-[0.12em] text-white/38">{item.type || "activity"}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={History} title="No points activity yet" detail="Earn points when orders are linked to your account." />
          )}
        </Panel>
      )}

      {activeTab === "rewards" && (
        <div className="[&_div.rounded-xl]:rounded-none [&_div.rounded-lg]:rounded-none [&_button.rounded-lg]:rounded-none">
          <RewardsTab isMobile={isMobile} />
        </div>
      )}

      {activeTab === "profile" && clientProfile && (
        <div className="[&_div.rounded-xl]:rounded-none [&_div.rounded-lg]:rounded-none [&_button.rounded-lg]:rounded-none">
          <ProfileTab
            clientProfile={clientProfile}
            formatCurrency={formatCurrency}
            stats={stats}
            onProfileUpdate={handleProfileUpdate}
            isMobile={isMobile}
          />
        </div>
      )}
    </section>
  );
};

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Gift;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group border border-white/10 bg-black/20 p-5 text-left transition hover:border-[#F45D4F]/45 hover:bg-[#F45D4F]/10"
    >
      <div className="inline-flex h-11 w-11 items-center justify-center bg-white/[0.06] text-[#F45D4F] transition group-hover:bg-[#F45D4F] group-hover:text-white">
        <Icon size={22} />
      </div>
      <p className="mt-4 text-lg font-semibold text-white">{label}</p>
    </button>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Gift;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Icon size={20} className="text-[#F45D4F]" />
        <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-black/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/42">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function OrderRow({
  order,
  points,
  formatCurrency,
  onReorder,
}: {
  order: OrderDetails;
  points: number;
  formatCurrency: (amount: number) => string;
  onReorder: () => void;
}) {
  return (
    <article className="flex flex-col gap-3 border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-semibold text-white">
          {order.items?.slice(0, 2).map((item) => item.name).join(", ") || `Order #${order.id.slice(-8)}`}
          {order.items?.length > 2 && ` +${order.items.length - 2} more`}
        </p>
        <p className="mt-1 text-sm text-white/48">{formatDateTime(order.created_at)}</p>
        {points > 0 && <p className="mt-1 text-sm text-[#ff8a7b]">+{points} pts</p>}
      </div>
      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
        <p className="font-semibold text-white">{formatCurrency(getOrderTotal(order))}</p>
        <button
          type="button"
          onClick={onReorder}
          className="text-sm font-semibold text-white/58 transition hover:text-white"
        >
          Reorder
        </button>
      </div>
    </article>
  );
}
