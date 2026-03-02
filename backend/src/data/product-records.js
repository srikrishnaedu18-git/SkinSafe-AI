import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const blockchainItemsPath = path.join(__dirname, '../../data/blockchain-items.json');
const blockchainItems = JSON.parse(readFileSync(blockchainItemsPath, 'utf8'));

export function parseQrIndex(qrId) {
  const match = qrId.toUpperCase().match(/PROD(\d{3})_BATCH(\d{2})/);
  if (!match) return null;
  const productIndex = Number(match[1]);
  return Number.isFinite(productIndex) ? productIndex : null;
}

export function extractQrToken(qrId) {
  const match = qrId.toUpperCase().match(/PROD\d{3}_BATCH\d{2}/);
  return match ? match[0] : null;
}

export function resolveByQr(qrId) {
  const qrToken = extractQrToken(qrId);
  if (!qrToken) return null;
  const raw = blockchainItems.find((item) => item.qr_id === qrToken);
  if (!raw) return null;

  return {
    productId: qrToken,
    qrId: qrToken,
    brand: raw.product_name.split(' ')[0],
    name: raw.product_name,
    category: raw.type,
    recordUri: `record://backend/${qrToken}`,
    inciList: raw.ingredients,
    batchNumber: raw.batch_number,
    origin: raw.origin,
    manufacturedDate: raw.manufactured_date,
    expiryDate: raw.expiry_date,
    isExpired: raw.is_expired,
  };
}

export function getRawLedgerRecordByQr(qrId) {
  const qrToken = extractQrToken(qrId);
  if (!qrToken) return null;
  return blockchainItems.find((item) => item.qr_id === qrToken) ?? null;
}
