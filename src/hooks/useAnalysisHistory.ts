import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AnalysisResult, TrackingPoint, MotionType } from "@/types/analysis";

export interface AnalysisHistoryItem {
  id: string;
  created_at: string;
  video_name: string;
  motion_type: string;
  confidence: number;
  parameters: Record<string, number>;
  tracking_points: TrackingPoint[];
  theoretical_points: TrackingPoint[] | null;
  error_percent: number | null;
  ai_description: string;
  thumbnail: string | null;
}

export function useAnalysisHistory() {
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("analysis_history" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setHistory(data.map((row: any) => ({
        id: row.id,
        created_at: row.created_at,
        video_name: row.video_name,
        motion_type: row.motion_type,
        confidence: row.confidence,
        parameters: row.parameters as Record<string, number>,
        tracking_points: row.tracking_points as TrackingPoint[],
        theoretical_points: row.theoretical_points as TrackingPoint[] | null,
        error_percent: row.error_percent,
        ai_description: row.ai_description,
        thumbnail: row.thumbnail,
      })));
    }
    setLoading(false);
  }, []);

  const saveResult = useCallback(async (
    result: AnalysisResult,
    videoName: string,
    thumbnail?: string
  ) => {
    const { error } = await supabase.from("analysis_history").insert({
      video_name: videoName,
      motion_type: result.motionType,
      confidence: result.confidence,
      parameters: result.parameters as any,
      tracking_points: result.trackingPoints as any,
      theoretical_points: result.theoreticalPoints as any ?? null,
      error_percent: result.errorPercent ?? null,
      ai_description: result.aiDescription,
      thumbnail: thumbnail ?? null,
    });
    if (!error) await fetchHistory();
    return !error;
  }, [fetchHistory]);

  const deleteItem = useCallback(async (id: string) => {
    await supabase.from("analysis_history").delete().eq("id", id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const toAnalysisResult = useCallback((item: AnalysisHistoryItem): AnalysisResult => ({
    motionType: item.motion_type as MotionType,
    confidence: item.confidence,
    trackingPoints: item.tracking_points,
    parameters: item.parameters,
    aiDescription: item.ai_description,
    theoreticalPoints: item.theoretical_points ?? undefined,
    errorPercent: item.error_percent ?? undefined,
  }), []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return { history, loading, fetchHistory, saveResult, deleteItem, toAnalysisResult };
}
