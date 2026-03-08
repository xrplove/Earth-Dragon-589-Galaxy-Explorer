// ─── Visual Effects Module ─────────────────────────────────────────────────
// Atmosphere glow, sun corona, shooting stars, nebula clouds

import * as THREE from 'three';
import state from './state.js';

const _tempVec3 = new THREE.Vector3();
const _tempVec3b = new THREE.Vector3();

// ─── Fresnel Atmosphere Shader with Sunward Brightening ──────────────────────
const atmosphereVertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldNormal;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const atmosphereFragmentShader = `
    uniform vec3 glowColor;
    uniform float intensity;
    uniform vec3 sunDirection;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldNormal;

    void main() {
        vec3 viewDir = normalize(-vPosition);
        float fresnel = 1.0 - dot(viewDir, vNormal);
        fresnel = pow(fresnel, 2.5);

        // Sunward brightening — simple Rayleigh scatter approximation
        float sunFacing = max(0.0, dot(vWorldNormal, sunDirection));
        float scatter = 0.5 + 0.5 * pow(sunFacing, 1.5);

        // Limb brightening on the sun-facing side
        float rimLight = fresnel * scatter;

        gl_FragColor = vec4(glowColor * scatter, rimLight * intensity);
    }
`;

// ─── Enhanced Sun Corona Shader with FBM ─────────────────────────────────────
const coronaVertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const coronaFragmentShader = `
    uniform float time;
    uniform vec3 color1;
    uniform vec3 color2;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;

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
        vec3 viewDir = normalize(-vPosition);
        float fresnel = 1.0 - dot(viewDir, vNormal);
        fresnel = pow(fresnel, 1.6);

        // Multi-octave FBM noise for organic corona movement
        float n = fbm(vUv * 8.0 + time * 0.25);
        n += fbm(vUv * 16.0 - time * 0.4) * 0.5;
        n += fbm(vUv * 32.0 + time * 0.6) * 0.25;
        n = n / 1.75;

        // Solar prominences — spiky features at the edge
        float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
        float prominence = fbm(vec2(angle * 4.0, time * 0.15)) * 0.4;
        prominence *= smoothstep(0.3, 0.5, fresnel);

        vec3 col = mix(color1, color2, n);
        col += vec3(1.0, 0.6, 0.1) * prominence;

        float alpha = fresnel * (0.5 + n * 0.4 + prominence);
        gl_FragColor = vec4(col, alpha);
    }
`;

