import { useState, useRef, useCallback } from "react";
import type { FrameData } from "@/types/analysis";

export function useVideoProcessor() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [frames, setFrames] = useState<FrameData[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const loadVideo = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoFile(file);
    setFrames([]);
  }, []);

  const extractFrames = useCallback(async (
    video: HTMLVideoElement,
    numFrames = 15,
    roi?: { x: number; y: number; w: number; h: number }
  ): Promise<FrameData[]> => {
    setExtracting(true);
    try {
      const dur = video.duration;
      setDuration(dur);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      const vw = video.videoWidth;
      const vh = video.videoHeight;

      const cropX = roi ? Math.round(roi.x * vw) : 0;
      const cropY = roi ? Math.round(roi.y * vh) : 0;
      const cropW = roi ? Math.round(roi.w * vw) : vw;
      const cropH = roi ? Math.round(roi.h * vh) : vh;

      canvas.width = Math.min(cropW, 640);
      canvas.height = Math.round((canvas.width / cropW) * cropH);

      const extracted: FrameData[] = [];
      const interval = dur / (numFrames + 1);

      for (let i = 1; i <= numFrames; i++) {
        const t = Math.min(interval * i, dur - 0.05);
        await seekTo(video, t);
        // Small delay to ensure frame is rendered
        await new Promise(r => setTimeout(r, 50));
        ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
        extracted.push({
          frameIndex: i - 1,
          timestamp: t,
          imageDataUrl: canvas.toDataURL("image/jpeg", 0.7),
        });
      }

      setFrames(extracted);
      return extracted;
    } finally {
      setExtracting(false);
    }
  }, []);

  return { videoUrl, videoFile, frames, extracting, duration, loadVideo, extractFrames, videoRef };
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      video.removeEventListener("seeked", handler);
      // Resolve anyway to avoid hanging - frame may be slightly off
      resolve();
    }, 3000);

    const handler = () => {
      clearTimeout(timeout);
      video.removeEventListener("seeked", handler);
      resolve();
    };

    video.addEventListener("seeked", handler);

    // If already at the right time, seeked won't fire
    if (Math.abs(video.currentTime - time) < 0.01) {
      clearTimeout(timeout);
      video.removeEventListener("seeked", handler);
      resolve();
      return;
    }

    video.currentTime = time;
  });
}
