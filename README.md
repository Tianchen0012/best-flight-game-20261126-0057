[![best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Tianchen0012/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Tianchen0012/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

# Meridian Run — a valley flight game

Fly the **Kestrel-9**, a home-built single-seat jet, over a green valley with a
winding river, patchwork fields, two roads and Meridian Field's runway 09.
Thread glowing sky rings, skim the river low, and bring her home for a
landing — while fuel and hull damage turn every sortie into decisions.

## How to play

Open `game/index.html` in desktop Chrome (or serve `game/` with any static
server). No network, no build step, no libraries — plain vanilla JS + canvas 2D,
with all sound synthesised live in WebAudio.

| Control | Action |
| --- | --- |
| ↑ / ↓ or W / S | Pitch nose up / down |
| ← / → or A / D | Bank left / right (banking turns the plane) |
| Shift / Ctrl | Throttle up / down |
| Mouse | Steer like a stick (move to bank and pitch), wheel = throttle |
| C | Swap chase view / cockpit view |
| P | Pause |
| M | Mute |
| R | Restart the sortie |
| 1 / 2 / 3, Enter | Pick a mission on the title screen |

## Missions

1. **Ring Run** — thread 5 sky rings over the valley before the clock runs out.
2. **River Low Pass** — stay under 150 m over the river and thread 4 low rings.
3. **Runway Landing** — fly the approach rings, then touch down gently on
   runway 09. A hard touchdown damages the hull; a gentle one brings you home.

Fuel burns with throttle; an empty tank means gliding to the runway.
Damage builds on hard landings — at 100% the sortie is over.

## Files

- `game/index.html` — the page
- `game/js/main.js` — game loop, states, screenshot presets (`?shot=`)
- `game/js/flight.js` — flight model (speed, pitch, roll, fuel, damage)
- `game/js/terrain.js` — the valley, runway, river, roads, projection
- `game/js/render.js` — sky, terrain, rings, aircraft scene painting
- `game/js/aircraft.js` — the Kestrel-9, drawn in canvas
- `game/js/hud.js` — HUD, lit instruments, title / debrief / crash screens
- `game/js/missions.js` — the three sorties and scoring
- `game/js/audio.js` — synthesised engine, wind, chimes and alarms
- `game/js/input.js` — keyboard and mouse

All art, names and sounds are original. Nothing is copied from a commercial game.
