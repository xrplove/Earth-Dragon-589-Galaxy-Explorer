// ─── Deep Space Module ─────────────────────────────────────────────────────
// LOD-based layers that reveal as camera zooms out

import * as THREE from 'three';
import state from './state.js';

function createGlowTexture(size, r, g, b) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
    grad.addColorStop(0.15, `rgba(${r},${g},${b},0.6)`);
    grad.addColorStop(0.5, `rgba(${r},${g},${b},0.15)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
}

function createSpiralGalaxyTexture(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const half = size / 2;

    const coreGrad = ctx.createRadialGradient(half, half, 0, half, half, half * 0.3);
    coreGrad.addColorStop(0, 'rgba(255,240,200,0.9)');
    coreGrad.addColorStop(0.5, 'rgba(255,200,120,0.3)');
    coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = coreGrad;
    ctx.fillRect(0, 0, size, size);

    ctx.globalCompositeOperation = 'lighter';
    for (let arm = 0; arm < 2; arm++) {
        const offset = arm * Math.PI;
        for (let i = 0; i < 200; i++) {
            const t = i / 200;
            const angle = offset + t * Math.PI * 3;
            const r = t * half * 0.85;
            const x = half + Math.cos(angle) * r;
            const y = half + Math.sin(angle) * r;
            const dotR = 1.5 + (1 - t) * 3;
            const alpha = (1 - t) * 0.4;
            ctx.beginPath();
            ctx.arc(x, y, dotR, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200,220,255,${alpha})`;
            ctx.fill();
        }
    }
    ctx.globalCompositeOperation = 'source-over';
    return new THREE.CanvasTexture(c);
}

function createEllipticalGalaxyTexture(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half * 0.7);
    grad.addColorStop(0, 'rgba(255,230,180,0.8)');
    grad.addColorStop(0.3, 'rgba(255,200,140,0.3)');
    grad.addColorStop(0.7, 'rgba(180,160,140,0.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(half, half, half * 0.7, half * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(c);
}

function createBlackHoleTexture(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const half = size / 2;

    ctx.beginPath();
    ctx.arc(half, half, half * 0.6, 0, Math.PI * 2);
    const ringGrad = ctx.createRadialGradient(half, half, half * 0.2, half, half, half * 0.7);
    ringGrad.addColorStop(0, 'rgba(0,0,0,0)');
    ringGrad.addColorStop(0.3, 'rgba(255,140,40,0.6)');
    ringGrad.addColorStop(0.5, 'rgba(255,200,80,0.8)');
    ringGrad.addColorStop(0.7, 'rgba(255,100,30,0.4)');
    ringGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ringGrad;
    ctx.fillRect(0, 0, size, size);

    ctx.globalCompositeOperation = 'destination-out';
    const centerGrad = ctx.createRadialGradient(half, half, 0, half, half, half * 0.2);
    centerGrad.addColorStop(0, 'rgba(0,0,0,1)');
    centerGrad.addColorStop(0.7, 'rgba(0,0,0,0.8)');
    centerGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = centerGrad;
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'source-over';

    return new THREE.CanvasTexture(c);
}

