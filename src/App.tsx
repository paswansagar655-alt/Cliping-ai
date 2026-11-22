import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Link2, Loader2, Scissors, Sparkles, X } from "lucide-react";
import { ExportQueueView } from "./components/ExportQueueView";
import { HighlightsQueueView } from "./components/HighlightsQueueView";
import { Sidebar, WorkspaceTab } from "./components/Sidebar";
import { SourceMonitor } from "./components/SourceMonitor";
import { StreamIngestModal } from "./components/StreamIngestModal";
import { TimelineEditor } from "./components/TimelineEditor";
import { TopBar } from "./components/TopBar";
import { VerticalPreview } from "./components/VerticalPreview";
import { SAMPLE_STREAMS } from "./data/sampleStreams";
import {
  CaptionStyle,
  ExportedClip,
  FramingMode,
  HighlightClip,
  StreamSource,
  TargetPlatform,
} from "./types/clip";
import {
  exportShortClipToWebm,
  formatTimecode,
  generateBaselineAudioPeaks,
} from "./utils/videoEngine";

function createFallbackClip(stream: StreamSource): HighlightClip {
  const end = Math.min(stream.durationSec, 32);
  return {
    id: `manual-${stream.id}`,
    title: stream.title.slice(0, 56),
    startSec: 0,
    endSec: Math.max(8, end),
    category: "Manual",
    score: 80,
    hookLine: "Key stream moment",
    reason: "Manual trim window",
    captions: [
      {
        startOffsetSec: 0,
        endOffsetSec: Math.min(6, Math.max(4, end)),
        text: stream.title.slice(0, 72),
      },
    ],
  };
}

