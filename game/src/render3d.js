// The renderer: sky, sea, terrain, city, runway, rings, clouds
// and the Cendrawasih herself, drawn with one perspective
// projection and a painter's sort. Chase view looks over her
// shoulder; cockpit view sits in the pilot's seat behind the
// instrument panel. Everything here is pure drawing against a
// canvas-like context, so the same code paints every frame.

import { COLORS, RUNWAY, WORLD_HALF } from './settings.js';
import { hazeColor, mixColor } from './islands.js';
import { hashGrid } from './seeded.js';

const GRID_N = 96;
const GRID_HALF = 2800;
const GRID_CELL = (GRID_HALF * 2) / GRID_N;
const FOV = 1.25;
const SUN_AZ = (250 * Math.PI) / 180;
const SUN_EL = (30 * Math.PI) / 180;

function norm3(v) {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Parse a '#rrggbb' or 'rgb(r,g,b)' colour into [r, g, b]. */
function parseColor(color) {
  if (color[0] === '#') {
    const n = parseInt(color.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = color.match(/\d+/g);
  return m ? [Number(m[0]), Number(m[1]), Number(m[2])] : [0, 0, 0];
}

function shadeRgb(rgb, factor) {
  const [r, g, b] = parseColor(rgb);
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;
}

const SUN_DIR = norm3([
  Math.sin(SUN_AZ) * Math.cos(SUN_EL),
  Math.sin(SUN_EL),
  -Math.cos(SUN_AZ) * Math.cos(SUN_EL),
]);

// The Cendrawasih: a cream courier prop-plane with a teal stripe
// and a red tail, built from quads in local space — x forward,
// y up, z to the right wing. pushQuad splits each quad in two.
const PLANE_QUADS = [];
function pq(a, b, c, d, color) {
  PLANE_QUADS.push({ a, b, c, d, color });
}
// Fuselage: four diamond sections, nose to tail.
const SECTIONS = [
  { x: 3.4, r: 0.06 },
  { x: 2.6, r: 0.5 },
  { x: 0.6, r: 0.78 },
  { x: -2.8, r: 0.3 },
];
for (let s = 0; s < SECTIONS.length - 1; s += 1) {
  const p = SECTIONS[s];
  const q = SECTIONS[s + 1];
  pq([p.x, p.r, 0], [q.x, q.r, 0], [q.x, 0, q.r * 0.85], [p.x, 0, p.r * 0.85], COLORS.planeCream);
  pq([p.x, 0, p.r * 0.85], [q.x, 0, q.r * 0.85], [q.x, -q.r * 0.8, 0], [p.x, -p.r * 0.8, 0], COLORS.planeCream);
  pq([p.x, -p.r * 0.8, 0], [q.x, -q.r * 0.8, 0], [q.x, 0, -q.r * 0.85], [p.x, 0, -p.r * 0.85], COLORS.planeCream);
  pq([p.x, 0, -p.r * 0.85], [q.x, 0, -q.r * 0.85], [q.x, q.r, 0], [p.x, p.r, 0], COLORS.planeCream);
}
// Teal cheatline along each flank.
pq([2.7, 0.18, 0.5], [0.6, 0.22, 0.79], [0.6, -0.02, 0.79], [2.7, -0.06, 0.5], COLORS.planeTeal);
pq([2.7, 0.18, -0.5], [0.6, 0.22, -0.79], [0.6, -0.02, -0.79], [2.7, -0.06, -0.5], COLORS.planeTeal);
// Cockpit windows, dark glass over the nose.
pq([2.3, 0.42, 0.34], [1.1, 0.62, 0.42], [1.1, 0.62, -0.42], [2.3, 0.42, -0.34], '#16324a');
// Main wing: teal, slight dihedral, cream tips.
pq([1.35, 0.08, -5.2], [1.35, 0.32, -5.2], [-0.15, 0.32, -5.2], [-0.15, 0.08, -5.2], COLORS.planeTeal);
pq([1.35, 0.08, 5.2], [-0.15, 0.08, 5.2], [-0.15, 0.32, 5.2], [1.35, 0.32, 5.2], COLORS.planeTeal);
pq([1.35, 0.08, -5.2], [-0.15, 0.08, -5.2], [-0.15, 0.08, 5.2], [1.35, 0.08, 5.2], COLORS.planeTeal);
pq([1.35, 0.32, -5.2], [1.35, 0.32, 5.2], [-0.15, 0.32, 5.2], [-0.15, 0.32, -5.2], COLORS.planeTeal);
// Tailplane and red fin.
pq([-2.35, 0.28, -1.15], [-2.35, 0.34, -1.15], [-2.85, 0.34, -1.15], [-2.85, 0.28, -1.15], COLORS.planeCream);
pq([-2.35, 0.28, 1.15], [-2.85, 0.28, 1.15], [-2.85, 0.34, 1.15], [-2.35, 0.34, 1.15], COLORS.planeCream);
pq([-2.2, 0.3, 0.02], [-2.9, 0.3, 0.02], [-2.9, 1.35, 0.02], [-2.2, 1.05, 0.02], COLORS.planeRed);
pq([-2.2, 0.3, -0.02], [-2.9, 0.3, -0.02], [-2.9, 1.35, -0.02], [-2.2, 1.05, -0.02], COLORS.planeRed);
// Fixed gear: two legs and wheels.
pq([1.2, -0.5, 0.72], [1.2, -1.05, 0.72], [1.2, -1.05, 0.6], [1.2, -0.5, 0.6], '#2b2f36');
pq([1.2, -0.5, -0.72], [1.2, -1.05, -0.72], [1.2, -1.05, -0.6], [1.2, -0.5, -0.6], '#2b2f36');

export function createScene(islands) {
  // The terrain grid is baked once: heights and base colours.
  const heights = new Float32Array((GRID_N + 1) * (GRID_N + 1));
  const colors = new Array((GRID_N + 1) * (GRID_N + 1));
  for (let j = 0; j <= GRID_N; j += 1) {
    for (let i = 0; i <= GRID_N; i += 1) {
      const x = -GRID_HALF + i * GRID_CELL;
      const z = -GRID_HALF + j * GRID_CELL;
      const h = islands.terrainHeight(x, z);
      heights[j * (GRID_N + 1) + i] = h;
      // A deterministic per-cell jitter breaks the quilt look: no
      // two neighbouring cells share quite the same green.
      const jitter = 0.94 + 0.12 * hashGrid(islands.seed, i, j);
      colors[j * (GRID_N + 1) + i] = shadeRgb(islands.terrainColor(x, z, h), jitter);
    }
  }

  function gridHeight(i, j) {
    return heights[j * (GRID_N + 1) + i];
  }

  // One camera setup shared by the scene and the HUD's ring arrow:
  // chase sits behind the tail, cockpit sits in the pilot's seat,
  // and the mouse can orbit the chase camera around the aircraft.
  function setupCamera(s, view, W, H, orbit) {
    const fwd = [
      Math.cos(s.pitch) * Math.sin(s.heading),
      Math.sin(s.pitch),
      -Math.cos(s.pitch) * Math.cos(s.heading),
    ];
    const right0 = [Math.cos(s.heading), 0, Math.sin(s.heading)];
    const up0 = cross3(right0, fwd);

    let camPos;
    let lookAt;
    let camRoll;
    if (view === 'cockpit') {
      camPos = [
        s.x + fwd[0] * 1.4 + up0[0] * 1.0,
        s.y + fwd[1] * 1.4 + up0[1] * 1.0,
        s.z + fwd[2] * 1.4 + up0[2] * 1.0,
      ];
      lookAt = [s.x + fwd[0] * 120, s.y + fwd[1] * 120, s.z + fwd[2] * 120];
      camRoll = s.roll;
    } else {
      camPos = [
        s.x - fwd[0] * 16 + up0[0] * 4.5,
        s.y - fwd[1] * 16 + up0[1] * 4.5,
        s.z - fwd[2] * 16 + up0[2] * 4.5,
      ];
      lookAt = [s.x + fwd[0] * 30, s.y + fwd[1] * 30 + 1, s.z + fwd[2] * 30];
      camRoll = s.roll * 0.4;
    }
    if (view !== 'cockpit' && orbit) {
      const ox = camPos[0] - s.x;
      const oz = camPos[2] - s.z;
      const cosO = Math.cos(orbit.yaw || 0);
      const sinO = Math.sin(orbit.yaw || 0);
      const zoom = orbit.zoom || 1;
      camPos = [
        s.x + (ox * cosO - oz * sinO) / zoom,
        camPos[1] + (orbit.pitch || 0) * 12,
        s.z + (ox * sinO + oz * cosO) / zoom,
      ];
      lookAt = [s.x + fwd[0] * 30, s.y + fwd[1] * 30 + 1, s.z + fwd[2] * 30];
    }
    const cf = norm3(sub3(lookAt, camPos));
    const cr = norm3(cross3(cf, [0, 1, 0]));
    const cu = cross3(cr, cf);
    const cosR = Math.cos(camRoll);
    const sinR = Math.sin(camRoll);
    const right = [
      cr[0] * cosR + cu[0] * sinR,
      cr[1] * cosR + cu[1] * sinR,
      cr[2] * cosR + cu[2] * sinR,
    ];
    const up = [
      cu[0] * cosR - cr[0] * sinR,
      cu[1] * cosR - cr[1] * sinR,
      cu[2] * cosR - cr[2] * sinR,
    ];
    const focal = (H * 0.5) / Math.tan(FOV / 2);

    function project(p) {
      const d = sub3(p, camPos);
      const cx = dot3(d, right);
      const cy = dot3(d, up);
      const cz = dot3(d, cf);
      if (cz < 1.5) return null;
      return [W / 2 + (cx / cz) * focal, H / 2 - (cy / cz) * focal, cz];
    }
    return { camPos, cf, right, up, focal, fwd, right0, up0, project };
  }

  // Where the next ring lands on screen, for the HUD arrow.
  function ringScreen(flight, view, W, H, orbit) {
    const s = flight.state;
    const ring = flight.nextRing();
    if (!ring) return null;
    const cam = setupCamera(s, view, W, H, orbit);
    const p = cam.project([ring.x, ring.y, ring.z]);
    const dx = ring.x - s.x;
    const dy = ring.y - s.y;
    const dz = ring.z - s.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (!p) return { x: W / 2, y: -120, dist, visible: false };
    const visible = p[0] > 40 && p[0] < W - 40 && p[1] > 90 && p[1] < H - 40;
    return { x: p[0], y: p[1], dist, visible };
  }

  function drawScene(ctx, W, H, flight, view, time, orbit) {
    const s = flight.state;
    const cam = setupCamera(s, view, W, H, orbit);
    const { camPos, project, fwd, right0, up0 } = cam;

    const fills = [];
    const strokes = [];
    function pushFill(pts, fill, alpha) {
      const sp = [];
      let depth = 0;
      for (const p of pts) {
        const q = project(p);
        if (!q) return;
        sp.push([q[0], q[1]]);
        depth += q[2];
      }
      fills.push({ pts: sp, fill, alpha, depth: depth / pts.length });
    }
    function pushStroke(pts, color, width, alpha, close) {
      const sp = [];
      let depth = 0;
      let seen = 0;
      for (const p of pts) {
        const q = project(p);
        if (!q) continue;
        sp.push([q[0], q[1]]);
        depth += q[2];
        seen += 1;
      }
      if (seen < 2) return;
      strokes.push({ pts: sp, color, width, alpha, close, depth: depth / seen });
    }

    // Sky: dawn gradient, then the sun with its glow.
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, COLORS.skyTop);
    sky.addColorStop(0.62, COLORS.skyHorizon);
    sky.addColorStop(1, '#e8f1f5');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    const sunFar = [
      camPos[0] + SUN_DIR[0] * 9000,
      camPos[1] + SUN_DIR[1] * 9000,
      camPos[2] + SUN_DIR[2] * 9000,
    ];
    const sunP = project(sunFar);
    if (sunP) {
      const glow = ctx.createRadialGradient(sunP[0], sunP[1], 4, sunP[0], sunP[1], 150);
      glow.addColorStop(0, 'rgba(255,243,196,0.9)');
      glow.addColorStop(1, 'rgba(255,243,196,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(sunP[0] - 150, sunP[1] - 150, 300, 300);
      ctx.fillStyle = COLORS.sun;
      ctx.beginPath();
      ctx.arc(sunP[0], sunP[1], 26, 0, Math.PI * 2);
      ctx.fill();
    }

    // Open sea beyond the terrain mesh, so the horizon is never void.
    const seaFar = 9000;
    pushFill(
      [
        [-seaFar, 0, -seaFar],
        [seaFar, 0, -seaFar],
        [seaFar, 0, seaFar],
        [-seaFar, 0, seaFar],
      ],
      COLORS.seaDeep,
      1,
    );

    // Terrain: near cells full detail, far cells in 2x2 blocks.
    for (let j = 0; j < GRID_N; j += 1) {
      for (let i = 0; i < GRID_N; i += 1) {
        const cx = -GRID_HALF + (i + 0.5) * GRID_CELL;
        const cz = -GRID_HALF + (j + 0.5) * GRID_CELL;
        const dx = cx - camPos[0];
        const dz = cz - camPos[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 3400) continue;
        if (dist > 1500 && (i % 2 === 1 || j % 2 === 1)) continue;
        const step = dist > 1500 ? 2 : 1;
        const x0 = -GRID_HALF + i * GRID_CELL;
        const z0 = -GRID_HALF + j * GRID_CELL;
        const x1 = x0 + GRID_CELL * step;
        const z1 = z0 + GRID_CELL * step;
        const h00 = gridHeight(i, j);
        const h10 = gridHeight(i + step, j);
        const h11 = gridHeight(i + step, j + step);
        const h01 = gridHeight(i, j + step);
        const midH = (h00 + h10 + h11 + h01) / 4;
        let base = colors[(j + 1) * (GRID_N + 1) + (i + 1)] || islands.terrainColor(cx, cz, midH);
        const slope = Math.abs(h10 - h00) + Math.abs(h01 - h00);
        let shaded = shadeRgb(base, 0.82 + Math.min(0.25, slope * 0.012));
        shaded = hazeColor(shaded, Math.min(0.55, dist / 5200));
        pushFill(
          [
            [x0, h00, z0],
            [x1, h10, z0],
            [x1, h11, z1],
            [x0, h01, z1],
          ],
          shaded,
          1,
        );
      }
    }

    // The runway: asphalt strip, centreline dashes, threshold bars.
    // It rides a metre above the flattened ground so the painter's
    // sort never buries it under the terrain cells beneath it.
    const ry = RUNWAY.y + 1.0;
    pushFill(
      [
        [RUNWAY.x0, ry, RUNWAY.z - 20],
        [RUNWAY.x1, ry, RUNWAY.z - 20],
        [RUNWAY.x1, ry, RUNWAY.z + 20],
        [RUNWAY.x0, ry, RUNWAY.z + 20],
      ],
      COLORS.runway,
      1,
    );
    for (let x = RUNWAY.x0 + 30; x < RUNWAY.x1 - 20; x += 60) {
      pushFill(
        [
          [x, ry + 0.15, RUNWAY.z - 2],
          [x + 28, ry + 0.15, RUNWAY.z - 2],
          [x + 28, ry + 0.15, RUNWAY.z + 2],
          [x, ry + 0.15, RUNWAY.z + 2],
        ],
        COLORS.runwayMark,
        1,
      );
    }
    for (const tx of [RUNWAY.x0 + 8, RUNWAY.x1 - 8]) {
      for (let k = -2; k <= 2; k += 1) {
        pushFill(
          [
            [tx - 6, ry + 0.15, RUNWAY.z + k * 7 - 2.5],
            [tx + 6, ry + 0.15, RUNWAY.z + k * 7 - 2.5],
            [tx + 6, ry + 0.15, RUNWAY.z + k * 7 + 2.5],
            [tx - 6, ry + 0.15, RUNWAY.z + k * 7 + 2.5],
          ],
          COLORS.runwayMark,
          1,
        );
      }
    }

    // City rooftops as shaded boxes.
    for (const b of islands.blocks) {
      const dx = b.x - camPos[0];
      const dz = b.z - camPos[2];
      if (dx * dx + dz * dz > 2600 * 2600) continue;
      const gy = islands.terrainHeight(b.x, b.z);
      const hw = b.w / 2;
      const hd = b.d / 2;
      const top = gy + b.h;
      pushFill(
        [[b.x - hw, gy, b.z - hd], [b.x + hw, gy, b.z - hd], [b.x + hw, top, b.z - hd], [b.x - hw, top, b.z - hd]],
        shadeRgb(b.roof, 0.75),
        1,
      );
      pushFill(
        [[b.x + hw, gy, b.z - hd], [b.x + hw, gy, b.z + hd], [b.x + hw, top, b.z + hd], [b.x + hw, top, b.z - hd]],
        shadeRgb(b.roof, 0.6),
        1,
      );
      pushFill(
        [[b.x - hw, top, b.z - hd], [b.x + hw, top, b.z - hd], [b.x + hw, top, b.z + hd], [b.x - hw, top, b.z + hd]],
        shadeRgb(b.roof, 1.05),
        1,
      );
    }

    // Rings: glowing hoops on the course; the next one burns gold.
    islands.rings.forEach((ring, idx) => {
      const done = idx < s.ringsCleared;
      const next = idx === s.ringsCleared;
      const color = done ? COLORS.ringDone : next ? COLORS.ringNext : COLORS.ringFuture;
      const baseAlpha = done ? 0.5 : next ? 0.95 : 0.45;
      const pulse = next ? 0.75 + 0.25 * Math.sin(time * 4) : 1;
      const n = [ring.nx, ring.ny, ring.nz];
      let u = norm3(cross3(n, [0, 1, 0]));
      if (Math.abs(dot3(n, [0, 1, 0])) > 0.95) u = [1, 0, 0];
      const v = cross3(n, u);
      const pts = [];
      for (let k = 0; k <= 24; k += 1) {
        const a = (k / 24) * Math.PI * 2;
        pts.push([
          ring.x + (u[0] * Math.cos(a) + v[0] * Math.sin(a)) * 26,
          ring.y + (u[1] * Math.cos(a) + v[1] * Math.sin(a)) * 26,
          ring.z + (u[2] * Math.cos(a) + v[2] * Math.sin(a)) * 26,
        ]);
      }
      pushStroke(pts, color, 14, baseAlpha * pulse * 0.3, true);
      pushStroke(pts, color, 5, baseAlpha * pulse, true);
      if (next) {
        const beam = [
          [ring.x - 3, ring.y, ring.z],
          [ring.x + 3, ring.y, ring.z],
          [ring.x + 3, ring.y + 130, ring.z],
          [ring.x - 3, ring.y + 130, ring.z],
        ];
        pushFill(beam, color, 0.1 * pulse);
      }
    });

    // Clouds: flat white puffs riding high over the sea.
    for (const c of islands.clouds) {
      const pts = [];
      for (let k = 0; k < 8; k += 1) {
        const a = (k / 8) * Math.PI * 2;
        pts.push([c.x + Math.cos(a) * c.r, c.y, c.z + Math.sin(a) * c.r * 0.6]);
      }
      pushFill(pts, '#ffffff', 0.8);
    }

    // The aircraft, drawn last in chase view.
    if (view !== 'cockpit') {
      const basis = { fwd, up: up0, right: right0 };
      const toWorld = (p) => [
        s.x + p[0] * basis.fwd[0] + p[1] * basis.up[0] + p[2] * basis.right[0],
        s.y + p[0] * basis.fwd[1] + p[1] * basis.up[1] + p[2] * basis.right[1],
        s.z + p[0] * basis.fwd[2] + p[1] * basis.up[2] + p[2] * basis.right[2],
      ];
      for (const q of PLANE_QUADS) {
        const a = toWorld(q.a);
        const b = toWorld(q.b);
        const c = toWorld(q.c);
        const nrm = norm3(cross3(sub3(b, a), sub3(c, a)));
        const light = 0.62 + 0.38 * Math.abs(dot3(nrm, SUN_DIR));
        pushFill([a, b, c, toWorld(q.d)], shadeRgb(q.color, light), 1);
      }
      // Spinning prop disc, faint so the nose reads through it.
      const propPts = [];
      const spin = time * 40;
      for (let k = 0; k < 14; k += 1) {
        const a = spin + (k / 14) * Math.PI * 2;
        propPts.push(toWorld([3.55, Math.cos(a) * 1.15, Math.sin(a) * 1.15]));
      }
      pushFill(propPts, '#d7dee6', 0.22);
    }

    // One painter's flush: far things first.
    const items = [];
    for (const f of fills) items.push({ kind: 'fill', ...f });
    for (const st of strokes) items.push({ kind: 'stroke', ...st });
    items.sort((a, b) => b.depth - a.depth);
    for (const it of items) {
      ctx.globalAlpha = it.alpha;
      if (it.kind === 'fill') {
        ctx.fillStyle = it.fill;
        ctx.beginPath();
        ctx.moveTo(it.pts[0][0], it.pts[0][1]);
        for (let k = 1; k < it.pts.length; k += 1) ctx.lineTo(it.pts[k][0], it.pts[k][1]);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.strokeStyle = it.color;
        ctx.lineWidth = it.width;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(it.pts[0][0], it.pts[0][1]);
        for (let k = 1; k < it.pts.length; k += 1) ctx.lineTo(it.pts[k][0], it.pts[k][1]);
        if (it.close) ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    if (view === 'cockpit') drawCockpitPanel(ctx, W, H, s, time);
  }

  // The instrument panel: attitude ball, altimeter, airspeed, compass
  // strip, throttle lever and fuel gauge, all lit amber and green.
  function drawCockpitPanel(ctx, W, H, s, time) {
    const panelTop = H * 0.62;
    const grad = ctx.createLinearGradient(0, panelTop, 0, H);
    grad.addColorStop(0, '#2a3442');
    grad.addColorStop(1, COLORS.panelDark);
    ctx.fillStyle = grad;
    ctx.fillRect(0, panelTop, W, H - panelTop);
    ctx.fillStyle = 'rgba(251,191,36,0.55)';
    ctx.fillRect(0, panelTop, W, 3);

    // Windshield posts.
    ctx.fillStyle = '#141a23';
    ctx.beginPath();
    ctx.moveTo(W * 0.3, panelTop);
    ctx.lineTo(W * 0.36, 0);
    ctx.lineTo(W * 0.4, 0);
    ctx.lineTo(W * 0.36, panelTop);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(W * 0.7, panelTop);
    ctx.lineTo(W * 0.64, 0);
    ctx.lineTo(W * 0.6, 0);
    ctx.lineTo(W * 0.64, panelTop);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(0, 0, W, 10);

    // The nose, just visible over the panel.
    ctx.fillStyle = COLORS.planeCream;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 46, panelTop);
    ctx.lineTo(W / 2, panelTop - 26);
    ctx.lineTo(W / 2 + 46, panelTop);
    ctx.closePath();
    ctx.fill();

    const dialY = panelTop + (H - panelTop) * 0.48;
    const dialR = Math.min(52, (H - panelTop) * 0.34);

    // Attitude ball: sky and ground halves, rolled and pitched.
    const ax = W * 0.5;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ax, dialY, dialR, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(ax, dialY);
    ctx.rotate(-s.roll);
    ctx.translate(0, s.pitch * dialR * 1.4);
    ctx.fillStyle = '#3b82c4';
    ctx.fillRect(-dialR, -dialR * 2, dialR * 2, dialR * 2);
    ctx.fillStyle = '#7a5a34';
    ctx.fillRect(-dialR, 0, dialR * 2, dialR * 2);
    ctx.fillStyle = '#f5f5f0';
    ctx.fillRect(-dialR, -2, dialR * 2, 4);
    ctx.restore();
    ctx.strokeStyle = COLORS.hudAmber;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(ax, dialY, dialR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = COLORS.hudAmber;
    ctx.beginPath();
    ctx.moveTo(ax - 8, dialY);
    ctx.lineTo(ax + 8, dialY);
    ctx.lineTo(ax, dialY + 6);
    ctx.closePath();
    ctx.fill();

    // Altimeter and airspeed dials with needles.
    drawDial(ctx, W * 0.5 - dialR * 2.6, dialY, dialR * 0.85, s.y, 0, 600, 'ALT', 'ft', '#4ade80');
    drawDial(ctx, W * 0.5 + dialR * 2.6, dialY, dialR * 0.85, s.speed * 1.944, 0, 200, 'SPD', 'kt', '#4ade80');

    // Compass strip across the panel.
    const headingDeg = ((s.heading * 180) / Math.PI + 360) % 360;
    ctx.fillStyle = '#0f1720';
    ctx.fillRect(W * 0.5 - 130, panelTop + 12, 260, 26);
    ctx.strokeStyle = 'rgba(251,191,36,0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(W * 0.5 - 130, panelTop + 12, 260, 26);
    ctx.fillStyle = '#e8eef4';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let d = -60; d <= 60; d += 15) {
      const deg = Math.round((headingDeg + d + 360) % 360);
      const label = deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : String(deg);
      ctx.fillText(label, W * 0.5 + d * 2, panelTop + 25);
    }
    ctx.fillStyle = COLORS.hudAmber;
    ctx.beginPath();
    ctx.moveTo(W * 0.5 - 6, panelTop + 10);
    ctx.lineTo(W * 0.5 + 6, panelTop + 10);
    ctx.lineTo(W * 0.5, panelTop + 18);
    ctx.closePath();
    ctx.fill();

    // Throttle lever and fuel gauge.
    const leverX = W * 0.5 - dialR * 2.6 - 90;
    ctx.fillStyle = '#0f1720';
    ctx.fillRect(leverX - 6, panelTop + 30, 12, 90);
    ctx.fillStyle = COLORS.hudAmber;
    ctx.fillRect(leverX - 12, panelTop + 112 - s.throttle * 76, 24, 10);
    ctx.fillStyle = '#e8eef4';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THR', leverX, panelTop + 136);
    const fuelX = W * 0.5 + dialR * 2.6 + 90;
    ctx.fillStyle = '#0f1720';
    ctx.fillRect(fuelX - 8, panelTop + 30, 16, 90);
    ctx.fillStyle = s.fuel < 20 ? '#ef4444' : COLORS.hudGreen;
    ctx.fillRect(fuelX - 8, panelTop + 120 - s.fuel * 0.9, 16, s.fuel * 0.9);
    ctx.fillStyle = '#e8eef4';
    ctx.fillText('FUEL', fuelX, panelTop + 136);

    // Warning lights.
    const warnOn = s.stalled || s.fuel < 20;
    ctx.fillStyle = warnOn && Math.sin(time * 10) > 0 ? '#ef4444' : '#3f1d1d';
    ctx.beginPath();
    ctx.arc(W - 46, panelTop + 26, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(W - 46, panelTop + 52, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDial(ctx, x, y, r, value, min, max, label, unit, color) {
    ctx.fillStyle = '#0f1720';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    const frac = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const ang = -Math.PI * 0.75 + frac * Math.PI * 1.5;
    ctx.strokeStyle = '#f5f5f0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * (r - 6), y + Math.sin(ang) * (r - 6));
    ctx.stroke();
    ctx.fillStyle = '#e8eef4';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(Math.round(value)), x, y + r * 0.42);
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = color;
    ctx.fillText(`${label} ${unit}`, x, y - r * 0.55);
  }

  return { drawScene, ringScreen };
}

export { WORLD_HALF };