function createCosmicWebTexture(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    ctx.strokeStyle = 'rgba(100,140,200,0.08)';
    ctx.lineWidth = 2;

    for (let i = 0; i < 30; i++) {
        ctx.beginPath();
        let x = Math.random() * size;
        let y = Math.random() * size;
        ctx.moveTo(x, y);
        for (let s = 0; s < 5; s++) {
            x += (Math.random() - 0.5) * size * 0.3;
            y += (Math.random() - 0.5) * size * 0.3;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    for (let i = 0; i < 15; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 8);
        grad.addColorStop(0, 'rgba(150,180,255,0.15)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - 8, y - 8, 16, 16);
    }

    return new THREE.CanvasTexture(c);
}

const DeepSpace = {
    layers: [],
    starLabels: [],
    _inited: false,

    init() {
        if (this._inited) return;
        this._inited = true;

        this._createOortCloud();
        this._createNearbyStars();
        this._createMilkyWay();
        this._createDeepField();

        this.layers.forEach(layer => {
            layer.group.visible = false;
        });
    },

    _createOortCloud() {
        const group = new THREE.Group();
        const count = 800;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const r = 500 + Math.random() * 700;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);
            const b = 0.3 + Math.random() * 0.3;
            colors[i * 3] = b;
            colors[i * 3 + 1] = b;
            colors[i * 3 + 2] = b + Math.random() * 0.1;
        }

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const mat = new THREE.PointsMaterial({
            size: 1.2, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.5
        });
        group.add(new THREE.Points(geom, mat));

        state.scene.add(group);
        this.layers.push({ group, minDist: 500, maxDist: Infinity, fadeIn: 500, fadeOut: 800 });
    },

    _createNearbyStars() {
        const group = new THREE.Group();

        const stars = [
            { name: 'Alpha Centauri', dist: 1800, color: [255, 240, 200], scale: 80 },
            { name: 'Proxima Centauri', dist: 1750, color: [255, 120, 80], scale: 35 },
            { name: 'Sirius', dist: 2200, color: [200, 220, 255], scale: 100 },
            { name: "Barnard's Star", dist: 2000, color: [255, 140, 90], scale: 30 },
            { name: 'Vega', dist: 2800, color: [200, 210, 255], scale: 70 },
            { name: 'Altair', dist: 2600, color: [240, 245, 255], scale: 55 },
            { name: 'Betelgeuse', dist: 3500, color: [255, 100, 50], scale: 120 },
            { name: 'Rigel', dist: 3800, color: [180, 200, 255], scale: 110 },
            { name: 'Arcturus', dist: 2500, color: [255, 180, 80], scale: 65 },
            { name: 'Procyon', dist: 2100, color: [255, 250, 230], scale: 50 },
            { name: 'Pollux', dist: 2400, color: [255, 200, 100], scale: 55 },
            { name: 'Deneb', dist: 4200, color: [220, 230, 255], scale: 90 },
            { name: 'Fomalhaut', dist: 2700, color: [240, 245, 255], scale: 50 },
            { name: 'Spica', dist: 3200, color: [180, 200, 255], scale: 75 },
            { name: 'Antares', dist: 3600, color: [255, 80, 40], scale: 100 },
            { name: 'Canopus', dist: 3000, color: [255, 250, 220], scale: 85 },
            { name: 'Aldebaran', dist: 2900, color: [255, 160, 70], scale: 70 },
            { name: 'Capella', dist: 2300, color: [255, 230, 150], scale: 60 },
            { name: 'Regulus', dist: 2650, color: [200, 215, 255], scale: 55 },
            { name: 'Achernar', dist: 3100, color: [190, 210, 255], scale: 65 },
        ];

        stars.forEach((star, i) => {
            const theta = (i / stars.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
            const ySpread = (Math.random() - 0.5) * star.dist * 0.3;

            const glowTex = createGlowTexture(128, star.color[0], star.color[1], star.color[2]);
            const mat = new THREE.SpriteMaterial({
                map: glowTex,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                opacity: 0.9
            });
            const sprite = new THREE.Sprite(mat);
            sprite.position.set(
                Math.cos(theta) * star.dist,
                ySpread,
                Math.sin(theta) * star.dist
            );
            sprite.scale.set(star.scale, star.scale, 1);
            group.add(sprite);

            const labelDiv = document.createElement('div');
            labelDiv.textContent = star.name;
            labelDiv.className = 'deep-space-label';
            labelDiv.style.cssText = `
                position: fixed;
                color: rgba(${star.color[0]},${star.color[1]},${star.color[2]},0.7);
                font-size: 10px;
                font-family: 'Segoe UI', Arial, sans-serif;
                pointer-events: none;
                text-shadow: 0 0 10px rgba(${star.color[0]},${star.color[1]},${star.color[2]},0.5);
                z-index: 5;
                transform: translate(-50%, -100%);
                white-space: nowrap;
                display: none;
            `;
            document.body.appendChild(labelDiv);
            this.starLabels.push({ div: labelDiv, position: sprite.position.clone() });
        });

        state.scene.add(group);
        this.layers.push({ group, minDist: 1000, maxDist: Infinity, fadeIn: 1000, fadeOut: 1500 });
    },

    _createMilkyWay() {
        const group = new THREE.Group();

        const coreTex = createGlowTexture(256, 255, 230, 180);
        const coreMat = new THREE.SpriteMaterial({
            map: coreTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7
        });
        const coreSprite = new THREE.Sprite(coreMat);
        coreSprite.scale.set(2000, 2000, 1);
        group.add(coreSprite);

        for (let arm = 0; arm < 2; arm++) {
            const count = 2000;
            const positions = new Float32Array(count * 3);
            const colors = new Float32Array(count * 3);
            const angleOffset = arm * Math.PI;

            for (let i = 0; i < count; i++) {
                const t = i / count;
                const r = 800 + t * 8000;
                const angle = angleOffset + t * Math.PI * 4 + (Math.random() - 0.5) * 0.8;
                const armWidth = 200 + t * 600;

                positions[i * 3] = Math.cos(angle) * r + (Math.random() - 0.5) * armWidth;
                positions[i * 3 + 1] = (Math.random() - 0.5) * 400 * (1 - t * 0.5);
                positions[i * 3 + 2] = Math.sin(angle) * r + (Math.random() - 0.5) * armWidth;

                const isRed = Math.random() < 0.15;
                if (isRed) {
                    colors[i * 3] = 0.6 + Math.random() * 0.4;
                    colors[i * 3 + 1] = 0.3 + Math.random() * 0.2;
                    colors[i * 3 + 2] = 0.2 + Math.random() * 0.15;
                } else {
                    const bright = 0.5 + Math.random() * 0.5;
                    colors[i * 3] = bright * 0.9;
                    colors[i * 3 + 1] = bright * 0.92;
                    colors[i * 3 + 2] = bright;
                }
            }

            const geom = new THREE.BufferGeometry();
            geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            const mat = new THREE.PointsMaterial({
                size: 15, vertexColors: true, sizeAttenuation: true, transparent: true,
                opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false
            });
            group.add(new THREE.Points(geom, mat));
        }

        const dustCanvas = document.createElement('canvas');
        dustCanvas.width = dustCanvas.height = 512;
        const dctx = dustCanvas.getContext('2d');
        for (let x = 0; x < 512; x += 4) {
            for (let y = 0; y < 512; y += 4) {
                const cx = x / 512 - 0.5;
                const cy = y / 512 - 0.5;
                const dist = Math.sqrt(cx * cx + cy * cy);
                if (dist > 0.5) continue;
                const noise = Math.random() * 0.3;
                const fade = 1 - dist * 2;
                const alpha = noise * fade * 0.15;
                dctx.fillStyle = `rgba(40,30,20,${alpha})`;
                dctx.fillRect(x, y, 4, 4);
            }
        }
        const dustTex = new THREE.CanvasTexture(dustCanvas);
        const dustGeom = new THREE.PlaneGeometry(18000, 18000);
        const dustMat = new THREE.MeshBasicMaterial({
            map: dustTex, transparent: true, opacity: 0.3, side: THREE.DoubleSide,
            depthWrite: false, blending: THREE.NormalBlending
        });
        const dustPlane = new THREE.Mesh(dustGeom, dustMat);
        dustPlane.rotation.x = -Math.PI / 2;
        group.add(dustPlane);

        state.scene.add(group);
        this.layers.push({ group, minDist: 4000, maxDist: Infinity, fadeIn: 4000, fadeOut: 6000 });
    },

    _createDeepField() {
        const group = new THREE.Group();

        const spiralTex = createSpiralGalaxyTexture(256);
        const ellipTex = createEllipticalGalaxyTexture(256);
        const bhTex = createBlackHoleTexture(256);
        const webTex = createCosmicWebTexture(512);

        const galaxies = [
            { name: 'Andromeda', dist: 25000, scale: 3000, type: 'spiral' },
            { name: 'Triangulum', dist: 28000, scale: 1500, type: 'spiral' },
            { name: 'Sombrero', dist: 35000, scale: 1200, type: 'elliptical' },
            { name: 'Whirlpool', dist: 32000, scale: 1800, type: 'spiral' },
            { name: 'Pinwheel', dist: 30000, scale: 1400, type: 'spiral' },
            { name: 'Centaurus A', dist: 38000, scale: 2000, type: 'elliptical' },
            { name: 'NGC 1300', dist: 42000, scale: 1100, type: 'spiral' },
            { name: 'Cartwheel', dist: 45000, scale: 900, type: 'spiral' },
            { name: 'Messier 87', dist: 50000, scale: 2500, type: 'elliptical' },
            { name: 'NGC 4038', dist: 36000, scale: 1000, type: 'spiral' },
            { name: 'IC 1101', dist: 55000, scale: 3500, type: 'elliptical' },
            { name: "Hoag's Object", dist: 48000, scale: 800, type: 'spiral' },
            { name: 'NGC 6872', dist: 40000, scale: 1600, type: 'spiral' },
            { name: 'Messier 81', dist: 27000, scale: 1700, type: 'spiral' },
            { name: 'Sculptor', dist: 33000, scale: 1300, type: 'elliptical' },
        ];

        galaxies.forEach((gal, i) => {
            const tex = gal.type === 'spiral' ? spiralTex : ellipTex;
            const mat = new THREE.SpriteMaterial({
                map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6
            });
            const sprite = new THREE.Sprite(mat);
            const theta = (i / galaxies.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
            const phi = (Math.random() - 0.5) * Math.PI * 0.6;
            sprite.position.set(
                Math.cos(theta) * Math.cos(phi) * gal.dist,
                Math.sin(phi) * gal.dist * 0.5,
                Math.sin(theta) * Math.cos(phi) * gal.dist
            );
            sprite.scale.set(gal.scale, gal.scale, 1);
            group.add(sprite);
        });

        const blackHoles = [
            { name: 'Sagittarius A*', dist: 20000, scale: 600 },
            { name: 'Cygnus X-1', dist: 22000, scale: 300 },
            { name: 'M87*', dist: 52000, scale: 800 },
            { name: 'V404 Cygni', dist: 24000, scale: 250 },
            { name: 'TON 618', dist: 60000, scale: 1200 },
        ];

        blackHoles.forEach((bh, i) => {
            const mat = new THREE.SpriteMaterial({
                map: bhTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7
            });
            const sprite = new THREE.Sprite(mat);
            const theta = (i / blackHoles.length) * Math.PI * 2 + Math.PI * 0.3;
            const phi = (Math.random() - 0.5) * 0.5;
            sprite.position.set(
                Math.cos(theta) * Math.cos(phi) * bh.dist,
                Math.sin(phi) * bh.dist * 0.3,
                Math.sin(theta) * Math.cos(phi) * bh.dist
            );
            sprite.scale.set(bh.scale, bh.scale, 1);
            group.add(sprite);
        });

        for (let i = 0; i < 4; i++) {
            const mat = new THREE.SpriteMaterial({
                map: webTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.15
            });
            const sprite = new THREE.Sprite(mat);
            const theta = (i / 4) * Math.PI * 2;
            const d = 40000 + Math.random() * 20000;
            sprite.position.set(Math.cos(theta) * d, (Math.random() - 0.5) * 10000, Math.sin(theta) * d);
            sprite.scale.set(15000, 15000, 1);
            group.add(sprite);
        }

        state.scene.add(group);
        this.layers.push({ group, minDist: 15000, maxDist: Infinity, fadeIn: 15000, fadeOut: 20000 });
    },

    _projVec: new THREE.Vector3(),

    update() {
        if (!this._inited) return;

        const camDist = state.camera.position.length();

        this.layers.forEach(layer => {
            // Store base opacities BEFORE any fade modifications
            if (!layer._opacitiesStored) {
                layer.group.children.forEach(child => {
                    if (child.material && child.material._baseOpacity === undefined) {
                        child.material._baseOpacity = child.material.opacity;
                    }
                });
                layer._opacitiesStored = true;
            }

            if (camDist >= layer.minDist) {
                layer.group.visible = true;
                if (camDist < layer.fadeOut) {
                    const range = layer.fadeOut - layer.fadeIn;
                    const t = range > 0 ? (camDist - layer.fadeIn) / range : 1;
                    const alpha = Math.max(0, Math.min(1, t));
                    layer.group.children.forEach(child => {
                        if (child.material) {
                            const base = child.material._baseOpacity !== undefined
                                ? child.material._baseOpacity : 1;
                            child.material.opacity = base * alpha;
                        }
                    });
                } else {
                    // Past fadeOut — restore full opacity
                    layer.group.children.forEach(child => {
                        if (child.material && child.material._baseOpacity !== undefined) {
                            child.material.opacity = child.material._baseOpacity;
                        }
                    });
                }
            } else {
                layer.group.visible = false;
            }
        });

        const starsVisible = camDist >= 1000;
        if (starsVisible) {
            const pv = this._projVec;
            for (let i = 0; i < this.starLabels.length; i++) {
                const sl = this.starLabels[i];
                // Re-append to DOM if not already attached
                if (!sl.div.parentNode) {
                    document.body.appendChild(sl.div);
                }
                pv.copy(sl.position).project(state.camera);
                if (pv.z > 1 || pv.z < -1) {
                    sl.div.style.display = 'none';
                    continue;
                }
                const sx = (pv.x * 0.5 + 0.5) * innerWidth;
                const sy = (-pv.y * 0.5 + 0.5) * innerHeight;
                sl.div.style.left = sx + 'px';
                sl.div.style.top = sy + 'px';
                sl.div.style.display = 'block';
            }
        } else {
            // Remove labels from DOM when not visible to prevent leaks
            for (let i = 0; i < this.starLabels.length; i++) {
                const div = this.starLabels[i].div;
                if (div.parentNode) {
                    div.parentNode.removeChild(div);
                }
            }
        }
    }
};

export default DeepSpace;
