import {
  AudioPeakPoint,
  CaptionCue,
  CaptionStyle,
  FramingMode,
  HighlightClip,
  StreamSource,
} from "../types/clip";

export function formatTimecode(seconds: number, showTenths = false): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const tenths = Math.floor((safe % 1) * 10);

  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  const prefix = hrs > 0 ? `${String(hrs).padStart(2, "0")}:` : "";
  return showTenths ? `${prefix}${mm}:${ss}.${tenths}` : `${prefix}${mm}:${ss}`;
}

export function formatSrtTimestamp(seconds: number): string {
  const safe = Math.max(0, seconds);
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const ms = Math.floor((safe % 1) * 1000);
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(
    2,
    "0"
  )},${String(ms).padStart(3, "0")}`;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function generateSrtContent(clip: HighlightClip): string {
  const cues =
    clip.captions.length > 0
      ? clip.captions
      : [
          {
            startOffsetSec: 0,
            endOffsetSec: Math.max(3, clip.endSec - clip.startSec),
            text: clip.hookLine || clip.title,
          },
        ];

  return cues
    .map((cue, idx) => {
      const start = formatSrtTimestamp(cue.startOffsetSec);
      const end = formatSrtTimestamp(cue.endOffsetSec);
      return `${idx + 1}\n${start} --> ${end}\n${cue.text}\n`;
    })
    .join("\n");
}

export function generateBaselineAudioPeaks(durationSec: number, buckets = 36): AudioPeakPoint[] {
  const safeDuration = Math.max(30, durationSec);
  const points: AudioPeakPoint[] = [];
  for (let i = 0; i < buckets; i++) {
    const t = (i / (buckets - 1)) * safeDuration;
    const wave =
      Math.sin(i * 0.55) * 20 + Math.cos(i * 1.15) * 18 + (i % 7 === 0 ? 28 : 0);
    const level = Math.max(18, Math.min(96, Math.round(45 + wave)));
    points.push({ timeSec: Math.round(t), level });
  }
  return points;
}

export async function analyzeVideoAudioPeaks(
  file: File,
  durationSec: number,
  buckets = 48
): Promise<AudioPeakPoint[]> {
  try {
    const arrayBuffer = await file.slice(0, 48 * 1024 * 1024).arrayBuffer();
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      return generateBaselineAudioPeaks(durationSec, buckets);
    }

    const ctx = new AudioCtx();
    try {
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);
      const step = Math.max(1, Math.floor(channelData.length / buckets));
      const rawRms: number[] = [];

      for (let i = 0; i < buckets; i++) {
        const start = i * step;
        const end = Math.min(channelData.length, start + step);
        let sumSq = 0;
        const sampleStride = Math.max(1, Math.floor((end - start) / 400));
        let count = 0;
        for (let j = start; j < end; j += sampleStride) {
          const sample = channelData[j];
          sumSq += sample * sample;
          count++;
        }
        const rms = count > 0 ? Math.sqrt(sumSq / count) : 0;
        rawRms.push(rms);
      }

      const maxRms = Math.max(...rawRms, 0.001);
      return rawRms.map((rms, i) => ({
        timeSec: Math.round((i / Math.max(1, buckets - 1)) * durationSec),
        level: Math.max(12, Math.min(99, Math.round((rms / maxRms) * 95))),
      }));
    } finally {
      await ctx.close().catch(() => {});
    }
  } catch {
    return generateBaselineAudioPeaks(durationSec, buckets);
  }
}

export function drawVerticalFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  source: HTMLVideoElement | HTMLImageElement | null,
  framingMode: FramingMode,
  captionText: string | null,
  captionStyle: CaptionStyle,
  progressRatio: number,
  hookLine: string
) {
  ctx.fillStyle = "#090B0E";
  ctx.fillRect(0, 0, width, height);

  const srcWidth =
    source instanceof HTMLVideoElement ? source.videoWidth : source?.naturalWidth ?? 1280;
  const srcHeight =
    source instanceof HTMLVideoElement ? source.videoHeight : source?.naturalHeight ?? 720;

  if (source && srcWidth > 0 && srcHeight > 0) {
    const subtleZoom = 1 + Math.sin(progressRatio * Math.PI) * 0.035;

    if (framingMode === "center-fill") {
      const targetRatio = width / height;
      const sourceRatio = srcWidth / srcHeight;
      let drawW = width * subtleZoom;
      let drawH = height * subtleZoom;
      if (sourceRatio > targetRatio) {
        drawW = height * sourceRatio * subtleZoom;
      } else {
        drawH = (width / sourceRatio) * subtleZoom;
      }
      const dx = (width - drawW) / 2;
      const dy = (height - drawH) / 2;
      ctx.drawImage(source, dx, dy, drawW, drawH);
    } else if (framingMode === "facecam-split") {
      // Top 36%: tight upper-right / center focus for streamer facecam
      const topH = Math.round(height * 0.36);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width, topH);
      ctx.clip();
      const camCropW = srcWidth * 0.48;
      const camCropH = srcHeight * 0.52;
      const camCropX = srcWidth * 0.44;
      const camCropY = srcHeight * 0.06;
      ctx.drawImage(source, camCropX, camCropY, camCropW, camCropH, 0, 0, width, topH);
      ctx.restore();

      // Hairline divider between facecam & gameplay
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillRect(0, topH - 2, width, 2);

      // Bottom 64%: gameplay center crop
      const botY = topH;
      const botH = height - topH;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, botY, width, botH);
      ctx.clip();
      const gpRatio = width / botH;
      const srcRatio = srcWidth / srcHeight;
      let drawW = width * subtleZoom;
      let drawH = botH * subtleZoom;
      if (srcRatio > gpRatio) {
        drawW = botH * srcRatio * subtleZoom;
      } else {
        drawH = (width / srcRatio) * subtleZoom;
      }
      ctx.drawImage(source, (width - drawW) / 2, botY + (botH - drawH) / 2, drawW, drawH);
      ctx.restore();
    } else {
      // blur-fit: blurred ambient fill + sharp centered 16:9 frame
      ctx.save();
      ctx.filter = "blur(22px) brightness(0.45)";
      const bgW = height * (srcWidth / srcHeight);
      ctx.drawImage(source, (width - bgW) / 2, 0, bgW, height);
      ctx.restore();

      const fgW = width - 24;
      const fgH = fgW * (srcHeight / srcWidth);
      const fgX = 12;
      const fgY = (height - fgH) / 2 - 20;
      ctx.drawImage(source, fgX, fgY, fgW, fgH);
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 2;
      ctx.strokeRect(fgX, fgY, fgW, fgH);
    }
  }

  // Bottom readability scrim
  const scrim = ctx.createLinearGradient(0, height * 0.56, 0, height);
  scrim.addColorStop(0, "rgba(0,0,0,0)");
  scrim.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, height * 0.56, width, height * 0.44);

  // Opening hook banner during first 20% of clip
  if (progressRatio < 0.22 && hookLine) {
    ctx.save();
    ctx.font = "600 20px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    const maxW = width - 64;
    const words = hookLine.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
      const test = current ? `${current} ${w}` : w;
      if (ctx.measureText(test).width > maxW && current) {
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);

    const boxH = lines.length * 28 + 20;
    const boxY = Math.round(height * 0.14);
    ctx.fillStyle = "rgba(11, 13, 17, 0.86)";
    ctx.fillRect(28, boxY, width - 56, boxH);
    ctx.strokeStyle = "rgba(244, 63, 94, 0.7)";
    ctx.lineWidth = 2;
    ctx.strokeRect(28, boxY, width - 56, boxH);

    ctx.fillStyle = "#FFFFFF";
    lines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, boxY + 28 + idx * 28);
    });
    ctx.restore();
  }

  // Active timed caption
  if (captionText) {
    ctx.save();
    const maxW = width - 68;
    ctx.font =
      captionStyle === "bold-impact"
        ? "700 24px 'Plus Jakarta Sans', sans-serif"
        : captionStyle === "clean-minimal"
        ? "500 20px 'DM Sans', sans-serif"
        : "600 21px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";

    const words = captionText.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
      const test = current ? `${current} ${w}` : w;
      if (ctx.measureText(test).width > maxW && current) {
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);

    const baseBottom = height - 92;
    const totalH = lines.length * 30;
    const startY = baseBottom - totalH;

    if (captionStyle === "broadcast-lower") {
      ctx.fillStyle = "rgba(15, 18, 24, 0.88)";
      ctx.fillRect(26, startY - 14, width - 52, totalH + 22);
    }

    lines.forEach((line, idx) => {
      const y = startY + idx * 30 + 18;
      if (captionStyle === "bold-impact") {
        ctx.lineWidth = 6;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.92)";
        ctx.strokeText(line, width / 2, y);
        ctx.fillStyle = idx === 0 ? "#FFFFFF" : "#FDE047";
      } else {
        ctx.fillStyle = "#F3F5F8";
      }
      ctx.fillText(line, width / 2, y);
    });
    ctx.restore();
  }
}

export interface ExportRenderResult {
  blob: Blob;
  url: string;
  mimeType: string;
}

export async function exportShortClipToWebm(options: {
  stream: StreamSource;
  clip: HighlightClip;
  framingMode: FramingMode;
  captionStyle: CaptionStyle;
  showCaptions: boolean;
  onProgress: (percent: number) => void;
  signal?: AbortSignal;
}): Promise<ExportRenderResult> {
  const { stream, clip, framingMode, captionStyle, showCaptions, onProgress, signal } = options;

  const width = 540;
  const height = 960;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is unavailable in this browser.");
  }

  const clipDuration = Math.max(2, clip.endSec - clip.startSec);
  // Render up to 12 seconds real-time for local/demo exports so browser recording finishes briskly
  // while matching the clip's exact caption pacing.
  const renderDurationMs = Math.min(clipDuration * 1000, 12000);

  let videoEl: HTMLVideoElement | null = null;
  let imageEl: HTMLImageElement | null = null;

  if (stream.localVideoUrl) {
    videoEl = document.createElement("video");
    videoEl.src = stream.localVideoUrl;
    videoEl.crossOrigin = "anonymous";
    videoEl.muted = true;
    videoEl.playsInline = true;
    await new Promise<void>((resolve, reject) => {
      if (!videoEl) return reject(new Error("Missing video element"));
      videoEl.onloadeddata = () => resolve();
      videoEl.onerror = () => reject(new Error("Could not load local video for export."));
    });
    videoEl.currentTime = clip.startSec;
    await new Promise<void>((resolve) => {
      if (!videoEl) return resolve();
      videoEl.onseeked = () => resolve();
      setTimeout(resolve, 400);
    });
    await videoEl.play().catch(() => {});
  } else if (stream.thumbnailUrl) {
    imageEl = new Image();
    imageEl.crossOrigin = "anonymous";
    imageEl.src = stream.thumbnailUrl;
    await new Promise<void>((resolve) => {
      if (!imageEl) return resolve();
      imageEl.onload = () => resolve();
      imageEl.onerror = () => resolve();
    });
  }

  const canvasStream = canvas.captureStream(30);
  const mimeCandidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  const selectedMime =
    mimeCandidates.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ??
    "video/webm";

  const recorder = new MediaRecorder(canvasStream, {
    mimeType: selectedMime,
    videoBitsPerSecond: 2_800_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  return await new Promise<ExportRenderResult>((resolve, reject) => {
    let rafId = 0;
    const startTime = performance.now();

    const cleanup = () => {
      cancelAnimationFrame(rafId);
      if (videoEl) {
        videoEl.pause();
        videoEl.src = "";
      }
      canvasStream.getTracks().forEach((t) => t.stop());
    };

    if (signal) {
      signal.addEventListener("abort", () => {
        cleanup();
        if (recorder.state !== "inactive") recorder.stop();
        reject(new Error("Export cancelled."));
      });
    }

    recorder.onerror = () => {
      cleanup();
      reject(new Error("MediaRecorder encountered an error during rendering."));
    };

    recorder.onstop = () => {
      cleanup();
      const blob = new Blob(chunks, { type: selectedMime });
      const url = URL.createObjectURL(blob);
      onProgress(100);
      resolve({ blob, url, mimeType: selectedMime });
    };

    const findCaption = (offsetSec: number, cues: CaptionCue[]): string | null => {
      if (!showCaptions) return null;
      const active = cues.find(
        (c) => offsetSec >= c.startOffsetSec && offsetSec <= c.endOffsetSec
      );
      return active ? active.text : null;
    };

    recorder.start(200);

    const tick = () => {
      const elapsed = performance.now() - startTime;
      const ratio = Math.min(1, elapsed / renderDurationMs);
      const offsetSec = ratio * clipDuration;

      drawVerticalFrame(
        ctx,
        width,
        height,
        videoEl ?? imageEl,
        framingMode,
        findCaption(offsetSec, clip.captions),
        captionStyle,
        ratio,
        clip.hookLine
      );

      onProgress(Math.min(98, Math.round(ratio * 100)));

      if (elapsed >= renderDurationMs) {
        if (recorder.state !== "inactive") recorder.stop();
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
  });
}
