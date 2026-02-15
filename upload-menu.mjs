import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Papa from "papaparse";
import admin from "firebase-admin";

function s(v) {
    return String(v ?? "").trim();
}

function makeId(category, name) {
    const key = `${s(category).toLowerCase()}|${s(name).toLowerCase()}`;
    return crypto.createHash("sha1").update(key).digest("hex").slice(0, 20);
}

async function run() {
    console.log("🚀 Starting upload-menu...");

    // ✅ Put the exact filename you already have here:
    const serviceAccountPath = path.resolve(
        "./sushi-admin-firebase-adminsdk-fbsvc-dba831c51c.json"
    );

    const csvPath = path.resolve("./src/pages/admin/menu.csv");

    console.log("Service account:", serviceAccountPath);
    console.log("CSV:", csvPath);

    if (!fs.existsSync(serviceAccountPath)) {
        throw new Error(`Service account JSON not found: ${serviceAccountPath}`);
    }
    if (!fs.existsSync(csvPath)) {
        throw new Error(`CSV not found: ${csvPath}`);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }

    const db = admin.firestore();

    const csv = fs.readFileSync(csvPath, "utf8");
    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });

    if (parsed.errors?.length) {
        console.error("CSV parse errors:", parsed.errors);
        throw new Error("CSV parsing failed.");
    }

    const rows = parsed.data || [];
    console.log(`✅ Parsed rows: ${rows.length}`);

    const items = rows
        .map((r) => ({
            category: s(r.category),
            name: s(r.name),
            fr: s(r.fr),
            en: s(r.en),
            es: s(r.es),
        }))
        .filter((x) => x.category && x.name);

    console.log(`✅ Valid items: ${items.length}`);
    if (!items.length) {
        throw new Error("No valid items. Check headers: category,name,fr,en,es");
    }

    const chunkSize = 400;
    let committed = 0;

    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const batch = db.batch();

        for (const it of chunk) {
            const id = makeId(it.category, it.name);
            const ref = db.collection("products").doc(id);

            const doc = {
                category: it.category,
                name: it.name,
                description: { fr: it.fr, en: it.en, es: it.es },

                // defaults
                isActive: true,
                productType: "ingredientBased",
                ingredients: [],
                tags: [],
                costPrice: 0,
                preparationTime: 0,
                portionSize: "",
                directCostPrice: "",
                profitMargin: null,
                sellingPrice: null,

                updatedAt: new Date().toISOString(),
            };

            batch.set(ref, doc, { merge: true });
        }

        await batch.commit();
        committed += chunk.length;
        console.log(`🧾 Committed ${committed}/${items.length}`);
    }

    console.log("🎉 DONE! Uploaded to Firestore collection: /products");
}

run().catch((err) => {
    console.error("❌ Upload failed:", err);
    process.exit(1);
});
