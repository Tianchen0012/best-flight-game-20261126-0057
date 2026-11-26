// aircraft.js — draws the Kestrel-9, our original single-seat valley jet,
// in chase view: seen from behind and slightly above, nose toward the horizon.
// Everything is canvas paths and gradients — no image files.

export function drawJet(ctx, x, y, scale, roll, throttle, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(roll);
  ctx.scale(scale, scale);

  // Engine glow and contrails trail behind the tail (down-screen in chase view).
  const glow = 0.5 + throttle * 0.5;
  const flameLen = 26 + throttle * 30 + Math.sin(time * 31) * 4;
  const flame = ctx.createLinearGradient(0, 52, 0, 52 + flameLen);
  flame.addColorStop(0, `rgba(255, 190, 90, ${0.85 * glow})`);
  flame.addColorStop(0.5, `rgba(255, 110, 40, ${0.5 * glow})`);
  flame.addColorStop(1, 'rgba(255, 80, 20, 0)');
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(-7, 50);
  ctx.lineTo(0, 52 + flameLen);
  ctx.lineTo(7, 50);
  ctx.closePath();
  ctx.fill();

  // Wingtip contrails.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-72, 26);
  ctx.lineTo(-86, 92);
  ctx.moveTo(72, 26);
  ctx.lineTo(86, 92);
  ctx.stroke();

  // Main wings — swept, slightly back.
  const wingGrad = ctx.createLinearGradient(-80, 0, 80, 0);
  wingGrad.addColorStop(0, '#c94f2e');
  wingGrad.addColorStop(0.5, '#e8703f');
  wingGrad.addColorStop(1, '#c94f2e');
  ctx.fillStyle = wingGrad;
  ctx.beginPath();
  ctx.moveTo(-14, -6);
  ctx.lineTo(-82, 26);
  ctx.lineTo(-78, 34);
  ctx.lineTo(-10, 18);
  ctx.lineTo(10, 18);
  ctx.lineTo(78, 34);
  ctx.lineTo(82, 26);
  ctx.lineTo(14, -6);
  ctx.closePath();
  ctx.fill();

  // Wingtip lights: red port, green starboard.
  ctx.fillStyle = '#ff2d2d';
  ctx.beginPath();
  ctx.arc(-80, 29, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2dff5e';
  ctx.beginPath();
  ctx.arc(80, 29, 3.4, 0, Math.PI * 2);
  ctx.fill();

  // Tailplanes.
  ctx.fillStyle = '#b8432a';
  ctx.beginPath();
  ctx.moveTo(-8, 34);
  ctx.lineTo(-34, 52);
  ctx.lineTo(-32, 57);
  ctx.lineTo(-6, 44);
  ctx.lineTo(6, 44);
  ctx.lineTo(32, 57);
  ctx.lineTo(34, 52);
  ctx.lineTo(8, 34);
  ctx.closePath();
  ctx.fill();

  // Vertical stabiliser.
  ctx.fillStyle = '#a83a24';
  ctx.beginPath();
  ctx.moveTo(-5, 30);
  ctx.lineTo(-3, 6);
  ctx.lineTo(3, 6);
  ctx.lineTo(5, 30);
  ctx.closePath();
  ctx.fill();

  // Fuselage — tapered toward the nose.
  const bodyGrad = ctx.createLinearGradient(-10, 0, 10, 0);
  bodyGrad.addColorStop(0, '#8f8f98');
  bodyGrad.addColorStop(0.5, '#e8e8ee');
  bodyGrad.addColorStop(1, '#7c7c86');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(0, -58);
  ctx.quadraticCurveTo(9, -30, 10, 0);
  ctx.quadraticCurveTo(10, 34, 7, 52);
  ctx.lineTo(-7, 52);
  ctx.quadraticCurveTo(-10, 34, -10, 0);
  ctx.quadraticCurveTo(-9, -30, 0, -58);
  ctx.closePath();
  ctx.fill();

  // Canopy — teal glass with a bright sky reflection.
  const canopyGrad = ctx.createLinearGradient(0, -46, 0, -14);
  canopyGrad.addColorStop(0, '#9fe8ff');
  canopyGrad.addColorStop(0.55, '#2a7fa8');
  canopyGrad.addColorStop(1, '#123a52');
  ctx.fillStyle = canopyGrad;
  ctx.beginPath();
  ctx.moveTo(0, -48);
  ctx.quadraticCurveTo(7, -32, 6, -16);
  ctx.quadraticCurveTo(0, -11, -6, -16);
  ctx.quadraticCurveTo(-7, -32, 0, -48);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-3, -42);
  ctx.lineTo(2, -24);
  ctx.stroke();

  // Nose stripe and squadron mark.
  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(-2, -56, 4, 12);
  ctx.fillStyle = '#20303c';
  ctx.font = 'bold 9px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('K-9', 0, 46);

  // Engine nozzles.
  ctx.fillStyle = '#2b2f36';
  ctx.beginPath();
  ctx.arc(-4, 52, 3.6, 0, Math.PI * 2);
  ctx.arc(4, 52, 3.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Soft shadow the aircraft throws on the ground when flying low.
export function drawShadow(ctx, sx, sy, radius, alpha) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.fillStyle = `rgba(10, 20, 10, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(sx, sy, radius, radius * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
