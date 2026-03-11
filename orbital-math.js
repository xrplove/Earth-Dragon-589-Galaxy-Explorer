// ─── Orbital Mathematics ──────────────────────────────────────────────────────
// Pure math functions for Kepler orbits, extracted for testability

/**
 * Solve Kepler's equation M = E - e·sin(E) using Newton-Raphson iteration.
 * @param {number} M - Mean anomaly (radians)
 * @param {number} e - Eccentricity (0 = circle, <1 = ellipse)
 * @param {number} tolerance - Convergence tolerance
 * @returns {number} Eccentric anomaly E (radians)
 */
export function solveKepler(M, e, tolerance = 1e-6) {
    let E = e > 0.8 ? Math.PI : M;
    for (let i = 0; i < 30; i++) {
        const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        E -= dE;
        if (Math.abs(dE) < tolerance) break;
    }
    return E;
}

/**
 * Compute 3D position from orbital elements.
 * @param {number} meanAnomaly - Mean anomaly (radians)
 * @param {number} a - Semi-major axis
 * @param {number} e - Eccentricity
 * @param {number} inclination - Orbital inclination (radians)
 * @param {number} ascendingNode - Longitude of ascending node (radians)
 * @returns {{ x: number, y: number, z: number }}
 */
export function orbitalPosition(meanAnomaly, a, e, inclination, ascendingNode) {
    const E = solveKepler(meanAnomaly, e, 1e-6);
    const b = a * Math.sqrt(1 - e * e);

    const xOrb = a * (Math.cos(E) - e);
    const yOrb = b * Math.sin(E);

    const cosO = Math.cos(ascendingNode);
    const sinO = Math.sin(ascendingNode);
    const xRot = xOrb * cosO - yOrb * sinO;
    const zRot = xOrb * sinO + yOrb * cosO;

    const cosI = Math.cos(inclination);
    const sinI = Math.sin(inclination);
    const x = xRot;
    const y = zRot * sinI;
    const z = zRot * cosI;

    return { x, y, z };
}

/**
 * Convert AU to scene units (54 units = 1 AU)
 */
export function auToUnits(au) {
    return au * 54;
}

/**
 * Convert scene units to AU
 */
export function unitsToAu(units) {
    return units / 54;
}

/**
 * Easing function for fly-to animations
 */
export function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
