const assert = (cond, msg) => {
  if (!cond) throw new Error(`FAIL: ${msg}`);
};

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('Response:', data);
    throw new Error(`Request failed: ${res.status}`);
  }
  return data;
}

function hasFlag(resp, code) {
  return resp?.xai?.risk_flags?.some((flag) => flag.code === code);
}

function reasonMentions(resp, needle) {
  const n = String(needle).toLowerCase();
  return (resp?.xai?.reasons || []).some((reason) => {
    const item = String(reason?.item || '').toLowerCase();
    const title = String(reason?.title || '').toLowerCase();
    const why = String(reason?.why || '').toLowerCase();
    return item.includes(n) || title.includes(n) || why.includes(n);
  });
}

function precautionHas(resp, code) {
  return resp?.xai?.precautions?.some((precaution) => precaution.code === code);
}

function alternativesRespectAvoid(resp) {
  const avoid = resp?.xai?.alternatives?.constraints?.avoid_ingredients || [];
  const avoidNorm = avoid.map((value) => String(value).toLowerCase().trim());

  const results = resp?.xai?.alternatives?.results || [];
  for (const result of results) {
    const ingredients = (result.ingredients || []).map((value) => String(value).toLowerCase().trim());
    for (const restricted of avoidNorm) {
      if (ingredients.includes(restricted)) return false;
    }
  }
  return true;
}

async function run() {
  const port = Number(process.env.PORT || 8080);
  const URL = process.env.AI_PREDICT_URL || `http://localhost:${port}/ai/predict`;

  const tests = [
    {
      name: 'Fragrance preference violated => flags + reason + precaution + alternatives avoid fragrance',
      body: {
        user_profile: {
          skin_type: 'sensitive',
          allergies: [],
          conditions: [],
          preferences: ['fragrance-free'],
        },
        product: {
          qr_id: 'PROD004_BATCH01',
          type: 'Serum',
          ingredients: ['Alcohol Denat', 'Panthenol', 'Fragrance', 'Vitamin C'],
        },
      },
      check: (resp) => {
        assert(hasFlag(resp, 'FRAGRANCE_PRESENT'), 'Expected FRAGRANCE_PRESENT flag');
        assert(hasFlag(resp, 'PREF_FRAGRANCE_FREE_VIOLATION'), 'Expected PREF_FRAGRANCE_FREE_VIOLATION flag');
        assert(reasonMentions(resp, 'fragrance'), 'Expected reasons to mention fragrance');
        assert(precautionHas(resp, 'FRAGRANCE_CAUTION'), 'Expected FRAGRANCE_CAUTION precaution');
        assert(alternativesRespectAvoid(resp), 'Expected alternatives to respect avoid_ingredients');
      },
    },
    {
      name: 'Eczema + Alcohol Denat => eczema + alcohol precautions',
      body: {
        user_profile: {
          skin_type: 'dry',
          allergies: [],
          conditions: ['eczema'],
          preferences: [],
        },
        product: {
          qr_id: 'PROD018_BATCH01',
          type: 'Face Wash',
          ingredients: ['Alcohol Denat', 'Niacinamide', 'Aloe Vera'],
        },
      },
      check: (resp) => {
        assert(hasFlag(resp, 'ALCOHOL_DENAT_PRESENT'), 'Expected ALCOHOL_DENAT_PRESENT flag');
        assert(precautionHas(resp, 'ALCOHOL_DRYNESS_CAUTION'), 'Expected ALCOHOL_DRYNESS_CAUTION precaution');
        assert(precautionHas(resp, 'ECZEMA_BARRIER_SUPPORT'), 'Expected ECZEMA_BARRIER_SUPPORT precaution');
      },
    },
    {
      name: 'Oily + Shea Butter => comedogenic risk + acne monitoring',
      body: {
        user_profile: {
          skin_type: 'oily',
          allergies: [],
          conditions: ['acne-prone'],
          preferences: ['low-comedogenic'],
        },
        product: {
          qr_id: 'PROD019_BATCH01',
          type: 'Moisturizer',
          ingredients: ['Shea Butter', 'Alcohol Denat', 'Zinc Oxide', 'Niacinamide'],
        },
      },
      check: (resp) => {
        assert(hasFlag(resp, 'SHEA_BUTTER_COMEDOGENIC_RISK'), 'Expected SHEA_BUTTER_COMEDOGENIC_RISK flag');
        assert(reasonMentions(resp, 'shea butter'), 'Expected reasons to mention shea butter');
        assert(precautionHas(resp, 'ACNE_MONITOR_7_DAYS'), 'Expected ACNE_MONITOR_7_DAYS precaution');
      },
    },
    {
      name: 'Soothing profile => lower risk and patch test exists',
      body: {
        user_profile: {
          skin_type: 'normal',
          allergies: [],
          conditions: [],
          preferences: [],
        },
        product: {
          qr_id: 'PROD002_BATCH01',
          type: 'Sunscreen',
          ingredients: ['Panthenol', 'Hyaluronic Acid', 'Ceramides', 'Aloe Vera', 'Niacinamide'],
        },
      },
      check: (resp) => {
        assert(
          resp?.xai?.summary?.risk_level === 'LOW' || resp?.xai?.summary?.risk_level === 'MEDIUM',
          'Expected LOW or MEDIUM risk level for soothing product'
        );
        assert(precautionHas(resp, 'PATCH_TEST_24H'), 'Expected PATCH_TEST_24H precaution');
      },
    },
  ];

  console.log('\nRunning X7 XAI tests...\n');
  console.log(`Target: ${URL}\n`);

  for (const test of tests) {
    const resp = await postJSON(URL, test.body);
    console.log(`OK ${test.name}`);
    console.log({
      risk_level: resp?.xai?.summary?.risk_level,
      flags: (resp?.xai?.risk_flags || []).map((flag) => flag.code),
      top_reason: resp?.xai?.reasons?.[0]?.title,
      alternatives: (resp?.xai?.alternatives?.results || []).map((result) => result.qr_id),
    });
    test.check(resp);
    console.log('');
  }

  console.log('All X7 tests passed!');
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
