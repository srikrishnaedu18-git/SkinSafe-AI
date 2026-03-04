const fs = require("fs");
const path = require("path");
const { FEATURE_COLUMNS, FEATURE_SCHEMA_VERSION } = require("./feature_schema");

const KB_PATH = path.join(__dirname, "kb", "ingredient_kb_v1.json");
const ING_KB = JSON.parse(fs.readFileSync(KB_PATH, "utf8"));

function normalizeText(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// Converts comma-separated string or array into normalized array
function normalizeList(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map(normalizeText).filter(Boolean);
  }
  return String(input).split(",").map(normalizeText).filter(Boolean);
}

function initFeatureDict() {
  const d = {};
  for (const col of FEATURE_COLUMNS) d[col] = 0;
  return d;
}

function oneHotSkinType(features, skinTypeRaw) {
  const skin = normalizeText(skinTypeRaw);
  features.u_skin_sensitive = skin === "sensitive" ? 1 : 0;
  features.u_skin_oily = skin === "oily" ? 1 : 0;
  features.u_skin_dry = skin === "dry" ? 1 : 0;
  features.u_skin_normal = skin === "normal" ? 1 : 0;
  features.u_skin_combination = skin === "combination" ? 1 : 0;
}

function buildFeatures(userProfile, ingredients) {
  const f = initFeatureDict();

  // --- Normalize user fields ---
  const skin_type = normalizeText(userProfile?.skin_type);
  const conditions = normalizeList(userProfile?.conditions);
  const preferences = normalizeList(userProfile?.preferences);

  // --- User features ---
  oneHotSkinType(f, skin_type);

  // Conditions (normalize common variants)
  const condSet = new Set(
    conditions.map((c) => {
      if (c === "acne prone") return "acne-prone";
      if (c === "acneprone") return "acne-prone";
      return c;
    })
  );
  f.u_has_acne_prone = condSet.has("acne-prone") ? 1 : 0;
  f.u_has_eczema = condSet.has("eczema") ? 1 : 0;

  // Preferences
  const prefSet = new Set(
    preferences.map((p) => {
      if (p === "fragrance free") return "fragrance-free";
      if (p === "low comedogenic") return "low-comedogenic";
      return p;
    })
  );
  f.u_pref_fragrance_free = prefSet.has("fragrance-free") ? 1 : 0;
  f.u_pref_low_comedogenic = prefSet.has("low-comedogenic") ? 1 : 0;

  // --- Ingredient aggregation ---
  const ingList = Array.isArray(ingredients) ? ingredients : [];
  f.ing_count_total = ingList.length;

  let irritSum = 0;
  let comedSum = 0;

  for (const rawIng of ingList) {
    const ing = normalizeText(rawIng);
    const meta = ING_KB[ing] || { tags: [], irritant_severity: 0, comedogenic_severity: 0 };
    const tags = meta.tags || [];

    // severity sums
    irritSum += Number(meta.irritant_severity || 0);
    comedSum += Number(meta.comedogenic_severity || 0);

    // counts by tags
    if (tags.includes("fragrance")) f.ing_count_fragrance += 1;
    if (tags.includes("acid")) f.ing_count_acids += 1;
    if (tags.includes("drying") || ing === "alcohol denat") f.ing_count_drying_irritants += 1;
    if (tags.includes("emollient")) f.ing_count_emollients += 1;

    // presence flags (specific)
    if (ing === "fragrance") f.ing_has_fragrance = 1;
    if (ing === "salicylic acid") f.ing_has_salicylic_acid = 1;
    if (ing === "alcohol denat") f.ing_has_alcohol_denat = 1;
    if (ing === "shea butter") f.ing_has_shea_butter = 1;
  }

  f.ing_irritant_severity_sum = irritSum;
  f.ing_comedogenic_severity_sum = comedSum;

  // --- Interaction features ---
  f.x_sensitive__irritant_sum = f.u_skin_sensitive * f.ing_irritant_severity_sum;
  f.x_oily__comedogenic_sum = f.u_skin_oily * f.ing_comedogenic_severity_sum;
  f.x_acneprone__comedogenic_sum = f.u_has_acne_prone * f.ing_comedogenic_severity_sum;
  f.x_eczema__drying_count = f.u_has_eczema * f.ing_count_drying_irritants;
  f.x_pref_ff__has_fragrance = f.u_pref_fragrance_free * f.ing_has_fragrance;

  // NOTE: allergies list is not used in A1 features yet (we can add in A2/A3).
  // For now AI layer is "soft risk". Hard allergy matching stays in rules layer later.

  // Create ordered vector
  const vector = FEATURE_COLUMNS.map((col) => f[col]);

  return {
    feature_schema_version: FEATURE_SCHEMA_VERSION,
    features: f,
    vector,
    columns: FEATURE_COLUMNS
  };
}

module.exports = {
  buildFeatures,
  normalizeText,
  normalizeList
};

