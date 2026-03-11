// ─── Celestial Bodies Module ───────────────────────────────────────────────
// Creates and updates planets, moons, dwarf planets, and comets
// Features Kepler equation solver for elliptical orbits with inclination

import * as THREE from 'three';
import state from './state.js';
import { PlanetData } from './planet-data.js';
import { solveKepler, orbitalPosition } from './orbital-math.js';

const _tempVec3 = new THREE.Vector3();
const _tempVec3b = new THREE.Vector3();
let _frameCount = 0;

// ─── Draw elliptical orbit line with inclination ────────────────────────────
function createOrbitLine(a, e, inclination, ascendingNode, color, opacity) {
    const segments = 192;
    const points = [];
    const b = a * Math.sqrt(1 - e * e);
    const cosO = Math.cos(ascendingNode);
    const sinO = Math.sin(ascendingNode);
    const cosI = Math.cos(inclination);
    const sinI = Math.sin(inclination);

    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const xOrb = a * Math.cos(theta) - a * e; // offset by ae for focus at origin
        const yOrb = b * Math.sin(theta);

        const xRot = xOrb * cosO - yOrb * sinO;
        const zRot = xOrb * sinO + yOrb * cosO;

        const x = xRot;
        const y = zRot * sinI;
        const z = zRot * cosI;

        points.push(new THREE.Vector3(x, y, z));
    }

    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
        color: color || 0xffffff,
        transparent: true,
        opacity: opacity || 0.1
    });
    return new THREE.Line(geom, mat);
}

// ─── Safe texture loader with fallback ──────────────────────────────────────
function loadTexture(loader, path, fallbackColor) {
    const tex = loader.load(
        path,
        undefined,
        undefined,
        () => {
            console.warn(`Texture not found: ${path} — using fallback color`);
        }
    );
    return tex;
}

