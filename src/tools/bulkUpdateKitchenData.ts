import * as admin from "firebase-admin"
import { extractKitchenDataFromDescription } from "../utils/kitchenParser"

admin.initializeApp()

const db = admin.firestore()

type ProductDoc = {
  name?: string
  category?: string
  description?: { fr?: string; en?: string; es?: string }
  ingredients?: string[]
  kitchen?: {
    wrapper?: string
    fillings?: string[]
    toppings?: string[]
    sauces?: string[]
    garnish?: string[]
    steps?: string[]
    notes?: string
    pieces?: number
  }
  isActive?: boolean
}

async function run() {
  const snapshot = await db.collection("web-products").get()

  console.log(`Found ${snapshot.size} products`)

  let updated = 0

  for (const doc of snapshot.docs) {
    const data = doc.data() as ProductDoc

    const parsed = extractKitchenDataFromDescription({
      name: data.name,
      description: data.description,
      ingredients: data.ingredients,
    })

    const existingKitchen = data.kitchen || {}

    const nextIngredients =
      data.ingredients && data.ingredients.length > 0
        ? data.ingredients
        : parsed.ingredients

    const nextKitchen = {
      wrapper: existingKitchen.wrapper || parsed.wrapper || "",
      fillings:
        existingKitchen.fillings && existingKitchen.fillings.length > 0
          ? existingKitchen.fillings
          : parsed.fillings,
      toppings:
        existingKitchen.toppings && existingKitchen.toppings.length > 0
          ? existingKitchen.toppings
          : parsed.toppings,
      sauces:
        existingKitchen.sauces && existingKitchen.sauces.length > 0
          ? existingKitchen.sauces
          : parsed.sauces,
      garnish: existingKitchen.garnish || [],
      steps: existingKitchen.steps || [],
      notes: existingKitchen.notes || parsed.notes || "",
      pieces: existingKitchen.pieces || null,
    }

    await doc.ref.set(
      {
        ingredients: nextIngredients,
        kitchen: nextKitchen,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    updated++
    console.log(`Updated: ${data.name || doc.id}`)
  }

  console.log(`Done. Updated ${updated} products.`)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})