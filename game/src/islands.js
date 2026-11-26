// The Nusa Isles: terrain, city, runway and the ring course.
// Everything the game flies over is a pure function of one seed:
// the same seed always builds the same islands, so a screenshot
// scene staged from it is the same frame every time.

import {
  CITY,
  COLORS,
  ISLANDS,
  LAKE,
  RINGS,
  RUNWAY,
  VOLCANO,
  WORLD_HALF,
} from './settings.js';
import { createSeeded, fbmNoise } from './seeded.js';

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Smoothstep that also works when edge0 > edge1 (reversed). */
function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function dist2(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

/** Distance from a point to the runway centreline segment. */
function runwayDistance(x, z) {
  const cx = clamp(x, RUNWAY.x0, RUNWAY.x1);
  return dist2(x, z, cx, RUNWAY.z);
}

export function createIslands(seed) {
  const rng = createSeeded(seed);

  // City rooftops: boxes on the flattened city ground, kept clear
  // of the runway strip so no building ever stands on the tarmac.
  const blocks = [];
  for (let i = 0; i < 64; i += 1) {
    const a = rng.range(0, Math.PI * 2);
    const r = Math.sqrt(rng.next()) * (CITY.radius - 30);
    const x = CITY.x + Math.cos(a) * r;
    const z = CITY.z + Math.sin(a) * r;
    if (runwayDistance(x, z) < 70) continue;
    const w = rng.range(22, 52);
    const d = rng.range(22, 52);
    blocks.push({
      x,
      z,
      w,
      d,
      h: rng.range(12, 44),
      roof: rng.pick(['#b3543f', '#7a6a55', '#4f7d8a', '#8a6f4d', '#5d6b7a']),
    });
  }

  // Drifting cloud puffs, high above the islands.
  const clouds = [];
  for (let i = 0; i < 16; i += 1) {
    clouds.push({
      x: rng.range(-WORLD_HALF, WORLD_HALF),
      y: rng.range(430, 660),
      z: rng.range(-WORLD_HALF, WORLD_HALF),
      r: rng.range(90, 230),
    });
  }

  // The ring course, with each ring facing the next leg so the
  // pilot always flies through it, never past its edge.
  const rings = RINGS.map((ring, i) => {
    const next = RINGS[(i + 1) % RINGS.length];
    const target = i === RINGS.length - 1
      ? { x: RUNWAY.x0 + 60, y: RUNWAY.y + 30, z: RUNWAY.z }
      : next;
    let nx = target.x - ring.x;
    let ny = target.y - ring.y;
    let nz = target.z - ring.z;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    return { ...ring, nx, ny, nz };
  });

  function terrainHeight(x, z) {
    let land = 0;
    for (const isle of ISLANDS) {
      const d = dist2(x, z, isle.x, isle.z);
      const sigma = isle.radius * 0.45;
      land += isle.peak * Math.exp(-(d * d) / (2 * sigma * sigma));
    }
    // The volcano cone rises sharp out of the main island.
    const dv = dist2(x, z, VOLCANO.x, VOLCANO.z);
    land += Math.max(0, VOLCANO.peak - dv * VOLCANO.slope);
    // Rolling hills, only where land already rises.
    const landFactor = smoothstep(0, 40, land);
    const hills = (fbmNoise(seed, x * 0.0016, z * 0.0016) - 0.5) * 46;
    let h = land + hills * landFactor;
    // The lake scoops a hollow out of the main island.
    const dl = dist2(x, z, LAKE.x, LAKE.z);
    h -= LAKE.depth * Math.exp(-(dl * dl) / (2 * LAKE.radius * LAKE.radius * 0.25));
    // Flatten the city ground and the runway strip.
    const dc = dist2(x, z, CITY.x, CITY.z);
    h = lerp(h, 8, smoothstep(300, 140, dc));
    h = lerp(h, RUNWAY.y, smoothstep(170, 55, runwayDistance(x, z)));
    return h;
  }

  function terrainColor(x, z, h) {
    if (h < 0) {
      const depth = clamp(-h / 30, 0, 1);
      return mixColor(COLORS.seaShallow, COLORS.seaDeep, depth);
    }
    if (h < 2) return COLORS.sand;
    if (h < 70) return mixColor(COLORS.sand, COLORS.grass, (h - 2) / 68);
    if (h < 160) return mixColor(COLORS.grass, COLORS.forest, (h - 70) / 90);
    if (h < 260) return mixColor(COLORS.forest, COLORS.rock, (h - 160) / 100);
    return COLORS.snow;
  }

  return {
    seed,
    blocks,
    clouds,
    rings,
    terrainHeight,
    terrainColor,
    isWater(x, z) {
      return terrainHeight(x, z) < 0.5;
    },
    runwayDistance,
    cityBlocks() {
      return blocks;
    },
  };
}

/** Mix two #rrggbb colours by t in [0, 1]. */
export function mixColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t);
  const g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return `rgb(${r},${g},${bl})`;
}

/** Lighten a colour toward white by t in [0, 1] (distance haze). */
export function hazeColor(rgb, t) {
  const [r0, g0, b0] = parseHaze(rgb);
  const r = Math.round(r0 + (235 - r0) * t);
  const g = Math.round(g0 + (240 - g0) * t);
  const b = Math.round(b0 + (247 - b0) * t);
  return `rgb(${r},${g},${b})`;
}

function parseHaze(color) {
  if (color[0] === '#') {
    const n = parseInt(color.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = color.match(/\d+/g);
  return m ? [Number(m[0]), Number(m[1]), Number(m[2])] : [0, 0, 0];
}
