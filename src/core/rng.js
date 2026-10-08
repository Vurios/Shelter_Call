/** Seeded GAME randomness. No clock, browser state, or Math.random. */
export function createRng(seed) {
  let value = 2166136261;
  for (const char of String(seed)) {
    value = Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0;
  }
  return () => {
    value += 0x6d2b79f5;
    let next = Math.imul(value ^ (value >>> 15), 1 | value);
    next ^= next + Math.imul(next ^ (next >>> 7), 61 | next);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}
