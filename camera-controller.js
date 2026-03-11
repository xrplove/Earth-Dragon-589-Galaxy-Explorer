// ─── Camera Controller Module ──────────────────────────────────────────────
// Fly-to animation, follow mode, hover tooltip, hover highlight

import * as THREE from 'three';
import state from './state.js';
import { easeInOutCubic } from './orbital-math.js';
import Sound from './sound.js';

const _tempVec3 = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();

let _lastHoverTime = 0;
const HOVER_THROTTLE = 50; // 20Hz

const CameraController = {
    flying: false,
    flyStart: null,
    flyEnd: null,
    flyStartTarget: null,
    flyEndTarget: null,
    flyProgress: 0,
    flyDuration: 2,

    followTarget: null,
    followMode: false,

    hoveredObject: null,
    _originalScales: new Map(),

    // Measure mode
    measureMode: false,
    measurePoints: [],

    init() {
        // Click handler
        state.renderer.domElement.addEventListener('click', (e) => {
            if (this.flying) return;

            // Measure mode: record points instead of flying
            if (this.measureMode) {
                this._handleMeasureClick(e);
                return;
            }

            _mouse.x = (e.clientX / innerWidth) * 2 - 1;
            _mouse.y = -(e.clientY / innerHeight) * 2 + 1;
            _raycaster.setFromCamera(_mouse, state.camera);

            const clickables = state.celestialBodies.clickables;
            const intersects = _raycaster.intersectObjects(clickables, true);

            if (intersects.length > 0) {
                const obj = intersects[0].object;
                if (obj.userData.name) {
                    Sound.playClick();
                    if (state.infoPanel) state.infoPanel.show(obj.userData);
                    this.flyTo(obj);
                }
            }
        });

        // Hover handler (throttled)
        state.renderer.domElement.addEventListener('mousemove', (e) => {
            const now = performance.now();
            if (now - _lastHoverTime < HOVER_THROTTLE) return;
            _lastHoverTime = now;

            _mouse.x = (e.clientX / innerWidth) * 2 - 1;
            _mouse.y = -(e.clientY / innerHeight) * 2 + 1;
            _raycaster.setFromCamera(_mouse, state.camera);

            const clickables = state.celestialBodies.clickables;
            const intersects = _raycaster.intersectObjects(clickables, true);

            const tooltip = document.getElementById('hover-tooltip');

            if (intersects.length > 0) {
                const obj = intersects[0].object;
                if (obj.userData.name) {
                    // Show tooltip
                    if (tooltip) {
                        tooltip.textContent = obj.userData.name;
                        tooltip.style.left = (e.clientX + 14) + 'px';
                        tooltip.style.top = (e.clientY - 10) + 'px';
                        tooltip.classList.add('visible');
                    }

                    // Highlight: scale up
                    if (this.hoveredObject !== obj) {
                        this._unhover();
                        this.hoveredObject = obj;
                        if (!this._originalScales.has(obj)) {
                            this._originalScales.set(obj, obj.scale.clone());
                        }
                        obj.scale.multiplyScalar(1.08);
                    }

                    state.renderer.domElement.style.cursor = 'pointer';
                    return;
                }
            }

            // No hover
            this._unhover();
            if (tooltip) tooltip.classList.remove('visible');
            state.renderer.domElement.style.cursor = 'default';
        });
    },

    _unhover() {
        if (this.hoveredObject) {
            const orig = this._originalScales.get(this.hoveredObject);
            if (orig) this.hoveredObject.scale.copy(orig);
            this._originalScales.delete(this.hoveredObject);
            this.hoveredObject = null;
        }
    },

    _handleMeasureClick(e) {
        _mouse.x = (e.clientX / innerWidth) * 2 - 1;
        _mouse.y = -(e.clientY / innerHeight) * 2 + 1;
        _raycaster.setFromCamera(_mouse, state.camera);

        const clickables = state.celestialBodies.clickables;
        const intersects = _raycaster.intersectObjects(clickables, true);

        if (intersects.length > 0) {
            const obj = intersects[0].object;
            if (obj.userData.name) {
                this.measurePoints.push({
                    name: obj.userData.name,
                    position: obj.getWorldPosition(new THREE.Vector3())
                });

                if (this.measurePoints.length === 2) {
                    const p1 = this.measurePoints[0];
                    const p2 = this.measurePoints[1];
                    const dist = p1.position.distanceTo(p2.position);
                    const au = dist / 54; // 54 units = 1 AU (Earth's distance)
                    const km = au * 149.598; // million km
                    const lightMin = au * 8.317; // light-minutes per AU
                    this._showMeasureResult(p1.name, p2.name, au, km, lightMin);
                    this.measurePoints = [];
                    this.toggleMeasureMode(false);
                }
            }
        }
    },

    toggleMeasureMode(enabled) {
        this.measureMode = enabled !== undefined ? enabled : !this.measureMode;
        this.measurePoints = [];
        const btn = document.getElementById('measureBtn');
        if (btn) {
            btn.classList.toggle('active', this.measureMode);
            btn.textContent = this.measureMode ? 'Click 2 bodies...' : 'Measure Distance';
        }
    },

    _showMeasureResult(fromName, toName, au, km, lightMin) {
        const modal = document.getElementById('measure-result');
        if (!modal) return;
        document.getElementById('measure-from').textContent = fromName;
        document.getElementById('measure-to').textContent = toName;
        document.getElementById('measure-au').textContent = au.toFixed(2);
        document.getElementById('measure-km').textContent = km.toFixed(1);
        document.getElementById('measure-light').textContent = lightMin.toFixed(1);
        modal.classList.add('visible');

        const closeBtn = document.getElementById('measure-close');
        const close = () => {
            modal.classList.remove('visible');
            closeBtn.removeEventListener('click', close);
        };
        if (closeBtn) closeBtn.addEventListener('click', close);
        // Also close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close();
        }, { once: true });
    },

    flyTo(targetMesh) {
        if (this.flying) return;

        const targetPos = _tempVec3.set(0, 0, 0);
        targetMesh.getWorldPosition(targetPos);

        const geom = targetMesh.geometry;
        const radius = geom && geom.parameters ? geom.parameters.radius : 5;
        const offset = radius * 3.5;

        const camDir = new THREE.Vector3();
        state.camera.getWorldPosition(camDir);
        camDir.sub(targetPos).normalize();

        this.flyStart = state.camera.position.clone();
        this.flyEnd = targetPos.clone().add(camDir.multiplyScalar(offset));
        this.flyStartTarget = state.controls.target.clone();
        this.flyEndTarget = targetPos.clone();
        this.flyProgress = 0;
        this.flying = true;
        Sound.playFlyTo();

        state.controls.enabled = false;
    },

    flyToByName(name) {
        const body = state.celestialBodies.allBodies.find(b => b.name === name);
        if (body) this.flyTo(body.mesh);
    },

    setFollowMode(enabled, targetName) {
        this.followMode = enabled;
        if (enabled && targetName) {
            this.followTarget = state.celestialBodies.allBodies.find(b => b.name === targetName);
        } else {
            this.followTarget = null;
        }
    },

    resetCamera() {
        this.followMode = false;
        this.followTarget = null;
        this.flying = false;
        state.controls.enabled = true;
        state.camera.position.set(0, 200, 380);
        state.controls.target.set(0, 0, 0);
        state.controls.update();
    },

    update(delta) {
        // Fly-to animation
        if (this.flying) {
            this.flyProgress += delta / this.flyDuration;
            if (this.flyProgress >= 1) {
                this.flyProgress = 1;
                this.flying = false;
                state.controls.enabled = true;
            }

            const t = easeInOutCubic(Math.min(this.flyProgress, 1));
            state.camera.position.lerpVectors(this.flyStart, this.flyEnd, t);
            state.controls.target.lerpVectors(this.flyStartTarget, this.flyEndTarget, t);
            state.controls.update();
        }

        // Follow mode
        if (this.followMode && this.followTarget && !this.flying) {
            const targetPos = _tempVec3;
            this.followTarget.mesh.getWorldPosition(targetPos);
            state.controls.target.lerp(targetPos, 0.1);
            state.controls.update();
        }
    }
};

export default CameraController;
