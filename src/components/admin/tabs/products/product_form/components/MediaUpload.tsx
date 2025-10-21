import type { MediaUploadProps } from "../../../../../../types/form_types"


export const MediaUpload = ({
    videoInputRef,
    handleVideoUpload,
    preparationVideo,
    setPreparationVideo,
    existingMedia,
    removeExistingVideo,
    imageInputRef,
    handleImageUpload,
    productImages,
    removeNewImage,
    removeExistingImage
}: MediaUploadProps) => {
    return (
        <>
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
        </>
    )
}
