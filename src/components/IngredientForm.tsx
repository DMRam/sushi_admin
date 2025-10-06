import React, { useState } from 'react'
import { useIngredients } from '../context/IngredientsContext'
import type { Unit } from '../types/types'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../firebase/firebase'

const categories = ['seafood', 'vegetables', 'fruits', 'spices', 'dairy', 'grains', 'other']
const units: Unit[] = ['kg', 'g', 'ml', 'l', 'unit']

export default function IngredientForm() {
  const { addIngredient } = useIngredients()
  const [formData, setFormData] = useState({
    name: '',
    pricePerKg: '',
    unit: 'kg' as Unit,
    category: 'other'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.pricePerKg) return
    
    setIsSubmitting(true)
    
    try {
      // Create the ingredient object
      const newIngredient = {
        name: formData.name.trim(),
        pricePerKg: Number.parseFloat(formData.pricePerKg),
        unit: formData.unit,
        category: formData.category,
        minimumStock: 0,
        currentStock: 0,
        stockGrams: 0,
        createdAt: new Date() // Add timestamp
      }
      
      // Add to Firebase
      const docRef = await addDoc(collection(db, 'ingredients'), newIngredient)
      
      console.log('Ingredient added with ID: ', docRef.id)
      
      // Also update local context if needed
      addIngredient({
        ...newIngredient,
        id: docRef.id as string // Firebase auto-generated ID
      } as any)
      
      // Reset form
      setFormData({
        name: '',
        pricePerKg: '',
        unit: 'kg',
        category: 'other'
      })
      
    } catch (error) {
      console.error('Error adding ingredient: ', error)
      // You might want to show an error message to the user here
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Price per KG</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
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