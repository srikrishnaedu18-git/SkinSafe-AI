// Do NOT change ordering once you start training.
// This is your fs-v2 contract (adds allergy features on top of fs-v1).

const FEATURE_SCHEMA_VERSION = "fs-v2";

const FEATURE_COLUMNS = [
  // (A) User features - one hot
  "u_skin_sensitive",
  "u_skin_oily",
  "u_skin_dry",
  "u_skin_normal",
  "u_skin_combination",

  // user condition flags
  "u_has_acne_prone",
  "u_has_eczema",

  // user preference flags
  "u_pref_fragrance_free",
  "u_pref_low_comedogenic",

  // (B) Ingredient counts
  "ing_count_total",
  "ing_count_fragrance",
  "ing_count_acids",
  "ing_count_drying_irritants",
  "ing_count_emollients",

  // (C) Severity aggregates
  "ing_irritant_severity_sum",
  "ing_comedogenic_severity_sum",

  // (D) Presence flags
  "ing_has_fragrance",
  "ing_has_salicylic_acid",
  "ing_has_alcohol_denat",
  "ing_has_shea_butter",

  // (E) Interaction features
  "x_sensitive__irritant_sum",
  "x_oily__comedogenic_sum",
  "x_acneprone__comedogenic_sum",
  "x_eczema__drying_count",
  "x_pref_ff__has_fragrance",

  // (F) Allergy features [fs-v2 additions]
  "u_allergy_fragrance",
  "u_allergy_parabens",
  "ing_has_parabens",
  "x_allergy_fragrance__has_fragrance",
  "x_allergy_parabens__has_parabens"
];

module.exports = {
  FEATURE_COLUMNS,
  FEATURE_SCHEMA_VERSION
};

