import 'dotenv/config';
import { ethers } from 'ethers';
import { canonicalizeRecord, sha256Hex } from '../src/blockchain/hashing.js';
import { getRawLedgerRecordByQr } from '../src/data/product-records.js';

const CONTRACT_ABI = ['function bulkStore(string[] qr_ids, bytes32[] hashes) external'];

function readEnv(name) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function readIntEnv(name, fallback) {
  const raw = readEnv(name);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pad3(value) {
  return String(value).padStart(3, '0');
}

function buildAnchors(totalCount) {
  const rows = [];
  for (let i = 1; i <= totalCount; i += 1) {
    const qrId = `PROD${pad3(i)}_BATCH01`;
    const record = getRawLedgerRecordByQr(qrId);
    if (!record) continue;

    rows.push({
      qrId,
      hash: sha256Hex(canonicalizeRecord(record)),
    });
  }
  return rows;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function main() {
  const rpcUrl = readEnv('RPC_URL');
  const contractAddress = readEnv('CONTRACT_ADDRESS');
  const privateKey = readEnv('PRIVATE_KEY');
  const totalCount = readIntEnv('ANCHOR_COUNT', 30);
  const chunkSize = Math.max(1, readIntEnv('ANCHOR_CHUNK_SIZE', 20));
  const dryRun = readEnv('ANCHOR_DRY_RUN') === 'true';

  if (!dryRun) {
    if (!rpcUrl) throw new Error('Missing RPC_URL');
    if (!contractAddress) throw new Error('Missing CONTRACT_ADDRESS');
    if (!privateKey) throw new Error('Missing PRIVATE_KEY');
  }

  const anchors = buildAnchors(totalCount);
  if (anchors.length === 0) {
    throw new Error('No anchors generated');
  }

  console.log(`Prepared ${anchors.length} anchors (count=${totalCount})`);
  console.log(`Chunk size: ${chunkSize}`);
  console.log(`Dry run: ${dryRun ? 'yes' : 'no'}`);

  if (dryRun) {
    console.table(anchors.slice(0, 10));
    if (anchors.length > 10) {
      console.log(`... ${anchors.length - 10} more rows`);
    }
    return;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet);
  const chunks = chunkArray(anchors, chunkSize);

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const qrIds = chunk.map((item) => item.qrId);
    const hashes = chunk.map((item) => item.hash);

    console.log(`Submitting chunk ${i + 1}/${chunks.length} (${chunk.length} items)...`);
    const tx = await contract.bulkStore(qrIds, hashes);
    console.log(`Tx hash: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Confirmed in block ${receipt.blockNumber}`);
  }

  console.log('Bulk anchor completed successfully');
}

main().catch((error) => {
  console.error('Bulk anchor failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
