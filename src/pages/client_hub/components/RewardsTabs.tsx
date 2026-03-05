import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ProfileTab } from "./ProfileTab";
import { RewardsTab } from "./RewardsTab";
import type { OrderDetails, ProfileTabProps } from "../interfaces/IClientHub";
import { ProfileService } from "../service/ProfileService";
import type { ClientProfile } from "../../../types/types";

// ✅ FIX: Ensure points history shape matches what UI uses
export type PointsHistoryItem = {
  id: string;
  user_id?: string;
  order_id?: string | null;
  type?: string; // "order" | "redeem" | "adjustment" | ...
  points: number;
  description: string;
  created_at: string;
};

type RewardsTabsProps = ProfileTabProps & {
  isMobile?: boolean;
  /**
   * ✅ Optional but recommended:
   * pass your user_points.balance (or whatever you call it)
   */
  pointsBalance?: number;
  /**
   * If your ProfileTabProps already has pointsHistory typed differently,
   * this prop will still accept it safely (we cast below).
   */
  pointsHistory: PointsHistoryItem[];
};

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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleProfileUpdate = async (
    updatedProfile: Partial<ClientProfile>
  ): Promise<boolean> => {
    try {
      if (!clientProfile) return false;

      const result = await ProfileService.updateProfile(
        clientProfile.id,
        updatedProfile
      );

      if (result.success) {
        const updated = await ProfileService.getProfile(clientProfile.id);
        if (updated) setClientProfile(updated);
        return true;
      } else {
        console.error("❌ Profile update failed:", (result as any).error);
        return false;
      }
    } catch (error) {
      console.error("💥 Profile update error:", error);
      return false;
    }
  };

  // ✅ Derive balance if parent doesn't provide it
  const derivedBalance = useMemo(() => {
    if (typeof pointsBalance === "number") return pointsBalance;

    // fallback: sum history (works even without user_points)
    // Note: if your history stores both earns (+) and redeems (-), this is accurate.
    return (pointsHistory || []).reduce((sum, item) => sum + (Number(item.points) || 0), 0);
  }, [pointsBalance, pointsHistory]);

  const getOrderTotal = (order: any): number => {
    // supports multiple shapes:
    // - order.final_total (from SuccessPage / normalized)
    // - order.totals.finalTotal (from older model)
    // - order.amount (some schemas)
    return (
      Number(order?.final_total) ||
      Number(order?.totals?.finalTotal) ||
      Number(order?.totals?.final_total) ||
      Number(order?.amount) ||
      0
    );
  };

  // ✅ FIX: points per order should come from history first
  const getPointsForOrder = (orderId: string): number => {
    const entry = (pointsHistory || []).find(
      (h) => h.order_id === orderId && (h.type === "order" || !h.type)
    );
    if (entry) return Number(entry.points) || 0;

    // fallback: compute from order total if no history record yet
    const order = (recentOrders || []).find((o) => o.id === orderId);
    if (!order) return 0;
    return Math.floor(getOrderTotal(order));
  };

  const handleQuickReorder = async (productId: string) => {
    console.log("Adding product to cart:", productId);
  };

  const handleReorderEntireOrder = async (order: OrderDetails) => {
    console.log("Reordering entire order:", order.id);
  };

  // Responsive grid classes
  const getGridClasses = () => (isMobile ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 md:grid-cols-3 gap-4");
  const getQuickReorderGridClasses = () => (isMobile ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4");
  const getMainGridClasses = () => (isMobile ? "grid grid-cols-1 gap-6" : "grid grid-cols-1 lg:grid-cols-2 gap-8");
  const getOrdersGridClasses = () => (isMobile ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 md:grid-cols-2 gap-4");

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6 backdrop-blur-sm w-full overflow-hidden">
      {loadingData ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 border-4 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60 font-light">Loading your data...</p>
        </div>
      ) : (
        <div className="w-full">
          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6 md:space-y-8 w-full">
              {/* Quick Actions */}
              <div className={getGridClasses()}>
                <button
                  onClick={() => navigate("/menu")}
                  className="bg-emerald-500 text-white p-4 rounded-lg hover:bg-emerald-600 transition-all duration-300 font-light text-center flex flex-col items-center justify-center min-h-[100px] w-full"
                >
                  <div className="text-2xl mb-2">🍽️</div>
                  <span>Order Food</span>
                </button>

                <button
                  onClick={() => setActiveTab("quick-reorder")}
                  className="bg-blue-500 text-white p-4 rounded-lg hover:bg-blue-600 transition-all duration-300 font-light text-center flex flex-col items-center justify-center min-h-[100px] w-full"
                >
                  <div className="text-2xl mb-2">⚡</div>
                  <span>Quick Reorder</span>
                </button>

                <button
                  onClick={() => setActiveTab("rewards")}
                  className="bg-purple-500 text-white p-4 rounded-lg hover:bg-purple-600 transition-all duration-300 font-light text-center flex flex-col items-center justify-center min-h-[100px] w-full"
                >
                  <div className="text-2xl mb-2">🎁</div>
                  <span>Claim Rewards</span>
                </button>
              </div>

              <div className={getMainGridClasses()}>
                {/* Recent Orders */}
                <div className="w-full">
                  <h3 className="text-lg md:text-xl font-light text-white mb-4 flex items-center gap-2">
                    <span>📦</span>
                    Recent Orders
                  </h3>

                  {recentOrders?.length > 0 ? (
                    <div className="space-y-3 w-full">
                      {recentOrders.slice(0, isMobile ? 2 : 3).map((order) => {
                        const pointsEarned = getPointsForOrder(order.id);
                        return (
                          <div
                            key={order.id}
                            className="flex justify-between items-start p-3 md:p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300 group w-full"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-light text-sm md:text-base truncate">
                                {order.items?.slice(0, 2).map((item) => item.name).join(", ")}
                                {order.items?.length > 2 && ` +${order.items.length - 2} more`}
                              </p>
                              <p className="text-white/60 text-xs md:text-sm font-light">
                                {formatDateTime(order.created_at)}
                              </p>

                              <div className="flex items-center gap-2 md:gap-3 mt-1 flex-wrap">
                                <p className="text-white/40 text-xs font-light capitalize">
                                  {(order as any).type ?? "order"} • {(order as any).status ?? "completed"}
                                </p>

                                {pointsEarned > 0 && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-yellow-400 text-xs">⭐</span>
                                    <span className="text-yellow-400 text-xs font-medium">
                                      +{pointsEarned} pts
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0 ml-2 md:ml-4">
                              <p className="text-white font-light text-sm md:text-base">
                                {formatCurrency(getOrderTotal(order))}
                              </p>
                              <button
                                onClick={() => handleReorderEntireOrder(order)}
                                className="text-emerald-400 text-xs md:text-sm font-light opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap"
                              >
                                Reorder
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-white/60 font-light text-center py-4">No orders yet</p>
                  )}
                </div>

                {/* Rewards Preview */}
                <div className="w-full">
                  <h3 className="text-lg md:text-xl font-light text-white mb-4 flex items-center gap-2">
                    <span>🎁</span>
                    Rewards Preview
                  </h3>

                  <div className="space-y-4 w-full">
                    {/* Points Balance Card */}
                    <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-400/20 rounded-xl p-4 w-full">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
                        <div className="flex-1">
                          <h4 className="text-white font-light text-sm md:text-base">
                            Available Points
                          </h4>
                          <p className="text-emerald-400 text-xl md:text-2xl font-light mt-1">
                            {Number(derivedBalance || 0)} pts
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-white/60 text-xs md:text-sm">Ready to redeem</p>
                          <button
                            onClick={() => setActiveTab("rewards")}
                            className="mt-2 bg-emerald-500 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm hover:bg-emerald-600 transition-all duration-300 font-light"
                          >
                            View Rewards
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quick Rewards Grid (placeholder) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-400/20 rounded-lg p-3 w-full">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base md:text-lg">🍽️</span>
                          <h5 className="text-white font-light text-xs md:text-sm">Free Appetizer</h5>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-amber-400 text-xs">100 pts</span>
                          <span className="text-white/60 text-xs">Popular</span>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-400/20 rounded-lg p-3 w-full">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base md:text-lg">🚚</span>
                          <h5 className="text-white font-light text-xs md:text-sm">Free Delivery</h5>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-blue-400 text-xs">150 pts</span>
                          <span className="text-white/60 text-xs">Most Used</span>
                        </div>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="text-center w-full">
                      <button
                        onClick={() => setActiveTab("rewards")}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 font-light flex items-center justify-center gap-2 text-sm md:text-base"
                      >
                        <span>🎁</span>
                        <span className="truncate">View All Rewards</span>
                        <span>→</span>
                      </button>

                      <p className="text-white/40 text-xs mt-2">
                        {Number(derivedBalance || 0) > 0
                          ? `You have ${derivedBalance} points ready to redeem!`
                          : "Make your first order to start earning points!"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ORDERS */}
          {activeTab === "orders" && (
            <div className="w-full">
              <h3 className="text-lg md:text-xl font-light text-white mb-4">Order History</h3>

              {recentOrders?.length > 0 ? (
                <div className="space-y-4 w-full">
                  {recentOrders.map((order) => {
                    const pointsEarned = getPointsForOrder(order.id);

                    return (
                      <div
                        key={order.id}
                        className="bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300 overflow-hidden w-full"
                      >
                        <div className="p-3 md:p-4 border-b border-white/10">
                          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 w-full">
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-light text-sm md:text-base">
                                Order #{order.id.slice(-8)}
                              </p>
                              <p className="text-white/60 text-xs md:text-sm font-light">
                                {formatDateTime(order.created_at)}
                              </p>

                              {pointsEarned > 0 && (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-yellow-400 text-xs md:text-sm">⭐</span>
                                  <span className="text-yellow-400 text-xs md:text-sm font-medium">
                                    +{pointsEarned} points earned
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="text-right md:text-left">
                              <p className="text-white font-light text-sm md:text-base">
                                {formatCurrency(getOrderTotal(order))}
                              </p>
                              <p className="text-emerald-400 text-xs md:text-sm font-light capitalize">
                                {(order as any).status ?? "completed"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 md:p-4">
                          <div className={getOrdersGridClasses()}>
                            <div className="w-full">
                              <h4 className="text-white font-light text-sm md:text-base mb-2">Items</h4>
                              {(order.items || []).map((item, index) => (
                                <div key={index} className="flex justify-between text-white/60 text-xs md:text-sm w-full">
                                  <span className="flex-1 truncate mr-2">
                                    {item.quantity}x {item.name}
                                  </span>
                                  <span className="flex-shrink-0">
                                    {formatCurrency(item.price * item.quantity)}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="w-full">
                              <h4 className="text-white font-light text-sm md:text-base mb-2">Order Details</h4>
                              <div className="text-white/60 text-xs md:text-sm space-y-1">
                                <p>Type: {(order as any).type ?? "order"}</p>
                                {(order as any).delivery_address && (
                                  <p className="truncate">Address: {(order as any).delivery_address}</p>
                                )}
                                <p>Items: {(order.items || []).length}</p>
                                {pointsEarned > 0 && (
                                  <p className="text-yellow-400">Points Earned: +{pointsEarned}</p>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleReorderEntireOrder(order)}
                            className="mt-4 w-full md:w-auto bg-emerald-500 text-white px-4 md:px-6 py-2 rounded-lg hover:bg-emerald-600 transition-all duration-300 font-light text-sm md:text-base"
                          >
                            Reorder Entire Order
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-white/60 font-light text-center py-4">No orders yet</p>
              )}
            </div>
          )}

          {/* QUICK REORDER */}
          {activeTab === "quick-reorder" && (
            <div className="w-full">
              <h3 className="text-lg md:text-xl font-light text-white mb-4">Quick Reorder</h3>

              {quickReorderItems?.length > 0 ? (
                <div className={getQuickReorderGridClasses()}>
                  {quickReorderItems.map((item) => (
                    <div
                      key={item.productId}
                      className="bg-white/5 rounded-lg border border-white/10 p-3 md:p-4 hover:bg-white/10 transition-all duration-300 w-full"
                    >
                      <div className="flex items-start gap-2 md:gap-3 mb-3 w-full">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-base md:text-lg">🍽️</span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-light text-sm md:text-base line-clamp-2">{item.name}</h4>
                          <p className="text-emerald-400 font-light text-sm md:text-base">{formatCurrency(item.price)}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-white/60 text-xs md:text-sm mb-3 w-full">
                        <span className="truncate">Ordered {item.orderCount} times</span>
                        <span className="flex-shrink-0 ml-2">Last: {formatDate(item.lastOrdered)}</span>
                      </div>

                      <button
                        onClick={() => handleQuickReorder(item.productId)}
                        className="w-full bg-emerald-500 text-white py-2 rounded-lg hover:bg-emerald-600 transition-all duration-300 font-light text-sm md:text-base"
                      >
                        Add to Cart
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/60 font-light text-center py-4">No reorder history yet</p>
              )}
            </div>
          )}

          {/* POINTS */}
          {activeTab === "points" && (
            <div className="w-full">
              <h3 className="text-lg md:text-xl font-light text-white mb-4">Complete Points History</h3>

              {pointsHistory?.length > 0 ? (
                <div className="space-y-3 w-full">
                  {pointsHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start p-3 md:p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300 w-full"
                    >
                      <div className="flex-1 min-w-0 pr-2 md:pr-4">
                        <p className="text-white font-light text-sm md:text-base break-words">
                          {item.description}
                        </p>
                        <p className="text-white/60 text-xs md:text-sm font-light">
                          {formatDate(item.created_at)}
                        </p>

                        {item.order_id && (
                          <p className="text-white/40 text-xs">Order #{item.order_id.slice(-8)}</p>
                        )}
                      </div>

                      <div className="text-right flex-shrink-0 whitespace-nowrap">
                        <p className="text-emerald-400 font-light text-base md:text-lg">
                          {item.points >= 0 ? "+" : ""}
                          {item.points} pts
                        </p>
                        <p className="text-white/60 text-xs md:text-sm font-light capitalize">
                          {item.type || "activity"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/60 font-light text-center py-4">No points history yet</p>
              )}
            </div>
          )}

          {/* REWARDS */}
          {activeTab === "rewards" && <RewardsTab isMobile={isMobile} />}

          {/* PROFILE */}
          {activeTab === "profile" && clientProfile && (
            <ProfileTab
              clientProfile={clientProfile}
              formatCurrency={formatCurrency}
              stats={stats}
              onProfileUpdate={handleProfileUpdate}
              isMobile={isMobile}
            />
          )}
        </div>
      )}
    </div>
  );
};