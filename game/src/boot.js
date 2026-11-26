// Boot and the one loop: the world is built from the seed, the
// flight model advances in fixed 1/60 s steps, and the renderer
// paints what is there. The game moves between four screens:
// title, play, paused and over (won or crashed).
//
// ?seed=N fixes the archipelago. ?shot=takeoff|ring|cockpit|landing
// (with &seed=N) stages that scene instead of running the loop,
// paints it twice and sets window.__shotReady for a screenshot.

import { STEP } from './settings.js';
import { createIslands } from './islands.js';
import { createFlight, EVENT_CRASH, EVENT_RING, EVENT_TIMEOUT, EVENT_WIN } from './flight.js';
import { createScene } from './render3d.js';
import { drawHud, drawOverScreen, drawPausedScreen, drawTitleScreen, drawWinScreen } from './hud.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const BEST_KEY = 'cendrawasih-best';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const ctx = canvas.getContext('2d');

const islands = createIslands(seed);
const flight = createFlight(islands);
const scene = createScene(islands);
const audio = createAudio();

let screen = 'title';
let view = 'chase';
let best = readBest();
let time = 0;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

function announce(message) {
  status.textContent = message;
}

function startGame() {
  flight.reset();
  screen = 'play';
  audio.unlock();
  announce('Flying. Six rings, then Runway 09.');
}

function endRun() {
  if (flight.state.score > best) {
    best = flight.state.score;
    saveBest(best);
  }
}

const input = createInput(canvas, {
  confirm() {
    if (screen === 'title' || screen === 'over' || screen === 'win') startGame();
    else if (screen === 'paused') screen = 'play';
  },
  pause() {
    if (screen === 'play') screen = 'paused';
    else if (screen === 'paused') screen = 'play';
  },
  toggleView() {
    view = view === 'chase' ? 'cockpit' : 'chase';
  },
  reset() {
    if (screen === 'play') flight.reset();
  },
});

function drawFrame() {
  const orbit = input.orbit();
  scene.drawScene(ctx, canvas.width, canvas.height, flight, view, time, orbit);
  if (screen === 'play' || screen === 'paused') {
    drawHud(ctx, canvas.width, canvas.height, flight, view, best, scene.ringScreen(flight, view, canvas.width, canvas.height, orbit));
  }
  if (screen === 'title') drawTitleScreen(ctx, canvas.width, canvas.height, best);
  else if (screen === 'paused') drawPausedScreen(ctx, canvas.width, canvas.height);
  else if (screen === 'win') drawWinScreen(ctx, canvas.width, canvas.height, flight);
  else if (screen === 'over') drawOverScreen(ctx, canvas.width, canvas.height, flight);
}

function runShot(name) {
  const staged = stageShot(name, flight, islands);
  view = staged.view;
  let painted = 0;
  function paint() {
    resize();
    const orbit = { yaw: 0, pitch: 0, zoom: 1 };
    scene.drawScene(ctx, canvas.width, canvas.height, flight, view, 1.2, orbit);
    drawHud(ctx, canvas.width, canvas.height, flight, view, best, scene.ringScreen(flight, view, canvas.width, canvas.height, orbit));
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let last = performance.now();
  let accumulator = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    time += Math.min((now - last) / 1000, MAX_FRAME);
    input.relax(1 / 60);
    if (screen === 'play') {
      while (accumulator >= STEP && screen === 'play') {
        const events = flight.step(STEP, input.read());
        accumulator -= STEP;
        if (events & EVENT_RING) audio.chime();
        if (events & EVENT_WIN) {
          screen = 'win';
          endRun();
          audio.chime();
        } else if (events & EVENT_CRASH) {
          screen = 'over';
          endRun();
          audio.thud();
        } else if (events & EVENT_TIMEOUT) {
          screen = 'over';
          endRun();
        }
      }
      audio.setEngine(flight.state.throttle, flight.state.speed);
    } else {
      accumulator = 0;
    }
    drawFrame();
  }

  // Leaving the tab pauses a running game rather than letting the
  // fuel burn unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') screen = 'paused';
  });

  window.addEventListener('resize', resize);
  resize();
  announce('Cendrawasih Airlift. Press Enter or click to fly.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
