// ─── Trail Renderer Module ─────────────────────────────────────────────────
// Ring buffer of positions per planet, rendered as fading lines

import * as THREE from 'three';
import state from './state.js';

const TrailRenderer = {
    trails: [],
    visible: false,
    bufferSize: 200,

    init() {
        // Trails will be created after celestial bodies are initialized
    },

    _createTrails() {
        if (this.trails.length > 0) return;
        if (!state.celestialBodies) return;

        state.celestialBodies.planets.forEach((planet) => {
            const positions = new Float32Array(this.bufferSize * 3);
            const drawPositions = new Float32Array(this.bufferSize * 3);

            const geom = new THREE.BufferGeometry();
            const posAttr = new THREE.BufferAttribute(drawPositions, 3);
            posAttr.setUsage(THREE.DynamicDrawUsage);
            geom.setAttribute('position', posAttr);
            geom.setDrawRange(0, 0);

            const mat = new THREE.LineBasicMaterial({
                color: 0x4a9eff,
                transparent: true,
                opacity: 0.3
            });

            const line = new THREE.Line(geom, mat);
            line.visible = this.visible;
            line.frustumCulled = false;
            state.scene.add(line);

            this.trails.push({
                line,
                positions,
                drawPositions,
                posAttr,
                head: 0,
                count: 0,
                planet
            });
        });
    },

    setVisible(v) {
        this.visible = v;
        this.trails.forEach(t => { t.line.visible = v; });
    },

    update() {
        if (this.trails.length === 0) {
            if (!this.visible) return;
            this._createTrails();
            return;
        }

        // Skip the entire update loop if trails are not visible
        if (!this.visible) return;

        const bufSize = this.bufferSize;

        for (let ti = 0; ti < this.trails.length; ti++) {
            const trail = this.trails[ti];
            const pos = trail.planet.mesh.position;
            const head = trail.head;

            trail.positions[head * 3] = pos.x;
            trail.positions[head * 3 + 1] = pos.y;
            trail.positions[head * 3 + 2] = pos.z;

            trail.head = (head + 1) % bufSize;
            if (trail.count < bufSize) trail.count++;

            const count = trail.count;
            const src = trail.positions;
            const dst = trail.drawPositions;

            for (let i = 0; i < count; i++) {
                const idx = (trail.head - count + i + bufSize) % bufSize;
                const di = i * 3;
                const si = idx * 3;
                dst[di] = src[si];
                dst[di + 1] = src[si + 1];
                dst[di + 2] = src[si + 2];
            }

            trail.posAttr.needsUpdate = true;
            trail.line.geometry.setDrawRange(0, count);
        }
    }
};

export default TrailRenderer;
