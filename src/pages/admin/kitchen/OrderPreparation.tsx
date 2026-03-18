import { useEffect, useMemo, useState } from 'react';
import { Check, Clock, ChefHat, AlertCircle, Package, X } from 'lucide-react';
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

const wrapLabel = (wrap?: string) => {
  if (!wrap) return '';
  if (wrap === 'rice_outside') return '🍚 Rice outside';
  if (wrap === 'nori_outside') return '🌿 Nori outside';
  if (wrap === 'soy_paper') return '🟨 Soy paper';
  return wrap;
};

const boolLabel = (fried?: boolean) => {
  if (fried === true) return '🔥 Fried/Tempura';
  if (fried === false) return '— Not fried';
  return '';
};

export default function OrderPreparation({ order, products, onComplete, onCancel }: OrderPreparationProps) {
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const productMap = useMemo(() => {
    const m = new Map<string, Product>();
    (products || []).forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const isOrderAlreadyCompleted = order.kitchenStatus === 'completed' || order.kitchenStatus === 'ready';

  // Build steps from product kitchen assembly if available
  const preparationSteps: PreparationStep[] = useMemo(() => {
    const steps: PreparationStep[] = [];

    // Step 1: Gather Ingredients (always)
    steps.push({
      id: 'gather-ingredients',
      title: 'Gather All Ingredients',
      description: 'Collect all required ingredients from storage',
      completed: completedSteps.includes('gather-ingredients'),
      timeEstimate: 5,
    });

    // Per item steps
    order.items?.forEach((item: any, index: number) => {
      const product = productMap.get(item.productId);
      const qty = Math.max(1, Number(item.quantity || 1));
      const prepTime = product?.preparationTime || 10;

      const assembly = product?.kitchen?.assembly?.filter(Boolean) || [];
      if (assembly.length > 0) {
        // create one block step per assembly line (still easy for cooks)
        assembly.forEach((line, i) => {
          const id = `asm-${item.productId}-${index}-${i}`;
          steps.push({
            id,
            title: `${item.name} (${qty}x) • Step ${i + 1}`,
            description: line,
            productId: item.productId,
            completed: completedSteps.includes(id),
            timeEstimate: Math.max(1, Math.round(prepTime / Math.max(assembly.length, 1))),
          });
        });
      } else {
        // fallback
        const id = `prepare-${item.productId}-${index}`;
        steps.push({
          id,
          title: `Prepare ${item.name} (${qty}x)`,
          description: `${prepTime} minutes preparation time`,
          productId: item.productId,
          completed: completedSteps.includes(id),
          timeEstimate: prepTime,
        });
      }
    });

    // Final step
    steps.push({
      id: 'quality-check',
      title: 'Quality Check & Packaging',
      description: 'Verify all items are correctly prepared and package for customer',
      completed: completedSteps.includes('quality-check'),
      timeEstimate: 3,
    });

    return steps;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.items, productMap, completedSteps]);

  const allStepsCompleted = useMemo(() => {
    const allIds = preparationSteps.map((s) => s.id);
    return allIds.every((id) => completedSteps.includes(id));
  }, [preparationSteps, completedSteps]);

  useEffect(() => {
    if (isOrderAlreadyCompleted) {
      setCompletedSteps(preparationSteps.map((s) => s.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.kitchenStatus]);

  const toggleStep = (stepId: string) => {
    if (isOrderAlreadyCompleted) return;
    setCompletedSteps((prev) => (prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId]));
  };

  const handleCompleteOrder = () => {
    if (!allStepsCompleted) {
      alert('Please complete all preparation steps before marking the order as ready.');
      return;
    }
    if (window.confirm('Mark this order as ready for pickup/delivery?')) onComplete(order.id);
  };

  const progressPercentage = preparationSteps.length > 0 ? (completedSteps.length / preparationSteps.length) * 100 : 0;

  const formatTime = (date: any) => {
    if (!date) return 'N/A';
    try {
      const d = date instanceof Date ? date : new Date(date);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'N/A';
    }
  };

  const ingredients = useMemo(() => {
    const ingredientMap = new Map<string, any>();

    order.items?.forEach((item: any) => {
      const product = productMap.get(item.productId);
      if (!product?.ingredients) return;

      product.ingredients.forEach((ing: any) => {
        const key = `${ing.id}-${ing.unit}`;
        const existing = ingredientMap.get(key);

        if (existing) {
          existing.quantity += ing.quantity * (item.quantity || 1);
          existing.products.push({ name: item.name, quantity: item.quantity || 1 });
        } else {
          ingredientMap.set(key, {
            ...ing,
            quantity: ing.quantity * (item.quantity || 1),
            products: [{ name: item.name, quantity: item.quantity || 1 }],
          });
        }
      });
    });

    return Array.from(ingredientMap.values());
  }, [order.items, productMap]);

  const totalTime = useMemo(
    () => preparationSteps.reduce((sum, s) => sum + (s.timeEstimate || 0), 0),
    [preparationSteps]
  );

  // Completed view (keep your style, but simpler)
  if (isOrderAlreadyCompleted) {
    return (
      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center">
              <Check className="w-6 h-6 text-green-600 mr-2" />
              <h2 className="text-xl font-light text-gray-900">
                Order #{order.id?.slice(-6)} - Completed ✅
              </h2>
            </div>

            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 ml-4">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-gray-600">
            Completed at: {formatTime(order.completedAt || order.kitchenCompletedAt || order.updatedAt)}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-light text-gray-900 mb-4">Order Items (with Kitchen Info)</h3>
          <div className="space-y-3">
            {order.items?.map((item: any, idx: number) => {
              const product = productMap.get(item.productId);
              const k = product?.kitchen;

              return (
                <div key={idx} className="p-4 border rounded-md bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">
                        {item.quantity || 1}x {item.name}
                      </div>
                      {item.notes ? <div className="text-sm text-blue-600 mt-1">📝 {item.notes}</div> : null}
                    </div>
                    <div className="text-sm text-gray-700">${Number(item.price || 0).toFixed(2)}</div>
                  </div>

                  {k ? (
                    <div className="mt-3 text-sm text-gray-700 space-y-1">
                      <div className="flex flex-wrap gap-2">
                        {k.rollType ? <span className="px-2 py-1 text-xs rounded bg-white border">🍣 {k.rollType}</span> : null}
                        {k.wrap ? <span className="px-2 py-1 text-xs rounded bg-white border">{wrapLabel(k.wrap)}</span> : null}
                        {typeof k.fried === 'boolean' ? (
                          <span className="px-2 py-1 text-xs rounded bg-white border">{boolLabel(k.fried)}</span>
                        ) : null}
                        {k.pieces ? <span className="px-2 py-1 text-xs rounded bg-white border">✂️ {k.pieces} pcs</span> : null}
                        {k.priorityNotes ? (
                          <span className="px-2 py-1 text-xs rounded bg-yellow-50 border border-yellow-200 text-yellow-800">
                            ⚠️ {k.priorityNotes}
                          </span>
                        ) : null}
                      </div>

                      {k.inside?.length ? (
                        <div><span className="font-medium">Inside:</span> {k.inside.join(', ')}</div>
                      ) : null}
                      {k.toppings?.length ? (
                        <div><span className="font-medium">Topping:</span> {k.toppings.join(', ')}</div>
                      ) : null}
                      {k.sauces?.length ? (
                        <div><span className="font-medium">Sauce:</span> {k.sauces.join(', ')}</div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-gray-500">
                      No kitchen meta yet (add `product.kitchen` to improve this).
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={onCancel}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Close View
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active preparation view
  return (
    <div className="space-y-6">
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
              <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 ml-4">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>
              {completedSteps.length} of {preparationSteps.length} steps
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleCompleteOrder}
            disabled={!allStepsCompleted}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${allStepsCompleted ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
          >
            <Check className="w-4 h-4 inline mr-2" />
            {allStepsCompleted ? 'Mark as Ready' : 'Complete All Steps First'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Ingredients */}
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
              <p className="text-sm text-gray-400 mt-1">Add ingredients on products to power this view.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ingredients.map((ingredient: any, index: number) => (
                <div key={`${ingredient.id}-${index}`} className="flex items-start justify-between p-3 bg-gray-50 rounded-md">
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
                    <div className="text-xs text-gray-400 mt-1">Total required</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-center mb-4">
            <Package className="w-5 h-5 text-gray-700 mr-2" />
            <h3 className="text-lg font-light text-gray-900">Preparation Steps</h3>
          </div>

          <div className="space-y-3">
            {preparationSteps.map((step, index) => (
              <div
                key={step.id}
                className={`p-4 border rounded-lg transition-all duration-200 ${step.completed ? 'border-green-200 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  } cursor-pointer`}
                onClick={() => toggleStep(step.id)}
              >
                <div className="flex items-start">
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center mr-3 mt-0.5 transition-colors ${step.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'
                      }`}
                  >
                    {step.completed && <Check className="w-4 h-4 text-white" />}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className={`font-medium ${step.completed ? 'text-green-700' : 'text-gray-900'}`}>
                          {index + 1}. {step.title}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 ml-2">
                        <Clock className="w-4 h-4 mr-1" />
                        {step.timeEstimate} min
                      </div>
                    </div>

                    {step.productId ? (
                      <div className="mt-2">
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {order.items?.find((item: any) => item.productId === step.productId)?.name}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Items with Kitchen Cards (THIS is the big win) */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-light text-gray-900 mb-4">Order Items (Kitchen Cards)</h3>
        <div className="space-y-3">
          {order.items?.map((item: any, index: number) => {
            const product = productMap.get(item.productId);
            const k = product?.kitchen;

            return (
              <div key={index} className="p-4 border border-gray-100 rounded-md bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900">
                      {item.quantity || 1}x {item.name}
                    </div>

                    {item.notes ? <div className="text-sm text-blue-600 mt-1">📝 {item.notes}</div> : null}

                    {k ? (
                      <div className="mt-3 text-sm text-gray-700 space-y-1">
                        <div className="flex flex-wrap gap-2">
                          {k.rollType ? <span className="px-2 py-1 text-xs rounded bg-white border">🍣 {k.rollType}</span> : null}
                          {k.wrap ? <span className="px-2 py-1 text-xs rounded bg-white border">{wrapLabel(k.wrap)}</span> : null}
                          {typeof k.fried === 'boolean' ? (
                            <span className="px-2 py-1 text-xs rounded bg-white border">{boolLabel(k.fried)}</span>
                          ) : null}
                          {k.pieces ? <span className="px-2 py-1 text-xs rounded bg-white border">✂️ {k.pieces} pcs</span> : null}
                          {k.priorityNotes ? (
                            <span className="px-2 py-1 text-xs rounded bg-yellow-50 border border-yellow-200 text-yellow-800">
                              ⚠️ {k.priorityNotes}
                            </span>
                          ) : null}
                        </div>

                        {k.inside?.length ? (
                          <div><span className="font-medium">Inside:</span> {k.inside.join(', ')}</div>
                        ) : null}
                        {k.toppings?.length ? (
                          <div><span className="font-medium">Topping:</span> {k.toppings.join(', ')}</div>
                        ) : null}
                        {k.sauces?.length ? (
                          <div><span className="font-medium">Sauce:</span> {k.sauces.join(', ')}</div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-gray-500">
                        No kitchen meta yet — add `product.kitchen` to remove confusion.
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-500">Price</div>
                    <div className="font-medium text-gray-900">${Number(item.price || 0).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total time */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-light text-gray-900">Estimated Total Time</h3>
            <p className="text-gray-500 text-sm">Uses product prep times + assembly steps</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-light text-gray-900">{totalTime} minutes</div>
            <div className="text-sm text-gray-500">Estimate</div>
          </div>
        </div>
      </div>
    </div>
  );
}