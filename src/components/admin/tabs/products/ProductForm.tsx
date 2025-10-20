import { useState, useEffect, useRef } from 'react'
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { useIngredients } from '../../../../context/IngredientsContext'
import { useProducts } from '../../../../context/ProductsContext'
import { useUserProfile, UserRole } from '../../../../context/UserProfileContext'
import type { ProductIngredient, Unit } from '../../../../types/types'
import { calculateProfitMargin } from '../../../../utils/costCalculations'
import { db, storage } from '../../../../firebase/firebase'

export default function ProductForm() {
    const { ingredients } = useIngredients()
    const { products, updateProduct, removeProduct, refreshProducts } = useProducts()
    const { userProfile } = useUserProfile()

    const [selectedProductId, setSelectedProductId] = useState<string>('')
    const [productType, setProductType] = useState<'ingredientBased' | 'directCost'>('ingredientBased')
    const [loading, setLoading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState<number>(0)

    const [formData, setFormData] = useState({
        name: '',
        description: '',
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

    // Media state
    const [preparationVideo, setPreparationVideo] = useState<File | null>(null)
    const [productImages, setProductImages] = useState<File[]>([])
    const [existingMedia, setExistingMedia] = useState<{
        videoUrl?: string
        imageUrls: string[]
    }>({ imageUrls: [] })

    const videoInputRef = useRef<HTMLInputElement>(null)
    const imageInputRef = useRef<HTMLInputElement>(null)

    // Check if user is admin
    const isAdmin = userProfile?.role === UserRole.ADMIN

    useEffect(() => {
        if (selectedProductId) {
            const product = products.find(p => p.id === selectedProductId)
            if (product) {
                const hasIngredients = product.ingredients && product.ingredients.length > 0
                setProductType(hasIngredients ? 'ingredientBased' : 'directCost')

                setFormData({
                    name: product.name,
                    description: product.description || '',
                    category: product.category,
                    portionSize: product.portionSize,
                    sellingPrice: product.sellingPrice ? product.sellingPrice.toString() : '',
                    preparationTime: product.preparationTime?.toString() || '0',
                    tags: product.tags?.join(', ') || '',
                    directCostPrice: !hasIngredients && product.costPrice ? product.costPrice.toString() : ''
                })

                setProductIngredients(product.ingredients ? product.ingredients.map(ing => ({
                    id: ing.id,
                    name: ing.name || getIngredientName(ing.id),
                    quantity: ing.quantity,
                    unit: ing.unit,
                })) : [])

                // Load existing media
                setExistingMedia({
                    videoUrl: product.preparationVideoUrl,
                    imageUrls: product.imageUrls || []
                })
            }
        } else {
            resetForm()
        }
    }, [selectedProductId, products])

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
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

    // File handling functions
    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Validate video file
            if (!file.type.startsWith('video/')) {
                alert('Please select a valid video file')
                return
            }
            if (file.size > 100 * 1024 * 1024) { // 100MB limit
                alert('Video file must be smaller than 100MB')
                return
            }
            setPreparationVideo(file)
        }
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length > 0) {
            // Validate image files
            const validFiles = files.filter(file =>
                file.type.startsWith('image/') && file.size < 10 * 1024 * 1024 // 10MB per image
            )

            if (validFiles.length !== files.length) {
                alert('Some files were skipped. Please only upload image files under 10MB each.')
            }

            setProductImages(prev => [...prev, ...validFiles.slice(0, 5)]) // Max 5 new images
        }
    }

    const removeNewImage = (index: number) => {
        setProductImages(prev => prev.filter((_, i) => i !== index))
    }

    const removeExistingImage = async (imageUrl: string) => {
        if (!confirm('Are you sure you want to remove this image?')) return

        try {
            // Delete from Firebase Storage
            const imageRef = ref(storage, imageUrl)
            await deleteObject(imageRef)

            // Update local state
            setExistingMedia(prev => ({
                ...prev,
                imageUrls: prev.imageUrls.filter(url => url !== imageUrl)
            }))
        } catch (error) {
            console.error('Error deleting image:', error)
            alert('Error deleting image. Please try again.')
        }
    }

    const removeExistingVideo = async () => {
        if (!existingMedia.videoUrl) return
        if (!confirm('Are you sure you want to remove the preparation video?')) return

        try {
            // Delete from Firebase Storage
            const videoRef = ref(storage, existingMedia.videoUrl)
            await deleteObject(videoRef)

            // Update local state
            setExistingMedia(prev => ({ ...prev, videoUrl: undefined }))
        } catch (error) {
            console.error('Error deleting video:', error)
            alert('Error deleting video. Please try again.')
        }
    }

    // Upload files to Firebase Storage
    const uploadFiles = async (productId: string) => {
        const result = {
            videoUrl: null as string | null,
            imageUrls: [] as string[]
        }

        try {
            // Upload images
            if (productImages.length > 0) {
                const imageUrls = await Promise.all(
                    productImages.map(async (file) => {
                        const filePath = `products/${productId}/images/${file.name}`
                        const storageRef = ref(storage, filePath)
                        await uploadBytes(storageRef, file)
                        const downloadURL = await getDownloadURL(storageRef)
                        return downloadURL
                    })
                )
                result.imageUrls = imageUrls
            }

            // Upload video
            if (preparationVideo) {
                const videoPath = `products/${productId}/video/${preparationVideo.name}`
                const videoRef = ref(storage, videoPath)
                await uploadBytes(videoRef, preparationVideo)
                result.videoUrl = await getDownloadURL(videoRef)
            }

            return result
        } catch (error) {
            console.error('Error uploading files:', error)
            throw error
        }
    }

    const ingredientBasedCost = productIngredients.reduce((total, productIngredient) => {
        const ingredient = ingredients.find(ing => ing.id === productIngredient.id)
        if (!ingredient) return total

        let quantityInKg = productIngredient.quantity
        if (productIngredient.unit === 'g' || productIngredient.unit === 'ml') {
            quantityInKg = productIngredient.quantity / 1000
        }

        return total + ingredient.pricePerKg * quantityInKg
    }, 0)

    const directCost = formData.directCostPrice ? parseFloat(formData.directCostPrice) : 0
    const totalCost = productType === 'ingredientBased' ? ingredientBasedCost : directCost

    const sellingPriceNum = formData.sellingPrice ? parseFloat(formData.sellingPrice) : 0
    const profit = sellingPriceNum > 0 ? sellingPriceNum - totalCost : 0
    const profitMargin = sellingPriceNum > 0 ? calculateProfitMargin(totalCost, sellingPriceNum) : 0

    const handleAddIngredient = () => {
        if (!newIngredient.id || !newIngredient.quantity) return

        // Find the selected ingredient to get its name
        const selectedIngredient = ingredients.find(ing => ing.id === newIngredient.id)
        if (!selectedIngredient) return

        setProductIngredients(prev => [
            ...prev,
            {
                id: newIngredient.id,
                name: selectedIngredient.name,
                quantity: Number.parseFloat(newIngredient.quantity),
                unit: newIngredient.unit
            }
        ])

        setNewIngredient({ id: '', name: '', quantity: '', unit: 'g' })
    }

    const handleRemoveIngredient = (index: number) => {
        setProductIngredients(prev => prev.filter((_, i) => i !== index))
    }

    const handleSave = async () => {
        if (!formData.name) {
            alert('Please enter a product name')
            return
        }

        setLoading(true)
        setUploadProgress(0)

        try {
            const tags = formData.tags
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0)

            const productData: any = {
                name: formData.name.trim(),
                description: formData.description.trim(),
                category: formData.category.trim(),
                portionSize: formData.portionSize.trim(),
                costPrice: totalCost,
                sellingPrice: sellingPriceNum > 0 ? sellingPriceNum : null,
                profitMargin: sellingPriceNum > 0 ? profitMargin : null,
                preparationTime: parseInt(formData.preparationTime) || 0,
                isActive: true,
                tags,
                productType,
                ingredients: productType === 'ingredientBased' ? productIngredients : [],
                createdAt: selectedProductId ? undefined : new Date().toISOString(),
                createdBy: selectedProductId ? undefined : (userProfile?.displayName || 'unknown'),
                updatedAt: new Date().toISOString()
            }

            // Remove undefined values from productData
            Object.keys(productData).forEach(key => {
                if (productData[key] === undefined) {
                    delete productData[key]
                }
            })

            let productId = selectedProductId

            if (selectedProductId) {
                // Update existing product
                const ref = doc(db, 'products', selectedProductId)
                await updateDoc(ref, productData)
                updateProduct(selectedProductId, productData)
            } else {
                // Create new product
                const docRef = await addDoc(collection(db, 'products'), productData)
                productId = docRef.id
            }

            // Upload media files
            if (preparationVideo || productImages.length > 0) {
                setUploadProgress(10)
                const uploadedMedia = await uploadFiles(productId!)

                // Build media update with proper null handling
                const mediaUpdate: any = {
                    imageUrls: uploadedMedia.imageUrls || []
                }

                // Only add preparationVideoUrl if it exists
                if (uploadedMedia.videoUrl) {
                    mediaUpdate.preparationVideoUrl = uploadedMedia.videoUrl
                }

                const productRef = doc(db, 'products', productId!)
                await updateDoc(productRef, mediaUpdate)

                // Update local state
                if (selectedProductId) {
                    updateProduct(selectedProductId, { ...productData, ...mediaUpdate })
                }
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
        if (!selectedProductId) return
        const confirmDelete = confirm('Are you sure you want to delete this product? This will also delete all associated media files.')
        if (!confirmDelete) return

        setLoading(true)
        try {
            // Delete media files from storage
            if (existingMedia.videoUrl) {
                const videoRef = ref(storage, existingMedia.videoUrl)
                await deleteObject(videoRef).catch(console.error)
            }

            for (const imageUrl of existingMedia.imageUrls) {
                const imageRef = ref(storage, imageUrl)
                await deleteObject(imageRef).catch(console.error)
            }

            // Delete product document
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

    const getIngredientName = (id: string) => {
        // First try to find in current product ingredients (in case name is already saved)
        const productIngredient = productIngredients.find(pi => pi.id === id)
        if (productIngredient?.name) return productIngredient.name

        // Then try to find in ingredients context
        const ingredient = ingredients.find(i => i.id === id)
        if (ingredient?.name) return ingredient.name

        // Finally, if we have the product loaded, check its ingredients
        if (selectedProductId) {
            const product = products.find(p => p.id === selectedProductId)
            const existingIngredient = product?.ingredients?.find(pi => pi.id === id)
            if (existingIngredient?.name) return existingIngredient.name
        }

        return 'Unknown Ingredient'
    }

    const getIngredientCost = (ingredient: ProductIngredient) => {
        const ing = ingredients.find(i => i.id === ingredient.id)
        if (!ing) return 0
        let qtyInKg = ingredient.quantity
        if (ingredient.unit === 'g' || ingredient.unit === 'ml') qtyInKg = ingredient.quantity / 1000
        return ing.pricePerKg * qtyInKg
    }

    return (
        <div className="space-y-6">
            {/* Product Selection */}
            <div>
                <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">
                    SELECT PRODUCT TO EDIT
                </label>
                <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide"
                >
                    <option value="">CREATE NEW PRODUCT</option>
                    {products.map(product => (
                        <option key={product.id} value={product.id}>
                            {product.name} {product.productType === 'directCost' ? '(Direct Cost)' : '(Ingredient Based)'}
                        </option>
                    ))}
                </select>
            </div>

            {/* Product Type Selection - Only show when creating new product */}
            {!selectedProductId && (
                <div className="bg-white border border-gray-200 rounded-sm p-6">
                    <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">PRODUCT TYPE</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setProductType('ingredientBased')}
                            className={`p-4 border-2 rounded-sm text-center transition-colors ${productType === 'ingredientBased'
                                ? 'border-gray-900 bg-gray-50 text-gray-900'
                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <div className="font-light tracking-wide">INGREDIENT BASED</div>
                            <div className="text-sm mt-1 font-light">Calculate cost from ingredients</div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setProductType('directCost')}
                            className={`p-4 border-2 rounded-sm text-center transition-colors ${productType === 'directCost'
                                ? 'border-gray-900 bg-gray-50 text-gray-900'
                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <div className="font-light tracking-wide">DIRECT COST</div>
                            <div className="text-sm mt-1 font-light">Set cost directly</div>
                        </button>
                    </div>
                </div>
            )}

            {/* Product Details */}
            <div className="bg-white border border-gray-200 rounded-sm p-6">
                <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">PRODUCT DETAILS</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">PRODUCT NAME *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide"
                            placeholder="e.g., Classic Ceviche, Whole Salmon"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">CATEGORY</label>
                        <input
                            type="text"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide"
                            placeholder="e.g., Appetizer, Main Course"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">PREPARATION TIME (MINUTES)</label>
                        <input
                            type="number"
                            min="0"
                            value={formData.preparationTime}
                            onChange={(e) => setFormData({ ...formData, preparationTime: e.target.value })}
                            className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide"
                            placeholder="e.g., 15"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">TAGS</label>
                        <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide"
                            placeholder="e.g., spicy, popular, seasonal"
                        />
                        <div className="text-xs text-gray-500 mt-1 font-light">Separate tags with commas</div>
                    </div>
                </div>

                <div className="mt-4">
                    <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">DESCRIPTION</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light"
                        rows={2}
                        placeholder="Product description for website..."
                    />
                </div>

                <div className="mt-4">
                    <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">PORTION SIZE</label>
                    <input
                        type="text"
                        value={formData.portionSize}
                        onChange={(e) => setFormData({ ...formData, portionSize: e.target.value })}
                        className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide"
                        placeholder="e.g., 300g bowl, 500ml cup, 1kg whole fish"
                    />
                </div>
            </div>

            {/* Media Upload Section */}
            <div className="bg-white border border-gray-200 rounded-sm p-6">
                <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">MEDIA CONTENT</h3>
                <p className="text-gray-500 font-light text-sm mb-4">Add preparation videos and product images for your website</p>

                {/* Video Upload */}
                <div className="mb-6">
                    <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">PREPARATION VIDEO</label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <input
                            ref={videoInputRef}
                            type="file"
                            accept="video/*"
                            onChange={handleVideoUpload}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => videoInputRef.current?.click()}
                            className="px-4 py-3 bg-gray-900 text-white text-sm font-light tracking-wide rounded-sm hover:bg-gray-800 transition-colors w-full sm:w-auto"
                        >
                            {preparationVideo ? 'CHANGE VIDEO' : 'UPLOAD VIDEO'}
                        </button>
                        <div className="flex-1 min-w-0">
                            {preparationVideo && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600 font-light truncate">{preparationVideo.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => setPreparationVideo(null)}
                                        className="text-red-600 hover:text-red-800 text-sm font-light flex-shrink-0"
                                    >
                                        Remove
                                    </button>
                                </div>
                            )}
                            {existingMedia.videoUrl && !preparationVideo && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-green-600 font-light">✓ Video uploaded</span>
                                    <button
                                        type="button"
                                        onClick={removeExistingVideo}
                                        className="text-red-600 hover:text-red-800 text-sm font-light flex-shrink-0"
                                    >
                                        Remove
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 font-light">
                        MP4, MOV, or AVI files up to 100MB. Show your preparation process!
                    </div>
                </div>

                {/* Image Upload */}
                <div>
                    <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">PRODUCT IMAGES</label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            className="px-4 py-3 bg-gray-900 text-white text-sm font-light tracking-wide rounded-sm hover:bg-gray-800 transition-colors w-full sm:w-auto"
                        >
                            UPLOAD IMAGES
                        </button>
                        <span className="text-sm text-gray-500 font-light text-center sm:text-left">
                            {existingMedia.imageUrls.length + productImages.length} / 10 images
                        </span>
                    </div>

                    {/* New Images Preview */}
                    {productImages.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-sm font-light text-gray-700 mb-2">New Images:</h4>
                            <div className="flex flex-wrap gap-2">
                                {productImages.map((image, index) => (
                                    <div key={index} className="relative">
                                        <img
                                            src={URL.createObjectURL(image)}
                                            alt={`New product image ${index + 1}`}
                                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-sm border border-gray-300"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeNewImage(index)}
                                            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-700"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Existing Images Preview */}
                    {existingMedia.imageUrls.length > 0 && (
                        <div>
                            <h4 className="text-sm font-light text-gray-700 mb-2">Existing Images:</h4>
                            <div className="flex flex-wrap gap-2">
                                {existingMedia.imageUrls.map((url, index) => (
                                    <div key={index} className="relative">
                                        <img
                                            src={url}
                                            alt={`Product image ${index + 1}`}
                                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-sm border border-gray-300"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeExistingImage(url)}
                                            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-700"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="text-xs text-gray-500 mt-2 font-light">
                        JPG, PNG, or WebP files up to 10MB each. Maximum 10 images per product.
                    </div>
                </div>
            </div>

            {/* Ingredients Section - Only show for ingredient-based products */}
            {productType === 'ingredientBased' && (
                <div className="bg-white border border-gray-200 rounded-sm p-6">
                    <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">INGREDIENTS</h3>

                    {/* Add Ingredient - Improved responsive layout */}
                    <div className="flex flex-col sm:flex-row gap-2 mb-4">
                        <select
                            value={newIngredient.id}
                            onChange={(e) => setNewIngredient({ ...newIngredient, id: e.target.value })}
                            className="flex-1 border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light min-w-0"
                        >
                            <option value="">SELECT INGREDIENT</option>
                            {ingredients.map(ingredient => (
                                <option key={ingredient.id} value={ingredient.id}>
                                    {ingredient.name} {isAdmin && `($${ingredient.pricePerKg}/kg)`}
                                </option>
                            ))}
                        </select>

                        <div className="flex gap-2 sm:flex-nowrap flex-wrap">
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={newIngredient.quantity}
                                onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                                placeholder="Qty"
                                className="w-20 border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light"
                            />

                            <select
                                value={newIngredient.unit}
                                onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value as Unit })}
                                className="w-20 border border-gray-300 rounded-sm px-2 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light"
                            >
                                <option value="g">g</option>
                                <option value="kg">kg</option>
                                <option value="ml">ml</option>
                                <option value="l">l</option>
                                <option value="unit">unit</option>
                            </select>

                            <button
                                type="button"
                                onClick={handleAddIngredient}
                                className="bg-gray-900 text-white px-4 py-3 text-sm font-light tracking-wide rounded-sm hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-900 flex-1 sm:flex-none"
                            >
                                ADD
                            </button>
                        </div>
                    </div>

                    {/* Ingredients List */}
                    <div className="space-y-2">
                        {productIngredients.map((ingredient, index) => (
                            <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-gray-50 p-3 rounded-sm">
                                <div className="flex-1 min-w-0">
                                    <span className="font-light text-gray-900 block truncate">
                                        {getIngredientName(ingredient.id)}
                                    </span>
                                    <span className="text-sm text-gray-600 font-light">
                                        {ingredient.quantity}{ingredient.unit}
                                        {isAdmin && ` - $${getIngredientCost(ingredient).toFixed(2)}`}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveIngredient(index)}
                                    className="text-red-600 hover:text-red-800 font-light text-sm w-full sm:w-auto text-center sm:text-left py-1 sm:py-0"
                                >
                                    REMOVE
                                </button>
                            </div>
                        ))}

                        {productIngredients.length === 0 && (
                            <div className="text-center text-gray-500 py-4 font-light">
                                No ingredients added. Add ingredients above.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Direct Cost Input - Only show for direct cost products */}
            {productType === 'directCost' && (
                <div className="bg-white border border-gray-200 rounded-sm p-6">
                    <h3 className="text-lg font-light text-gray-900 tracking-wide mb-2">DIRECT COST</h3>
                    <p className="text-sm text-gray-600 mb-3 font-light">
                        Enter the cost directly for products like whole fish, pre-made items, or items purchased ready-to-sell.
                    </p>
                    <div>
                        <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">COST PRICE *</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.directCostPrice}
                            onChange={(e) => setFormData({ ...formData, directCostPrice: e.target.value })}
                            className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide"
                            placeholder="0.00"
                            required
                        />
                    </div>
                </div>
            )}

            {!isAdmin &&
                (
                    <>
                        <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">SELLING PRICE (OPTIONAL)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.sellingPrice}
                            onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                            className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide"
                            placeholder="0.00"
                        />

                    </>
                )
            }

            {/* Cost Summary - Only show for admin users */}
            {isAdmin && (
                <div className="bg-white border border-gray-200 rounded-sm p-6">
                    <h3 className="text-lg font-light text-gray-900 tracking-wide mb-4">COST & PRICING</h3>

                    {/* Total Cost Display */}
                    <div className="p-4 bg-gray-50 rounded-sm border border-gray-200 mb-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <span className="font-light text-gray-900 text-sm sm:text-base">
                                {productType === 'ingredientBased' ? 'CALCULATED PRODUCT COST:' : 'DIRECT PRODUCT COST:'}
                            </span>
                            <span className="text-lg font-light text-gray-900">${totalCost.toFixed(2)}</span>
                        </div>
                        {productType === 'ingredientBased' && productIngredients.length === 0 && (
                            <div className="text-sm text-orange-600 mt-1 font-light">
                                No ingredients added. Cost will be $0.00 until ingredients are added.
                            </div>
                        )}
                    </div>

                    {/* Selling Price */}
                    <div>
                        <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide">SELLING PRICE (OPTIONAL)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.sellingPrice}
                            onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                            className="w-full border border-gray-300 rounded-sm px-3 py-3 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 font-light tracking-wide"
                            placeholder="0.00"
                        />

                        {/* Profit Display - Only show when we have a valid selling price */}
                        {formData.sellingPrice && !isNaN(sellingPriceNum) && sellingPriceNum > 0 && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-sm border border-gray-200">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <div className="text-gray-600 font-light">Cost Price:</div>
                                        <div className="font-light text-gray-900">${totalCost.toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-600 font-light">Selling Price:</div>
                                        <div className="font-light text-gray-900">${sellingPriceNum.toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-600 font-light">Profit:</div>
                                        <div className={`font-light ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ${profit.toFixed(2)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-600 font-light">Margin:</div>
                                        <div className={`font-light ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {profitMargin.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
                {selectedProductId && (
                    <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="bg-red-600 text-white py-4 px-4 rounded-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 font-light tracking-wide disabled:bg-red-400 disabled:cursor-not-allowed transition-colors order-2 sm:order-1"
                    >
                        {loading ? 'DELETING...' : 'DELETE PRODUCT'}
                    </button>
                )}
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className={`bg-gray-900 text-white py-4 px-4 rounded-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 font-light tracking-wide disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors ${selectedProductId ? 'flex-1 order-1 sm:order-2' : 'w-full'
                        }`}
                >
                    {loading ? `SAVING... ${uploadProgress}%` : selectedProductId ? 'UPDATE PRODUCT' : 'CREATE PRODUCT'}
                </button>
            </div>

            {/* Upload Progress */}
            {loading && uploadProgress > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-sm p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                        <span className="text-sm text-blue-600 font-light">{uploadProgress}%</span>
                    </div>
                    <p className="text-xs text-blue-600 mt-2 font-light">
                        {uploadProgress < 100 ? 'Uploading media files...' : 'Finalizing product...'}
                    </p>
                </div>
            )}
        </div>
    )
}