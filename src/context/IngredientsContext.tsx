import React, { createContext, useContext, useEffect, useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { Ingredient } from '../types/types'

type IngredientsContextType = {
  ingredients: Ingredient[]
  addIngredient: (data: Omit<Ingredient, 'id' | 'createdAt'>) => void
  updateIngredient: (id: string, data: Partial<Omit<Ingredient, 'id' | 'createdAt'>>) => void
  removeIngredient: (id: string) => void
  getIngredientById: (id: string) => Ingredient | undefined
}

const IngredientsContext = createContext<IngredientsContextType | undefined>(undefined)

export const IngredientsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    try {
      const raw = localStorage.getItem('ingredients')
      return raw ? JSON.parse(raw) : []
    } catch { 
      return [] 
    }
  })

  useEffect(() => {
    localStorage.setItem('ingredients', JSON.stringify(ingredients))
  }, [ingredients])

  const addIngredient = (data: Omit<Ingredient, 'id' | 'createdAt'>) => {
    const newIngredient: Ingredient = { 
      ...data, 
      id: uuid(), 
      createdAt: new Date().toISOString() 
    }
    setIngredients(prev => [newIngredient, ...prev])
  }

  const updateIngredient = (id: string, data: Partial<Omit<Ingredient, 'id' | 'createdAt'>>) => {
    setIngredients(prev => prev.map(ing => 
      ing.id === id ? { ...ing, ...data } : ing
    ))
  }

  const removeIngredient = (id: string) => {
    setIngredients(prev => prev.filter(ing => ing.id !== id))
  }

  const getIngredientById = (id: string): Ingredient | undefined => {
    return ingredients.find(ing => ing.id === id)
  }

  const value: IngredientsContextType = {
    ingredients,
    addIngredient,
    updateIngredient,
    removeIngredient,
    getIngredientById
  }

  return (
    <IngredientsContext.Provider value={value}>
      {children}
    </IngredientsContext.Provider>
  )
}

export const useIngredients = (): IngredientsContextType => {
  const context = useContext(IngredientsContext)
  if (!context) {
    throw new Error('useIngredients must be used within IngredientsProvider')
  }
  return context
}