import ProductForm from '../../components/admin/tabs/products/product_form/ProductForm'
import { ProductList } from '../../components/admin/tabs/products/ProductList'

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-10xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-light text-gray-900">
            Product Management
          </h1>
          <p className="text-gray-500 font-light mt-1 text-sm sm:text-base">
            Create and manage menu items with media content
          </p>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Product Form Card */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 sm:p-5 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-medium text-gray-900">Create / Edit Product</h2>
              <p className="text-gray-500 text-sm mt-1">Add product details, pricing, and media content</p>
            </div>
            <div className="p-4 sm:p-5">
              <ProductForm />
            </div>
          </div>

          {/* Product List Card (scrollable) */}
          <div className="bg-white border border-gray-200 rounded-lg flex flex-col min-h-[70vh] lg:min-h-[calc(100vh-210px)]">
            <div className="p-4 sm:p-5 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-medium text-gray-900">Products</h2>
              <p className="text-gray-500 text-sm mt-1">Search, filter and manage existing menu items</p>
            </div>

            {/* Scrollable content */}
            <div className="p-4 sm:p-5 overflow-auto">
              <ProductList />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
