// Cendrawasih Airlift — shared constants for the flight game.
// One place holds every number the world, the flight model and the
// renderer agree on, so tuning the game means editing this file only.

export const STEP = 1 / 60;
export const WORLD_HALF = 3000;
export const SEA_LEVEL = 0;

// The mission: six rings over the Nusa Isles, then back to the runway.
export const TIME_LIMIT = 360;
export const RING_SCORE = 100;
export const LANDING_SCORE = 500;
export const RING_RADIUS = 26;

// The course the rings hang on: east over the bay, north past the
// east isle, over the volcano crater, west across the main island,
// then south to set up the final approach from the west.
export const RINGS = [
  { x: 1400, y: 200, z: 400 },
  { x: 1950, y: 260, z: -250 },
  { x: 950, y: 330, z: -1150 },
  { x: 200, y: 390, z: -300 },
  { x: -950, y: 250, z: 300 },
  { x: -400, y: 160, z: 1450 },
];

// The runway on the main island's south coast, pointing east (heading 90),
// so the final approach runs in low over the beach instead of the dome.
export const RUNWAY = {
  x0: 250,
  x1: 850,
  z: 1400,
  y: 6,
  headingDeg: 90,
};

// The city the runway serves, and the volcano that rules the skyline.
export const CITY = { x: 620, z: 660, radius: 260 };
export const VOLCANO = { x: 200, z: -300, peak: 260, slope: 0.5 };
export const LAKE = { x: -520, z: 620, radius: 190, depth: 26 };

// Island bumps that raise the archipelago out of the sea.
export const ISLANDS = [
  { x: 0, z: 0, radius: 1500, peak: 120 },
  { x: -1450, z: -1450, radius: 700, peak: 120 },
  { x: 1850, z: 950, radius: 620, peak: 95 },
  { x: -1850, z: 1450, radius: 420, peak: 60 },
  { x: 1500, z: -1700, radius: 380, peak: 55 },
];

// Flight model numbers (metres, seconds, radians).
export const FLIGHT = {
  stallClean: 28,
  stallFlaps: 22,
  minSpeed: 18,
  maxSpeed: 95,
  cruiseSpeed: 62,
  finalSpeed: 42,
  pitchRate: 0.55,
  rollRate: 1.6,
  maxPitchUp: 0.55,
  maxPitchDown: -0.45,
  maxRoll: 1.05,
  fuelDrainBase: 0.05,
  fuelDrainThrottle: 0.2,
  gearHeight: 1.2,
  gravity: 9.81,
};

// Colours, kept in one style: dawn light over a tropical sea.
export const COLORS = {
  skyTop: '#2f6fd0',
  skyHorizon: '#cfe8f7',
  sun: '#fff3c4',
  seaDeep: '#0b4f8a',
  seaShallow: '#2fa8a0',
  sand: '#d9c27a',
  grass: '#69a84f',
  forest: '#3d7a35',
  rock: '#8a7f74',
  snow: '#f2f5f7',
  runway: '#3a3f46',
  runwayMark: '#f5f5f0',
  planeCream: '#f6ead2',
  planeTeal: '#0f766e',
  planeRed: '#c2410c',
  ringNext: '#fbbf24',
  ringDone: '#34d399',
  ringFuture: '#67e8f9',
  hudAmber: '#fbbf24',
  hudGreen: '#4ade80',
  panelDark: '#1c2430',
};
