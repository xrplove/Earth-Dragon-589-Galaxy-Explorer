// ─── Solar System — Scene Setup ───────────────────────────────────────────────
// Creates scene, camera, renderer, starfield, sun, belts
// Exposes setup functions and shared objects via state module

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import state from './state.js';
import { PlanetData } from './planet-data.js';

// ─── Round Star Texture ──────────────────────────────────────────────────────
function createRoundStarTexture(size) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const half = size / 2;
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.85)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.08)');
    gradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
}

// ─── Twinkling Stars Shader ──────────────────────────────────────────────────
const twinkleVertexShader = `
    attribute float phase;
    attribute float starSize;
    varying vec3 vColor;
    varying float vAlpha;
    uniform float time;

    void main() {
        vColor = color;
        float twinkle = 0.65 + 0.35 * sin(time * 1.8 + phase);
        vAlpha = twinkle;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = starSize * (280.0 / -mvPosition.z) * twinkle;
        gl_PointSize = clamp(gl_PointSize, 0.5, 12.0);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const twinkleFragmentShader = `
    uniform sampler2D pointTexture;
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
        vec4 tex = texture2D(pointTexture, gl_PointCoord);
        if (tex.a < 0.02) discard;
        gl_FragColor = vec4(vColor * vAlpha * 1.2, tex.a * vAlpha);
    }
`;

// ─── Animated Sun Shader ─────────────────────────────────────────────────────
const sunVertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
        vUv = uv;
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const sunFragmentShader = `
    uniform float time;
    uniform sampler2D sunTexture;
    varying vec2 vUv;
    varying vec3 vNormal;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
        }
        return v;
    }

    void main() {
        vec2 uv = vUv;
        // Flowing noise over time
        float n1 = fbm(uv * 5.0 + vec2(time * 0.04, time * 0.02));
        float n2 = fbm(uv * 8.0 - vec2(time * 0.06, time * 0.03));
        float n = (n1 + n2 * 0.6) / 1.6;

        vec4 texColor = texture2D(sunTexture, uv);

        vec3 hotColor = vec3(1.0, 0.85, 0.4);
        vec3 warmColor = vec3(1.0, 0.5, 0.1);
        vec3 coolColor = vec3(0.8, 0.25, 0.0);

        vec3 noiseColor = mix(coolColor, mix(warmColor, hotColor, n), n);
        vec3 finalColor = texColor.rgb * 0.5 + noiseColor * 0.5;
        finalColor += vec3(0.1, 0.05, 0.0); // slight boost

        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

// ─── Setup Functions ─────────────────────────────────────────────────────────

export function setupScene() {
    // Loading Manager
    const loadingManager = new THREE.LoadingManager();
    loadingManager.onProgress = (url, loaded, total) => {
        const progress = (loaded / total) * 100;
        const bar = document.getElementById('loading-bar-fill');
        const text = document.getElementById('loading-text');
        if (bar) bar.style.width = progress + '%';
        if (text) text.textContent = `Loading assets... ${Math.round(progress)}%`;
    };
    loadingManager.onLoad = () => {
        const screen = document.getElementById('loading-screen');
        if (screen) {
            screen.classList.add('fade-out');
            setTimeout(() => { if (screen.parentNode) screen.remove(); }, 1200);
        }
    };
    // Timeout fallback: force-hide loading screen after 15s if onLoad never fires
    setTimeout(() => {
        const screen = document.getElementById('loading-screen');
        if (screen && screen.parentNode) {
            screen.classList.add('fade-out');
            setTimeout(() => { if (screen.parentNode) screen.remove(); }, 1200);
        }
    }, 15000);

    state.loadingManager = loadingManager;

    // Scene
    const scene = new THREE.Scene();
    state.scene = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200000);
    camera.position.set(0, 200, 380);
    state.camera = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    document.body.appendChild(renderer.domElement);
    state.renderer = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 15;
    controls.maxDistance = 100000;
    state.controls = controls;

    // Texture loader (uses loading manager)
    state.textureLoader = new THREE.TextureLoader(loadingManager);
    state.clock = new THREE.Clock();

    // Resize handler
    window.addEventListener('resize', () => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
    });

    // If nothing was queued to load, dismiss the loading screen immediately
    if (loadingManager.itemsTotal === 0) {
        const screen = document.getElementById('loading-screen');
        if (screen) {
            screen.classList.add('fade-out');
            setTimeout(() => { if (screen.parentNode) screen.remove(); }, 1200);
        }
    }
}

