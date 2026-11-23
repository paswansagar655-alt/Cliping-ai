import {
  CreditCard,
  Film,
  FolderPlus,
  Layers,
  LogIn,
  LogOut,
  Scissors,
  Shield,
  Sparkles,
} from "lucide-react";
import { useFirebase } from "../context/FirebaseContext";
import { StreamSource } from "../types/clip";
import { formatTimecode } from "../utils/videoEngine";
import { PWAInstallButton } from "./PWAInstallButton";

export type WorkspaceTab = "studio" | "highlights" | "exports" | "pricing" | "admin";

interface SidebarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  streams: StreamSource[];
  activeStreamId: string;
  onSelectStream: (id: string) => void;
  onOpenIngest: () => void;
  totalHighlightsCount: number;
  exportsCount: number;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  streams,
  activeStreamId,
  onSelectStream,
  onOpenIngest,
  totalHighlightsCount,
  exportsCount,
}: SidebarProps) {
  const { firebaseUser, userProfile, isAdmin, signInWithGoogle, signOutUser } = useFirebase();

  return (
    <aside className="w-full lg:w-[252px] shrink-0 bg-[#11141A] border-b lg:border-b-0 lg:border-r border-white/[0.08] flex flex-col justify-between">
      <div>
        <div className="h-14 px-5 flex items-center justify-between gap-3 border-b border-white/[0.08]">
          <span className="font-display text-lg font-bold tracking-tight text-[#F3F5F8] whitespace-nowrap shrink-0">
            ClipDeck
          </span>
          <div className="flex items-center gap-2 lg:hidden">
            <PWAInstallButton compact />
            {firebaseUser ? (
              <button
                type="button"
                onClick={signOutUser}
                className="px-2.5 py-1.5 rounded-lg bg-[#181C24] border border-white/[0.1] text-xs font-medium text-zinc-200 whitespace-nowrap shrink-0"
              >
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#181C24] border border-white/[0.12] text-xs font-medium text-zinc-100 whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5 text-[#F43F5E]" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        <nav className="p-3 space-y-1" aria-label="Workspace navigation">
          <button
            type="button"
            onClick={() => onSelectTab("studio")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === "studio"
                ? "bg-[#1B2029] text-white"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Scissors className="w-4 h-4 text-[#F43F5E]" />
              <span>Clip Studio</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("highlights")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === "highlights"
                ? "bg-[#1B2029] text-white"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-zinc-400" />
              <span>Detected Highlights</span>
            </span>
            <span className="font-mono text-xs tabular-nums text-zinc-400">
              {totalHighlightsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("exports")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === "exports"
                ? "bg-[#1B2029] text-white"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-zinc-400" />
              <span>Export Queue</span>
            </span>
            <span className="font-mono text-xs tabular-nums text-zinc-400">
              {exportsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("pricing")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === "pricing"
                ? "bg-[#1B2029] text-white"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-zinc-400" />
              <span>Pricing &amp; Plans</span>
            </span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => onSelectTab("admin")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "admin"
                  ? "bg-[#1B2029] text-white"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-[#F43F5E]" />
                <span>Admin Console</span>
              </span>
            </button>
          )}
        </nav>

        <div className="px-4 pt-4 pb-2 flex items-center justify-between border-t border-white/[0.06]">
          <span className="text-xs font-medium text-zinc-400">Stream Sources</span>
          <button
            type="button"
            onClick={onOpenIngest}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#F43F5E] hover:text-[#FB7185] transition-colors whitespace-nowrap shrink-0"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        <div className="px-3 pb-4 space-y-1 max-h-[240px] lg:max-h-[340px] overflow-y-auto">
          {streams.map((stream) => {
            const isActive = stream.id === activeStreamId;
            return (
              <button
                key={stream.id}
                type="button"
                onClick={() => {
                  onSelectStream(stream.id);
                  onSelectTab("studio");
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors border ${
                  isActive
                    ? "bg-[#161A22] border-white/[0.12] text-zinc-100"
                    : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-0.5">
                  <span className="capitalize">
                    {stream.platform === "local" ? "Uploaded VOD" : stream.platform}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {formatTimecode(stream.durationSec)}
                  </span>
                </div>
                <p className="text-xs font-medium text-zinc-100 truncate">{stream.title}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden lg:block p-4 border-t border-white/[0.08] space-y-3">
        <PWAInstallButton />

        <button
          type="button"
          onClick={onOpenIngest}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#181C24] hover:bg-[#1F242F] border border-white/[0.1] text-xs font-medium text-zinc-100 transition-colors whitespace-nowrap shrink-0"
        >
          <Film className="w-3.5 h-3.5 text-zinc-300" />
          <span>Import Stream or VOD</span>
        </button>

        {firebaseUser ? (
          <div className="pt-2 border-t border-white/[0.08] space-y-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-100 truncate">
                {userProfile?.displayName || firebaseUser.displayName || "Creator"}
              </p>
              <p className="text-[11px] text-zinc-400 truncate">
                {isAdmin
                  ? "Admin"
                  : `${(userProfile?.planTier ?? "free").toUpperCase()} · ${
                      userProfile?.scansUsed ?? 0
                    }/${userProfile?.monthlyScanLimit ?? 5} scans`}
              </p>
            </div>
            <button
              type="button"
              onClick={signOutUser}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#0B0D11] hover:bg-white/[0.05] border border-white/[0.08] text-xs text-zinc-300 transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B0D11] hover:bg-[#181C24] border border-white/[0.12] text-xs font-medium text-zinc-100 transition-colors whitespace-nowrap shrink-0"
          >
            <LogIn className="w-3.5 h-3.5 text-[#F43F5E]" />
            <span>Sign In with Google</span>
          </button>
        )}
      </div>
    </aside>
  );
}
