import { X } from "lucide-react";

export type PolicyTopic = "privacy" | "terms" | "guide";

interface PolicyModalProps {
  topic: PolicyTopic | null;
  onClose: () => void;
}

export function PolicyModal({ topic, onClose }: PolicyModalProps) {
  if (!topic) return null;

  const titles: Record<PolicyTopic, string> = {
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    guide: "How ClipDeck Works",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="policy-modal-title"
    >
      <div className="w-full max-w-xl rounded-xl bg-[#11141A] border border-white/[0.12] p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-3">
          <h2 id="policy-modal-title" className="font-display text-base font-semibold text-zinc-100">
            {titles[topic]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {topic === "privacy" && (
          <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
            <p>
              ClipDeck stores only the account profile information required to authenticate your session (email address, display name, subscription tier, and monthly scan/export counts).
            </p>
            <p>
              Uploaded video recordings are decoded and rendered locally inside your browser using the Web Audio API and HTML5 Canvas; your raw video files are never uploaded to external storage servers.
            </p>
            <p>
              When Google AdSense is enabled on free-tier workspaces, Google may use cookies to serve relevant display ads in accordance with Google advertising policies.
            </p>
          </div>
        )}

        {topic === "terms" && (
          <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
            <p>
              You are responsible for ensuring you own or have permission to clip, reframe, and republish streams from Twitch or YouTube.
            </p>
            <p>
              Free-tier usage quotas reset monthly and are enforced per authenticated account. Paid Creator Pro and Studio Team tiers increase monthly AI highlight scan and WebM export limits.
            </p>
          </div>
        )}

        {topic === "guide" && (
          <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
            <p>
              <strong className="text-white">1. Import a Stream:</strong> Paste a Twitch VOD, Twitch Clip, or YouTube stream URL, or upload an MP4/WebM recording from your device.
            </p>
            <p>
              <strong className="text-white">2. Detect Highlights:</strong> ClipDeck combines audio energy peaks, chat velocity spikes, and stream context to pinpoint 15–60 second vertical moments.
            </p>
            <p>
              <strong className="text-white">3. Reframe &amp; Export:</strong> Choose Center Crop, Facecam Split, or Blur Fit in 9:16, polish the opening hook, and export a ready-to-upload WebM video plus SRT captions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
