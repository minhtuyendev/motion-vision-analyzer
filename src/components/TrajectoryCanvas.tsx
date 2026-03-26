import { useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import type { TrackingPoint } from "@/types/analysis";

interface TrajectoryCanvasProps {
  trackingPoints: TrackingPoint[];
  theoreticalPoints?: TrackingPoint[];
  width?: number;
  height?: number;
}

export function TrajectoryCanvas({
  trackingPoints,
  theoreticalPoints,
  width = 600,
  height = 400,
}: TrajectoryCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || trackingPoints.length === 0) return;

    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "hsl(220, 25%, 97%)";
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = "hsl(214, 20%, 88%)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Normalize points to canvas
    const allPts = [...trackingPoints, ...(theoreticalPoints || [])];
    const xs = allPts.map((p) => p.position.x);
    const ys = allPts.map((p) => p.position.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const pad = 40;

    const toCanvas = (x: number, y: number) => ({
      cx: pad + ((x - minX) / rangeX) * (width - 2 * pad),
      cy: pad + ((y - minY) / rangeY) * (height - 2 * pad),
    });

    // Draw theoretical path
    if (theoreticalPoints && theoreticalPoints.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "hsl(200, 80%, 45%)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      const first = toCanvas(theoreticalPoints[0].position.x, theoreticalPoints[0].position.y);
      ctx.moveTo(first.cx, first.cy);
      theoreticalPoints.forEach((p) => {
        const { cx, cy } = toCanvas(p.position.x, p.position.y);
        ctx.lineTo(cx, cy);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw experimental path
    if (trackingPoints.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "hsl(217, 71%, 35%)";
      ctx.lineWidth = 2.5;
      const first = toCanvas(trackingPoints[0].position.x, trackingPoints[0].position.y);
      ctx.moveTo(first.cx, first.cy);
      trackingPoints.forEach((p) => {
        const { cx, cy } = toCanvas(p.position.x, p.position.y);
        ctx.lineTo(cx, cy);
      });
      ctx.stroke();
    }

    // Draw points
    trackingPoints.forEach((p, i) => {
      const { cx, cy } = toCanvas(p.position.x, p.position.y);
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = "hsl(217, 71%, 35%)";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = "hsl(220, 40%, 13%)";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillText(`${p.timestamp.toFixed(1)}s`, cx + 8, cy - 4);
    });

    // Legend
    ctx.font = "11px 'Inter', sans-serif";
    ctx.fillStyle = "hsl(217, 71%, 35%)";
    ctx.fillRect(width - 160, 12, 12, 12);
    ctx.fillStyle = "hsl(220, 40%, 13%)";
    ctx.fillText("Thực nghiệm", width - 142, 23);

    if (theoreticalPoints) {
      ctx.strokeStyle = "hsl(200, 80%, 45%)";
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(width - 160, 38);
      ctx.lineTo(width - 148, 38);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "hsl(220, 40%, 13%)";
      ctx.fillText("Lý thuyết", width - 142, 42);
    }
  }, [trackingPoints, theoreticalPoints, width, height]);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="w-5 h-5 text-accent" />
          Quỹ đạo chuyển động
        </CardTitle>
      </CardHeader>
      <CardContent>
        <canvas
          ref={canvasRef}
          style={{ width, height }}
          className="rounded-lg border border-border w-full"
        />
      </CardContent>
    </Card>
  );
}
