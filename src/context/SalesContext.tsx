import React, { createContext, useContext, useEffect, useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { SalesRecord } from '../types/types'

type SalesContextType = {
  sales: SalesRecord[]
  addSale: (data: Omit<SalesRecord, 'id' | 'createdAt'>) => void
  updateSale: (id: string, data: Partial<SalesRecord>) => void
  removeSale: (id: string) => void
  getSalesByProduct: (productId: string) => SalesRecord[]
  getSalesByDateRange: (startDate: string, endDate: string) => SalesRecord[]
  getRecentSales: (days?: number) => SalesRecord[]
}

const SalesContext = createContext<SalesContextType | undefined>(undefined)

export const SalesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sales, setSales] = useState<SalesRecord[]>(() => {
    try {
      const raw = localStorage.getItem('sales')
      return raw ? JSON.parse(raw) : []
    } catch { 
      return [] 
    }
  })

  useEffect(() => {
    localStorage.setItem('sales', JSON.stringify(sales))
  }, [sales])

  const addSale = (data: Omit<SalesRecord, 'id' | 'createdAt'>) => {
    const newSale: SalesRecord = { 
      ...data, 
      id: uuid(), 
      createdAt: new Date().toISOString() 
    }
    setSales(prev => [newSale, ...prev])
  }

  const updateSale = (id: string, data: Partial<SalesRecord>) => {
    setSales(prev => prev.map(sale => 
      sale.id === id ? { ...sale, ...data } : sale
    ))
  }

  const removeSale = (id: string) => {
    setSales(prev => prev.filter(sale => sale.id !== id))
  }

  const getSalesByProduct = (productId: string): SalesRecord[] => {
    return sales.filter(sale => sale.productId === productId)
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
  }

  const getSalesByDateRange = (startDate: string, endDate: string): SalesRecord[] => {
    return sales.filter(sale => {
      const saleDate = new Date(sale.saleDate)
      return saleDate >= new Date(startDate) && saleDate <= new Date(endDate)
    })
  }

  const getRecentSales = (days: number = 30): SalesRecord[] => {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    return sales.filter(sale => new Date(sale.saleDate) >= cutoffDate)
  }

  const value: SalesContextType = {
    sales,
    addSale,
    updateSale,
    removeSale,
    getSalesByProduct,
    getSalesByDateRange,
    getRecentSales
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
    throw new Error('useSales must be used within SalesProvider')
  }
  return context
}