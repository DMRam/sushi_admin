import { useIngredients } from '../context/IngredientsContext'

export default function StockPage() {
  const { ingredients } = useIngredients()

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h1 className="text-2xl font-semibold mb-4">Ingredient Stock</h1>

      <table className="min-w-full text-sm text-gray-600">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="text-left p-2">Ingredient</th>
            <th className="text-right p-2">Price/kg</th>
            <th className="text-right p-2">Stock (g)</th>
            <th className="text-right p-2">Stock (kg)</th>
            <th className="text-right p-2">Value ($)</th>
          </tr>
        </thead>
        <tbody>
          {ingredients.map((ing) => (
            <tr key={ing.id} className="border-b hover:bg-gray-50">
              <td className="p-2">{ing.name}</td>
              <td className="text-right p-2">${ing.pricePerKg.toFixed(2)}</td>
              <td className="text-right p-2">{ing.stockGrams}</td>
              <td className="text-right p-2">{(ing.stockGrams / 1000).toFixed(2)}</td>
              <td className="text-right p-2">
                ${(ing.pricePerKg / 1000 * ing.stockGrams).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
