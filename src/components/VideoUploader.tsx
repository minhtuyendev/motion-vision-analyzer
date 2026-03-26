import { useCallback, useState } from "react";
import { Upload, Film, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface VideoUploaderProps {
  onVideoLoaded: (file: File) => void;
  videoUrl: string | null;
  onClear: () => void;
}

export function VideoUploader({ onVideoLoaded, videoUrl, onClear }: VideoUploaderProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("video/")) {
        onVideoLoaded(file);
      }
    },
    [onVideoLoaded]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onVideoLoaded(file);
    },
    [onVideoLoaded]
  );

  if (videoUrl) {
    return (
      <Card className="glass-card overflow-hidden">
        <CardContent className="p-0 relative">
          <video
            src={videoUrl}
            controls
            className="w-full max-h-[400px] object-contain bg-foreground/5"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-3 right-3 rounded-full"
            onClick={onClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`glass-card transition-all duration-200 cursor-pointer ${
        dragOver ? "ring-2 ring-accent border-accent" : "hover:border-primary/40"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center">
          <Upload className="w-8 h-8 text-primary-foreground" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-lg">Kéo thả video vào đây</p>
          <p className="text-sm text-muted-foreground mt-1">
            hoặc nhấn để chọn file • MP4, WebM, MOV
          </p>
        </div>
        <label>
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button variant="outline" asChild className="cursor-pointer">
            <span>
              <Film className="w-4 h-4" />
              Chọn video
            </span>
          </Button>
        </label>
      </CardContent>
    </Card>
  );
}
