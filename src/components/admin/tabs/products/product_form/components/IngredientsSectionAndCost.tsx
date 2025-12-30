import type { IngredientsSectionAndCostProps } from "../../../../../../types/form_types";
import type { Unit } from "../../../../../../types/types";

export const IngredientsSectionAndCost = ({
  productType,
  newIngredient,
  setNewIngredient,
  ingredients,
  isAdmin,
  handleAddIngredient,
  productIngredients,
  getIngredientName,
  getIngredientCost,
  handleRemoveIngredient,
  formData,
  setFormData,
  totalCost,
  sellingPriceNum,
  profit,
  profitMargin

}: IngredientsSectionAndCostProps) => {
  return (
    <>
      {/* Ingredients Section - Only show for ingredient-based products */}
      {productType === 'ingredientBased' && (
        <div className="bg-white border border-gray-200 rounded-sm p-6">
          <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">INGREDIENTS</h3>

          {/* Add Ingredient - Improved responsive layout */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <select
              value={newIngredient.id}
              onChange={(e) => setNewIngredient({ ...newIngredient, id: e.target.value })}
              className="flex-1 border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light min-w-0"
            >
              <option value="">SELECT INGREDIENT</option>
              {ingredients.map(ingredient => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name} {isAdmin && `($${ingredient.pricePerKg}/kg)`}
                </option>
              ))}
            </select>

            <div className="flex gap-2 sm:flex-nowrap flex-wrap">
              <input
                type="number"
                step="0.1"
                min="0"
                value={newIngredient.quantity}
                onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                placeholder="Qty"
                className="w-20 border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light"
              />

              <select
                value={newIngredient.unit}
                onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value as Unit })}
                className="w-20 border border-gray-300 rounded-sm px-2 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light"
              >
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="ml">ml</option>
                <option value="l">l</option>
                <option value="unit">unit</option>
              </select>

              <button
                type="button"
                onClick={handleAddIngredient}
                className="bg-gray-900 text-white px-4 py-3 text-sm font-light tracking-wide rounded-sm hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-900 flex-1 sm:flex-none"
              >
                ADD
              </button>
            </div>
          </div>

          {/* Ingredients List */}
          <div className="space-y-2">
            {productIngredients.map((ingredient, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-gray-50 p-3 rounded-sm">
                <div className="flex-1 min-w-0">
                  <span className="font-light text-gray-900 block truncate">
                    {getIngredientName(ingredient.id)}
                  </span>
                  <span className="text-sm text-gray-600 font-light">
                    {ingredient.quantity}{ingredient.unit}
                    {isAdmin && ` - $${getIngredientCost(ingredient).toFixed(2)}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveIngredient(index)}
                  className="text-red-600 hover:text-red-800 font-light text-sm w-full sm:w-auto text-center sm:text-left py-1 sm:py-0"
                >
                  REMOVE
                </button>
              </div>
            ))}

            {productIngredients.length === 0 && (
              <div className="text-center text-gray-500 py-4 font-light">
                No ingredients added. Add ingredients above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Direct Cost Input - Only show for direct cost products */}
      {productType === 'directCost' && (
        <div className="bg-white border border-gray-200 rounded-sm p-6">
          <h3 className="text-lg font-light text-gray-900 tracking-wide mb-2">DIRECT COST</h3>
          <p className="text-sm text-gray-600 mb-3 font-light">
            Enter the cost directly for products like whole fish, pre-made items, or items purchased ready-to-sell.
          </p>
          <div>
            <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">COST PRICE *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.directCostPrice}
              onChange={(e) => setFormData({ ...formData, directCostPrice: e.target.value })}
              className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide"
              placeholder="0.00"
              required
            />
          </div>
        </div>
      )}

      {!isAdmin &&
        (
          <>
            <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">SELLING PRICE (OPTIONAL)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
              className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide"
              placeholder="0.00"
            />

          </>
        )
      }

      {/* Cost Summary - Only show for admin users */}
      {isAdmin && (
        <div className="bg-white border border-gray-200 rounded-sm p-6">
          <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">COST & PRICING</h3>

          {/* Total Cost Display */}
          <div className="p-4 bg-gray-50 rounded-sm border border-gray-200 mb-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <span className="font-light text-gray-900 text-sm sm:text-base">
                {productType === 'ingredientBased' ? 'CALCULATED PRODUCT COST:' : 'DIRECT PRODUCT COST:'}
              </span>
              <span className="text-lg font-light text-gray-900">${totalCost.toFixed(2)}</span>
            </div>
            {productType === 'ingredientBased' && productIngredients.length === 0 && (
              <div className="text-sm text-orange-600 mt-1 font-light">
                No ingredients added. Cost will be $0.00 until ingredients are added.
              </div>
            )}
          </div>

          {/* Selling Price */}
          <div>
            <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">SELLING PRICE (OPTIONAL)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
              className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide"
              placeholder="0.00"
            />

            {/* Profit Display - Only show when we have a valid selling price */}
            {formData.sellingPrice && !isNaN(sellingPriceNum) && sellingPriceNum > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-sm border border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600 font-light">Cost Price:</div>
                    <div className="font-light text-gray-900">${totalCost.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 font-light">Selling Price:</div>
                    <div className="font-light text-gray-900">${sellingPriceNum.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 font-light">Profit:</div>
                    <div className={`font-light ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${profit.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 font-light">Margin:</div>
                    <div className={`font-light ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profitMargin.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
