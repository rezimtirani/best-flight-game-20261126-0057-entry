// The HUD and the screens: altitude, speed and heading up top,
// fuel, clock, score and rings beside them, a compass strip, the
// next-ring arrow, and the title, pause, win and crash screens.
// Drawn in screen space over the 3D scene, in the same amber and
// green the instruments use, so the whole game reads as one cockpit.

import { RINGS } from './settings.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10, 18, 28, 0.62)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function readout(ctx, x, y, label, value, unit) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText(label, x, y);
  ctx.fillStyle = '#e8f6e8';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(value, x, y + 28);
  ctx.fillStyle = '#9fb4c4';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(unit, x + ctx.measureText(value).width + 6, y + 28);
}

function formatClock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function drawHud(ctx, W, H, flight, view, best, ringHint) {
  const s = flight.state;
  const headingDeg = Math.round(((s.heading * 180) / Math.PI + 360) % 360);
  const speedKt = Math.round(s.speed * 1.944);
  const altFt = Math.round(s.y * 3.281);

  // Top-left: the three numbers a pilot never stops reading.
  panel(ctx, 14, 12, 300, 62);
  readout(ctx, 26, 30, 'ALTITUDE', String(altFt), 'FT');
  readout(ctx, 122, 30, 'SPEED', String(speedKt), 'KT');
  readout(ctx, 216, 30, 'HEADING', String(headingDeg).padStart(3, '0'), '°');

  // Top-right: score, clock, fuel and the ring tally.
  panel(ctx, W - 314, 12, 300, 62);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('SCORE', W - 226, 30);
  ctx.fillStyle = '#e8f6e8';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(String(s.score), W - 226, 58);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('TIME', W - 150, 30);
  ctx.fillStyle = s.timeLeft < 60 ? '#ef4444' : '#e8f6e8';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(formatClock(s.timeLeft), W - 150, 58);
  ctx.fillStyle = s.fuel < 20 ? '#ef4444' : '#4ade80';
  ctx.fillRect(W - 128, 22, 100 * (s.fuel / 100), 10);
  ctx.strokeStyle = 'rgba(251,191,36,0.5)';
  ctx.strokeRect(W - 128.5, 21.5, 101, 11);
  ctx.fillStyle = '#9fb4c4';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(`FUEL ${Math.round(s.fuel)}%`, W - 78, 46);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText(`RINGS ${s.ringsCleared}/${RINGS.length}`, W - 78, 64);

  // Compass strip across the top centre (chase view only; the
  // cockpit panel carries its own compass).
  if (view !== 'cockpit') {
    ctx.fillStyle = 'rgba(10, 18, 28, 0.62)';
    ctx.fillRect(W / 2 - 150, 12, 300, 26);
    ctx.fillStyle = '#e8eef4';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let d = -60; d <= 60; d += 15) {
      const deg = Math.round((headingDeg + d + 360) % 360);
      const label = deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : String(deg);
      ctx.fillText(label, W / 2 + d * 2, 25);
    }
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(W / 2 - 6, 38);
    ctx.lineTo(W / 2 + 6, 38);
    ctx.lineTo(W / 2, 46);
    ctx.closePath();
    ctx.fill();
  }

  // The next ring, pointed at when it is off-screen.
  if (ringHint && s.status === 'flying') {
    const { x, y, dist, visible } = ringHint;
    if (!visible) {
      const cx = Math.max(30, Math.min(W - 30, x));
      const cy = Math.max(90, Math.min(H - 30, y));
      const ang = Math.atan2(y - H / 2, x - W / 2);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-10, -11);
      ctx.lineTo(-10, 11);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(dist)} m`, cx, cy + 26);
    } else {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`NEXT RING ${Math.round(dist)} m`, x, y - 46);
    }
  }

  // Throttle bar, bottom-right, and the mini attitude ball.
  ctx.fillStyle = 'rgba(10, 18, 28, 0.62)';
  ctx.fillRect(W - 44, H - 130, 24, 110);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(W - 40, H - 34 - s.throttle * 96, 16, s.throttle * 96);
  ctx.fillStyle = '#9fb4c4';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THR', W - 32, H - 12);
  const ballX = 56;
  const ballY = H - 66;
  const ballR = 34;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(ballX, ballY);
  ctx.rotate(-s.roll);
  ctx.translate(0, s.pitch * ballR * 1.2);
  ctx.fillStyle = '#3b82c4';
  ctx.fillRect(-ballR, -ballR * 2, ballR * 2, ballR * 2);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-ballR, 0, ballR * 2, ballR * 2);
  ctx.fillStyle = '#f5f5f0';
  ctx.fillRect(-ballR, -2, ballR * 2, 4);
  ctx.restore();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(ballX - 10, ballY);
  ctx.lineTo(ballX + 10, ballY);
  ctx.lineTo(ballX, ballY + 7);
  ctx.closePath();
  ctx.fill();

  // Stall warning, flashing red over the middle of the screen.
  if (s.stalled && s.status === 'flying' && Math.sin(Date.now() / 90) > 0) {
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STALL — NOSE DOWN, THROTTLE UP', W / 2, H * 0.3);
  }

  // The pilot's message, fading as it ages, kept low so it never
  // collides with the next-ring label above it.
  if (s.message && s.messageAge < 5) {
    ctx.globalAlpha = Math.min(1, 5 - s.messageAge);
    ctx.fillStyle = '#fef9c3';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(s.message, W / 2, H * 0.9);
    ctx.globalAlpha = 1;
  }

  // Controls, bottom-left, on a dark pill so they read over any ground.
  if (view !== 'cockpit') {
    ctx.fillStyle = 'rgba(10, 18, 28, 0.55)';
    ctx.fillRect(96, H - 34, 560, 22);
    ctx.fillStyle = 'rgba(232, 238, 244, 0.95)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('W/S pitch · A/D bank · Shift/Ctrl throttle · Space flaps · C cockpit · P pause · R reset', 104, H - 18);
  }
}

function dimScreen(ctx, W, H) {
  ctx.fillStyle = 'rgba(6, 12, 20, 0.66)';
  ctx.fillRect(0, 0, W, H);
}

function bigTitle(ctx, W, title, y) {
  ctx.fillStyle = '#fef9c3';
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, W / 2, y);
}

function bodyLines(ctx, W, lines, y) {
  ctx.fillStyle = '#e8eef4';
  ctx.font = '17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  lines.forEach((line, i) => ctx.fillText(line, W / 2, y + i * 26));
}

export function drawTitleScreen(ctx, W, H, best) {
  dimScreen(ctx, W, H);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('A COURIER RUN OVER THE NUSA ISLES', W / 2, H * 0.2);
  bigTitle(ctx, W, 'CENDRAWASIH AIRLIFT', H * 0.2 + 64);
  bodyLines(ctx, W, [
    'Six glowing rings stand between you and the mail depot. Fly them in order,',
    'mind the fuel, then bring her home to Runway 09 before the clock runs out.',
    '',
    'W / S — pitch up and down      A / D — bank and turn      Shift / Ctrl — throttle',
    'Space — flaps for slow flight      C — cockpit view      Mouse — look around',
    '',
    'A gentle touchdown on the runway wins the run. The sea and the rooftops do not forgive.',
  ], H * 0.2 + 104);
  if (best > 0) {
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(`Best score so far: ${best}`, W / 2, H * 0.2 + 104 + 8 * 26);
  }
  ctx.fillStyle = '#fef9c3';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('Press Enter or click to fly', W / 2, H - 60);
}

export function drawPausedScreen(ctx, W, H) {
  dimScreen(ctx, W, H);
  bigTitle(ctx, W, 'PAUSED', H * 0.4);
  bodyLines(ctx, W, ['Press P or click to keep flying.'], H * 0.4 + 44);
}

export function drawWinScreen(ctx, W, H, flight) {
  const s = flight.state;
  dimScreen(ctx, W, H);
  bigTitle(ctx, W, 'MAIL DELIVERED!', H * 0.3);
  bodyLines(ctx, W, [
    `Six rings, one runway, and the Cendrawasih home in one piece.`,
    '',
    `Score ${s.score}   ·   Rings 6/6   ·   Time left ${Math.round(s.timeLeft)} s   ·   Fuel ${Math.round(s.fuel)}%`,
    '',
    'Press Enter or click to fly the run again.',
  ], H * 0.3 + 56);
}

export function drawOverScreen(ctx, W, H, flight) {
  const s = flight.state;
  dimScreen(ctx, W, H);
  const title = s.status === 'timeout' ? 'OUT OF TIME' : 'DOWN SHE GOES';
  bigTitle(ctx, W, title, H * 0.3);
  bodyLines(ctx, W, [
    s.crashReason || 'The clock ran out over the isles.',
    '',
    `Score ${s.score}   ·   Rings ${s.ringsCleared}/${RINGS.length}`,
    '',
    'Press Enter or click to fly again.',
  ], H * 0.3 + 56);
}
