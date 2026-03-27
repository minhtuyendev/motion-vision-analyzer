import type { TrackingPoint, MotionType } from "@/types/analysis";

/**
 * Generate theoretical points by FITTING a physics model to the experimental data.
 * This ensures the theoretical curve is always in the same coordinate space as experiments.
 * AI-provided params are used as initial hints but we re-fit from data.
 */
export function generateTheoretical(
  motionType: MotionType,
  params: Record<string, number>,
  timestamps: number[],
  experimentalPoints?: TrackingPoint[]
): TrackingPoint[] {
  if (!experimentalPoints || experimentalPoints.length < 2) {
    // Fallback: use AI params directly (may be inaccurate)
    return generateFromParams(motionType, params, timestamps);
  }

  // Fit theoretical model to experimental data
  const fitted = fitModel(motionType, experimentalPoints);
  return fitted;
}

/**
 * Fit a physics model to experimental data using least-squares regression.
 * All values stay in normalized 0-1 coordinate space.
 */
function fitModel(motionType: MotionType, points: TrackingPoint[]): TrackingPoint[] {
  const ts = points.map(p => p.timestamp);
  const xs = points.map(p => p.position.x);
  const ys = points.map(p => p.position.y);
  const t0 = ts[0];
  const dts = ts.map(t => t - t0);

  switch (motionType) {
    case "uniform_linear":
      return fitLinear(points, dts, xs, ys);
    case "uniformly_accelerated":
    case "free_fall":
      return fitQuadratic(points, dts, xs, ys);
    case "projectile":
      return fitProjectile(points, dts, xs, ys);
    case "harmonic":
      return fitHarmonic(points, dts, xs, ys);
    case "circular":
      return fitCircular(points, dts, xs, ys);
    case "pendulum":
      return fitPendulum(points, dts, xs, ys);
    default:
      return fitQuadratic(points, dts, xs, ys);
  }
}

/** Linear fit: x = a + b*t, y = c + d*t */
function fitLinear(points: TrackingPoint[], dts: number[], xs: number[], ys: number[]): TrackingPoint[] {
  const [ax, bx] = linearRegression(dts, xs);
  const [ay, by] = linearRegression(dts, ys);

  return points.map((p, i) => ({
    frameIndex: i,
    timestamp: p.timestamp,
    position: {
      x: ax + bx * dts[i],
      y: ay + by * dts[i],
    },
  }));
}

/** Quadratic fit: x = a + b*t + c*t², y = a' + b'*t + c'*t² */
function fitQuadratic(points: TrackingPoint[], dts: number[], xs: number[], ys: number[]): TrackingPoint[] {
  const [ax, bx, cx] = quadraticRegression(dts, xs);
  const [ay, by, cy] = quadraticRegression(dts, ys);

  return points.map((p, i) => ({
    frameIndex: i,
    timestamp: p.timestamp,
    position: {
      x: ax + bx * dts[i] + cx * dts[i] * dts[i],
      y: ay + by * dts[i] + cy * dts[i] * dts[i],
    },
  }));
}

/** Projectile: x = linear, y = quadratic */
function fitProjectile(points: TrackingPoint[], dts: number[], xs: number[], ys: number[]): TrackingPoint[] {
  const [ax, bx] = linearRegression(dts, xs);
  const [ay, by, cy] = quadraticRegression(dts, ys);

  return points.map((p, i) => ({
    frameIndex: i,
    timestamp: p.timestamp,
    position: {
      x: ax + bx * dts[i],
      y: ay + by * dts[i] + cy * dts[i] * dts[i],
    },
  }));
}

