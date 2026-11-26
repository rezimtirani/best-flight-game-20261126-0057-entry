// The screenshot scenes behind ?shot=takeoff|ring|cockpit|landing.
// Each one plays the real rules forward from a fresh world for a
// fixed number of steps, steered by the autopilot, so the frame is
// what a short flight really looks like — and the same seed always
// gives the same frame. If the autopilot ever falls short, the scene
// is staged by hand at the same spot instead of failing.

import { RUNWAY, STEP } from './settings.js';
import { autopilotInput } from './pilot.js';

function distanceTo(flight, x, y, z) {
  const s = flight.state;
  const dx = s.x - x;
  const dy = s.y - y;
  const dz = s.z - z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function stageTakeoff(flight, islands) {
  flight.reset();
  // Roll down the runway and rotate, wheels just clear of the
  // tarmac with the strip still stretching ahead.
  let guard = 0;
  while (guard < 400 && flight.state.status === 'flying') {
    flight.step(STEP, autopilotInput(flight, islands));
    guard += 1;
    const s = flight.state;
    const ground = islands.terrainHeight(s.x, s.z);
    if (s.y > ground + 12 && s.speed > 28) break;
  }
  return { view: 'chase', caption: 'Takeoff — Runway 09' };
}

function stageRing(flight, islands) {
  flight.reset();
  const ring = islands.rings[2];
  let guard = 0;
  while (guard < 6000 && flight.state.status === 'flying') {
    flight.step(STEP, autopilotInput(flight, islands));
    guard += 1;
    if (flight.state.ringsCleared >= 2 && distanceTo(flight, ring.x, ring.y, ring.z) < 330) break;
  }
  return { view: 'chase', caption: 'Ring 3 ahead over the north sea' };
}

function stageCockpit(flight, islands) {
  flight.reset();
  const ring = islands.rings[3];
  let guard = 0;
  while (guard < 8000 && flight.state.status === 'flying') {
    flight.step(STEP, autopilotInput(flight, islands));
    guard += 1;
    if (flight.state.ringsCleared >= 3 && distanceTo(flight, ring.x, ring.y, ring.z) < 360) break;
  }
  return { view: 'cockpit', caption: 'Cockpit — the volcano ring' };
}

function stageLanding(flight, islands) {
  flight.reset();
  const threshold = { x: RUNWAY.x0 + 60, y: RUNWAY.y + 30, z: RUNWAY.z };
  let guard = 0;
  while (guard < 12000 && flight.state.status === 'flying') {
    flight.step(STEP, autopilotInput(flight, islands));
    guard += 1;
    if (flight.state.ringsCleared >= 6 && distanceTo(flight, threshold.x, threshold.y, threshold.z) < 430) break;
  }
  if (flight.state.status !== 'flying' || flight.state.ringsCleared < 6) {
    // The autopilot fell short: stage the final approach by hand
    // at the same spot, gear down and lined up with the runway.
    const s = flight.state;
    s.status = 'flying';
    s.ringsCleared = 6;
    s.score = 600;
    s.x = RUNWAY.x0 - 380;
    s.y = RUNWAY.y + 42;
    s.z = RUNWAY.z;
    s.heading = (RUNWAY.headingDeg * Math.PI) / 180;
    s.pitch = -0.05;
    s.roll = 0;
    s.speed = 36;
    s.vy = -1.8;
    s.throttle = 0.35;
    s.onGround = false;
    s.message = 'Final — Runway 09, gear down, six rings done.';
    s.messageAge = 0;
  }
  return { view: 'chase', caption: 'Final approach — Runway 09' };
}

/**
 * Set the flight to the named scene (takeoff, ring, cockpit or
 * landing; any other name is takeoff) and return the view to draw.
 */
export function stageShot(name, flight, islands) {
  if (name === 'ring') return stageRing(flight, islands);
  if (name === 'cockpit') return stageCockpit(flight, islands);
  if (name === 'landing') return stageLanding(flight, islands);
  return stageTakeoff(flight, islands);
}
