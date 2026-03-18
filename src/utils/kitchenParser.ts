export interface ParsedKitchenData {
    ingredients: string[]
    wrapper?: string
    fillings: string[]
    toppings: string[]
    sauces: string[]
    notes?: string
}



// TODO
// Think how to enahnce all this flow using N8N 
// so i can have a webhook that receives the order 
// then my workflow can do whatever i want, kitchen, delivery, etc
// even the interaction with the clients on the restaurant, like sending them a message when the order is ready, etc


// within this context i can also include a functionality or even better have an application
// to react de qr code from an specifique table on the restaurant and send the order directly to the kitchen, 
// this way i can have a digital menu and also a more efficient order management system for the restaurant, 
// and also i can have more control over the orders and the kitchen workflow, etc









const INGREDIENT_SYNONYMS: Array<{ match: RegExp; value: string }> = [
    { match: /\b(ebi|shrimp|crevette|camaron|camarón)\b/i, value: "Crevette" },
    { match: /\b(avocado|avocat|palta)\b/i, value: "Avocat" },
    { match: /\b(oignon vert|green onion|cebollin|cebollín|scallion)\b/i, value: "Oignon vert" },
    { match: /\b(saumon|salmon)\b/i, value: "Saumon" },
    { match: /\b(thon|tuna)\b/i, value: "Thon" },
    { match: /\b(surimi)\b/i, value: "Surimi" },
    { match: /\b(philadelphia|cream cheese|fromage a la creme|fromage à la crème|fromage)\b/i, value: "Fromage à la crème" },
    { match: /\b(tempura)\b/i, value: "Tempura" },
    { match: /\b(concombre|cucumber|pepino)\b/i, value: "Concombre" },
    { match: /\b(mangue|mango)\b/i, value: "Mangue" },
    { match: /\b(oeuf|egg)\b/i, value: "Oeuf" },
    { match: /\b(crabe|crab)\b/i, value: "Crabe" },
    { match: /\b(poulet|chicken)\b/i, value: "Poulet" },
]

const SAUCE_SYNONYMS: Array<{ match: RegExp; value: string }> = [
    { match: /\b(spicy mayo|mayo epicee|mayo épicée)\b/i, value: "Spicy Mayo" },
    { match: /\b(teriyaki)\b/i, value: "Teriyaki" },
    { match: /\b(ponzu)\b/i, value: "Ponzu" },
    { match: /\b(soy sauce|sauce soya|sauce soja)\b/i, value: "Sauce Soya" },
]

const TOPPING_SYNONYMS: Array<{ match: RegExp; value: string }> = [
    { match: /\b(sesame|sésame)\b/i, value: "Sésame" },
    { match: /\b(ciboulette|chives)\b/i, value: "Ciboulette" },
    { match: /\b(oignon croustillant|crispy onion)\b/i, value: "Oignon croustillant" },
]

function normalizeText(text?: string): string {
    return (text || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
}

function unique(values: string[]): string[] {
    return Array.from(new Set(values))
}

function detectWrapper(text: string): string | undefined {
    if (/\b(nori)\b/i.test(text)) return "Nori"
    if (/\b(soy paper|soya paper|feuille de soya)\b/i.test(text)) return "Soy Paper"
    if (/\b(rice paper|feuille de riz)\b/i.test(text)) return "Rice Paper"

    if (/\b(concombre|cucumber)\b/i.test(text) && /\b(wrapped|enveloppe|roule|rolled)\b/i.test(text)) {
        return "Concombre"
    }

    if (/\b(hosomaki|maki|futomaki)\b/i.test(text)) return "Nori"
    if (/\b(california)\b/i.test(text)) return "Rice outside"

    return undefined
}

function detectFromSynonyms(
    text: string,
    synonyms: Array<{ match: RegExp; value: string }>
): string[] {
    const found: string[] = []

    for (const item of synonyms) {
        if (item.match.test(text)) found.push(item.value)
    }

    return unique(found)
}

function cleanupDescription(text: string): string {
    return text
        .replace(/\b\d+\s*(unites|unites|unites\.|pi[eè]ces|pieces|mcx|morceaux)\b/gi, "")
        .replace(/\b(roule au|roule dans|rolled in|wrapped in|avec|with|served with)\b/gi, " ")
        .replace(/[().]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
}

export function extractKitchenDataFromDescription(product: {
    name?: string
    description?: { fr?: string; en?: string; es?: string }
    ingredients?: string[]
}): ParsedKitchenData {
    const rawText = [
        product.name,
        product.description?.fr,
        product.description?.en,
        product.description?.es,
        ...(product.ingredients || []),
    ]
        .filter(Boolean)
        .join(" ")

    const cleaned = cleanupDescription(rawText)
    const normalized = normalizeText(cleaned)

    const wrapper = detectWrapper(normalized)
    const fillings = detectFromSynonyms(normalized, INGREDIENT_SYNONYMS)
    const sauces = detectFromSynonyms(normalized, SAUCE_SYNONYMS)
    const toppings = detectFromSynonyms(normalized, TOPPING_SYNONYMS)

    const ingredients = unique([...fillings, ...toppings, ...sauces])

    return {
        ingredients,
        wrapper,
        fillings,
        toppings,
        sauces,
        notes: cleaned || undefined,
    }
}