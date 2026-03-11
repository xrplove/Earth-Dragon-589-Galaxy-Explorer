// ─── UI Controller Module ──────────────────────────────────────────────────
// Sidebar, search, time controls, fullscreen, screenshot, keyboard shortcuts

import state from './state.js';
import Sound from './sound.js';

const UIController = {
    speed: 1,
    orbitsVisible: true,
    labelsVisible: true,
    trailsVisible: false,
    atmospheresVisible: true,
    bloomEnabled: true,
    paused: false,
    perfVisible: false,

    simDate: new Date(2025, 0, 1),
    timeMultiplier: 1,
    _hudAccumulator: 0,
    _fpsFrames: 0,
    _fpsLastTime: performance.now(),

    init() {
        this._loadPreferences();
        this._initSidebar();
        this._initViewControls();
        this._initCameraControls();
        this._initTimeControls();
        this._initToolControls();
        this._initSearch();
        this._initKeyboardShortcuts();
        this._initNavigationLists();
    },

    _loadPreferences() {
        try {
            const saved = JSON.parse(localStorage.getItem('mygalaxy-prefs') || '{}');
            if (saved.orbitsVisible !== undefined) this.orbitsVisible = saved.orbitsVisible;
            if (saved.labelsVisible !== undefined) this.labelsVisible = saved.labelsVisible;
            if (saved.trailsVisible !== undefined) this.trailsVisible = saved.trailsVisible;
            if (saved.atmospheresVisible !== undefined) this.atmospheresVisible = saved.atmospheresVisible;
            if (saved.bloomEnabled !== undefined) this.bloomEnabled = saved.bloomEnabled;
            if (saved.speed !== undefined) this.speed = saved.speed;
            if (saved.timeMultiplier !== undefined) this.timeMultiplier = saved.timeMultiplier;
            if (saved.sidebarCollapsed) {
                const sidebar = document.getElementById('sidebar');
                const toggle = document.getElementById('sidebar-toggle');
                if (sidebar) sidebar.classList.add('collapsed');
                if (toggle) toggle.textContent = '\u25B6';
            }
        } catch (e) { /* ignore */ }
    },

    _savePreferences() {
        try {
            const sidebar = document.getElementById('sidebar');
            localStorage.setItem('mygalaxy-prefs', JSON.stringify({
                orbitsVisible: this.orbitsVisible,
                labelsVisible: this.labelsVisible,
                trailsVisible: this.trailsVisible,
                atmospheresVisible: this.atmospheresVisible,
                bloomEnabled: this.bloomEnabled,
                speed: this.speed,
                timeMultiplier: this.timeMultiplier,
                sidebarCollapsed: sidebar ? sidebar.classList.contains('collapsed') : false,
            }));
        } catch (e) { /* ignore */ }
    },

    _initSidebar() {
        const toggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        if (toggle && sidebar) {
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                toggle.textContent = sidebar.classList.contains('collapsed') ? '\u25B6' : '\u25C0';
                this._savePreferences();
            });
        }
        document.querySelectorAll('.sidebar-section-header').forEach(header => {
            header.addEventListener('click', () => {
                header.parentElement.classList.toggle('collapsed');
            });
        });
    },

    _initViewControls() {
        const speedSlider = document.getElementById('speed');
        const speedVal = document.getElementById('speed-val');
        if (speedSlider) {
            speedSlider.value = this.speed;
            if (speedVal) speedVal.textContent = this.speed.toFixed(1) + 'x';
            speedSlider.addEventListener('input', () => {
                this.speed = parseFloat(speedSlider.value);
                if (speedVal) speedVal.textContent = this.speed.toFixed(1) + 'x';
                this._savePreferences();
            });
        }

        const toggleOrbits = document.getElementById('toggleOrbits');
        if (toggleOrbits) {
            toggleOrbits.checked = this.orbitsVisible;
            toggleOrbits.addEventListener('change', () => {
                this.orbitsVisible = toggleOrbits.checked;
                if (state.celestialBodies) state.celestialBodies.setOrbitsVisible(this.orbitsVisible);
                this._savePreferences();
            });
        }

        const toggleLabels = document.getElementById('toggleLabels');
        if (toggleLabels) {
            toggleLabels.checked = this.labelsVisible;
            toggleLabels.addEventListener('change', () => {
                this.labelsVisible = toggleLabels.checked;
                this._savePreferences();
            });
        }

        const toggleTrails = document.getElementById('toggleTrails');
        if (toggleTrails) {
            toggleTrails.checked = this.trailsVisible;
            toggleTrails.addEventListener('change', () => {
                this.trailsVisible = toggleTrails.checked;
                if (state.trailRenderer) state.trailRenderer.setVisible(this.trailsVisible);
                this._savePreferences();
            });
        }

        const toggleAtmo = document.getElementById('toggleAtmospheres');
        if (toggleAtmo) {
            toggleAtmo.checked = this.atmospheresVisible;
            toggleAtmo.addEventListener('change', () => {
                this.atmospheresVisible = toggleAtmo.checked;
                if (state.effects) state.effects.setAtmospheresVisible(this.atmospheresVisible);
                this._savePreferences();
            });
        }

        const toggleBloom = document.getElementById('toggleBloom');
        if (toggleBloom) {
            toggleBloom.checked = this.bloomEnabled;
            toggleBloom.addEventListener('change', () => {
                this.bloomEnabled = toggleBloom.checked;
                if (state.postProcessing) state.postProcessing.setBloom(this.bloomEnabled);
                this._savePreferences();
            });
        }

        const toggleSound = document.getElementById('toggleSound');
        if (toggleSound) {
            toggleSound.addEventListener('change', () => {
                Sound.setEnabled(toggleSound.checked);
            });
        }
    },

    _initCameraControls() {
        const resetBtn = document.getElementById('resetCamera');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (state.cameraController) state.cameraController.resetCamera();
                const followSelect = document.getElementById('followTarget');
                if (followSelect) followSelect.value = '';
                const followCheck = document.getElementById('toggleFollow');
                if (followCheck) followCheck.checked = false;
            });
        }

        const followCheck = document.getElementById('toggleFollow');
        const followSelect = document.getElementById('followTarget');

        if (followCheck && followSelect) {
            const addOption = (name) => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                followSelect.appendChild(opt);
            };

            setTimeout(() => {
                if (state.celestialBodies) {
                    state.celestialBodies.allBodies.forEach(b => addOption(b.name));
                }
            }, 100);

            followCheck.addEventListener('change', () => {
                if (state.cameraController) {
                    state.cameraController.setFollowMode(followCheck.checked, followSelect.value);
                }
            });
            followSelect.addEventListener('change', () => {
                if (followCheck.checked && state.cameraController) {
                    state.cameraController.setFollowMode(true, followSelect.value);
                }
            });
        }
    },

    _initTimeControls() {
        const timeSlider = document.getElementById('timeMultiplier');
        const timeVal = document.getElementById('time-val');
        if (timeSlider) {
            timeSlider.value = this.timeMultiplier;
            if (timeVal) timeVal.textContent = this.timeMultiplier.toFixed(0) + 'x';
            timeSlider.addEventListener('input', () => {
                this.timeMultiplier = parseFloat(timeSlider.value);
                if (timeVal) timeVal.textContent = this.timeMultiplier.toFixed(0) + 'x';
                this._savePreferences();
            });
        }
    },

    _initToolControls() {
        const compareBtn = document.getElementById('compareBtn');
        if (compareBtn) {
            compareBtn.addEventListener('click', () => {
                if (state.comparisonMode) state.comparisonMode.toggle();
            });
        }

        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                    fullscreenBtn.textContent = 'Exit Fullscreen';
                } else {
                    document.exitFullscreen();
                    fullscreenBtn.textContent = 'Fullscreen';
                }
            });
        }

        const screenshotBtn = document.getElementById('screenshotBtn');
        if (screenshotBtn) {
            screenshotBtn.addEventListener('click', () => {
                const dataURL = state.renderer.domElement.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = 'solar-system-' + Date.now() + '.png';
                link.href = dataURL;
                link.click();
            });
        }

        // Measure distance button
        const measureBtn = document.getElementById('measureBtn');
        if (measureBtn) {
            measureBtn.addEventListener('click', () => {
                if (state.cameraController) state.cameraController.toggleMeasureMode();
            });
        }

        // Tour button
        const tourBtn = document.getElementById('tourBtn');
        if (tourBtn) {
            tourBtn.addEventListener('click', () => {
                if (state.guidedTour) state.guidedTour.start();
            });
        }
    },

    _initSearch() {
        const container = document.getElementById('search-container');
        const input = document.getElementById('search-input');
        const results = document.getElementById('search-results');
        if (!container || !input || !results) return;

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                container.classList.toggle('visible');
                if (container.classList.contains('visible')) {
                    input.focus();
                    input.select();
                } else {
                    results.classList.remove('visible');
                }
            }
            if (e.key === 'Escape') {
                container.classList.remove('visible');
                results.classList.remove('visible');
                // Also close help overlay
                const helpOverlay = document.getElementById('shortcuts-overlay');
                if (helpOverlay) helpOverlay.classList.remove('visible');
                // Close detail panel if open
                if (state.infoPanel) state.infoPanel.hide();
            }
        });

        input.addEventListener('input', () => {
            const query = input.value.toLowerCase().trim();
            results.innerHTML = '';

            if (!query || !state.celestialBodies) {
                results.classList.remove('visible');
                return;
            }

            const matches = state.celestialBodies.allBodies.filter(b =>
                b.name.toLowerCase().includes(query)
            );

            if (matches.length === 0) {
                results.classList.remove('visible');
                return;
            }

            matches.forEach(body => {
                const div = document.createElement('div');
                div.className = 'search-result-item';
                div.textContent = body.name;
                div.addEventListener('click', () => {
                    if (state.cameraController) state.cameraController.flyToByName(body.name);
                    container.classList.remove('visible');
                    results.classList.remove('visible');
                });
                results.appendChild(div);
            });

            results.classList.add('visible');
        });
    },

    _initKeyboardShortcuts() {
        const planetKeys = ['Sun', 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

        document.addEventListener('keydown', (e) => {
            // Ignore when typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const key = e.key;

            // Number keys 0-9: fly to planets/Sun
            if (key >= '0' && key <= '9') {
                const idx = parseInt(key);
                if (idx < planetKeys.length && state.cameraController) {
                    state.cameraController.flyToByName(planetKeys[idx]);
                }
                return;
            }

            switch (key) {
                case ' ':
                    e.preventDefault();
                    this.paused = !this.paused;
                    break;

                case '+':
                case '=':
                    this.speed = Math.min(5, this.speed + 0.5);
                    this._syncSpeedSlider();
                    break;

                case '-':
                case '_':
                    this.speed = Math.max(0, this.speed - 0.5);
                    this._syncSpeedSlider();
                    break;

                case 'r':
                case 'R':
                    if (state.cameraController) state.cameraController.resetCamera();
                    break;

                case 'o':
                case 'O': {
                    this.orbitsVisible = !this.orbitsVisible;
                    if (state.celestialBodies) state.celestialBodies.setOrbitsVisible(this.orbitsVisible);
                    const cb = document.getElementById('toggleOrbits');
                    if (cb) cb.checked = this.orbitsVisible;
                    break;
                }

                case 'l':
                case 'L': {
                    this.labelsVisible = !this.labelsVisible;
                    const cb = document.getElementById('toggleLabels');
                    if (cb) cb.checked = this.labelsVisible;
                    break;
                }

                case 't':
                case 'T': {
                    this.trailsVisible = !this.trailsVisible;
                    if (state.trailRenderer) state.trailRenderer.setVisible(this.trailsVisible);
                    const cb = document.getElementById('toggleTrails');
                    if (cb) cb.checked = this.trailsVisible;
                    break;
                }

                case 'g':
                case 'G':
                    if (state.guidedTour) state.guidedTour.start();
                    break;

                case 'f':
                case 'F': {
                    this.perfVisible = !this.perfVisible;
                    const perfEl = document.getElementById('perf-stats');
                    if (perfEl) perfEl.classList.toggle('visible', this.perfVisible);
                    break;
                }

                case '?':
                case '/': {
                    const overlay = document.getElementById('shortcuts-overlay');
                    if (overlay) overlay.classList.toggle('visible');
                    break;
                }
            }
        });
    },

    _initNavigationLists() {
        const dwarfNames = ['Pluto', 'Ceres', 'Eris', 'Haumea', 'Makemake'];
        const cometNames = ["Halley's Comet", 'Hale-Bopp', 'Encke'];

        const toolsSection = document.querySelector('#sidebar .sidebar-section:last-child');
        if (!toolsSection) return;

        const createSection = (title, names) => {
            const section = document.createElement('div');
            section.className = 'sidebar-section';
            section.innerHTML = `<div class="sidebar-section-header">${title} <span class="arrow">&#9660;</span></div>`;
            const content = document.createElement('div');
            content.className = 'sidebar-section-content';
            names.forEach(name => {
                const btn = document.createElement('button');
                btn.className = 'sidebar-btn';
                btn.textContent = name;
                btn.addEventListener('click', () => {
                    if (state.cameraController) state.cameraController.flyToByName(name);
                });
                content.appendChild(btn);
            });
            section.appendChild(content);
            section.querySelector('.sidebar-section-header').addEventListener('click', () => {
                section.classList.toggle('collapsed');
            });
            return section;
        };

        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.insertBefore(createSection('Dwarf Planets', dwarfNames), toolsSection);
            sidebar.insertBefore(createSection('Comets', cometNames), toolsSection);
        }
    },

    _syncSpeedSlider() {
        const slider = document.getElementById('speed');
        const val = document.getElementById('speed-val');
        if (slider) slider.value = this.speed;
        if (val) val.textContent = this.speed.toFixed(1) + 'x';
    },

    update(delta) {
        // FPS counter (always counts, only renders when visible)
        this._fpsFrames++;
        const now = performance.now();
        if (now - this._fpsLastTime >= 1000) {
            if (this.perfVisible && state.renderer) {
                const info = state.renderer.info;
                document.getElementById('perf-fps').textContent = this._fpsFrames;
                document.getElementById('perf-draws').textContent = info.render.calls;
                document.getElementById('perf-tris').textContent = info.render.triangles.toLocaleString();
                document.getElementById('perf-geom').textContent = info.memory.geometries;
            }
            this._fpsFrames = 0;
            this._fpsLastTime = now;
        }

        if (this.paused) return;

        const daysPerSecond = this.timeMultiplier * delta;
        this.simDate.setTime(this.simDate.getTime() + daysPerSecond * 86400000);

        this._hudAccumulator += delta;
        if (this._hudAccumulator >= 1.0) {
            this._hudAccumulator = 0;
            const dateEl = document.getElementById('hud-date');
            const distEl = document.getElementById('hud-distance');
            if (dateEl) {
                const opts = { year: 'numeric', month: 'short', day: 'numeric' };
                dateEl.textContent = this.simDate.toLocaleDateString('en-US', opts);
            }
            if (distEl && state.camera) {
                const dist = state.camera.position.length();
                const au = (dist / 54).toFixed(2);
                distEl.textContent = au + ' AU from origin';
            }
        }
    }
};

export default UIController;
