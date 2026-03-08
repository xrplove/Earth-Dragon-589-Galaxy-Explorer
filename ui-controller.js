// ─── UI Controller Module ──────────────────────────────────────────────────
// Sidebar, search, time controls, fullscreen, screenshot, keyboard shortcuts

import state from './state.js';

const UIController = {
    speed: 1,
    orbitsVisible: true,
    labelsVisible: true,
    trailsVisible: false,
    atmospheresVisible: true,
    bloomEnabled: true,
    paused: false,

    simDate: new Date(2025, 0, 1),
    timeMultiplier: 1,
    _hudAccumulator: 0,

    init() {
        this._initSidebar();
        this._initViewControls();
        this._initCameraControls();
        this._initTimeControls();
        this._initToolControls();
        this._initSearch();
        this._initKeyboardShortcuts();
    },

    _initSidebar() {
        const toggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        if (toggle && sidebar) {
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                toggle.textContent = sidebar.classList.contains('collapsed') ? '\u25B6' : '\u25C0';
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
            speedSlider.addEventListener('input', () => {
                this.speed = parseFloat(speedSlider.value);
                if (speedVal) speedVal.textContent = this.speed.toFixed(1) + 'x';
            });
        }

        const toggleOrbits = document.getElementById('toggleOrbits');
        if (toggleOrbits) {
            toggleOrbits.addEventListener('change', () => {
                this.orbitsVisible = toggleOrbits.checked;
                if (state.celestialBodies) state.celestialBodies.setOrbitsVisible(this.orbitsVisible);
            });
        }

        const toggleLabels = document.getElementById('toggleLabels');
        if (toggleLabels) {
            toggleLabels.addEventListener('change', () => {
                this.labelsVisible = toggleLabels.checked;
            });
        }

        const toggleTrails = document.getElementById('toggleTrails');
        if (toggleTrails) {
            toggleTrails.addEventListener('change', () => {
                this.trailsVisible = toggleTrails.checked;
                if (state.trailRenderer) state.trailRenderer.setVisible(this.trailsVisible);
            });
        }

        const toggleAtmo = document.getElementById('toggleAtmospheres');
        if (toggleAtmo) {
            toggleAtmo.addEventListener('change', () => {
                this.atmospheresVisible = toggleAtmo.checked;
                if (state.effects) state.effects.setAtmospheresVisible(this.atmospheresVisible);
            });
        }

        const toggleBloom = document.getElementById('toggleBloom');
        if (toggleBloom) {
            toggleBloom.addEventListener('change', () => {
                this.bloomEnabled = toggleBloom.checked;
                if (state.postProcessing) state.postProcessing.setBloom(this.bloomEnabled);
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
            timeSlider.addEventListener('input', () => {
                this.timeMultiplier = parseFloat(timeSlider.value);
                if (timeVal) timeVal.textContent = this.timeMultiplier.toFixed(0) + 'x';
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

                case '?':
                case '/': {
                    const overlay = document.getElementById('shortcuts-overlay');
                    if (overlay) overlay.classList.toggle('visible');
                    break;
                }
            }
        });
    },

    _syncSpeedSlider() {
        const slider = document.getElementById('speed');
        const val = document.getElementById('speed-val');
        if (slider) slider.value = this.speed;
        if (val) val.textContent = this.speed.toFixed(1) + 'x';
    },

    update(delta) {
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
