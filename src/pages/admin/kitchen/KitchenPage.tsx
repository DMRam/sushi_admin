import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '../../../firebase/firebase';
import { CheckCircle, Clock, Package, RefreshCw, Plus, X, Store } from 'lucide-react';
import { useProducts } from '../../../context/ProductsContext';
import type { Product } from '../../../types/types';
import OrderQueue from './OrderQueue';
import OrderPreparation from './OrderPreparation';

type KitchenTab = 'queue' | 'preparation' | 'completed' | 'all';

type OrderSource = 'web' | 'uber' | 'clover' | 'manual';

type ManualOrderDraft = {
  orderType: 'pickup' | 'delivery';
  paymentStatus: 'paid' | 'cash' | 'unpaid' | 'unknown';
  customerName: string;
  customerPhone: string;
  address: string;
  specialInstructions: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
    notes: string;
  }>;
};

const defaultDraft = (): ManualOrderDraft => ({
  orderType: 'pickup',
  paymentStatus: 'cash',
  customerName: '',
  customerPhone: '',
  address: 'Pickup',
  specialInstructions: '',
  items: [],
});

export default function KitchenPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<KitchenTab>('queue');
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Manual order UI
  const [manualOpen, setManualOpen] = useState(false);
  const [draft, setDraft] = useState<ManualOrderDraft>(defaultDraft());
  const [savingManual, setSavingManual] = useState(false);

  const { products, loading: productsLoading, refreshProducts } = useProducts();

  const instructionsSteps = t('kitchen.instructions.steps', { returnObjects: true }) as string[];

  useEffect(() => {
    const cleanup = loadOrders();
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOrders = () => {
    setIsLoading(true);

    try {
      console.log('🍳 Kitchen: Setting up orders listener...');

      const ordersQuery = query(
        collection(db, 'orders'),
        where('paymentStatus', 'in', ['paid', 'cash', 'unpaid', 'unknown']), // keep broad
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        ordersQuery,
        (snapshot) => {
          const ordersData: any[] = [];

          snapshot.forEach((d) => {
            const data = d.data();

            let orderDate: Date;
            if (data.createdAt?.toDate) orderDate = data.createdAt.toDate();
            else if (data.createdAt) orderDate = new Date(data.createdAt);
            else orderDate = new Date();

            // Determine kitchen status
            let kitchenStatus = 'pending';
            if (data.kitchenStatus) kitchenStatus = data.kitchenStatus;
            else if (data.completedAt || data.kitchenCompletedAt) kitchenStatus = 'completed';
            else if (data.preparationStartedAt) kitchenStatus = 'preparing';

            // Determine source
            const source: OrderSource = (data.source || 'web') as OrderSource;

            ordersData.push({
              id: d.id,
              ...data,
              createdAt: orderDate,
              kitchenStatus,
              source,
            });
          });

          setOrders(ordersData);
          setIsLoading(false);
          setRefreshing(false);
          console.log('✅ Kitchen: Orders loaded:', ordersData.length);
        },
        (error) => {
          console.error('❌ Kitchen: Error fetching orders:', error);
          setIsLoading(false);
          setRefreshing(false);
        }
      );

      return () => {
        console.log('🧹 Kitchen: Cleaning up orders listener');
        unsubscribe();
      };
    } catch (error) {
      console.error('❌ Kitchen: Error setting up orders query:', error);
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProducts();
    loadOrders();
  };

  const startOrderPreparation = async (order: any) => {
    try {
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        kitchenStatus: 'preparing',
        preparationStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSelectedOrder({ ...order, kitchenStatus: 'preparing' });
      setActiveTab('preparation');
    } catch (error) {
      console.error('Error starting order preparation:', error);
      alert(t('kitchen.messages.errorUpdating'));
    }
  };

  const completeOrder = async (orderId: string) => {
    if (!window.confirm(t('kitchen.orderPreparation.confirmComplete'))) return;

    try {
      const orderRef = doc(db, 'orders', orderId);
      const completedAt = new Date();

      await updateDoc(orderRef, {
        kitchenStatus: 'completed',
        completedAt: Timestamp.fromDate(completedAt),
        kitchenCompletedAt: completedAt.toISOString(),
        updatedAt: serverTimestamp(),
      });

      setSelectedOrder(null);
      setActiveTab('queue');
      alert(t('kitchen.messages.orderCompleted'));
    } catch (error) {
      console.error('Error completing order:', error);
      alert(t('kitchen.messages.errorUpdating'));
    }
  };

  const getOrderStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = orders.filter((order) => {
      const orderDate = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
      return orderDate >= today;
    });

    const queueCount = todayOrders.filter((o) => !o.kitchenStatus || o.kitchenStatus === 'pending').length;
    const preparingCount = todayOrders.filter((o) => o.kitchenStatus === 'preparing').length;
    const readyCount = todayOrders.filter((o) => o.kitchenStatus === 'ready').length;
    const completedCount = todayOrders.filter((o) => o.kitchenStatus === 'completed').length;

    return { queueCount, preparingCount, readyCount, completedCount };
  };

  const stats = getOrderStats();
  const uberOrders = orders.filter((order) => String(order.source || '').toLowerCase() === 'uber');
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayUberOrders = uberOrders.filter((order) => {
    const orderDate = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
    return orderDate >= todayStart;
  });
  const pendingUberOrders = uberOrders.filter((order) => !order.kitchenStatus || order.kitchenStatus === 'pending').length;

  const filteredOrders = useMemo(() => {
    switch (activeTab) {
      case 'queue':
        return orders.filter((o) => !o.kitchenStatus || o.kitchenStatus === 'pending');
      case 'preparation':
        return orders.filter((o) => o.kitchenStatus === 'preparing');
      case 'completed':
        return orders.filter((o) => o.kitchenStatus === 'completed');
      case 'all':
      default:
        return orders;
    }
  }, [activeTab, orders]);

  // ---------------------------
  // Manual order helpers
  // ---------------------------
  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    (products as Product[]).forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const addProductToDraft = (productId: string) => {
    const p = productById.get(productId);
    if (!p) return;

    const existing = draft.items.find((it) => it.productId === productId && it.notes === '');
    if (existing) {
      setDraft({
        ...draft,
        items: draft.items.map((it) =>
          it === existing ? { ...it, quantity: Math.min(99, (it.quantity || 1) + 1) } : it
        ),
      });
      return;
    }

    setDraft({
      ...draft,
      items: [
        ...draft.items,
        {
          productId: p.id,
          name: p.name,
          quantity: 1,
          price: Number(p.sellingPrice || 0),
          notes: '',
        },
      ],
    });
  };

  const updateDraftItem = (index: number, patch: Partial<ManualOrderDraft['items'][number]>) => {
    setDraft({
      ...draft,
      items: draft.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    });
  };

  const removeDraftItem = (index: number) => {
    setDraft({ ...draft, items: draft.items.filter((_, i) => i !== index) });
  };

  const resetDraft = () => setDraft(defaultDraft());

  const saveManualOrder = async () => {
    if (draft.items.length === 0) {
      alert('Add at least 1 item.');
      return;
    }

    setSavingManual(true);
    try {
      const orderType = draft.orderType;
      const isPickup = orderType === 'pickup';

      const payload = {
        source: 'manual' as const,
        paymentStatus: draft.paymentStatus,
        kitchenStatus: 'pending' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        orderType,
        customerInfo: {
          name: draft.customerName || 'Walk-in',
          phone: draft.customerPhone || '',
          address: isPickup ? 'Pickup' : (draft.address || ''),
          specialInstructions: draft.specialInstructions || '',
        },

        items: draft.items.map((it) => ({
          productId: it.productId,
          name: it.name,
          quantity: Math.max(1, Number(it.quantity || 1)),
          price: Number(it.price || 0),
          notes: it.notes || '',
        })),
      };

      await addDoc(collection(db, 'orders'), payload);

      setManualOpen(false);
      resetDraft();
      alert('Manual order created ✅');
    } catch (e) {
      console.error(e);
      alert('Error creating manual order');
    } finally {
      setSavingManual(false);
    }
  };

  if (productsLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('kitchen.messages.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex justify-between items-start gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-light text-gray-900 tracking-wide">
                {t('kitchen.title')}
              </h1>
              <p className="text-gray-500 font-light mt-1 sm:mt-2 text-sm sm:text-base">
                {t('kitchen.subtitle')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  resetDraft();
                  setManualOpen(true);
                }}
                className="inline-flex items-center px-3 py-2 rounded-md bg-gray-900 text-white text-sm hover:bg-gray-800"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Manual Order
              </button>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                {t('kitchen.buttons.refresh')}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-500">{t('kitchen.stats.inQueue')}</p>
                <p className="text-2xl font-light text-gray-900">{stats.queueCount}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-500">{t('kitchen.stats.preparing')}</p>
                <p className="text-2xl font-light text-gray-900">{stats.preparingCount}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Package className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-500">{t('kitchen.stats.ready')}</p>
                <p className="text-2xl font-light text-gray-900">{stats.readyCount}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-500">{t('kitchen.stats.completed')}</p>
                <p className="text-2xl font-light text-gray-900">{stats.completedCount}</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-medium">{stats.completedCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-lg bg-[#06c167]/10 text-[#067a46] flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-medium text-gray-900">Uber Eats orders</h2>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                      Credentials pending
                    </span>
                  </div>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                    Placeholder ready for Uber Eats. Once the API credentials and webhook are provided, incoming Uber orders can be normalized into the same kitchen queue as web, Clover, and manual orders.
                  </p>
                </div>
              </div>
              <div className="grid min-w-[180px] grid-cols-2 gap-2 rounded-lg bg-gray-50 p-3 text-center">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Today</p>
                  <p className="mt-1 text-xl font-light text-gray-900">{todayUberOrders.length}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Queue</p>
                  <p className="mt-1 text-xl font-light text-gray-900">{pendingUberOrders}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#0f172a] border border-gray-900 rounded-lg p-4 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Next setup</p>
            <p className="mt-2 text-sm leading-6 text-white/75">
              Need Uber Eats developer credentials, restaurant/store ID, webhook signing secret, and the order payload sample before enabling live import.
            </p>
          </div>
        </div>

        {/* Kitchen Instructions */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">{t('kitchen.instructions.title')}</h3>
              <div className="mt-1 text-sm text-blue-700">
                <ol className="list-decimal pl-5 space-y-1">
                  {instructionsSteps.map((step: string, index: number) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-2 sm:space-x-4 lg:space-x-8 px-3 sm:px-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('queue')}
                className={`py-3 sm:py-4 px-1 sm:px-2 border-b-2 font-light text-sm tracking-wide transition-all duration-300 whitespace-nowrap ${activeTab === 'queue'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {t('kitchen.tabs.queue')} ({stats.queueCount})
              </button>

              <button
                onClick={() => setActiveTab('preparation')}
                className={`py-3 sm:py-4 px-1 sm:px-2 border-b-2 font-light text-sm tracking-wide transition-all duration-300 whitespace-nowrap ${activeTab === 'preparation'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                disabled={!selectedOrder}
              >
                {selectedOrder
                  ? `${t('kitchen.orderPreparation.preparingOrder')} #${selectedOrder.id?.slice(-4)}`
                  : t('kitchen.tabs.preparation')}
              </button>

              <button
                onClick={() => setActiveTab('completed')}
                className={`py-3 sm:py-4 px-1 sm:px-2 border-b-2 font-light text-sm tracking-wide transition-all duration-300 whitespace-nowrap ${activeTab === 'completed'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {t('kitchen.tabs.completed')} ({stats.completedCount})
              </button>

              <button
                onClick={() => setActiveTab('all')}
                className={`py-3 sm:py-4 px-1 sm:px-2 border-b-2 font-light text-sm tracking-wide transition-all duration-300 whitespace-nowrap ${activeTab === 'all'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {t('kitchen.tabs.all')} ({orders.length})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6">
            {activeTab === 'preparation' && selectedOrder ? (
              <OrderPreparation
                order={selectedOrder}
                products={products as Product[]}
                onComplete={() => completeOrder(selectedOrder.id)}
                onCancel={() => {
                  setSelectedOrder(null);
                  setActiveTab('queue');
                }}
              />
            ) : (
              <OrderQueue
                orders={filteredOrders}
                onSelectOrder={startOrderPreparation}
                activeTab={activeTab}
              />
            )}
          </div>
        </div>
      </div>

      {/* Manual Order Modal */}
      {manualOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-xl border border-gray-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <div className="text-lg font-medium text-gray-900">Create Manual Order</div>
                <div className="text-sm text-gray-500">This goes into the same kitchen queue.</div>
              </div>
              <button
                onClick={() => setManualOpen(false)}
                className="p-2 rounded hover:bg-gray-100 text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-0">
              {/* Left: order info */}
              <div className="p-5 border-b md:border-b-0 md:border-r">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Order Type</label>
                    <select
                      className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                      value={draft.orderType}
                      onChange={(e) => {
                        const v = e.target.value as 'pickup' | 'delivery';
                        setDraft({
                          ...draft,
                          orderType: v,
                          address: v === 'pickup' ? 'Pickup' : draft.address,
                        });
                      }}
                    >
                      <option value="pickup">Pickup</option>
                      <option value="delivery">Delivery</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">Payment</label>
                    <select
                      className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                      value={draft.paymentStatus}
                      onChange={(e) => setDraft({ ...draft, paymentStatus: e.target.value as any })}
                    >
                      <option value="cash">Cash</option>
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs text-gray-500">Customer Name</label>
                    <input
                      className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                      value={draft.customerName}
                      onChange={(e) => setDraft({ ...draft, customerName: e.target.value })}
                      placeholder="Walk-in (optional)"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">Phone</label>
                    <input
                      className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                      value={draft.customerPhone}
                      onChange={(e) => setDraft({ ...draft, customerPhone: e.target.value })}
                      placeholder="optional"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">Address</label>
                    <input
                      className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                      value={draft.orderType === 'pickup' ? 'Pickup' : draft.address}
                      disabled={draft.orderType === 'pickup'}
                      onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                      placeholder="delivery address"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs text-gray-500">Special Instructions</label>
                    <textarea
                      className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                      rows={3}
                      value={draft.specialInstructions}
                      onChange={(e) => setDraft({ ...draft, specialInstructions: e.target.value })}
                      placeholder="Allergy, no mayo, etc..."
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-sm font-medium text-gray-900 mb-2">Items</div>

                  {draft.items.length === 0 ? (
                    <div className="text-sm text-gray-500 bg-gray-50 border rounded-md p-3">
                      No items yet. Add products from the right panel.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {draft.items.map((it, idx) => (
                        <div key={`${it.productId}-${idx}`} className="border rounded-md p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 truncate">{it.name}</div>
                              <div className="text-xs text-gray-500">ID: {it.productId.slice(-6)}</div>
                            </div>

                            <button
                              className="text-xs text-red-600 hover:underline"
                              onClick={() => removeDraftItem(idx)}
                            >
                              Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mt-3">
                            <div>
                              <label className="text-xs text-gray-500">Qty</label>
                              <input
                                type="number"
                                min={1}
                                max={99}
                                className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
                                value={it.quantity}
                                onChange={(e) => updateDraftItem(idx, { quantity: Number(e.target.value) })}
                              />
                            </div>

                            <div>
                              <label className="text-xs text-gray-500">Price</label>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
                                value={it.price}
                                onChange={(e) => updateDraftItem(idx, { price: Number(e.target.value) })}
                              />
                            </div>

                            <div>
                              <label className="text-xs text-gray-500">Notes</label>
                              <input
                                className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
                                value={it.notes}
                                onChange={(e) => updateDraftItem(idx, { notes: e.target.value })}
                                placeholder="no sauce..."
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: product picker */}
              <div className="p-5">
                <div className="text-sm font-medium text-gray-900 mb-2">Add Products</div>
                <div className="text-xs text-gray-500 mb-3">
                  Click a product to add it. You can adjust qty/notes on the left.
                </div>

                <div className="max-h-[420px] overflow-auto border rounded-md">
                  {(products as Product[]).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addProductToDraft(p.id)}
                      className="w-full text-left px-3 py-3 border-b hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{p.name}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {p.kitchen?.priorityNotes ? `⚠️ ${p.kitchen.priorityNotes}` : p.category || ''}
                          </div>
                        </div>
                        <div className="text-sm text-gray-700">${Number(p.sellingPrice || 0).toFixed(2)}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2 mt-4">
                  <button
                    onClick={() => {
                      resetDraft();
                    }}
                    className="px-3 py-2 rounded-md border text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Reset
                  </button>

                  <button
                    disabled={savingManual}
                    onClick={saveManualOrder}
                    className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-60"
                  >
                    {savingManual ? 'Saving...' : 'Create Order'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