const CelestialBodies = {
    planets: [],
    dwarfPlanets: [],
    comets: [],
    orbitLines: [],
    labels: [],
    clickables: [],
    allBodies: [],

    init() {
        this._createPlanets();
        this._createDwarfPlanets();
        this._createComets();

        // Add sun to clickables
        this.clickables.push(state.sun);
        this.allBodies.push({ name: 'Sun', mesh: state.sun, data: { distance: 0, radius: 14 } });
    },

    _createPlanets() {
        const textureLoader = state.textureLoader;

        PlanetData.planets.forEach((pData) => {
            const orbitGroup = new THREE.Group();
            state.scene.add(orbitGroup);

            // Planet mesh
            const geom = new THREE.SphereGeometry(pData.radius, 48, 48);
            const tex = textureLoader.load(pData.texture);
            const matOptions = {
                map: tex,
                shininess: 5,
                specular: 0x111111
            };
            if (pData.tintColor) {
                matOptions.color = new THREE.Color(pData.tintColor);
            }
            const mat = new THREE.MeshPhongMaterial(matOptions);
            const mesh = new THREE.Mesh(geom, mat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.rotation.z = pData.tilt;
            mesh.userData = { name: pData.name, info: pData.info, bodyType: 'planet', bodyData: pData };
            orbitGroup.add(mesh);

            // Earth specifics
            let cloudMesh = null;
            if (pData.hasClouds) {
                const cloudGeom = new THREE.SphereGeometry(pData.radius + 0.15, 48, 48);
                const cloudTex = textureLoader.load('textures/2k_earth_clouds.jpg');
                const cloudMat = new THREE.MeshPhongMaterial({
                    map: cloudTex,
                    transparent: true,
                    opacity: 0.35,
                    depthWrite: false
                });
                cloudMesh = new THREE.Mesh(cloudGeom, cloudMat);
                cloudMesh.rotation.z = pData.tilt;
                orbitGroup.add(cloudMesh);
            }

            if (pData.name === 'Earth') {
                mat.shininess = 25;
                mat.specular = new THREE.Color(0x333333);
                if (pData.hasNightmap) {
                    const nightTex = textureLoader.load('textures/2k_earth_nightmap.jpg');
                    mat.emissiveMap = nightTex;
                    mat.emissive = new THREE.Color(0xffff88);
                    mat.emissiveIntensity = 0.3;
                }
            }

            // Saturn ring
            if (pData.hasRing && pData.name === 'Saturn') {
                const innerR = pData.radius * 1.3;
                const outerR = pData.radius * 2.5;
                const ringGeom = new THREE.RingGeometry(innerR, outerR, 128);
                const ringTex = textureLoader.load('textures/2k_saturn_ring_alpha.png');
                const ringMat = new THREE.MeshBasicMaterial({
                    map: ringTex,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.85
                });
                const ring = new THREE.Mesh(ringGeom, ringMat);
                ring.rotation.x = -Math.PI / 2 + pData.tilt;
                ring.userData._isRing = true;
                orbitGroup.add(ring);
            }

            // Uranus ring
            if (pData.hasRing && pData.name === 'Uranus') {
                const innerR = pData.radius * 1.5;
                const outerR = pData.radius * 1.8;
                const ringGeom = new THREE.RingGeometry(innerR, outerR, 80);
                const ringMat = new THREE.MeshBasicMaterial({
                    color: 0x88aacc,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.25
                });
                const ring = new THREE.Mesh(ringGeom, ringMat);
                ring.rotation.x = -Math.PI / 2 + pData.tilt;
                ring.userData._isRing = true;
                orbitGroup.add(ring);
            }

            // Neptune ring (faint)
            if (pData.hasRing && pData.name === 'Neptune') {
                const innerR = pData.radius * 1.6;
                const outerR = pData.radius * 1.85;
                const ringGeom = new THREE.RingGeometry(innerR, outerR, 80);
                const ringMat = new THREE.MeshBasicMaterial({
                    color: pData.ringColor || 0x5566aa,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.12
                });
                const ring = new THREE.Mesh(ringGeom, ringMat);
                ring.rotation.x = -Math.PI / 2 + pData.tilt;
                ring.userData._isRing = true;
                orbitGroup.add(ring);
            }

            // Moons
            const moonMeshes = [];
            if (pData.moons && pData.moons.length > 0) {
                pData.moons.forEach(mData => {
                    const segments = mData.radius < 0.6 ? 12 : 16;
                    const mGeom = new THREE.SphereGeometry(mData.radius, segments, segments);
                    let mMat;
                    if (mData.texture) {
                        mMat = new THREE.MeshPhongMaterial({ map: textureLoader.load(mData.texture) });
                    } else {
                        mMat = new THREE.MeshPhongMaterial({ color: mData.color || 0xaaaaaa });
                    }
                    const mMesh = new THREE.Mesh(mGeom, mMat);
                    mMesh.castShadow = true;
                    mMesh.receiveShadow = true;
                    mMesh.userData = { name: mData.name, info: mData.info, bodyType: 'moon', bodyData: mData };
                    orbitGroup.add(mMesh);
                    moonMeshes.push({ mesh: mMesh, data: mData });
                    this.clickables.push(mMesh);
                    this.allBodies.push({ name: mData.name, mesh: mMesh, data: mData });
                });
            }

            // Atmosphere glow
            if (pData.atmosphere && state.effects) {
                state.effects.createAtmosphere(mesh, pData.atmosphere);
            }

            // Elliptical orbit line with real inclination
            const e = pData.eccentricity || 0;
            const inc = pData.inclination || 0;
            const asc = pData.ascendingNode || 0;
            const orbitLine = createOrbitLine(pData.distance, e, inc, asc, 0xffffff, 0.1);
            state.scene.add(orbitLine);
            this.orbitLines.push(orbitLine);

            // Label
            const labelDiv = document.createElement('div');
            labelDiv.textContent = pData.name;
            labelDiv.style.cssText = `
                position: fixed;
                color: rgba(255,255,255,0.6);
                font-size: 11px;
                font-family: 'Segoe UI', Arial, sans-serif;
                pointer-events: none;
                text-shadow: 0 0 8px rgba(0,0,0,0.8);
                z-index: 5;
                transform: translate(-50%, -100%);
                white-space: nowrap;
            `;
            document.body.appendChild(labelDiv);
            this.labels.push(labelDiv);

            this.clickables.push(mesh);

            const planet = {
                mesh,
                cloudMesh,
                orbitGroup,
                data: pData,
                moonMeshes,
                angle: Math.random() * Math.PI * 2
            };

            this.planets.push(planet);
            this.allBodies.push({ name: pData.name, mesh, data: pData });
        });
    },

    _createDwarfPlanets() {
        const textureLoader = state.textureLoader;

        PlanetData.dwarfPlanets.forEach(dData => {
            const orbitGroup = new THREE.Group();
            state.scene.add(orbitGroup);

            const segments = 16;
            const geom = new THREE.SphereGeometry(dData.radius, segments, segments);
            let mat;
            if (dData.texture) {
                const tex = textureLoader.load(dData.texture);
                const opts = { map: tex, shininess: 5, specular: 0x111111 };
                if (dData.tintColor) opts.color = new THREE.Color(dData.tintColor);
                mat = new THREE.MeshPhongMaterial(opts);
            } else {
                mat = new THREE.MeshPhongMaterial({ color: dData.color || 0xaaaaaa, shininess: 5 });
            }

            const mesh = new THREE.Mesh(geom, mat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            if (dData.tilt) mesh.rotation.z = dData.tilt;
            mesh.userData = { name: dData.name, info: dData.info, bodyType: 'dwarf', bodyData: dData };
            orbitGroup.add(mesh);

            // Elliptical orbit line
            const e = dData.eccentricity || 0;
            const inc = dData.inclination || 0;
            const asc = dData.ascendingNode || 0;
            const orbitLine = createOrbitLine(dData.distance, e, inc, asc, 0xffffff, 0.06);
            state.scene.add(orbitLine);
            this.orbitLines.push(orbitLine);

            // Label
            const labelDiv = document.createElement('div');
            labelDiv.textContent = dData.name;
            labelDiv.style.cssText = `
                position: fixed;
                color: rgba(255,255,255,0.4);
                font-size: 10px;
                font-family: 'Segoe UI', Arial, sans-serif;
                pointer-events: none;
                text-shadow: 0 0 8px rgba(0,0,0,0.8);
                z-index: 5;
                transform: translate(-50%, -100%);
                white-space: nowrap;
            `;
            document.body.appendChild(labelDiv);
            this.labels.push(labelDiv);

            this.clickables.push(mesh);

            const dwarf = {
                mesh,
                orbitGroup,
                data: dData,
                angle: Math.random() * Math.PI * 2
            };
            this.dwarfPlanets.push(dwarf);
            this.allBodies.push({ name: dData.name, mesh, data: dData });
        });
    },

    _createComets() {
        PlanetData.comets.forEach(cData => {
            const group = new THREE.Group();
            state.scene.add(group);

            // Nucleus
            const nGeom = new THREE.SphereGeometry(cData.nucleusRadius, 16, 16);
            const nMat = new THREE.MeshPhongMaterial({ color: cData.color, emissive: cData.color, emissiveIntensity: 0.3 });
            const nucleus = new THREE.Mesh(nGeom, nMat);
            nucleus.userData = { name: cData.name, info: cData.info, bodyType: 'comet', bodyData: cData };
            group.add(nucleus);

            // Coma
            const comaGeom = new THREE.SphereGeometry(cData.nucleusRadius * 3, 16, 16);
            const comaMat = new THREE.MeshBasicMaterial({
                color: 0xaaddff,
                transparent: true,
                opacity: 0.15,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const coma = new THREE.Mesh(comaGeom, comaMat);
            group.add(coma);

            // Tail particles
            const tailCount = cData.tailParticles;
            const tailPositions = new Float32Array(tailCount * 3);
            const tailColors = new Float32Array(tailCount * 3);

            for (let i = 0; i < tailCount; i++) {
                tailColors[i * 3] = 0.6 + Math.random() * 0.4;
                tailColors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
                tailColors[i * 3 + 2] = 1.0;
            }

            const tailGeom = new THREE.BufferGeometry();
            tailGeom.setAttribute('position', new THREE.BufferAttribute(tailPositions, 3));
            tailGeom.setAttribute('color', new THREE.BufferAttribute(tailColors, 3));

            const tailMat = new THREE.PointsMaterial({
                size: 0.8,
                vertexColors: true,
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                sizeAttenuation: true
            });

            const tailPoints = new THREE.Points(tailGeom, tailMat);
            state.scene.add(tailPoints);

            // Elliptical orbit line for comet (with tilt/inclination)
            const orbitLine = createOrbitLine(
                cData.semiMajorAxis, cData.eccentricity,
                cData.tilt || 0, 0,
                0x4488ff, 0.08
            );
            state.scene.add(orbitLine);
            this.orbitLines.push(orbitLine);

            this.clickables.push(nucleus);

            const comet = {
                group,
                nucleus,
                coma,
                tailPoints,
                tailGeom,
                data: cData,
                angle: Math.random() * Math.PI * 2
            };
            this.comets.push(comet);
            this.allBodies.push({ name: cData.name, mesh: nucleus, data: cData });

            // Label
            const labelDiv = document.createElement('div');
            labelDiv.textContent = cData.name;
            labelDiv.style.cssText = `
                position: fixed;
                color: rgba(150,200,255,0.5);
                font-size: 10px;
                font-family: 'Segoe UI', Arial, sans-serif;
                pointer-events: none;
                text-shadow: 0 0 8px rgba(0,0,0,0.8);
                z-index: 5;
                transform: translate(-50%, -100%);
                white-space: nowrap;
            `;
            document.body.appendChild(labelDiv);
            this.labels.push(labelDiv);
        });
    },

    setOrbitsVisible(v) {
        this.orbitLines.forEach(l => l.visible = v);
    },

    setLabelsVisible(v) {
        this.labels.forEach(l => l.style.display = v ? 'block' : 'none');
    },

    update(delta, speed) {
        _frameCount++;
        const labelsVisible = state.uiController ? state.uiController.labelsVisible : true;

        // Planets — Kepler orbits
        this.planets.forEach((planet, i) => {
            planet.angle += delta * planet.data.speed * 0.3 * speed;

            const pData = planet.data;
            const e = pData.eccentricity || 0;
            const inc = pData.inclination || 0;
            const asc = pData.ascendingNode || 0;

            const pos = orbitalPosition(planet.angle, pData.distance, e, inc, asc);

            planet.mesh.position.set(pos.x, pos.y, pos.z);
            planet.mesh.rotation.y += delta * 0.4 * speed;

            // Cloud layer
            if (planet.cloudMesh) {
                planet.cloudMesh.position.set(pos.x, pos.y, pos.z);
                planet.cloudMesh.rotation.y += delta * 0.5 * speed;
            }

            // Moons orbit around the planet
            planet.moonMeshes.forEach(moon => {
                const moonAngle = planet.angle * moon.data.speed;
                const moonDist = planet.data.radius + moon.data.distance;
                moon.mesh.position.set(
                    pos.x + Math.cos(moonAngle) * moonDist,
                    pos.y + Math.sin(moonAngle) * 0.5,
                    pos.z + Math.sin(moonAngle) * moonDist
                );
                moon.mesh.rotation.y += delta * 0.2 * speed;
            });

            // Rings follow planet
            if (planet.data.hasRing) {
                planet.orbitGroup.children.forEach(child => {
                    if (child.userData._isRing) {
                        child.position.set(pos.x, pos.y, pos.z);
                    }
                });
            }

            // Label position
            _tempVec3.set(pos.x, pos.y + planet.data.radius + 4, pos.z);
            _tempVec3.project(state.camera);
            const sx = (_tempVec3.x * 0.5 + 0.5) * innerWidth;
            const sy = (-_tempVec3.y * 0.5 + 0.5) * innerHeight;
            this.labels[i].style.left = sx + 'px';
            this.labels[i].style.top = sy + 'px';
            this.labels[i].style.display = (labelsVisible && _tempVec3.z < 1) ? 'block' : 'none';
        });

        // Dwarf planets — Kepler orbits
        const planetLabelCount = this.planets.length;
        this.dwarfPlanets.forEach((dwarf, i) => {
            dwarf.angle += delta * dwarf.data.speed * 0.3 * speed;

            const dData = dwarf.data;
            const e = dData.eccentricity || 0;
            const inc = dData.inclination || 0;
            const asc = dData.ascendingNode || 0;

            const pos = orbitalPosition(dwarf.angle, dData.distance, e, inc, asc);

            dwarf.mesh.position.set(pos.x, pos.y, pos.z);
            dwarf.mesh.rotation.y += delta * 0.3 * speed;

            const li = planetLabelCount + i;
            if (li < this.labels.length) {
                _tempVec3.set(pos.x, pos.y + dwarf.data.radius + 3, pos.z);
                _tempVec3.project(state.camera);
                const sx2 = (_tempVec3.x * 0.5 + 0.5) * innerWidth;
                const sy2 = (-_tempVec3.y * 0.5 + 0.5) * innerHeight;
                this.labels[li].style.left = sx2 + 'px';
                this.labels[li].style.top = sy2 + 'px';
                this.labels[li].style.display = (labelsVisible && _tempVec3.z < 1) ? 'block' : 'none';
            }
        });

        // Comets
        const cometLabelOffset = planetLabelCount + this.dwarfPlanets.length;
        this.comets.forEach((comet, ci) => {
            // Use mean anomaly + Kepler solver for physically correct speed variation
            comet.angle += delta * comet.data.speed * speed;

            const a = comet.data.semiMajorAxis;
            const e = comet.data.eccentricity;
            const tilt = comet.data.tilt || 0;

            // Solve Kepler equation for position along elliptical orbit
            const pos = orbitalPosition(comet.angle, a, e, tilt, 0);

            comet.nucleus.position.set(pos.x, pos.y, pos.z);
            comet.coma.position.set(pos.x, pos.y, pos.z);

            const distToSun = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
            const tailScale = Math.max(0.2, Math.min(1, 100 / distToSun));

            const awayDir = _tempVec3b.set(pos.x, pos.y, pos.z).normalize();
            const positions = comet.tailGeom.attributes.position.array;
            const updateTail = (_frameCount % 2 === 0);

            for (let i = 0; updateTail && i < comet.data.tailParticles; i++) {
                const t = i / comet.data.tailParticles;
                const spread = t * 30 * tailScale;
                const dist = t * 80 * tailScale;
                positions[i * 3] = pos.x + awayDir.x * dist + (Math.random() - 0.5) * spread;
                positions[i * 3 + 1] = pos.y + awayDir.y * dist + (Math.random() - 0.5) * spread * 0.3;
                positions[i * 3 + 2] = pos.z + awayDir.z * dist + (Math.random() - 0.5) * spread;
            }
            if (updateTail) comet.tailGeom.attributes.position.needsUpdate = true;
            comet.tailPoints.material.opacity = 0.3 + tailScale * 0.4;
            comet.coma.material.opacity = 0.1 + tailScale * 0.2;

            const li = cometLabelOffset + ci;
            if (li < this.labels.length) {
                _tempVec3.set(pos.x, pos.y + 3, pos.z);
                _tempVec3.project(state.camera);
                const sx3 = (_tempVec3.x * 0.5 + 0.5) * innerWidth;
                const sy3 = (-_tempVec3.y * 0.5 + 0.5) * innerHeight;
                this.labels[li].style.left = sx3 + 'px';
                this.labels[li].style.top = sy3 + 'px';
                this.labels[li].style.display = (labelsVisible && _tempVec3.z < 1) ? 'block' : 'none';
            }
        });
    }
};

export default CelestialBodies;
