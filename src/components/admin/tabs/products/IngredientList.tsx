import { useMemo, useState } from 'react'
import { useIngredients } from '../../../../context/IngredientsContext'
import type { Ingredient, Unit } from '../../../../types/types'
import {
  getByosDisplayLabels,
  getByosEffectivePrice,
  getByosMinimumPrice,
  type ByosCategory,
} from '../../../../utils/byosCatalog'

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <span className="mb-1.5 block">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">{label}</span>
      {hint && <span className="block text-xs leading-4 text-slate-500">{hint}</span>}
    </span>
  )
}

function EditorSection({
  eyebrow,
  title,
  detail,
  children,
}: {
  eyebrow: string
  title: string
  detail?: string
  children: React.ReactNode
}) {
  return (
    <section className="border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p>
        <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h4 className="text-sm font-semibold text-slate-950">{title}</h4>
          {detail && <p className="text-xs text-slate-500">{detail}</p>}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

const fieldClass = 'h-11 w-full border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950'

const byosCategories: Array<{ value: ByosCategory; label: string }> = [
  { value: 'protein', label: 'Protein' },
  { value: 'filling', label: 'Filling' },
  { value: 'rolledOn', label: 'Rolled on' },
  { value: 'sauce', label: 'Sauce' },
  { value: 'extra', label: 'Extra' },
]

const units: Unit[] = ['kg', 'g', 'ml', 'l', 'unit']

const emptyEditForm = {
  name: '',
  pricePerKg: '',
  unit: 'kg' as Unit,
  category: 'other',
  displayOnBYOS: false,
  byosName: '',
  byosCategory: 'extra' as ByosCategory,
  byosPrice: '',
  byosMaxPerRoll: '1',
  byosSortOrder: '999',
}

export default function IngredientList() {
  const { ingredients, removeIngredient, updateIngredient } = useIngredients()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ ...emptyEditForm })
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'byos' | 'missingPrice' | 'outOfStock'>('all')

  const handleEdit = (ingredient: Ingredient) => {
    setEditingId(ingredient.id)
    setEditForm({
      name: ingredient.name,
      pricePerKg: String(ingredient.pricePerKg || 0),
      unit: ingredient.unit,
      category: ingredient.category,
      displayOnBYOS: ingredient.displayOnBYOS,
      byosName: ingredient.byosName || '',
      byosCategory: (ingredient.byosCategory || 'extra') as ByosCategory,
      byosPrice: String(ingredient.byosPrice || ''),
      byosMaxPerRoll: String(ingredient.byosMaxPerRoll || 1),
      byosSortOrder: String(ingredient.byosSortOrder || 999),
    })
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    const customerName = editForm.byosName.trim() || editForm.name.trim()
    const labels = getByosDisplayLabels(customerName, editForm.byosCategory)
    const effectiveByosPrice = getByosEffectivePrice(customerName, editForm.byosCategory, Number.parseFloat(editForm.byosPrice) || 0)

    await updateIngredient(editingId, {
      name: editForm.name.trim(),
      pricePerKg: Number.parseFloat(editForm.pricePerKg) || 0,
      unit: editForm.unit,
      category: editForm.category,
      displayOnBYOS: editForm.displayOnBYOS,
      byosName: editForm.displayOnBYOS ? (labels?.fr || customerName) : '',
      byosCategory: editForm.byosCategory,
      byosPrice: editForm.displayOnBYOS ? effectiveByosPrice : 0,
      byosMaxPerRoll: Number.parseInt(editForm.byosMaxPerRoll, 10) || 1,
      byosSortOrder: Number.parseInt(editForm.byosSortOrder, 10) || 999,
    })

    setEditingId(null)
    setEditForm({ ...emptyEditForm })
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditForm({ ...emptyEditForm })
  }

  const filteredIngredients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return ingredients
      .filter((ingredient) => {
        if (statusFilter === 'byos') return ingredient.displayOnBYOS
        if (statusFilter === 'missingPrice') return ingredient.displayOnBYOS && !Number(ingredient.byosPrice || 0)
        if (statusFilter === 'outOfStock') return ingredient.displayOnBYOS && !Number(ingredient.currentStock || 0)
        return true
      })
      .filter((ingredient) => {
        if (!normalizedQuery) return true
        return [ingredient.name, ingredient.byosName, ingredient.category, ingredient.byosCategory]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      })
      .sort((a, b) => {
        if (a.displayOnBYOS !== b.displayOnBYOS) return a.displayOnBYOS ? -1 : 1
        const categoryCompare = String(a.category || '').localeCompare(String(b.category || ''))
        if (categoryCompare !== 0) return categoryCompare
        return String(a.name || '').localeCompare(String(b.name || ''))
      })
  }, [ingredients, query, statusFilter])

  const groupedIngredients = filteredIngredients.reduce<Record<string, Ingredient[]>>((acc, ingredient) => {
    const category = ingredient.displayOnBYOS ? `BYOS · ${ingredient.byosCategory || 'extra'}` : ingredient.category || 'other'
    if (!acc[category]) acc[category] = []
    acc[category].push(ingredient)
    return acc
  }, {})

  const editCustomerName = editForm.byosName.trim() || editForm.name.trim()
  const editLabels = getByosDisplayLabels(editCustomerName, editForm.byosCategory)
  const editMinimumPrice = getByosMinimumPrice(editCustomerName, editForm.byosCategory)
  const editEffectivePrice = getByosEffectivePrice(editCustomerName, editForm.byosCategory, Number.parseFloat(editForm.byosPrice) || 0)

  return (
    <div className="mt-4 space-y-5">
      <div className="grid gap-3 border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[1fr_220px]">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-950"
          placeholder="Search ingredient, BYOS name, category..."
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          className="w-full border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-950"
        >
          <option value="all">All ingredients</option>
          <option value="byos">BYOS only</option>
          <option value="missingPrice">BYOS missing price</option>
          <option value="outOfStock">BYOS out of stock</option>
        </select>
      </div>

      {ingredients.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          No ingredients added yet. Add your first ingredient above.
        </div>
      ) : filteredIngredients.length === 0 ? (
        <div className="border border-dashed border-slate-300 bg-slate-50 py-8 text-center text-sm text-slate-500">
          No ingredients match this search.
        </div>
      ) : (
        Object.entries(groupedIngredients).map(([category, categoryIngredients]) => (
          <div key={category}>
            <h3 className="mb-3 border-b pb-1 text-md font-medium capitalize text-gray-700">
              {category} ({categoryIngredients.length})
            </h3>

            <div className="space-y-3">
              {categoryIngredients.map((ingredient) => (
                <div key={ingredient.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  {editingId === ingredient.id ? (
                    <form onSubmit={handleUpdate} className="overflow-hidden border border-slate-300 bg-white shadow-sm">
                      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-950 px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">Editing ingredient</p>
                          <h4 className="mt-1 text-base font-semibold">{editForm.name || 'Unnamed ingredient'}</h4>
                        </div>
                        <label className={`flex w-fit items-center gap-2 border px-3 py-2 text-xs font-semibold ${editForm.displayOnBYOS
                          ? 'border-amber-300 bg-amber-50 text-amber-900'
                          : 'border-white/20 bg-white/10 text-white/75'
                          }`}>
                          <input
                            type="checkbox"
                            checked={editForm.displayOnBYOS}
                            onChange={(e) => setEditForm({ ...editForm, displayOnBYOS: e.target.checked })}
                            className="h-4 w-4 accent-amber-500"
                          />
                          Show in BYOS
                        </label>
                      </div>

                      <div className="grid gap-4 bg-slate-50 p-4 xl:grid-cols-[0.95fr_1.35fr]">
                        <EditorSection
                          eyebrow="Inventory"
                          title="Stock and purchase cost"
                          detail={`Cost is per ${editForm.unit.toUpperCase()}`}
                        >
                          <div className="grid gap-3">
                            <label>
                              <FieldLabel label="Ingredient name" hint="Internal stock and recipe name." />
                              <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className={fieldClass}
                                required
                              />
                            </label>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <label>
                                <FieldLabel label={`Purchase cost / ${editForm.unit.toUpperCase()}`} hint={`20 means $20 per ${editForm.unit.toUpperCase()}.`} />
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editForm.pricePerKg}
                                  onChange={(e) => setEditForm({ ...editForm, pricePerKg: e.target.value })}
                                  className={fieldClass}
                                  required
                                />
                              </label>
                              <label>
                                <FieldLabel label="Inventory unit" hint="Unit used for stock." />
                                <select
                                  value={editForm.unit}
                                  onChange={(e) => setEditForm({ ...editForm, unit: e.target.value as Unit })}
                                  className={fieldClass}
                                >
                                  {units.map((unit) => (
                                    <option key={unit} value={unit}>{unit.toUpperCase()}</option>
                                  ))}
                                </select>
                              </label>
                            </div>

                            <label>
                              <FieldLabel label="Inventory category" hint="For stock grouping only." />
                              <input
                                type="text"
                                value={editForm.category}
                                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                className={fieldClass}
                              />
                            </label>
                          </div>
                        </EditorSection>

                        <EditorSection
                          eyebrow="Build your own sushi"
                          title={editForm.displayOnBYOS ? 'Customer choice settings' : 'Not visible to customers'}
                          detail={editForm.displayOnBYOS ? `Effective price $${editEffectivePrice.toFixed(2)}` : 'Enable Show in BYOS to configure'}
                        >
                          {editForm.displayOnBYOS ? (
                            <div className="space-y-4">
                              <div className="grid gap-2 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 lg:grid-cols-[1fr_1fr_1fr_1.4fr]">
                                <div>
                                  <span className="block font-semibold uppercase tracking-[0.12em] text-amber-700">FR</span>
                                  <span>{editLabels?.fr || editCustomerName || 'Set a display name'}</span>
                                </div>
                                <div>
                                  <span className="block font-semibold uppercase tracking-[0.12em] text-amber-700">EN</span>
                                  <span>{editLabels?.en || editCustomerName || 'Set a display name'}</span>
                                </div>
                                <div>
                                  <span className="block font-semibold uppercase tracking-[0.12em] text-amber-700">SP</span>
                                  <span>{editLabels?.es || editCustomerName || 'Set a display name'}</span>
                                </div>
                                <div className="border-t border-amber-200 pt-2 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
                                  <span className="block font-semibold uppercase tracking-[0.12em] text-amber-700">Price rule</span>
                                  <span>Minimum ${editMinimumPrice.toFixed(2)}. Customer pays ${editEffectivePrice.toFixed(2)}.</span>
                                </div>
                              </div>

                              <div className="grid gap-3 lg:grid-cols-12">
                                <label className="lg:col-span-4">
                                  <FieldLabel label="Customer display name" hint="Leave blank to use the normalized label." />
                                  <input
                                    type="text"
                                    value={editForm.byosName}
                                    onChange={(e) => setEditForm({ ...editForm, byosName: e.target.value })}
                                    className={fieldClass}
                                    placeholder="Example: Philadelphia"
                                  />
                                </label>
                                <label className="lg:col-span-2">
                                  <FieldLabel label="BYOS section" hint="Where it appears." />
                                  <select
                                    value={editForm.byosCategory}
                                    onChange={(e) => setEditForm({ ...editForm, byosCategory: e.target.value as ByosCategory })}
                                    className={fieldClass}
                                  >
                                    {byosCategories.map((category) => (
                                      <option key={category.value} value={category.value}>{category.label}</option>
                                    ))}
                                  </select>
                                </label>
                                <label className="lg:col-span-2">
                                  <FieldLabel label="Customer price" hint={`Minimum $${editMinimumPrice.toFixed(2)}.`} />
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={editForm.byosPrice}
                                    onChange={(e) => setEditForm({ ...editForm, byosPrice: e.target.value })}
                                    className={fieldClass}
                                    placeholder="1.25"
                                  />
                                </label>
                                <label className="lg:col-span-2">
                                  <FieldLabel label="Max / roll" hint="Usually 1." />
                                  <input
                                    type="number"
                                    min="1"
                                    value={editForm.byosMaxPerRoll}
                                    onChange={(e) => setEditForm({ ...editForm, byosMaxPerRoll: e.target.value })}
                                    className={fieldClass}
                                    placeholder="1"
                                  />
                                </label>
                                <label className="lg:col-span-2">
                                  <FieldLabel label="Sort order" hint="Lower first." />
                                  <input
                                    type="number"
                                    value={editForm.byosSortOrder}
                                    onChange={(e) => setEditForm({ ...editForm, byosSortOrder: e.target.value })}
                                    className={fieldClass}
                                    placeholder="100"
                                  />
                                </label>
                              </div>
                            </div>
                          ) : (
                            <div className="flex min-h-32 items-center justify-center border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                              <div>
                                <p className="text-sm font-semibold text-slate-700">Hidden from the BYOS modal</p>
                                <p className="mt-1 text-xs text-slate-500">Use the Show in BYOS switch above only for simple customer-facing choices.</p>
                              </div>
                            </div>
                          )}
                        </EditorSection>
                      </div>

                      <div className="flex flex-col gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:justify-end">
                        <button type="button" onClick={handleCancel} className="border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:bg-slate-50">
                          Cancel
                        </button>
                        <button type="submit" className="bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                          Save ingredient
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-gray-900">{ingredient.name}</span>
                          {ingredient.displayOnBYOS && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                              BYOS {ingredient.byosCategory || 'extra'} · ${getByosEffectivePrice(ingredient.byosName || ingredient.name, ingredient.byosCategory, ingredient.byosPrice).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          ${Number(ingredient.pricePerKg || 0).toFixed(2)}/kg · stock {Number(ingredient.currentStock || 0).toFixed(2)} {ingredient.unit || 'unit'}
                        </div>
                        {ingredient.displayOnBYOS && (
                          <div className="mt-1 text-xs text-gray-500">
                            {(() => {
                              const customerName = ingredient.byosName || ingredient.name
                              const labels = getByosDisplayLabels(customerName, ingredient.byosCategory)
                              const effectivePrice = getByosEffectivePrice(customerName, ingredient.byosCategory, ingredient.byosPrice)
                              return (
                                <>
                                  Visible: {labels?.fr || customerName} · EN {labels?.en || customerName} · SP {labels?.es || customerName} · ${effectivePrice.toFixed(2)} · max {ingredient.byosMaxPerRoll || 1}/roll
                                </>
                              )
                            })()}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button onClick={() => handleEdit(ingredient)} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                          Edit
                        </button>
                        <button onClick={() => removeIngredient(ingredient.id)} className="text-sm font-medium text-red-600 hover:text-red-800">
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