/** Harmonic: fit x = x0 + A*cos(ω*t + φ), y = constant */
function fitHarmonic(points: TrackingPoint[], dts: number[], xs: number[], ys: number[]): TrackingPoint[] {
  const yMean = ys.reduce((a, b) => a + b, 0) / ys.length;

  // Detect if oscillation is mainly in x or y
  const xRange = Math.max(...xs) - Math.min(...xs);
  const yRange = Math.max(...ys) - Math.min(...ys);
  const oscillateY = yRange > xRange;

  const oscData = oscillateY ? ys : xs;
  const steadyData = oscillateY ? xs : ys;
  const steadyMean = steadyData.reduce((a, b) => a + b, 0) / steadyData.length;

  const { center, amplitude, omega, phi } = fitSinusoidal(dts, oscData);

  return points.map((p, i) => {
    const oscVal = center + amplitude * Math.cos(omega * dts[i] + phi);
    return {
      frameIndex: i,
      timestamp: p.timestamp,
      position: oscillateY
        ? { x: steadyMean, y: oscVal }
        : { x: oscVal, y: yMean },
    };
  });
}

/** Circular: fit x = cx + R*cos(ω*t + φx), y = cy + R*sin(ω*t + φy) */
function fitCircular(points: TrackingPoint[], dts: number[], xs: number[], ys: number[]): TrackingPoint[] {
  const fitX = fitSinusoidal(dts, xs);
  const fitY = fitSinusoidal(dts, ys);

  const R = (fitX.amplitude + fitY.amplitude) / 2;
  const omega = (fitX.omega + fitY.omega) / 2;

  return points.map((p, i) => ({
    frameIndex: i,
    timestamp: p.timestamp,
    position: {
      x: fitX.center + R * Math.cos(omega * dts[i] + fitX.phi),
      y: fitY.center + R * Math.sin(omega * dts[i] + fitY.phi),
    },
  }));
}

/** Pendulum: similar to harmonic but with arc motion */
function fitPendulum(points: TrackingPoint[], dts: number[], xs: number[], ys: number[]): TrackingPoint[] {
  // x oscillates sinusoidally, y has a shallow parabolic envelope
  const fitX = fitSinusoidal(dts, xs);
  const [ay, by, cy] = quadraticRegression(dts, ys);

  return points.map((p, i) => ({
    frameIndex: i,
    timestamp: p.timestamp,
    position: {
      x: fitX.center + fitX.amplitude * Math.cos(fitX.omega * dts[i] + fitX.phi),
      y: ay + by * dts[i] + cy * dts[i] * dts[i],
    },
  }));
}

// ─── Regression Utilities ───

function linearRegression(x: number[], y: number[]): [number, number] {
  const n = x.length;
  let sx = 0, sy = 0, sxy = 0, sx2 = 0;
  for (let i = 0; i < n; i++) {
    sx += x[i]; sy += y[i]; sxy += x[i] * y[i]; sx2 += x[i] * x[i];
  }
  const denom = n * sx2 - sx * sx;
  if (Math.abs(denom) < 1e-12) return [sy / n, 0];
  const b = (n * sxy - sx * sy) / denom;
  const a = (sy - b * sx) / n;
  return [a, b];
}

function quadraticRegression(x: number[], y: number[]): [number, number, number] {
  const n = x.length;
  // Solve y = a + b*x + c*x² using normal equations
  let s1 = 0, sx = 0, sx2 = 0, sx3 = 0, sx4 = 0;
  let sy = 0, sxy = 0, sx2y = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i], xi2 = xi * xi, yi = y[i];
    s1 += 1; sx += xi; sx2 += xi2; sx3 += xi2 * xi; sx4 += xi2 * xi2;
    sy += yi; sxy += xi * yi; sx2y += xi2 * yi;
  }

  // 3x3 system: [s1, sx, sx2; sx, sx2, sx3; sx2, sx3, sx4] * [a,b,c] = [sy, sxy, sx2y]
  const solved = solve3x3(
    [s1, sx, sx2, sy],
    [sx, sx2, sx3, sxy],
    [sx2, sx3, sx4, sx2y]
  );
  return solved || [sy / n, 0, 0];
}

