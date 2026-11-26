// missions.js — the three sorties. Each mission places its own rings and
// landing goal, watches the aircraft, and hands out score. Missions are
// independent of the renderer: they only read the flight model.

import { RUNWAY, riverX } from './terrain.js';

export const MISSIONS = [
  {
    id: 1,
    name: 'Ring Run',
    brief: 'Thread all 5 sky rings over the valley. Smooth turns beat fast ones.',
    buildRings() {
      const rings = [];
      for (let i = 0; i < 5; i++) {
        rings.push({
          x: (i % 2 === 0 ? -1 : 1) * (160 + i * 55),
          y: 300 + (i % 3) * 60,
          z: 700 + i * 620,
          r: 30,
          passed: false,
        });
      }
      return rings;
    },
    start: { x: 0, z: -600, y: 320, heading: 0 },
  },
  {
    id: 2,
    name: 'River Low Pass',
    brief: 'Stay low over the river — under 150 m — and thread 4 low rings. Watch the trees.',
    buildRings() {
      const rings = [];
      for (let i = 0; i < 4; i++) {
        const z = 900 + i * 550;
        rings.push({ x: riverX(z), y: 95, z, r: 26, passed: false });
      }
      return rings;
    },
    start: { x: riverX(300), z: 300, y: 110, heading: 0 },
  },
  {
    id: 3,
    name: 'Runway Landing',
    brief: 'Bring the Kestrel-9 home. Touch down gently on Meridian Field runway 09.',
    buildRings() {
      return [
        { x: 0, y: 260, z: 1500, r: 30, passed: false },
        { x: 0, y: 170, z: 1150, r: 30, passed: false },
      ];
    },
    start: { x: 0, z: 2400, y: 320, heading: Math.PI },
    landing: true,
  },
];

export class MissionRunner {
  constructor(mission) {
    this.mission = mission;
    this.rings = mission.buildRings();
    this.ringIndex = 0;
    this.score = 0;
    this.ringsPassed = 0;
    this.timeLeft = mission.landing ? 240 : 180; // seconds
    this.done = false;
    this.outcome = null; // 'complete' | 'timeout'
    this.message = '';
    this.messageUntil = 0;
  }

  nextRing() {
    return this.rings[this.ringIndex] ?? null;
  }

  remainingRings() {
    return this.rings.length - this.ringIndex;
  }

  // Returns events for the main loop: 'ring', 'complete', 'timeout', 'landed'.
  update(dt, plane, now, events) {
    if (this.done) return events;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.done = true;
      this.outcome = 'timeout';
      events.push('timeout');
      return events;
    }

    const ring = this.nextRing();
    if (ring) {
      const dx = plane.x - ring.x;
      const dy = plane.y - ring.y;
      const dz = plane.z - ring.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < ring.r) {
        ring.passed = true;
        this.ringIndex++;
        this.ringsPassed++;
        const bonus = 100 + Math.max(0, Math.round(plane.speed));
        this.score += bonus;
        this.message = `RING ${this.ringsPassed}/${this.rings.length}  +${bonus}`;
        this.messageUntil = now + 2200;
        events.push('ring');
        if (this.ringIndex >= this.rings.length && !this.mission.landing) {
          this.finish(now, events);
        }
      } else if (this.mission.id === 2 && plane.y > 150 && dist < 260) {
        this.message = 'TOO HIGH — stay under 150 m over the river';
        this.messageUntil = now + 1200;
      }
    }

    // Mission 3: a gentle touchdown on the runway after the approach rings
    // completes the sortie; the flight model decides what counts as gentle.
    if (this.mission.landing && plane.grounded) {
      if (this.ringIndex >= this.rings.length || this.ringsPassed >= 1) {
        this.finish(now, events, true);
      } else {
        events.push('landed-early');
      }
    }
    return events;
  }

  finish(now, events, landed = false) {
    this.done = true;
    this.outcome = 'complete';
    const timeBonus = Math.max(0, Math.round(this.timeLeft)) * 2;
    this.score += timeBonus;
    this.message = landed ? 'LANDED — welcome home, pilot' : 'MISSION COMPLETE';
    this.messageUntil = now + 4000;
    events.push('complete');
  }
}

export { RUNWAY };
