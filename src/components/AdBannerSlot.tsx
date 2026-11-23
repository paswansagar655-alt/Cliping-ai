import { useEffect, useRef } from "react";
import { useFirebase } from "../context/FirebaseContext";

interface AdBannerSlotProps {
  onOpenPricing: () => void;
}

export function AdBannerSlot({ onOpenPricing }: AdBannerSlotProps) {
  const { monetizationConfig, userProfile, isAdmin } = useFirebase();
  const pushedRef = useRef(false);

  const isPaid = userProfile?.planTier === "pro" || userProfile?.planTier === "agency";
  const shouldRender = monetizationConfig.adsEnabled && !isPaid && !isAdmin;

  const clientId = monetizationConfig.adsenseClientId.trim();
  const slotId = monetizationConfig.adsenseSlotId.trim();
  const hasLiveIds = /^ca-pub-\d{8,}$/.test(clientId) && /^\d{6,}$/.test(slotId);

  useEffect(() => {
    if (!shouldRender || !hasLiveIds) return;

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[data-adsense-client="${clientId}"]`
    );
    if (!existingScript) {
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.adsenseClient = clientId;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
        clientId
      )}`;
      document.head.appendChild(script);
    }

    if (!pushedRef.current) {
      try {
        const win = window as unknown as { adsbygoogle?: unknown[] };
        win.adsbygoogle = win.adsbygoogle || [];
        win.adsbygoogle.push({});
        pushedRef.current = true;
      } catch {
        // Ignore blocked ad scripts in local/ad-blocker environments
      }
    }
  }, [clientId, hasLiveIds, shouldRender]);

  if (!shouldRender) return null;

  return (
    <aside
      aria-label="Sponsored placement"
      className="bg-[#11141A] border border-white/[0.08] rounded-xl px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3"
    >
      {hasLiveIds ? (
        <div className="w-full overflow-hidden">
          <ins
            className="adsbygoogle block"
            style={{ display: "block", minHeight: "60px" }}
            data-ad-client={clientId}
            data-ad-slot={slotId}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 w-full text-xs">
          <span className="text-zinc-400">
            Ad Placement Active · Add your verified AdSense Publisher &amp; Slot IDs in Admin Console once connected to a custom domain.
          </span>
          <button
            type="button"
            onClick={onOpenPricing}
            className="font-medium text-[#FB7185] hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Remove Ads with Pro
          </button>
        </div>
      )}
    </aside>
  );
}
