import { useProducts } from "../../context/ProductsContext";
import { useIngredients } from "../../context/IngredientsContext";
import { productCost } from "../../utils/costCalculations";

export const CostAnalysisPage = () => {
  const { products, loading: productsLoading } = useProducts();
  const { ingredients, loading: ingredientsLoading } = useIngredients();

  if (productsLoading || ingredientsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600 font-light">Loading cost analysis...</div>
      </div>
    );
  }

  // Helper function to convert any quantity to grams for consistent calculation
  const convertToGrams = (quantity: number, unit: string): number => {
    switch (unit) {
      case 'kg': return quantity * 1000;
      case 'g': return quantity;
      case 'l': return quantity * 1000;
      case 'ml': return quantity;
      case 'unit': return quantity;
      default: return quantity;
    }
  };

  // Calculate inventory-based metrics for each product
  const productsWithInventoryAnalysis = products.map(product => {
    const cost = product.costPrice || productCost(product, ingredients);
    const profit = product.sellingPrice ? product.sellingPrice - cost : 0;
    const margin = product.sellingPrice ? (profit / product.sellingPrice) * 100 : 0;

    // Calculate maximum units possible with current inventory
    let maxUnitsFromInventory = 0;
    let limitingIngredient = null;

    if (product.productType === 'ingredientBased' && product.ingredients.length > 0) {
      const ingredientLimits = product.ingredients.map(item => {
        const ingredient = ingredients.find(ing => ing.id === item.id);
        if (!ingredient) return { units: 0, ingredient: null, currentStock: 0, requiredPerUnit: 0 };

        const requiredGrams = convertToGrams(item.quantity, item.unit);
        const currentStockGrams = convertToGrams(ingredient.currentStock, ingredient.unit);
        const unitsPossible = currentStockGrams / requiredGrams;

        return {
          units: Math.floor(unitsPossible),
          ingredient: ingredient.name,
          currentStock: ingredient.currentStock,
          currentStockUnit: ingredient.unit,
          requiredPerUnit: item.quantity,
          requiredUnit: item.unit
        };
      });

      maxUnitsFromInventory = Math.min(...ingredientLimits.map(limit => limit.units));
      limitingIngredient = ingredientLimits.find(limit => limit.units === maxUnitsFromInventory);
    }

    // Calculate financial potentials
    const potentialRevenue = product.sellingPrice ? maxUnitsFromInventory * product.sellingPrice : 0;
    const potentialProfit = product.sellingPrice ? maxUnitsFromInventory * profit : 0;

    return {
      ...product,
      cost,
      profit,
      margin,
      maxUnitsFromInventory,
      limitingIngredient,
      potentialRevenue,
      potentialProfit
    };
  });

  const totalProducts = products.length;
  const totalInventoryValue = ingredients.reduce((total, ing) => total + (ing.currentStock * ing.pricePerKg), 0);
  const totalPotentialRevenue = productsWithInventoryAnalysis.reduce((total, p) => total + p.potentialRevenue, 0);
  const totalPotentialProfit = productsWithInventoryAnalysis.reduce((total, p) => total + p.potentialProfit, 0);

  const wellStockedCount = ingredients.filter(ing => ing.currentStock > ing.minimumStock).length;
  const lowStockCount = ingredients.filter(ing => ing.currentStock > 0 && ing.currentStock <= ing.minimumStock).length;
  const outOfStockCount = ingredients.filter(ing => ing.currentStock === 0).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-gray-900 tracking-wide">Cost & Sales Potential</h1>
          <p className="text-gray-500 font-light mt-2">Analyze product profitability and inventory potential</p>
        </div>

        {/* Enhanced Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-500 tracking-wide">TOTAL PRODUCTS</p>
                <p className="text-2xl font-light text-gray-900 mt-2">{totalProducts}</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-sm flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-500 tracking-wide">POTENTIAL REVENUE</p>
                <p className="text-2xl font-light text-green-600 mt-2">${totalPotentialRevenue.toFixed(0)}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-sm flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-500 tracking-wide">POTENTIAL PROFIT</p>
                <p className="text-2xl font-light text-purple-600 mt-2">${totalPotentialProfit.toFixed(0)}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-sm flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-500 tracking-wide">INVENTORY VALUE</p>
                <p className="text-2xl font-light text-orange-600 mt-2">${totalInventoryValue.toFixed(2)}</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-sm flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Products Analysis */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-light text-gray-900 tracking-wide">PRODUCT ANALYSIS</h2>
            <p className="text-gray-500 font-light text-sm mt-1">Sales potential and profitability by product</p>
          </div>

          <div className="p-4 sm:p-6">
            {products.length === 0 ? (
              <div className="text-center text-gray-500 py-12 font-light">
                <div className="text-lg mb-2">No products yet</div>
                <div className="text-sm">Create products to see cost analysis</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {productsWithInventoryAnalysis.map((product) => (
                  <div
                    key={product.id}
                    className="border border-gray-200 rounded-lg p-4 bg-white hover:border-gray-300 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-light text-gray-900 text-base sm:text-lg flex-1 pr-2">
                        {product.name}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-sm font-light ${product.productType === 'directCost'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                        {product.productType === 'directCost' ? 'DIRECT COST' : 'INGREDIENT BASED'}
                      </span>
                    </div>

                    {/* Basic Cost Info */}
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-light">Cost Price:</span>
                        <span className="font-light text-gray-900">${product.cost.toFixed(2)}</span>
                      </div>

                      {product.sellingPrice ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600 font-light">Selling Price:</span>
                            <span className="font-light text-gray-900">${product.sellingPrice.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 font-light">Profit:</span>
                            <span className={`font-light ${product.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                              ${product.profit.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 font-light">Margin:</span>
                            <span className={`font-light ${product.margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {product.margin.toFixed(1)}%
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-sm p-2">
                          <div className="text-yellow-800 text-xs font-light text-center">
                            No selling price set
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sales Potential Section */}
                    {product.productType === 'ingredientBased' && product.ingredients.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-light text-gray-900 mb-3 text-sm tracking-wide">SALES POTENTIAL</h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600 font-light">Max Units Possible:</span>
                            <span className={`font-light ${product.maxUnitsFromInventory > 10 ? 'text-green-600' :
                              product.maxUnitsFromInventory > 0 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                              {product.maxUnitsFromInventory} units
                            </span>
                          </div>

                          {product.maxUnitsFromInventory > 0 && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600 font-light">Potential Revenue:</span>
                                <span className="font-light text-green-600">
                                  ${product.potentialRevenue.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 font-light">Potential Profit:</span>
                                <span className="font-light text-green-600">
                                  ${product.potentialProfit.toFixed(2)}
                                </span>
                              </div>

                              {product.limitingIngredient && (
                                <div className="bg-blue-50 p-2 rounded-sm border border-blue-200 mt-2">
                                  <div className="text-blue-700 text-xs font-light">
                                    <div className="font-medium">LIMITING INGREDIENT</div>
                                    <div className="mt-1">{product.limitingIngredient.ingredient}</div>
                                    <div className="text-blue-600">
                                      Stock: {product.limitingIngredient.currentStock}{product.limitingIngredient.currentStockUnit}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {product.maxUnitsFromInventory === 0 && (
                            <div className="bg-red-50 p-2 rounded-sm border border-red-200">
                              <div className="text-red-700 text-xs font-light text-center">
                                Cannot make any units with current inventory
                              </div>
                              {product.limitingIngredient && (
                                <div className="text-red-600 text-xs mt-1 text-center">
                                  Out of: {product.limitingIngredient.ingredient}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Ingredient Breakdown */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <h5 className="font-light text-gray-700 mb-2 text-xs tracking-wide">INGREDIENTS NEEDED</h5>
                          <div className="space-y-1">
                            {product.ingredients.map((ing, index) => {
                              const ingredient = ingredients.find(i => i.id === ing.id);
                              if (!ingredient) return null;

                              const requiredGrams = convertToGrams(ing.quantity, ing.unit);
                              const currentStockGrams = convertToGrams(ingredient.currentStock, ingredient.unit);
                              const unitsPossible = Math.floor(currentStockGrams / requiredGrams);

                              return (
                                <div key={index} className="flex justify-between text-xs">
                                  <span className="text-gray-600 font-light truncate flex-1 pr-2">{ingredient.name}:</span>
                                  <span className={`font-light flex-shrink-0 ${unitsPossible > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {unitsPossible} units
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Direct Cost Products Message */}
                    {product.productType === 'directCost' && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="text-xs text-gray-500 font-light text-center">
                          Direct cost product - inventory analysis not applicable
                        </div>
                      </div>
                    )}

                    {/* Additional product info */}
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                      {product.portionSize && (
                        <div className="text-xs text-gray-500 font-light">
                          Portion: {product.portionSize}
                        </div>
                      )}
                      {product.preparationTime && product.preparationTime > 0 && (
                        <div className="text-xs text-gray-500 font-light">
                          Prep time: {product.preparationTime}min
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Inventory Health Summary */}
        <div className="bg-white border border-gray-200 rounded-lg mt-6 sm:mt-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-light text-gray-900 tracking-wide">INVENTORY HEALTH</h2>
            <p className="text-gray-500 font-light text-sm mt-1">Current stock status across all ingredients</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-light text-gray-500 tracking-wide">TOTAL INGREDIENTS</p>
                    <p className="text-2xl font-light text-gray-900 mt-2">{ingredients.length}</p>
                  </div>
                  <div className="w-10 h-10 bg-gray-100 rounded-sm flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-green-200 rounded-lg p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-light text-green-600 tracking-wide">WELL STOCKED</p>
                    <p className="text-2xl font-light text-green-600 mt-2">{wellStockedCount}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-sm flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-yellow-200 rounded-lg p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-light text-yellow-600 tracking-wide">LOW STOCK</p>
                    <p className="text-2xl font-light text-yellow-600 mt-2">{lowStockCount}</p>
                  </div>
                  <div className="w-10 h-10 bg-yellow-100 rounded-sm flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-red-200 rounded-lg p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-light text-red-600 tracking-wide">OUT OF STOCK</p>
                    <p className="text-2xl font-light text-red-600 mt-2">{outOfStockCount}</p>
                  </div>
                  <div className="w-10 h-10 bg-red-100 rounded-sm flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};