/* utils: helpers puros (formato, RNG determinista, redondeo a 100%). */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function cn(...parts: any[]): string { return parts.filter(Boolean).join(" "); }

/* =========================================================================
   PRNG determinista (solo para fabricar resultados mock estables).
   En produccion estos resultados llegarian del CalendarResultsActor (Apify).
   ========================================================================= */
function hashStr(s) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededScore(matchId, biasHome) {
  const rnd = mulberry32(hashStr(matchId));
  const draw = (lambda) => {
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= rnd(); } while (p > L);
    return Math.min(k - 1, 5);
  };
  return [draw(1.35 + biasHome), draw(1.15)];
}

/* =========================================================================
   DATOS MOCK — TEAMS (TeamRatingsActor + TeamFormActor)
   12 grupos (A-L), 48 equipos. Group C replica el ejemplo del spec.
   ========================================================================= */

const FACT = [1, 1, 2, 6, 24, 120, 720, 5040];
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const pct = (x) => `${Math.round(x * 100)}%`;
const signed = (x, d = 1) => `${x >= 0 ? "+" : ""}${x.toFixed(d)}`;
// Redondeo por mayor residuo: convierte fracciones (suman ~1) en enteros que
// SIEMPRE suman 100. Evita el bug de mostrar 99% o 101%.
function roundPercents(fractions) {
  const scaled = fractions.map((f) => f * 100);
  const floors = scaled.map((s) => Math.floor(s));
  let remainder = 100 - floors.reduce((a, b) => a + b, 0);
  const order = scaled
    .map((s, i) => ({ i, frac: s - Math.floor(s) }))
    .sort((a, b) => b.frac - a.frac);
  const out = floors.slice();
  for (let k = 0; k < order.length && remainder > 0; k++) { out[order[k].i]++; remainder--; }
  return out;
}


export { hashStr, mulberry32, seededScore, FACT, clamp, pct, signed, roundPercents };
