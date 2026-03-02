import { ethers } from 'ethers';

const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
const CONTRACT_ABI = ['function get(string qr_id) external view returns (bytes32)'];

function readEnv(name) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

export function isBlockchainEnabled() {
  return readEnv('BLOCKCHAIN_ENABLED') === 'true';
}

function getClient() {
  const rpcUrl = readEnv('RPC_URL');
  const contractAddress = readEnv('CONTRACT_ADDRESS');

  if (!rpcUrl || !contractAddress) {
    throw new Error('Missing blockchain config: RPC_URL and CONTRACT_ADDRESS are required');
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);
  return { contract };
}

export async function readChainHash(qrId) {
  const { contract } = getClient();
  const hash = await contract.get(qrId);
  return String(hash).toLowerCase();
}

export function isZeroHash(hash) {
  return hash.toLowerCase() === ZERO_HASH;
}

