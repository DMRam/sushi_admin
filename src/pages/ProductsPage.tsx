import ProductForm from '../components/ProductForm'
import { ProductList } from '../components/ProductList'


export default function ProductsPage(){
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-medium">Create / Edit Product</h2>
        <ProductForm />
      </div>
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-medium">Products</h2>
        <ProductList />
      </div>
    </div>
  )
}