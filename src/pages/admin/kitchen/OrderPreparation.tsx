import { useState, useEffect } from 'react';
import { Check, Clock, ChefHat, AlertCircle, Package, X, User, MapPin, Phone, Mail } from 'lucide-react';
import type { Product } from '../../../types/types';

interface OrderPreparationProps {
  order: any;
  products: Product[];
  onComplete: (orderId: string) => void;
  onCancel: () => void;
}

interface PreparationStep {
  id: string;
  title: string;
  description: string;
  productId?: string;
  completed: boolean;
  timeEstimate: number;
}

export default function OrderPreparation({ 
  order, 
  products, 
  onComplete, 
  onCancel 
}: OrderPreparationProps) {
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [allStepsCompleted, setAllStepsCompleted] = useState<boolean>(false);

  // Check if all steps are completed
  useEffect(() => {
    const preparationSteps = getPreparationSteps();
    const allStepIds = preparationSteps.map(step => step.id);
    const allCompleted = allStepIds.every(id => completedSteps.includes(id));
    setAllStepsCompleted(allCompleted);
  }, [completedSteps, order.items]);

  // If order is already completed on mount, mark all steps as completed
  useEffect(() => {
    if (order.kitchenStatus === 'completed' || order.kitchenStatus === 'ready') {
      const allStepIds = getPreparationSteps().map(step => step.id);
      setCompletedSteps(allStepIds);
    }
  }, [order.kitchenStatus]);

  // Get product details for order items
  const getProductDetails = () => {
    const productMap = new Map<string, Product>();
    
    if (!products || !order.items) return productMap;
    
    order.items.forEach((item: any) => {
      const product = products.find((p: Product) => p.id === item.productId);
      if (product) {
        productMap.set(item.productId, product);
      }
    });
    
    return productMap;
  };

  // Aggregate all ingredients from order items
  const getAggregatedIngredients = () => {
    const ingredientMap = new Map<string, any>();
    const productDetails = getProductDetails();
    
    order.items?.forEach((item: any) => {
      const product = productDetails.get(item.productId);
      if (product?.ingredients) {
        product.ingredients.forEach((ing: any) => {
          const key = `${ing.id}-${ing.unit}`;
          const existing = ingredientMap.get(key);
          
          if (existing) {
            // Sum up quantities for same ingredient
            existing.quantity += ing.quantity * (item.quantity || 1);
            existing.products.push({
              name: item.name,
              quantity: item.quantity || 1
            });
          } else {
            ingredientMap.set(key, {
              ...ing,
              quantity: ing.quantity * (item.quantity || 1),
              products: [{
                name: item.name,
                quantity: item.quantity || 1
              }]
            });
          }
        });
      }
    });
    
    return Array.from(ingredientMap.values());
  };

  // Generate preparation steps based on products
  const getPreparationSteps = (): PreparationStep[] => {
    const steps: PreparationStep[] = [];
    const productDetails = getProductDetails();
    
    // Step 1: Gather Ingredients
    steps.push({
      id: 'gather-ingredients',
      title: 'Gather All Ingredients',
      description: 'Collect all required ingredients from storage',
      completed: completedSteps.includes('gather-ingredients'),
      timeEstimate: 5
    });

    // Step 2: Product-specific steps
    order.items?.forEach((item: any, index: number) => {
      const product = productDetails.get(item.productId);
      if (product) {
        steps.push({
          id: `prepare-${item.productId}-${index}`,
          title: `Prepare ${item.name} (${item.quantity}x)`,
          description: `${product.preparationTime || 10} minutes preparation time`,
          productId: item.productId,
          completed: completedSteps.includes(`prepare-${item.productId}-${index}`),
          timeEstimate: product.preparationTime || 10
        });
      }
    });

    // Final step: Quality Check & Packaging
    steps.push({
      id: 'quality-check',
      title: 'Quality Check & Packaging',
      description: 'Verify all items are correctly prepared and package for customer',
      completed: completedSteps.includes('quality-check'),
      timeEstimate: 3
    });

    return steps;
  };

  const toggleStep = (stepId: string) => {
    // Don't allow changes if order is already completed/ready
    if (order.kitchenStatus === 'completed' || order.kitchenStatus === 'ready') return;
    
    if (completedSteps.includes(stepId)) {
      setCompletedSteps(completedSteps.filter(id => id !== stepId));
    } else {
      setCompletedSteps([...completedSteps, stepId]);
    }
  };

  const handleCompleteOrder = () => {
    // Check if all steps are completed
    if (!allStepsCompleted) {
      alert('Please complete all preparation steps before marking the order as ready.');
      return;
    }
    
    if (window.confirm('Mark this order as ready for pickup/delivery?')) {
      onComplete(order.id);
    }
  };

  const ingredients = getAggregatedIngredients();
  const preparationSteps = getPreparationSteps();
  const progressPercentage = preparationSteps.length > 0 
    ? (completedSteps.length / preparationSteps.length) * 100 
    : 0;

  const formatTime = (date: any) => {
    if (!date) return 'N/A';
    try {
      const d = date instanceof Date ? date : new Date(date);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'N/A';
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      const d = date instanceof Date ? date : new Date(date);
      return d.toLocaleDateString([], { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return 'N/A';
    }
  };

  // Calculate total price
  const calculateTotal = () => {
    return order.items?.reduce((total: number, item: any) => {
      return total + (item.price * (item.quantity || 1));
    }, 0) || 0;
  };

  // Check if order is already completed/ready from backend
  const isOrderAlreadyCompleted = order.kitchenStatus === 'completed' || order.kitchenStatus === 'ready';

  // Show completed view only if order is already completed from backend
  if (isOrderAlreadyCompleted) {
    return (
      <div className="space-y-6">
        {/* Completed Order Header */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center">
                <Check className="w-6 h-6 text-green-600 mr-2" />
                <h2 className="text-xl font-light text-gray-900">
                  Order #{order.id?.slice(-6)} - Completed ✅
                </h2>
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-gray-600 text-sm">
                  <span className="font-medium">Completed at:</span> {formatTime(order.completedAt || order.kitchenCompletedAt || order.updatedAt)} on {formatDate(order.completedAt || order.kitchenCompletedAt || order.updatedAt)}
                </p>
                <p className="text-green-600 text-sm">
                  Ready for {order.customerInfo?.address === 'Pickup' ? 'Pickup' : 'Delivery'}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 ml-4"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Customer Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <div className="flex items-center mb-4">
              <User className="w-5 h-5 text-gray-700 mr-2" />
              <h3 className="text-lg font-light text-gray-900">Customer Information</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <User className="w-4 h-4 text-gray-400 mr-3" />
                <div>
                  <div className="text-sm text-gray-500">Name</div>
                  <div className="font-medium">{order.customerInfo?.name || 'N/A'}</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <Phone className="w-4 h-4 text-gray-400 mr-3" />
                <div>
                  <div className="text-sm text-gray-500">Phone</div>
                  <div className="font-medium">{order.customerInfo?.phone || 'N/A'}</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <Mail className="w-4 h-4 text-gray-400 mr-3" />
                <div>
                  <div className="text-sm text-gray-500">Email</div>
                  <div className="font-medium">{order.customerEmail || 'N/A'}</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <MapPin className="w-4 h-4 text-gray-400 mr-3" />
                <div>
                  <div className="text-sm text-gray-500">
                    {order.customerInfo?.address === 'Pickup' ? 'Pickup Location' : 'Delivery Address'}
                  </div>
                  <div className="font-medium">
                    {order.customerInfo?.address === 'Pickup' 
                      ? 'Store Pickup' 
                      : order.customerInfo?.address || 'N/A'}
                  </div>
                  {order.customerInfo?.specialInstructions && (
                    <div className="mt-1 text-sm text-gray-600">
                      <span className="font-medium">Notes:</span> {order.customerInfo.specialInstructions}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <div className="flex items-center mb-4">
              <Package className="w-5 h-5 text-gray-700 mr-2" />
              <h3 className="text-lg font-light text-gray-900">Order Summary</h3>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500">Order Time</div>
                <div className="font-medium">{formatTime(order.createdAt)} • {formatDate(order.createdAt)}</div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500">Order Type</div>
                <div className="font-medium">
                  {order.customerInfo?.address === 'Pickup' ? 'Pickup' : 'Delivery'}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500">Order ID</div>
                <div className="font-medium font-mono">{order.id}</div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500">Payment Method</div>
                <div className="font-medium">{order.paymentMethod || 'Card'}</div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex justify-between text-lg font-medium">
                  <span>Total Amount</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Items Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-light text-gray-900 mb-4">Order Items</h3>
          <div className="space-y-4">
            {order.items?.map((item: any, index: number) => {
              const product = products.find((p: Product) => p.id === item.productId);
              
              return (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-100 rounded-md bg-gray-50">
                  <div className="flex items-center">
                    <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-medium mr-3">
                      {item.quantity || 1}
                    </span>
                    <div>
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">
                        {typeof product?.description === 'string' 
                          ? product.description 
                          : product?.description?.en || 
                            product?.description?.es || 
                            product?.description?.fr || 
                            'No description available'}
                      </div>
                      {item.notes && (
                        <div className="text-sm text-blue-600 mt-1">
                          <span className="font-medium">Special request:</span> {item.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">${(item.price * (item.quantity || 1)).toFixed(2)}</div>
                    <div className="text-sm text-gray-500">${item.price} each</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Preparation Summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-light text-gray-900 mb-4">Preparation Summary</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Total Steps</div>
              <div className="text-2xl font-light">{preparationSteps.length}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Completed Steps</div>
              <div className="text-2xl font-light text-green-600">{completedSteps.length}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Total Time</div>
              <div className="text-2xl font-light">
                {preparationSteps.reduce((total, step) => total + step.timeEstimate, 0)} min
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={onCancel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Close View
          </button>
        </div>
      </div>
    );
  }

  // Show preparation view for orders that are not completed yet
  return (
    <div className="space-y-6">
      {/* Order Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-light text-gray-900">
                  Preparing Order #{order.id?.slice(-6)}
                </h2>
                <div className="mt-1 space-y-1">
                  <p className="text-gray-600 text-sm">
                    <span className="font-medium">Customer:</span> {order.customerInfo?.name || order.customerEmail || 'N/A'}
                  </p>
                  <p className="text-gray-600 text-sm">
                    <span className="font-medium">Type:</span> {order.customerInfo?.address === 'Pickup' ? 'Pickup' : 'Delivery'}
                  </p>
                  <p className="text-gray-600 text-sm">
                    <span className="font-medium">Order Time:</span> {formatTime(order.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600 ml-4"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{completedSteps.length} of {preparationSteps.length} steps</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleCompleteOrder}
            disabled={!allStepsCompleted}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              allStepsCompleted
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4 inline mr-2" />
            {allStepsCompleted ? 'Mark as Ready' : 'Complete All Steps First'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column: Ingredients */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <ChefHat className="w-5 h-5 text-gray-700 mr-2" />
              <h3 className="text-lg font-light text-gray-900">Required Ingredients</h3>
            </div>
            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
              {ingredients.length} items
            </span>
          </div>

          {ingredients.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No ingredient data available</p>
              <p className="text-sm text-gray-400 mt-1">
                Make sure products have ingredients defined in the product settings
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {ingredients.map((ingredient: any, index: number) => (
                <div
                  key={`${ingredient.id}-${index}`}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{ingredient.name}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {ingredient.products?.map((p: any, i: number) => (
                        <span key={i} className="inline-block mr-2 mb-1 px-2 py-1 bg-white rounded text-xs">
                          {p.quantity}x {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-medium text-gray-900">
                      {ingredient.quantity} {ingredient.unit}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Total required
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Preparation Steps */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-center mb-4">
            <Package className="w-5 h-5 text-gray-700 mr-2" />
            <h3 className="text-lg font-light text-gray-900">Preparation Steps</h3>
          </div>

          <div className="space-y-4">
            {preparationSteps.map((step, index) => {
              // Only disable if order is already completed
              const isDisabled = isOrderAlreadyCompleted;
              
              return (
                <div
                  key={step.id}
                  className={`p-4 border rounded-lg transition-all duration-200 ${
                    step.completed
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${isDisabled ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={isDisabled ? undefined : () => toggleStep(step.id)}
                >
                  <div className="flex items-start">
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center mr-3 mt-0.5 transition-colors ${
                        step.completed
                          ? 'bg-green-500 border-green-500 hover:bg-green-600'
                          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                      } ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {step.completed && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className={`font-medium ${
                            step.completed ? 'text-green-700' : 'text-gray-900'
                          }`}>
                            {index + 1}. {step.title}
                          </h4>
                          <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                        </div>
                        <div className="flex items-center text-sm text-gray-500 ml-2">
                          <Clock className="w-4 h-4 mr-1" />
                          {step.timeEstimate} min
                        </div>
                      </div>
                      
                      {step.productId && (
                        <div className="mt-2">
                          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            {order.items?.find((item: any) => item.productId === step.productId)?.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Order Items Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-light text-gray-900 mb-4">Order Items</h3>
        <div className="space-y-3">
          {order.items?.map((item: any, index: number) => {
            const product = products.find((p: Product) => p.id === item.productId);
            const isCompleted = completedSteps.some(step => step.includes(item.productId));
            
            return (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-100 rounded-md">
                <div className="flex items-center">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mr-3 ${
                    isCompleted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {item.quantity || 1}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500">
                      {typeof product?.description === 'string' 
                        ? product.description 
                        : product?.description?.en || 
                          product?.description?.es || 
                          product?.description?.fr || 
                          product?.category || 'No category'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Status</div>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isCompleted
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {isCompleted ? 'Ready' : 'Pending'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total Preparation Time */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-light text-gray-900">Estimated Total Time</h3>
            <p className="text-gray-500 text-sm">Based on product preparation times</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-light text-gray-900">
              {preparationSteps.reduce((total, step) => total + step.timeEstimate, 0)} minutes
            </div>
            <div className="text-sm text-gray-500">Estimate</div>
          </div>
        </div>
      </div>
    </div>
  );
}