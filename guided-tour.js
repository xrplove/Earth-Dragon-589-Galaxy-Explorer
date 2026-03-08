// ─── Guided Tour Module ───────────────────────────────────────────────────
// 10-step tour through the solar system with descriptive text

import state from './state.js';

const TOUR_STEPS = [
    {
        target: 'Sun',
        title: 'The Sun',
        text: 'Our journey begins at the Sun — a G2V main-sequence star containing 99.86% of our solar system\'s total mass. Its surface temperature reaches 5,778 K, while the core burns at 15.7 million K.',
        duration: 8000
    },
    {
        target: 'Mercury',
        title: 'Mercury',
        text: 'The smallest planet and closest to the Sun. Mercury\'s surface is covered in craters, and its day lasts longer than its year — 176 Earth days from sunrise to sunrise.',
        duration: 7000
    },
    {
        target: 'Venus',
        title: 'Venus',
        text: 'Earth\'s "evil twin" — similar in size but with a crushing CO₂ atmosphere and surface temperatures of 464°C. It rotates backwards compared to most planets.',
        duration: 7000
    },
    {
        target: 'Earth',
        title: 'Earth',
        text: 'Our home — the only known world with liquid water on its surface, a protective magnetic field, and the conditions for life. Notice the cloud layer and the blue atmospheric glow.',
        duration: 8000
    },
    {
        target: 'Mars',
        title: 'Mars',
        text: 'The Red Planet, home to Olympus Mons — the tallest volcano in the solar system at nearly 3x the height of Everest. Its two tiny moons, Phobos and Deimos, orbit nearby.',
        duration: 7000
    },
    {
        target: 'Jupiter',
        title: 'Jupiter',
        text: 'The king of planets — a gas giant with mass exceeding all other planets combined. Its four Galilean moons (Io, Europa, Ganymede, Callisto) are worlds in their own right.',
        duration: 8000
    },
    {
        target: 'Saturn',
        title: 'Saturn',
        text: 'The jewel of the solar system with its spectacular ring system. Saturn is so light it would float in water! Seven of its major moons orbit among the icy rings.',
        duration: 8000
    },
    {
        target: 'Uranus',
        title: 'Uranus',
        text: 'The sideways planet — tilted at 98°, likely from a massive ancient collision. This ice giant has faint rings and five major moons discovered by Voyager 2.',
        duration: 7000
    },
    {
        target: 'Neptune',
        title: 'Neptune',
        text: 'The farthest planet, found by mathematical prediction. Neptune has the strongest winds in the solar system (2,100 km/h) and its moon Triton orbits backwards.',
        duration: 7000
    },
    {
        target: 'Pluto',
        title: 'Pluto',
        text: 'The beloved dwarf planet at the edge of the Kuiper Belt. Its heart-shaped glacier, Tombaugh Regio, was revealed by New Horizons in 2015. A fitting end to our tour.',
        duration: 8000
    }
];

const GuidedTour = {
    active: false,
    currentStep: 0,
    autoTimer: null,

    start() {
        if (this.active) {
            this.end();
            return;
        }
        this.active = true;
        this.currentStep = 0;
        this._showOverlay();
        this._goToStep(0);
    },

    end() {
        this.active = false;
        if (this.autoTimer) clearTimeout(this.autoTimer);
        this.autoTimer = null;
        this._hideOverlay();
    },

    next() {
        if (this.currentStep < TOUR_STEPS.length - 1) {
            this._goToStep(this.currentStep + 1);
        } else {
            this.end();
        }
    },

    prev() {
        if (this.currentStep > 0) {
            this._goToStep(this.currentStep - 1);
        }
    },

    _goToStep(idx) {
        this.currentStep = idx;
        const step = TOUR_STEPS[idx];

        // Fly to the body
        if (state.cameraController) {
            state.cameraController.flyToByName(step.target);
        }

        // Update overlay text
        const titleEl = document.getElementById('tour-title');
        const textEl = document.getElementById('tour-text');
        const countEl = document.getElementById('tour-count');
        const prevBtn = document.getElementById('tour-prev');

        if (titleEl) titleEl.textContent = step.title;
        if (textEl) textEl.textContent = step.text;
        if (countEl) countEl.textContent = `${idx + 1} / ${TOUR_STEPS.length}`;
        if (prevBtn) prevBtn.disabled = idx === 0;

        // Auto-advance timer
        if (this.autoTimer) clearTimeout(this.autoTimer);
        this.autoTimer = setTimeout(() => {
            if (this.active) this.next();
        }, step.duration);
    },

    _showOverlay() {
        const overlay = document.getElementById('tour-overlay');
        if (!overlay) return;
        overlay.classList.add('visible');

        // Wire buttons
        const prevBtn = document.getElementById('tour-prev');
        const nextBtn = document.getElementById('tour-next');
        const endBtn = document.getElementById('tour-end');

        if (prevBtn) prevBtn.onclick = () => this.prev();
        if (nextBtn) nextBtn.onclick = () => this.next();
        if (endBtn) endBtn.onclick = () => this.end();
    },

    _hideOverlay() {
        const overlay = document.getElementById('tour-overlay');
        if (overlay) overlay.classList.remove('visible');
    }
};

export default GuidedTour;
