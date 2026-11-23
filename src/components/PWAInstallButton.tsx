import { useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";

interface PWAInstallButtonProps {
  compact?: boolean;
}

export function PWAInstallButton({ compact = false }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={
          compact
            ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F43F5E] hover:bg-[#E11D48] text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0"
            : "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#F43F5E] hover:bg-[#E11D48] text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0"
        }
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={
            compact
              ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181C24] hover:bg-[#222834] border border-white/[0.12] text-xs font-medium text-zinc-100 transition-colors whitespace-nowrap shrink-0"
              : "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#181C24] hover:bg-[#222834] border border-white/[0.12] text-xs font-medium text-zinc-100 transition-colors whitespace-nowrap shrink-0"
          }
        >
          <Smartphone className="w-3.5 h-3.5 text-[#F43F5E]" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-xl bg-[#11141A] border border-white/[0.12] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 id="ios-install-title" className="font-display text-base font-semibold text-zinc-100">
                  Install ClipDeck on iOS
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close instructions"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="space-y-2 text-xs text-zinc-300 leading-relaxed list-decimal list-inside">
                <li>
                  Tap the <strong className="text-white">Share</strong> button in the Safari toolbar.
                </li>
                <li>
                  Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong className="text-white">Add</strong> to launch ClipDeck full-screen.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 rounded-lg bg-[#181C24] hover:bg-[#222834] border border-white/[0.1] text-xs font-medium text-zinc-100 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
