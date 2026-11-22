import { useMemo, useState } from "react";
import { Download, Scissors, Search, Sparkles } from "lucide-react";
import { HighlightCategory, HighlightClip, StreamSource } from "../types/clip";
import { formatTimecode } from "../utils/videoEngine";

interface HighlightsQueueViewProps {
  stream: StreamSource;
  activeHighlightId: string | null;
  isDetecting: boolean;
  onSelectInStudio: (clip: HighlightClip) => void;
  onExportClip: (clip: HighlightClip) => void;
  onDetectHighlights: () => void;
}

const CATEGORIES: Array<"All" | HighlightCategory> = [
  "All",
  "Clutch Play",
  "Chat Spike",
  "Commentary Peak",
  "Reaction",
  "Plot Twist",
  "Manual",
];

export function HighlightsQueueView({
  stream,
  activeHighlightId,
  isDetecting,
  onSelectInStudio,
  onExportClip,
  onDetectHighlights,
}: HighlightsQueueViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"All" | HighlightCategory>("All");

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return stream.highlights.filter((hl) => {
      const matchesCat = categoryFilter === "All" || hl.category === categoryFilter;
      const matchesQuery =
        !q ||
        hl.title.toLowerCase().includes(q) ||
        hl.hookLine.toLowerCase().includes(q) ||
        hl.reason.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [categoryFilter, searchQuery, stream.highlights]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-zinc-100">
            Detected Highlights
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {stream.title} · {stream.highlights.length} highlight windows ready to trim or export
          </p>
        </div>

        <button
          type="button"
          onClick={onDetectHighlights}
          disabled={isDetecting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#F43F5E] hover:bg-[#E11D48] text-white disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isDetecting ? "Detecting..." : "Re-Scan Highlights"}</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#11141A] border border-white/[0.08]">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                categoryFilter === cat
                  ? "bg-[#1B2029] text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <label className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter highlights..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#11141A] border border-white/[0.08] text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#F43F5E]"
          />
        </label>
      </div>

      {/* Loading Skeletons */}
      {isDetecting ? (
        <div className="bg-[#11141A] border border-white/[0.08] rounded-xl divide-y divide-white/[0.06]">
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="p-4 flex items-center justify-between gap-4 animate-pulse">
              <div className="space-y-2 flex-1">
                <div className="h-4 w-56 bg-white/[0.08] rounded" />
                <div className="h-3 w-80 bg-white/[0.05] rounded" />
              </div>
              <div className="h-8 w-28 bg-white/[0.07] rounded-lg" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#11141A] border border-white/[0.08] rounded-xl p-10 text-center space-y-3">
          <h2 className="font-display text-base font-semibold text-zinc-100">
            No highlights match this view
          </h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Run automatic highlight detection to scan audio peaks, chat velocity, and stream cues for short-form clips.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={onDetectHighlights}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#F43F5E] hover:bg-[#E11D48] text-white transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Detect Highlights</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#11141A] border border-white/[0.08] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-xs font-medium text-zinc-400 bg-[#0E1116]">
                  <th className="py-3 px-4">Clip Title &amp; Rationale</th>
                  <th className="py-3 px-4 whitespace-nowrap">Category</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Window</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Length</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Signal</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-sm">
                {filtered.map((hl) => {
                  const isActive = hl.id === activeHighlightId;
                  const len = Math.max(1, hl.endSec - hl.startSec);
                  return (
                    <tr
                      key={hl.id}
                      className={`transition-colors ${
                        isActive ? "bg-white/[0.04]" : "hover:bg-white/[0.025]"
                      }`}
                    >
                      <td className="py-3.5 px-4 max-w-md">
                        <p className="font-medium text-zinc-100">{hl.title}</p>
                        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                          {hl.hookLine} · {hl.reason}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-zinc-300 whitespace-nowrap">
                        {hl.category}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums text-zinc-300 whitespace-nowrap">
                        {formatTimecode(hl.startSec)} – {formatTimecode(hl.endSec)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums text-zinc-300 whitespace-nowrap">
                        {len.toFixed(0)}s
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums text-zinc-100 whitespace-nowrap">
                        {hl.score}/100
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectInStudio(hl)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#181C24] hover:bg-[#222834] border border-white/[0.1] text-zinc-200 transition-colors"
                          >
                            <Scissors className="w-3 h-3" />
                            <span>Trim</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onExportClip(hl)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#F43F5E] hover:bg-[#E11D48] text-white transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            <span>Export</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
