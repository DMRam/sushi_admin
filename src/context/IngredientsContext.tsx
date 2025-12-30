import  { createContext, useContext, useEffect, useState } from 'react'
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/firebase'
import type { Ingredient } from '../types/types'

type IngredientsContextType = {
  ingredients: Ingredient[]
  addIngredient: (data: Omit<Ingredient, 'id' | 'createdAt'>) => Promise<string> // Return the Firebase ID
  updateIngredient: (id: string, data: Partial<Omit<Ingredient, 'id' | 'createdAt'>>) => Promise<void>
  removeIngredient: (id: string) => Promise<void>
  getIngredientById: (id: string) => Ingredient | undefined
  loading: boolean
}

const IngredientsContext = createContext<IngredientsContextType | undefined>(undefined)

export const IngredientsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)

  // Load ingredients from Firebase on component mount
  useEffect(() => {
    const loadIngredients = async () => {
      try {
        setLoading(true)
        const querySnapshot = await getDocs(collection(db, 'ingredients'))
        const ingredientsList: Ingredient[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          ingredientsList.push({
            id: doc.id,
            name: data.name,
            pricePerKg: data.pricePerKg,
            unit: data.unit,
            category: data.category,
            minimumStock: data.minimumStock || 0,
            currentStock: data.currentStock || 0,
            stockGrams: data.stockGrams || 0,
            createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
            supplier: data.supplier,
            displayOnBYOS: false
          })
        })

        console.log('Loaded ingredients:', ingredientsList)
        setIngredients(ingredientsList)
      } catch (error) {
        console.error('Error loading ingredients:', error)
      } finally {
        setLoading(false)
      }
    }

    loadIngredients()
  }, [])

  const addIngredient = async (data: Omit<Ingredient, 'id' | 'createdAt'>): Promise<string> => {
    try {
      const ingredientWithTimestamp = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      // Add to Firebase and get the Firebase-generated ID
      const docRef = await addDoc(collection(db, 'ingredients'), ingredientWithTimestamp)

      // Create the new ingredient with Firebase ID
      const newIngredient: Ingredient = {
        ...data,
        id: docRef.id, // Use Firebase ID, not uuid()
        createdAt: new Date().toISOString(),
      }

      // Update local state
      setIngredients(prev => [newIngredient, ...prev])

      return docRef.id // Return the Firebase ID for immediate use
    } catch (error) {
      console.error('Error adding ingredient:', error)
      throw error
    }
  }

  const updateIngredient = async (id: string, data: Partial<Omit<Ingredient, 'id' | 'createdAt'>>) => {
    try {
      // Update in Firebase
      await updateDoc(doc(db, 'ingredients', id), {
        ...data,
        updatedAt: serverTimestamp(),
      })

      // Update local state
      setIngredients(prev => prev.map(ing =>
        ing.id === id ? { ...ing, ...data } : ing
      ))
    } catch (error) {
      console.error('Error updating ingredient:', error)
      throw error
    }
  }

  const removeIngredient = async (id: string) => {
    try {
      // Delete from Firebase
      await deleteDoc(doc(db, 'ingredients', id))

      // Update local state
      setIngredients(prev => prev.filter(ing => ing.id !== id))
    } catch (error) {
      console.error('Error removing ingredient:', error)
      throw error
    }
  }

  const getIngredientById = (id: string): Ingredient | undefined => {
    return ingredients.find(ing => ing.id === id)
  }

  const value: IngredientsContextType = {
    ingredients,
    addIngredient,
    updateIngredient,
    removeIngredient,
    getIngredientById,
    loading
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