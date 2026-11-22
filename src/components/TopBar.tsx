import { Download, Loader2, Sparkles } from "lucide-react";
import { StreamSource } from "../types/clip";
import { WorkspaceTab } from "./Sidebar";

interface TopBarProps {
  activeTab: WorkspaceTab;
  activeStream: StreamSource;
  isDetecting: boolean;
  isExporting: boolean;
  onDetectHighlights: () => void;
  onExportClip: () => void;
}

const TAB_TITLES: Record<WorkspaceTab, string> = {
  studio: "Clip Studio",
  highlights: "Detected Highlights",
  exports: "Export Queue",
};

export function TopBar({
  activeTab,
  activeStream,
  isDetecting,
  isExporting,
  onDetectHighlights,
  onExportClip,
}: TopBarProps) {
  return (
    <header className="h-14 px-4 lg:px-6 border-b border-white/[0.08] bg-[#0E1116] flex items-center justify-between gap-8 shrink-0">
      <div className="flex items-center gap-2 min-w-0 text-sm">
        <span className="font-medium text-zinc-400 whitespace-nowrap shrink-0">
          {TAB_TITLES[activeTab]}
        </span>
        <span className="text-zinc-600" aria-hidden="true">
          /
        </span>
        <span className="font-medium text-zinc-100 truncate">{activeStream.title}</span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onDetectHighlights}
          disabled={isDetecting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#181C24] hover:bg-[#222834] border border-white/[0.12] text-zinc-100 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
        >
          {isDetecting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F43F5E]" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-[#F43F5E]" />
          )}
          <span>{isDetecting ? "Analyzing Stream..." : "Detect Highlights"}</span>
        </button>

        <button
          type="button"
          onClick={onExportClip}
          disabled={isExporting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#F43F5E] hover:bg-[#E11D48] text-white disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span>{isExporting ? "Rendering..." : "Export Short"}</span>
        </button>
      </div>
    </header>
  );
}
