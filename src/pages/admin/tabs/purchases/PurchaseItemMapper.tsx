import { useEffect, useMemo, useState } from 'react'
import type { PurchaseItem } from './purchaseTypes'
import { suggestIngredientMatch, type IngredientOption } from './purchaseMappingUtils'


type PurchaseItemMapperProps = {
  items: PurchaseItem[]
  ingredients: IngredientOption[]
  onChange: (items: PurchaseItem[]) => void
}

function emptyItem(): PurchaseItem {
  return {
    id: crypto.randomUUID(),
    name: '',
    rawName: '',
    quantity: 1,
    unit: 'unit',
    unitPrice: 0,
    lineTotal: 0,
    mappingStatus: 'pending',
  }
}

export default function PurchaseItemMapper({
  items,
  ingredients,
  onChange,
}: PurchaseItemMapperProps) {
  const [localItems, setLocalItems] = useState<PurchaseItem[]>([])

  useEffect(() => {
    setLocalItems(items?.length ? items : [])
  }, [items])

  const ingredientMap = useMemo(() => {
    return new Map(ingredients.map((ing) => [ing.id, ing]))
  }, [ingredients])

  function updateItems(next: PurchaseItem[]) {
    setLocalItems(next)
    onChange(next)
  }

  function updateItem(index: number, patch: Partial<PurchaseItem>) {
    const next = [...localItems]
    const current = next[index]

    const updated: PurchaseItem = {
      ...current,
      ...patch,
    }

    if (
      patch.quantity !== undefined ||
      patch.unitPrice !== undefined
    ) {
      updated.lineTotal = Number(updated.quantity || 0) * Number(updated.unitPrice || 0)
    }

    next[index] = updated
    updateItems(next)
  }

  function addItem() {
    updateItems([...localItems, emptyItem()])
  }

  function removeItem(index: number) {
    updateItems(localItems.filter((_, i) => i !== index))
  }

  function autoMapOne(index: number) {
    const item = localItems[index]
    const suggestion = suggestIngredientMatch(item.name || item.rawName || '', ingredients)

    if (!suggestion) return

    updateItem(index, {
      ingredientId: suggestion.id,
      ingredientName: suggestion.name,
      category: suggestion.category,
      unit: item.unit || suggestion.unit || 'unit',
      mappingStatus: 'mapped',
    })
  }

  function autoMapAll() {
    const next = localItems.map((item) => {
      if (item.ingredientId) return item

      const suggestion = suggestIngredientMatch(item.name || item.rawName || '', ingredients)

      if (!suggestion) return item

      return {
        ...item,
        ingredientId: suggestion.id,
        ingredientName: suggestion.name,
        category: suggestion.category,
        unit: item.unit || suggestion.unit || 'unit',
        mappingStatus: 'mapped' as const,
      }
    })

    updateItems(next)
  }

  function onIngredientSelect(index: number, ingredientId: string) {
    const ingredient = ingredientMap.get(ingredientId)

    if (!ingredient) {
      updateItem(index, {
        ingredientId: undefined,
        ingredientName: undefined,
        mappingStatus: 'pending',
      })
      return
    }

    updateItem(index, {
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      category: ingredient.category,
      unit: localItems[index]?.unit || ingredient.unit || 'unit',
      mappingStatus: 'mapped',
    })
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Purchase items</h3>
          <p className="text-xs text-gray-500">Add, review, and map invoice items to ingredients.</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={autoMapAll}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Auto-map all
          </button>
          <button
            type="button"
            onClick={addItem}
            className="rounded-xl bg-gray-900 px-3 py-2 text-sm text-white hover:bg-gray-800"
          >
            Add item
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {localItems.map((item, index) => (
          <div key={item.id || index} className="rounded-xl border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-gray-800">
                Item {index + 1}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => autoMapOne(index)}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Auto-map
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input
                value={item.name}
                onChange={(e) => updateItem(index, { name: e.target.value, rawName: item.rawName || e.target.value })}
                placeholder="Item name"
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={item.quantity}
                onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                placeholder="Quantity"
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              />

              <input
                value={item.unit || ''}
                onChange={(e) => updateItem(index, { unit: e.target.value })}
                placeholder="Unit"
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={item.unitPrice}
                onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })}
                placeholder="Unit price"
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={item.lineTotal}
                onChange={(e) => updateItem(index, { lineTotal: Number(e.target.value) })}
                placeholder="Line total"
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              />

              <select
                value={item.ingredientId || ''}
                onChange={(e) => onIngredientSelect(index, e.target.value)}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              >
                <option value="">Select ingredient</option>
                {ingredients.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name}
                  </option>
                ))}
              </select>

              <input
                value={item.ingredientName || ''}
                disabled
                placeholder="Mapped ingredient"
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
              />

              <select
                value={item.mappingStatus || 'pending'}
                onChange={(e) =>
                  updateItem(index, {
                    mappingStatus: e.target.value as PurchaseItem['mappingStatus'],
                  })
                }
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              >
                <option value="pending">pending</option>
                <option value="mapped">mapped</option>
                <option value="ignored">ignored</option>
              </select>
            </div>
          </div>
        ))}

        {localItems.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
            No items yet. Add one manually or later populate from extraction.
          </div>
        )}
      </div>
    </div>
  )
}