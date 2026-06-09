import { useMemo, useState, type ComponentType } from 'react'
import { BadgeDollarSign, Boxes, ImageOff, Languages, PackageCheck, Plus, SlidersHorizontal } from 'lucide-react'
import ProductForm from '../../components/admin/tabs/products/product_form/ProductForm'
import { ProductList } from '../../components/admin/tabs/products/ProductList'
import IngredientForm from '../../components/admin/tabs/products/IngredientForm'
import IngredientList from '../../components/admin/tabs/products/IngredientList'
import { useIngredients } from '../../context/IngredientsContext'
import { useProducts } from '../../context/ProductsContext'
import { calculateProfitMargin, productCost } from '../../utils/costCalculations'
import { getByosMinimumPrice } from '../../utils/byosCatalog'

const catalogSurface = 'bg-[#fffaf7]'
const maisushiCoral = 'text-[#f45f4f]'
const maisushiCoralBg = 'bg-[#fb6a57]'

function ProductHealthStat({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'coral',
}: {
  label: string
  value: string
  detail: string
  icon: ComponentType<{ className?: string }>
  tone?: 'coral' | 'green' | 'slate' | 'amber'
}) {
  const toneClass = {
    coral: 'bg-[#fff1ed] text-[#f45f4f]',
    green: 'bg-emerald-50 text-emerald-600',
    slate: 'bg-slate-100 text-slate-700',
    amber: 'bg-amber-50 text-amber-600',
  }[tone]

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-2 text-sm leading-5 text-slate-500">{detail}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
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
  const [selectedProductId, setSelectedProductId] = useState('')

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
    <div className={`min-h-screen ${catalogSurface}`}>
      <div className="mx-auto w-full max-w-[1840px] space-y-5 px-3 pb-8 sm:px-5 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-[#f0dfd8] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="h-1.5 bg-gradient-to-r from-[#fb6a57] via-[#fb8b72] to-[#111827]" />
          <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${maisushiCoral}`}>Menu catalog</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Products
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Manage menu items, prices, media, ingredients, and localized descriptions from one organized workspace.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[360px]">
              <button
                type="button"
                onClick={() => {
                  setWorkspace('products')
                  setSelectedProductId('')
                }}
                className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-transparent ${maisushiCoralBg} px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(251,106,87,0.28)] transition hover:bg-[#f25543]`}
              >
                <Plus className="h-4 w-4" />
                New product
              </button>
              <div className="rounded-xl border border-[#f0dfd8] bg-[#fff7f3] px-4 py-3 text-sm font-semibold text-slate-700">
                {productsLoading ? 'Loading...' : `${productStats.active}/${productStats.total} active`}
              </div>
            </div>
          </div>
          </div>
        </section>

        <nav className="grid gap-2 rounded-2xl border border-[#f0dfd8] bg-white p-2 shadow-sm sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setWorkspace('products')}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left transition ${workspace === 'products'
              ? 'bg-[#fff1ed] text-[#f45f4f]'
              : 'bg-white text-slate-700 hover:bg-[#fff7f3]'
              }`}
          >
            <PackageCheck className="h-5 w-5" />
            <span>
              <span className="block text-sm font-semibold">Menu products</span>
              <span className={`block text-xs ${workspace === 'products' ? 'text-[#9f3b31]' : 'text-slate-500'}`}>
                Dishes, prices, images, descriptions
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setWorkspace('byos')}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left transition ${workspace === 'byos'
              ? 'bg-[#fff1ed] text-[#f45f4f]'
              : 'bg-white text-slate-700 hover:bg-[#fff7f3]'
              }`}
          >
            <SlidersHorizontal className="h-5 w-5" />
            <span>
              <span className="block text-sm font-semibold">Ingredients & BYOS</span>
              <span className={`block text-xs ${workspace === 'byos' ? 'text-[#9f3b31]' : 'text-slate-500'}`}>
                Stock ingredients, BYOS price and limits
              </span>
            </span>
          </button>
        </nav>

        {workspace === 'products' ? (
          <>
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <ProductHealthStat
                label="Active menu"
                value={`${productStats.active}/${productStats.total}`}
                detail="Products visible to ordering and service flows."
                icon={PackageCheck}
                tone="green"
              />
              <ProductHealthStat
                label="Catalog gaps"
                value={`${productStats.missingImages + productStats.missingPrices}`}
                detail={`${productStats.missingImages} without images · ${productStats.missingPrices} without price`}
                icon={ImageOff}
                tone="amber"
              />
              <ProductHealthStat
                label="Localized"
                value={`${productStats.localized}`}
                detail="Products with English, French, and Spanish descriptions."
                icon={Languages}
                tone="slate"
              />
              <ProductHealthStat
                label="Avg margin"
                value={`${productStats.avgMargin.toFixed(1)}%`}
                detail="Based on current ingredients and selling prices."
                icon={BadgeDollarSign}
                tone="coral"
              />
            </section>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(430px,0.86fr)_minmax(640px,1.14fr)]">
              <section className="flex min-h-[60vh] flex-col overflow-hidden rounded-3xl border border-[#f0dfd8] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
                <div className="border-b border-[#f0dfd8] bg-gradient-to-br from-white to-[#fff7f3] p-4 sm:p-5">
                  <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${maisushiCoral}`}>Catalog</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">Menu items</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Click one row to load it in the editor. Use filters to find active, hidden, featured, or incomplete products.
                  </p>
                </div>

                <div className="p-4 sm:p-5 overflow-auto">
                  <ProductList selectedProductId={selectedProductId} onSelectProduct={setSelectedProductId} />
                </div>
              </section>

              <section className="overflow-hidden rounded-3xl border border-[#f0dfd8] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)] xl:sticky xl:top-24 xl:self-start">
                <div className="border-b border-[#f0dfd8] bg-gradient-to-br from-white to-[#fff7f3] p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${maisushiCoral}`}>
                        {selectedProductId ? 'Selected product' : 'New product'}
                      </p>
                      <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                        {selectedProductId ? 'Edit item' : 'Create item'}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Save once after updating details, media, price, and recipe.
                      </p>
                    </div>
                    {selectedProductId && (
                      <button
                        type="button"
                        onClick={() => setSelectedProductId('')}
                        className="rounded-xl border border-[#f0dfd8] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[#fff7f3]"
                      >
                        New
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-[calc(100vh-180px)] overflow-auto p-4 sm:p-5">
                  <ProductForm
                    selectedProductId={selectedProductId}
                    setSelectedProductId={setSelectedProductId}
                    showPicker={false}
                  />
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
                icon={SlidersHorizontal}
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

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Ingredients & BYOS</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">Ingredient catalog</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Purchases keep stock and cost accurate. BYOS settings control what customers see, what they pay, and the limits per roll.
                </p>
              </div>
              <div className="grid gap-5 p-4 sm:p-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                  <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Quick entry</p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-950">Add ingredient</h3>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                        Enter the purchase quantity and what you paid. The system calculates the recipe cost and keeps the catalog consistent.
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">
                      Built for fast receiving
                    </div>
                  </div>
                  <IngredientForm />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">Manage ingredients</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Edit costs, stock, BYOS visibility, customer price, and display order directly in the table.
                      </p>
                    </div>
                  </div>
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
