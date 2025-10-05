import type { Ingredient, Product, Unit } from "../types/types"

export const convertToKg = (quantity: number, unit: Unit): number => {
    switch (unit) {
        case 'g': return quantity / 1000
        case 'kg': return quantity
        case 'ml': return quantity / 1000
        case 'l': return quantity
        case 'unit': return quantity
        default: return quantity
    }
}

export const ingredientCost = (ingredient: Ingredient, quantity: number, unit: Unit): number => {
    const quantityInKg = convertToKg(quantity, unit)
    return ingredient.pricePerKg * quantityInKg
}

export const productCost = (product: Product, ingredients: Ingredient[]): number => {
    return product.ingredients.reduce((total, productIngredient) => {
        const ingredient = ingredients.find(ing => ing.id === productIngredient.ingredientId)
        if (!ingredient) return total

        return total + ingredientCost(ingredient, productIngredient.quantity, productIngredient.unit)
    }, 0)
}

// Fixed profit margin calculation
export const calculateProfitMargin = (costPrice: number, sellingPrice: number): number => {
    if (sellingPrice === 0 || costPrice === 0) return 0
    return ((sellingPrice - costPrice) / sellingPrice) * 100
}

// Alternative calculation for profit percentage based on cost
export const calculateProfitPercentage = (costPrice: number, sellingPrice: number): number => {
    if (costPrice === 0) return 0
    return ((sellingPrice - costPrice) / costPrice) * 100
}

export const recalculateProductProfit = (product: Product, ingredients: Ingredient[]): Product => {
  const cost = productCost(product, ingredients)
  const profitMargin = product.sellingPrice ? calculateProfitMargin(cost, product.sellingPrice) : undefined
  
  return {
    ...product,
    costPrice: cost,
    profitMargin
  }
}