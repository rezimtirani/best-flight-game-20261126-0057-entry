// A small seeded random source for the archipelago.
// xorshift128+ with a 64-bit state held as two 32-bit halves: fast,
// deterministic across runs, and good enough for terrain and clouds.
// Every world built from one seed is byte-identical, which is what
// the screenshot scenes and the autopilot rely on.

export function createSeeded(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  let b = (Math.imul(a, 0x85ebca6b) >>> 0) || 0x85ebca6b;
  let c = (Math.imul(b, 0xc2b2ae35) >>> 0) || 0xc2b2ae35;
  let d = (Math.imul(c, 0x27d4eb2f) >>> 0) || 0x27d4eb2f;

  function nextUint() {
    const t = d;
    const s = b;
    d = c;
    c = a;
    const x = (a ^ (a << 11)) >>> 0;
    a = (x ^ s ^ ((x >>> 19) ^ (s >>> 8))) >>> 0;
    return (a + t) >>> 0;
  }

  return {
    /** A float in [0, 1). */
    next() {
      return nextUint() / 4294967296;
    },
    /** A float in [lo, hi). */
    range(lo, hi) {
      return lo + (hi - lo) * (nextUint() / 4294967296);
    },
    /** An integer in [lo, hi]. */
    int(lo, hi) {
      return lo + Math.floor((nextUint() / 4294967296) * (hi - lo + 1));
    },
    /** One element of an array, picked uniformly. */
    pick(list) {
      return list[Math.floor((nextUint() / 4294967296) * list.length)];
    },
  };
}

/** Deterministic 2D hash in [0, 1) for a grid corner. */
export function hashGrid(seed, ix, iz) {
  let h = (seed ^ Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iz, 0x165667b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  return h / 4294967296;
}

function fade(t) {
  return t * t * (3 - 2 * t);
}

/** Smooth value noise in [0, 1) at world coordinates. */
export function valueNoise(seed, x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const a = hashGrid(seed, ix, iz);
  const b = hashGrid(seed, ix + 1, iz);
  const c = hashGrid(seed, ix, iz + 1);
  const d = hashGrid(seed, ix + 1, iz + 1);
  const u = fade(fx);
  const v = fade(fz);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Three octaves of value noise, still in [0, 1). */
export function fbmNoise(seed, x, z) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let o = 0; o < 3; o += 1) {
    sum += amp * valueNoise(seed + o * 101, x * freq, z * freq);
    amp *= 0.5;
    freq *= 2.1;
  }
  return sum;
}
