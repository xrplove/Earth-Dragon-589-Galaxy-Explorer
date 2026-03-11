// ─── Sound Module ─────────────────────────────────────────────────────────────
// Procedural ambient soundscape using Web Audio API (zero audio files)
// Space drone that shifts tone based on proximity, plus fly-to whoosh

const Sound = {
    ctx: null,
    master: null,
    drone: null,
    droneGain: null,
    enabled: false,
    volume: 0.3,

    init() {
        // Defer AudioContext creation until first user interaction
        const activate = () => {
            if (this.ctx) return;
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                this.master = this.ctx.createGain();
                this.master.gain.value = this.volume;
                this.master.connect(this.ctx.destination);
                this._startDrone();
                this.enabled = true;
            } catch (e) {
                // Web Audio not supported — silent mode
            }
            document.removeEventListener('click', activate);
            document.removeEventListener('keydown', activate);
        };
        document.addEventListener('click', activate, { once: true });
        document.addEventListener('keydown', activate, { once: true });
    },

    _startDrone() {
        // Deep space ambient drone: layered oscillators with slow modulation
        const ctx = this.ctx;

        this.droneGain = ctx.createGain();
        this.droneGain.gain.value = 0.15;
        this.droneGain.connect(this.master);

        // Base tone — very low frequency hum
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = 55; // A1
        const g1 = ctx.createGain();
        g1.gain.value = 0.4;
        osc1.connect(g1).connect(this.droneGain);
        osc1.start();

        // Subtle harmonic
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 82.5; // E2
        const g2 = ctx.createGain();
        g2.gain.value = 0.15;
        osc2.connect(g2).connect(this.droneGain);
        osc2.start();

        // LFO for slow pulsing
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.08; // Very slow pulse
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.05;
        lfo.connect(lfoGain).connect(this.droneGain.gain);
        lfo.start();

        this.drone = { osc1, osc2, lfo, g1, g2, lfoGain };
    },

    playFlyTo() {
        if (!this.ctx || !this.enabled) return;
        const ctx = this.ctx;

        // Whoosh: filtered noise sweep
        const duration = 1.8;
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 400;
        filter.Q.value = 2;

        // Sweep filter frequency up then down
        const now = ctx.currentTime;
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.linearRampToValueAtTime(2000, now + duration * 0.4);
        filter.frequency.linearRampToValueAtTime(300, now + duration);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
        gain.gain.linearRampToValueAtTime(0.04, now + duration * 0.5);
        gain.gain.linearRampToValueAtTime(0, now + duration);

        source.connect(filter).connect(gain).connect(this.master);
        source.start(now);
        source.stop(now + duration);
    },

    playClick() {
        if (!this.ctx || !this.enabled) return;
        const ctx = this.ctx;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 800;

        const gain = ctx.createGain();
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);

        osc.connect(gain).connect(this.master);
        osc.start(now);
        osc.stop(now + 0.15);
    },

    setVolume(v) {
        this.volume = Math.max(0, Math.min(1, v));
        if (this.master) {
            this.master.gain.value = this.volume;
        }
    },

    setEnabled(on) {
        this.enabled = on;
        if (this.droneGain) {
            this.droneGain.gain.value = on ? 0.15 : 0;
        }
    }
};

export default Sound;
