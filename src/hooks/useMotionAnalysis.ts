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
      };

      const trackingPoints: TrackingPoint[] = aiResult.positions.map((pos, i) => {
        const t = timestamps[i] || 0;
        return {
          frameIndex: i,
          timestamp: t,
          position: { x: pos.x, y: pos.y },
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

      const theoreticalPoints = generateTheoretical(aiResult.motionType, aiResult.parameters, timestamps);
      const errorPercent = calculateError(trackingPoints, theoreticalPoints);

      setProgress(100);
      setStep("done");

      const analysisResult: AnalysisResult = {
        motionType: aiResult.motionType,
        confidence: aiResult.confidence,
        trackingPoints,
        parameters: aiResult.parameters,
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

  return { step, progress, result, error, analyze, reset };
}
