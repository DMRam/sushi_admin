import { createContext, useContext, useState, type ReactNode, useEffect } from 'react'
import { type SalesRecord } from '../types/types'
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '../firebase/firebase'

// =========================
// CONTEXT INTERFACE
// =========================
interface SalesContextType {
  sales: SalesRecord[]
  addSale: (sale: Omit<SalesRecord, 'id' | 'createdAt'>) => Promise<void>
  removeSale: (saleId: string) => Promise<void>
  getRecentSales: (days?: number) => SalesRecord[]
  fixPendingOrders: () => Promise<{ success: boolean; fixed: number; salesCreated: number; error?: string }>
  refreshSales: () => Promise<void>
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

const SalesContext = createContext<SalesContextType | undefined>(undefined)

// =========================
// PROVIDER IMPLEMENTATION
// =========================
export const SalesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sales, setSales] = useState<SalesRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Helper to normalize Firestore timestamps
  const convertFirestoreTimestamp = (timestamp: any): string => {
    if (!timestamp) return new Date().toISOString()
    if (typeof timestamp === 'string') return timestamp
    if (timestamp.toDate && typeof timestamp.toDate === 'function') return timestamp.toDate().toISOString()
    if (timestamp instanceof Date) return timestamp.toISOString()
    if (timestamp instanceof Timestamp) return timestamp.toDate().toISOString()
    return new Date().toISOString()
  }

  // =========================
  // REAL-TIME LISTENER
  // =========================
  useEffect(() => {
    setLoading(true)
    console.log('🔍 Setting up real-time sales listener...')

    const salesQuery = query(collection(db, 'sales'), orderBy('saleDate', 'desc'))

    const unsubscribe = onSnapshot(
      salesQuery,
      (querySnapshot) => {
        console.log('📊 Real-time sales update received:', querySnapshot.size, 'records')
        const salesList: SalesRecord[] = []

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data()
          const saleRecord: SalesRecord = {
            id: docSnap.id,
            orderId: data.orderId || '',
            products: data.products || [],
            subtotal: data.subtotal || 0,
            discountAmount: data.discountAmount || 0,
            taxes: data.taxes || { gst: 0, qst: 0, total: 0 },
            totalAmount: data.totalAmount || 0,
            costTotal: data.costTotal || 0,
            profitTotal: data.profitTotal || 0,
            saleDate: convertFirestoreTimestamp(data.saleDate),
            createdAt: convertFirestoreTimestamp(data.createdAt),
            customerName: data.customerName || '',
            customerEmail: data.customerEmail || '',
            saleType: data.saleType || 'walk_in',
            paymentStatus: data.paymentStatus || 'completed',
            lowStockFlag: data.lowStockFlag || false,
            stripeSessionId: data.stripeSessionId || ''
          }
          salesList.push(saleRecord)
        })

        salesList.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())

        console.log('✅ Sales updated:', salesList.length, 'records')
        setSales(salesList)
        setLastUpdated(new Date())
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('❌ Error listening to sales:', err)
        setError('Failed to load sales in real-time')
        setLoading(false)
        loadSalesFallback()
      }
    )

    return () => {
      console.log('🧹 Cleaning up sales listener')
      unsubscribe()
    }
  }, [])

  // =========================
  // FALLBACK LOADER
  // =========================
  const loadSalesFallback = async () => {
    try {
      setLoading(true)
      const querySnapshot = await getDocs(collection(db, 'sales'))
      const salesList: SalesRecord[] = []

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data()
        salesList.push({
          id: docSnap.id,
          orderId: data.orderId || '',
          products: data.products || [],
          subtotal: data.subtotal || 0,
          discountAmount: data.discountAmount || 0,
          taxes: data.taxes || { gst: 0, qst: 0, total: 0 },
          totalAmount: data.totalAmount || 0,
          costTotal: data.costTotal || 0,
          profitTotal: data.profitTotal || 0,
          saleDate: convertFirestoreTimestamp(data.saleDate),
          createdAt: convertFirestoreTimestamp(data.createdAt),
          customerName: data.customerName || '',
          customerEmail: data.customerEmail || '',
          saleType: data.saleType || 'walk_in',
          paymentStatus: data.paymentStatus || 'completed',
          lowStockFlag: data.lowStockFlag || false,
          stripeSessionId: data.stripeSessionId || ''
        })
      })

      salesList.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
      setSales(salesList)
      setLastUpdated(new Date())
      console.log('✅ Fallback sales loaded:', salesList.length, 'records')
    } catch (err) {
      console.error('Error loading sales (fallback):', err)
      setError('Failed to load sales')
    } finally {
      setLoading(false)
    }
  }

  // =========================
  // ADD SALE (ONE ORDER)
  // =========================
  const addSale = async (saleData: Omit<SalesRecord, 'id' | 'createdAt'>) => {
    try {
      setError(null)

      const saleWithTimestamp = {
        ...saleData,
        createdAt: serverTimestamp(),
        saleDate: saleData.saleDate || new Date().toISOString()
      }

      console.log('➕ Adding new sale order:', saleWithTimestamp)

      const docRef = await addDoc(collection(db, 'sales'), saleWithTimestamp)
      console.log('✅ Sale order added successfully:', docRef.id)
    } catch (err) {
      console.error('Error adding sale order:', err)
      setError('Failed to add sale')
      throw err
    }
  }

  // =========================
  // REMOVE SALE
  // =========================
  const removeSale = async (saleId: string) => {
    try {
      setError(null)
      console.log('🗑️ Deleting sale:', saleId)
      await deleteDoc(doc(db, 'sales', saleId))
      console.log('✅ Sale deleted successfully:', saleId)
    } catch (err) {
      console.error('Error deleting sale:', err)
      setError('Failed to delete sale')
      throw err
    }
  }

  // =========================
  // GET RECENT SALES
  // =========================
  const getRecentSales = (days: number = 30): SalesRecord[] => {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    return sales.filter((sale) => new Date(sale.saleDate) >= cutoffDate)
  }

  // =========================
  // FIX PENDING ORDERS
  // =========================
  const fixPendingOrders = async (): Promise<{ success: boolean; fixed: number; salesCreated: number; error?: string }> => {
    try {
      setError(null)
      console.log('🔧 Fixing pending orders...')
      const functions = getFunctions()
      const fixPendingOrdersFunction = httpsCallable(functions, 'fixPendingOrders')
      const result = await fixPendingOrdersFunction()
      console.log('✅ Fix pending orders result:', result.data)

      setTimeout(() => refreshSales(), 2000)
      return result.data as { success: boolean; fixed: number; salesCreated: number; error?: string }
    } catch (error: any) {
      console.error('Error fixing pending orders:', error)
      setError('Failed to fix pending orders')
      throw error
    }
  }

  // =========================
  // MANUAL REFRESH
  // =========================
  const refreshSales = async () => {
    try {
      console.log('🔄 Manually refreshing sales...')
      setLoading(true)
      const querySnapshot = await getDocs(collection(db, 'sales'))
      const salesList: SalesRecord[] = []

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data()
        salesList.push({
          id: docSnap.id,
          orderId: data.orderId || '',
          products: data.products || [],
          subtotal: data.subtotal || 0,
          discountAmount: data.discountAmount || 0,
          taxes: data.taxes || { gst: 0, qst: 0, total: 0 },
          totalAmount: data.totalAmount || 0,
          costTotal: data.costTotal || 0,
          profitTotal: data.profitTotal || 0,
          saleDate: convertFirestoreTimestamp(data.saleDate),
          createdAt: convertFirestoreTimestamp(data.createdAt),
          customerName: data.customerName || '',
          customerEmail: data.customerEmail || '',
          saleType: data.saleType || 'walk_in',
          paymentStatus: data.paymentStatus || 'completed',
          lowStockFlag: data.lowStockFlag || false,
          stripeSessionId: data.stripeSessionId || ''
        })
      })

      salesList.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
      setSales(salesList)
      setLastUpdated(new Date())
      console.log('✅ Manual refresh completed:', salesList.length, 'records')
    } catch (err) {
      console.error('Error refreshing sales:', err)
      setError('Failed to refresh sales')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // =========================
  // CONTEXT VALUE
  // =========================
  const value: SalesContextType = {
    sales,
    addSale,
    removeSale,
    getRecentSales,
    fixPendingOrders,
    refreshSales,
    loading,
    error,
    lastUpdated
  }

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>
}

// =========================
// HOOK
// =========================
export const useSales = (): SalesContextType => {
  const context = useContext(SalesContext)
  if (!context) throw new Error('useSales must be used within a SalesProvider')
  return context
}
