import React, { createContext, useContext, useEffect, useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { BusinessExpense } from '../types/types'

type ExpensesContextType = {
  expenses: BusinessExpense[]
  addExpense: (data: Omit<BusinessExpense, 'id' | 'createdAt'>) => void
  updateExpense: (id: string, data: Partial<BusinessExpense>) => void
  removeExpense: (id: string) => void
  getMonthlyExpenses: (year?: number, month?: number) => number
  getExpensesByCategory: () => Record<string, number>
}

const ExpensesContext = createContext<ExpensesContextType | undefined>(undefined)

export const ExpensesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expenses, setExpenses] = useState<BusinessExpense[]>(() => {
    try {
      const raw = localStorage.getItem('expenses')
      return raw ? JSON.parse(raw) : []
    } catch { 
      return [] 
    }
  })

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses))
  }, [expenses])

  const addExpense = (data: Omit<BusinessExpense, 'id' | 'createdAt'>) => {
    const newExpense: BusinessExpense = { 
      ...data, 
      id: uuid(), 
      createdAt: new Date().toISOString() 
    }
    setExpenses(prev => [newExpense, ...prev])
  }

  const updateExpense = (id: string, data: Partial<BusinessExpense>) => {
    setExpenses(prev => prev.map(expense => 
      expense.id === id ? { ...expense, ...data } : expense
    ))
  }

  const removeExpense = (id: string) => {
    setExpenses(prev => prev.filter(expense => expense.id !== id))
  }

  const getMonthlyExpenses = (year?: number, month?: number): number => {
    const now = new Date()
    const targetYear = year || now.getFullYear()
    const targetMonth = month !== undefined ? month : now.getMonth()
    
    return expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date)
        return expenseDate.getFullYear() === targetYear && 
               expenseDate.getMonth() === targetMonth
      })
      .reduce((sum, expense) => sum + expense.amount, 0)
  }

  const getExpensesByCategory = (): Record<string, number> => {
    return expenses.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = 0
      }
      acc[expense.category] += expense.amount
      return acc
    }, {} as Record<string, number>)
  }

  const value: ExpensesContextType = {
    expenses,
    addExpense,
    updateExpense,
    removeExpense,
    getMonthlyExpenses,
    getExpensesByCategory
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
    throw new Error('useExpenses must be used within ExpensesProvider')
  }
  return context
}