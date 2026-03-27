import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FrameData, AnalysisResult, AnalysisStep, TrackingPoint, MotionType } from "@/types/analysis";
import { generateTheoretical, calculateError } from "@/lib/physics";

export function useMotionAnalysis() {
  const [step, setStep] = useState<AnalysisStep>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (frames: FrameData[], videoDuration: number) => {
    setStep("analyzing");
    setProgress(0);
    setError(null);

    try {
      const base64Frames = frames.map((f) => f.imageDataUrl);
      const timestamps = frames.map((f) => f.timestamp);

      setProgress(20);

      const { data, error: fnError } = await supabase.functions.invoke("analyze-motion", {
        body: { frames: base64Frames, timestamps, videoDuration },
      });

      if (fnError) {
        throw new Error(fnError.message || "Lỗi khi gọi AI phân tích");
      }

      setProgress(70);
      setStep("tracking");

      const aiResult = data as {
        motionType: MotionType;
        confidence: number;
        positions: Array<{ x: number; y: number }>;
        parameters: Record<string, number>;
        description: string;
        analyzedTimestamps?: number[];
      };

      // Use analyzed timestamps if available (subset sent to AI)
      const usedTimestamps = aiResult.analyzedTimestamps || timestamps;

      // AI returns screen coords (y: 0=top, 1=bottom)
      // Convert to physics coords (y: 0=bottom, 1=top) for comparison with theory
      const trackingPoints: TrackingPoint[] = aiResult.positions.map((pos, i) => {
        const t = usedTimestamps[i] || 0;
        return {
          frameIndex: i,
          timestamp: t,
          position: { x: pos.x, y: 1 - pos.y }, // flip y for physics convention
        };
      });

      // Calculate velocities and accelerations
      for (let i = 1; i < trackingPoints.length; i++) {
        const dt = trackingPoints[i].timestamp - trackingPoints[i - 1].timestamp;
        if (dt > 0) {
          const vx = (trackingPoints[i].position.x - trackingPoints[i - 1].position.x) / dt;
          const vy = (trackingPoints[i].position.y - trackingPoints[i - 1].position.y) / dt;
          trackingPoints[i].velocity = { vx, vy, magnitude: Math.sqrt(vx * vx + vy * vy) };
        }
      }

      for (let i = 2; i < trackingPoints.length; i++) {
        const dt = trackingPoints[i].timestamp - trackingPoints[i - 1].timestamp;
        if (dt > 0 && trackingPoints[i].velocity && trackingPoints[i - 1].velocity) {
          const ax = (trackingPoints[i].velocity!.vx - trackingPoints[i - 1].velocity!.vx) / dt;
          const ay = (trackingPoints[i].velocity!.vy - trackingPoints[i - 1].velocity!.vy) / dt;
          trackingPoints[i].acceleration = { ax, ay, magnitude: Math.sqrt(ax * ax + ay * ay) };
        }
      }

      setProgress(85);
      setStep("comparing");

      // Generate theoretical curve by fitting to experimental data
      const theoreticalPoints = generateTheoretical(aiResult.motionType, aiResult.parameters, usedTimestamps, trackingPoints);
      const errorPercent = calculateError(trackingPoints, theoreticalPoints);

      setProgress(100);
      setStep("done");

      const analysisResult: AnalysisResult = {
        motionType: aiResult.motionType,
        confidence: aiResult.confidence,
        trackingPoints,
        parameters: physicsParams,
        aiDescription: aiResult.description,
        theoreticalPoints,
        errorPercent,
      };

      setResult(analysisResult);
      return analysisResult;
    } catch (err: any) {
      setStep("error");
      const msg = err?.message || "Lỗi không xác định";
      setError(msg);
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setStep("idle");
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  const setResultDirect = useCallback((r: AnalysisResult) => {
    setResult(r);
    setStep("done");
    setProgress(100);
    setError(null);
  }, []);

  return { step, progress, result, error, analyze, reset, setResultDirect };
}

/**
 * Convert AI-provided parameters (which may be in screen coords) to physics convention.
 * Physics: y increases upward, so y0 near top of screen → y0 near 1 in physics.
 */
function convertParamsToPhysics(motionType: MotionType, params: Record<string, number>): Record<string, number> {
  const p = { ...params };

  // Flip y-axis positions from screen to physics
  if (p.y0 !== undefined) {
    p.y0 = 1 - p.y0;
  }
  if (p.cy !== undefined) {
    p.cy = 1 - p.cy;
  }

  // For free_fall / projectile, vy should be negative (downward in physics = positive screen y)
  // The AI might give vy in screen coords, so flip it
  if (p.vy !== undefined) {
    p.vy = -p.vy;
  }
  if (p.vy0 !== undefined) {
    p.vy0 = -p.vy0;
  }

  // For free_fall and projectile, the direction of gravity in physics formulas
  // is already handled (g is positive, formula subtracts ½gt²)
  // So we don't need to flip g

  return p;
}
