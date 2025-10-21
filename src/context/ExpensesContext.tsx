import  { createContext, useContext, useState, type ReactNode, useEffect } from 'react'
import { type BusinessExpense } from '../types/types'
import { collection, addDoc, getDocs, doc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/firebase'

interface ExpensesContextType {
  expenses: BusinessExpense[]
  addExpense: (expense: Omit<BusinessExpense, 'id' | 'createdAt'>) => Promise<void>
  removeExpense: (expenseId: string) => Promise<void> // Add this
  getMonthlyExpenses: (month?: Date) => number
  getExpensesByCategory: () => Record<string, number> // Add this
  loading: boolean
  error: string | null
}

const ExpensesContext = createContext<ExpensesContextType | undefined>(undefined)

export const ExpensesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [expenses, setExpenses] = useState<BusinessExpense[]>([])
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

  // Load expenses from Firebase
  useEffect(() => {
    const loadExpenses = async () => {
      try {
        setLoading(true)
        setError(null)
        const querySnapshot = await getDocs(collection(db, 'expenses'))
        const expensesList: BusinessExpense[] = []

        querySnapshot.forEach((doc) => {
          const data = doc.data()
          expensesList.push({
            id: doc.id,
            name: data.name,
            amount: data.amount,
            category: data.category,
            date: data.date,
            recurring: data.recurring || false,
            notes: data.notes,
            createdAt: convertFirestoreTimestamp(data.createdAt)
          })
        })

        setExpenses(expensesList)
      } catch (err) {
        console.error('Error loading expenses:', err)
        setError('Failed to load expenses')
      } finally {
        setLoading(false)
      }
    }

    loadExpenses()
  }, [])

  const addExpense = async (expenseData: Omit<BusinessExpense, 'id' | 'createdAt'>) => {
    try {
      setError(null)

      // Prepare data for Firebase - remove undefined values and handle notes properly
      const firebaseExpenseData: any = {
        name: expenseData.name,
        amount: expenseData.amount,
        category: expenseData.category,
        date: expenseData.date,
        recurring: expenseData.recurring || false,
        createdAt: serverTimestamp()
      }

      // Only add notes if it exists and is not empty
      if (expenseData.notes && expenseData.notes.trim() !== '') {
        firebaseExpenseData.notes = expenseData.notes.trim()
      } else {
        // Set to empty string instead of undefined
        firebaseExpenseData.notes = ''
      }

      console.log('Adding expense to Firebase:', firebaseExpenseData)
      const docRef = await addDoc(collection(db, 'expenses'), firebaseExpenseData)

      const newExpense: BusinessExpense = {
        ...expenseData,
        id: docRef.id,
        createdAt: new Date().toISOString(),
        notes: expenseData.notes || ''
      }

      setExpenses(prev => [...prev, newExpense])
    } catch (err) {
      console.error('Error adding expense:', err)
      setError('Failed to add expense')
      throw err
    }
  }

  const removeExpense = async (expenseId: string) => {
    try {
      setError(null)

      // Delete from Firebase
      await deleteDoc(doc(db, 'expenses', expenseId))

      // Update local state
      setExpenses(prev => prev.filter(expense => expense.id !== expenseId))

      console.log('Expense deleted successfully:', expenseId)
    } catch (err) {
      console.error('Error deleting expense:', err)
      setError('Failed to delete expense')
      throw err
    }
  }

  const getMonthlyExpenses = (month: Date = new Date()): number => {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0)

    return expenses.reduce((total, expense) => {
      const expenseDate = new Date(expense.date)

      // Check if expense is within the month or is recurring
      if ((expenseDate >= monthStart && expenseDate <= monthEnd) || expense.recurring) {
        return total + expense.amount
      }

      return total
    }, 0)
  }

  const getExpensesByCategory = (): Record<string, number> => {
    const categoryTotals: Record<string, number> = {}

    expenses.forEach(expense => {
      const category = expense.category
      if (categoryTotals[category]) {
        categoryTotals[category] += expense.amount
      } else {
        categoryTotals[category] = expense.amount
      }
    })

    return categoryTotals
  }

  const value: ExpensesContextType = {
    expenses,
    addExpense,
    removeExpense,
    getMonthlyExpenses,
    getExpensesByCategory,
    loading,
    error
  }

  return (
    <ExpensesContext.Provider value={value}>
      {children}
    </ExpensesContext.Provider>
  )
}

export const useExpenses = (): ExpensesContextType => {
  const context = useContext(ExpensesContext)
  if (!context) {
    throw new Error('useExpenses must be used within an ExpensesProvider')
  }
  return context
}