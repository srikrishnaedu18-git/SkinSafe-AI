// Label rules: simple + consistent
// irritation risk driven by irritant severity + sensitive skin + drying irritants
// acne risk driven by comedogenic severity + oily/acne-prone
// [fs-v2] allergy-match interactions add strong irritation boost

function clamp01(x) {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function labelIrritation(features) {
  // Base risk from irritant severity
  let risk = 0.10 + 0.08 * features.ing_irritant_severity_sum;

  // Make sensitive skin amplify
  if (features.u_skin_sensitive === 1) risk += 0.20;

  // Drying irritants (Alcohol Denat etc.)
  risk += 0.10 * features.ing_count_drying_irritants;

  // Acid presence adds small risk
  risk += 0.08 * features.ing_count_acids;

  // [fs-v2] Allergy match: direct allergen exposure is a strong irritation signal
  if (features.x_allergy_fragrance__has_fragrance === 1) risk += 0.30;
  if (features.x_allergy_parabens__has_parabens === 1) risk += 0.25;

  // Convert to probability-like score
  const p = clamp01(risk);

  // Binary label threshold
  const y = p >= 0.55 ? 1 : 0;

  return { p_irritation_label: p, y_irritation: y };
}

function labelAcne(features) {
  let risk = 0.10 + 0.10 * features.ing_comedogenic_severity_sum;

  if (features.u_skin_oily === 1) risk += 0.18;
  if (features.u_has_acne_prone === 1) risk += 0.22;

  // Some acids can help acne; small reduction
  if (features.ing_count_acids > 0) risk -= 0.05;

  const p = clamp01(risk);
  const y = p >= 0.55 ? 1 : 0;

  return { p_acne_label: p, y_acne: y };
}

module.exports = { labelIrritation, labelAcne };

