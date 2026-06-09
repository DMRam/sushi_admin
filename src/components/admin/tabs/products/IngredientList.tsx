import { useMemo, useState } from 'react'
import { Check, Pencil, Save, Search, Trash2, X } from 'lucide-react'
import { useIngredients } from '../../../../context/IngredientsContext'
import type { Ingredient, Unit } from '../../../../types/types'
import {
  getByosDisplayLabels,
  getByosEffectivePrice,
  getByosMinimumPrice,
  type ByosCategory,
} from '../../../../utils/byosCatalog'

type DraftIngredient = {
  name: string
  pricePerKg: string
  unit: Unit
  category: string
  currentStock: string
  minimumStock: string
  displayOnBYOS: boolean
  byosName: string
  byosCategory: ByosCategory
  byosPrice: string
  byosMaxPerRoll: string
  byosSortOrder: string
  purchaseQuantity: string
  purchaseUnit: Unit
  purchaseTotalPaid: string
}

const units: Unit[] = ['kg', 'g', 'ml', 'l', 'unit', 'piece', 'slice', 'tbsp', 'tsp', 'oz', 'lb']

const inventoryCategories = [
  'seafood',
  'vegetables',
  'fruits',
  'spices',
  'dairy',
  'grains',
  'sauce',
  'packaging',
  'other',
]

const byosCategories: Array<{ value: ByosCategory; label: string }> = [
  { value: 'protein', label: 'Protein' },
  { value: 'filling', label: 'Filling' },
  { value: 'rolledOn', label: 'Rolled on' },
  { value: 'sauce', label: 'Sauce' },
  { value: 'extra', label: 'Extra' },
]

const compactInput =
  'h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-1 focus:ring-slate-950'

const compactSelect = `${compactInput} appearance-auto`

function createDraft(ingredient: Ingredient): DraftIngredient {
  return {
    name: ingredient.name || '',
    pricePerKg: String(ingredient.pricePerKg || 0),
    unit: ingredient.unit || 'kg',
    category: ingredient.category || 'other',
    currentStock: String(ingredient.currentStock || 0),
    minimumStock: String(ingredient.minimumStock || 0),
    displayOnBYOS: Boolean(ingredient.displayOnBYOS),
    byosName: ingredient.byosName || '',
    byosCategory: (ingredient.byosCategory || 'extra') as ByosCategory,
    byosPrice: String(ingredient.byosPrice || ''),
    byosMaxPerRoll: String(ingredient.byosMaxPerRoll || 1),
    byosSortOrder: String(ingredient.byosSortOrder || 999),
    purchaseQuantity: '',
    purchaseUnit: 'g',
    purchaseTotalPaid: '',
  }
}

