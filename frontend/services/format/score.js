export function formatScore(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return '0';

  const fixed = numeric.toFixed(2);
  return fixed.endsWith('.00') ? String(Math.trunc(numeric)) : fixed;
}
