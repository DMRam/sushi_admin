import React, { createContext, useContext, useEffect, useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { Product } from '../types/types'

type ProductsContextType = {
  products: Product[]
  addProduct: (data: Omit<Product, 'id' | 'createdAt'>) => void
  updateProduct: (id: string, data: Partial<Product>) => void
  removeProduct: (id: string) => void
  getProductById: (id: string) => Product | undefined
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined)

export const ProductsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const raw = localStorage.getItem('products')
      return raw ? JSON.parse(raw) : []
    } catch { 
      return [] 
    }
  })

  useEffect(() => {
    localStorage.setItem('products', JSON.stringify(products))
  }, [products])

  const addProduct = (data: Omit<Product, 'id' | 'createdAt'>) => {
    const newProduct: Product = { 
      ...data,
      preparationTime: data.preparationTime || 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
      tags: data.tags || [],
      id: uuid(), 
      createdAt: new Date().toISOString() 
    }
    setProducts(prev => [newProduct, ...prev])
  }

  const updateProduct = (id: string, data: Partial<Product>) => {
    setProducts(prev => prev.map(product => 
      product.id === id ? { ...product, ...data } : product
    ))
  }

  const removeProduct = (id: string) => {
    setProducts(prev => prev.filter(product => product.id !== id))
  }

  const getProductById = (id: string): Product | undefined => {
    return products.find(product => product.id === id)
  }

  const value: ProductsContextType = {
    products,
    addProduct,
    updateProduct,
    removeProduct,
    getProductById
  }

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  )
}

export const useProducts = (): ProductsContextType => {
  const context = useContext(ProductsContext)
  if (!context) {
    throw new Error('useProducts must be used within a ProductsProvider')
  }
  return context
}