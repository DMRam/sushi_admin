import { useState, useEffect, useRef } from 'react'
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { useIngredients } from '../../../../../../context/IngredientsContext'
import { useProducts } from '../../../../../../context/ProductsContext'
import { UserRole, useUserProfile } from '../../../../../../context/UserProfileContext'
import type { ProductIngredient, Unit } from '../../../../../../types/types'
import { db, storage } from '../../../../../../firebase/firebase'
import { calculateProfitMargin } from '../../../../../../utils/costCalculations'


export const useProductForm = () => {
    const { ingredients } = useIngredients()
    const { products, updateProduct, removeProduct, refreshProducts } = useProducts()
    const { userProfile } = useUserProfile()

    const [selectedProductId, setSelectedProductId] = useState<string>('')
    const [productType, setProductType] = useState<'ingredientBased' | 'directCost'>('ingredientBased')
    const [loading, setLoading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)

    const [formData, setFormData] = useState({
        name: '',
        description: {
            es: '',
            fr: '',
            en: ''
        },
        category: '',
        portionSize: '',
        sellingPrice: '',
        preparationTime: '0',
        tags: '',
        directCostPrice: ''
    })

    const [productIngredients, setProductIngredients] = useState<ProductIngredient[]>([])
    const [newIngredient, setNewIngredient] = useState({
        id: '',
        name: '',
        quantity: '',
        unit: 'g' as Unit
    })

    const [preparationVideo, setPreparationVideo] = useState<File | null>(null)
    const [productImages, setProductImages] = useState<File[]>([])
    const [existingMedia, setExistingMedia] = useState<{ videoUrl?: string; imageUrls: string[] }>({ imageUrls: [] })

    const videoInputRef = useRef<HTMLInputElement | null>(null)
    const imageInputRef = useRef<HTMLInputElement | null>(null)
    const isAdmin = userProfile?.role === UserRole.ADMIN

    // ───────────────────────────────────────────────
    // Load product when selected
    useEffect(() => {
        if (!selectedProductId) return resetForm()
        const product = products.find(p => p.id === selectedProductId)
        if (!product) return

        const hasIngredients = !!product.ingredients?.length
        setProductType(hasIngredients ? 'ingredientBased' : 'directCost')
        setFormData({
            name: product.name,
            description: {
                es: product.description?.es || '',
                fr: product.description?.fr || '',
                en: product.description?.en || ''
            },
            category: product.category,
            portionSize: product.portionSize,
            sellingPrice: product.sellingPrice?.toString() || '',
            preparationTime: product.preparationTime?.toString() || '0',
            tags: product.tags?.join(', ') || '',
            directCostPrice: !hasIngredients && product.costPrice ? product.costPrice.toString() : ''
        })

        setProductIngredients(
            product.ingredients?.map(ing => ({
                id: ing.id,
                name: ing.name || getIngredientName(ing.id),
                quantity: ing.quantity,
                unit: ing.unit
            })) || []
        )

        setExistingMedia({
            videoUrl: product.preparationVideoUrl,
            imageUrls: product.imageUrls || []
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProductId, products])

    // ───────────────────────────────────────────────
    // Helpers

    const resetForm = () => {
        setFormData({
            name: '',
            description: {
                es: '',
                fr: '',
                en: ''
            },
            category: '',
            portionSize: '',
            sellingPrice: '',
            preparationTime: '0',
            tags: '',
            directCostPrice: ''
        })
        setProductIngredients([])
        setProductType('ingredientBased')
        setPreparationVideo(null)
        setProductImages([])
        setExistingMedia({ imageUrls: [] })
        setUploadProgress(0)
    }


    const getIngredientName = (id: string) => ingredients.find(i => i.id === id)?.name || 'Unknown Ingredient'
    const getIngredientCost = (ingredient: ProductIngredient) => {
        const ing = ingredients.find(i => i.id === ingredient.id)
        if (!ing) return 0
        const qty = ingredient.unit === 'g' || ingredient.unit === 'ml' ? ingredient.quantity / 1000 : ingredient.quantity
        return ing.pricePerKg * qty
    }

    // ───────────────────────────────────────────────
    // Media Uploads

    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('video/')) return alert('Invalid video file')
        if (file.size > 100 * 1024 * 1024) return alert('Video must be < 100MB')
        setPreparationVideo(file)
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        const valid = files.filter(f => f.type.startsWith('image/') && f.size < 10 * 1024 * 1024)
        if (valid.length !== files.length) alert('Some images skipped (must be <10MB)')
        setProductImages(prev => [...prev, ...valid.slice(0, 5)])
    }

    const removeNewImage = (index: number) =>
        setProductImages(prev => prev.filter((_, i) => i !== index))

    const removeExistingImage = async (url: string) => {
        if (!confirm('Delete this image?')) return
        try {
            await deleteObject(ref(storage, url))
            setExistingMedia(prev => ({ ...prev, imageUrls: prev.imageUrls.filter(i => i !== url) }))
        } catch (err) {
            console.error('Error deleting image', err)
        }
    }

    const removeExistingVideo = async () => {
        if (!existingMedia.videoUrl || !confirm('Delete video?')) return
        try {
            await deleteObject(ref(storage, existingMedia.videoUrl))
            setExistingMedia(prev => ({ ...prev, videoUrl: undefined }))
        } catch (err) {
            console.error('Error deleting video', err)
        }
    }

    const uploadFiles = async (productId: string) => {
        const result = { videoUrl: null as string | null, imageUrls: [] as string[] }

        if (productImages.length) {
            const urls = await Promise.all(
                productImages.map(async f => {
                    const r = ref(storage, `products/${productId}/images/${f.name}`)
                    await uploadBytes(r, f)
                    return await getDownloadURL(r)
                })
            )
            result.imageUrls = urls
        }

        if (preparationVideo) {
            const r = ref(storage, `products/${productId}/video/${preparationVideo.name}`)
            await uploadBytes(r, preparationVideo)
            result.videoUrl = await getDownloadURL(r)
        }

        return result
    }

    // ───────────────────────────────────────────────
    // Ingredients

    const handleAddIngredient = () => {
        if (!newIngredient.id || !newIngredient.quantity) return
        const selected = ingredients.find(i => i.id === newIngredient.id)
        if (!selected) return
        setProductIngredients(prev => [
            ...prev,
            { id: newIngredient.id, name: selected.name, quantity: parseFloat(newIngredient.quantity), unit: newIngredient.unit }
        ])
        setNewIngredient({ id: '', name: '', quantity: '', unit: 'g' })
    }

    const handleRemoveIngredient = (i: number) =>
        setProductIngredients(prev => prev.filter((_, idx) => idx !== i))

    // ───────────────────────────────────────────────
    // Cost

    const ingredientBasedCost = productIngredients.reduce((t, ing) => {
        const item = ingredients.find(i => i.id === ing.id)
        if (!item) return t
        const qty = ing.unit === 'g' || ing.unit === 'ml' ? ing.quantity / 1000 : ing.quantity
        return t + item.pricePerKg * qty
    }, 0)

    const directCost = parseFloat(formData.directCostPrice || '0')
    const totalCost = productType === 'ingredientBased' ? ingredientBasedCost : directCost
    const sellingPriceNum = parseFloat(formData.sellingPrice || '0')
    const profit = sellingPriceNum - totalCost
    const profitMargin = calculateProfitMargin(totalCost, sellingPriceNum)

    // ───────────────────────────────────────────────
    // CRUD

    const handleSave = async () => {
        if (!formData.name) return alert('Enter product name')
        setLoading(true)
        try {
            const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean)
            const data: any = {
                ...formData,
                costPrice: totalCost,
                sellingPrice: sellingPriceNum || null,
                profitMargin: sellingPriceNum ? profitMargin : null,
                preparationTime: parseInt(formData.preparationTime) || 0,
                isActive: true,
                tags,
                productType,
                ingredients: productType === 'ingredientBased' ? productIngredients : [],
                updatedAt: new Date().toISOString()
            }

            let id = selectedProductId
            if (id) {
                await updateDoc(doc(db, 'products', id), data)
                updateProduct(id, data)
            } else {
                const docRef = await addDoc(collection(db, 'products'), data)
                id = docRef.id
            }

            if (preparationVideo || productImages.length) {
                setUploadProgress(10)
                const uploaded = await uploadFiles(id!)
                const media: any = { imageUrls: uploaded.imageUrls }
                if (uploaded.videoUrl) media.preparationVideoUrl = uploaded.videoUrl
                await updateDoc(doc(db, 'products', id!), media)
                if (selectedProductId) updateProduct(id, { ...data, ...media })
            }

            alert('✅ Product saved successfully!')
            await refreshProducts()
            resetForm()
            setSelectedProductId('')
        } catch (err) {
            console.error('Error saving product:', err)
            alert('❌ Failed to save product.')
        } finally {
            setLoading(false)
            setUploadProgress(0)
        }
    }

    const handleDelete = async () => {
        if (!selectedProductId || !confirm('Delete this product?')) return
        setLoading(true)
        try {
            if (existingMedia.videoUrl) await deleteObject(ref(storage, existingMedia.videoUrl))
            for (const img of existingMedia.imageUrls) await deleteObject(ref(storage, img))
            await deleteDoc(doc(db, 'products', selectedProductId))
            removeProduct(selectedProductId)
            alert('🗑️ Product deleted successfully!')
            resetForm()
            setSelectedProductId('')
        } catch (err) {
            console.error('Error deleting product:', err)
            alert('❌ Failed to delete product.')
        } finally {
            setLoading(false)
        }
    }

    // ───────────────────────────────────────────────
    // Return API

    return {
        ingredients,
        products,
        selectedProductId, setSelectedProductId,
        productType, setProductType,
        loading, uploadProgress,
        formData, setFormData,
        productIngredients, setProductIngredients,
        newIngredient, setNewIngredient,
        preparationVideo, setPreparationVideo,
        productImages, setProductImages,
        existingMedia, setExistingMedia,
        videoInputRef, imageInputRef,
        isAdmin,
        totalCost, profit, profitMargin,
        handleAddIngredient, handleRemoveIngredient,
        handleVideoUpload, handleImageUpload,
        removeNewImage, removeExistingImage, removeExistingVideo,
        handleSave, handleDelete, resetForm,
        getIngredientName, getIngredientCost, sellingPriceNum
    }
}
