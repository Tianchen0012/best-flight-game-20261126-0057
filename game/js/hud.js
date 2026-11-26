// hud.js — the heads-up display, the lit instruments, and the full-screen
// states: title, mission complete, crash and game over. All canvas drawing.

import { FEET, KNOTS } from './flight.js';
import { MISSIONS } from './missions.js';

const PANEL = 'rgba(8, 18, 28, 0.72)';
const PANEL_EDGE = 'rgba(120, 200, 255, 0.55)';
const TEXT = '#e8f4ff';
const AMBER = '#ffb347';
const CYAN = '#5fd8ff';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PANEL;
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
}

function label(ctx, text, x, y, size, color = TEXT, align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

export function drawHUD(ctx, W, H, plane, mission, runner, time, view = 'chase') {
  const alt = Math.max(0, Math.round(plane.feet()));
  const spd = Math.round(plane.knots());
  const hdg = Math.round(plane.headingDegrees());

  // Top-left: altitude, speed, heading.
  panel(ctx, 16, 14, 300, 92);
  label(ctx, 'ALT', 30, 38, 12, '#9fc4dd');
  label(ctx, `${alt.toLocaleString('en-US')} FT`, 30, 66, 24);
  label(ctx, 'SPD', 168, 38, 12, '#9fc4dd');
  label(ctx, `${spd} KT`, 168, 66, 24);
  label(ctx, 'HDG', 30, 98, 12, '#9fc4dd');
  label(ctx, `${String(hdg).padStart(3, '0')}°`, 76, 98, 16, CYAN);
  label(ctx, `V/S ${plane.verticalSpeed >= 0 ? '+' : ''}${Math.round(plane.verticalSpeed * FEET / 60)} FPM`, 150, 98, 13, '#9fc4dd');

  // Top-right: mission, score, rings, time.
  panel(ctx, W - 316, 14, 300, 92);
  label(ctx, mission.name.toUpperCase(), W - 302, 38, 13, AMBER);
  label(ctx, `SCORE ${runner.score}`, W - 302, 66, 22);
  label(ctx, `RINGS ${runner.ringsPassed}/${runner.rings.length}`, W - 302, 98, 14, CYAN);
  label(ctx, `TIME ${Math.max(0, Math.ceil(runner.timeLeft))}s`, W - 178, 98, 14, runner.timeLeft < 30 ? '#ff6b5e' : TEXT);

  // Centre reticle + next-ring readout.
  const ring = runner.nextRing();
  ctx.strokeStyle = 'rgba(95, 216, 255, 0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.42, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W / 2 - 22, H * 0.42);
  ctx.lineTo(W / 2 - 8, H * 0.42);
  ctx.moveTo(W / 2 + 8, H * 0.42);
  ctx.lineTo(W / 2 + 22, H * 0.42);
  ctx.moveTo(W / 2, H * 0.42 - 22);
  ctx.lineTo(W / 2, H * 0.42 - 8);
  ctx.moveTo(W / 2, H * 0.42 + 8);
  ctx.lineTo(W / 2, H * 0.42 + 22);
  ctx.stroke();
  if (ring) {
    const dx = ring.x - plane.x;
    const dy = ring.y - plane.y;
    const dz = ring.z - plane.z;
    const dist = Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));
    label(ctx, `NEXT RING  ${dist} m`, W / 2, H * 0.42 - 34, 15, CYAN, 'center');
  } else if (mission.landing) {
    label(ctx, 'CLEARED TO LAND — RUNWAY 09', W / 2, H * 0.42 - 34, 15, '#7dff8a', 'center');
  }

  // Bottom-left: fuel and damage bars. In cockpit view the lit instruments
  // show fuel already, so these panels stay out of the way there.
  if (view !== 'cockpit') {
    panel(ctx, 16, H - 96, 340, 82);
    bar(ctx, 30, H - 78, 272, 16, plane.fuel / 100, plane.fuel < 25 ? '#ff6b5e' : '#ffb347', 'FUEL');
    bar(ctx, 30, H - 44, 272, 16, 1 - plane.damage / 100, plane.damage > 60 ? '#ff6b5e' : '#7dff8a', 'HULL');
    label(ctx, `${Math.round(plane.fuel)}%`, 312, H - 64, 13, plane.fuel < 25 ? '#ff6b5e' : TEXT, 'left');
    label(ctx, `${Math.round(plane.damage)}% DMG`, 312, H - 30, 13, plane.damage > 60 ? '#ff6b5e' : TEXT, 'left');

    // Bottom-right: throttle.
    panel(ctx, W - 236, H - 96, 220, 82);
    label(ctx, 'THROTTLE', W - 222, H - 70, 12, '#9fc4dd');
    bar(ctx, W - 222, H - 60, 192, 14, plane.throttle, plane.engineOut ? '#ff6b5e' : CYAN, '');
    label(ctx, plane.engineOut ? 'ENGINE OUT' : `${Math.round(plane.throttle * 100)}%`, W - 222, H - 30, 15, plane.engineOut ? '#ff6b5e' : TEXT);
  }

  // Warnings.
  let warnY = H - 130;
  if (plane.fuel < 25 && !plane.engineOut) warn(ctx, W, warnY, 'LOW FUEL', time);
  if (plane.engineOut) warn(ctx, W, warnY, 'ENGINE OUT — GLIDE TO THE RUNWAY', time);
  if (plane.y < 60 && plane.speed > 40) warn(ctx, W, warnY - 34, 'PULL UP', time);
  if (plane.stalled) warn(ctx, W, warnY - 34, 'STALL — NOSE DOWN, ADD THROTTLE', time);

  // Transient mission message.
  if (runner.message && time * 1000 < runner.messageUntil) {
    label(ctx, runner.message, W / 2, H * 0.30, 26, '#7dff8a', 'center');
  }
}

