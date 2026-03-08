// ─── Comparison Mode Module ────────────────────────────────────────────────
// Side-by-side planet size overlay with true relative scale

import * as THREE from 'three';
import state from './state.js';
import { PlanetData } from './planet-data.js';

const ComparisonMode = {
    active: false,
    scene: null,
    camera: null,
    renderer: null,
    planets: [],

    init() {
        const closeBtn = document.getElementById('comparison-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
    },

    _setup() {
        if (this.scene) return;

        const container = document.getElementById('comparison-canvas-container');
        if (!container) return;

        this.scene = new THREE.Scene();

        const aspect = container.clientWidth / container.clientHeight;
        const viewSize = 40;
        this.camera = new THREE.OrthographicCamera(
            -viewSize * aspect, viewSize * aspect,
            viewSize, -viewSize,
            0.1, 200
        );
        this.camera.position.set(0, 0, 100);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(this.renderer.domElement);

        const light = new THREE.PointLight(0xffffff, 1.5, 300);
        light.position.set(50, 30, 100);
        this.scene.add(light);
        this.scene.add(new THREE.AmbientLight(0x333344, 0.5));

        const textureLoader = new THREE.TextureLoader();
        const planetInfo = PlanetData.planets;

        // True relative radii (Earth = 1) — unchanged astronomical ratios
        const trueRadii = {
            'Mercury': 0.383, 'Venus': 0.949, 'Earth': 1.0,
            'Mars': 0.532, 'Jupiter': 11.21, 'Saturn': 9.45,
            'Uranus': 4.01, 'Neptune': 3.88
        };

        const scale = 2.5;
        let xOffset = -55;

        planetInfo.forEach(pData => {
            const trueR = (trueRadii[pData.name] || 1) * scale;
            const geom = new THREE.SphereGeometry(trueR, 32, 32);
            const tex = textureLoader.load(pData.texture);
            const mat = new THREE.MeshPhongMaterial({ map: tex });
            if (pData.tintColor) mat.color = new THREE.Color(pData.tintColor);

            const mesh = new THREE.Mesh(geom, mat);

            const spacing = Math.max(trueR * 2.5, 6);
            xOffset += spacing / 2;
            mesh.position.set(xOffset, 0, 0);
            xOffset += spacing / 2 + 1;

            this.scene.add(mesh);
            this.planets.push(mesh);

            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 32;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.font = '14px Segoe UI, Arial';
            ctx.textAlign = 'center';
            ctx.fillText(pData.name, 64, 20);
            const labelTex = new THREE.CanvasTexture(canvas);
            const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true });
            const label = new THREE.Sprite(labelMat);
            label.position.set(mesh.position.x, -trueR - 4, 0);
            label.scale.set(12, 3, 1);
            this.scene.add(label);
        });

        this.camera.position.x = xOffset / 2 - 25;
    },

    toggle() {
        if (this.active) this.hide();
        else this.show();
    },

    show() {
        this._setup();
        this.active = true;
        const overlay = document.getElementById('comparison-overlay');
        if (overlay) overlay.classList.add('visible');
    },

    hide() {
        this.active = false;
        const overlay = document.getElementById('comparison-overlay');
        if (overlay) overlay.classList.remove('visible');
    },

    update(delta) {
        if (!this.active || !this.renderer) return;
        this.planets.forEach(p => { p.rotation.y += delta * 0.3; });
        this.renderer.render(this.scene, this.camera);
    }
};

export default ComparisonMode;
