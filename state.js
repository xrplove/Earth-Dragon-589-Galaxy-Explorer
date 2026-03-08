// ─── Shared State Container ───────────────────────────────────────────────────
// Replaces window.SolarSystem namespace for ES module architecture

const state = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    textureLoader: null,
    loadingManager: null,
    clock: null,
    sun: null,
    sunLight: null,
    sunMaterial: null,
    starMaterial: null,
    asteroidBelt: null,
    kuiperBelt: null,

    // Module references
    effects: null,
    celestialBodies: null,
    postProcessing: null,
    cameraController: null,
    uiController: null,
    infoPanel: null,
    minimap: null,
    comparisonMode: null,
    trailRenderer: null,
    deepSpace: null,
    guidedTour: null,
};

export default state;
