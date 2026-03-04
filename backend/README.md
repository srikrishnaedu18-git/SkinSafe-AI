# Compatibility Service (AI + XAI Prototype)

Node.js backend module for personalized cosmetic compatibility.

## Endpoint

- `POST /compatibility/check`
- `POST /profile` (normalizes profile fields for AI contract)
- `POST /ai/predict` (A0 AI contract endpoint)

Input:

```json
{
  "userProfile": { "skinType": "sensitive", "allergies": ["fragrance"] },
  "product": {
    "productId": "P001",
    "name": "Glow Cleanser",
    "category": "Cleanser",
    "ingredients": ["Water", "Parfum", "Niacinamide"]
  }
}
```

Output includes:

- `suitabilityScore` (0-100)
- `confidence` (0-1 + reason)
- `riskFlags`
- `explanations` (rules + ingredient contributions + summary)
- `guidance`
- `alternatives`

## A0 AI Contract

`POST /ai/predict` expects:

```json
{
  "user_profile": {
    "user_id": "U123",
    "skin_type": "sensitive",
    "allergies": ["fragrance", "parabens"],
    "conditions": ["acne-prone", "eczema"],
    "preferences": ["fragrance-free", "low-comedogenic"]
  },
  "product": {
    "qr_id": "PROD004_BATCH01",
    "type": "Serum",
    "ingredients": ["Alcohol Denat", "Panthenol", "Fragrance", "Vitamin C"]
  }
}
```

Response:

```json
{
  "p_irritation": 0.0,
  "p_acne": null,
  "suitability_score": 0,
  "confidence": 0.0,
  "model_version": "ai-v1",
  "feature_schema_version": "fs-v1"
}
```

`POST /profile` also normalizes comma-separated inputs and stores profiles in MongoDB when configured.

## A1 Feature Builder

Implemented under `backend/ai`:

- `ai/kb/ingredient_kb_v1.json`
- `ai/feature_schema.js`
- `ai/feature_builder.js`
- `ai/test_feature_builder.js`

Run A1 check:

```bash
cd backend
npm run ai:test:features
```

This prints:

- `feature_schema: fs-v1`
- ordered `columns`
- `vector length` (25)

## A2 Dataset Generation

Create synthetic training data (`train.csv`) from:

- `data/products.json`
- A1 feature builder
- silver-label logic (`y_irritation`, `y_acne`)

Run:

```bash
cd backend
npm run ai:dataset:generate
```

Output:

- `ai/dataset/train.csv`
- default sample count: `6000` (`200 users x 30 products`)

## Run

From backend directory:

```bash
cd backend
npm start
```

## Blockchain Verify Config

`POST /product/verify` uses blockchain checks when enabled.

Environment variables:

```bash
BLOCKCHAIN_ENABLED=false
RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0xYourContractAddress
ISSUER_ID=issuer.blockchain
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=bc_patent_project
```

Behavior:

- `BLOCKCHAIN_ENABLED=false` -> returns `verified: false` with status `blockchain_disabled`
- `BLOCKCHAIN_ENABLED=true` and hash match -> `verified: true`
- `BLOCKCHAIN_ENABLED=true` and mismatch/missing/error -> `verified: false` with detailed status

## Bulk Anchor Script

Write many QR record hashes on-chain in one command.

Dry run (recommended first):

```bash
cd backend
npm run anchor:bulk:dry
```

Execute bulk write:

```bash
cd backend
npm run anchor:bulk
```

Required env for real write:

- `RPC_URL`
- `CONTRACT_ADDRESS`
- `PRIVATE_KEY`

Optional env:

- `ANCHOR_COUNT` (default `30`)
- `ANCHOR_CHUNK_SIZE` (default `20`)

Health check:

```bash
curl http://localhost:8080/health
```

Compatibility check:

```bash
curl -X POST http://localhost:8080/compatibility/check \
  -H "Content-Type: application/json" \
  -d @data/sample-request.json
```

## Tests

```bash
cd backend
npm test
```

## Engine Structure

- `src/engine/normalize.js` ingredient normalization + synonym mapping
- `src/engine/kb.js` knowledge base loader
- `src/engine/rules.js` deterministic rules (allergy/irritant/comedogenic/conflict/pregnancy)
- `src/engine/features.js` feature builder
- `src/engine/model.js` transparent weighted scoring + confidence
- `src/engine/explainability.js` rule trace + top drivers + contribution bundle
- `src/engine/guidance.js` patch test + usage + avoid-if
- `src/engine/alternatives.js` same-category lower-risk suggestions
- `src/engine/engine.js` orchestrator