function bar(ctx, x, y, w, h, frac, color, tag) {
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
  if (tag) label(ctx, tag, x, y - 6, 11, '#9fc4dd');
}

function warn(ctx, W, y, text, time) {
  if (Math.sin(time * 8) < -0.2) return; // blink
  label(ctx, `⚠ ${text}`, W / 2, y, 22, '#ff6b5e', 'center');
}

// --- Lit instruments (cockpit view panel) ---------------------------------

export function drawInstruments(ctx, W, H, plane, time) {
  const panelY = H - 168;
  ctx.fillStyle = 'rgba(10, 16, 22, 0.92)';
  ctx.fillRect(0, panelY, W, 168);
  ctx.fillStyle = '#1d2833';
  ctx.fillRect(0, panelY, W, 4);

  const cy = panelY + 84;
  drawAttitude(ctx, W / 2 - 300, cy, 66, plane);
  drawDial(ctx, W / 2 - 140, cy, 58, plane.knots(), 0, 260, 'KT', 'AIRSPEED');
  drawDial(ctx, W / 2 + 20, cy, 58, plane.feet(), 0, 6000, 'FT', 'ALTITUDE');
  drawCompass(ctx, W / 2 + 180, cy, plane.headingDegrees());
  drawFuelGauge(ctx, W / 2 + 330, cy, plane);
}

function drawAttitude(ctx, x, y, r, plane) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.rotate(-plane.roll);
  const pitchPx = plane.pitch * r * 1.4;
  ctx.fillStyle = '#2f7fc4';
  ctx.fillRect(-r, -r + pitchPx, r * 2, r);
  ctx.fillStyle = '#7a5a33';
  ctx.fillRect(-r, pitchPx, r * 2, r);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, pitchPx);
  ctx.lineTo(r, pitchPx);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  for (const off of [-28, 28]) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, pitchPx + off);
    ctx.lineTo(r * 0.5, pitchPx + off);
    ctx.stroke();
  }
  ctx.restore();
  // Fixed wings marker.
  ctx.strokeStyle = '#ffb347';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - r - 6, y);
  ctx.lineTo(x - 12, y);
  ctx.moveTo(x + 12, y);
  ctx.lineTo(x + r + 6, y);
  ctx.stroke();
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  label(ctx, 'ATT', x, y + r + 16, 11, '#9fc4dd', 'center');
}

