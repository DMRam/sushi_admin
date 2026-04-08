import { useEffect, useMemo, useRef, useState } from "react";
import {
    subscribeToKitchenOrders,
    startPreparingOrder,
    markOrderReadyForPickup,
    notifyPickupAgain,
} from "./serviceFirestore";
import type { TableOrder, TableOrderSeat } from "./serviceTypes";

function money(value: number | null | undefined) {
    return `$${Number(value ?? 0).toFixed(2)}`;
}

function flattenItems(seats: TableOrderSeat[] = []) {
    return seats.flatMap((seat) =>
        (seat.items || []).map((item) => ({
            ...item,
            seatLabel: seat.label,
            seatType: seat.type,
        }))
    );
}

export default function KitchenTab() {
    const [orders, setOrders] = useState<TableOrder[]>([]);
    const lastKitchenCallCountRef = useRef<Record<string, number>>({});
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio("/sounds/kitchen-alert.mp3");
        audioRef.current.preload = "auto";
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeToKitchenOrders((incomingOrders) => {
            let shouldPlay = false;
            const nextCounts: Record<string, number> = { ...lastKitchenCallCountRef.current };

            incomingOrders.forEach((order) => {
                const currentCount = Number((order as any).kitchenCallCount ?? 0);
                const previousCount = Number(lastKitchenCallCountRef.current[order.id] ?? 0);

                if (currentCount > previousCount) {
                    shouldPlay = true;
                }

                nextCounts[order.id] = currentCount;
            });

            lastKitchenCallCountRef.current = nextCounts;

            if (shouldPlay && audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(() => {
                    // browser may block autoplay until user interacts once
                });
            }

            setOrders(incomingOrders);
        });

        return () => unsubscribe();
    }, []);

    const activeOrders = useMemo(() => {
        return [...orders].sort((a, b) => {
            const aTime = a.sentToKitchenAt?.seconds ?? 0;
            const bTime = b.sentToKitchenAt?.seconds ?? 0;
            return aTime - bTime;
        });
    }, [orders]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Kitchen Queue</h2>
                    <p className="text-sm text-gray-500">
                        Incoming orders, preparation status, and pickup handoff.
                    </p>
                </div>

                <div className="rounded-2xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
                    Active orders: {activeOrders.length}
                </div>
            </div>

            {activeOrders.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
                    No kitchen orders right now.
                </div>
            ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                    {activeOrders.map((order) => {
                        const items = flattenItems(order.seats);
                        const isReady = order.status === "ready_for_pickup";

                        return (
                            <section
                                key={order.id}
                                className="rounded-3xl border border-gray-200 bg-white shadow-sm"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-semibold text-gray-900">
                                                Table {order.tableNumber}
                                            </h3>
                                            <span
                                                className={[
                                                    "rounded-full px-3 py-1 text-xs font-semibold capitalize",
                                                    order.status === "sent_to_kitchen"
                                                        ? "bg-amber-100 text-amber-700"
                                                        : order.status === "preparing"
                                                        ? "bg-blue-100 text-blue-700"
                                                        : "bg-green-100 text-green-700",
                                                ].join(" ")}
                                            >
                                                {order.status.replaceAll("_", " ")}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm text-gray-500">
                                            {order.totalItems} items · Total {money(order.total)}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {order.status === "sent_to_kitchen" && (
                                            <button
                                                onClick={() => startPreparingOrder(order.id)}
                                                className="rounded-2xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                                                type="button"
                                            >
                                                Start preparing
                                            </button>
                                        )}

                                        {!isReady ? (
                                            <button
                                                onClick={() => markOrderReadyForPickup(order.id)}
                                                className="rounded-2xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-700"
                                                type="button"
                                            >
                                                Ready for pickup
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => notifyPickupAgain(order.id)}
                                                className="rounded-2xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-700"
                                                type="button"
                                            >
                                                Notify waitress again
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3 p-5">
                                    {items.map((item, index) => (
                                        <div
                                            key={`${item.productId}-${index}`}
                                            className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-base font-semibold text-gray-900">
                                                            {item.quantity} × {item.kitchen?.displayNameKitchen || item.productName}
                                                        </span>

                                                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                                                            {item.seatLabel}
                                                        </span>
                                                    </div>

                                                    {item.description ? (
                                                        <p className="mt-2 text-sm text-gray-600">
                                                            {item.description}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>

                                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                {item.kitchen?.innerIngredients?.length ? (
                                                    <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                                                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                            Ingredients
                                                        </div>
                                                        <div className="mt-1 text-sm text-gray-700">
                                                            {item.kitchen.innerIngredients.join(", ")}
                                                        </div>
                                                    </div>
                                                ) : null}

                                                {item.kitchen?.protein?.length ? (
                                                    <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                                                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                            Protein
                                                        </div>
                                                        <div className="mt-1 text-sm text-gray-700">
                                                            {item.kitchen.protein.join(", ")}
                                                        </div>
                                                    </div>
                                                ) : null}

                                                {item.kitchen?.sauces?.length ? (
                                                    <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                                                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                            Sauces
                                                        </div>
                                                        <div className="mt-1 text-sm text-gray-700">
                                                            {item.kitchen.sauces.join(", ")}
                                                        </div>
                                                    </div>
                                                ) : null}

                                                {item.kitchen?.finishes?.length ? (
                                                    <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                                                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                            Finish
                                                        </div>
                                                        <div className="mt-1 text-sm text-gray-700">
                                                            {item.kitchen.finishes.join(", ")}
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>

                                            {item.notes ? (
                                                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                                    Note: {item.notes}
                                                </div>
                                            ) : null}

                                            {item.kitchen?.requiresFrying ? (
                                                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                                                    Requires frying
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}