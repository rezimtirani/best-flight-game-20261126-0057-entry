# Cendrawasih Airlift — Ring Run over the Nusa Isles

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/rezimtirani/best-flight-game-20261126-0057-entry/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/rezimtirani/best-flight-game-20261126-0057-entry/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A complete flight game that runs in a desktop browser from static files, with no network request. You are the courier pilot of the *Cendrawasih*, a little prop-plane flying the mail run over the Nusa Isles: a volcanic archipelago with a coastal city, a runway, and six glowing rings hung over the bay, the volcano crater and the main island. Fly all six rings in order, mind the fuel, then bring her home to Runway 09 before the clock runs out.

## How to play

Serve `game/` and open it in desktop Chrome (or open `game/index.html` from any static server):

```sh
node serve.ts
# open http://localhost:8080
```

| Control | What it does |
|---|---|
| W / S or ↑ / ↓ | Pitch up / down |
| A / D or ← / → | Bank and turn |
| Shift / Ctrl | Throttle up / down |
| Space | Flaps — slower flight, lower stall speed |
| C | Chase view / cockpit view |
| Mouse drag | Orbit the chase camera · wheel zooms |
| P | Pause · R — back to the runway |

A gentle touchdown on the runway wins the run: rings are worth 100 points each, the landing 500, plus bonuses for time and fuel left. The sea, the rooftops and a hard landing do not forgive. Landing on the runway with the tanks low refuels while you sit still — a touch-and-go costs nothing but time.

## What is in the game

- `game/src/islands.js` — the archipelago: seeded terrain, volcano, lake, city and the ring course
- `game/src/flight.js` — the flight model and the mission: lift, stall, fuel, damage, rings, landing
- `game/src/render3d.js` — sky, sea, terrain, city, runway, rings, clouds and the aircraft, in one perspective projection; chase view and a lit cockpit with working instruments
- `game/src/hud.js` — altitude, speed and heading, compass, fuel, clock, score, ring tally and the screens
- `game/src/pilot.js` — the autopilot that flies the screenshot scenes (and proves the course can be flown)
- `game/src/shots.js` — the four staged scenes behind `?shot=takeoff|ring|cockpit|landing&seed=7`
- `game/src/input.js` — keyboard and mouse · `game/src/audio.js` — synthesised engine, chimes and thuds
- `game/src/boot.js` — the loop, the screens, the fixed 1/60 s step
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with `vendor/makefun-game.ts`

## Screenshots

Four real renders of the game's own code, taken in headless Chrome at 1280×480: takeoff from Runway 09, the third ring over the north sea, the cockpit view at the volcano ring, and the final approach home. The first by name is the cover.

## License

MIT — see [LICENSE](LICENSE).

<!-- SPDX-License-Identifier: MIT -->