function toNumber(value: string, fallback = 0) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toInt(value: string, fallback = 0) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function baseCostLabel(unit: Unit) {
  if (['kg', 'g', 'lb', 'oz'].includes(unit)) return 'kg'
  if (['l', 'ml'].includes(unit)) return 'L'
  return unit
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

function calculateBaseCost(quantity: string, purchaseUnit: Unit, totalPaid: string) {
  const normalizedQuantity = normalizeToBaseQuantity(toNumber(quantity), purchaseUnit)
  const paid = toNumber(totalPaid)
  if (!normalizedQuantity || !paid) return 0
  return paid / normalizedQuantity
}

export default function IngredientList() {
  const { ingredients, loading, removeIngredient, updateIngredient } = useIngredients()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'byos' | 'missingPrice' | 'lowStock'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, DraftIngredient>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const filteredIngredients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return ingredients
      .filter((ingredient) => {
        if (filter === 'byos') return ingredient.displayOnBYOS
        if (filter === 'missingPrice') return ingredient.displayOnBYOS && !Number(ingredient.byosPrice || 0)
        if (filter === 'lowStock') return Number(ingredient.currentStock || 0) <= Number(ingredient.minimumStock || 0)
        return true
      })
      .filter((ingredient) => {
        if (!normalizedQuery) return true
        return [
          ingredient.name,
          ingredient.byosName,
          ingredient.category,
          ingredient.byosCategory,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      })
      .sort((a, b) => {
        if (a.displayOnBYOS !== b.displayOnBYOS) return a.displayOnBYOS ? -1 : 1
        const byosSort = Number(a.byosSortOrder || 999) - Number(b.byosSortOrder || 999)
        if (a.displayOnBYOS && byosSort !== 0) return byosSort
        const categorySort = String(a.category || '').localeCompare(String(b.category || ''))
        if (categorySort !== 0) return categorySort
        return String(a.name || '').localeCompare(String(b.name || ''))
      })
  }, [filter, ingredients, query])

  const startEdit = (ingredient: Ingredient) => {
    setDrafts((current) => ({ ...current, [ingredient.id]: createDraft(ingredient) }))
    setEditingId(ingredient.id)
  }

  const cancelEdit = (id: string) => {
    setEditingId(null)
    setDrafts((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  const updateDraft = (id: string, updates: Partial<DraftIngredient>) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...updates,
      },
    }))
  }

  const saveIngredient = async (id: string) => {
    const draft = drafts[id]
    if (!draft) return

    const customerName = draft.byosName.trim() || draft.name.trim()
    const labels = getByosDisplayLabels(customerName, draft.byosCategory)
    const effectiveByosPrice = getByosEffectivePrice(
      customerName,
      draft.byosCategory,
      toNumber(draft.byosPrice),
    )

    setSavingId(id)
    try {
      await updateIngredient(id, {
        name: draft.name.trim(),
        pricePerKg: toNumber(draft.pricePerKg),
        unit: draft.unit,
        category: draft.category.trim() || 'other',
        currentStock: toNumber(draft.currentStock),
        minimumStock: toNumber(draft.minimumStock),
        displayOnBYOS: draft.displayOnBYOS,
        byosName: draft.displayOnBYOS ? labels?.fr || customerName : '',
        byosCategory: draft.byosCategory,
        byosPrice: draft.displayOnBYOS ? effectiveByosPrice : 0,
        byosMaxPerRoll: toInt(draft.byosMaxPerRoll, 1),
        byosSortOrder: toInt(draft.byosSortOrder, 999),
      })
      cancelEdit(id)
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">
        Loading ingredients...
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[1fr_220px]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
            placeholder="Search massago, salmon, sauce, BYOS..."
          />
        </label>
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as typeof filter)}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950"
        >
          <option value="all">All ingredients</option>
          <option value="byos">BYOS only</option>
          <option value="missingPrice">BYOS missing price</option>
          <option value="lowStock">Low stock</option>
        </select>
      </div>

      <div className="overflow-hidden border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Editable grid</p>
            <h4 className="text-base font-semibold text-slate-950">Ingredients</h4>
          </div>
          <p className="text-sm text-slate-500">
            {filteredIngredients.length} shown of {ingredients.length}
          </p>
        </div>

        {filteredIngredients.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No ingredients match this view.
          </div>
        ) : (
          <div className="max-h-[72vh] overflow-auto">
            <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-950 text-xs uppercase tracking-[0.12em] text-white shadow-sm">
                <tr>
                  <th className="sticky left-0 z-20 w-[220px] bg-slate-950 px-3 py-3 font-semibold">Ingredient</th>
                  <th className="w-[120px] px-3 py-3 font-semibold">Category</th>
                  <th className="w-[110px] px-3 py-3 font-semibold">Cost</th>
                  <th className="w-[90px] px-3 py-3 font-semibold">Unit</th>
                  <th className="w-[110px] px-3 py-3 font-semibold">Stock</th>
                  <th className="w-[110px] px-3 py-3 font-semibold">Min</th>
                  <th className="w-[90px] px-3 py-3 font-semibold">BYOS</th>
                  <th className="w-[150px] px-3 py-3 font-semibold">BYOS name</th>
                  <th className="w-[120px] px-3 py-3 font-semibold">Section</th>
                  <th className="w-[100px] px-3 py-3 font-semibold">Price</th>
                  <th className="w-[90px] px-3 py-3 font-semibold">Order</th>
                  <th className="w-[120px] px-3 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredIngredients.map((ingredient) => {
                  const isEditing = editingId === ingredient.id
                  const draft = drafts[ingredient.id] || createDraft(ingredient)
                  const customerName = draft.byosName.trim() || draft.name.trim()
                  const minimumPrice = getByosMinimumPrice(customerName, draft.byosCategory)
                  const effectivePrice = getByosEffectivePrice(
                    customerName,
                    draft.byosCategory,
                    toNumber(draft.byosPrice),
                  )
                  const labels = getByosDisplayLabels(customerName, draft.byosCategory)
                  const stockIsLow =
                    Number(ingredient.currentStock || 0) <= Number(ingredient.minimumStock || 0)
                  const easyCost = calculateBaseCost(
                    draft.purchaseQuantity,
                    draft.purchaseUnit,
                    draft.purchaseTotalPaid,
                  )

                  return (
                    <tr key={ingredient.id} className={isEditing ? 'admin-row-editing bg-amber-50/60' : 'bg-white hover:bg-slate-50'}>
                      <td className={`sticky left-0 z-[1] px-3 py-3 align-top shadow-[1px_0_0_#e2e8f0] ${isEditing ? 'bg-amber-50' : 'bg-white'}`}>
                        {isEditing ? (
                          <input
                            value={draft.name}
                            onChange={(event) => updateDraft(ingredient.id, { name: event.target.value })}
                            className={compactInput}
                          />
                        ) : (
                          <div>
                            <p className="font-semibold text-slate-950">{ingredient.name}</p>
                            {ingredient.displayOnBYOS && (
                              <p className="mt-1 text-xs text-amber-700">
                                Customer: {labels?.fr || ingredient.byosName || ingredient.name}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        {isEditing ? (
                          <select
                            value={draft.category}
                            onChange={(event) => updateDraft(ingredient.id, { category: event.target.value })}
                            className={compactSelect}
                          >
                            {inventoryCategories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {ingredient.category || 'other'}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={draft.pricePerKg}
                              onChange={(event) => updateDraft(ingredient.id, { pricePerKg: event.target.value })}
                              className={compactInput}
                            />
                            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2">
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-800">
                                Easy entry
                              </p>
                              <div className="grid grid-cols-[1fr_58px] gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={draft.purchaseQuantity}
                                  onChange={(event) =>
                                    updateDraft(ingredient.id, { purchaseQuantity: event.target.value })
                                  }
                                  className="h-8 rounded border border-emerald-200 bg-white px-2 text-xs outline-none focus:border-emerald-600"
                                  placeholder="Qty"
                                />
                                <select
                                  value={draft.purchaseUnit}
                                  onChange={(event) =>
                                    updateDraft(ingredient.id, { purchaseUnit: event.target.value as Unit })
                                  }
                                  className="h-8 rounded border border-emerald-200 bg-white px-1 text-xs outline-none focus:border-emerald-600"
                                >
                                  {units.map((unit) => (
                                    <option key={unit} value={unit}>
                                      {unit}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={draft.purchaseTotalPaid}
                                  onChange={(event) =>
                                    updateDraft(ingredient.id, { purchaseTotalPaid: event.target.value })
                                  }
                                  className="h-8 rounded border border-emerald-200 bg-white px-2 text-xs outline-none focus:border-emerald-600"
                                  placeholder="Paid $"
                                />
                                <button
                                  type="button"
                                  disabled={!easyCost}
                                  onClick={() =>
                                    updateDraft(ingredient.id, {
                                      pricePerKg: easyCost.toFixed(4),
                                      unit: ['ml', 'l'].includes(draft.purchaseUnit)
                                        ? 'l'
                                        : ['g', 'kg', 'oz', 'lb'].includes(draft.purchaseUnit)
                                          ? 'kg'
                                          : draft.purchaseUnit,
                                    })
                                  }
                                  className="h-8 rounded bg-emerald-700 px-2 text-xs font-semibold text-white disabled:bg-emerald-200"
                                >
                                  Use
                                </button>
                              </div>
                              {easyCost > 0 && (
                                <p className="mt-1 text-[11px] text-emerald-800">
                                  ${easyCost.toFixed(4)} / {baseCostLabel(draft.purchaseUnit)}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="font-medium text-slate-800">${Number(ingredient.pricePerKg || 0).toFixed(2)}</span>
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        {isEditing ? (
                          <select
                            value={draft.unit}
                            onChange={(event) => updateDraft(ingredient.id, { unit: event.target.value as Unit })}
                            className={compactSelect}
                          >
                            {units.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-600">{ingredient.unit || 'unit'}</span>
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={draft.currentStock}
                            onChange={(event) => updateDraft(ingredient.id, { currentStock: event.target.value })}
                            className={compactInput}
                          />
                        ) : (
                          <span className={stockIsLow ? 'font-semibold text-red-700' : 'text-slate-700'}>
                            {Number(ingredient.currentStock || 0).toFixed(2)}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={draft.minimumStock}
                            onChange={(event) => updateDraft(ingredient.id, { minimumStock: event.target.value })}
                            className={compactInput}
                          />
                        ) : (
                          <span className="text-slate-600">{Number(ingredient.minimumStock || 0).toFixed(2)}</span>
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={() => updateDraft(ingredient.id, { displayOnBYOS: !draft.displayOnBYOS })}
                            className={`inline-flex h-9 w-full items-center justify-center gap-1 rounded-md border px-2 text-xs font-semibold ${
                              draft.displayOnBYOS
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : 'border-slate-300 bg-white text-slate-500'
                            }`}
                          >
                            {draft.displayOnBYOS ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                            {draft.displayOnBYOS ? 'Yes' : 'No'}
                          </button>
                        ) : (
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              ingredient.displayOnBYOS
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {ingredient.displayOnBYOS ? 'BYOS' : 'Hidden'}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        {isEditing ? (
                          <input
                            value={draft.byosName}
                            disabled={!draft.displayOnBYOS}
                            onChange={(event) => updateDraft(ingredient.id, { byosName: event.target.value })}
                            className={compactInput}
                            placeholder="Customer name"
                          />
                        ) : (
                          <span className="text-slate-600">{ingredient.byosName || '-'}</span>
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        {isEditing ? (
                          <select
                            value={draft.byosCategory}
                            disabled={!draft.displayOnBYOS}
                            onChange={(event) => updateDraft(ingredient.id, { byosCategory: event.target.value as ByosCategory })}
                            className={compactSelect}
                          >
                            {byosCategories.map((category) => (
                              <option key={category.value} value={category.value}>
                                {category.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-600">{ingredient.byosCategory || '-'}</span>
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        {isEditing ? (
                          <div>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              disabled={!draft.displayOnBYOS}
                              value={draft.byosPrice}
                              onChange={(event) => updateDraft(ingredient.id, { byosPrice: event.target.value })}
                              className={compactInput}
                            />
                            {draft.displayOnBYOS && (
                              <p className="mt-1 text-[11px] text-slate-500">
                                Min ${minimumPrice.toFixed(2)} · pays ${effectivePrice.toFixed(2)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="font-medium text-slate-800">
                            {ingredient.displayOnBYOS
                              ? `$${getByosEffectivePrice(
                                  ingredient.byosName || ingredient.name,
                                  ingredient.byosCategory,
                                  ingredient.byosPrice,
                                ).toFixed(2)}`
                              : '-'}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        {isEditing ? (
                          <input
                            type="number"
                            value={draft.byosSortOrder}
                            disabled={!draft.displayOnBYOS}
                            onChange={(event) => updateDraft(ingredient.id, { byosSortOrder: event.target.value })}
                            className={compactInput}
                          />
                        ) : (
                          <span className="text-slate-600">{ingredient.displayOnBYOS ? ingredient.byosSortOrder || 999 : '-'}</span>
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => saveIngredient(ingredient.id)}
                              disabled={savingId === ingredient.id}
                              className="admin-action-button admin-action-button--primary admin-action-button--compact disabled:opacity-50"
                            >
                              <Save className="h-4 w-4" />
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelEdit(ingredient.id)}
                              className="admin-action-button admin-action-button--compact"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(ingredient)}
                              className="admin-action-button admin-action-button--compact"
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete ${ingredient.name}? This cannot be undone.`)) {
                                  removeIngredient(ingredient.id)
                                }
                              }}
                              className="admin-action-button admin-action-button--danger admin-action-button--compact"
                              aria-label={`Delete ${ingredient.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
