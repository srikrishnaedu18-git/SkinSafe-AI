import crypto from 'node:crypto';

function sortDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortDeep);
  }
  if (value && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortDeep(value[key]);
    }
    return sorted;
  }
  return value;
}

export function canonicalizeRecord(record) {
  return JSON.stringify(sortDeep(record));
}

export function sha256Hex(input) {
  return `0x${crypto.createHash('sha256').update(input).digest('hex')}`;
}

