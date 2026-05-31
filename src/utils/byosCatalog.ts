export type ByosCategory = 'protein' | 'filling' | 'rolledOn' | 'sauce' | 'extra'

export type ByosCatalogItem = {
  key: string
  category: ByosCategory
  labels: {
    fr: string
    en: string
    es: string
  }
  minPrice: number
  maxPerRoll: number
  sortOrder: number
  aliases: string[]
}

export const byosCatalog: ByosCatalogItem[] = [
  {
    key: 'salmon',
    category: 'protein',
    labels: { fr: 'Saumon', en: 'Salmon', es: 'Salmón' },
    minPrice: 2.75,
    maxPerRoll: 1,
    sortOrder: 10,
    aliases: ['salmon', 'saumon', 'salmon fresco', 'fresh salmon'],
  },
  {
    key: 'tuna',
    category: 'protein',
    labels: { fr: 'Thon', en: 'Tuna', es: 'Atún' },
    minPrice: 2.95,
    maxPerRoll: 1,
    sortOrder: 20,
    aliases: ['tuna', 'thon', 'atun', 'atún'],
  },
  {
    key: 'shrimp-tempura',
    category: 'protein',
    labels: { fr: 'Crevette tempura', en: 'Shrimp tempura', es: 'Camarón tempura' },
    minPrice: 3.25,
    maxPerRoll: 1,
    sortOrder: 30,
    aliases: ['shrimp tempura', 'crevette tempura', 'camarón tempura', 'camaron tempura'],
  },
  {
    key: 'crab',
    category: 'protein',
    labels: { fr: 'Crabe', en: 'Crab', es: 'Cangrejo' },
    minPrice: 2.25,
    maxPerRoll: 1,
    sortOrder: 40,
    aliases: ['crab', 'crabe', 'cangrejo', 'kani'],
  },
  {
    key: 'avocado-protein',
    category: 'protein',
    labels: { fr: 'Avocat', en: 'Avocado', es: 'Palta' },
    minPrice: 1.75,
    maxPerRoll: 1,
    sortOrder: 50,
    aliases: ['avocado protein', 'avocat protein', 'palta protein'],
  },
  {
    key: 'cucumber',
    category: 'filling',
    labels: { fr: 'Concombre', en: 'Cucumber', es: 'Pepino' },
    minPrice: 0.75,
    maxPerRoll: 1,
    sortOrder: 110,
    aliases: ['cucumber', 'concombre', 'pepino'],
  },
  {
    key: 'mango',
    category: 'filling',
    labels: { fr: 'Mangue', en: 'Mango', es: 'Mango' },
    minPrice: 0.95,
    maxPerRoll: 1,
    sortOrder: 120,
    aliases: ['mango', 'mangue'],
  },
  {
    key: 'philadelphia',
    category: 'filling',
    labels: { fr: 'Philadelphia', en: 'Philadelphia', es: 'Philadelphia' },
    minPrice: 1.25,
    maxPerRoll: 1,
    sortOrder: 130,
    aliases: ['philadelphia', 'queso crema', 'queso philadelphia', 'cream cheese', 'fromage creme', 'fromage à la crème'],
  },
  {
    key: 'green-onion',
    category: 'filling',
    labels: { fr: 'Oignon vert', en: 'Green onion', es: 'Cebollín' },
    minPrice: 0.5,
    maxPerRoll: 1,
    sortOrder: 140,
    aliases: ['green onion', 'oignon vert', 'cebollin', 'cebollín'],
  },
  {
    key: 'tempura-flakes',
    category: 'filling',
    labels: { fr: 'Flocons tempura', en: 'Tempura flakes', es: 'Tempura crujiente' },
    minPrice: 0.85,
    maxPerRoll: 1,
    sortOrder: 150,
    aliases: ['tempura flakes', 'flocons tempura', 'frit', 'crispy', 'tempura crujiente'],
  },
  {
    key: 'sesame',
    category: 'filling',
    labels: { fr: 'Sésame', en: 'Sesame', es: 'Sésamo' },
    minPrice: 0.4,
    maxPerRoll: 1,
    sortOrder: 160,
    aliases: ['sesame', 'sésame', 'sesamo', 'sésamo'],
  },
  {
    key: 'avocado-rolled',
    category: 'rolledOn',
    labels: { fr: 'Avocat', en: 'Avocado', es: 'Palta' },
    minPrice: 1.75,
    maxPerRoll: 1,
    sortOrder: 210,
    aliases: ['avocado', 'avocat', 'palta'],
  },
  {
    key: 'smoked-salmon',
    category: 'rolledOn',
    labels: { fr: 'Saumon fumé', en: 'Smoked salmon', es: 'Salmón ahumado' },
    minPrice: 3.25,
    maxPerRoll: 1,
    sortOrder: 220,
    aliases: ['smoked salmon', 'salmon fume', 'saumon fume', 'saumon fumé', 'salmon ahumado', 'salmón ahumado'],
  },
  {
    key: 'masago',
    category: 'rolledOn',
    labels: { fr: 'Masago', en: 'Masago', es: 'Masago' },
    minPrice: 1.25,
    maxPerRoll: 1,
    sortOrder: 230,
    aliases: ['masago', 'massago'],
  },
  {
    key: 'chives',
    category: 'rolledOn',
    labels: { fr: 'Ciboulette', en: 'Chives', es: 'Cebollín fino' },
    minPrice: 0.5,
    maxPerRoll: 1,
    sortOrder: 240,
    aliases: ['chives', 'ciboulette', 'ciboullet', 'cebollin fino', 'cebollín fino'],
  },
  {
    key: 'green-onion-rolled',
    category: 'rolledOn',
    labels: { fr: 'Oignon vert', en: 'Green onion', es: 'Cebollín' },
    minPrice: 0.5,
    maxPerRoll: 1,
    sortOrder: 250,
    aliases: ['green onion', 'oignon vert', 'cebollin', 'cebollín', 'green onion rolled', 'oignon vert rolled', 'cebollin rolled'],
  },
  {
    key: 'salmon-rolled',
    category: 'rolledOn',
    labels: { fr: 'Saumon', en: 'Salmon', es: 'Salmón' },
    minPrice: 2.75,
    maxPerRoll: 1,
    sortOrder: 260,
    aliases: ['salmon', 'saumon', 'salmón', 'salmon rolled', 'saumon rolled', 'salmón rolled'],
  },
  {
    key: 'philadelphia-rolled',
    category: 'rolledOn',
    labels: { fr: 'Philadelphia', en: 'Philadelphia', es: 'Philadelphia' },
    minPrice: 1.25,
    maxPerRoll: 1,
    sortOrder: 270,
    aliases: ['philadelphia', 'queso crema', 'queso philadelphia', 'cream cheese', 'philadelphia rolled', 'queso crema rolled', 'queso philadelphia rolled', 'cream cheese rolled'],
  },
  {
    key: 'crispy-rolled',
    category: 'rolledOn',
    labels: { fr: 'Croustillant', en: 'Crispy', es: 'Crujiente' },
    minPrice: 0.85,
    maxPerRoll: 1,
    sortOrder: 280,
    aliases: ['crispy', 'frit', 'tempura flakes', 'crispy rolled', 'frit rolled', 'croustillant', 'crujiente'],
  },
  {
    key: 'spicy-mayo',
    category: 'sauce',
    labels: { fr: 'Mayo épicée', en: 'Spicy mayo', es: 'Mayo picante' },
    minPrice: 0.5,
    maxPerRoll: 1,
    sortOrder: 310,
    aliases: ['spicy mayo', 'mayo épicée', 'mayo epicee', 'mayo picante'],
  },
  {
    key: 'eel-sauce',
    category: 'sauce',
    labels: { fr: 'Sauce anguille', en: 'Eel sauce', es: 'Salsa de anguila' },
    minPrice: 0.5,
    maxPerRoll: 1,
    sortOrder: 320,
    aliases: ['eel sauce', 'sauce anguille', 'salsa de anguila'],
  },
  {
    key: 'ponzu',
    category: 'sauce',
    labels: { fr: 'Ponzu', en: 'Ponzu', es: 'Ponzu' },
    minPrice: 0.5,
    maxPerRoll: 1,
    sortOrder: 330,
    aliases: ['ponzu'],
  },
  {
    key: 'no-sauce',
    category: 'sauce',
    labels: { fr: 'Aucune sauce', en: 'No sauce', es: 'Sin salsa' },
    minPrice: 0,
    maxPerRoll: 1,
    sortOrder: 340,
    aliases: ['none', 'no sauce', 'aucune sauce', 'sin salsa'],
  },
]

export const normalizeByosText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export function findByosCatalogItem(name: string, category?: ByosCategory) {
  const normalized = normalizeByosText(name)
  if (!normalized) return undefined

  const candidates = byosCatalog.filter((item) => !category || item.category === category)
  return candidates.find((item) =>
    item.aliases.some((alias) => normalizeByosText(alias) === normalized),
  )
}

export function getByosMinimumPrice(name: string, category?: ByosCategory) {
  return findByosCatalogItem(name, category)?.minPrice || getByosCategoryMinimumPrice(category)
}

export function getEffectiveByosPrice(name: string, category: ByosCategory | undefined, dashboardPrice?: number) {
  return Math.max(Number(dashboardPrice || 0), getByosMinimumPrice(name, category))
}

export const getByosEffectivePrice = getEffectiveByosPrice

export function getByosDisplayLabels(name: string, category?: ByosCategory) {
  return findByosCatalogItem(name, category)?.labels
}

export function getByosCategoryMinimumPrice(category?: ByosCategory) {
  if (category === 'protein') return 2
  if (category === 'filling') return 0.75
  if (category === 'rolledOn') return 0.85
  if (category === 'sauce') return 0.5
  if (category === 'extra') return 0.75
  return 0.75
}
