import { MediaUpload } from './components/MediaUpload'
import { ProductDetails } from './components/ProductDetails'
import { IngredientsSectionAndCost } from './components/IngredientsSectionAndCost'
import { useProductForm } from './hooks/useProductForm'
import { ProductPicker } from './components/ProductPicker'

type ProductFormProps = {
    selectedProductId?: string
    setSelectedProductId?: (id: string) => void
    showPicker?: boolean
}

export default function ProductForm(props: ProductFormProps = {}) {
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
    } = useProductForm(props)


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
        <div className="space-y-5">
            {props.showPicker !== false && (
                <ProductPicker
                    products={products}
                    selectedProductId={selectedProductId}
                    setSelectedProductId={setSelectedProductId}
                />
            )}

            <div className="rounded-2xl border border-[#f0dfd8] bg-[#fffaf7] p-4">
                <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Cost method</h3>
                    {selectedProductId && (
                        <span className="text-xs text-slate-500">
                            Changing type may reset related fields
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => requestProductTypeChange('ingredientBased')}
                        className={`rounded-2xl border bg-white p-4 text-left transition-colors ${productType === 'ingredientBased'
                                ? 'border-[#fb6a57] bg-[#fff1ed] text-slate-950'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                    >
                        <div className="font-semibold tracking-wide">Ingredient based</div>
                        <div className="mt-1 text-sm text-slate-500">Calculate cost from ingredients</div>
                    </button>

                    <button
                        type="button"
                        onClick={() => requestProductTypeChange('directCost')}
                        className={`rounded-2xl border bg-white p-4 text-left transition-colors ${productType === 'directCost'
                                ? 'border-[#fb6a57] bg-[#fff1ed] text-slate-950'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                    >
                        <div className="font-semibold tracking-wide">Direct cost</div>
                        <div className="mt-1 text-sm text-slate-500">Set cost directly</div>
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
            <div className="sticky bottom-0 z-20 -mx-5 flex flex-col gap-3 border-t border-[#f0dfd8] bg-white/95 p-4 backdrop-blur sm:flex-row">
                {selectedProductId && (
                    <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="order-2 inline-flex min-h-[48px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 sm:order-1"
                    >
                        {loading ? 'Deleting...' : 'Delete product'}
                    </button>
                )}
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className={`inline-flex min-h-[48px] items-center justify-center rounded-xl border border-transparent bg-[#fb6a57] px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(251,106,87,0.24)] transition hover:bg-[#f25543] disabled:cursor-not-allowed disabled:opacity-60 ${selectedProductId ? 'flex-1 order-1 sm:order-2' : 'w-full'
                        }`}
                >
                    {loading ? `Saving... ${uploadProgress}%` : selectedProductId ? 'Update product' : 'Create product'}
                </button>
            </div>

            {/* Upload Progress */}
            {loading && uploadProgress > 0 && (
                <div className="border border-blue-200 bg-blue-50 p-4">
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
