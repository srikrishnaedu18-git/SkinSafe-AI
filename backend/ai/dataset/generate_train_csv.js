const fs = require("fs");
const path = require("path");
const { buildFeatures } = require("../feature_builder");
const { FEATURE_COLUMNS } = require("../feature_schema");
const { generateUserProfile } = require("./user_profile_generator");
const { labelIrritation, labelAcne } = require("./labeler");

function csvEscape(v) {
  const s = String(v ?? "");
  // If contains comma/quote/newline, wrap with quotes and escape quotes
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCSVRow(values) {
  return values.map(csvEscape).join(",");
}

function main() {
  const productsPath = path.join(__dirname, "..", "..", "data", "products.json");
  const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));

  // Tune this number for dataset size:
  // 200 users x 30 products = 6000 rows (good for v1)
  const NUM_USERS = Number(process.env.AI_DATASET_NUM_USERS || 200);

  const header = [
    // identifiers (optional but useful)
    "qr_id",
    "product_type",
    "skin_type",

    // features
    ...FEATURE_COLUMNS,

    // labels
    "p_irritation_label",
    "y_irritation",
    "p_acne_label",
    "y_acne"
  ];

  const rows = [];
  rows.push(toCSVRow(header));

  for (let i = 0; i < NUM_USERS; i++) {
    const user = generateUserProfile();

    for (const p of products) {
      const out = buildFeatures(user, p.ingredients);
      const feats = out.features;

      const irr = labelIrritation(feats);
      const acne = labelAcne(feats);

      const row = [
        p.qr_id,
        p.type,
        user.skin_type,

        ...FEATURE_COLUMNS.map((c) => feats[c]),

        irr.p_irritation_label,
        irr.y_irritation,
        acne.p_acne_label,
        acne.y_acne
      ];

      rows.push(toCSVRow(row));
    }
  }

  const outPath = path.join(__dirname, "train.csv");
  fs.writeFileSync(outPath, rows.join("\n"), "utf8");

  console.log(`Wrote dataset: ${outPath}`);
  console.log(`Rows (including header): ${rows.length}`);
  console.log(`Samples: ${(rows.length - 1)}`);
}

main();

