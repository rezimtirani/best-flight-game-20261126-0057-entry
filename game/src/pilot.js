// The autopilot: a steady hand for the screenshot scenes and a
// proof that the course can actually be flown. It steers toward
// the next ring (or the runway threshold once the rings are done),
// holds a cruise speed, rides a glide slope onto the runway, and
// flares for the touchdown — the same inputs a player would give.

import { RUNWAY } from './settings.js';

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function autopilotInput(flight, islands) {
  const s = flight.state;
  const ring = flight.nextRing();
  const onFinal = ring === null;
  const threshold = { x: RUNWAY.x0 + 60, y: RUNWAY.y + 30, z: RUNWAY.z };
  const target = onFinal ? threshold : ring;
  const dx = target.x - s.x;
  const dy = target.y - s.y;
  const dz = target.z - s.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Heading: chase the bearing to the target. On the final, once
  // close, aim past the threshold down the centreline so the
  // bearing stops swinging — but never blend the bearing toward
  // the runway heading early, or a lateral offset never closes.
  let aimX = target.x;
  let aimZ = target.z;
  if (onFinal && dist < 150) {
    aimX = threshold.x + 300;
    aimZ = threshold.z;
  }
  const bearing = Math.atan2(aimX - s.x, -(aimZ - s.z));
  const diff = wrapAngle(bearing - s.heading);
  const desiredRoll = clamp(diff * 1.4, -0.8, 0.8);
  const roll = clamp((desiredRoll - s.roll) * 2.5, -1, 1);

  // Altitude: the ring's height, or a glide slope home. Far out,
  // never plan below the ground ahead; near the strip the ground
  // is flat, so the slope alone governs and the last stretch is
  // a gentle flare onto the tarmac.
  let desiredAlt = target.y + 5;
  if (onFinal) {
    const slope = RUNWAY.y + 2 + dist * 0.07;
    if (dist > 250) {
      const hx = Math.sin(s.heading);
      const hz = -Math.cos(s.heading);
      let groundAhead = 0;
      for (const d of [120, 260, 420]) {
        const g = islands.terrainHeight(s.x + hx * d, s.z + hz * d);
        if (g > groundAhead) groundAhead = g;
      }
      desiredAlt = Math.max(slope, groundAhead + 20);
    } else if (dist > 120) {
      desiredAlt = slope;
    } else {
      desiredAlt = RUNWAY.y + 2;
    }
  }
  let pitch = clamp((desiredAlt - s.y) * 0.02 - s.vy * 0.03, -1, 1);
  if (onFinal && dist < 120) pitch = Math.max(-0.06, Math.min(0.25, pitch));

  // Speed: cruise fast, bleed off on the approach, crawl on short final.
  let desiredSpeed = 62;
  if (dist < 700) desiredSpeed = 46;
  if (onFinal && dist < 260) desiredSpeed = 34;
  const throttleUp = s.speed < desiredSpeed - 2;
  const throttleDown = s.speed > desiredSpeed + 2;

  // Flaps out low and slow on the final, never in the cruise.
  const flaps = onFinal && dist < 450 && s.speed < 48;

  return { pitch, roll, throttleUp, throttleDown, flaps };
}
