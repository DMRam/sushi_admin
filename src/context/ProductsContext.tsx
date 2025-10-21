import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { type Product } from '../types/types'
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/firebase'

interface ProductsContextType {
  products: Product[]
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>
  updateProduct: (id: string, product: Partial<Omit<Product, 'id' | 'createdAt'>>) => Promise<void>
  removeProduct: (id: string) => Promise<void>
  getProductById: (id: string) => Product | undefined
  refreshProducts: () => Promise<void> // Add this line
  loading: boolean
  error: string | null
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined)

export const ProductsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Helper function to safely convert Firestore timestamps
  const convertFirestoreTimestamp = (timestamp: any): string => {
    if (!timestamp) return new Date().toISOString()

    // If it's already a string, return it
    if (typeof timestamp === 'string') return timestamp

    // If it's a Firestore Timestamp, convert to ISO string
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString()
    }

    // If it's a Date object, convert to ISO string
    if (timestamp instanceof Date) {
      return timestamp.toISOString()
    }

    // Fallback
    return new Date().toISOString()
  }

  // Move the load logic into a reusable function
  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Loading products from Firebase...')

      const querySnapshot = await getDocs(collection(db, 'products'))
      console.log(`Found ${querySnapshot.size} products`)

      const productsList: Product[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        console.log('Product data:', doc.id, data)

        productsList.push({
          id: doc.id,
          name: data.name || '',
          description: data.description || '',
          ingredients: data.ingredients || [],
          costPrice: data.costPrice || 0,
          sellingPrice: data.sellingPrice,
          profitMargin: data.profitMargin,
          category: data.category || '',
          portionSize: data.portionSize || '',
          preparationTime: data.preparationTime || 0,
          isActive: data.isActive ?? true,
          tags: data.tags || [],
          productType: data.productType || 'ingredientBased',
          createdAt: convertFirestoreTimestamp(data.createdAt),
          quantity: data.quantity || 0,
          allergens: data.allergens || [],
          imageUrls: data.imageUrls || []
        })
      })

      console.log('Loaded products:', productsList)
      setProducts(productsList)
    } catch (err) {
      console.error('Error loading products:', err)
      setError('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  // Load products from Firebase
  useEffect(() => {
    loadProducts()
  }, [])

  // Add the refresh function
  const refreshProducts = async () => {
    console.log('Refreshing products...')
    await loadProducts()
  }

  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt'>) => {
    try {
      setError(null)
      const productWithTimestamp = {
        ...productData,
        createdAt: serverTimestamp()
      }

      console.log('Adding product to Firebase:', productWithTimestamp)
      const docRef = await addDoc(collection(db, 'products'), productWithTimestamp)
      console.log('Product added with ID:', docRef.id)

      const newProduct: Product = {
        ...productData,
        id: docRef.id,
        createdAt: new Date().toISOString()
      }

      setProducts(prev => [...prev, newProduct])
    } catch (err) {
      console.error('Error adding product:', err)
      setError('Failed to add product')
      throw err
    }
  }

  const updateProduct = async (id: string, productData: Partial<Omit<Product, 'id' | 'createdAt'>>) => {
    try {
      setError(null)
      console.log('Updating product:', id, productData)

      await updateDoc(doc(db, 'products', id), {
        ...productData,
        updatedAt: serverTimestamp()
      })

      setProducts(prev => prev.map(product =>
        product.id === id ? { ...product, ...productData } : product
      ))
    } catch (err) {
      console.error('Error updating product:', err)
      setError('Failed to update product')
      throw err
    }
  }

  const removeProduct = async (id: string) => {
    try {
      setError(null)
      console.log('Removing product:', id)

      await deleteDoc(doc(db, 'products', id))
      setProducts(prev => prev.filter(product => product.id !== id))
    } catch (err) {
      console.error('Error removing product:', err)
      setError('Failed to remove product')
      throw err
    }
  }

  const getProductById = (id: string): Product | undefined => {
    return products.find(product => product.id === id)
  }

  const value: ProductsContextType = {
    products,
    addProduct,
    updateProduct,
    removeProduct,
    getProductById,
    refreshProducts, // Add this to the context value
    loading,
    error
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