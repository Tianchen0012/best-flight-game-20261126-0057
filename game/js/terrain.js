// terrain.js — the valley the game flies over: fields, river, roads, the runway
// at Meridian Field, trees, clouds and distant mountains. Everything is generated
// from a fixed seed, so the same valley shows up on every run. It also owns the
// perspective projection from world coordinates to screen coordinates.

export function hash2(ix, iz) {
  let h = (ix * 374761393 + iz * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = Math.imul(h, 1274126177);
  h = (h ^ (h >> 16)) >>> 0;
  return h / 4294967295;
}

// Field colours: ploughed gold, pasture green, meadow, crop rows.
export const FIELD_COLORS = [
  '#5d8a3c', '#6f9a45', '#7fae52', '#a8a04e', '#c2a44a',
  '#8a6f3c', '#4f7a34', '#9db356', '#b59a4e', '#679640',
];

export function fieldColor(ix, iz) {
  return FIELD_COLORS[Math.floor(hash2(ix, iz) * FIELD_COLORS.length)];
}

// The river winds north through the valley, east of the airfield.
export function riverX(z) {
  return 420 + 260 * Math.sin(z * 0.0009) + 140 * Math.sin(z * 0.0023 + 1.7);
}

export const RIVER_HALF_WIDTH = 34;

// Two roads cross the valley: one east-west, one north-south.
export const ROADS = [
  { axis: 'x', at: 1500, halfWidth: 7 }, // east-west road at z = 1500
  { axis: 'z', at: -650, halfWidth: 7 }, // north-south road at x = -650
];

// Meridian Field runway: a strip along the z axis, threshold at z = 0.
export const RUNWAY = {
  x0: -20,
  x1: 20,
  z0: 0,
  z1: 950,
  contains(x, z) {
    return x >= this.x0 && x <= this.x1 && z >= this.z0 && z <= this.z1;
  },
};

// Scattered trees, kept clear of the runway, the river and the roads.
export const TREES = (() => {
  const trees = [];
  for (let i = 0; i < 260; i++) {
    const x = (hash2(i, 11) - 0.5) * 3600;
    const z = hash2(i, 23) * 3400 - 300;
    if (Math.abs(x) < 60 && z > -100 && z < 1050) continue; // runway clear zone
    if (Math.abs(x - riverX(z)) < 60) continue; // out of the river
    if (Math.abs(z - 1500) < 16 || Math.abs(x + 650) < 16) continue; // off the roads
    trees.push({ x, z, size: 5 + hash2(i, 37) * 9, tone: hash2(i, 41) });
  }
  return trees;
})();

// Clouds drift slowly above the valley.
export const CLOUDS = (() => {
  const clouds = [];
  for (let i = 0; i < 16; i++) {
    clouds.push({
      x: (hash2(i, 51) - 0.5) * 5200,
      y: 420 + hash2(i, 53) * 320,
      z: hash2(i, 59) * 3600 - 400,
      size: 90 + hash2(i, 61) * 160,
      speed: 3 + hash2(i, 67) * 4,
    });
  }
  return clouds;
})();

// Camera: position, heading and pitch. project() maps a world point to the
// screen, or returns null when it is behind the camera.
export function makeCamera(plane, distance, height, pitchFactor) {
  const fx = Math.sin(plane.heading);
  const fz = Math.cos(plane.heading);
  return {
    x: plane.x - fx * distance,
    z: plane.z - fz * distance,
    y: plane.y + height,
    heading: plane.heading,
    pitch: plane.pitch * pitchFactor,
    fx,
    fz,
  };
}

export function makeProjector(width, height, camera) {
  const focal = (height * 0.5) / Math.tan((62 * Math.PI) / 360);
  const cx = width / 2;
  const horizon = height * 0.46;
  const sinH = Math.sin(camera.heading);
  const cosH = Math.cos(camera.heading);
  const tanPitch = Math.tan(camera.pitch);
  return function project(x, y, z) {
    const dx = x - camera.x;
    const dz = z - camera.z;
    const depth = dx * sinH + dz * cosH; // forward distance
    if (depth < 4) return null;
    const lateral = dx * cosH - dz * sinH; // right distance
    const vertical = y - camera.y - depth * tanPitch;
    const scale = focal / depth;
    return {
      sx: cx + lateral * scale,
      sy: horizon - vertical * scale,
      scale,
      depth,
    };
  };
}

// Distant ridge line for the horizon, shaped by the heading so it turns with you.
export function ridgeHeight(screenX, heading, seed) {
  const t = screenX * 0.004 + heading * 2.2 + seed * 7.3;
  return (
    34 * Math.abs(Math.sin(t * 1.3 + seed)) +
    22 * Math.abs(Math.sin(t * 2.7 + 1.1)) +
    10 * Math.abs(Math.sin(t * 5.1 + 2.4))
  );
}
