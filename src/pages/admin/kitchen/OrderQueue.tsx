import { Clock, User, MapPin, ChevronRight, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OrderQueueProps {
  orders: any[];
  onSelectOrder: (order: any) => void;
  activeTab: 'queue' | 'preparation' | 'completed' | 'all';
}

export default function OrderQueue({ orders, onSelectOrder, activeTab }: OrderQueueProps) {
  const { t } = useTranslation();

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'N/A';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const calculatePreparationTime = (order: any) => {
    const itemCount = order.items?.length || 0;
    const baseTime = 5;
    const perItemTime = 3;
    const totalMinutes = baseTime + (itemCount * perItemTime);
    return `${totalMinutes} ${t('kitchen.time.minutes')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparing': return 'bg-yellow-100 text-yellow-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusText = (status: string) => {
    return t(`kitchen.status.${status}`) || status;
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          {activeTab === 'completed' ? (
            <CheckCircle className="w-8 h-8 text-gray-400" />
          ) : (
            <Clock className="w-8 h-8 text-gray-400" />
          )}
        </div>
        <h3 className="text-lg font-light text-gray-900 mb-2">
          {activeTab === 'completed' 
            ? t('kitchen.completedOrders.noOrders')
            : t('kitchen.orderQueue.noOrders')
          }
        </h3>
        <p className="text-gray-500">
          {activeTab === 'completed'
            ? t('kitchen.completedOrders.noOrders')
            : t('kitchen.orderQueue.noOrdersMessage')
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg sm:text-xl font-light text-gray-900">
          {activeTab === 'queue' && `${t('kitchen.tabs.queue')} (${orders.length})`}
          {activeTab === 'preparation' && `${t('kitchen.status.preparing')} (${orders.length})`}
          {activeTab === 'completed' && `${t('kitchen.tabs.completed')} (${orders.length})`}
          {activeTab === 'all' && `${t('kitchen.tabs.all')} (${orders.length})`}
        </h2>
        <div className="text-sm text-gray-500">
          {t('kitchen.orderQueue.sortedBy')}
        </div>
      </div>
      
      <div className="grid gap-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer group ${
              activeTab === 'completed' 
                ? 'border-gray-200' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            // onClick={() => onSelectOrder(order)}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-medium text-gray-900">
                  {t('kitchen.orderQueue.order')} #{order.id?.slice(-6) || 'N/A'}
                </h3>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{formatTime(order.createdAt)}</span>
                  <span className="mx-2">•</span>
                  <span>{formatDate(order.createdAt)}</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-1 ${getStatusColor(order.kitchenStatus || 'pending')}`}>
                  {getStatusText(order.kitchenStatus || 'pending')}
                </span>
                <div className="text-sm font-medium text-gray-900">
                  ${order.totals?.finalTotal?.toFixed(2) || order.totals?.subtotal?.toFixed(2) || '0.00'}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center text-sm text-gray-600 mb-1">
                    <User className="w-4 h-4 mr-2" />
                    <span>{order.customerInfo?.name || order.customerEmail || t('kitchen.orderQueue.customer')}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>
                      {order.customerInfo?.address === 'Pickup' 
                        ? `🚗 ${t('kitchen.orderQueue.pickupOrder')}`
                        : `🛵 ${t('kitchen.orderQueue.deliveryOrder')}`}
                    </span>
                  </div>
                </div>
                
                <div className="text-right ml-4">
                  <div className="text-sm font-medium text-gray-900">
                    {order.items?.length || 0} {t('kitchen.orderQueue.items')}
                  </div>
                  <div className="text-sm text-gray-500">
                    {calculatePreparationTime(order)}
                  </div>
                </div>
              </div>

              {/* Order Items Preview */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-sm text-gray-700">
                  <span className="font-medium">{t('kitchen.orderQueue.items')}:</span>{' '}
                  <span className="text-gray-600">
                    {order.items?.slice(0, 3).map((item: any, index: number) => (
                      <span key={index}>
                        {item.quantity}x {item.name}
                        {index < Math.min(3, order.items.length) - 1 ? ', ' : ''}
                      </span>
                    ))}
                    {order.items && order.items.length > 3 && (
                      <span className="text-gray-500">
                        {' '}+ {order.items.length - 3} {t('kitchen.orderQueue.more', { count: order.items.length - 3 })}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {activeTab !== 'completed' && (
              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  {t('kitchen.orderQueue.clickToStart')}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}