function solve3x3(r1: number[], r2: number[], r3: number[]): [number, number, number] | null {
  // Gaussian elimination
  const m = [r1.slice(), r2.slice(), r3.slice()];

  for (let col = 0; col < 3; col++) {
    // Find pivot
    let maxRow = col;
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(m[row][col]) > Math.abs(m[maxRow][col])) maxRow = row;
    }
    [m[col], m[maxRow]] = [m[maxRow], m[col]];

    if (Math.abs(m[col][col]) < 1e-15) return null;

    for (let row = col + 1; row < 3; row++) {
      const factor = m[row][col] / m[col][col];
      for (let j = col; j < 4; j++) m[row][j] -= factor * m[col][j];
    }
  }

  // Back substitution
  const result = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    result[i] = m[i][3];
    for (let j = i + 1; j < 3; j++) result[i] -= m[i][j] * result[j];
    result[i] /= m[i][i];
  }
  return result as [number, number, number];
}

/**
 * Fit y = center + A * cos(ω*t + φ) to data.
 * Uses a simple peak-detection approach for ω, then least-squares for A and φ.
 */
function fitSinusoidal(ts: number[], data: number[]): { center: number; amplitude: number; omega: number; phi: number } {
  const n = data.length;
  const center = data.reduce((a, b) => a + b, 0) / n;
  const centered = data.map(d => d - center);
  const amplitude = Math.max(...centered.map(Math.abs)) || 0.01;

  // Estimate frequency from zero crossings
  let crossings = 0;
  for (let i = 1; i < n; i++) {
    if (centered[i - 1] * centered[i] < 0) crossings++;
  }

  const duration = ts[ts.length - 1] - ts[0];
  let omega: number;
  if (crossings >= 2 && duration > 0) {
    // Each full period has 2 zero crossings
    const periods = crossings / 2;
    omega = (2 * Math.PI * periods) / duration;
  } else {
    omega = duration > 0 ? (2 * Math.PI) / duration : 2 * Math.PI;
  }

  // Estimate phase from first data point
  const phi = Math.acos(Math.max(-1, Math.min(1, centered[0] / amplitude)));
  // Check if it should be negative
  const phiCandidate = centered.length > 1 && centered[1] > centered[0] ? -phi : phi;

  return { center, amplitude, omega, phi: phiCandidate };
}

// ─── Fallback: generate from raw AI params (legacy) ───

function generateFromParams(
  motionType: MotionType,
  params: Record<string, number>,
  timestamps: number[]
): TrackingPoint[] {
  const t0 = timestamps[0] || 0;
  const p = params;

  return timestamps.map((t, i) => {
    const dt = t - t0;
    let x = p.x0 ?? 0.5, y = p.y0 ?? 0.5;

    switch (motionType) {
      case "uniform_linear":
        x = (p.x0 ?? 0) + (p.vx ?? p.v ?? 0) * dt;
        y = (p.y0 ?? 0.5) + (p.vy ?? 0) * dt;
        break;
      case "uniformly_accelerated":
      case "free_fall":
        x = (p.x0 ?? 0.5) + (p.vx0 ?? 0) * dt + 0.5 * (p.ax ?? 0) * dt * dt;
        y = (p.y0 ?? 0.5) + (p.vy0 ?? 0) * dt + 0.5 * (p.ay ?? 0) * dt * dt;
        break;
      case "projectile": {
        const v0 = p.v0 ?? 0.5, theta = p.theta ?? Math.PI / 4;
        x = (p.x0 ?? 0) + v0 * Math.cos(theta) * dt;
        y = (p.y0 ?? 0.5) + v0 * Math.sin(theta) * dt - 0.5 * (p.g ?? 0.5) * dt * dt;
        break;
      }
      default:
        break;
    }

    return { frameIndex: i, timestamp: t, position: { x, y } };
  });
}

export function calculateError(
  experimental: TrackingPoint[],
  theoretical: TrackingPoint[]
): number {
  if (experimental.length === 0 || theoretical.length === 0) return 0;

  const n = Math.min(experimental.length, theoretical.length);
  let totalSqError = 0;

  for (let i = 0; i < n; i++) {
    const dx = experimental[i].position.x - theoretical[i].position.x;
    const dy = experimental[i].position.y - theoretical[i].position.y;
    totalSqError += dx * dx + dy * dy;
  }

  const rmse = Math.sqrt(totalSqError / n);
  return rmse * 100;
}
