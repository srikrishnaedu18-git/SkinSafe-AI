const { buildFeatures } = require("./feature_builder");

// Example user profile (simulate your UI input)
const userProfile = {
  skin_type: "sensitive",
  allergies: "fragrance, parabens",
  conditions: "acne-prone, eczema",
  preferences: "fragrance-free, low-comedogenic"
};

// Example product from your dataset
const product = {
  qr_id: "PROD004_BATCH01",
  type: "Serum",
  ingredients: ["Alcohol Denat", "Panthenol", "Fragrance", "Vitamin C"]
};

const out = buildFeatures(userProfile, product.ingredients);

console.log("Feature schema:", out.feature_schema_version);
console.log("Columns:", out.columns);
console.log("Vector length:", out.vector.length);
console.log("Vector:", out.vector);
console.log("Features:", out.features);

