import { useState } from "react";
import { Link2, Loader2, Upload, X } from "lucide-react";
import { StreamSource } from "../types/clip";
import { analyzeVideoAudioPeaks, generateBaselineAudioPeaks } from "../utils/videoEngine";

interface StreamIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStream: (stream: StreamSource, runDetection: boolean) => void;
}

export function StreamIngestModal({
  isOpen,
  onClose,
  onAddStream,
}: StreamIngestModalProps) {
  const [mode, setMode] = useState<"url" | "file">("url");
  const [urlInput, setUrlInput] = useState("");
  const [transcriptNotes, setTranscriptNotes] = useState("");
  const [autoDetect, setAutoDetect] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInspectUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!urlInput.trim()) {
      setErrorMsg("Enter a Twitch or YouTube URL.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/stream/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not inspect stream URL.");
      }

      const durationSec = Math.max(30, Number(data.durationSec) || 600);
      const newStream: StreamSource = {
        id: data.id,
        platform: data.platform,
        title: data.title,
        channelName: data.channelName,
        url: data.url,
        embedUrl: data.embedUrl,
        thumbnailUrl:
          data.thumbnailUrl || "/src/assets/images/stream_creator_desk_1795316681822.jpg",
        durationSec,
        transcript: transcriptNotes.trim(),
        audioPeaks: generateBaselineAudioPeaks(durationSec, 42),
        chatVelocity: [
          {
            timeSec: Math.round(durationSec * 0.28),
            messagesPerMin: 310,
            keyword: "CLIP THAT",
          },
          {
            timeSec: Math.round(durationSec * 0.64),
            messagesPerMin: 520,
            keyword: "NO WAY",
          },
        ],
        highlights: [],
        sourceKind: "remote",
      };

      onAddStream(newStream, autoDetect);
      setUrlInput("");
      setTranscriptNotes("");
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load stream.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;
    setErrorMsg(null);
    if (!file.type.startsWith("video/")) {
      setErrorMsg("Select a valid MP4, WebM, or MOV video file.");
      return;
    }

    setIsLoading(true);
    try {
      const objectUrl = URL.createObjectURL(file);
      const videoProbe = document.createElement("video");
      videoProbe.preload = "metadata";
      videoProbe.src = objectUrl;

      const durationSec = await new Promise<number>((resolve) => {
        videoProbe.onloadedmetadata = () => {
          resolve(Number.isFinite(videoProbe.duration) && videoProbe.duration > 5 ? videoProbe.duration : 120);
        };
        videoProbe.onerror = () => resolve(120);
      });

      const audioPeaks = await analyzeVideoAudioPeaks(file, durationSec, 48);

      const newStream: StreamSource = {
        id: `local-${Date.now()}`,
        platform: "local",
        title: file.name.replace(/\.[^.]+$/, ""),
        channelName: "Local Recording",
        url: "",
        localVideoUrl: objectUrl,
        thumbnailUrl: "/src/assets/images/stream_esports_arena_1795316681920.jpg",
        durationSec: Math.round(durationSec),
        transcript: transcriptNotes.trim(),
        audioPeaks,
        chatVelocity: [],
        highlights: [],
        sourceKind: "local-file",
      };

      onAddStream(newStream, autoDetect);
      setTranscriptNotes("");
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to read local video.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ingest-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-[#11141A] border border-white/[0.12] p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="ingest-modal-title" className="font-display text-base font-semibold text-zinc-100">
              Import Stream or VOD
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Load a Twitch or YouTube broadcast link, or drop a recorded VOD file.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#0B0D11] border border-white/[0.08]">
          <button
            type="button"
            onClick={() => {
              setMode("url");
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              mode === "url" ? "bg-[#1B2029] text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Twitch / YouTube URL</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("file");
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              mode === "file" ? "bg-[#1B2029] text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload VOD Recording</span>
          </button>
        </div>

        {errorMsg && (
          <div className="px-3.5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        {mode === "url" ? (
          <form onSubmit={handleInspectUrl} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-zinc-300 block">
                Stream, VOD, or Clip URL
              </span>
              <input
                type="url"
                required
                placeholder="https://www.youtube.com/watch?v=... or https://www.twitch.tv/videos/..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B0D11] border border-white/[0.1] text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#F43F5E]"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-zinc-300 block">
                Optional Transcript or Stream Context
              </span>
              <textarea
                rows={3}
                placeholder="Paste timestamps, stream chapters, or key moments to sharpen highlight detection..."
                value={transcriptNotes}
                onChange={(e) => setTranscriptNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B0D11] border border-white/[0.1] text-xs text-zinc-100 placeholder:text-zinc-500 resize-none focus:outline-none focus:border-[#F43F5E]"
              />
            </label>

            <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoDetect}
                onChange={(e) => setAutoDetect(e.target.checked)}
                className="rounded border-white/20 accent-[#F43F5E]"
              />
              <span>Automatically detect highlights immediately after import</span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#F43F5E] hover:bg-[#E11D48] text-white disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
              >
                {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isLoading ? "Inspecting URL..." : "Load Stream"}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-zinc-300 block">
                Optional Transcript or Topic Notes
              </span>
              <textarea
                rows={2}
                placeholder="Describe stream game, match, or key moments..."
                value={transcriptNotes}
                onChange={(e) => setTranscriptNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0B0D11] border border-white/[0.1] text-xs text-zinc-100 placeholder:text-zinc-500 resize-none focus:outline-none focus:border-[#F43F5E]"
              />
            </label>

            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.18] bg-[#0B0D11] hover:border-[#F43F5E]/60 px-6 py-8 text-center cursor-pointer transition-colors">
              {isLoading ? (
                <Loader2 className="w-6 h-6 text-[#F43F5E] animate-spin" />
              ) : (
                <Upload className="w-6 h-6 text-zinc-400" />
              )}
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-100">
                  {isLoading ? "Decoding audio peaks..." : "Choose an MP4, WebM, or MOV recording"}
                </p>
                <p className="text-xs text-zinc-400">
                  Audio energy peaks are extracted locally in your browser for timeline detection.
                </p>
              </div>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/*"
                disabled={isLoading}
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
                className="hidden"
              />
            </label>

            <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoDetect}
                onChange={(e) => setAutoDetect(e.target.checked)}
                className="rounded border-white/20 accent-[#F43F5E]"
              />
              <span>Run automatic highlight detection after audio scan</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
