export interface FrameData {
  frameIndex: number;
  timestamp: number; // seconds
  imageDataUrl: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface TrackingPoint {
  frameIndex: number;
  timestamp: number;
  position: Position;
  velocity?: { vx: number; vy: number; magnitude: number };
  acceleration?: { ax: number; ay: number; magnitude: number };
}

export type MotionType =
  | "uniform_linear"       // Chuyển động thẳng đều
  | "uniformly_accelerated" // Chuyển động thẳng biến đổi đều
  | "circular"             // Chuyển động tròn
  | "harmonic"             // Dao động điều hòa
  | "projectile"           // Chuyển động ném
  | "free_fall"            // Rơi tự do
  | "pendulum"             // Con lắc
  | "unknown";

export interface MotionTypeInfo {
  type: MotionType;
  label: string;
  labelVi: string;
  formula: string;
  description: string;
}

export const MOTION_TYPES: Record<MotionType, MotionTypeInfo> = {
  uniform_linear: {
    type: "uniform_linear",
    label: "Uniform Linear",
    labelVi: "Thẳng đều",
    formula: "x = x₀ + v·t",
    description: "Vật chuyển động thẳng với vận tốc không đổi",
  },
  uniformly_accelerated: {
    type: "uniformly_accelerated",
    label: "Uniformly Accelerated",
    labelVi: "Biến đổi đều",
    formula: "x = x₀ + v₀·t + ½·a·t²",
    description: "Vật chuyển động thẳng với gia tốc không đổi",
  },
  circular: {
    type: "circular",
    label: "Circular",
    labelVi: "Tròn đều",
    formula: "x = R·cos(ωt), y = R·sin(ωt)",
    description: "Vật chuyển động theo quỹ đạo tròn",
  },
  harmonic: {
    type: "harmonic",
    label: "Simple Harmonic",
    labelVi: "Dao động điều hòa",
    formula: "x = A·cos(ωt + φ)",
    description: "Vật dao động quanh vị trí cân bằng",
  },
  projectile: {
    type: "projectile",
    label: "Projectile",
    labelVi: "Ném xiên",
    formula: "x = v₀·cos(θ)·t, y = v₀·sin(θ)·t - ½g·t²",
    description: "Vật bị ném với vận tốc ban đầu và chịu tác dụng trọng lực",
  },
  free_fall: {
    type: "free_fall",
    label: "Free Fall",
    labelVi: "Rơi tự do",
    formula: "y = ½·g·t²",
    description: "Vật rơi tự do dưới tác dụng trọng lực",
  },
  pendulum: {
    type: "pendulum",
    label: "Pendulum",
    labelVi: "Con lắc đơn",
    formula: "θ = θ₀·cos(√(g/L)·t)",
    description: "Con lắc dao động với biên độ nhỏ",
  },
  unknown: {
    type: "unknown",
    label: "Unknown",
    labelVi: "Chưa xác định",
    formula: "—",
    description: "Chưa xác định loại chuyển động",
  },
};

export interface AnalysisResult {
  motionType: MotionType;
  confidence: number;
  trackingPoints: TrackingPoint[];
  parameters: Record<string, number>;
  aiDescription: string;
  theoreticalPoints?: TrackingPoint[];
  errorPercent?: number;
}

export type AnalysisStep = "idle" | "uploading" | "extracting" | "analyzing" | "tracking" | "comparing" | "done" | "error";
