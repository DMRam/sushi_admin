import  { useState } from 'react'
import { useIngredients } from '../../../../context/IngredientsContext';
import type { Unit } from '../../../../types/types';


export default function IngredientList() {
  const { ingredients, removeIngredient, updateIngredient } = useIngredients()
  const [editingId, setEditingId] = useState<string | null>(null)
  // Make sure to import or define the Unit type if not already imported
  // import type { Unit } from '../types' (adjust path as needed)
  const [editForm, setEditForm] = useState<{ name: string; pricePerKg: string; unit: Unit; category: string }>({ name: '', pricePerKg: '', unit: 'kg', category: 'other' })

  const handleEdit = (ingredient: typeof ingredients[0]) => {
    setEditingId(ingredient.id)
    setEditForm({
      name: ingredient.name,
      pricePerKg: ingredient.pricePerKg.toString(),
      unit: ingredient.unit,
      category: ingredient.category
    })
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    
    updateIngredient(editingId, {
      name: editForm.name.trim(),
      pricePerKg: Number.parseFloat(editForm.pricePerKg),
      unit: editForm.unit,
      category: editForm.category
    })
    
    setEditingId(null)
    setEditForm({ name: '', pricePerKg: '', unit: 'kg', category: 'other' })
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditForm({ name: '', pricePerKg: '', unit: 'kg', category: 'other' })
  }

  const groupedIngredients = ingredients.reduce<Record<string, typeof ingredients>>((acc, ingredient) => {
    const category = ingredient.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(ingredient)
    return acc
  }, {})

  return (
    <div className="space-y-6 mt-4">
      {ingredients.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No ingredients added yet. Add your first ingredient above!
        </div>
      ) : (
        Object.entries(groupedIngredients).map(([category, categoryIngredients]) => (
          <div key={category}>
            <h3 className="text-md font-medium text-gray-700 mb-3 capitalize border-b pb-1">
              {category} ({categoryIngredients.length})
            </h3>
            <div className="space-y-2">
              {categoryIngredients.map(ingredient => (
                <div key={ingredient.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  {editingId === ingredient.id ? (
                    <form onSubmit={handleUpdate} className="flex-1 flex gap-2 items-center">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        className="flex-1 px-2 py-1 border rounded text-sm"
                        required
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.pricePerKg}
                        onChange={(e) => setEditForm({...editForm, pricePerKg: e.target.value})}
                        className="w-20 px-2 py-1 border rounded text-sm"
                        required
                      />
                      <button 
                        type="submit" 
                        className="bg-green-600 text-white px-2 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button 
                        type="button" 
                        onClick={handleCancel}
                        className="bg-gray-500 text-white px-2 py-1 rounded text-sm hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{ingredient.name}</div>
                        <div className="text-sm text-gray-600">
                          ${ingredient.pricePerKg.toFixed(2)}/kg • {ingredient.unit}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(ingredient)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => removeIngredient(ingredient.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </>
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