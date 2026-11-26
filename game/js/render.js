// render.js — paints one frame of the valley: sky, sun, clouds, mountains,
// the field quilt, river, roads, runway, trees and the glowing mission rings,
// then the aircraft itself. The camera banks with the plane so turns feel real.

import {
  FIELD_COLORS,
  TREES,
  CLOUDS,
  ROADS,
  RUNWAY,
  RIVER_HALF_WIDTH,
  fieldColor,
  hash2,
  makeCamera,
  makeProjector,
  ridgeHeight,
  riverX,
} from './terrain.js';
import { drawJet, drawShadow } from './aircraft.js';

const BAND = 200; // world metres per ground band
const VIEW_DEPTH = 2600;

export function renderScene(ctx, W, H, plane, rings, nextRing, time, view) {
  const camera = makeCamera(plane, view === 'cockpit' ? 2 : 15, view === 'cockpit' ? 2.2 : 5, 0.45);
  const project = makeProjector(W, H, camera);
  const horizon = H * 0.46;
  const roll = plane.roll;

  ctx.save();
  // The world rolls a little with the bank; the aircraft and HUD stay level.
  ctx.translate(W / 2, H * 0.56);
  ctx.rotate(-roll * 0.28);
  ctx.translate(-W / 2, -H * 0.56);

  drawSky(ctx, W, H, horizon, plane, time);
  // Base ground colour below the horizon, so no sky or bare canvas shows
  // through where the field quilt does not reach (far edges, horizon line).
  ctx.fillStyle = '#6a9448';
  ctx.fillRect(0, horizon, W, H - horizon);
  drawClouds(ctx, project, W, H, horizon, time);
  drawMountains(ctx, W, H, horizon, plane.heading);
  drawGround(ctx, project, W, H, horizon, camera, plane);
  drawRunway(ctx, project, W, H, horizon, camera);
  drawRings(ctx, project, rings, nextRing, time);
  drawTrees(ctx, project, camera, plane);
  drawPlaneShadow(ctx, project, plane);
  ctx.restore();

  if (view === 'chase') {
    drawJet(ctx, W / 2, H * 0.66, 1.05, plane.roll, plane.throttle, time);
  } else {
    drawCockpitFrame(ctx, W, H, plane, time);
  }
}

