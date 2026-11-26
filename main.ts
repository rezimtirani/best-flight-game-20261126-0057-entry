// Cendrawasih Airlift — the hand-in program (Node 22, standard
// library only). It carries the game from this repository into
// /output exactly as the scorer expects: game/ and screenshots/
// copied over, then dossier.json written with the kit's vendored
// buildDossier, so the dossier the judge reads is byte for byte
// the one the library writes from those files.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in
// for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps, as the kit's reference/gate.json states
// them: the dossier text cap shapes the bytes, the rest refuse an
// entry the scorer would refuse outright.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function checkGameTree() {
  const index = join(here, 'game', 'index.html');
  if (!existsSync(index)) {
    throw new Error('game/index.html is missing — the game cannot be handed in without it');
  }
  const src = join(here, 'game', 'src');
  if (!existsSync(src)) {
    throw new Error('game/src is missing — the game modules live there');
  }
  const shots = join(here, 'screenshots');
  if (!existsSync(shots)) {
    throw new Error('screenshots/ is missing — take the four shots before handing in');
  }
}

function handIn() {
  checkGameTree();
  mkdirSync(out, { recursive: true });
  cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  if (existsSync(join(here, 'screenshots'))) {
    cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
  }
  const shots = readdirSync(join(out, 'screenshots'))
    .filter((name) => !name.startsWith('.'))
    .map((name) => ({ name, bytes: statSync(join(out, 'screenshots', name)).size }));
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`hand-in needs 3 or 4 screenshots, found ${shots.length}`);
  }
  for (const shot of shots) {
    if (shot.bytes > DOSSIER_CAPS.screenshots.max_bytes) {
      throw new Error(`screenshot ${shot.name} is ${shot.bytes} bytes, over the 256 KiB cap`);
    }
  }
  writeFileSync(join(out, 'dossier.json'), buildDossier(out, DOSSIER_CAPS));
  return shots;
}

const shots = handIn();
console.log(`handed in game/ + ${shots.length} screenshots, dossier.json written to ${out}`);
