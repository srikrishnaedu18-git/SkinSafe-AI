import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const catalogPath = path.join(__dirname, '../../data/sample-products.json');

export const catalogProducts = JSON.parse(readFileSync(catalogPath, 'utf8'));