function drawDial(ctx, x, y, r, value, min, max, unit, name) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#0d141b';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 2;
  ctx.stroke();
  const frac = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = -Math.PI * 0.75 + frac * Math.PI * 1.5;
  ctx.strokeStyle = '#ffb347';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(angle) * (r - 8), Math.sin(angle) * (r - 8));
  ctx.stroke();
  ctx.fillStyle = TEXT;
  ctx.font = 'bold 17px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.round(value)), 0, 6);
  ctx.fillStyle = '#9fc4dd';
  ctx.font = 'bold 10px Verdana, sans-serif';
  ctx.fillText(unit, 0, r - 12);
  ctx.restore();
  label(ctx, name, x, y + r + 16, 11, '#9fc4dd', 'center');
}

function drawCompass(ctx, x, y, heading) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#0d141b';
  ctx.beginPath();
  ctx.arc(0, 0, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.clip();
  const points = [['N', 0], ['E', 90], ['S', 180], ['W', 270]];
  for (const [name, deg] of points) {
    const rel = ((deg - heading + 540) % 360) - 180;
    const px = (rel / 90) * 58;
    if (Math.abs(px) > 58) continue;
    ctx.fillStyle = name === 'N' ? '#ff6b5e' : TEXT;
    ctx.font = 'bold 15px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, px, -18);
  }
  ctx.strokeStyle = '#ffb347';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -58);
  ctx.lineTo(0, -40);
  ctx.stroke();
  ctx.restore();
  label(ctx, `${String(Math.round(heading)).padStart(3, '0')}°`, x, y + 78, 13, CYAN, 'center');
  label(ctx, 'HEADING', x, y + 94, 11, '#9fc4dd', 'center');
}

function drawFuelGauge(ctx, x, y, plane) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#0d141b';
  ctx.beginPath();
  ctx.arc(0, 0, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 2;
  ctx.stroke();
  const frac = plane.fuel / 100;
  ctx.strokeStyle = frac < 0.25 ? '#ff6b5e' : '#7dff8a';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, 0, 44, -Math.PI * 0.75, -Math.PI * 0.75 + frac * Math.PI * 1.5);
  ctx.stroke();
  ctx.fillStyle = TEXT;
  ctx.font = 'bold 17px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(plane.fuel)}%`, 0, 6);
  ctx.restore();
  label(ctx, 'FUEL', x, y + 78, 11, '#9fc4dd', 'center');
}

// --- Full-screen states ----------------------------------------------------

