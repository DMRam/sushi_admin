import { MediaUpload } from './components/MediaUpload'
import { ProductDetails } from './components/ProductDetails'
import { IngredientsSectionAndCost } from './components/IngredientsSectionAndCost'
import { useProductForm } from './hooks/useProductForm'
import { ProductPicker } from './components/ProductPicker'

export default function ProductForm() {
    const {
        // State
        ingredients,
        products,
        selectedProductId,
        setSelectedProductId,
        productType,
        setProductType,
        loading,
        uploadProgress,
        formData,
        setFormData,
        productIngredients,
        newIngredient,
        setNewIngredient,
        preparationVideo,
        setPreparationVideo,
        productImages,
        existingMedia,
        videoInputRef,
        imageInputRef,
        isAdmin,
        totalCost,
        profit,
        profitMargin,
        sellingPriceNum,

        // Actions
        handleAddIngredient,
        handleRemoveIngredient,
        handleVideoUpload,
        handleImageUpload,
        removeNewImage,
        removeExistingImage,
        removeExistingVideo,
        handleSave,
        handleDelete,
        getIngredientName,
        getIngredientCost
    } = useProductForm()


    const requestProductTypeChange = (nextType: 'ingredientBased' | 'directCost') => {
        if (nextType === productType) return

        const isSwitchingToDirect = nextType === 'directCost'
        const hasIngredients = productIngredients?.length > 0
        const hasDirectCost = !!formData?.directCostPrice && String(formData.directCostPrice).trim() !== ''

        // Build a clear warning message
        let msg = `Switch product type to "${isSwitchingToDirect ? 'Direct Cost' : 'Ingredient Based'}"?\n\n`

        if (isSwitchingToDirect && hasIngredients) {
            msg += `This will CLEAR the current ingredients list (recommended to avoid confusion).\n`
        }
        if (!isSwitchingToDirect && hasDirectCost) {
            msg += `This will CLEAR the direct cost value (recommended to avoid confusion).\n`
        }

        msg += `\nContinue?`

        if (!confirm(msg)) return

        // Apply switch
        setProductType(nextType)
        setFormData((prev: any) => {
            const updated = { ...prev, productType: nextType }

            if (isSwitchingToDirect) {
                // clear ingredient-based stuff (recommended)
                updated.ingredients = []
            } else {
                // clear direct-cost stuff (recommended)
                updated.directCostPrice = ''
                updated.costPrice = 0
            }

            return updated
        })

        // If your hook keeps separate productIngredients state, clear it too
        if (isSwitchingToDirect) {
            setNewIngredient({ id: '', quantity: 0, unit: 'g' } as any) // optional
            // If hook exposes a setter for productIngredients, use it.
            // If not, the formData.ingredients clearing usually is enough.
        }
    }


    return (
        <div className="space-y-6">
            {/* Product Selection */}
            <div>

                <ProductPicker
                    products={products}
                    selectedProductId={selectedProductId}
                    setSelectedProductId={setSelectedProductId}
                />

            </div>

            {/* Product Type Selection - Only show when creating new product */}
            <div className="bg-white border border-gray-200 rounded-sm p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="text-lg font-light text-gray-900 tracking-wide">PRODUCT TYPE</h3>
                    {selectedProductId && (
                        <span className="text-xs text-gray-500">
                            Changing type may reset related fields
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => requestProductTypeChange('ingredientBased')}
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
                        onClick={() => requestProductTypeChange('directCost')}
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


            <ProductDetails
                formData={formData}
                setFormData={setFormData}
            />

            <MediaUpload
                existingMedia={existingMedia}
                handleImageUpload={handleImageUpload}
                handleVideoUpload={handleVideoUpload}
                imageInputRef={imageInputRef}
                preparationVideo={preparationVideo}
                productImages={productImages}
                removeExistingImage={removeExistingImage}
                removeExistingVideo={removeExistingVideo}
                removeNewImage={removeNewImage}
                setPreparationVideo={setPreparationVideo}
                videoInputRef={videoInputRef}
            />

            <IngredientsSectionAndCost
                formData={formData}
                getIngredientCost={getIngredientCost}
                getIngredientName={getIngredientName}
                handleAddIngredient={handleAddIngredient}
                handleRemoveIngredient={handleRemoveIngredient}
                ingredients={ingredients}
                isAdmin={isAdmin}
                newIngredient={newIngredient}
                productIngredients={productIngredients}
                productType={productType}
                profit={profit}
                profitMargin={profitMargin}
                sellingPriceNum={sellingPriceNum}
                setFormData={setFormData}
                setNewIngredient={setNewIngredient}
                totalCost={totalCost}
            />

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