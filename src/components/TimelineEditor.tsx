import { useRef } from "react";
import { ChevronLeft, ChevronRight, Flag, Plus, Scissors } from "lucide-react";
import { HighlightClip, StreamSource } from "../types/clip";
import { formatTimecode } from "../utils/videoEngine";

interface TimelineEditorProps {
  stream: StreamSource;
  currentTime: number;
  startSec: number;
  endSec: number;
  activeHighlightId: string | null;
  onSeek: (timeSec: number) => void;
  onUpdateRange: (startSec: number, endSec: number) => void;
  onSelectHighlight: (highlight: HighlightClip) => void;
  onSaveManualClip: () => void;
}

export function TimelineEditor({
  stream,
  currentTime,
  startSec,
  endSec,
  activeHighlightId,
  onSeek,
  onUpdateRange,
  onSelectHighlight,
  onSaveManualClip,
}: TimelineEditorProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const duration = Math.max(10, stream.durationSec);

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(Math.round(ratio * duration * 10) / 10);
  };

  const startPct = Math.max(0, Math.min(100, (startSec / duration) * 100));
  const endPct = Math.max(startPct, Math.min(100, (endSec / duration) * 100));
  const playheadPct = Math.max(0, Math.min(100, (currentTime / duration) * 100));
  const clipLength = Math.max(1, endSec - startSec);

  const nudgeStart = (delta: number) => {
    const nextStart = Math.max(0, Math.min(endSec - 4, startSec + delta));
    onUpdateRange(Math.round(nextStart * 10) / 10, endSec);
  };

  const nudgeEnd = (delta: number) => {
    const nextEnd = Math.min(duration, Math.max(startSec + 4, endSec + delta));
    onUpdateRange(startSec, Math.round(nextEnd * 10) / 10);
  };

  return (
    <section
      aria-label="Trim and highlight timeline"
      className="bg-[#11141A] border border-white/[0.08] rounded-xl p-4 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Playhead</span>
            <span className="font-mono tabular-nums text-zinc-100 font-medium">
              {formatTimecode(currentTime, true)}
            </span>
          </div>
          <span className="text-zinc-700" aria-hidden="true">
            |
          </span>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">In</span>
            <span className="font-mono tabular-nums text-zinc-100">
              {formatTimecode(startSec, true)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Out</span>
            <span className="font-mono tabular-nums text-zinc-100">
              {formatTimecode(endSec, true)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Length</span>
            <span className="font-mono tabular-nums text-[#FB7185] font-medium">
              {clipLength.toFixed(1)}s
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center border border-white/[0.1] rounded-lg overflow-hidden bg-[#0B0D11]">
            <button
              type="button"
              onClick={() => nudgeStart(-1)}
              title="Move In point back 1s"
              className="px-2 py-1.5 text-xs text-zinc-300 hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5 inline" />
              <span>1s In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const nextIn = Math.min(currentTime, endSec - 4);
                onUpdateRange(Math.round(nextIn * 10) / 10, endSec);
              }}
              className="px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/[0.06] border-x border-white/[0.08] transition-colors whitespace-nowrap shrink-0"
            >
              Set In
            </button>
            <button
              type="button"
              onClick={() => nudgeStart(1)}
              title="Move In point forward 1s"
              className="px-2 py-1.5 text-xs text-zinc-300 hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0"
            >
              <span>+1s</span>
              <ChevronRight className="w-3.5 h-3.5 inline" />
            </button>
          </div>

          <div className="flex items-center border border-white/[0.1] rounded-lg overflow-hidden bg-[#0B0D11]">
            <button
              type="button"
              onClick={() => nudgeEnd(-1)}
              title="Move Out point back 1s"
              className="px-2 py-1.5 text-xs text-zinc-300 hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5 inline" />
              <span>1s</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const nextOut = Math.max(currentTime, startSec + 4);
                onUpdateRange(startSec, Math.round(nextOut * 10) / 10);
              }}
              className="px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/[0.06] border-x border-white/[0.08] transition-colors whitespace-nowrap shrink-0"
            >
              Set Out
            </button>
            <button
              type="button"
              onClick={() => nudgeEnd(1)}
              title="Move Out point forward 1s"
              className="px-2 py-1.5 text-xs text-zinc-300 hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0"
            >
              <span>Out +1s</span>
              <ChevronRight className="w-3.5 h-3.5 inline" />
            </button>
          </div>

          <button
            type="button"
            onClick={onSaveManualClip}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#181C24] hover:bg-[#222834] border border-white/[0.1] text-zinc-100 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-[#F43F5E]" />
            <span>Save Clip</span>
          </button>
        </div>
      </div>

      {/* Audio energy waveform & clickable highlight markers */}
      <div className="space-y-2">
        <div className="flex justify-between text-[11px] font-mono tabular-nums text-zinc-500">
          <span>00:00</span>
          <span>{formatTimecode(duration * 0.25)}</span>
          <span>{formatTimecode(duration * 0.5)}</span>
          <span>{formatTimecode(duration * 0.75)}</span>
          <span>{formatTimecode(duration)}</span>
        </div>

        <div
          ref={trackRef}
          onClick={handleTrackClick}
          role="slider"
          aria-label="Stream scrub timeline"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          tabIndex={0}
          className="relative h-24 rounded-lg bg-[#090B0E] border border-white/[0.08] overflow-hidden cursor-pointer select-none"
        >
          {/* Audio Peak Bars */}
          <div className="absolute inset-0 flex items-end gap-[2px] px-1.5 py-2 pointer-events-none">
            {stream.audioPeaks.map((peak, idx) => {
              const barPct = (peak.timeSec / duration) * 100;
              const inWindow = barPct >= startPct && barPct <= endPct;
              const isHighPeak = peak.level >= 78;
              return (
                <div
                  key={`${peak.timeSec}-${idx}`}
                  className="flex-1 rounded-t-xs transition-colors"
                  style={{
                    height: `${Math.max(12, peak.level)}%`,
                    backgroundColor: inWindow
                      ? isHighPeak
                        ? "#F43F5E"
                        : "rgba(244, 63, 94, 0.55)"
                      : isHighPeak
                      ? "rgba(217, 119, 6, 0.72)"
                      : "rgba(148, 163, 184, 0.22)",
                  }}
                />
              );
            })}
          </div>

          {/* Highlight Markers Row */}
          {stream.highlights.map((hl) => {
            const hlStart = (hl.startSec / duration) * 100;
            const hlWidth = Math.max(1.5, ((hl.endSec - hl.startSec) / duration) * 100);
            const selected = hl.id === activeHighlightId;
            return (
              <button
                key={hl.id}
                type="button"
                title={`${hl.title} (${formatTimecode(hl.startSec)} – ${formatTimecode(hl.endSec)})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectHighlight(hl);
                }}
                style={{ left: `${hlStart}%`, width: `${hlWidth}%` }}
                className={`absolute top-1.5 h-2.5 rounded-sm transition-opacity ${
                  selected
                    ? "bg-[#F43F5E] ring-1 ring-white/80"
                    : "bg-amber-500/75 hover:bg-amber-400"
                }`}
              />
            );
          })}

          {/* Active Trim Selection Overlay */}
          <div
            className="absolute inset-y-0 bg-[#F43F5E]/12 border-x-2 border-[#F43F5E] pointer-events-none"
            style={{
              left: `${startPct}%`,
              width: `${Math.max(0.5, endPct - startPct)}%`,
            }}
          />

          {/* Chat spike ticks along bottom */}
          {stream.chatVelocity.map((spike, idx) => {
            const left = Math.max(0, Math.min(99, (spike.timeSec / duration) * 100));
            return (
              <div
                key={`${spike.timeSec}-${idx}`}
                title={`Chat spike: ${spike.messagesPerMin} msg/min (${spike.keyword})`}
                style={{ left: `${left}%` }}
                className="absolute bottom-1 w-1 h-2.5 bg-emerald-400/80 rounded-full pointer-events-none"
              />
            );
          })}

          {/* Playhead */}
          <div
            className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.65)] pointer-events-none"
            style={{ left: `${playheadPct}%` }}
          >
            <div className="w-2.5 h-2.5 -ml-[4px] -mt-0.5 bg-white rotate-45" />
          </div>
        </div>

        {/* Dual Range Sliders for precise In/Out dragging */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <label className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="w-12 shrink-0 flex items-center gap-1">
              <Scissors className="w-3 h-3 text-zinc-400" />
              In
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(1, endSec - 4)}
              step={0.5}
              value={startSec}
              onChange={(e) => {
                const v = Number(e.target.value);
                onUpdateRange(v, endSec);
                onSeek(v);
              }}
              className="w-full accent-[#F43F5E] cursor-pointer"
            />
          </label>

          <label className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="w-12 shrink-0 flex items-center gap-1">
              <Flag className="w-3 h-3 text-zinc-400" />
              Out
            </span>
            <input
              type="range"
              min={Math.min(duration, startSec + 4)}
              max={duration}
              step={0.5}
              value={endSec}
              onChange={(e) => {
                const v = Number(e.target.value);
                onUpdateRange(startSec, v);
              }}
              className="w-full accent-[#F43F5E] cursor-pointer"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500 pt-1">
          <span>
            Timeline signals: red bars indicate peak audio in clip window · amber markers indicate detected highlights · green ticks indicate chat velocity spikes
          </span>
        </div>
      </div>
    </section>
  );
}
