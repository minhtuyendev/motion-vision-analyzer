import type { TrackingPoint, MotionType } from "@/types/analysis";

export function generateTheoretical(
  motionType: MotionType,
  params: Record<string, number>,
  timestamps: number[]
): TrackingPoint[] {
  switch (motionType) {
    case "uniform_linear":
      return uniformLinear(params, timestamps);
    case "uniformly_accelerated":
      return uniformlyAccelerated(params, timestamps);
    case "circular":
      return circular(params, timestamps);
    case "harmonic":
      return harmonic(params, timestamps);
    case "projectile":
      return projectile(params, timestamps);
    case "free_fall":
      return freeFall(params, timestamps);
    case "pendulum":
      return pendulumMotion(params, timestamps);
    default:
      return timestamps.map((t, i) => ({
        frameIndex: i,
        timestamp: t,
        position: { x: 0, y: 0 },
      }));
  }
}

function uniformLinear(p: Record<string, number>, ts: number[]): TrackingPoint[] {
  const x0 = p.x0 || 0, y0 = p.y0 || 0;
  const vx = p.vx || p.v || 0, vy = p.vy || 0;
  return ts.map((t, i) => ({
    frameIndex: i,
    timestamp: t,
    position: { x: x0 + vx * t, y: y0 + vy * t },
  }));
}

function uniformlyAccelerated(p: Record<string, number>, ts: number[]): TrackingPoint[] {
  const x0 = p.x0 || 0, y0 = p.y0 || 0;
  const vx0 = p.vx0 || p.v0 || 0, vy0 = p.vy0 || 0;
  const ax = p.ax || p.a || 0, ay = p.ay || 0;
  return ts.map((t, i) => ({
    frameIndex: i,
    timestamp: t,
    position: { x: x0 + vx0 * t + 0.5 * ax * t * t, y: y0 + vy0 * t + 0.5 * ay * t * t },
  }));
}

function circular(p: Record<string, number>, ts: number[]): TrackingPoint[] {
  const cx = p.cx || p.x0 || 0.5, cy = p.cy || p.y0 || 0.5;
  const R = p.R || p.radius || 0.2;
  const omega = p.omega || p.w || 2 * Math.PI;
  const phi = p.phi || 0;
  return ts.map((t, i) => ({
    frameIndex: i,
    timestamp: t,
    position: { x: cx + R * Math.cos(omega * t + phi), y: cy + R * Math.sin(omega * t + phi) },
  }));
}

function harmonic(p: Record<string, number>, ts: number[]): TrackingPoint[] {
  const x0 = p.x0 || 0.5;
  const A = p.A || p.amplitude || 0.3;
  const omega = p.omega || p.w || 2 * Math.PI;
  const phi = p.phi || 0;
  const y0 = p.y0 || 0.5;
  return ts.map((t, i) => ({
    frameIndex: i,
    timestamp: t,
    position: { x: x0 + A * Math.cos(omega * t + phi), y: y0 },
  }));
}

function projectile(p: Record<string, number>, ts: number[]): TrackingPoint[] {
  const x0 = p.x0 || 0, y0 = p.y0 || 0;
  const v0 = p.v0 || 5;
  const theta = p.theta || Math.PI / 4;
  const g = p.g || 9.8;
  return ts.map((t, i) => ({
    frameIndex: i,
    timestamp: t,
    position: {
      x: x0 + v0 * Math.cos(theta) * t,
      y: y0 + v0 * Math.sin(theta) * t - 0.5 * g * t * t,
    },
  }));
}

function freeFall(p: Record<string, number>, ts: number[]): TrackingPoint[] {
  const x0 = p.x0 || 0.5, y0 = p.y0 || 0;
  const g = p.g || 9.8;
  return ts.map((t, i) => ({
    frameIndex: i,
    timestamp: t,
    position: { x: x0, y: y0 + 0.5 * g * t * t },
  }));
}

function pendulumMotion(p: Record<string, number>, ts: number[]): TrackingPoint[] {
  const cx = p.cx || 0.5, cy = p.cy || 0;
  const L = p.L || p.length || 0.4;
  const theta0 = p.theta0 || 0.3;
  const g = p.g || 9.8;
  const omega = Math.sqrt(g / L);
  return ts.map((t, i) => {
    const angle = theta0 * Math.cos(omega * t);
    return {
      frameIndex: i,
      timestamp: t,
      position: { x: cx + L * Math.sin(angle), y: cy + L * Math.cos(angle) },
    };
  });
}

export function calculateError(
  experimental: TrackingPoint[],
  theoretical: TrackingPoint[]
): number {
  if (experimental.length === 0 || theoretical.length === 0) return 0;

  const n = Math.min(experimental.length, theoretical.length);
  let totalError = 0;
  let totalRef = 0;

  for (let i = 0; i < n; i++) {
    const dx = experimental[i].position.x - theoretical[i].position.x;
    const dy = experimental[i].position.y - theoretical[i].position.y;
    totalError += Math.sqrt(dx * dx + dy * dy);

    const rx = theoretical[i].position.x;
    const ry = theoretical[i].position.y;
    totalRef += Math.sqrt(rx * rx + ry * ry);
  }

  if (totalRef === 0) return 0;
  return (totalError / totalRef) * 100;
}
