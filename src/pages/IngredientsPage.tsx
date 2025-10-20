import IngredientForm from "../components/admin/tabs/products/IngredientForm";
import IngredientList from "../components/admin/tabs/products/IngredientList";


export default function IngredientsPage(){
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-medium">Add Ingredient</h2>
        <IngredientForm />
      </div>
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-medium">Ingredients</h2>
        <IngredientList />
      </div>
    </div>
  )
}