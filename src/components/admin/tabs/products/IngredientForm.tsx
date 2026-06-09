import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useIngredients } from '../../../../context/IngredientsContext'
import type { Unit } from '../../../../types/types'
import {
  getByosDisplayLabels,
  getByosEffectivePrice,
  getByosMinimumPrice,
  type ByosCategory,
} from '../../../../utils/byosCatalog'

const categories = ['seafood', 'vegetables', 'fruits', 'spices', 'dairy', 'grains', 'other']
const units: Unit[] = ['kg', 'g', 'ml', 'l', 'unit', 'piece', 'slice', 'tbsp', 'tsp', 'oz', 'lb']
const byosCategories = [
  { value: 'protein', label: 'Protein' },
  { value: 'filling', label: 'Filling' },
  { value: 'rolledOn', label: 'Rolled on' },
  { value: 'sauce', label: 'Sauce' },
  { value: 'extra', label: 'Extra' },
]

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <span className="mb-1.5 block min-h-[42px]">
      <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{label}</span>
      {hint && <span className="block text-xs leading-4 text-slate-500">{hint}</span>}
    </span>
  )
}

function SectionCard({
  step,
  title,
  description,
  children,
  tone = 'neutral',
}: {
  step: string
  title: string
  description?: string
  children: ReactNode
  tone?: 'neutral' | 'green' | 'amber'
}) {
  const toneClass =
    tone === 'green'
      ? 'border-emerald-200 bg-emerald-50/70'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50/70'
        : 'border-slate-200 bg-white'

  const badgeClass =
    tone === 'green'
      ? 'bg-emerald-700 text-white'
      : tone === 'amber'
        ? 'bg-amber-600 text-white'
        : 'bg-slate-950 text-white'

  return (
    <section className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${toneClass}`}>
      <div className="mb-4 flex items-start gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badgeClass}`}>
          {step}
        </span>
        <div>
          <h4 className="text-sm font-semibold text-slate-950">{title}</h4>
          {description && <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

const inputClass =
  'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 disabled:bg-slate-100 disabled:text-slate-500'

const selectClass = `${inputClass} appearance-auto`

function toNumber(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function baseCostLabel(unit: Unit) {
  if (['kg', 'g', 'lb', 'oz'].includes(unit)) return 'kg'
  if (['l', 'ml'].includes(unit)) return 'L'
  return unit
}

function baseUnitForPurchaseUnit(unit: Unit): Unit {
  if (['ml', 'l'].includes(unit)) return 'l'
  if (['g', 'kg', 'oz', 'lb'].includes(unit)) return 'kg'
  return unit
}

function recipeUnitForBase(unit: Unit) {
  if (unit === 'kg') return 'g'
  if (unit === 'l') return 'ml'
  return unit
}

function formatMoney(value: number, decimals = 2) {
  if (!value) return '$0.00'
  return `$${value.toFixed(decimals)}`
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

export default function IngredientForm() {
  const { addIngredient } = useIngredients()
  const [formData, setFormData] = useState({
    name: '',
    pricePerKg: '',
    unit: 'kg' as Unit,
    category: 'other',
    displayOnBYOS: false,
    byosName: '',
    byosNameFr: '',
    byosNameEn: '',
    byosNameEs: '',
    byosCategory: 'extra',
    byosPrice: '',
    byosMaxPerRoll: '1',
    byosSortOrder: '999',
    purchaseQuantity: '',
    purchaseUnit: 'kg' as Unit,
    purchaseTotalPaid: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const calculatedPurchaseCost = useMemo(
    () => calculateBaseCost(formData.purchaseQuantity, formData.purchaseUnit, formData.purchaseTotalPaid),
    [formData.purchaseQuantity, formData.purchaseTotalPaid, formData.purchaseUnit],
  )
  const derivedCostUnit = baseUnitForPurchaseUnit(formData.purchaseUnit)
  const recipeUnit = recipeUnitForBase(derivedCostUnit)
  const smallUnitCost = ['kg', 'l'].includes(derivedCostUnit) ? calculatedPurchaseCost / 1000 : calculatedPurchaseCost
  const displayedCostUnit = formData.pricePerKg ? formData.unit : derivedCostUnit
  const displayedCostValue = formData.pricePerKg || (calculatedPurchaseCost ? calculatedPurchaseCost.toFixed(2) : '')

  const applyPurchaseCost = () => {
    if (!calculatedPurchaseCost) return
    setFormData((current) => ({
      ...current,
      pricePerKg: calculatedPurchaseCost.toFixed(4),
      unit: baseUnitForPurchaseUnit(current.purchaseUnit),
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const finalCost = formData.pricePerKg || (calculatedPurchaseCost ? calculatedPurchaseCost.toFixed(4) : '')
    if (!formData.name || !finalCost) return
    
    setIsSubmitting(true)
    
    try {
      const byosCategory = formData.byosCategory as ByosCategory
      const customerName = formData.byosNameFr.trim() || formData.byosName.trim() || formData.name.trim()
      const labels = getByosDisplayLabels(customerName, byosCategory)
      const byosNameFr = formData.byosNameFr.trim() || labels?.fr || customerName
      const byosNameEn = formData.byosNameEn.trim() || labels?.en || customerName
      const byosNameEs = formData.byosNameEs.trim() || labels?.es || customerName
      const effectiveByosPrice = getByosEffectivePrice(customerName, byosCategory, Number.parseFloat(formData.byosPrice) || 0)
      const newIngredient = {
        name: formData.name.trim(),
        pricePerKg: Number.parseFloat(finalCost),
        unit: formData.pricePerKg ? formData.unit : derivedCostUnit,
        category: formData.category,
        minimumStock: 0,
        currentStock: 0,
        stockGrams: 0,
        displayOnBYOS: formData.displayOnBYOS,
        byosName: formData.displayOnBYOS ? byosNameFr : '',
        byosNameFr: formData.displayOnBYOS ? byosNameFr : '',
        byosNameEn: formData.displayOnBYOS ? byosNameEn : '',
        byosNameEs: formData.displayOnBYOS ? byosNameEs : '',
        byosCategory,
        byosPrice: formData.displayOnBYOS ? effectiveByosPrice : 0,
        byosMaxPerRoll: Number.parseInt(formData.byosMaxPerRoll, 10) || 1,
        byosSortOrder: Number.parseInt(formData.byosSortOrder, 10) || 999,
      }

      await addIngredient(newIngredient)
      
      // Reset form
      setFormData({
        name: '',
        pricePerKg: '',
        unit: 'kg',
        category: 'other',
        displayOnBYOS: false,
        byosName: '',
        byosNameFr: '',
        byosNameEn: '',
        byosNameEs: '',
        byosCategory: 'extra',
        byosPrice: '',
        byosMaxPerRoll: '1',
        byosSortOrder: '999',
        purchaseQuantity: '',
        purchaseUnit: 'kg',
        purchaseTotalPaid: '',
      })
      
    } catch (error) {
      console.error('Error adding ingredient: ', error)
      // You might want to show an error message to the user here
    } finally {
      setIsSubmitting(false)
    }
  }

  const byosCategory = formData.byosCategory as ByosCategory
  const customerName = formData.byosNameFr.trim() || formData.byosName.trim() || formData.name.trim()
  const labels = getByosDisplayLabels(customerName, byosCategory)
  const displayLabelFr = formData.byosNameFr.trim() || labels?.fr || customerName
  const displayLabelEn = formData.byosNameEn.trim() || labels?.en || customerName
  const displayLabelEs = formData.byosNameEs.trim() || labels?.es || customerName
  const minimumByosPrice = getByosMinimumPrice(customerName, byosCategory)
  const effectiveByosPrice = getByosEffectivePrice(customerName, byosCategory, Number.parseFloat(formData.byosPrice) || 0)

  const canSubmit = Boolean(formData.name.trim() && (formData.pricePerKg || calculatedPurchaseCost))

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <SectionCard
        step="1"
        title="Easy ingredient entry"
        description="Enter what you bought and what you paid. Recipes can later use grams, ml, or units without extra math."
        tone="green"
      >
        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr_0.7fr_0.45fr_0.7fr]">
          <label>
            <FieldLabel label="Ingredient" hint="Internal stock and recipe name." />
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={inputClass}
              placeholder="Avocado"
              disabled={isSubmitting}
            />
          </label>

          <label>
            <FieldLabel label="Category" hint="For grouping." />
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={selectClass}
              disabled={isSubmitting}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <FieldLabel label="Bought" hint="Example: 1.25." />
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.purchaseQuantity}
              onChange={(e) => setFormData({ ...formData, purchaseQuantity: e.target.value })}
              className={inputClass}
              placeholder="1.25"
              disabled={isSubmitting}
            />
          </label>

          <label>
            <FieldLabel label="Unit" hint="Bought as." />
            <select
              value={formData.purchaseUnit}
              onChange={(e) => setFormData({ ...formData, purchaseUnit: e.target.value as Unit })}
              className={selectClass}
              disabled={isSubmitting}
            >
              {units.map(unit => (
                <option key={unit} value={unit}>{unit.toUpperCase()}</option>
              ))}
            </select>
          </label>

          <label>
            <FieldLabel label="Paid" hint="Total bill amount." />
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.purchaseTotalPaid}
              onChange={(e) => setFormData({ ...formData, purchaseTotalPaid: e.target.value })}
              className={inputClass}
              placeholder="10.00"
              disabled={isSubmitting}
            />
          </label>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
          <div className="rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-emerald-950">
            <span className="block font-semibold">
              {formData.purchaseQuantity && formData.purchaseTotalPaid
                ? `${formData.name.trim() || 'This ingredient'}: ${formatMoney(toNumber(formData.purchaseTotalPaid))} for ${formData.purchaseQuantity}${formData.purchaseUnit.toUpperCase()}`
                : 'Example: Avocado: $10.00 for 1.25KG'}
            </span>
            <span className="mt-1 block text-xs text-emerald-800">
              In product recipes, enter the amount used, such as 100g avocado in a roll.
            </span>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-emerald-950">
            <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Cost basis</span>
            <span className="mt-1 block text-lg font-semibold">{formatMoney(calculatedPurchaseCost)} / {baseCostLabel(derivedCostUnit)}</span>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-emerald-950">
            <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Recipe unit</span>
            <span className="mt-1 block text-lg font-semibold">{formatMoney(smallUnitCost, 3)} / {recipeUnit}</span>
          </div>

          <button
            type="button"
            onClick={applyPurchaseCost}
            disabled={!calculatedPurchaseCost || isSubmitting}
            className="h-full min-h-12 rounded-2xl bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            Use this cost
          </button>
        </div>
      </SectionCard>

      <SectionCard
        step="2"
        title="Saved cost"
        description="Auto-filled from purchase entry. Only edit this if you need to override the calculated value."
      >
        <div className="grid gap-4 md:grid-cols-[1fr_280px]">
          <label>
            <FieldLabel label={`Recipe cost / ${baseCostLabel(displayedCostUnit)}`} hint="Saved to ingredient cost." />
            <input
              type="number"
              step="0.0001"
              min="0"
              value={displayedCostValue}
              onChange={(e) => setFormData({ ...formData, pricePerKg: e.target.value })}
              className={inputClass}
              placeholder="0.0000"
              disabled={isSubmitting}
            />
          </label>

          <label>
            <FieldLabel label="Cost basis" hint="Auto-selected from purchase unit." />
            <select
              value={formData.pricePerKg ? formData.unit : derivedCostUnit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value as Unit })}
              className={selectClass}
              disabled={isSubmitting}
            >
              {units.map(unit => (
                <option key={unit} value={unit}>{unit.toUpperCase()}</option>
              ))}
            </select>
          </label>
        </div>
      </SectionCard>

      <SectionCard
        step="3"
        title="Customer names and BYOS"
        description="Optional. Enable when this ingredient should appear as a customer choice. Locales are previewed before saving."
        tone="amber"
      >
        <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-white p-3">
          <input
            type="checkbox"
            checked={formData.displayOnBYOS}
            onChange={(e) => setFormData({ ...formData, displayOnBYOS: e.target.checked })}
            className="mt-1 h-4 w-4"
            disabled={isSubmitting}
          />
          <span>
            <span className="block text-sm font-medium text-amber-950">Show in Build Your Own Sushi</span>
            <span className="block text-xs text-amber-800">Use this only for simple customer-facing choices.</span>
          </span>
        </label>

        {formData.displayOnBYOS && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-white/80 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-amber-900">Customer BYOS settings</p>
            <div className="mb-3 grid gap-2 rounded border border-amber-100 bg-amber-50/80 p-3 text-xs text-amber-950">
              <div className="grid gap-2 md:grid-cols-3">
                <div>
                  <span className="block font-semibold uppercase tracking-[0.12em] text-amber-700">FR</span>
                  <span>{displayLabelFr || 'Set a French name'}</span>
                </div>
                <div>
                  <span className="block font-semibold uppercase tracking-[0.12em] text-amber-700">EN</span>
                  <span>{displayLabelEn || 'Set an English name'}</span>
                </div>
                <div>
                  <span className="block font-semibold uppercase tracking-[0.12em] text-amber-700">SP</span>
                  <span>{displayLabelEs || 'Set a Spanish name'}</span>
                </div>
              </div>
              <div>
                <span className="font-semibold">BYOS price rule:</span> minimum ${minimumByosPrice.toFixed(2)}. Customer pays ${effectiveByosPrice.toFixed(2)} unless you set a higher price.
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label>
              <FieldLabel label="BYOS section" hint="Where this choice appears." />
              <select
                value={formData.byosCategory}
                onChange={(e) => setFormData({ ...formData, byosCategory: e.target.value })}
                className={selectClass}
                disabled={isSubmitting}
              >
                {byosCategories.map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
            </label>

            <label>
              <FieldLabel label="Customer price" hint={`Minimum here is $${minimumByosPrice.toFixed(2)} unless you set a higher price.`} />
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.byosPrice}
                onChange={(e) => setFormData({ ...formData, byosPrice: e.target.value })}
                className={inputClass}
                placeholder="0.00"
                disabled={isSubmitting}
              />
            </label>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <label>
                <FieldLabel label="French name" hint="Customer-facing menu text." />
                <input
                  type="text"
                  value={formData.byosNameFr}
                  onChange={(e) => setFormData({ ...formData, byosNameFr: e.target.value })}
                  className={inputClass}
                  placeholder={labels?.fr || 'Avocat'}
                  disabled={isSubmitting}
                />
              </label>

              <label>
                <FieldLabel label="English name" hint="Customer-facing menu text." />
                <input
                  type="text"
                  value={formData.byosNameEn}
                  onChange={(e) => setFormData({ ...formData, byosNameEn: e.target.value })}
                  className={inputClass}
                  placeholder={labels?.en || 'Avocado'}
                  disabled={isSubmitting}
                />
              </label>

              <label>
                <FieldLabel label="Spanish name" hint="Customer-facing menu text." />
                <input
                  type="text"
                  value={formData.byosNameEs}
                  onChange={(e) => setFormData({ ...formData, byosNameEs: e.target.value })}
                  className={inputClass}
                  placeholder={labels?.es || 'Palta'}
                  disabled={isSubmitting}
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">

            <label>
              <FieldLabel label="Max per roll" hint="Usually 1." />
              <input
                type="number"
                min="1"
                value={formData.byosMaxPerRoll}
                onChange={(e) => setFormData({ ...formData, byosMaxPerRoll: e.target.value })}
                className={inputClass}
                disabled={isSubmitting}
              />
            </label>

            <label>
              <FieldLabel label="Sort order" hint="Lower appears first." />
              <input
                type="number"
                value={formData.byosSortOrder}
                onChange={(e) => setFormData({ ...formData, byosSortOrder: e.target.value })}
                className={inputClass}
                disabled={isSubmitting}
              />
            </label>
            </div>
          </div>
        )}
      </SectionCard>

      <button
        type="submit"
        disabled={isSubmitting || !canSubmit}
        className="h-12 w-full rounded-xl bg-slate-950 px-4 text-sm font-semibold tracking-wide text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isSubmitting ? 'Adding...' : 'Add Ingredient'}
      </button>
    </form>
  )
}
