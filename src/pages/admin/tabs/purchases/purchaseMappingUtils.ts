export type IngredientOption = {
  id: string
  name: string
  category?: string
  unit?: string
  aliases?: string[]
}

function normalizeText(value: string) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreIngredientMatch(itemName: string, ingredient: IngredientOption): number {
  const source = normalizeText(itemName)
  const candidate = normalizeText(ingredient.name)
  const aliases = (ingredient.aliases || []).map(normalizeText)

  if (!source) return 0

  if (source === candidate) return 100
  if (source.includes(candidate)) return 85
  if (candidate.includes(source)) return 70

  for (const alias of aliases) {
    if (source === alias) return 95
    if (source.includes(alias)) return 80
  }

  const sourceWords = new Set(source.split(' '))
  const candidateWords = candidate.split(' ')
  const overlap = candidateWords.filter((word) => sourceWords.has(word)).length

  if (overlap > 0) {
    return Math.min(60, overlap * 20)
  }

  return 0
}

export function suggestIngredientMatch(
  itemName: string,
  ingredients: IngredientOption[]
): IngredientOption | null {
  let best: IngredientOption | null = null
  let bestScore = 0

  for (const ingredient of ingredients) {
    const score = scoreIngredientMatch(itemName, ingredient)
    if (score > bestScore) {
      bestScore = score
      best = ingredient
    }
  }

  return bestScore >= 60 ? best : null
}