function drawSky(ctx, W, H, horizon, plane, time) {
  const sunX = W * 0.78;
  const sunY = horizon - H * 0.24;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon + 60);
  sky.addColorStop(0, '#1d4e89');
  sky.addColorStop(0.45, '#5f9fd0');
  sky.addColorStop(0.8, '#a8cfe8');
  sky.addColorStop(1, '#d8ecf7');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, horizon + 80);

  // Sun with a soft halo.
  const halo = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 150);
  halo.addColorStop(0, 'rgba(255, 244, 200, 0.95)');
  halo.addColorStop(0.25, 'rgba(255, 226, 140, 0.55)');
  halo.addColorStop(1, 'rgba(255, 226, 140, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(sunX - 160, sunY - 160, 320, 320);
  ctx.fillStyle = '#fff6cf';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds(ctx, project, W, H, horizon, time) {
  ctx.save();
  for (const cloud of CLOUDS) {
    const cx = cloud.x + time * cloud.speed;
    const p = project(cx, cloud.y, cloud.z);
    if (!p || p.sy > horizon + 10) continue;
    const s = cloud.size * p.scale * 0.9;
    if (s < 4) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy, s, s * 0.32, 0, 0, Math.PI * 2);
    ctx.ellipse(p.sx - s * 0.55, p.sy + s * 0.06, s * 0.6, s * 0.24, 0, 0, Math.PI * 2);
    ctx.ellipse(p.sx + s * 0.55, p.sy + s * 0.05, s * 0.62, s * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMountains(ctx, W, H, horizon, heading) {
  // Two ridges: a far blue one and a nearer green one, both hugging the horizon.
  for (const layer of [1, 2]) {
    const base = layer === 1 ? horizon - 6 : horizon + 4;
    const color = layer === 1 ? '#7d9cc4' : '#5d7f56';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, horizon + 40);
    for (let x = 0; x <= W; x += 14) {
      const h = ridgeHeight(x, heading, layer) * (layer === 1 ? 1.15 : 0.55);
      ctx.lineTo(x, base - h);
    }
    ctx.lineTo(W, horizon + 40);
    ctx.closePath();
    ctx.fill();
  }
}

function drawGround(ctx, project, W, H, horizon, camera, plane) {
  // Ground bands from far to near. Bands are enumerated in both directions
  // from the camera, because the plane may head south as well as north;
  // the projection drops any band behind the camera.
  const zStart = Math.floor((camera.z - VIEW_DEPTH) / BAND) * BAND;
  const zEnd = camera.z + VIEW_DEPTH;
  const xStart = Math.floor((camera.x - 1700) / BAND) * BAND;
  const xEnd = camera.x + 1700;

  for (let z = zEnd; z >= zStart; z -= BAND) {
    const z0 = z - BAND;
    const z1 = z;
    for (let x = xStart; x < xEnd; x += BAND) {
      const ix = Math.round(x / BAND);
      const iz = Math.round(z0 / BAND);
      const a = project(x, 0, z0);
      const b = project(x + BAND, 0, z0);
      const c = project(x + BAND, 0, z1);
      const d = project(x, 0, z1);
      if (!a || !b || !c || !d) continue;
      if (Math.min(a.sy, b.sy, c.sy, d.sy) < horizon - 2) continue;
      ctx.fillStyle = fieldColor(ix, iz);
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.lineTo(c.sx, c.sy);
      ctx.lineTo(d.sx, d.sy);
      ctx.closePath();
      ctx.fill();
    }
    drawRiverBand(ctx, project, z0, z1, horizon);
    drawRoadBands(ctx, project, z0, z1, horizon);
  }
}

function groundStrip(ctx, project, x0, x1, z0, z1, horizon, color) {
  const a = project(x0, 0.4, z0);
  const b = project(x1, 0.4, z0);
  const c = project(x1, 0.4, z1);
  const d = project(x0, 0.4, z1);
  if (!a || !b || !c || !d) return;
  if (Math.min(a.sy, b.sy, c.sy, d.sy) < horizon - 2) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(a.sx, a.sy);
  ctx.lineTo(b.sx, b.sy);
  ctx.lineTo(c.sx, c.sy);
  ctx.lineTo(d.sx, d.sy);
  ctx.closePath();
  ctx.fill();
}

function drawRiverBand(ctx, project, z0, z1, horizon) {
  const rx0 = riverX(z0);
  const rx1 = riverX(z1);
  groundStrip(ctx, project, rx0 - RIVER_HALF_WIDTH, rx0 + RIVER_HALF_WIDTH, z0, z1, horizon, '#3f7fb8');
  groundStrip(ctx, project, rx1 - RIVER_HALF_WIDTH, rx1 + RIVER_HALF_WIDTH, z0, z1, horizon, '#3f7fb8');
  // A lighter sparkle line down the middle of the water. Near the camera the
  // projection blows up, so the sparkle is skipped there (and its width capped).
  const m0 = project(rx0, 0.6, z0);
  const m1 = project(rx1, 0.6, z1);
  if (m0 && m1 && m0.sy > horizon && m1.sy > horizon && m0.scale < 2) {
    ctx.strokeStyle = 'rgba(190,225,255,0.7)';
    ctx.lineWidth = Math.min(18, Math.max(1, 14 * m0.scale));
    ctx.beginPath();
    ctx.moveTo(m0.sx, m0.sy);
    ctx.lineTo(m1.sx, m1.sy);
    ctx.stroke();
  }
}

function drawRoadBands(ctx, project, z0, z1, horizon) {
  for (const road of ROADS) {
    if (road.axis === 'x') {
      if (road.at >= z0 && road.at <= z1) {
        const a = project(-2400, 0.4, road.at - road.halfWidth);
        const b = project(2400, 0.4, road.at - road.halfWidth);
        const c = project(2400, 0.4, road.at + road.halfWidth);
        const d = project(-2400, 0.4, road.at + road.halfWidth);
        if (a && b && c && d) {
          ctx.fillStyle = '#5a5a60';
          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy);
          ctx.lineTo(b.sx, b.sy);
          ctx.lineTo(c.sx, c.sy);
          ctx.lineTo(d.sx, d.sy);
          ctx.closePath();
          ctx.fill();
        }
      }
    } else {
      groundStrip(ctx, project, road.at - road.halfWidth, road.at + road.halfWidth, z0, z1, horizon, '#5a5a60');
    }
  }
}

function drawRunway(ctx, project, W, H, horizon, camera) {
  // Every band of the strip; the projection drops bands behind the camera,
  // so the strip reads from either approach direction.
  for (let z = RUNWAY.z1; z >= RUNWAY.z0; z -= BAND) {
    const z0 = Math.max(RUNWAY.z0, z - BAND);
    const z1 = z;
    groundStrip(ctx, project, RUNWAY.x0, RUNWAY.x1, z0, z1, horizon, '#3c3f45');
    // Centreline dashes, one per band.
    const mid = (z0 + z1) / 2;
    groundStrip(ctx, project, -1.6, 1.6, mid - 22, mid + 22, horizon, '#f2f2e8');
  }
  // Threshold bars and the runway number at both ends of the strip.
  for (const nz of [RUNWAY.z0 + 60, RUNWAY.z1 - 60]) {
    const t = project(0, 0.6, nz);
    if (t && t.sy > horizon) {
      ctx.fillStyle = '#f2f2e8';
      ctx.font = `bold ${Math.max(10, 18 * t.scale)}px Verdana, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('09', t.sx, t.sy);
    }
  }
  // A couple of hangars beside the threshold.
  for (const hx of [-70, 75]) {
    const h0 = project(hx - 26, 0, 40);
    const h1 = project(hx + 26, 0, 40);
    const h2 = project(hx + 26, 16, 40);
    const h3 = project(hx - 26, 16, 40);
    if (h0 && h1 && h2 && h3 && h0.sy > horizon) {
      ctx.fillStyle = '#8a7f74';
      ctx.beginPath();
      ctx.moveTo(h0.sx, h0.sy);
      ctx.lineTo(h1.sx, h1.sy);
      ctx.lineTo(h2.sx, h2.sy);
      ctx.lineTo(h3.sx, h3.sy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#5d5248';
      ctx.beginPath();
      ctx.moveTo(h3.sx, h3.sy);
      ctx.lineTo(h2.sx, h2.sy);
      ctx.lineTo((h2.sx + h1.sx) / 2, (h2.sy + h1.sy) / 2 + (h0.sy - h3.sy) * 0.4);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawRings(ctx, project, rings, nextRing, time) {
  for (const ring of rings) {
    const p = project(ring.x, ring.y, ring.z);
    if (!p) continue;
    const r = ring.r * p.scale;
    if (r < 2) continue;
    const isNext = ring === nextRing;
    const pulse = isNext ? 0.75 + Math.sin(time * 5) * 0.25 : 0.55;
    ctx.save();
    ctx.shadowColor = isNext ? '#37e0ff' : '#ff9a2e';
    ctx.shadowBlur = isNext ? 26 : 12;
    ctx.strokeStyle = isNext
      ? `rgba(80, 220, 255, ${pulse})`
      : `rgba(255, 154, 46, ${pulse})`;
    ctx.lineWidth = Math.max(3, r * 0.16);
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy, r, r * 0.94, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Inner chevron ring so a passed ring still reads as a ring.
    ctx.strokeStyle = ring.passed
      ? 'rgba(120,255,140,0.8)'
      : `rgba(255,255,255,${0.35 * pulse})`;
    ctx.lineWidth = Math.max(1.5, r * 0.05);
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy, r * 0.72, r * 0.68, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawTrees(ctx, project, camera, plane) {
  ctx.save();
  for (const tree of TREES) {
    const p = project(tree.x, 0, tree.z);
    if (!p || p.depth < 10 || p.depth > 1000) continue;
    const h = tree.size * p.scale * 2.2;
    if (h < 2.5) continue;
    ctx.fillStyle = tree.tone > 0.5 ? '#2f5d23' : '#3c7030';
    ctx.beginPath();
    ctx.moveTo(p.sx, p.sy - h);
    ctx.lineTo(p.sx - h * 0.45, p.sy);
    ctx.lineTo(p.sx + h * 0.45, p.sy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5d4028';
    ctx.fillRect(p.sx - h * 0.06, p.sy - h * 0.12, h * 0.12, h * 0.12);
  }
  ctx.restore();
}

function drawPlaneShadow(ctx, project, plane) {
  if (plane.y > 260) return;
  const p = project(plane.x, 0.4, plane.z);
  if (!p) return;
  const alpha = Math.max(0, 0.32 - plane.y * 0.0011);
  drawShadow(ctx, p.sx, p.sy, 26 * p.scale * 3, alpha);
}

// Cockpit view: canopy frame, nose, and a lit instrument panel across the
// bottom of the screen (the dials themselves are drawn by hud.js).
function drawCockpitFrame(ctx, W, H, plane, time) {
  // Nose of the Kestrel-9 ahead of the canopy.
  ctx.save();
  ctx.translate(W / 2, H * 0.72);
  ctx.rotate(plane.roll * 0.4);
  const noseGrad = ctx.createLinearGradient(0, -40, 0, 90);
  noseGrad.addColorStop(0, '#d8d8de');
  noseGrad.addColorStop(1, '#8a8a94');
  ctx.fillStyle = noseGrad;
  ctx.beginPath();
  ctx.moveTo(0, -46);
  ctx.quadraticCurveTo(26, 10, 30, 92);
  ctx.lineTo(-30, 92);
  ctx.quadraticCurveTo(-26, 10, 0, -46);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(-2, -40, 4, 26);
  ctx.restore();

  // Canopy frame: dark pillars and a top bar.
  ctx.fillStyle = '#14181d';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W * 0.16, H * 0.34);
  ctx.lineTo(W * 0.1, H * 0.34);
  ctx.lineTo(0, H * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(W, 0);
  ctx.lineTo(W * 0.84, H * 0.34);
  ctx.lineTo(W * 0.9, H * 0.34);
  ctx.lineTo(W, H * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(0, 0, W, 14);
}
