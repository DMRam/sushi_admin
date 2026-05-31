import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import admin from "firebase-admin";

const SERVICE_ACCOUNT_PATH = path.resolve(
  "./sushi-admin-firebase-adminsdk-fbsvc-dba831c51c.json"
);

const JUICES = [
  {
    name: "Mango Passion",
    description: {
      en: "Mango, passion fruit, lime, and a light cane-sugar finish.",
      fr: "Mangue, fruit de la passion, lime et une touche legere de sucre de canne.",
      es: "Mango, maracuya, lima y un toque suave de azucar de cana.",
    },
  },
  {
    name: "Pineapple Mint Lime",
    description: {
      en: "Fresh pineapple with mint and lime for a bright, crisp juice.",
      fr: "Ananas frais avec menthe et lime pour un jus vif et rafraichissant.",
      es: "Pina fresca con menta y lima para un jugo brillante y refrescante.",
    },
  },
  {
    name: "Strawberry Watermelon",
    description: {
      en: "Strawberry and watermelon blended cold with a clean citrus lift.",
      fr: "Fraise et melon d'eau melanges a froid avec une touche d'agrumes.",
      es: "Fresa y sandia licuadas en frio con un toque limpio de citricos.",
    },
  },
  {
    name: "Orange Carrot Ginger",
    description: {
      en: "Orange, carrot, and ginger for a smooth, naturally sweet boost.",
      fr: "Orange, carotte et gingembre pour un jus doux et naturellement sucre.",
      es: "Naranja, zanahoria y jengibre para un jugo suave y naturalmente dulce.",
    },
  },
  {
    name: "Green Apple Cucumber",
    description: {
      en: "Green apple, cucumber, spinach, and lime, served clean and chilled.",
      fr: "Pomme verte, concombre, epinards et lime, servi frais et leger.",
      es: "Manzana verde, pepino, espinaca y lima, servido fresco y ligero.",
    },
  },
  {
    name: "Tropical Guava",
    description: {
      en: "Guava, pineapple, and orange with a tropical, smooth finish.",
      fr: "Goyave, ananas et orange avec une finale tropicale et douce.",
      es: "Guayaba, pina y naranja con un final tropical y suave.",
    },
  },
];

function makeId(name) {
  return crypto
    .createHash("sha1")
    .update(`natural-juice|${name.toLowerCase()}`)
    .digest("hex")
    .slice(0, 20);
}

async function run() {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    throw new Error(`Service account JSON not found: ${SERVICE_ACCOUNT_PATH}`);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const db = admin.firestore();
  const batch = db.batch();
  const now = new Date().toISOString();

  for (const [index, juice] of JUICES.entries()) {
    const ref = db.collection("products").doc(makeId(juice.name));

    batch.set(
      ref,
      {
        name: juice.name,
        category: "Jus naturels",
        description: juice.description,
        isActive: true,
        featured: index < 2,
        productType: "directCost",
        ingredients: [],
        allergens: [],
        tags: ["juice", "natural", "drink", "vegan", "gluten-free"],
        costPrice: 0,
        directCostPrice: "",
        profitMargin: null,
        sellingPrice: 6.5,
        preparationTime: 5,
        portionSize: "16 oz",
        quantity: 0,
        imageUrls: [],
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );
  }

  await batch.commit();

  console.log(`Seeded ${JUICES.length} natural juice products.`);
}

run().catch((err) => {
  console.error("Natural juice seed failed:", err);
  process.exit(1);
});
