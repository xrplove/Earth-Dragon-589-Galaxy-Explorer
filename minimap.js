// ─── Minimap Module ────────────────────────────────────────────────────────
// Second renderer with orthographic top-down view (throttled)

import * as THREE from 'three';
import state from './state.js';

const _tempDir = new THREE.Vector3();
let _frameCounter = 0;

const Minimap = {
    renderer: null,
    camera: null,
    cameraIndicator: null,

    init() {
        const container = document.getElementById('minimap-container');
        if (!container) return;

        // Wider span for larger scene
        const span = 600;
        this.camera = new THREE.OrthographicCamera(-span, span, span, -span, 1, 2000);
        this.camera.position.set(0, 1000, 0);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        this.renderer.setSize(200, 200);
        this.renderer.setPixelRatio(1);
        container.appendChild(this.renderer.domElement);

        const indicatorGeom = new THREE.ConeGeometry(8, 20, 4);
        const indicatorMat = new THREE.MeshBasicMaterial({
            color: 0x4a9eff,
            wireframe: true,
            transparent: true,
            opacity: 0.7
        });
        this.cameraIndicator = new THREE.Mesh(indicatorGeom, indicatorMat);
        this.cameraIndicator.layers.set(1);
        state.scene.add(this.cameraIndicator);

        this.camera.layers.enableAll();
    },

    update() {
        if (!this.renderer) return;

        _frameCounter++;
        if (_frameCounter % 3 !== 0) return;

        const camDist = state.camera.position.length();
        const container = document.getElementById('minimap-container');
        if (camDist > 5000 && container) {
            if (container.style.opacity !== '0') {
                container.style.opacity = '0';
                // Hide from layout after transition completes
                clearTimeout(this._fadeTimeout);
                this._fadeTimeout = setTimeout(() => {
                    if (container.style.opacity === '0') {
                        container.style.display = 'none';
                    }
                }, 500);
            }
            return;
        } else if (container) {
            clearTimeout(this._fadeTimeout);
            container.style.display = '';
            container.style.opacity = '1';
        }

        if (this.cameraIndicator) {
            this.cameraIndicator.position.copy(state.camera.position);
            this.cameraIndicator.position.y = 5;

            state.camera.getWorldDirection(_tempDir);
            const angle = Math.atan2(_tempDir.x, _tempDir.z);
            // Reset rotation, then apply: lay cone flat (-PI/2 on X), then rotate heading on Y
            this.cameraIndicator.rotation.set(-Math.PI / 2, angle, 0);
        }

        this.renderer.render(state.scene, this.camera);
    }
};

export default Minimap;
