import { suggestAlternatives } from '../engine/alternatives.js';
import { catalogProducts } from '../engine/catalog.js';
import { runCompatibilityEngine } from '../engine/engine.js';
import { parseRequestBody } from '../validate.js';
async function readJson(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks).toString('utf-8');
    if (!raw)
        return {};
    try {
        return JSON.parse(raw);
    }
    catch {
        throw new Error('Invalid JSON body');
    }
}
function sendJson(res, statusCode, payload) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
}
export async function handleCompatibilityCheck(req, res) {
    try {
        const body = await readJson(req);
        const { userProfile, product } = parseRequestBody(body);
        const result = runCompatibilityEngine({ userProfile, product });
        result.alternatives = suggestAlternatives(userProfile, product, catalogProducts);
        sendJson(res, 200, result);
    }
    catch (error) {
        sendJson(res, 400, {
            error: error instanceof Error ? error.message : 'Request processing failed',
        });
    }
}