const Effects = {
    atmospheres: [],
    coronaMesh: null,
    coronaMaterial: null,
    meteors: [],
    meteorPool: [],
    meteorTimer: 0,
    meteorInterval: 3,
    nebulae: [],
    atmospheresVisible: true,

    init() {
        this._createSunCorona();
        this._createMeteorPool();
        this._createNebulaClouds();
        this._configureShadows();
    },

    createAtmosphere(planetMesh, atmosphereConfig) {
        if (!atmosphereConfig) return null;

        const radius = planetMesh.geometry.parameters.radius;
        const glowGeom = new THREE.SphereGeometry(radius * atmosphereConfig.size, 32, 32);
        const glowMat = new THREE.ShaderMaterial({
            vertexShader: atmosphereVertexShader,
            fragmentShader: atmosphereFragmentShader,
            uniforms: {
                glowColor: { value: new THREE.Color().fromArray(atmosphereConfig.color) },
                intensity: { value: atmosphereConfig.intensity },
                sunDirection: { value: new THREE.Vector3(0, 0, 0) }
            },
            side: THREE.BackSide,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const glowMesh = new THREE.Mesh(glowGeom, glowMat);
        this.atmospheres.push({ mesh: glowMesh, parent: planetMesh });
        state.scene.add(glowMesh);
        return glowMesh;
    },

    _createSunCorona() {
        const sunRadius = 14;
        const coronaGeom = new THREE.SphereGeometry(sunRadius * 1.4, 48, 48);
        this.coronaMaterial = new THREE.ShaderMaterial({
            vertexShader: coronaVertexShader,
            fragmentShader: coronaFragmentShader,
            uniforms: {
                time: { value: 0 },
                color1: { value: new THREE.Color(0xff6600) },
                color2: { value: new THREE.Color(0xffcc00) }
            },
            side: THREE.BackSide,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.coronaMesh = new THREE.Mesh(coronaGeom, this.coronaMaterial);
        state.scene.add(this.coronaMesh);
    },

    _createMeteorPool() {
        for (let i = 0; i < 20; i++) {
            const geom = new THREE.BufferGeometry();
            const positions = new Float32Array(6);
            geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const mat = new THREE.LineBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0
            });
            const line = new THREE.Line(geom, mat);
            line.visible = false;
            state.scene.add(line);
            this.meteorPool.push({
                line,
                active: false,
                life: 0,
                maxLife: 1,
                start: new THREE.Vector3(),
                direction: new THREE.Vector3(),
                speed: 500,
                length: 15
            });
        }
    },

    _spawnMeteor() {
        const meteor = this.meteorPool.find(m => !m.active);
        if (!meteor) return;

        const dist = 800 + Math.random() * 700;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;

        meteor.start.set(
            dist * Math.sin(phi) * Math.cos(theta),
            dist * Math.sin(phi) * Math.sin(theta) * 0.3 + 100,
            dist * Math.cos(phi)
        );
        meteor.direction.set(
            -0.5 + Math.random(),
            -0.3 - Math.random() * 0.5,
            -0.5 + Math.random()
        ).normalize();

        meteor.speed = 400 + Math.random() * 400;
        meteor.length = 10 + Math.random() * 20;
        meteor.maxLife = 0.5 + Math.random();
        meteor.life = 0;
        meteor.active = true;
        meteor.line.visible = true;
    },

    _createNebulaClouds() {
        for (let i = 0; i < 5; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');

            const hue1 = Math.random() * 360;
            const hue2 = (hue1 + 30 + Math.random() * 60) % 360;

            for (let layer = 0; layer < 3; layer++) {
                const cx = 64 + Math.random() * 128;
                const cy = 64 + Math.random() * 128;
                const radius = 60 + Math.random() * 80;
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
                const h = layer === 0 ? hue1 : hue2;
                grad.addColorStop(0, `hsla(${h}, 80%, 60%, 0.3)`);
                grad.addColorStop(0.5, `hsla(${h}, 60%, 40%, 0.1)`);
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, 256, 256);
            }

            const tex = new THREE.CanvasTexture(canvas);
            const mat = new THREE.SpriteMaterial({
                map: tex,
                transparent: true,
                opacity: 0.15,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const sprite = new THREE.Sprite(mat);

            const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.5;
            const d = 2000 + Math.random() * 500;
            sprite.position.set(
                Math.cos(angle) * d,
                -200 + Math.random() * 400,
                Math.sin(angle) * d
            );
            sprite.scale.set(800, 800, 1);

            state.scene.add(sprite);
            this.nebulae.push(sprite);
        }
    },

    _configureShadows() {
        const light = state.sunLight;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 500;
    },

    setAtmospheresVisible(v) {
        this.atmospheresVisible = v;
        this.atmospheres.forEach(a => { a.mesh.visible = v; });
    },

    update(delta, elapsed) {
        // Corona animation
        if (this.coronaMaterial) {
            this.coronaMaterial.uniforms.time.value = elapsed;
        }

        // Atmosphere positions track parent + update sunDirection
        this.atmospheres.forEach(atm => {
            const worldPos = atm.parent.getWorldPosition(_tempVec3);
            atm.mesh.position.copy(worldPos);

            // Update sun direction uniform for sunward brightening
            const sunDir = _tempVec3b.copy(worldPos).negate().normalize();
            if (atm.mesh.material.uniforms && atm.mesh.material.uniforms.sunDirection) {
                atm.mesh.material.uniforms.sunDirection.value.copy(sunDir);
            }
        });

        // Meteor spawning
        this.meteorTimer += delta;
        if (this.meteorTimer >= this.meteorInterval) {
            this._spawnMeteor();
            this.meteorTimer = 0;
            this.meteorInterval = 2 + Math.random() * 6;
        }

        // Meteor animation
        this.meteorPool.forEach(m => {
            if (!m.active) return;
            m.life += delta;
            const t = m.life / m.maxLife;

            if (t >= 1) {
                m.active = false;
                m.line.visible = false;
                m.line.material.opacity = 0;
                return;
            }

            _tempVec3.copy(m.start).addScaledVector(m.direction, m.speed * m.life);
            _tempVec3b.copy(_tempVec3).addScaledVector(m.direction, -m.length);

            const positions = m.line.geometry.attributes.position.array;
            positions[0] = _tempVec3.x;
            positions[1] = _tempVec3.y;
            positions[2] = _tempVec3.z;
            positions[3] = _tempVec3b.x;
            positions[4] = _tempVec3b.y;
            positions[5] = _tempVec3b.z;
            m.line.geometry.attributes.position.needsUpdate = true;

            const fade = t < 0.2 ? t / 0.2 : 1 - ((t - 0.2) / 0.8);
            m.line.material.opacity = fade * 0.8;
        });
    }
};

export default Effects;
