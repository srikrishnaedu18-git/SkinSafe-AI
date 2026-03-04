import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { validateAiRequest, validateAiResponse } from '../ai/contracts.js';
import { normalizeProduct, normalizeProfile } from '../ai/normalizer.js';
import { buildXaiSkeleton } from '../ai/xai/xai-builder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.join(__dirname, '../..');
const predictPath = path.join(backendDir, 'ml', 'predict_ensemble.py');
const modelDir = path.join(backendDir, 'ml', 'models');
const modelArtifacts = ['irritation_ensemble.joblib', 'acne_ensemble.joblib', 'feature_columns.json', 'model_meta.json'];
const require = createRequire(import.meta.url);
const { buildFeatures } = require(path.join(backendDir, 'ai', 'feature_builder.js'));

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON body');
  }
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function getPythonExecutable() {
  if (process.env.PYTHON_EXECUTABLE?.trim()) {
    return process.env.PYTHON_EXECUTABLE.trim();
  }
  return 'python3';
}

function checkPython(pyExec) {
  const proc = spawnSync(pyExec, ['--version'], { encoding: 'utf8' });
  if (proc.status === 0) {
    return {
      ok: true,
      version: (proc.stdout || proc.stderr || '').trim(),
    };
  }

  return {
    ok: false,
    error: (proc.stderr || proc.stdout || '').trim() || 'Unable to execute python',
  };
}

function checkModelArtifacts() {
  const files = {};
  let allPresent = true;

  for (const name of modelArtifacts) {
    const fullPath = path.join(modelDir, name);
    const present = existsSync(fullPath);
    files[name] = present;
    if (!present) allPresent = false;
  }

  return { allPresent, files };
}

function runPythonPredict(payload) {
  return new Promise((resolve, reject) => {
    const pyExec = getPythonExecutable();
    const py = spawn(pyExec, [predictPath], {
      cwd: backendDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      py.kill('SIGKILL');
      reject(new Error('Python predictor timeout'));
    }, 15000);

    py.stdout.on('data', (d) => {
      stdout += d.toString();
    });

    py.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    py.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    py.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Python predictor failed (code ${code}): ${stderr || stdout || 'no output'}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        if (parsed?.error) {
          reject(new Error(`Python predictor error: ${parsed.error}`));
          return;
        }
        resolve(parsed);
      } catch {
        reject(new Error(`Invalid JSON from predictor: ${stdout || stderr || 'no output'}`));
      }
    });

    py.stdin.write(JSON.stringify(payload));
    py.stdin.end();
  });
}

export async function handleAiPredict(req, res) {
  try {
    const body = await readJson(req);

    const normalizedRequest = {
      user_profile: normalizeProfile(body.user_profile),
      product: normalizeProduct(body.product),
    };

    validateAiRequest(normalizedRequest);
    const featOut = buildFeatures(normalizedRequest.user_profile, normalizedRequest.product.ingredients);
    const output = await runPythonPredict({
      feature_schema_version: featOut.feature_schema_version,
      features: featOut.features,
    });
    validateAiResponse(output);

    const ai = {
      p_irritation: output.p_irritation,
      p_acne: output.p_acne,
      suitability_score: output.suitability_score,
      confidence: output.confidence,
      uncertainty: output.uncertainty ?? null,
      model_version: output.model_version,
      feature_schema_version: output.feature_schema_version,
      ensemble_size: output.ensemble_size ?? null,
    };

    const xai = buildXaiSkeleton({
      ai,
      product: normalizedRequest.product,
      user_profile: normalizedRequest.user_profile,
    });

    sendJson(res, 200, {
      product_id: normalizedRequest.product.qr_id,
      product_type: normalizedRequest.product.type,
      ai,
      xai,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI prediction failed';
    const isClientError =
      message.includes('Invalid payload') ||
      message.includes('Invalid user_profile') ||
      message.includes('Invalid product') ||
      message.includes('Invalid skin_type') ||
      message.includes('Invalid JSON body');

    sendJson(res, isClientError ? 400 : 500, { error: message });
  }
}

export async function handleAiHealth(_req, res) {
  const pyExec = getPythonExecutable();
  const python = checkPython(pyExec);
  const predictorScriptExists = existsSync(predictPath);
  const models = checkModelArtifacts();

  const ok = python.ok && predictorScriptExists && models.allPresent;
  sendJson(res, ok ? 200 : 503, {
    ok,
    python_executable: pyExec,
    python,
    predictor_script: {
      path: predictPath,
      exists: predictorScriptExists,
    },
    model_dir: modelDir,
    models,
  });
}
