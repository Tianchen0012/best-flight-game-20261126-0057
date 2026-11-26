// main.js — boots Meridian Run: the game loop, the state machine (title,
// flying, paused, debrief, crash, game over), keyboard/mouse wiring, and the
// ?shot= presets the screenshots are taken with.

import { FlightModel } from './flight.js';
import { MissionRunner, MISSIONS } from './missions.js';
import { renderScene } from './render.js';
import { drawHUD, drawInstruments, drawTitle, drawDebrief, drawCrash, drawGameOver, drawPaused } from './hud.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { RUNWAY } from './terrain.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

const input = new Input(canvas);
const audio = new AudioEngine();

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

let state = 'title'; // title | flying | paused | debrief | crash | over
let selectedMission = 0;
let mission = MISSIONS[0];
let plane = new FlightModel();
let runner = new MissionRunner(mission);
let view = 'chase'; // chase | cockpit
let crashReason = '';
let overReason = '';
let lastTime = performance.now();
let elapsed = 0;
let attractHeading = 0;
let alarmAt = 0;

function startMission(index) {
  mission = MISSIONS[index];
  selectedMission = index;
  plane = new FlightModel();
  plane.reset(mission.start.x, mission.start.z, mission.start.y);
  plane.heading = mission.start.heading;
  plane.speed = 62;
  runner = new MissionRunner(mission);
  state = 'flying';
  audio.start();
}

function startAttract() {
  // The title screen flies itself over the valley so the backdrop is alive.
  plane = new FlightModel();
  plane.reset(0, -400, 330);
  plane.speed = 58;
  plane.throttle = 0.5;
}

function crash(reason) {
  state = 'crash';
  crashReason = reason;
  audio.thud();
  audio.update(0, 0, true);
}

function endSortie(reason) {
  state = 'over';
  overReason = reason;
}

function applyShotPreset() {
  if (!shot) return;
  // Screenshot mode: hide the "click to fly" hint so the frame stays clean.
  const hint = document.getElementById('hint');
  if (hint) hint.style.display = 'none';
  audio.start();
  if (shot === 'flight') {
    // Chase view mid-flight: lined up on the first ring, dead ahead.
    startMission(0);
    plane.x = -160;
    plane.z = 200;
    plane.y = 300;
    plane.heading = 0;
    plane.speed = 78;
    plane.throttle = 0.66;
    plane.fuel = 78;
    runner.ringsPassed = 0;
    runner.score = 100;
  } else if (shot === 'runway') {
    // Low final approach onto runway 09, gear down in spirit, ring passed.
    startMission(2);
    plane.x = 4;
    plane.z = 1560;
    plane.y = 78;
    plane.heading = Math.PI;
    plane.pitch = -0.1;
    plane.speed = 52;
    plane.throttle = 0.42;
    plane.fuel = 61;
    runner.ringsPassed = 2;
    runner.ringIndex = 2;
    runner.score = 340;
  } else if (shot === 'cockpit') {
    // Cockpit view: instruments lit, river and fields ahead.
    view = 'cockpit';
    startMission(1);
    plane.x = 420;
    plane.z = 700;
    plane.y = 105;
    plane.heading = 0.06;
    plane.speed = 66;
    plane.throttle = 0.6;
    plane.fuel = 84;
    runner.score = 100;
    runner.ringsPassed = 1;
    runner.ringIndex = 1;
  } else if (shot === 'complete') {
    startMission(0);
    plane.x = 0;
    plane.z = 2900;
    plane.y = 300;
    plane.heading = 0;
    plane.speed = 70;
    plane.throttle = 0.6;
    runner.ringsPassed = 5;
    runner.ringIndex = 5;
    runner.score = 840;
    runner.timeLeft = 96;
    runner.done = true;
    runner.outcome = 'complete';
    state = 'debrief';
  }
}

