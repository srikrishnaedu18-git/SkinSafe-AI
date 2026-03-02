import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const kbPath = path.join(__dirname, 'knowledge-base.json');

export const kb = JSON.parse(readFileSync(kbPath, 'utf8'));
