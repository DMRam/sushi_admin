import { useEffect, useState } from 'react'
import PurchaseImagePreview from './PurchaseImagePreview'
import PurchaseItemMapper from './PurchaseItemMapper'
import type { PurchaseItem, PurchaseRecord } from './purchaseTypes'
import type { IngredientOption } from './purchaseMappingUtils'


type PurchaseMappingPanelProps = {
  purchase: PurchaseRecord
  ingredients: IngredientOption[]
  onSave: (items: PurchaseItem[]) => Promise<void>
}

export default function PurchaseMappingPanel({
  purchase,
  ingredients,
  onSave,
}: PurchaseMappingPanelProps) {
  const [items, setItems] = useState<PurchaseItem[]>(purchase.items || [])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setItems(purchase.items || [])
  }, [purchase])

  async function handleSave() {
    try {
      setSaving(true)
      await onSave(items)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_1.4fr]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Purchase mapping</h2>
          <div className="mt-3 space-y-1 text-sm text-gray-600">
            <div>Supplier: {purchase.supplierName || '-'}</div>
            <div>Invoice: {purchase.invoiceNumber || '-'}</div>
            <div>Date: {purchase.purchaseDate || '-'}</div>
            <div>Source: {purchase.source || '-'}</div>
            <div>Total: {purchase.total ?? '-'}</div>
          </div>
        </div>

        <PurchaseImagePreview
          imageUrl={purchase.imageUrl || purchase.imageUrls?.[0]}
          imageUrls={purchase.imageUrls}
        />
      </div>

      <div className="space-y-4">
        <PurchaseItemMapper
          items={items}
          ingredients={ingredients}
          onChange={setItems}
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save mapping'}
          </button>
        </div>
      </div>
    </div>
  )
}