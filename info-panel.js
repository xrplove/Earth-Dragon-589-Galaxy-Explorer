// ─── Info Panel Module ─────────────────────────────────────────────────────
// Detailed planet stats panel with tabs

import state from './state.js';

const InfoPanel = {
    panel: null,
    currentBody: null,

    init() {
        this.panel = document.getElementById('detail-panel');
        if (!this.panel) return;

        const closeBtn = document.getElementById('detail-panel-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        this.panel.querySelectorAll('.detail-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this._switchTab(tab.dataset.tab);
            });
        });

        const flyToBtn = document.getElementById('detail-flyto');
        if (flyToBtn) {
            flyToBtn.addEventListener('click', () => {
                if (this.currentBody && state.cameraController) {
                    state.cameraController.flyToByName(this.currentBody.name);
                }
            });
        }

        const followBtn = document.getElementById('detail-follow');
        if (followBtn) {
            followBtn.addEventListener('click', () => {
                if (this.currentBody && state.cameraController) {
                    state.cameraController.setFollowMode(true, this.currentBody.name);
                    const followCheck = document.getElementById('toggleFollow');
                    const followSelect = document.getElementById('followTarget');
                    if (followCheck) followCheck.checked = true;
                    if (followSelect) followSelect.value = this.currentBody.name;
                }
            });
        }
    },

    show(userData) {
        if (!this.panel) return;

        const bodyData = userData.bodyData;
        if (!bodyData) {
            this._showBasic(userData);
            return;
        }

        this.currentBody = userData;

        const nameEl = this.panel.querySelector('#detail-name');
        const subtitleEl = this.panel.querySelector('#detail-subtitle');
        if (nameEl) nameEl.textContent = userData.name;
        if (subtitleEl) {
            const typeMap = { planet: 'Planet', dwarf: 'Dwarf Planet', moon: 'Moon', comet: 'Comet', star: 'Star' };
            subtitleEl.textContent = typeMap[userData.bodyType] || 'Celestial Body';
        }

        const descEl = this.panel.querySelector('#detail-description');
        const factEl = this.panel.querySelector('#detail-funfact');
        if (descEl) descEl.textContent = bodyData.description || userData.info || '';
        if (factEl) factEl.textContent = bodyData.funFact || '';

        const statsTable = this.panel.querySelector('#detail-stats-body');
        if (statsTable && !bodyData.stats) {
            statsTable.innerHTML = '<tr><td colspan="2" style="opacity:0.5;font-size:12px;text-align:center;">No statistics available</td></tr>';
        }
        if (statsTable && bodyData.stats) {
            statsTable.innerHTML = '';
            const labels = {
                diameter: 'Diameter',
                mass: 'Mass',
                gravity: 'Surface Gravity',
                density: 'Density',
                distanceFromSun: 'Distance from Sun',
                orbitalPeriod: 'Orbital Period',
                rotationPeriod: 'Rotation Period',
                atmosphere: 'Atmosphere',
                avgTemperature: 'Avg Temperature',
                discoveredBy: 'Discovered',
                numberOfMoons: 'Moons',
                eccentricity: 'Eccentricity',
                perihelion: 'Perihelion',
                aphelion: 'Aphelion',
                lastPerihelion: 'Last Perihelion',
                nextPerihelion: 'Next Perihelion',
                surfaceTemperature: 'Surface Temp',
                coreTemperature: 'Core Temp',
                luminosity: 'Luminosity',
                age: 'Age',
                spectralType: 'Spectral Type',
                composition: 'Composition'
            };
            Object.entries(bodyData.stats).forEach(([key, val]) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${labels[key] || key}</td><td>${val}</td>`;
                statsTable.appendChild(tr);
            });
        }

        const moonsList = this.panel.querySelector('#detail-moons');
        if (moonsList) {
            moonsList.innerHTML = '';
            const moons = bodyData.moons || [];
            if (moons.length === 0) {
                moonsList.innerHTML = '<p style="opacity:0.5;font-size:12px;">No known moons</p>';
            } else {
                moons.forEach(m => {
                    const div = document.createElement('div');
                    div.className = 'moon-item';
                    div.innerHTML = `<div class="moon-name">${m.name}</div><div class="moon-info">${m.info || ''}</div>`;
                    moonsList.appendChild(div);
                });
            }
        }

        this._switchTab('overview');
        this.panel.classList.add('open');
    },

    _showBasic(userData) {
        this.currentBody = userData;
        const nameEl = this.panel.querySelector('#detail-name');
        const subtitleEl = this.panel.querySelector('#detail-subtitle');
        if (nameEl) nameEl.textContent = userData.name;
        if (subtitleEl) subtitleEl.textContent = 'Star';

        const descEl = this.panel.querySelector('#detail-description');
        if (descEl) descEl.textContent = userData.info || '';
        const factEl = this.panel.querySelector('#detail-funfact');
        if (factEl) factEl.textContent = '';

        const statsTable = this.panel.querySelector('#detail-stats-body');
        if (statsTable) statsTable.innerHTML = '';
        const moonsList = this.panel.querySelector('#detail-moons');
        if (moonsList) moonsList.innerHTML = '<p style="opacity:0.5;font-size:12px;">N/A</p>';

        this._switchTab('overview');
        this.panel.classList.add('open');
    },

    hide() {
        if (this.panel) this.panel.classList.remove('open');
        this.currentBody = null;
    },

    _switchTab(tabName) {
        if (!this.panel) return;
        this.panel.querySelectorAll('.detail-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
        });
        this.panel.querySelectorAll('.detail-tab-panel').forEach(p => {
            p.classList.toggle('active', p.dataset.tab === tabName);
        });
    }
};

export default InfoPanel;
