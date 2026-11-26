// input.js — keyboard and mouse state. Arrow keys / WASD fly the plane,
// Shift/Ctrl (or the mouse wheel) work the throttle, C swaps the camera,
// M mutes, P pauses. The mouse steers like a stick when it moves.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseX = 0; // -1..1 from screen centre
    this.mouseY = 0;
    this.mouseSteer = false;
    this.mouseActive = false;
    this.wheelDelta = 0;
    this.pressed = new Set(); // keys pressed since last consume
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.key.toLowerCase());
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouseY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      this.mouseActive = true;
      this.mouseSteer = true;
    });
    canvas.addEventListener('mouseleave', () => {
      this.mouseSteer = false;
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.wheelDelta += e.deltaY;
    }, { passive: false });
    canvas.addEventListener('mousedown', () => {
      this.mouseSteer = true;
    });
  }

  down(key) {
    return this.keys.has(key);
  }

  // True once for each physical press; callers consume it each frame.
  wasPressed(key) {
    return this.pressed.has(key);
  }

  endFrame() {
    this.pressed.clear();
    this.wheelDelta = 0;
  }

  // The flight model's view of the controls.
  flightInput() {
    return {
      pitchUp: this.down('arrowup') || this.down('w'),
      pitchDown: this.down('arrowdown') || this.down('s'),
      rollLeft: this.down('arrowleft') || this.down('a'),
      rollRight: this.down('arrowright') || this.down('d'),
      throttleUp: this.down('shift'),
      throttleDown: this.down('control'),
      mouseSteer: this.mouseSteer,
      mouseX: this.mouseX,
      mouseY: this.mouseY,
      wheelDelta: this.wheelDelta,
    };
  }
}
