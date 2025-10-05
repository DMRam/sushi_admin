import React, { createContext, useContext, useEffect, useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { Purchase } from '../types/types'

type PurchasesContextType = {
  purchases: Purchase[]
  addPurchase: (data: Omit<Purchase, 'id' | 'createdAt'>) => void
  updatePurchase: (id: string, data: Partial<Purchase>) => void
  removePurchase: (id: string) => void
  getPurchasesByIngredient: (ingredientId: string) => Purchase[]
  getRecentPurchases: (days?: number) => Purchase[]
}

const PurchasesContext = createContext<PurchasesContextType | undefined>(undefined)

export const PurchasesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    try {
      const raw = localStorage.getItem('purchases')
      return raw ? JSON.parse(raw) : []
    } catch { 
      return [] 
    }
  })

  useEffect(() => {
    localStorage.setItem('purchases', JSON.stringify(purchases))
  }, [purchases])

  const addPurchase = (data: Omit<Purchase, 'id' | 'createdAt'>) => {
    const newPurchase: Purchase = { 
      ...data, 
      id: uuid(), 
      createdAt: new Date().toISOString() 
    }
    setPurchases(prev => [newPurchase, ...prev])
  }

  const updatePurchase = (id: string, data: Partial<Purchase>) => {
    setPurchases(prev => prev.map(purchase => 
      purchase.id === id ? { ...purchase, ...data } : purchase
    ))
  }

  const removePurchase = (id: string) => {
    setPurchases(prev => prev.filter(purchase => purchase.id !== id))
  }

  const getPurchasesByIngredient = (ingredientId: string): Purchase[] => {
    return purchases.filter(purchase => purchase.ingredientId === ingredientId)
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
  }

  const getRecentPurchases = (days: number = 30): Purchase[] => {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    return purchases.filter(purchase => new Date(purchase.purchaseDate) >= cutoffDate)
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
  }

  const value: PurchasesContextType = {
    purchases,
    addPurchase,
    updatePurchase,
    removePurchase,
    getPurchasesByIngredient,
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
    throw new Error('usePurchases must be used within PurchasesProvider')
  }
  return context
}