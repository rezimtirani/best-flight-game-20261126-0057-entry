// The flight model and the mission: a courier run over the Nusa
// Isles. Fly the six rings in order, then bring the Cendrawasih
// home to Runway 09 before the fuel or the clock runs out.
// Pure logic — no DOM, no canvas — so the same code can be stepped
// by the game loop, the autopilot and the screenshot scenes.

import {
  FLIGHT,
  LANDING_SCORE,
  RING_RADIUS,
  RING_SCORE,
  RINGS,
  RUNWAY,
  TIME_LIMIT,
} from './settings.js';

export const EVENT_RING = 1;
export const EVENT_LANDED = 2;
export const EVENT_CRASH = 4;
export const EVENT_WIN = 8;
export const EVENT_TIMEOUT = 16;

const TWO_PI = Math.PI * 2;

function wrapAngle(a) {
  while (a > Math.PI) a -= TWO_PI;
  while (a < -Math.PI) a += TWO_PI;
  return a;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function createFlight(islands) {
  const state = {
    x: 0,
    y: 0,
    z: 0,
    heading: Math.PI / 2,
    pitch: 0,
    roll: 0,
    speed: 0,
    vy: 0,
    throttle: 0,
    fuel: 100,
    hull: 100,
    score: 0,
    ringsCleared: 0,
    timeLeft: TIME_LIMIT,
    status: 'flying',
    crashReason: '',
    message: '',
    messageAge: 99,
    onGround: true,
    stalled: false,
    lowFuelWarned: false,
    best: 0,
  };

  function say(text) {
    state.message = text;
    state.messageAge = 0;
  }

  function reset() {
    const ground = islands.terrainHeight(RUNWAY.x0 + 30, RUNWAY.z);
    state.x = RUNWAY.x0 + 30;
    state.y = ground + FLIGHT.gearHeight;
    state.z = RUNWAY.z;
    state.heading = (RUNWAY.headingDeg * Math.PI) / 180;
    state.pitch = 0;
    state.roll = 0;
    state.speed = 0;
    state.vy = 0;
    state.throttle = 0;
    state.fuel = 100;
    state.hull = 100;
    state.score = 0;
    state.ringsCleared = 0;
    state.timeLeft = TIME_LIMIT;
    state.status = 'flying';
    state.crashReason = '';
    state.onGround = true;
    state.stalled = false;
    state.lowFuelWarned = false;
    say('Cleared for takeoff — Runway 09, six rings, then home.');
  }

  function onRunway(x, z) {
    return x > RUNWAY.x0 - 20 && x < RUNWAY.x1 + 20 && Math.abs(z - RUNWAY.z) < 24;
  }

  function crash(reason) {
    state.status = 'crashed';
    state.crashReason = reason;
    state.message = reason;
    state.messageAge = 0;
    return EVENT_CRASH;
  }

  function nextRing() {
    return state.ringsCleared < RINGS.length
      ? islands.rings[state.ringsCleared]
      : null;
  }

  function step(dt, input) {
    if (state.status !== 'flying') return 0;
    let events = 0;
    state.messageAge += dt;
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.status = 'timeout';
      say('Out of time — the mail goes back to the depot.');
      return EVENT_TIMEOUT;
    }

    // Throttle: Shift feeds it, Control starves it, empty tanks kill it.
    if (input.throttleUp) state.throttle = clamp(state.throttle + 0.55 * dt, 0, 1);
    if (input.throttleDown) state.throttle = clamp(state.throttle - 0.8 * dt, 0, 1);
    if (state.fuel <= 0) state.throttle = Math.max(0, state.throttle - dt);
    state.fuel -= (FLIGHT.fuelDrainBase + state.throttle * FLIGHT.fuelDrainThrottle) * dt;
    if (state.fuel <= 0) {
      state.fuel = 0;
      if (!state.lowFuelWarned) {
        state.lowFuelWarned = true;
        say('FUEL EMPTY — gliding now. Find the runway.');
      }
    } else if (state.fuel < 20 && !state.lowFuelWarned) {
      state.lowFuelWarned = true;
      say('LOW FUEL — mind the throttle.');
    }

    const stallSpeed = input.flaps ? FLIGHT.stallFlaps : FLIGHT.stallClean;

    // Pitch and roll answer the stick; the bank turns the nose.
    const pitchIn = clamp(input.pitch || 0, -1, 1);
    const rollIn = clamp(input.roll || 0, -1, 1);
    state.pitch = clamp(state.pitch + pitchIn * FLIGHT.pitchRate * dt, FLIGHT.maxPitchDown, FLIGHT.maxPitchUp);
    state.roll = clamp(state.roll + rollIn * FLIGHT.rollRate * dt, -FLIGHT.maxRoll, FLIGHT.maxRoll);
    if (rollIn === 0) state.roll *= Math.max(0, 1 - 0.35 * dt);
    const turnRate = (FLIGHT.gravity * Math.tan(state.roll)) / Math.max(state.speed, 25);
    state.heading = wrapAngle(state.heading + turnRate * dt);

    // Speed chases the throttle; climbing bleeds it, diving feeds it.
    const targetSpeed = FLIGHT.minSpeed + state.throttle * (FLIGHT.maxSpeed - FLIGHT.minSpeed);
    const accel = clamp((targetSpeed - state.speed) * 0.5, -16, 10 + state.throttle * 8);
    state.speed = Math.max(0, state.speed + accel * dt);
    state.speed -= Math.sin(state.pitch) * FLIGHT.gravity * 0.45 * dt;
    if (input.flaps) state.speed = Math.max(0, state.speed - 6 * dt);
    state.speed = clamp(state.speed, 0, FLIGHT.maxSpeed + 12);

    // Lift: below stall speed the nose drops and the aircraft sinks.
    state.stalled = state.speed < stallSpeed && !state.onGround;
    let vy = state.speed * Math.sin(state.pitch);
    if (state.stalled) {
      vy -= (stallSpeed - state.speed) * 1.1;
      state.pitch += (-0.18 - state.pitch) * 0.9 * dt;
    }
    state.vy = vy;

    const ch = Math.cos(state.heading);
    const sh = Math.sin(state.heading);
    const cp = Math.cos(state.pitch);

    if (state.onGround) {
      // Rolling on the ground: steer straight, lift off when fast
      // enough and the pilot pulls back.
      state.pitch = 0;
      state.roll = 0;
      state.vy = 0;
      const ground = islands.terrainHeight(state.x, state.z);
      state.y = ground + FLIGHT.gearHeight;
      state.x += sh * state.speed * dt;
      state.z += -ch * state.speed * dt;
      if (state.speed > 26 && pitchIn > 0.15) {
        state.onGround = false;
        state.y += 0.5;
        say('Airborne — gear up in spirit, anyway.');
      }
      if (state.speed < 2 && onRunway(state.x, state.z)) {
        state.fuel = Math.min(100, state.fuel + 6 * dt);
      }
    } else {
      state.x += sh * cp * state.speed * dt;
      state.z += -ch * cp * state.speed * dt;
      state.y += vy * dt;
    }

    // Ring check: fly through the glowing hoop, not past its edge.
    const ring = nextRing();
    if (ring) {
      const dx = state.x - ring.x;
      const dy = state.y - ring.y;
      const dz = state.z - ring.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < RING_RADIUS) {
        state.ringsCleared += 1;
        state.score += RING_SCORE;
        events |= EVENT_RING;
        say(state.ringsCleared === RINGS.length
          ? 'All six rings! Bring her home to Runway 09.'
          : `Ring ${state.ringsCleared} of ${RINGS.length} — +${RING_SCORE}. Next one glows gold.`);
      }
    }

    // Ground, water, rooftops: the world pushes back.
    if (!state.onGround) {
      const ground = islands.terrainHeight(state.x, state.z);
      if (state.y <= ground + FLIGHT.gearHeight) {
        if (onRunway(state.x, state.z)) {
          if (Math.abs(vy) <= 3.5 && state.speed <= 52) {
            state.y = ground + FLIGHT.gearHeight;
            state.vy = 0;
            state.onGround = true;
            if (state.ringsCleared === RINGS.length) {
              state.status = 'won';
              const timeBonus = Math.round(state.timeLeft * 2);
              const fuelBonus = Math.round(state.fuel * 3);
              state.score += LANDING_SCORE + timeBonus + fuelBonus;
              say(`Down safe — mail delivered! +${LANDING_SCORE} landing, +${timeBonus} time, +${fuelBonus} fuel.`);
              return events | EVENT_WIN;
            }
            events |= EVENT_LANDED;
            say(state.speed < 12 ? 'On the runway — refuelling while you sit still.' : 'Touch and go — throttle up and away.');
          } else {
            state.hull -= 45;
            if (state.hull <= 0) return events | crash('Hard landing — the Cendrawasih broke her back.');
            state.y = ground + 2.5;
            state.vy = 2.5;
            say('HARD LANDING — hull damaged. Fly her gentle now.');
          }
        } else if (islands.isWater(state.x, state.z)) {
          return events | crash('Ditched in the sea — the mail got wet.');
        } else if (state.speed > 18) {
          return events | crash('Came down in the rough — the field won.');
        } else {
          state.y = ground + FLIGHT.gearHeight;
          state.vy = 0;
          state.onGround = true;
          say('Down in a field — she will fly again. Throttle up.');
        }
      }
      // Rooftops over the city.
      for (const b of islands.blocks) {
        if (Math.abs(state.x - b.x) > b.w / 2 + 60 || Math.abs(state.z - b.z) > b.d / 2 + 60) continue;
        const roof = islands.terrainHeight(b.x, b.z) + b.h;
        if (Math.abs(state.x - b.x) < b.w / 2 + 2 && Math.abs(state.z - b.z) < b.d / 2 + 2 && state.y < roof + 1) {
          return events | crash('Clipped a rooftop over the city.');
        }
      }
    }

    if (Math.abs(state.x) > 3400 || Math.abs(state.z) > 3400) {
      if (state.messageAge > 8) say('Open sea ahead — the isles are behind you. Turn back.');
    }
    return events;
  }

  reset();
  return { state, reset, step, nextRing, onRunway };
}
