function sample(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function maybe(p) {
  return Math.random() < p;
}

function generateUserProfile() {
  const skinTypes = ["sensitive", "normal", "oily", "dry", "combination"];

  const skin_type = sample(skinTypes);

  const conditions = [];
  if (maybe(0.35)) conditions.push("acne-prone");
  if (maybe(0.20)) conditions.push("eczema");

  // Preferences (some users care, some don't)
  const preferences = [];
  if (maybe(0.35)) preferences.push("fragrance-free");
  if (maybe(0.30)) preferences.push("low-comedogenic");

  // Allergies - for A2 we won't use it in labels much (keep minimal)
  const allergies = [];
  if (maybe(0.10)) allergies.push("fragrance");
  if (maybe(0.05)) allergies.push("parabens");

  return {
    skin_type,
    allergies,
    conditions,
    preferences
  };
}

module.exports = { generateUserProfile };
