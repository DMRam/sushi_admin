import { useMemo, useState } from 'react'
import type { IngredientsSectionAndCostProps } from '../../../../../../types/form_types'
import type { Unit } from '../../../../../../types/types'

function toNumber(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeToBaseQuantity(quantity: number, unit: Unit) {
  if (!quantity) return 0

  switch (unit) {
    case 'g':
      return quantity / 1000
    case 'kg':
      return quantity
    case 'oz':
      return quantity * 0.0283495
    case 'lb':
      return quantity * 0.453592
    case 'ml':
      return quantity / 1000
    case 'l':
      return quantity
    default:
      return quantity
  }
}

function calculateUnitCost(quantity: string, unit: Unit, totalPaid: string) {
  const normalized = normalizeToBaseQuantity(toNumber(quantity), unit)
  const paid = toNumber(totalPaid)
  if (!normalized || !paid) return 0
  return paid / normalized
}

function costBasisLabel(unit: Unit) {
  if (['g', 'kg', 'oz', 'lb'].includes(unit)) return 'kg'
  if (['ml', 'l'].includes(unit)) return 'L'
  return unit
}

const easyUnits: Unit[] = ['unit', 'piece', 'slice', 'g', 'kg', 'ml', 'l', 'oz', 'lb']

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
  const [directPurchase, setDirectPurchase] = useState({
    quantity: '',
    unit: 'unit' as Unit,
    totalPaid: '',
  })

  const calculatedDirectCost = useMemo(
    () => calculateUnitCost(directPurchase.quantity, directPurchase.unit, directPurchase.totalPaid),
    [directPurchase.quantity, directPurchase.totalPaid, directPurchase.unit],
  )

  return (
    <>
      {/* Ingredients Section - Only show for ingredient-based products */}
      {productType === 'ingredientBased' && (
        <div className="rounded-2xl border border-[#f0dfd8] bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#f45f4f]">Ingredients</h3>

          {/* Add Ingredient - Improved responsive layout */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <select
              value={newIngredient.id}
              onChange={(e) => setNewIngredient({ ...newIngredient, id: e.target.value })}
              className="min-w-0 flex-1 rounded-xl border border-[#eadbd4] px-3 py-3 font-medium focus:border-[#fb6a57] focus:outline-none focus:ring-2 focus:ring-[#fb6a57]/20"
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
                className="w-20 rounded-xl border border-[#eadbd4] px-3 py-3 font-medium focus:border-[#fb6a57] focus:outline-none focus:ring-2 focus:ring-[#fb6a57]/20"
              />

              <select
                value={newIngredient.unit}
                onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value as Unit })}
                className="w-20 rounded-xl border border-[#eadbd4] px-2 py-3 font-medium focus:border-[#fb6a57] focus:outline-none focus:ring-2 focus:ring-[#fb6a57]/20"
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
                className="flex-1 rounded-xl bg-[#fb6a57] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#f25543] focus:outline-none focus:ring-2 focus:ring-[#fb6a57]/20 sm:flex-none"
              >
                ADD
              </button>
            </div>
          </div>

          {/* Ingredients List */}
          <div className="space-y-2">
            {productIngredients.map((ingredient, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-xl border border-[#eadbd4] bg-[#fffaf7] p-3 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="rounded-2xl border border-[#f0dfd8] bg-white p-5 shadow-sm">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#f45f4f]">Direct cost</h3>
          <p className="text-sm text-gray-600 mb-3 font-light">
            Enter the cost directly for products like whole fish, pre-made items, or items purchased ready-to-sell.
          </p>
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-950">Easy direct cost</p>
                <p className="mt-1 text-xs leading-5 text-emerald-800">
                  Example: bought 12 drinks for $24.00. The app sets cost to $2.00 per item.
                </p>
              </div>
              {calculatedDirectCost > 0 && (
                <div className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-emerald-900 shadow-sm">
                  ${calculatedDirectCost.toFixed(4)} / {costBasisLabel(directPurchase.unit)}
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_1fr_auto]">
              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">
                  Bought quantity
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={directPurchase.quantity}
                  onChange={(e) => setDirectPurchase({ ...directPurchase, quantity: e.target.value })}
                  className="w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="12"
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">
                  Unit
                </span>
                <select
                  value={directPurchase.unit}
                  onChange={(e) => setDirectPurchase({ ...directPurchase, unit: e.target.value as Unit })}
                  className="w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {easyUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">
                  Total paid
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={directPurchase.totalPaid}
                  onChange={(e) => setDirectPurchase({ ...directPurchase, totalPaid: e.target.value })}
                  className="w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="24.00"
                />
              </label>
              <button
                type="button"
                disabled={!calculatedDirectCost}
                onClick={() =>
                  setFormData({
                    ...formData,
                    directCostPrice: calculatedDirectCost.toFixed(4),
                  })
                }
                className="self-end rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                Use cost
              </button>
            </div>
          </div>
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
        <div className="rounded-2xl border border-[#f0dfd8] bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#f45f4f]">Pricing & cost</h3>

          {/* Total Cost Display */}
          <div className="mb-4 rounded-2xl border border-[#eadbd4] bg-[#fffaf7] p-4">
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
              className="w-full rounded-xl border border-[#eadbd4] px-3 py-3 font-medium tracking-wide focus:border-[#fb6a57] focus:outline-none focus:ring-2 focus:ring-[#fb6a57]/20"
              placeholder="0.00"
            />

            {/* Profit Display - Only show when we have a valid selling price */}
            {formData.sellingPrice && !isNaN(sellingPriceNum) && sellingPriceNum > 0 && (
              <div className="mt-4 rounded-2xl border border-[#eadbd4] bg-[#fffaf7] p-4">
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
