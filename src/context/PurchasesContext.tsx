import { createContext, useContext, useState, type ReactNode, useEffect } from 'react'
import { type Purchase } from '../types/types'
import { collection, getDocs, addDoc } from 'firebase/firestore'
import { db } from '../firebase/firebase'

interface PurchasesContextType {
  purchases: Purchase[]
  loading: boolean
  error: string | null
  addPurchase: (purchase: Omit<Purchase, 'id' | 'createdAt'>) => Promise<void>
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

  // Add purchase function
  const addPurchase = async (purchaseData: Omit<Purchase, 'id' | 'createdAt'>) => {
    try {
      const docRef = await addDoc(collection(db, 'purchases'), {
        ...purchaseData,
        createdAt: new Date().toISOString()
      })

      const newPurchase: Purchase = {
        ...purchaseData,
        id: docRef.id,
        createdAt: new Date().toISOString()
      }

      setPurchases(prev => [...prev, newPurchase])
    } catch (error) {
      console.error('Error adding purchase:', error)
      throw error
    }
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
    error,
    addPurchase
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