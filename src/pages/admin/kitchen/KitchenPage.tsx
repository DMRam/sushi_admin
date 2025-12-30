import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import OrderQueue from './OrderQueue';
import OrderPreparation from './OrderPreparation';
import { 
  collection, 
  onSnapshot,
  orderBy,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../../firebase/firebase';
import { CheckCircle, Clock, Package, AlertCircle, RefreshCw } from 'lucide-react';
import { useProducts } from '../../../context/ProductsContext';
import type { Product } from '../../../types/types';

export default function KitchenPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'queue' | 'preparation' | 'completed' | 'all'>('queue');
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { products, loading: productsLoading, refreshProducts } = useProducts();

  // Get translation arrays safely
  const instructionsSteps = t('kitchen.instructions.steps', { returnObjects: true }) as string[];

  // Fetch paid orders from Firebase
  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);
    
    try {
      console.log('🍳 Kitchen: Setting up orders listener...');
      
      // Query ONLY paid orders (no kitchen status filter)
      const ordersQuery = query(
        collection(db, 'orders'),
        where('paymentStatus', '==', 'paid'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
        const ordersData: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Convert Firestore timestamp to Date
          let orderDate;
          if (data.createdAt?.toDate) {
            orderDate = data.createdAt.toDate();
          } else if (data.createdAt) {
            orderDate = new Date(data.createdAt);
          } else {
            orderDate = new Date();
          }
          
          // Determine kitchen status based on existing data
          let kitchenStatus = 'pending';
          if (data.kitchenStatus) {
            kitchenStatus = data.kitchenStatus;
          } else if (data.completedAt || data.kitchenCompletedAt) {
            kitchenStatus = 'completed';
          } else if (data.preparationStartedAt) {
            kitchenStatus = 'preparing';
          }
          
          ordersData.push({ 
            id: doc.id, 
            ...data,
            createdAt: orderDate,
            kitchenStatus: kitchenStatus
          });
        });
        
        setOrders(ordersData);
        setIsLoading(false);
        setRefreshing(false);
        console.log('✅ Kitchen: Orders loaded:', ordersData.length);
      }, (error) => {
        console.error('❌ Kitchen: Error fetching orders:', error);
        setIsLoading(false);
        setRefreshing(false);
      });

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

  // Start preparing an order
  const startOrderPreparation = async (order: any) => {
    try {
      // Update order status to 'preparing' in Firestore
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        kitchenStatus: 'preparing',
        preparationStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('🔥 ZAPIER/N8N INTEGRATION COMMENT 🔥');
      console.log('// When order preparation starts, you can trigger webhooks:');
      console.log('// 1. Send to kitchen display system');
      console.log('// 2. Notify manager about order in progress');
      console.log('// 3. Update order tracking dashboard');
      
      setSelectedOrder({
        ...order,
        kitchenStatus: 'preparing'
      });
      setActiveTab('preparation');
    } catch (error) {
      console.error('Error starting order preparation:', error);
      alert(t('kitchen.messages.errorUpdating'));
    }
  };

  // Complete an order
  const completeOrder = async (orderId: string) => {
    if (window.confirm(t('kitchen.orderPreparation.confirmComplete'))) {
      try {
        const orderRef = doc(db, 'orders', orderId);
        const completedAt = new Date();
        
        await updateDoc(orderRef, {
          kitchenStatus: 'completed',
          completedAt: Timestamp.fromDate(completedAt),
          kitchenCompletedAt: completedAt.toISOString(),
          updatedAt: serverTimestamp()
        });

        console.log('✅ Order completed:', orderId);
        
        // N8N INTEGRATION POINT
        console.log('// WEBHOOK DATA FOR ZAPIER/N8N:');
        console.log('// Event: order_completed');
        console.log('// Order ID:', orderId);
        console.log('// Customer:', orders.find(o => o.id === orderId)?.customerInfo?.name);
        console.log('// Completion Time:', completedAt.toISOString());
        console.log('// ---');
        console.log('// Example webhook call (uncomment and configure):');
        console.log('// fetch("https://hooks.zapier.com/hooks/catch/...", {');
        console.log('//   method: "POST",');
        console.log('//   headers: { "Content-Type": "application/json" },');
        console.log('//   body: JSON.stringify({');
        console.log('//     event: "order_completed",');
        console.log('//     orderId: orderId,');
        console.log('//     completedAt: completedAt.toISOString(),');
        console.log('//     customerName: customerName,');
        console.log('//     orderType: orderType,');
        console.log('//     totalAmount: totalAmount');
        console.log('//   })');
        console.log('// })');
        console.log('// ---');
        console.log('// You can use this to:');
        console.log('// 1. Send SMS/WhatsApp notification to customer');
        console.log('// 2. Update Google Sheets/Excel with completion time');
        console.log('// 3. Trigger delivery driver assignment');
        console.log('// 4. Send to accounting software');
        console.log('// 5. Update inventory management system');
        
        setSelectedOrder(null);
        setActiveTab('queue');
        
        alert(t('kitchen.messages.orderCompleted'));
      } catch (error) {
        console.error('Error completing order:', error);
        alert(t('kitchen.messages.errorUpdating'));
      }
    }
  };

  const getOrderStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = orders.filter(order => {
      const orderDate = order.createdAt instanceof Date 
        ? order.createdAt 
        : new Date(order.createdAt);
      return orderDate >= today;
    });
    
    const queueCount = todayOrders.filter(o => !o.kitchenStatus || o.kitchenStatus === 'pending').length;
    const preparingCount = todayOrders.filter(o => o.kitchenStatus === 'preparing').length;
    const readyCount = todayOrders.filter(o => o.kitchenStatus === 'ready').length;
    const completedCount = todayOrders.filter(o => o.kitchenStatus === 'completed').length;
    
    return { queueCount, preparingCount, readyCount, completedCount };
  };

  const stats = getOrderStats();

  const filteredOrders = () => {
    switch (activeTab) {
      case 'queue':
        return orders.filter(o => !o.kitchenStatus || o.kitchenStatus === 'pending');
      case 'preparation':
        return orders.filter(o => o.kitchenStatus === 'preparing');
      case 'completed':
        return orders.filter(o => o.kitchenStatus === 'completed');
      case 'all':
        return orders;
      default:
        return orders;
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
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl sm:text-3xl font-light text-gray-900 tracking-wide">
                {t('kitchen.title')}
              </h1>
              <p className="text-gray-500 font-light mt-1 sm:mt-2 text-sm sm:text-base">
                {t('kitchen.subtitle')}
              </p>
            </div>
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
                className={`py-3 sm:py-4 px-1 sm:px-2 border-b-2 font-light text-sm tracking-wide transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'queue'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('kitchen.tabs.queue')} ({stats.queueCount})
              </button>
              <button
                onClick={() => setActiveTab('preparation')}
                className={`py-3 sm:py-4 px-1 sm:px-2 border-b-2 font-light text-sm tracking-wide transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'preparation'
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
                className={`py-3 sm:py-4 px-1 sm:px-2 border-b-2 font-light text-sm tracking-wide transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'completed'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('kitchen.tabs.completed')} ({stats.completedCount})
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`py-3 sm:py-4 px-1 sm:px-2 border-b-2 font-light text-sm tracking-wide transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'all'
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
            {activeTab === 'queue' || activeTab === 'preparation' || activeTab === 'all' || activeTab === 'completed' ? (
              activeTab === 'preparation' && selectedOrder ? (
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
                  orders={filteredOrders()}
                  onSelectOrder={startOrderPreparation}
                  activeTab={activeTab}
                />
              )
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">{t('kitchen.messages.selectOrder')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}