// ─── Main Entry Point ─────────────────────────────────────────────────────
// ES module orchestrator — imports all modules, initializes, runs animation loop

import * as THREE from 'three';
import state from './state.js';
import { PlanetData } from './planet-data.js';
import { setupScene, createStarfield, createSun, createLighting, createBelts } from './solar-system.js';
import Effects from './effects.js';
import CelestialBodies from './celestial-bodies.js';
import PostProcessing from './post-processing.js';
import CameraController from './camera-controller.js';
import UIController from './ui-controller.js';
import InfoPanel from './info-panel.js';
import TrailRenderer from './trail-renderer.js';
import Minimap from './minimap.js';
import ComparisonMode from './comparison-mode.js';
import DeepSpace from './deep-space.js';
import GuidedTour from './guided-tour.js';
import Sound from './sound.js';

// ─── WebGL Detection ─────────────────────────────────────────────────────────
{
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.querySelector('.loading-title').textContent = 'WebGL Required';
            loadingScreen.querySelector('.loading-text').textContent =
                'Your browser or device does not support WebGL. Please try Chrome, Firefox, or Edge.';
            const bar = loadingScreen.querySelector('.loading-bar');
            if (bar) bar.style.display = 'none';
        }
        throw new Error('WebGL not supported');
    }
}

// ─── Scene Setup ─────────────────────────────────────────────────────────────
setupScene();
createLighting();
createStarfield();
createSun();
createBelts();

// ─── Register Modules ────────────────────────────────────────────────────────
state.effects = Effects;
state.celestialBodies = CelestialBodies;
state.postProcessing = PostProcessing;
state.cameraController = CameraController;
state.uiController = UIController;
state.infoPanel = InfoPanel;
state.trailRenderer = TrailRenderer;
state.minimap = Minimap;
state.comparisonMode = ComparisonMode;
state.deepSpace = DeepSpace;
state.guidedTour = GuidedTour;
state.sound = Sound;

// ─── Initialize All Modules (order matters) ──────────────────────────────────
Effects.init();
CelestialBodies.init();
PostProcessing.init();
CameraController.init();
UIController.init();
InfoPanel.init();
Minimap.init();
ComparisonMode.init();
TrailRenderer.init();
DeepSpace.init();
Sound.init();

// ─── Animation Loop ──────────────────────────────────────────────────────────
let elapsed = 0;

function animate() {
    requestAnimationFrame(animate);

    const delta = state.clock.getDelta();
    const speed = UIController.paused ? 0 : UIController.speed;
    elapsed += delta;

    // Sun animation
    state.sun.rotation.y += delta * 0.05 * speed;
    if (state.sunMaterial) {
        state.sunMaterial.uniforms.time.value = elapsed;
    }

    // Star twinkling
    if (state.starMaterial) {
        state.starMaterial.uniforms.time.value = elapsed;
    }

    // Belt rotations
    state.asteroidBelt.rotation.y += delta * 0.015 * speed;
    state.kuiperBelt.rotation.y += delta * 0.005 * speed;

    // Module updates
    CelestialBodies.update(delta, speed);
    Effects.update(delta, elapsed);
    CameraController.update(delta);
    UIController.update(delta);
    TrailRenderer.update();
    ComparisonMode.update(delta);
    DeepSpace.update();

    state.controls.update();

    // Render via post-processing or direct
    if (PostProcessing.composer) {
        PostProcessing.render();
    } else {
        state.renderer.render(state.scene, state.camera);
    }

    // Minimap last (separate renderer)
    Minimap.update();
}

animate();
