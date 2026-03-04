const { buildFeatures } = require("./feature_builder");
const { existsSync } = require("fs");
const { spawnSync } = require("child_process");
const path = require("path");

function getPythonExecutable() {
  const fromEnv = process.env.PYTHON_EXECUTABLE;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();

  const venvPython = path.join(__dirname, "..", "ml", ".venv", "bin", "python");
  if (existsSync(venvPython)) return venvPython;

  return "python3";
}

function callPythonPredict(features) {
  const predictPath = path.join(__dirname, "..", "ml", "predict_ensemble.py");
  const pyExec = getPythonExecutable();

  const payload = {
    feature_schema_version: "fs-v1",
    features,
  };

  const r = spawnSync(pyExec, [predictPath], {
    input: JSON.stringify(payload),
    encoding: "utf-8",
    timeout: 15000,
    killSignal: "SIGKILL",
    maxBuffer: 1024 * 1024,
  });

  if (r.error && r.status !== 0) {
    throw new Error(`Predict failed: ${r.error.message}`);
  }

  if (r.signal) {
    throw new Error(`Predict killed by signal: ${r.signal}`);
  }

  if (r.status !== 0) {
    console.error("Python error:", r.stderr || r.stdout);
    throw new Error(`Predict failed (code=${r.status})`);
  }
  return JSON.parse(r.stdout);
}

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
}

function combinedRisk(out) {
  return 0.7 * out.p_irritation + 0.3 * out.p_acne;
}

function run() {
  console.log("Running A7 sanity tests (relative behavior checks)...\n");

  const sensitiveFragrance = callPythonPredict(
    buildFeatures(
      { skin_type: "sensitive", allergies: [], conditions: [], preferences: [] },
      ["Fragrance", "Panthenol"]
    ).features
  );
  const normalFragrance = callPythonPredict(
    buildFeatures(
      { skin_type: "normal", allergies: [], conditions: [], preferences: [] },
      ["Fragrance", "Panthenol"]
    ).features
  );
  console.log("Sensitive+Fragrance:", sensitiveFragrance);
  console.log("Normal+Fragrance:", normalFragrance);
  assert(
    sensitiveFragrance.p_irritation > normalFragrance.p_irritation,
    "Sensitive+Fragrance should be more irritating than Normal+Fragrance"
  );

  const eczemaAlcohol = callPythonPredict(
    buildFeatures(
      { skin_type: "dry", allergies: [], conditions: ["eczema"], preferences: [] },
      ["Alcohol Denat", "Glycerin"]
    ).features
  );
  const eczemaSoothing = callPythonPredict(
    buildFeatures(
      { skin_type: "dry", allergies: [], conditions: ["eczema"], preferences: [] },
      ["Panthenol", "Glycerin"]
    ).features
  );
  console.log("Eczema+Alcohol:", eczemaAlcohol);
  console.log("Eczema+Soothing:", eczemaSoothing);
  assert(
    eczemaAlcohol.p_irritation > eczemaSoothing.p_irritation,
    "Eczema+Alcohol should be more irritating than Eczema+Soothing"
  );

  const oilyShea = callPythonPredict(
    buildFeatures(
      { skin_type: "oily", allergies: [], conditions: [], preferences: [] },
      ["Shea Butter", "Ceramides"]
    ).features
  );
  const oilyNonComedo = callPythonPredict(
    buildFeatures(
      { skin_type: "oily", allergies: [], conditions: [], preferences: [] },
      ["Ceramides", "Glycerin"]
    ).features
  );
  console.log("Oily+Shea:", oilyShea);
  console.log("Oily+NonComedogenic:", oilyNonComedo);
  assert(
    oilyShea.p_acne > oilyNonComedo.p_acne,
    "Oily+Shea should have higher acne probability than Oily+NonComedogenic"
  );

  const acneProneShea = callPythonPredict(
    buildFeatures(
      { skin_type: "normal", allergies: [], conditions: ["acne-prone"], preferences: [] },
      ["Shea Butter", "Glycerin"]
    ).features
  );
  const acneProneNoShea = callPythonPredict(
    buildFeatures(
      { skin_type: "normal", allergies: [], conditions: ["acne-prone"], preferences: [] },
      ["Panthenol", "Glycerin"]
    ).features
  );
  console.log("AcneProne+Shea:", acneProneShea);
  console.log("AcneProne+NoShea:", acneProneNoShea);
  assert(
    acneProneShea.p_acne > acneProneNoShea.p_acne,
    "AcneProne+Shea should have higher acne probability than AcneProne+NoShea"
  );

  const ffWithFragrance = callPythonPredict(
    buildFeatures(
      { skin_type: "normal", allergies: [], conditions: [], preferences: ["fragrance-free"] },
      ["Fragrance", "Glycerin"]
    ).features
  );
  const ffNoFragrance = callPythonPredict(
    buildFeatures(
      { skin_type: "normal", allergies: [], conditions: [], preferences: ["fragrance-free"] },
      ["Panthenol", "Glycerin"]
    ).features
  );
  console.log("FF+Fragrance:", ffWithFragrance);
  console.log("FF+NoFragrance:", ffNoFragrance);
  console.log("FF risk (with fragrance):", combinedRisk(ffWithFragrance));
  console.log("FF risk (no fragrance):", combinedRisk(ffNoFragrance));
  assert(
    combinedRisk(ffWithFragrance) > combinedRisk(ffNoFragrance),
    "Fragrance-free preference should increase risk when fragrance is present"
  );

  console.log("\nAll sanity tests passed");
}

run();