function dim(ctx, W, H, alpha = 0.62) {
  ctx.fillStyle = `rgba(6, 14, 22, ${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

export function drawTitle(ctx, W, H, time, selected) {
  dim(ctx, W, H, 0.45);
  label(ctx, 'MERIDIAN RUN', W / 2, H * 0.20, 64, '#ffffff', 'center');
  label(ctx, 'a valley flight game  •  fly the Kestrel-9', W / 2, H * 0.20 + 42, 18, CYAN, 'center');
  label(ctx, 'Choose your sortie — click it or press 1, 2 or 3', W / 2, H * 0.34, 17, TEXT, 'center');

  const cardW = 300;
  const gap = 26;
  const total = MISSIONS.length * cardW + (MISSIONS.length - 1) * gap;
  const startX = (W - total) / 2;
  MISSIONS.forEach((m, i) => {
    const x = startX + i * (cardW + gap);
    const y = H * 0.40;
    const hot = selected === i;
    ctx.fillStyle = hot ? 'rgba(95, 216, 255, 0.22)' : PANEL;
    ctx.strokeStyle = hot ? CYAN : PANEL_EDGE;
    ctx.lineWidth = hot ? 3 : 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, 150, 10);
    ctx.fill();
    ctx.stroke();
    label(ctx, `${i + 1}  ${m.name.toUpperCase()}`, x + 18, y + 34, 19, hot ? CYAN : TEXT);
    wrapText(ctx, m.brief, x + 18, y + 62, cardW - 36, 15, '#cfe3f2');
    label(ctx, hot ? '▶ press Enter to fly' : 'click to select', x + 18, y + 128, 13, hot ? AMBER : '#9fc4dd');
  });

  label(ctx, 'ARROWS / WASD — pitch & bank     SHIFT / CTRL — throttle     MOUSE — steer, wheel — throttle', W / 2, H * 0.68, 15, TEXT, 'center');
  label(ctx, 'C — cockpit view     M — mute     P — pause     R — restart', W / 2, H * 0.68 + 26, 15, '#9fc4dd', 'center');
  label(ctx, 'Fly the rings, mind your fuel, bring her home.', W / 2, H * 0.68 + 56, 15, AMBER, 'center');
}

function wrapText(ctx, text, x, y, maxW, size, color) {
  ctx.fillStyle = color;
  ctx.font = `${size}px Verdana, sans-serif`;
  ctx.textAlign = 'left';
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += size + 6;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, yy);
}

export function drawDebrief(ctx, W, H, mission, runner, plane) {
  dim(ctx, W, H, 0.66);
  label(ctx, 'MISSION COMPLETE', W / 2, H * 0.30, 52, '#7dff8a', 'center');
  label(ctx, `${mission.name}  •  ${mission.id === 3 ? 'Kestrel-9 is home' : 'all rings flown'}`, W / 2, H * 0.30 + 40, 18, CYAN, 'center');
  panel(ctx, W / 2 - 210, H * 0.40, 420, 150);
  label(ctx, `SCORE  ${runner.score}`, W / 2, H * 0.40 + 48, 30, TEXT, 'center');
  label(ctx, `Rings ${runner.ringsPassed}/${runner.rings.length}    Fuel left ${Math.round(plane.fuel)}%    Hull ${Math.round(100 - plane.damage)}%`, W / 2, H * 0.40 + 84, 15, '#cfe3f2', 'center');
  label(ctx, `Time left ${Math.max(0, Math.ceil(runner.timeLeft))}s`, W / 2, H * 0.40 + 114, 15, '#cfe3f2', 'center');
  const next = MISSIONS[(mission.id) % MISSIONS.length];
  label(ctx, `N — next sortie: ${next.name}      R — fly this one again`, W / 2, H * 0.62, 17, AMBER, 'center');
}

export function drawCrash(ctx, W, H, reason, runner, mission) {
  dim(ctx, W, H, 0.66);
  label(ctx, 'CRASHED', W / 2, H * 0.32, 56, '#ff6b5e', 'center');
  label(ctx, reason, W / 2, H * 0.32 + 42, 19, TEXT, 'center');
  label(ctx, `Score ${runner.score}  •  Rings ${runner.ringsPassed}/${runner.rings.length}`, W / 2, H * 0.48, 18, '#cfe3f2', 'center');
  label(ctx, 'R — fly again', W / 2, H * 0.58, 18, AMBER, 'center');
}

export function drawGameOver(ctx, W, H, reason, runner) {
  dim(ctx, W, H, 0.66);
  label(ctx, 'SORTIE OVER', W / 2, H * 0.32, 52, AMBER, 'center');
  label(ctx, reason, W / 2, H * 0.32 + 42, 19, TEXT, 'center');
  label(ctx, `Score ${runner.score}`, W / 2, H * 0.48, 18, '#cfe3f2', 'center');
  label(ctx, 'R — fly again', W / 2, H * 0.58, 18, AMBER, 'center');
}

export function drawPaused(ctx, W, H) {
  dim(ctx, W, H, 0.5);
  label(ctx, 'PAUSED', W / 2, H * 0.45, 48, TEXT, 'center');
  label(ctx, 'P — resume', W / 2, H * 0.45 + 40, 17, '#9fc4dd', 'center');
}
