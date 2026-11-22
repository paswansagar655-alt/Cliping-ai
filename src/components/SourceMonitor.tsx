import { useState } from "react";
import {
  ExternalLink,
  FolderPlus,
  Pause,
  Play,
  Repeat,
  Volume2,
  VolumeX,
} from "lucide-react";
import { HighlightClip, StreamSource } from "../types/clip";
import { formatTimecode } from "../utils/videoEngine";

interface SourceMonitorProps {
  stream: StreamSource;
  activeClip: HighlightClip;
  currentTime: number;
  isPlaying: boolean;
  loopClip: boolean;
  isMuted: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  onToggleMute: () => void;
  onTimeUpdate: (timeSec: number) => void;
  onOpenIngest: () => void;
}

export function SourceMonitor({
  stream,
  activeClip,
  currentTime,
  isPlaying,
  loopClip,
  isMuted,
  videoRef,
  onTogglePlay,
  onToggleLoop,
  onToggleMute,
  onTimeUpdate,
  onOpenIngest,
}: SourceMonitorProps) {
  const [embedActive, setEmbedActive] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const twitchParent =
    typeof window !== "undefined" ? window.location.hostname : "localhost";

  const resolvedEmbedUrl = stream.embedUrl
    ? stream.platform === "twitch"
      ? `${stream.embedUrl}&parent=${encodeURIComponent(twitchParent)}`
      : `${stream.embedUrl}&start=${Math.floor(activeClip.startSec)}`
    : undefined;

  return (
    <section className="bg-[#11141A] border border-white/[0.08] rounded-xl overflow-hidden">
      {/* Monitor Header */}
      <div className="px-4 py-3 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span className="capitalize font-medium text-zinc-200">
              {stream.platform === "local" ? "Uploaded VOD" : stream.platform}
            </span>
            <span aria-hidden="true">·</span>
            <span>{stream.channelName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {formatTimecode(stream.durationSec)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {stream.highlights.length} highlights
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {resolvedEmbedUrl && (
            <button
              type="button"
              onClick={() => setEmbedActive((prev) => !prev)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#181C24] hover:bg-[#222834] border border-white/[0.1] text-zinc-200 transition-colors whitespace-nowrap shrink-0"
            >
              {embedActive ? "Show Studio Frame" : "Load Live Embed"}
            </button>
          )}
          <button
            type="button"
            onClick={onOpenIngest}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#181C24] hover:bg-[#222834] border border-white/[0.1] text-zinc-200 transition-colors whitespace-nowrap shrink-0"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#F43F5E]" />
            <span>Import Stream</span>
          </button>
        </div>
      </div>

      {/* 16:9 Source Viewport */}
      <div className="relative aspect-video bg-[#07080B] overflow-hidden">
        {stream.localVideoUrl ? (
          <video
            ref={videoRef}
            src={stream.localVideoUrl}
            muted={isMuted}
            playsInline
            onTimeUpdate={(e) => {
              const t = e.currentTarget.currentTime;
              if (loopClip && t >= activeClip.endSec) {
                e.currentTarget.currentTime = activeClip.startSec;
                onTimeUpdate(activeClip.startSec);
              } else {
                onTimeUpdate(t);
              }
            }}
            className="w-full h-full object-contain bg-black"
          />
        ) : embedActive && resolvedEmbedUrl ? (
          <iframe
            src={resolvedEmbedUrl}
            title={stream.title}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        ) : (
          <div className="relative w-full h-full">
            {!imgFailed && stream.thumbnailUrl ? (
              <img
                src={stream.thumbnailUrl}
                alt={stream.title}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-full object-cover transition-transform duration-300"
                style={{
                  transform: isPlaying ? "scale(1.03)" : "scale(1)",
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#151922] via-[#0F1218] to-[#1A1318] flex flex-col items-center justify-center gap-2 p-6 text-center">
                <span className="font-display text-base font-semibold text-zinc-200">
                  {stream.title}
                </span>
                <span className="text-xs text-zinc-400">
                  {stream.channelName} · {formatTimecode(stream.durationSec)}
                </span>
              </div>
            )}

            {/* Measured contrast scrim + active playhead readout */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 pointer-events-none">
              <div className="max-w-xl">
                <p className="text-xs font-medium text-[#FB7185]">
                  Active Clip · {formatTimecode(activeClip.startSec)} –{" "}
                  {formatTimecode(activeClip.endSec)}
                </p>
                <p className="font-display text-sm sm:text-base font-semibold text-white mt-0.5 line-clamp-1">
                  {activeClip.title}
                </p>
              </div>
              <div className="font-mono text-xs tabular-nums text-zinc-100 bg-black/70 px-2.5 py-1 rounded-md border border-white/15 shrink-0">
                {formatTimecode(currentTime, true)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transport Bar */}
      <div className="px-4 py-2.5 border-t border-white/[0.08] bg-[#0D1015] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlay}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#181C24] hover:bg-[#222834] border border-white/[0.1] text-zinc-100 transition-colors whitespace-nowrap shrink-0"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 text-[#F43F5E]" />
            ) : (
              <Play className="w-3.5 h-3.5 text-[#F43F5E]" />
            )}
            <span>{isPlaying ? "Pause" : "Play Clip"}</span>
          </button>

          <button
            type="button"
            onClick={onToggleLoop}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              loopClip
                ? "bg-[#F43F5E]/15 border-[#F43F5E]/40 text-[#FDA4AF]"
                : "bg-transparent border-white/[0.08] text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Loop Window</span>
          </button>

          {stream.localVideoUrl && (
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? "Unmute audio" : "Mute audio"}
              className="p-1.5 rounded-lg border border-white/[0.08] text-zinc-300 hover:bg-white/[0.06] transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-400">
          {stream.url && (
            <a
              href={stream.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Open Original</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
