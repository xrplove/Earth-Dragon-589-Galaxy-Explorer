# MyGalaxy

Interactive 3D solar system explorer built with Three.js. Fly between planets, measure distances, compare sizes, and learn about the solar system.

https://galaxy.alkhabaz.dev

## Features

- **All major bodies** — Sun, 8 planets, Pluto, 4 dwarf planets, 3 comets, 30+ moons
- **Real orbital mechanics** — Kepler solver with eccentricity, inclination, and ascending nodes
- **Guided tour** — 10-step narrated journey through the solar system
- **Size comparison** — overlay planets at true astronomical scale
- **Distance measurement** — click two bodies to measure in AU
- **Orbital trails** — visualize planet paths over time
- **Deep space** — zoom out far enough and galaxies appear
- **Minimap** — top-down view with camera indicator
- **Info panels** — tabbed details (overview, stats, moons) for every body
- **Post-processing** — bloom, lens flare, atmospheric glow
- **Search** — find any body instantly
- **Keyboard shortcuts** — number keys, speed controls, toggle effects
- **Preferences saved** — your settings persist across sessions

## Controls

| Input | Action |
|-------|--------|
| Click planet | Fly to it |
| Scroll | Zoom in/out |
| Drag | Orbit camera |
| 1-9 | Jump to planet |
| 0 | Return to Sun |
| Space | Play/pause |
| +/- | Speed up/slow down |
| T | Toggle trails |
| O | Toggle orbits |
| L | Toggle labels |
| G | Start guided tour |
| ? | Show all shortcuts |

## Run locally

```bash
git clone https://github.com/Ialkyyyy/MyGalaxy.git
cd MyGalaxy
# Open index.html — no build step needed
```

## Tech

Three.js (r170), vanilla JavaScript ES modules, custom GLSL shaders

## License

MIT
