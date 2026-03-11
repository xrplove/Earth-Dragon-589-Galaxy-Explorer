import { describe, it, expect } from 'vitest';
import { solveKepler, orbitalPosition, auToUnits, unitsToAu, easeInOutCubic } from '../orbital-math.js';

describe('solveKepler', () => {
    it('returns M for circular orbit (e=0)', () => {
        const M = 1.5;
        const E = solveKepler(M, 0);
        expect(E).toBeCloseTo(M, 6);
    });

    it('converges for low eccentricity (e=0.0167, Earth)', () => {
        const M = Math.PI / 4;
        const E = solveKepler(M, 0.0167);
        // Verify Kepler's equation: M = E - e*sin(E)
        const residual = E - 0.0167 * Math.sin(E) - M;
        expect(Math.abs(residual)).toBeLessThan(1e-6);
    });

    it('converges for moderate eccentricity (e=0.2056, Mercury)', () => {
        const M = 2.0;
        const E = solveKepler(M, 0.2056);
        const residual = E - 0.2056 * Math.sin(E) - M;
        expect(Math.abs(residual)).toBeLessThan(1e-6);
    });

    it('converges for high eccentricity (e=0.967, Halley)', () => {
        const M = 0.5;
        const E = solveKepler(M, 0.967);
        const residual = E - 0.967 * Math.sin(E) - M;
        expect(Math.abs(residual)).toBeLessThan(1e-6);
    });

    it('handles M=0 (perihelion)', () => {
        const E = solveKepler(0, 0.5);
        expect(E).toBeCloseTo(0, 6);
    });

    it('handles M=PI (aphelion)', () => {
        const E = solveKepler(Math.PI, 0.5);
        expect(E).toBeCloseTo(Math.PI, 5);
    });

    it('converges for near-parabolic eccentricity (e=0.99)', () => {
        const M = 0.3;
        const E = solveKepler(M, 0.99);
        const residual = E - 0.99 * Math.sin(E) - M;
        expect(Math.abs(residual)).toBeLessThan(1e-5);
    });

    it('respects custom tolerance', () => {
        const M = 1.0;
        const E_fine = solveKepler(M, 0.5, 1e-10);
        const residual = E_fine - 0.5 * Math.sin(E_fine) - M;
        expect(Math.abs(residual)).toBeLessThan(1e-10);
    });
});

describe('orbitalPosition', () => {
    it('returns position on x-axis at perihelion (M=0, e=0, i=0)', () => {
        const pos = orbitalPosition(0, 100, 0, 0, 0);
        expect(pos.x).toBeCloseTo(100, 3);
        expect(pos.y).toBeCloseTo(0, 3);
        expect(pos.z).toBeCloseTo(0, 3);
    });

    it('returns position at distance a for circular orbit', () => {
        const a = 50;
        const pos = orbitalPosition(Math.PI / 2, a, 0, 0, 0);
        const dist = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
        expect(dist).toBeCloseTo(a, 2);
    });

    it('stays in xz-plane when inclination=0', () => {
        const pos = orbitalPosition(1.0, 80, 0.1, 0, 0);
        expect(pos.y).toBeCloseTo(0, 5);
    });

    it('has y-component when inclination > 0', () => {
        const pos = orbitalPosition(Math.PI / 4, 80, 0.1, Math.PI / 6, 0);
        expect(Math.abs(pos.y)).toBeGreaterThan(0.1);
    });

    it('perihelion distance = a(1-e)', () => {
        const a = 100;
        const e = 0.5;
        const pos = orbitalPosition(0, a, e, 0, 0);
        const dist = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
        expect(dist).toBeCloseTo(a * (1 - e), 2);
    });

    it('aphelion distance = a(1+e)', () => {
        const a = 100;
        const e = 0.5;
        const pos = orbitalPosition(Math.PI, a, e, 0, 0);
        const dist = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
        expect(dist).toBeCloseTo(a * (1 + e), 2);
    });

    it('ascending node rotates the orbit in the xz-plane', () => {
        const pos0 = orbitalPosition(0, 100, 0, 0, 0);
        const posR = orbitalPosition(0, 100, 0, 0, Math.PI / 2);
        // With 90-degree ascending node, x should become z
        expect(posR.z).toBeCloseTo(pos0.x, 2);
        expect(posR.x).toBeCloseTo(-pos0.z, 2);
    });
});

describe('unit conversions', () => {
    it('auToUnits converts correctly', () => {
        expect(auToUnits(1)).toBe(54);
        expect(auToUnits(0)).toBe(0);
        expect(auToUnits(5.2)).toBeCloseTo(280.8, 1);
    });

    it('unitsToAu converts correctly', () => {
        expect(unitsToAu(54)).toBe(1);
        expect(unitsToAu(0)).toBe(0);
        expect(unitsToAu(108)).toBe(2);
    });

    it('roundtrip conversion', () => {
        const au = 3.14;
        expect(unitsToAu(auToUnits(au))).toBeCloseTo(au, 10);
    });
});

describe('easeInOutCubic', () => {
    it('returns 0 at t=0', () => {
        expect(easeInOutCubic(0)).toBe(0);
    });

    it('returns 1 at t=1', () => {
        expect(easeInOutCubic(1)).toBe(1);
    });

    it('returns 0.5 at t=0.5', () => {
        expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 5);
    });

    it('is monotonically increasing', () => {
        let prev = 0;
        for (let t = 0.05; t <= 1; t += 0.05) {
            const val = easeInOutCubic(t);
            expect(val).toBeGreaterThanOrEqual(prev);
            prev = val;
        }
    });

    it('is symmetric around midpoint', () => {
        expect(easeInOutCubic(0.25)).toBeCloseTo(1 - easeInOutCubic(0.75), 5);
    });
});
