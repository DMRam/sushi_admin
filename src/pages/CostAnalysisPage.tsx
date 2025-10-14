import { useProducts } from "../context/ProductsContext";
import { useIngredients } from "../context/IngredientsContext";
import { productCost } from "../utils/costCalculations";

export const CostAnalysisPage = () => {
  const { products, loading: productsLoading } = useProducts();
  const { ingredients, loading: ingredientsLoading } = useIngredients();

  if (productsLoading || ingredientsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading cost analysis...</div>
      </div>
    );
  }

  // Helper function to convert any quantity to grams for consistent calculation
  const convertToGrams = (quantity: number, unit: string): number => {
    switch (unit) {
      case 'kg': return quantity * 1000;
      case 'g': return quantity;
      case 'l': return quantity * 1000; // Assuming 1ml = 1g for liquids
      case 'ml': return quantity;
      case 'unit': return quantity; // For units, we'll treat them as "pieces"
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
        const ingredient = ingredients.find(ing => ing.id === item.ingredientId);
        if (!ingredient) return { units: 0, ingredient: null, currentStock: 0, requiredPerUnit: 0 };

        // Convert both required quantity and current stock to grams for consistent calculation
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

  // Rest of your statistics calculations...
  const totalProducts = products.length;

  const totalInventoryValue = ingredients.reduce((total, ing) => {
    return total + (ing.currentStock * ing.pricePerKg);
  }, 0);

  const totalPotentialRevenue = productsWithInventoryAnalysis.reduce((total, p) => total + p.potentialRevenue, 0);
  const totalPotentialProfit = productsWithInventoryAnalysis.reduce((total, p) => total + p.potentialProfit, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Cost & Sales Potential Dashboard
        </h1>

        {/* Enhanced Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900">
              Total Products
            </h3>
            <p className="text-3xl font-bold text-blue-700">{totalProducts}</p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-green-900">
              Potential Revenue
            </h3>
            <p className="text-3xl font-bold text-green-700">
              ${totalPotentialRevenue.toFixed(0)}
            </p>
            <div className="text-sm text-green-600 mt-1">
              From current inventory
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h3 className="text-lg font-semibold text-purple-900">
              Potential Profit
            </h3>
            <p className="text-3xl font-bold text-purple-700">
              ${totalPotentialProfit.toFixed(0)}
            </p>
            <div className="text-sm text-purple-600 mt-1">
              From current inventory
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h3 className="text-lg font-semibold text-orange-900">
              Inventory Value
            </h3>
            <p className="text-3xl font-bold text-orange-700">
              ${totalInventoryValue.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Products Grid with Sales Potential */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Product Analysis & Sales Potential
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productsWithInventoryAnalysis.map((product) => (
              <div
                key={product.id}
                className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg text-gray-900">
                    {product.name}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded ${product.productType === 'directCost'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                    }`}>
                    {product.productType === 'directCost' ? 'Direct Cost' : 'Ingredient Based'}
                  </span>
                </div>

                {/* Basic Cost Info */}
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost Price:</span>
                    <span className="font-medium">${product.cost.toFixed(2)}</span>
                  </div>

                  {product.sellingPrice ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Selling Price:</span>
                        <span className="font-medium">
                          ${product.sellingPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Profit:</span>
                        <span className={`font-medium ${product.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                          ${product.profit.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Margin:</span>
                        <span className={`font-medium ${product.margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {product.margin.toFixed(1)}%
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                      <div className="text-yellow-800 text-sm font-medium text-center">
                        No selling price set
                      </div>
                    </div>
                  )}
                </div>

                {/* Sales Potential Section */}
                {product.productType === 'ingredientBased' && product.ingredients.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2 text-sm">
                      📈 Sales Potential
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Max Units Possible:</span>
                        <span className={`font-medium ${product.maxUnitsFromInventory > 10 ? 'text-green-600' :
                            product.maxUnitsFromInventory > 0 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                          {product.maxUnitsFromInventory} units
                        </span>
                      </div>

                      {product.maxUnitsFromInventory > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Potential Revenue:</span>
                            <span className="font-medium text-green-600">
                              ${product.potentialRevenue.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Potential Profit:</span>
                            <span className="font-medium text-green-600">
                              ${product.potentialProfit.toFixed(2)}
                            </span>
                          </div>

                          {product.limitingIngredient && (
                            <div className="bg-blue-50 p-2 rounded border border-blue-200">
                              <div className="text-blue-700 text-xs">
                                <strong>Limiting Ingredient:</strong> {product.limitingIngredient.ingredient}
                                <br />
                                <span className="text-blue-600">
                                  Stock: {product.limitingIngredient.currentStock}{product.limitingIngredient.currentStockUnit} •
                                  Needed: {product.limitingIngredient.requiredPerUnit}{product.limitingIngredient.requiredUnit}/unit
                                </span>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {product.maxUnitsFromInventory === 0 && (
                        <div className="bg-red-50 p-2 rounded border border-red-200">
                          <div className="text-red-700 text-xs text-center">
                            ❌ Cannot make any units with current inventory
                          </div>
                          {product.limitingIngredient && (
                            <div className="text-red-600 text-xs mt-1">
                              Out of: {product.limitingIngredient.ingredient}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Ingredient Breakdown */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <h5 className="font-medium text-gray-700 mb-1 text-xs">Ingredients Needed:</h5>
                      <div className="space-y-1">
                        {product.ingredients.map((ing, index) => {
                          const ingredient = ingredients.find(i => i.id === ing.ingredientId);
                          if (!ingredient) return null;

                          const requiredGrams = convertToGrams(ing.quantity, ing.unit);
                          const currentStockGrams = convertToGrams(ingredient.currentStock, ingredient.unit);
                          const unitsPossible = Math.floor(currentStockGrams / requiredGrams);

                          return (
                            <div key={index} className="flex justify-between text-xs">
                              <span className="text-gray-600">{ingredient.name}:</span>
                              <span className={unitsPossible > 0 ? 'text-green-600' : 'text-red-600'}>
                                {unitsPossible} units possible
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
                    <div className="text-xs text-gray-500 text-center">
                      Direct cost product - inventory analysis not applicable
                    </div>
                  </div>
                )}

                {/* Additional product info */}
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                  {product.portionSize && (
                    <div className="text-xs text-gray-500">
                      Portion: {product.portionSize}
                    </div>
                  )}
                  {product.preparationTime && product.preparationTime > 0 && (
                    <div className="text-xs text-gray-500">
                      Prep time: {product.preparationTime}min
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory Health Summary */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Inventory Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700">Total Ingredients</h3>
              <p className="text-2xl font-bold text-gray-700">{ingredients.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-700">Well Stocked</h3>
              <p className="text-2xl font-bold text-green-600">
                {ingredients.filter(ing => ing.currentStock > ing.minimumStock).length}
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="font-medium text-yellow-700">Low Stock</h3>
              <p className="text-2xl font-bold text-yellow-600">
                {ingredients.filter(ing => ing.currentStock > 0 && ing.currentStock <= ing.minimumStock).length}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="font-medium text-red-700">Out of Stock</h3>
              <p className="text-2xl font-bold text-red-600">
                {ingredients.filter(ing => ing.currentStock === 0).length}
              </p>
            </div>
          </div>
        </div>

        {products.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <div className="text-lg mb-2">No products yet</div>
            <div className="text-sm">
              Create some products to see cost analysis
            </div>
          </div>
        )}
      </div>
    </div>
  );
};