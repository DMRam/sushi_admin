import { ImagePlus, Video } from 'lucide-react'
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
    const imageCount = existingMedia.imageUrls.length + productImages.length
    const primaryImage = productImages[0] ? URL.createObjectURL(productImages[0]) : existingMedia.imageUrls[0]

    return (
        <section className="overflow-hidden rounded-2xl border border-[#f0dfd8] bg-white shadow-sm">
            <div className="border-b border-[#f0dfd8] bg-[#fffaf7] p-4 sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f45f4f]">Media</p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-950">Product photos and preparation video</h3>
                    </div>
                    <span className="w-fit rounded-full border border-[#f0dfd8] bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {imageCount}/10 images
                    </span>
                </div>
            </div>

            <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[260px_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-2xl border border-[#eadbd4] bg-[#fff7f3]">
                    {primaryImage ? (
                        <img src={primaryImage} alt="Primary product preview" className="h-64 w-full object-cover" />
                    ) : (
                        <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
                            <ImagePlus className="h-10 w-10" />
                            <span className="text-sm font-semibold">No product image yet</span>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
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
                            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-transparent bg-[#fb6a57] px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(251,106,87,0.24)] transition hover:bg-[#f25543]"
                        >
                            <ImagePlus className="h-4 w-4" />
                            Add images
                        </button>

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
                            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#eadbd4] bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-[#fff7f3]"
                        >
                            <Video className="h-4 w-4" />
                            {preparationVideo || existingMedia.videoUrl ? 'Change video' : 'Add video'}
                        </button>
                    </div>

                    {(preparationVideo || existingMedia.videoUrl) && (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
                            <span className="min-w-0 truncate font-semibold text-emerald-800">
                                {preparationVideo ? preparationVideo.name : 'Preparation video uploaded'}
                            </span>
                            <button
                                type="button"
                                onClick={() => (preparationVideo ? setPreparationVideo(null) : removeExistingVideo())}
                                className="shrink-0 text-sm font-semibold text-red-700 hover:text-red-800"
                            >
                                Remove
                            </button>
                        </div>
                    )}

                    {(productImages.length > 0 || existingMedia.imageUrls.length > 0) && (
                        <div className="flex flex-wrap gap-2">
                            {productImages.map((image, index) => (
                                <div key={`new-${index}`} className="relative">
                                    <img
                                        src={URL.createObjectURL(image)}
                                        alt={`New product image ${index + 1}`}
                                        className="h-16 w-20 rounded-xl border border-[#eadbd4] object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeNewImage(index)}
                                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            {existingMedia.imageUrls.map((url, index) => (
                                <div key={url} className="relative">
                                    <img
                                        src={url}
                                        alt={`Product image ${index + 1}`}
                                        className="h-16 w-20 rounded-xl border border-[#eadbd4] object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeExistingImage(url)}
                                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <p className="text-xs leading-5 text-slate-500">
                        Use clear product photos for the website, ordering flow, and future fidelity app. JPG, PNG, WebP, MP4, MOV, or AVI are supported.
                    </p>
                </div>
            </div>
        </section>
    )
}
