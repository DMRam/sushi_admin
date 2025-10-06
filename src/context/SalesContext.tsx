// context/SalesContext.tsx
import React, { createContext, useContext, useState, type ReactNode, useEffect } from 'react'
import { type SalesRecord } from '../types/types'
import { collection, addDoc, getDocs, doc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/firebase'

interface SalesContextType {
  sales: SalesRecord[]
  addSale: (sale: Omit<SalesRecord, 'id' | 'createdAt'>) => Promise<void>
  removeSale: (saleId: string) => Promise<void> // Add this
  getRecentSales: (days?: number) => SalesRecord[]
  loading: boolean
  error: string | null
}

const SalesContext = createContext<SalesContextType | undefined>(undefined)

export const SalesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sales, setSales] = useState<SalesRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Helper function to convert Firestore timestamps
  const convertFirestoreTimestamp = (timestamp: any): string => {
    if (!timestamp) return new Date().toISOString()
    if (typeof timestamp === 'string') return timestamp
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString()
    }
    if (timestamp instanceof Date) return timestamp.toISOString()
    return new Date().toISOString()
  }

  // Load sales from Firebase
  useEffect(() => {
    const loadSales = async () => {
      try {
        setLoading(true)
        setError(null)
        const querySnapshot = await getDocs(collection(db, 'sales'))
        const salesList: SalesRecord[] = []

        querySnapshot.forEach((doc) => {
          const data = doc.data()
          salesList.push({
            id: doc.id,
            productId: data.productId,
            quantity: data.quantity,
            salePrice: data.salePrice,
            saleDate: data.saleDate,
            createdAt: convertFirestoreTimestamp(data.createdAt),
            lowStockFlag: data.lowStockFlag || false // Add this if you're using low stock tracking
          })
        })

        setSales(salesList)
      } catch (err) {
        console.error('Error loading sales:', err)
        setError('Failed to load sales')
      } finally {
        setLoading(false)
      }
    }

    loadSales()
  }, [])

  const addSale = async (saleData: Omit<SalesRecord, 'id' | 'createdAt'>) => {
    try {
      setError(null)
      const saleWithTimestamp = {
        ...saleData,
        createdAt: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, 'sales'), saleWithTimestamp)

      const newSale: SalesRecord = {
        ...saleData,
        id: docRef.id,
        createdAt: new Date().toISOString()
      }

      setSales(prev => [...prev, newSale])
    } catch (err) {
      console.error('Error adding sale:', err)
      setError('Failed to add sale')
      throw err
    }
  }

  const removeSale = async (saleId: string) => {
    try {
      setError(null)

      // Delete from Firebase
      await deleteDoc(doc(db, 'sales', saleId))

      // Update local state
      setSales(prev => prev.filter(sale => sale.id !== saleId))

      console.log('Sale deleted successfully:', saleId)
    } catch (err) {
      console.error('Error deleting sale:', err)
      setError('Failed to delete sale')
      throw err
    }
  }

  const getRecentSales = (days: number = 30): SalesRecord[] => {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    return sales.filter(sale => {
      const saleDate = new Date(sale.saleDate)
      return saleDate >= cutoffDate
    })
  }

  const value: SalesContextType = {
    sales,
    addSale,
    removeSale,
    getRecentSales,
    loading,
    error
  }

  return (
    <SalesContext.Provider value={value}>
      {children}
    </SalesContext.Provider>
  )
}

export const useSales = (): SalesContextType => {
  const context = useContext(SalesContext)
  if (!context) {
    throw new Error('useSales must be used within a SalesProvider')
  }
  return context
}