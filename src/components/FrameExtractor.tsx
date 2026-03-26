import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Scan, Loader2 } from "lucide-react";
import type { FrameData } from "@/types/analysis";

interface FrameExtractorProps {
  videoUrl: string;
  onFramesExtracted: (frames: FrameData[]) => void;
  extracting: boolean;
  onExtract: (video: HTMLVideoElement, numFrames: number) => Promise<FrameData[]>;
  frames: FrameData[];
}

export function FrameExtractor({
  videoUrl,
  onFramesExtracted,
  extracting,
  onExtract,
  frames,
}: FrameExtractorProps) {
  const [numFrames, setNumFrames] = useState(12);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    setVideoReady(false);
  }, [videoUrl]);

  const handleExtract = async () => {
    if (!videoRef.current || !videoReady) return;
    const extracted = await onExtract(videoRef.current, numFrames);
    onFramesExtracted(extracted);
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Scan className="w-5 h-5 text-accent" />
          Trích xuất Frame
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <video
          ref={videoRef}
          src={videoUrl}
          className="hidden"
          crossOrigin="anonymous"
          onLoadedMetadata={() => setVideoReady(true)}
        />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Số frame trích xuất</span>
            <span className="font-mono font-semibold">{numFrames}</span>
          </div>
          <Slider
            value={[numFrames]}
            onValueChange={([v]) => setNumFrames(v)}
            min={5}
            max={120}
            step={1}
          />
        </div>

        <Button
          onClick={handleExtract}
          disabled={!videoReady || extracting}
          className="w-full gradient-primary text-primary-foreground"
        >
          {extracting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang trích xuất...
            </>
          ) : (
            <>
              <Scan className="w-4 h-4" />
              Trích xuất {numFrames} frame
            </>
          )}
        </Button>

        {frames.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-4">
            {frames.slice(0, 8).map((f) => (
              <div key={f.frameIndex} className="relative rounded-md overflow-hidden border border-border">
                <img src={f.imageDataUrl} alt={`Frame ${f.frameIndex}`} className="w-full aspect-video object-cover" />
                <span className="absolute bottom-0 right-0 bg-foreground/70 text-background text-[10px] px-1.5 py-0.5 font-mono">
                  {f.timestamp.toFixed(2)}s
                </span>
              </div>
            ))}
            {frames.length > 8 && (
              <div className="flex items-center justify-center rounded-md border border-border bg-muted text-muted-foreground text-xs">
                +{frames.length - 8} frame
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
