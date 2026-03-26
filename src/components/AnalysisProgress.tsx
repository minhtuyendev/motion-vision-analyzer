import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import type { AnalysisStep } from "@/types/analysis";

interface AnalysisProgressProps {
  step: AnalysisStep;
  progress: number;
  error: string | null;
}

const STEP_LABELS: Record<AnalysisStep, string> = {
  idle: "Sẵn sàng phân tích",
  uploading: "Đang tải lên...",
  extracting: "Đang trích xuất frame...",
  analyzing: "AI đang phân tích chuyển động...",
  tracking: "Đang tracking quỹ đạo...",
  comparing: "So sánh lý thuyết vs thực nghiệm...",
  done: "Phân tích hoàn tất!",
  error: "Đã xảy ra lỗi",
};

export function AnalysisProgress({ step, progress, error }: AnalysisProgressProps) {
  const isActive = step !== "idle" && step !== "done" && step !== "error";

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {step === "done" ? (
            <CheckCircle className="w-5 h-5 text-success" />
          ) : step === "error" ? (
            <AlertCircle className="w-5 h-5 text-destructive" />
          ) : (
            <Brain className="w-5 h-5 text-accent" />
          )}
          Tiến trình phân tích
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="h-2" />

        <div className="flex items-center gap-2">
          {isActive && <Loader2 className="w-4 h-4 animate-spin text-accent" />}
          <span className={`text-sm ${step === "error" ? "text-destructive" : "text-muted-foreground"}`}>
            {STEP_LABELS[step]}
          </span>
          <span className="ml-auto font-mono text-sm font-semibold">{progress}%</span>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
