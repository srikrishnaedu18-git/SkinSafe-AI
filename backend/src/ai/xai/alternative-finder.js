import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.join(__dirname, '../../..');
const require = createRequire(import.meta.url);
const { buildFeatures } = require(path.join(backendDir, 'ai', 'feature_builder.js'));

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function getPythonExecutable() {
  if (process.env.PYTHON_EXECUTABLE?.trim()) return process.env.PYTHON_EXECUTABLE.trim();
  const venvPython = path.join(backendDir, 'ml', '.venv', 'bin', 'python');
  if (fs.existsSync(venvPython)) return venvPython;
  return 'python3';
}

function loadProducts() {
  const filePath = path.join(backendDir, 'data', 'products.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function callPythonPredict(features) {
  const predictPath = path.join(backendDir, 'ml', 'predict_explain_ensemble.py');
  const pyExec = getPythonExecutable();

  const payload = {
    feature_schema_version: 'fs-v1',
    features,
    top_k: 0,
  };

  const proc = spawnSync(pyExec, [predictPath], {
    input: JSON.stringify(payload),
    encoding: 'utf-8',
    timeout: 30000,
    maxBuffer: 1024 * 1024,
  });

  if (proc.error) {
    throw new Error(`Predict failed: ${proc.error.message}`);
  }
  if (proc.status !== 0) {
    throw new Error(`Predict failed: ${proc.stderr || proc.stdout || 'no stderr'}`);
  }

  return JSON.parse(proc.stdout);
}

function containsAnyAvoidIngredient(ingredients, avoidList) {
  const normalized = new Set((ingredients || []).map((value) => normalizeText(value)));
  for (const avoid of avoidList || []) {
    if (normalized.has(normalizeText(avoid))) return true;
  }
  return false;
}

export function findAlternatives({ user_profile, base_product, constraints }) {
  if (!constraints?.same_category) return [];

  const currentScore = Number(constraints?.current_suitability_score ?? 0);

  let candidates = loadProducts().filter((product) => !product.is_expired);
  candidates = candidates.filter((product) => product.type === constraints.same_category);
  candidates = candidates.filter((product) => !containsAnyAvoidIngredient(product.ingredients, constraints.avoid_ingredients));
  candidates = candidates.filter((product) => product.qr_id !== base_product.qr_id);

  const scored = [];

  for (const candidate of candidates) {
    const featOut = buildFeatures(user_profile, candidate.ingredients);
    const pred = callPythonPredict(featOut.features);

    const gain = Number(pred.suitability_score ?? 0) - currentScore;
    const reasons = [];
    if ((constraints?.avoid_ingredients || []).length > 0) {
      reasons.push(`avoids ${constraints.avoid_ingredients.join(', ')}`);
    }
    if ((constraints?.prefer_tags || []).length > 0) {
      reasons.push(`aligns with ${constraints.prefer_tags.join(', ')}`);
    }
    reasons.push(`predicted suitability ${pred.suitability_score}/100`);

    scored.push({
      qr_id: candidate.qr_id,
      product_name: candidate.product_name,
      type: candidate.type,
      origin: candidate.origin,
      ingredients: candidate.ingredients,
      suitability_score: pred.suitability_score,
      p_irritation: pred.p_irritation,
      p_acne: pred.p_acne,
      confidence: pred.confidence,
      score_gain_vs_current: gain,
      why_better: reasons.join('; '),
    });
  }

  scored.sort((a, b) => {
    if (b.suitability_score !== a.suitability_score) {
      return b.suitability_score - a.suitability_score;
    }
    return (b.confidence || 0) - (a.confidence || 0);
  });

  return scored.slice(0, constraints.max_results || 3);
}
