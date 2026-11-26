// flight.js — the flight model: speed, pitch, roll, heading, fuel and damage.
// Pure numbers, no drawing. Units are metres, metres/second and radians; the HUD
// converts to knots, feet and degrees for display.

export const KNOTS = 1.94384;
export const FEET = 3.28084;

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? v : v;
}

export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export class FlightModel {
  constructor() {
    this.reset(0, 0, 350);
  }

  reset(x, z, altitude) {
    this.x = x;
    this.z = z;
    this.y = altitude; // metres above ground
    this.heading = 0; // 0 = north (+z), radians, clockwise
    this.pitch = 0; // nose up positive
    this.roll = 0; // right wing down positive
    this.speed = 62; // m/s
    this.throttle = 0.62; // 0..1
    this.verticalSpeed = 0;
    this.fuel = 100; // percent
    this.damage = 0; // percent
    this.engineOut = false;
    this.onGround = false;
    this.grounded = false;
  }

  // input: { pitchUp, pitchDown, rollLeft, rollRight, throttleUp, throttleDown,
  //          mouseSteer, mouseX, mouseY } — mouseX/mouseY in -1..1 from screen centre.
  update(dt, input, events) {
    const MAX_SPEED = 118;
    const STALL_SPEED = 26;

    if (input.throttleUp) this.throttle = clamp(this.throttle + dt * 0.45, 0, 1);
    if (input.throttleDown) this.throttle = clamp(this.throttle - dt * 0.45, 0, 1);
    if (input.mouseSteer && typeof input.wheelDelta === 'number' && input.wheelDelta !== 0) {
      this.throttle = clamp(this.throttle - input.wheelDelta * 0.0012, 0, 1);
      input.wheelDelta = 0;
    }

    // Pitch: arrows / W,S plus mouse (mouse up = nose down, like a stick).
    let pitchTarget = 0;
    if (input.pitchUp) pitchTarget += 0.42;
    if (input.pitchDown) pitchTarget -= 0.42;
    if (input.mouseSteer) pitchTarget += clamp(-input.mouseY * 0.55, -0.5, 0.5);
    const pitchRate = this.speed > STALL_SPEED ? 1.6 : 0.9;
    this.pitch += clamp(pitchTarget - this.pitch, -pitchRate * dt, pitchRate * dt);
    this.pitch = clamp(this.pitch, -0.55, 0.55);

    // Roll: arrows / A,D plus mouse (mouse right = bank right).
    let rollTarget = 0;
    if (input.rollLeft) rollTarget -= 0.85;
    if (input.rollRight) rollTarget += 0.85;
    if (input.mouseSteer) rollTarget += clamp(input.mouseX * 1.0, -0.9, 0.9);
    const rollRate = 2.4;
    this.roll += clamp(rollTarget - this.roll, -rollRate * dt, rollRate * dt);
    this.roll = clamp(this.roll, -1.15, 1.15);

    // A banked turn changes heading; steeper bank and more speed turn faster.
    const turnRate = -this.roll * clamp(this.speed / 60, 0.25, 1.6) * 0.55;
    this.heading = wrapAngle(this.heading + turnRate * dt);

    // Speed chases the throttle setting; drag grows with pitch and bank.
    const targetSpeed = this.engineOut ? 0 : this.throttle * MAX_SPEED;
    const drag = 1 + Math.abs(this.pitch) * 1.4 + Math.abs(this.roll) * 0.7;
    const accel = (targetSpeed - this.speed) / (3.2 * drag);
    this.speed = Math.max(0, this.speed + accel * dt);

    // Climb / sink: pitch trades speed for altitude; below stall speed we sink.
    let climb = Math.sin(this.pitch) * this.speed;
    if (this.speed < STALL_SPEED) {
      climb -= (STALL_SPEED - this.speed) * 0.9;
      if (!this.stalled) events.push('stall');
      this.stalled = true;
    } else {
      this.stalled = false;
    }
    this.verticalSpeed = climb;
    this.y += climb * dt;

    // Move forward along the heading.
    const forward = Math.cos(this.pitch) * this.speed;
    this.x += Math.sin(this.heading) * forward * dt;
    this.z += Math.cos(this.heading) * forward * dt;

    // Fuel burns with throttle; empty tank kills the engine.
    if (!this.engineOut && this.speed > 1) {
      this.fuel -= dt * (0.22 + this.throttle * 0.55);
      if (this.fuel <= 0) {
        this.fuel = 0;
        this.engineOut = true;
        events.push('fuel-out');
      }
    }
    return events;
  }

  // Called when the aircraft touches terrain. Returns 'crash' | 'landed' | 'bounce'.
  touchGround(runway, verticalSpeed) {
    const onRunway = runway && runway.contains(this.x, this.z);
    const gentle = verticalSpeed > -4.5 && Math.abs(this.roll) < 0.35 && this.speed < 55;
    if (onRunway && gentle) return 'landed';
    if (onRunway && verticalSpeed > -9 && Math.abs(this.roll) < 0.5) {
      this.damage = Math.min(100, this.damage + 18);
      return 'bounce';
    }
    return 'crash';
  }

  knots() {
    return this.speed * KNOTS;
  }

  feet() {
    return this.y * FEET;
  }

  headingDegrees() {
    let d = (this.heading * 180) / Math.PI;
    d = ((d % 360) + 360) % 360;
    return d;
  }
}
