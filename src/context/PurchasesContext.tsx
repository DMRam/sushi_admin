// context/PurchasesContext.tsx
import React, { createContext, useContext, useState, type ReactNode, useEffect } from 'react'
import { type Purchase } from '../types/types'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/firebase'

interface PurchasesContextType {
  purchases: Purchase[]
  loading: boolean
  error: string | null
}

const PurchasesContext = createContext<PurchasesContextType | undefined>(undefined)

export const PurchasesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const convertFirestoreTimestamp = (timestamp: any): string => {
    if (!timestamp) return new Date().toISOString()
    if (typeof timestamp === 'string') return timestamp
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString()
    }
    if (timestamp instanceof Date) return timestamp.toISOString()
    return new Date().toISOString()
  }

  useEffect(() => {
    const loadPurchases = async () => {
      try {
        setLoading(true)
        setError(null)
        const querySnapshot = await getDocs(collection(db, 'purchases'))
        const purchasesList: Purchase[] = []
        
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          purchasesList.push({
            id: doc.id,
            ingredientId: data.ingredientId,
            ingredientName: data.ingredientName,
            quantity: data.quantity,
            unit: data.unit,
            totalCost: data.totalCost,
            pricePerKg: data.pricePerKg,
            supplier: data.supplier,
            purchaseDate: data.purchaseDate,
            deliveryDate: data.deliveryDate,
            invoiceNumber: data.invoiceNumber,
            notes: data.notes,
            quantityGrams: data.quantityGrams,
            createdAt: convertFirestoreTimestamp(data.createdAt)
          })
        })
        
        setPurchases(purchasesList)
      } catch (err) {
        console.error('Error loading purchases:', err)
        setError('Failed to load purchases')
      } finally {
        setLoading(false)
      }
    }

    loadPurchases()
  }, [])

  const value: PurchasesContextType = {
    purchases,
    loading,
    error
  }

  return (
    <PurchasesContext.Provider value={value}>
      {children}
    </PurchasesContext.Provider>
  )
}

export const usePurchases = (): PurchasesContextType => {
  const context = useContext(PurchasesContext)
  if (!context) {
    throw new Error('usePurchases must be used within a PurchasesProvider')
  }
  return context
}