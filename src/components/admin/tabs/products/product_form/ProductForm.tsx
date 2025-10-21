import { MediaUpload } from './components/MediaUpload'
import { ProductDetails } from './components/ProductDetails'
import { IngredientsSectionAndCost } from './components/IngredientsSectionAndCost'
import { useProductForm } from './hooks/useProductForm'

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