export function createStarfield() {
    const scene = state.scene;
    const textureLoader = state.textureLoader;

    // Background sphere
    const starGeom = new THREE.SphereGeometry(90000, 32, 32);
    const starMat = new THREE.MeshBasicMaterial({
        map: textureLoader.load('textures/2k_stars_milky_way.jpg'),
        side: THREE.BackSide
    });
    scene.add(new THREE.Mesh(starGeom, starMat));

    // Twinkling point stars with round texture
    const count = 5000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        const r = 1800 + Math.random() * 80000;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        const tint = 0.6 + Math.random() * 0.4;
        colors[i * 3] = tint;
        colors[i * 3 + 1] = tint * (0.9 + Math.random() * 0.1);
        colors[i * 3 + 2] = tint;

        phases[i] = Math.random() * Math.PI * 2;
        sizes[i] = 2.5 + Math.random() * 2.0;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    geom.setAttribute('starSize', new THREE.BufferAttribute(sizes, 1));

    const roundTex = createRoundStarTexture(64);

    const starShaderMat = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            pointTexture: { value: roundTex }
        },
        vertexShader: twinkleVertexShader,
        fragmentShader: twinkleFragmentShader,
        transparent: true,
        vertexColors: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    scene.add(new THREE.Points(geom, starShaderMat));
    state.starMaterial = starShaderMat;
}

export function createSun() {
    const scene = state.scene;
    const textureLoader = state.textureLoader;
    const sunData = PlanetData.sun;

    const sunGeom = new THREE.SphereGeometry(sunData.radius, 64, 64);
    const sunTex = textureLoader.load('textures/2k_sun.jpg');

    const sunMat = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            sunTexture: { value: sunTex }
        },
        vertexShader: sunVertexShader,
        fragmentShader: sunFragmentShader
    });

    const sun = new THREE.Mesh(sunGeom, sunMat);
    sun.userData = {
        name: 'Sun',
        info: sunData.info,
        bodyType: 'star',
        bodyData: sunData
    };
    scene.add(sun);

    state.sun = sun;
    state.sunMaterial = sunMat;
}

export function createLighting() {
    const scene = state.scene;

    const sunLight = new THREE.PointLight(0xfff5e0, 2.5, 2000);
    sunLight.castShadow = true;
    scene.add(sunLight);
    state.sunLight = sunLight;

    const ambientLight = new THREE.AmbientLight(0x111122, 0.25);
    scene.add(ambientLight);
}

export function createBelts() {
    const scene = state.scene;

    function createParticleBelt(count, innerR, outerR, ySpread, brightness, opacity, size) {
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = innerR + Math.random() * (outerR - innerR);
            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = (Math.random() - 0.5) * ySpread;
            positions[i * 3 + 2] = Math.sin(angle) * radius;
            const b = brightness[0] + Math.random() * (brightness[1] - brightness[0]);
            colors[i * 3] = b * (0.85 + Math.random() * 0.15);
            colors[i * 3 + 1] = b * (0.8 + Math.random() * 0.15);
            colors[i * 3 + 2] = b * (0.75 + Math.random() * 0.2);
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const mat = new THREE.PointsMaterial({
            size, vertexColors: true, sizeAttenuation: true, transparent: true, opacity
        });
        const points = new THREE.Points(geom, mat);
        scene.add(points);
        return points;
    }

    state.asteroidBelt = createParticleBelt(1000, 82, 108, 4, [0.35, 0.65], 0.8, 0.6);
    state.kuiperBelt = createParticleBelt(1500, 280, 420, 12, [0.25, 0.5], 0.5, 0.5);
}
