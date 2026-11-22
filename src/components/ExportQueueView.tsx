import { Download, FileText, Trash2 } from "lucide-react";
import { ExportedClip } from "../types/clip";
import { formatFileSize, formatTimecode, generateSrtContent } from "../utils/videoEngine";

interface ExportQueueViewProps {
  exports: ExportedClip[];
  onDeleteExport: (id: string) => void;
  onBackToStudio: () => void;
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function downloadText(content: string, filename: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportQueueView({
  exports,
  onDeleteExport,
  onBackToStudio,
}: ExportQueueViewProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-zinc-100">
            Export Queue
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Rendered 9:16 vertical short clips and timed SRT caption tracks ready to publish.
          </p>
        </div>
      </div>

      {exports.length === 0 ? (
        <div className="bg-[#11141A] border border-white/[0.08] rounded-xl p-10 text-center space-y-3">
          <h2 className="font-display text-base font-semibold text-zinc-100">
            No exported shorts yet
          </h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Trim any highlight in Clip Studio and click Export Short to render a 9:16 WebM clip with burned-in captions.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={onBackToStudio}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-[#F43F5E] hover:bg-[#E11D48] text-white transition-colors"
            >
              Return to Clip Studio
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {exports.map((item) => {
            const safeSlug = item.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "") || "clipdeck-short";

            return (
              <article
                key={item.id}
                className="bg-[#11141A] border border-white/[0.08] rounded-xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[9/16] max-h-[340px] w-full bg-[#08090C] flex items-center justify-center border-b border-white/[0.08]">
                    {item.videoUrl ? (
                      <video
                        src={item.videoUrl}
                        controls
                        playsInline
                        loop
                        className="h-full w-auto object-contain"
                      />
                    ) : (
                      <span className="text-xs text-zinc-500">Preview unavailable</span>
                    )}
                  </div>

                  <div className="p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span>{item.targetPlatform}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {formatTimecode(item.startSec)} – {formatTimecode(item.endSec)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {formatFileSize(item.fileSizeBytes)}
                      </span>
                    </div>
                    <h3 className="font-display text-sm font-semibold text-zinc-100">
                      {item.title}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-2">{item.hookLine}</p>
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-white/[0.08] bg-[#0D1015] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.videoUrl && (
                      <button
                        type="button"
                        onClick={() => triggerDownload(item.videoUrl!, `${safeSlug}.webm`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F43F5E] hover:bg-[#E11D48] text-white transition-colors whitespace-nowrap shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download WebM</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        downloadText(
                          generateSrtContent({
                            id: item.id,
                            title: item.title,
                            startSec: item.startSec,
                            endSec: item.endSec,
                            category: "Manual",
                            score: 90,
                            hookLine: item.hookLine,
                            reason: "",
                            captions: item.captions,
                          }),
                          `${safeSlug}.srt`
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#181C24] hover:bg-[#222834] border border-white/[0.1] text-zinc-200 transition-colors whitespace-nowrap shrink-0"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>SRT</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteExport(item.id)}
                    aria-label="Remove exported clip"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-white/[0.05] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
