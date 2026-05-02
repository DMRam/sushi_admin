type PurchaseImagePreviewProps = {
  imageUrl?: string
  imageUrls?: string[]
}

export default function PurchaseImagePreview({
  imageUrl,
  imageUrls = [],
}: PurchaseImagePreviewProps) {
  const images = imageUrls.length ? imageUrls : imageUrl ? [imageUrl] : []

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-medium text-gray-900">Invoice image</h3>
        <p className="text-xs text-gray-500">Review the picture while mapping items.</p>
      </div>

      {images.length === 0 ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
          No invoice image available
        </div>
      ) : (
        <div className="space-y-3">
          {images.map((src, index) => (
            <a
              key={`${src}-${index}`}
              href={src}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-xl border border-gray-200"
            >
              <img
                src={src}
                alt={`Invoice ${index + 1}`}
                className="max-h-[600px] w-full object-contain bg-gray-50"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}