function update(dt) {
  elapsed += dt;
  const now = performance.now();

  if (state === 'title') {
    // Attract mode: gentle circling flight behind the title.
    attractHeading += dt * 0.06;
    plane.heading = attractHeading;
    plane.roll = 0.35;
    plane.x += Math.sin(plane.heading) * plane.speed * dt;
    plane.z += Math.cos(plane.heading) * plane.speed * dt;
    plane.y = 330 + Math.sin(elapsed * 0.4) * 12;
    if (input.wasPressed('1')) selectedMission = 0;
    if (input.wasPressed('2')) selectedMission = 1;
    if (input.wasPressed('3')) selectedMission = 2;
    if (input.wasPressed('enter') || input.wasPressed(' ')) startMission(selectedMission);
    return;
  }

  if (state === 'paused') {
    if (input.wasPressed('p') || input.wasPressed('escape')) state = 'flying';
    return;
  }

  if (state === 'debrief') {
    if (input.wasPressed('n')) startMission((mission.id) % MISSIONS.length);
    if (input.wasPressed('r')) startMission(selectedMission);
    return;
  }

  if (state === 'crash' || state === 'over') {
    if (input.wasPressed('r')) startMission(selectedMission);
    return;
  }

  // Flying.
  if (input.wasPressed('p') || input.wasPressed('escape')) {
    state = 'paused';
    return;
  }
  if (input.wasPressed('c')) view = view === 'chase' ? 'cockpit' : 'chase';
  if (input.wasPressed('m')) audio.muted = !audio.muted;

  const events = [];
  plane.update(dt, input.flightInput(), events);
  runner.update(dt, plane, now, events);

  // Ground contact.
  if (plane.y <= 0) {
    plane.y = 0;
    const result = plane.touchGround(RUNWAY, plane.verticalSpeed);
    if (result === 'crash') {
      plane.damage = 100;
      crash('The Kestrel-9 hit the ground too hard.');
      return;
    }
    if (result === 'bounce') {
      plane.y = 6;
      plane.verticalSpeed = 3;
      plane.pitch = 0.08;
      audio.thud();
      events.push('bounce');
    } else {
      plane.grounded = true;
      plane.speed = Math.max(0, plane.speed - 28 * dt);
      plane.pitch = 0;
      plane.roll *= 0.9;
      if (plane.speed < 2) plane.onGround = true;
    }
  } else {
    plane.grounded = false;
  }

  if (plane.damage >= 100) {
    crash('Hull failure — the Kestrel-9 is done for.');
    return;
  }
  if (runner.done && runner.outcome === 'complete') {
    state = 'debrief';
    audio.fanfare();
    return;
  }
  if (runner.done && runner.outcome === 'timeout') {
    endSortie('Out of time — the sortie window closed.');
    return;
  }

  // Sounds for events.
  for (const e of events) {
    if (e === 'ring') audio.ringChime();
    if (e === 'stall' || e === 'fuel-out') audio.alarm();
    if (e === 'landed-early') {
      runner.message = 'TOO EARLY — fly the approach rings first';
      runner.messageUntil = now + 2000;
    }
  }
  if (plane.fuel < 25 && now - alarmAt > 4000) {
    alarmAt = now;
    audio.alarm();
  }
  audio.update(plane.throttle, plane.speed, plane.engineOut);
}

function draw() {
  const t = elapsed;
  renderScene(ctx, W, H, plane, runner.rings, runner.nextRing(), t, view);
  if (state === 'title') {
    drawTitle(ctx, W, H, t, selectedMission);
  } else {
    drawHUD(ctx, W, H, plane, mission, runner, t, view);
    if (view === 'cockpit') drawInstruments(ctx, W, H, plane, t);
    if (state === 'paused') drawPaused(ctx, W, H);
    if (state === 'debrief') drawDebrief(ctx, W, H, mission, runner, plane);
    if (state === 'crash') drawCrash(ctx, W, H, crashReason, runner, mission);
    if (state === 'over') drawGameOver(ctx, W, H, overReason, runner);
  }
}

// Title-screen mission picking with the mouse.
canvas.addEventListener('click', (e) => {
  audio.start();
  if (state !== 'title') return;
  const rect = canvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width) * W;
  const my = ((e.clientY - rect.top) / rect.height) * H;
  const cardW = 300;
  const gap = 26;
  const total = MISSIONS.length * cardW + (MISSIONS.length - 1) * gap;
  const startX = (W - total) / 2;
  for (let i = 0; i < MISSIONS.length; i++) {
    const x = startX + i * (cardW + gap);
    const y = H * 0.40;
    if (mx >= x && mx <= x + cardW && my >= y && my <= y + 150) {
      if (selectedMission === i) startMission(i);
      else selectedMission = i;
      return;
    }
  }
});

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  input.endFrame();
  requestAnimationFrame(frame);
}

startAttract();
applyShotPreset();
requestAnimationFrame(frame);
