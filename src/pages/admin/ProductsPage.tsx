import { useMemo, useState, type ComponentType } from 'react'
import { BadgeDollarSign, Boxes, ChefHat, ImageOff, Languages, PackageCheck, SlidersHorizontal } from 'lucide-react'
import ProductForm from '../../components/admin/tabs/products/product_form/ProductForm'
import { ProductList } from '../../components/admin/tabs/products/ProductList'
import IngredientForm from '../../components/admin/tabs/products/IngredientForm'
import IngredientList from '../../components/admin/tabs/products/IngredientList'
import { useIngredients } from '../../context/IngredientsContext'
import { useProducts } from '../../context/ProductsContext'
import { calculateProfitMargin, productCost } from '../../utils/costCalculations'
import { getByosMinimumPrice } from '../../utils/byosCatalog'

function ProductHealthStat({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: string
  detail: string
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <div className="border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-2 text-sm leading-5 text-slate-500">{detail}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-slate-950 text-white">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const { products, loading: productsLoading } = useProducts()
  const { ingredients } = useIngredients()
  const [workspace, setWorkspace] = useState<'products' | 'byos'>('products')

  const productStats = useMemo(() => {
    const active = products.filter((product) => product.isActive !== false)
    const missingImages = products.filter((product) => !product.imageUrls?.length)
    const missingPrices = products.filter((product) => !Number(product.sellingPrice || 0))
    const localized = products.filter((product) => {
      const description = product.description
      return Boolean(description?.en && description?.fr && description?.es)
    })
    const margins = products
      .filter((product) => Number(product.sellingPrice || 0) > 0)
      .map((product) => calculateProfitMargin(productCost(product, ingredients), Number(product.sellingPrice || 0)))
    const avgMargin = margins.length
      ? margins.reduce((sum, margin) => sum + margin, 0) / margins.length
      : 0

    return {
      active: active.length,
      total: products.length,
      missingImages: missingImages.length,
      missingPrices: missingPrices.length,
      localized: localized.length,
      avgMargin,
    }
  }, [ingredients, products])

  const ingredientStats = useMemo(() => {
    const byos = ingredients.filter((ingredient) => ingredient.displayOnBYOS)
    const byosUsingMinimum = byos.filter((ingredient) => {
      const minimum = getByosMinimumPrice(ingredient.byosName || ingredient.name, ingredient.byosCategory)
      return Number(ingredient.byosPrice || 0) < minimum
    })
    const byosOutOfStock = byos.filter((ingredient) => !Number(ingredient.currentStock || 0))

    return {
      total: ingredients.length,
      byos: byos.length,
      byosUsingMinimum: byosUsingMinimum.length,
      byosOutOfStock: byosOutOfStock.length,
    }
  }, [ingredients])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-[1760px] space-y-5 px-3 pb-8 sm:px-5 lg:px-8">
        <section className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Menu catalog</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Product management
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Maintain online menu items, pricing, media, ingredients, and localized descriptions from one workspace.
              </p>
            </div>
            <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {productsLoading ? 'Loading catalog...' : `${productStats.active} active of ${productStats.total} products`}
            </div>
          </div>
        </section>

        <nav className="grid gap-2 border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setWorkspace('products')}
            className={`flex items-center gap-3 px-4 py-3 text-left transition ${workspace === 'products'
              ? 'bg-slate-950 text-white'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
          >
            <PackageCheck className="h-5 w-5" />
            <span>
              <span className="block text-sm font-semibold">Menu products</span>
              <span className={`block text-xs ${workspace === 'products' ? 'text-white/70' : 'text-slate-500'}`}>
                Dishes, prices, images, descriptions
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setWorkspace('byos')}
            className={`flex items-center gap-3 px-4 py-3 text-left transition ${workspace === 'byos'
              ? 'bg-slate-950 text-white'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
          >
            <ChefHat className="h-5 w-5" />
            <span>
              <span className="block text-sm font-semibold">Ingredients & BYOS</span>
              <span className={`block text-xs ${workspace === 'byos' ? 'text-white/70' : 'text-slate-500'}`}>
                Stock ingredients, BYOS price and limits
              </span>
            </span>
          </button>
        </nav>

        {workspace === 'products' ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ProductHealthStat
                label="Active menu"
                value={`${productStats.active}/${productStats.total}`}
                detail="Products visible to ordering and service flows."
                icon={PackageCheck}
              />
              <ProductHealthStat
                label="Catalog gaps"
                value={`${productStats.missingImages + productStats.missingPrices}`}
                detail={`${productStats.missingImages} without images · ${productStats.missingPrices} without price`}
                icon={ImageOff}
              />
              <ProductHealthStat
                label="Localized"
                value={`${productStats.localized}`}
                detail="Products with English, French, and Spanish descriptions."
                icon={Languages}
              />
              <ProductHealthStat
                label="Avg margin"
                value={`${productStats.avgMargin.toFixed(1)}%`}
                detail="Based on current ingredients and selling prices."
                icon={BadgeDollarSign}
              />
            </section>

            <div className="grid grid-cols-1 gap-4">
              <section className="border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-4 sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Editor</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">Create or edit product</h2>
                  <p className="mt-1 text-sm text-slate-500">Update details, pricing, ingredients, and media.</p>
                </div>
                <div className="p-4 sm:p-5">
                  <ProductForm />
                </div>
              </section>

              <section className="flex min-h-[60vh] flex-col border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-4 sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Catalog</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">Products</h2>
                  <p className="mt-1 text-sm text-slate-500">Search, filter, review margins, and find catalog gaps quickly.</p>
                </div>

                <div className="p-4 sm:p-5 overflow-auto">
                  <ProductList />
                </div>
              </section>
            </div>
          </>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ProductHealthStat
                label="Ingredients"
                value={`${ingredientStats.total}`}
                detail="Stock ingredients available for recipes and purchasing."
                icon={Boxes}
              />
              <ProductHealthStat
                label="BYOS choices"
                value={`${ingredientStats.byos}`}
                detail="Ingredients enabled for Build Your Own Sushi."
                icon={ChefHat}
              />
              <ProductHealthStat
                label="Using minimum"
                value={`${ingredientStats.byosUsingMinimum}`}
                detail="BYOS choices where the catalog minimum protects the customer price."
                icon={BadgeDollarSign}
              />
              <ProductHealthStat
                label="Out of stock BYOS"
                value={`${ingredientStats.byosOutOfStock}`}
                detail="Enabled BYOS choices without current stock."
                icon={SlidersHorizontal}
              />
            </section>

            <section className="border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Ingredients & BYOS</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">Ingredient catalog</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Purchases keep stock and cost accurate. BYOS settings control what customers see, what they pay, and the limits per roll.
                </p>
              </div>
              <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[380px_1fr]">
                <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">Add ingredient</h3>
                  <IngredientForm />
                </div>
                <div className="rounded-sm border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">Manage ingredients</h3>
                  <IngredientList />
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
