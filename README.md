# MyGalaxy

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Interactive 3D solar system explorer built with Three.js. Fly between planets, measure distances, compare sizes, and learn about the solar system — from Mercury to the Kuiper belt.

**[Try it live](https://galaxy.alkhabaz.dev)**

## What's in it

**60+ celestial bodies** — the Sun, all 8 planets, Pluto, 4 dwarf planets, 30+ moons, and 3 comets (Halley, Hale-Bopp, NEOWISE). Each one has real orbital elements — eccentricity, inclination, ascending nodes — solved with a Kepler equation solver using Newton-Raphson iteration.

**Guided tour** — a 10-step narrated journey from the Sun to Pluto. Smooth fly-to animations, educational descriptions, and previous/next controls.

**Size comparison** — overlay planets at true astronomical scale in a separate view. Earth is 1x, Jupiter is 11.21x. Side-by-side rendering with an orthographic camera.

**Distance measurement** — click any two bodies to get the distance in AU, million km, and light-minutes.

**Deep space** — zoom out far enough and spiral galaxies, elliptical galaxies, and a black hole with an accretion disk fade into view.

**Ambient soundscape** — procedurally generated with the Web Audio API. Layered sine drones, LFO breathing, whoosh effects on fly-to, click sounds on selection. Zero audio files.

**Post-processing** — bloom, lens flare on the Sun, Fresnel atmosphere shaders with sunward brightening, animated corona with FBM noise, twinkling starfield with per-star phase variation.

**Info panels** — 3-tab detail view for every body (overview, statistics, moons). Fun facts, diameter, mass, gravity, orbital period, temperature, and more.

**Minimap** — top-down orthographic view with a camera indicator showing your position and heading. Fades out when you zoom beyond the solar system.

**Orbital trails** — ring-buffered position history rendered as fading lines. Toggle on/off.

## Controls

Click a planet to fly to it. Scroll to zoom. Drag to orbit the camera. Number keys 0–9 jump to specific bodies. Space pauses the simulation. +/- controls speed (1–365x). T for trails, O for orbits, L for labels, G for guided tour, ? for all shortcuts. Ctrl+F to search. Everything is saved to localStorage.

## Run locally

```bash
git clone https://github.com/Ialkyyyy/MyGalaxy.git
cd MyGalaxy
```

Open `index.html` in a browser — no build step needed. Or serve it:

```bash
python3 -m http.server 8000
```

Or use Docker:

```bash
docker build -t mygalaxy .
docker run -p 80:80 mygalaxy
```

## Tech stack

Three.js (r170), vanilla JavaScript ES modules, custom GLSL shaders, Web Audio API. No build tools, no framework — just modules loaded via import maps from CDN. 23 Vitest tests covering the orbital math.

## Contributing

PRs and issues are welcome. Fork it, make your changes, open a pull request.

## License

MIT
