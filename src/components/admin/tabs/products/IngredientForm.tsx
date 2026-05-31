import  { useState } from 'react'
import { useIngredients } from '../../../../context/IngredientsContext'
import type { Unit } from '../../../../types/types'
import {
  getByosDisplayLabels,
  getByosEffectivePrice,
  getByosMinimumPrice,
  type ByosCategory,
} from '../../../../utils/byosCatalog'

const categories = ['seafood', 'vegetables', 'fruits', 'spices', 'dairy', 'grains', 'other']
const units: Unit[] = ['kg', 'g', 'ml', 'l', 'unit']
const byosCategories = [
  { value: 'protein', label: 'Protein' },
  { value: 'filling', label: 'Filling' },
  { value: 'rolledOn', label: 'Rolled on' },
  { value: 'sauce', label: 'Sauce' },
  { value: 'extra', label: 'Extra' },
]

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <span className="mb-1.5 block">
      <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{label}</span>
      {hint && <span className="block text-xs leading-4 text-slate-500">{hint}</span>}
    </span>
  )
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
    byosCategory: 'extra',
    byosPrice: '',
    byosMaxPerRoll: '1',
    byosSortOrder: '999',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.pricePerKg) return
    
    setIsSubmitting(true)
    
    try {
      const byosCategory = formData.byosCategory as ByosCategory
      const customerName = formData.byosName.trim() || formData.name.trim()
      const labels = getByosDisplayLabels(customerName, byosCategory)
      const effectiveByosPrice = getByosEffectivePrice(customerName, byosCategory, Number.parseFloat(formData.byosPrice) || 0)
      const newIngredient = {
        name: formData.name.trim(),
        pricePerKg: Number.parseFloat(formData.pricePerKg),
        unit: formData.unit,
        category: formData.category,
        minimumStock: 0,
        currentStock: 0,
        stockGrams: 0,
        displayOnBYOS: formData.displayOnBYOS,
        byosName: formData.displayOnBYOS ? (labels?.fr || customerName) : '',
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
        byosCategory: 'extra',
        byosPrice: '',
        byosMaxPerRoll: '1',
        byosSortOrder: '999',
      })
      
    } catch (error) {
      console.error('Error adding ingredient: ', error)
      // You might want to show an error message to the user here
    } finally {
      setIsSubmitting(false)
    }
  }

  const byosCategory = formData.byosCategory as ByosCategory
  const customerName = formData.byosName.trim() || formData.name.trim()
  const labels = getByosDisplayLabels(customerName, byosCategory)
  const minimumByosPrice = getByosMinimumPrice(customerName, byosCategory)
  const effectiveByosPrice = getByosEffectivePrice(customerName, byosCategory, Number.parseFloat(formData.byosPrice) || 0)

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div>
        <FieldLabel label="Ingredient name" hint="Internal stock and recipe name." />
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Fresh Fish, Lime, Onion"
          required
          disabled={isSubmitting}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel label={`Purchase cost / ${formData.unit.toUpperCase()}`} hint={`Example: 20 means $20 per ${formData.unit.toUpperCase()}.`} />
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.pricePerKg}
            onChange={(e) => setFormData({...formData, pricePerKg: e.target.value})}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
            required
            disabled={isSubmitting}
          />
        </div>
        
        <div>
          <FieldLabel label="Inventory unit" />
          <select
            value={formData.unit}
            onChange={(e) => setFormData({...formData, unit: e.target.value as Unit})}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          >
            {units.map(unit => (
              <option key={unit} value={unit}>{unit.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <FieldLabel label="Inventory category" hint="For stock grouping only." />
        <select
          value={formData.category}
          onChange={(e) => setFormData({...formData, category: e.target.value})}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting}
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
        <label className="flex items-start gap-3">
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
          <div className="mt-4 rounded border border-amber-200 bg-white/70 p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-amber-900">Customer BYOS settings</p>
            <div className="mb-3 grid gap-2 rounded border border-amber-100 bg-amber-50/80 p-3 text-xs text-amber-950">
              <div className="grid gap-2 md:grid-cols-3">
                <div>
                  <span className="block font-semibold uppercase tracking-[0.12em] text-amber-700">FR</span>
                  <span>{labels?.fr || customerName || 'Set a display name'}</span>
                </div>
                <div>
                  <span className="block font-semibold uppercase tracking-[0.12em] text-amber-700">EN</span>
                  <span>{labels?.en || customerName || 'Set a display name'}</span>
                </div>
                <div>
                  <span className="block font-semibold uppercase tracking-[0.12em] text-amber-700">SP</span>
                  <span>{labels?.es || customerName || 'Set a display name'}</span>
                </div>
              </div>
              <div>
                <span className="font-semibold">BYOS price rule:</span> minimum ${minimumByosPrice.toFixed(2)}. Customer pays ${effectiveByosPrice.toFixed(2)} unless you set a higher price.
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label>
              <FieldLabel label="Customer display name" hint="What customers see in the BYOS modal." />
              <input
                type="text"
                value={formData.byosName}
                onChange={(e) => setFormData({ ...formData, byosName: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Leave blank to use ingredient name"
                disabled={isSubmitting}
              />
            </label>

            <label>
              <FieldLabel label="BYOS section" hint="Where this choice appears." />
              <select
                value={formData.byosCategory}
                onChange={(e) => setFormData({ ...formData, byosCategory: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
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
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="0.00"
                disabled={isSubmitting}
              />
            </label>

            <label>
              <FieldLabel label="Max per roll" hint="Usually 1." />
              <input
                type="number"
                min="1"
                value={formData.byosMaxPerRoll}
                onChange={(e) => setFormData({ ...formData, byosMaxPerRoll: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                disabled={isSubmitting}
              />
            </label>

            <label>
              <FieldLabel label="Sort order" hint="Lower appears first." />
              <input
                type="number"
                value={formData.byosSortOrder}
                onChange={(e) => setFormData({ ...formData, byosSortOrder: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                disabled={isSubmitting}
              />
            </label>
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Adding...' : 'Add Ingredient'}
      </button>
    </form>
  )
}
