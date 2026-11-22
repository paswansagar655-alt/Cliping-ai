import { useEffect, useRef } from "react";
import { Loader2, Sparkles, Subtitles } from "lucide-react";
import {
  CaptionStyle,
  FramingMode,
  HighlightClip,
  StreamSource,
  TargetPlatform,
} from "../types/clip";
import { drawVerticalFrame } from "../utils/videoEngine";

interface VerticalPreviewProps {
  stream: StreamSource;
  activeClip: HighlightClip;
  currentTime: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  framingMode: FramingMode;
  captionStyle: CaptionStyle;
  showCaptions: boolean;
  targetPlatform: TargetPlatform;
  isRewritingHook: boolean;
  onChangeFraming: (mode: FramingMode) => void;
  onChangeCaptionStyle: (style: CaptionStyle) => void;
  onToggleCaptions: () => void;
  onChangePlatform: (platform: TargetPlatform) => void;
  onUpdateClipMeta: (patch: Partial<HighlightClip>) => void;
  onRewriteHook: () => void;
}

export function VerticalPreview({
  stream,
  activeClip,
  currentTime,
  videoRef,
  framingMode,
  captionStyle,
  showCaptions,
  targetPlatform,
  isRewritingHook,
  onChangeFraming,
  onChangeCaptionStyle,
  onToggleCaptions,
  onChangePlatform,
  onUpdateClipMeta,
  onRewriteHook,
}: VerticalPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!stream.thumbnailUrl) {
      imageRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = stream.thumbnailUrl;
    img.onload = () => {
      imageRef.current = img;
    };
  }, [stream.thumbnailUrl]);

  useEffect(() => {
    let rafId = 0;

    const renderFrame = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        const clipDuration = Math.max(1, activeClip.endSec - activeClip.startSec);
        const offsetSec = Math.max(0, Math.min(clipDuration, currentTime - activeClip.startSec));
        const ratio = offsetSec / clipDuration;

        const activeCaption = showCaptions
          ? activeClip.captions.find(
              (c) => offsetSec >= c.startOffsetSec && offsetSec <= c.endOffsetSec
            )?.text ?? activeClip.captions[0]?.text ?? null
          : null;

        const video = videoRef.current;
        const sourceEl =
          video && video.readyState >= 2 && stream.localVideoUrl ? video : imageRef.current;

        drawVerticalFrame(
          ctx,
          canvas.width,
          canvas.height,
          sourceEl,
          framingMode,
          activeCaption,
          captionStyle,
          ratio,
          activeClip.hookLine
        );
      }
      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [
    activeClip,
    captionStyle,
    currentTime,
    framingMode,
    showCaptions,
    stream.localVideoUrl,
    videoRef,
  ]);

  return (
    <aside className="bg-[#11141A] border border-white/[0.08] rounded-xl p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-sm font-semibold text-zinc-100">
            9:16 Short Preview
          </h2>
          <p className="text-xs text-zinc-400">
            {targetPlatform} · 1080×1920
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleCaptions}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
            showCaptions
              ? "bg-[#181C24] border-white/[0.16] text-zinc-100"
              : "bg-transparent border-white/[0.08] text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Subtitles className="w-3.5 h-3.5" />
          <span>{showCaptions ? "Captions On" : "Captions Off"}</span>
        </button>
      </div>

      {/* 9:16 Canvas Viewport */}
      <div className="mx-auto w-full max-w-[240px] aspect-[9/16] rounded-xl overflow-hidden border border-white/[0.12] bg-[#090B0E]">
        <canvas
          ref={canvasRef}
          width={360}
          height={640}
          className="w-full h-full block"
          aria-label="9:16 vertical short preview"
        />
      </div>

      {/* Framing Mode Segmented Control */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-zinc-400 block">Vertical Framing</span>
        <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#0B0D11] border border-white/[0.08]">
          {(
            [
              { id: "center-fill", label: "Center Crop" },
              { id: "facecam-split", label: "Cam Split" },
              { id: "blur-fit", label: "Blur Fit" },
            ] as const
          ).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onChangeFraming(mode.id)}
              className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                framingMode === mode.id
                  ? "bg-[#1B2029] text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Caption Style & Platform */}
      <div className="grid grid-cols-2 gap-2.5">
        <label className="space-y-1 block">
          <span className="text-xs text-zinc-400 block">Caption Style</span>
          <select
            value={captionStyle}
            onChange={(e) => onChangeCaptionStyle(e.target.value as CaptionStyle)}
            className="w-full px-2.5 py-2 rounded-lg bg-[#0B0D11] border border-white/[0.1] text-xs text-zinc-100 focus:outline-none focus:border-[#F43F5E]"
          >
            <option value="bold-impact">Bold Impact</option>
            <option value="clean-minimal">Clean Minimal</option>
            <option value="broadcast-lower">Broadcast Lower</option>
          </select>
        </label>

        <label className="space-y-1 block">
          <span className="text-xs text-zinc-400 block">Target Feed</span>
          <select
            value={targetPlatform}
            onChange={(e) => onChangePlatform(e.target.value as TargetPlatform)}
            className="w-full px-2.5 py-2 rounded-lg bg-[#0B0D11] border border-white/[0.1] text-xs text-zinc-100 focus:outline-none focus:border-[#F43F5E]"
          >
            <option value="YouTube Shorts">YouTube Shorts</option>
            <option value="TikTok">TikTok</option>
            <option value="Instagram Reels">Instagram Reels</option>
          </select>
        </label>
      </div>

      {/* Editable Clip Title & Hook */}
      <div className="space-y-2.5 pt-2 border-t border-white/[0.08]">
        <label className="space-y-1 block">
          <span className="text-xs text-zinc-400 block">Clip Title</span>
          <input
            type="text"
            value={activeClip.title}
            onChange={(e) => onUpdateClipMeta({ title: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-[#0B0D11] border border-white/[0.1] text-xs text-zinc-100 focus:outline-none focus:border-[#F43F5E]"
          />
        </label>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Opening Hook Overlay</span>
            <button
              type="button"
              onClick={onRewriteHook}
              disabled={isRewritingHook}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#F43F5E] hover:text-[#FB7185] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              {isRewritingHook ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              <span>{isRewritingHook ? "Rewriting..." : "Rewrite Hook"}</span>
            </button>
          </div>
          <textarea
            rows={2}
            value={activeClip.hookLine}
            onChange={(e) => onUpdateClipMeta({ hookLine: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-[#0B0D11] border border-white/[0.1] text-xs text-zinc-100 resize-none focus:outline-none focus:border-[#F43F5E]"
          />
        </div>
      </div>
    </aside>
  );
}
