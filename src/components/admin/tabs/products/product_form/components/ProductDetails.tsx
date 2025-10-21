import type { ProductDetailsProps } from "../../../../../../types/form_types"

export const ProductDetails = ({ formData, setFormData, }: ProductDetailsProps) => {
    return (
        <>
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
        </>
    )
}