export default function App() {
  const [streams, setStreams] = useState<StreamSource[]>(SAMPLE_STREAMS);
  const [activeStreamId, setActiveStreamId] = useState<string>(SAMPLE_STREAMS[0].id);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("studio");

  const activeStream = useMemo(
    () => streams.find((s) => s.id === activeStreamId) ?? streams[0],
    [activeStreamId, streams]
  );

  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(
    SAMPLE_STREAMS[0].highlights[0]?.id ?? null
  );
  const [draftClip, setDraftClip] = useState<HighlightClip>(
    SAMPLE_STREAMS[0].highlights[0] ?? createFallbackClip(SAMPLE_STREAMS[0])
  );

  const [currentTime, setCurrentTime] = useState<number>(
    SAMPLE_STREAMS[0].highlights[0]?.startSec ?? 0
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopClip, setLoopClip] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  const [framingMode, setFramingMode] = useState<FramingMode>("facecam-split");
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>("bold-impact");
  const [showCaptions, setShowCaptions] = useState(true);
  const [targetPlatform, setTargetPlatform] = useState<TargetPlatform>("YouTube Shorts");
  const [targetDurationPref, setTargetDurationPref] = useState<"20s" | "35s" | "55s">("35s");

  const [quickUrl, setQuickUrl] = useState("");
  const [isInspectingQuickUrl, setIsInspectingQuickUrl] = useState(false);

  const [isDetecting, setIsDetecting] = useState(false);
  const [isRewritingHook, setIsRewritingHook] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const [exports, setExports] = useState<ExportedClip[]>([]);
  const [ingestOpen, setIngestOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);

  const selectStream = useCallback(
    (streamId: string, overrideList?: StreamSource[]) => {
      const list = overrideList ?? streams;
      const found = list.find((s) => s.id === streamId);
      if (!found) return;
      setIsPlaying(false);
      setActiveStreamId(found.id);
      const firstHl = found.highlights[0] ?? createFallbackClip(found);
      setActiveHighlightId(found.highlights[0]?.id ?? null);
      setDraftClip(firstHl);
      setCurrentTime(firstHl.startSec);
    },
    [streams]
  );

  const seekTo = useCallback(
    (timeSec: number) => {
      const clamped = Math.max(0, Math.min(activeStream.durationSec, timeSec));
      setCurrentTime(clamped);
      if (videoRef.current && activeStream.localVideoUrl) {
        videoRef.current.currentTime = clamped;
      }
    },
    [activeStream.durationSec, activeStream.localVideoUrl]
  );

  const handleSelectHighlight = useCallback(
    (hl: HighlightClip) => {
      setActiveHighlightId(hl.id);
      setDraftClip({ ...hl });
      seekTo(hl.startSec);
    },
    [seekTo]
  );

  // Playback timer for non-local demo/remote frames
  useEffect(() => {
    if (!isPlaying || activeStream.localVideoUrl) return;
    let lastTick = performance.now();
    let rafId = 0;

    const step = (now: number) => {
      const dt = (now - lastTick) / 1000;
      lastTick = now;
      setCurrentTime((prev) => {
        const next = prev + dt;
        if (next >= draftClip.endSec) {
          if (loopClip) return draftClip.startSec;
          setIsPlaying(false);
          return draftClip.endSec;
        }
        return next;
      });
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [activeStream.localVideoUrl, draftClip.endSec, draftClip.startSec, isPlaying, loopClip]);

  const handleTogglePlay = () => {
    if (activeStream.localVideoUrl && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        if (
          videoRef.current.currentTime < draftClip.startSec ||
          videoRef.current.currentTime >= draftClip.endSec
        ) {
          videoRef.current.currentTime = draftClip.startSec;
          setCurrentTime(draftClip.startSec);
        }
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
      return;
    }

    if (!isPlaying && (currentTime < draftClip.startSec || currentTime >= draftClip.endSec)) {
      setCurrentTime(draftClip.startSec);
    }
    setIsPlaying((p) => !p);
  };

  const runHighlightDetection = useCallback(
    async (targetStream: StreamSource) => {
      setIsDetecting(true);
      setFeedback(null);
      try {
        const res = await fetch("/api/highlights/detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: targetStream.title,
            platform: targetStream.platform,
            channelName: targetStream.channelName,
            durationSec: targetStream.durationSec,
            transcript: targetStream.transcript,
            audioPeaks: targetStream.audioPeaks,
            chatVelocity: targetStream.chatVelocity,
            targetClipDuration: targetDurationPref,
            stylePreference: `${targetPlatform} vertical shorts`,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Highlight detection failed.");
        }

        const detected: HighlightClip[] = Array.isArray(data.highlights)
          ? data.highlights
          : [];

        if (detected.length === 0) {
          throw new Error("No highlight windows were returned for this stream.");
        }

        setStreams((prev) =>
          prev.map((s) => (s.id === targetStream.id ? { ...s, highlights: detected } : s))
        );

        if (targetStream.id === activeStreamId || detected.length > 0) {
          setActiveHighlightId(detected[0].id);
          setDraftClip(detected[0]);
          setCurrentTime(detected[0].startSec);
        }

        setFeedback({
          type: "success",
          message: `Detected ${detected.length} highlight clips for "${targetStream.title}".`,
        });
      } catch (err) {
        setFeedback({
          type: "error",
          message: err instanceof Error ? err.message : "Highlight detection failed.",
        });
      } finally {
        setIsDetecting(false);
      }
    },
    [activeStreamId, targetDurationPref, targetPlatform]
  );

  const handleQuickUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrl.trim()) return;
    setIsInspectingQuickUrl(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/stream/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: quickUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to inspect stream URL.");
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
        transcript: "",
        audioPeaks: generateBaselineAudioPeaks(durationSec, 42),
        chatVelocity: [
          {
            timeSec: Math.round(durationSec * 0.25),
            messagesPerMin: 340,
            keyword: "CLIP IT",
          },
          {
            timeSec: Math.round(durationSec * 0.68),
            messagesPerMin: 560,
            keyword: "INSANE",
          },
        ],
        highlights: [],
        sourceKind: "remote",
      };

      const nextList = [newStream, ...streams];
      setStreams(nextList);
      selectStream(newStream.id, nextList);
      setQuickUrl("");
      setActiveTab("studio");
      await runHighlightDetection(newStream);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Could not load stream URL.",
      });
    } finally {
      setIsInspectingQuickUrl(false);
    }
  };

  const handleAddStreamFromModal = (newStream: StreamSource, runDetection: boolean) => {
    const nextList = [newStream, ...streams];
    setStreams(nextList);
    selectStream(newStream.id, nextList);
    setActiveTab("studio");
    if (runDetection) {
      void runHighlightDetection(newStream);
    }
  };

  const handleUpdateRange = (nextStart: number, nextEnd: number) => {
    setDraftClip((prev) => ({
      ...prev,
      startSec: nextStart,
      endSec: nextEnd,
    }));
    if (activeHighlightId) {
      setStreams((prev) =>
        prev.map((s) =>
          s.id === activeStream.id
            ? {
                ...s,
                highlights: s.highlights.map((h) =>
                  h.id === activeHighlightId ? { ...h, startSec: nextStart, endSec: nextEnd } : h
                ),
              }
            : s
        )
      );
    }
  };

  const handleUpdateClipMeta = (patch: Partial<HighlightClip>) => {
    setDraftClip((prev) => ({ ...prev, ...patch }));
    if (activeHighlightId) {
      setStreams((prev) =>
        prev.map((s) =>
          s.id === activeStream.id
            ? {
                ...s,
                highlights: s.highlights.map((h) =>
                  h.id === activeHighlightId ? { ...h, ...patch } : h
                ),
              }
            : s
        )
      );
    }
  };

  const handleSaveManualClip = () => {
    const newClip: HighlightClip = {
      ...draftClip,
      id: `hl-manual-${Date.now()}`,
      category: draftClip.category === "Manual" ? "Manual" : draftClip.category,
      reason: draftClip.reason || "Saved from timeline trim window",
    };

    setStreams((prev) =>
      prev.map((s) =>
        s.id === activeStream.id
          ? { ...s, highlights: [newClip, ...s.highlights] }
          : s
      )
    );
    setActiveHighlightId(newClip.id);
    setFeedback({
      type: "success",
      message: `Saved "${newClip.title}" (${formatTimecode(newClip.startSec)} – ${formatTimecode(
        newClip.endSec
      )}).`,
    });
  };

  const handleRewriteHook = async () => {
    setIsRewritingHook(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/clips/hook-rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draftClip.title,
          hookLine: draftClip.hookLine,
          reason: draftClip.reason,
          targetPlatform,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to rewrite hook.");
      }
      handleUpdateClipMeta({
        title: data.title || draftClip.title,
        hookLine: data.hookLine || draftClip.hookLine,
      });
      setFeedback({
        type: "success",
        message: `Updated hook for ${targetPlatform}.`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Could not rewrite hook.",
      });
    } finally {
      setIsRewritingHook(false);
    }
  };

  const handleExportClip = async (clipToExport: HighlightClip = draftClip) => {
    if (isExporting) return;
    setIsExporting(true);
    setExportProgress(5);
    setFeedback(null);

    const controller = new AbortController();
    exportAbortRef.current = controller;

    try {
      const result = await exportShortClipToWebm({
        stream: activeStream,
        clip: clipToExport,
        framingMode,
        captionStyle,
        showCaptions,
        onProgress: setExportProgress,
        signal: controller.signal,
      });

      const exported: ExportedClip = {
        id: `exp-${Date.now()}`,
        streamTitle: activeStream.title,
        platform: activeStream.platform,
        title: clipToExport.title,
        hookLine: clipToExport.hookLine,
        startSec: clipToExport.startSec,
        endSec: clipToExport.endSec,
        framingMode,
        targetPlatform,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        videoUrl: result.url,
        fileSizeBytes: result.blob.size,
        captions: clipToExport.captions,
        mimeType: result.mimeType,
      };

      setExports((prev) => [exported, ...prev]);
      setActiveTab("exports");
      setFeedback({
        type: "success",
        message: `Exported "${clipToExport.title}" (${(result.blob.size / (1024 * 1024)).toFixed(
          2
        )} MB WebM).`,
      });
    } catch (err) {
      if ((err as Error).message !== "Export cancelled.") {
        setFeedback({
          type: "error",
          message: err instanceof Error ? err.message : "Clip export failed.",
        });
      }
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      exportAbortRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D11] text-[#F3F5F8] flex flex-col lg:flex-row">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        streams={streams}
        activeStreamId={activeStream.id}
        onSelectStream={(id) => selectStream(id)}
        onOpenIngest={() => setIngestOpen(true)}
        totalHighlightsCount={activeStream.highlights.length}
        exportsCount={exports.length}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeTab={activeTab}
          activeStream={activeStream}
          isDetecting={isDetecting}
          isExporting={isExporting}
          onDetectHighlights={() => runHighlightDetection(activeStream)}
          onExportClip={() => handleExportClip(draftClip)}
        />

        <main className="flex-1 p-4 lg:p-6 max-w-[1400px] w-full mx-auto space-y-5">
          {/* Non-blocking status / error / export progress banner */}
          {isExporting && (
            <div className="rounded-xl bg-[#11141A] border border-white/[0.1] px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-100">
                    Rendering 9:16 WebM short clip...
                  </span>
                  <span className="font-mono tabular-nums text-zinc-300">{exportProgress}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full bg-[#F43F5E] transition-all duration-150"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => exportAbortRef.current?.abort()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#181C24] hover:bg-[#222834] border border-white/[0.1] text-zinc-200 whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
            </div>
          )}

          {feedback && (
            <div
              role="status"
              className={`rounded-xl px-4 py-3 border flex items-center justify-between gap-3 text-xs ${
                feedback.type === "error"
                  ? "bg-red-500/10 border-red-500/30 text-red-200"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
              }`}
            >
              <span className="flex items-center gap-2">
                {feedback.type === "error" ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                aria-label="Dismiss notification"
                className="p-1 rounded hover:bg-white/[0.08]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {activeTab === "studio" && (
            <div className="space-y-5">
              {/* Quick Stream URL Bar */}
              <form
                onSubmit={handleQuickUrlSubmit}
                className="bg-[#11141A] border border-white/[0.08] rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
              >
                <div className="relative flex-1">
                  <Link2 className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="url"
                    value={quickUrl}
                    onChange={(e) => setQuickUrl(e.target.value)}
                    placeholder="Paste a Twitch VOD, Twitch Clip, or YouTube stream URL to detect highlights..."
                    className="w-full pl-10 pr-3 py-2 rounded-lg bg-[#0B0D11] border border-white/[0.08] text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#F43F5E]"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    aria-label="Target short length"
                    value={targetDurationPref}
                    onChange={(e) =>
                      setTargetDurationPref(e.target.value as "20s" | "35s" | "55s")
                    }
                    className="px-3 py-2 rounded-lg bg-[#0B0D11] border border-white/[0.08] text-xs text-zinc-200 focus:outline-none focus:border-[#F43F5E]"
                  >
                    <option value="20s">Target ~20s</option>
                    <option value="35s">Target ~35s</option>
                    <option value="55s">Target ~55s</option>
                  </select>

                  <button
                    type="submit"
                    disabled={isInspectingQuickUrl || !quickUrl.trim()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#181C24] hover:bg-[#222834] border border-white/[0.12] text-zinc-100 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    {isInspectingQuickUrl ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F43F5E]" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-[#F43F5E]" />
                    )}
                    <span>{isInspectingQuickUrl ? "Inspecting..." : "Analyze URL"}</span>
                  </button>
                </div>
              </form>

              {/* Main 2-Column Studio Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                <div className="xl:col-span-8 space-y-5 min-w-0">
                  <SourceMonitor
                    stream={activeStream}
                    activeClip={draftClip}
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                    loopClip={loopClip}
                    isMuted={isMuted}
                    videoRef={videoRef}
                    onTogglePlay={handleTogglePlay}
                    onToggleLoop={() => setLoopClip((l) => !l)}
                    onToggleMute={() => setIsMuted((m) => !m)}
                    onTimeUpdate={setCurrentTime}
                    onOpenIngest={() => setIngestOpen(true)}
                  />

                  <TimelineEditor
                    stream={activeStream}
                    currentTime={currentTime}
                    startSec={draftClip.startSec}
                    endSec={draftClip.endSec}
                    activeHighlightId={activeHighlightId}
                    onSeek={seekTo}
                    onUpdateRange={handleUpdateRange}
                    onSelectHighlight={handleSelectHighlight}
                    onSaveManualClip={handleSaveManualClip}
                  />

                  {/* Detected Highlights Strip inside Studio */}
                  <section className="bg-[#11141A] border border-white/[0.08] rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between gap-4">
                      <div>
                        <h2 className="font-display text-sm font-semibold text-zinc-100">
                          Stream Highlights
                        </h2>
                        <p className="text-xs text-zinc-400">
                          Click any moment to load its trim handles and live captions.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("highlights")}
                        className="text-xs font-medium text-zinc-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
                      >
                        View All
                      </button>
                    </div>

                    {activeStream.highlights.length === 0 ? (
                      <div className="p-6 text-center space-y-2.5">
                        <p className="text-sm text-zinc-300">
                          No highlights detected for this stream yet.
                        </p>
                        <button
                          type="button"
                          onClick={() => runHighlightDetection(activeStream)}
                          disabled={isDetecting}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#F43F5E] hover:bg-[#E11D48] text-white transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Detect Highlights</span>
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/[0.06]">
                        {activeStream.highlights.map((hl) => {
                          const selected = hl.id === activeHighlightId;
                          return (
                            <button
                              key={hl.id}
                              type="button"
                              onClick={() => handleSelectHighlight(hl)}
                              className={`w-full text-left px-4 py-3 flex items-center justify-between gap-4 transition-colors ${
                                selected ? "bg-white/[0.05]" : "hover:bg-white/[0.025]"
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                  <span>{hl.category}</span>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono tabular-nums">
                                    {formatTimecode(hl.startSec)} – {formatTimecode(hl.endSec)}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono tabular-nums text-zinc-200">
                                    Score {hl.score}/100
                                  </span>
                                </div>
                                <p className="font-medium text-sm text-zinc-100 mt-0.5 truncate">
                                  {hl.title}
                                </p>
                              </div>

                              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#FB7185] shrink-0">
                                <Scissors className="w-3.5 h-3.5" />
                                <span>{selected ? "Active" : "Load"}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>

                {/* Right Column: 9:16 Vertical Short Preview & Packaging */}
                <div className="xl:col-span-4">
                  <VerticalPreview
                    stream={activeStream}
                    activeClip={draftClip}
                    currentTime={currentTime}
                    videoRef={videoRef}
                    framingMode={framingMode}
                    captionStyle={captionStyle}
                    showCaptions={showCaptions}
                    targetPlatform={targetPlatform}
                    isRewritingHook={isRewritingHook}
                    onChangeFraming={setFramingMode}
                    onChangeCaptionStyle={setCaptionStyle}
                    onToggleCaptions={() => setShowCaptions((c) => !c)}
                    onChangePlatform={setTargetPlatform}
                    onUpdateClipMeta={handleUpdateClipMeta}
                    onRewriteHook={handleRewriteHook}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "highlights" && (
            <HighlightsQueueView
              stream={activeStream}
              activeHighlightId={activeHighlightId}
              isDetecting={isDetecting}
              onSelectInStudio={(hl) => {
                handleSelectHighlight(hl);
                setActiveTab("studio");
              }}
              onExportClip={(hl) => {
                handleSelectHighlight(hl);
                void handleExportClip(hl);
              }}
              onDetectHighlights={() => runHighlightDetection(activeStream)}
            />
          )}

          {activeTab === "exports" && (
            <ExportQueueView
              exports={exports}
              onDeleteExport={(id) =>
                setExports((prev) => prev.filter((item) => item.id !== id))
              }
              onBackToStudio={() => setActiveTab("studio")}
            />
          )}
        </main>
      </div>

      <StreamIngestModal
        isOpen={ingestOpen}
        onClose={() => setIngestOpen(false)}
        onAddStream={handleAddStreamFromModal}
      />
    </div>
  );
}
