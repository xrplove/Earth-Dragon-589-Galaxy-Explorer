// ─── Post-Processing Module ────────────────────────────────────────────────
// EffectComposer with bloom and lens flare

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';
import state from './state.js';

function createFlareTexture(size, innerColor, outerColor) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.4, outerColor);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
}

const PostProcessing = {
    composer: null,
    bloomPass: null,
    bloomEnabled: true,

    init() {
        const renderer = state.renderer;
        const scene = state.scene;
        const camera = state.camera;

        this.composer = new EffectComposer(renderer);

        const renderPass = new RenderPass(scene, camera);
        this.composer.addPass(renderPass);

        // Bloom — higher threshold to prevent over-bloom on larger planets
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.45,  // strength
            0.4,   // radius
            0.92   // threshold (higher for larger planets)
        );
        this.bloomPass = bloomPass;
        this.composer.addPass(bloomPass);

        this._addLensFlare();

        window.addEventListener('resize', () => {
            this.composer.setSize(window.innerWidth, window.innerHeight);
        });
    },

    _addLensFlare() {
        const texFlare = createFlareTexture(256, 'rgba(255,220,150,1)', 'rgba(255,160,50,0.4)');
        const texRing = createFlareTexture(256, 'rgba(255,255,255,0.0)', 'rgba(100,180,255,0.15)');

        const lensflare = new Lensflare();
        lensflare.addElement(new LensflareElement(texFlare, 300, 0));
        lensflare.addElement(new LensflareElement(texRing, 120, 0.3));
        lensflare.addElement(new LensflareElement(texRing, 80, 0.6));
        lensflare.addElement(new LensflareElement(texFlare, 40, 0.9));

        state.sun.add(lensflare);
    },

    setBloom(enabled) {
        this.bloomEnabled = enabled;
        this.bloomPass.strength = enabled ? 0.45 : 0;
    },

    render() {
        this.composer.render();
    }
};

export default PostProcessing;
