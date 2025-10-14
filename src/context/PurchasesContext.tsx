import { createContext, useContext, useState, type ReactNode, useEffect } from 'react'
import { type Purchase } from '../types/types'
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase/firebase'

interface PurchasesContextType {
  purchases: Purchase[]
  loading: boolean
  error: string | null
  addPurchase: (purchase: Omit<Purchase, 'id' | 'createdAt'>) => Promise<void>
  removePurchase: (purchaseId: string) => Promise<void>
  getRecentPurchases: (count?: number) => Purchase[]
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

  // Remove purchase function
  const removePurchase = async (purchaseId: string) => {
    try {
      // Delete from Firebase
      await deleteDoc(doc(db, 'purchases', purchaseId))
      
      // Update local state
      setPurchases(prev => prev.filter(purchase => purchase.id !== purchaseId))
    } catch (error) {
      console.error('Error removing purchase:', error)
      throw error
    }
  }

  // Get recent purchases function
  const getRecentPurchases = (count: number = 5): Purchase[] => {
    return purchases
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
      .slice(0, count)
  }

  useEffect(() => {
    const loadPurchases = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Load purchases ordered by purchase date (most recent first)
        const q = query(
          collection(db, 'purchases'), 
          orderBy('purchaseDate', 'desc')
        )
        
        const querySnapshot = await getDocs(q)
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
    addPurchase,
    removePurchase,
    getRecentPurchases
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