import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { VideoUploader } from "@/components/VideoUploader";
import { FrameExtractor } from "@/components/FrameExtractor";
import { AnalysisProgress } from "@/components/AnalysisProgress";
import { TrajectoryCanvas } from "@/components/TrajectoryCanvas";
import { ComparisonCharts } from "@/components/ComparisonCharts";
import { ResultsSummary } from "@/components/ResultsSummary";
import { AnalysisHistory } from "@/components/AnalysisHistory";
import { useVideoProcessor } from "@/hooks/useVideoProcessor";
import { useMotionAnalysis } from "@/hooks/useMotionAnalysis";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { Brain, RotateCcw } from "lucide-react";
import type { FrameData, AnalysisResult } from "@/types/analysis";
import { toast } from "sonner";

const Index = () => {
  const { videoUrl, videoFile, loadVideo, frames, extracting, duration, extractFrames } = useVideoProcessor();
  const { step, progress, result, error, analyze, reset, setResultDirect } = useMotionAnalysis();
  const { history, loading: historyLoading, saveResult, deleteItem, toAnalysisResult } = useAnalysisHistory();
  const [extractedFrames, setExtractedFrames] = useState<FrameData[]>([]);

  const handleVideoLoaded = useCallback((file: File) => {
    loadVideo(file);
    reset();
    setExtractedFrames([]);
  }, [loadVideo, reset]);

  const handleClear = useCallback(() => {
    window.location.reload();
  }, []);

  const handleFramesExtracted = useCallback((f: FrameData[]) => {
    setExtractedFrames(f);
    toast.success(`Đã trích xuất ${f.length} frame thành công!`);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (extractedFrames.length === 0) {
      toast.error("Vui lòng trích xuất frame trước khi phân tích");
      return;
    }
    try {
      const analysisResult = await analyze(extractedFrames, duration);
      toast.success("Phân tích hoàn tất!");
      // Save to history
      if (analysisResult) {
        const thumbnail = extractedFrames[0]?.imageDataUrl;
        const name = videoFile?.name ?? "Video";
        await saveResult(analysisResult, name, thumbnail);
      }
    } catch {
      toast.error("Lỗi trong quá trình phân tích. Vui lòng thử lại.");
    }
  }, [extractedFrames, duration, analyze, videoFile, saveResult]);

  const handleViewHistory = useCallback((item: Parameters<typeof toAnalysisResult>[0]) => {
    const res = toAnalysisResult(item);
    setResultDirect(res);
    toast.info(`Đang xem lại: ${item.video_name}`);
  }, [toAnalysisResult, setResultDirect]);

  const handleDeleteHistory = useCallback(async (id: string) => {
    await deleteItem(id);
    toast.success("Đã xóa");
  }, [deleteItem]);

  // Use result from hook or from history view
  const displayResult = result;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        {/* Hero section */}
        <div className="text-center space-y-2 py-4">
          <h2 className="text-2xl md:text-3xl font-bold">
            Ứng dụng <span className="text-gradient">AI Thị giác Máy tính</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            Phân tích các loại chuyển động cơ học từ video thực nghiệm sử dụng trí tuệ nhân tạo.
            Upload video → Trích xuất frame → AI phân tích → Kết quả chi tiết.
          </p>
        </div>

        {/* History */}
        <section>
          <AnalysisHistory
            history={history}
            loading={historyLoading}
            onView={handleViewHistory}
            onDelete={handleDeleteHistory}
          />
        </section>

        {/* Step 1: Upload */}
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Bước 1 · Upload Video
          </h3>
          <VideoUploader
            onVideoLoaded={handleVideoLoaded}
            videoUrl={videoUrl}
            onClear={handleClear}
          />
        </section>

        {/* Step 2: Extract */}
        {videoUrl && (
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Bước 2 · Trích xuất Frame
            </h3>
            <FrameExtractor
              videoUrl={videoUrl}
              onFramesExtracted={handleFramesExtracted}
              extracting={extracting}
              onExtract={extractFrames}
              frames={extractedFrames}
            />
          </section>
        )}

        {/* Step 3: Analyze */}
        {extractedFrames.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Bước 3 · Phân tích AI
            </h3>
            <div className="space-y-4">
              {step === "idle" && (
                <Button
                  onClick={handleAnalyze}
                  size="lg"
                  className="w-full gradient-primary text-primary-foreground text-base h-12"
                >
                  <Brain className="w-5 h-5" />
                  Bắt đầu phân tích bằng AI
                </Button>
              )}

              {step !== "idle" && (
                <AnalysisProgress step={step} progress={progress} error={error} />
              )}

              {step === "error" && (
                <Button variant="outline" onClick={reset} className="w-full">
                  <RotateCcw className="w-4 h-4" />
                  Thử lại
                </Button>
              )}
            </div>
          </section>
        )}

        {/* Step 4: Results */}
        {displayResult && (
          <section className="space-y-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Kết quả phân tích
            </h3>

            <ResultsSummary result={displayResult} />

            <TrajectoryCanvas
              trackingPoints={displayResult.trackingPoints}
              theoreticalPoints={displayResult.theoreticalPoints}
            />

            {displayResult.theoreticalPoints && (
              <ComparisonCharts
                experimental={displayResult.trackingPoints}
                theoretical={displayResult.theoreticalPoints}
              />
            )}
          </section>
        )}
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          Nghiên cứu: Ứng dụng AI thị giác máy tính trong phân tích chuyển động cơ học
        </div>
      </footer>
    </div>
  );
};

export default Index;
