import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Check, Loader2 } from "lucide-react";
import { PlanTier, useFirebase } from "../context/FirebaseContext";
import { db, handleFirestoreError, OperationType } from "../firebase";

interface UserUpgradeRequest {
  id: string;
  requestedPlan: "pro" | "agency";
  status: "pending" | "approved" | "rejected";
  note: string;
  createdAtMs: number;
}

export function PricingView() {
  const {
    firebaseUser,
    userProfile,
    monetizationConfig,
    signInWithGoogle,
    submitUpgradeRequest,
  } = useFirebase();

  const [selectedPlan, setSelectedPlan] = useState<"pro" | "agency" | null>(null);
  const [channelNote, setChannelNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [requests, setRequests] = useState<UserUpgradeRequest[]>([]);

  useEffect(() => {
    if (!firebaseUser) {
      setRequests([]);
      return;
    }
    const q = query(
      collection(db, "upgradeRequests"),
      where("userId", "==", firebaseUser.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => {
          const data = d.data();
          const ts = data.createdAt as { toMillis?: () => number } | undefined;
          return {
            id: d.id,
            requestedPlan: data.requestedPlan as "pro" | "agency",
            status: data.status as "pending" | "approved" | "rejected",
            note: String(data.note || ""),
            createdAtMs: ts?.toMillis ? ts.toMillis() : 0,
          };
        });
        items.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setRequests(items);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, "upgradeRequests");
      }
    );
    return () => unsub();
  }, [firebaseUser]);

  const activeTier: PlanTier = userProfile?.planTier ?? "free";

  const handleRequestUpgrade = async (plan: "pro" | "agency") => {
    setStatusMsg(null);
    if (!firebaseUser) {
      const signed = await signInWithGoogle();
      if (!signed) return;
    }
    setSelectedPlan(plan);
  };

  const confirmUpgradeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setSubmitting(true);
    setStatusMsg(null);
    try {
      await submitUpgradeRequest(selectedPlan, channelNote);
      setStatusMsg(
        `Upgrade request for ${selectedPlan.toUpperCase()} submitted. An admin can now approve your account in the Admin Console.`
      );
      setChannelNote("");
      setSelectedPlan(null);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Could not submit upgrade request.");
    } finally {
      setSubmitting(false);
    }
  };

  const plans = [
    {
      id: "free" as const,
      audience: "For Casual Streamers",
      name: "Starter Free",
      price: "$0",
      cadence: "forever",
      summary: "Test AI highlight detection and export vertical clips from short streams.",
      limits: [
        `${monetizationConfig.freeMonthlyScanLimit} AI highlight scans / month`,
        `${monetizationConfig.freeMonthlyExportLimit} WebM short exports / month`,
        "9:16 Center, Cam Split & Blur Fit",
        "SRT caption export included",
        monetizationConfig.adsEnabled ? "Supported by display ads" : "Standard studio access",
      ],
    },
    {
      id: "pro" as const,
      audience: "For Active Creators",
      name: "Creator Pro",
      price: `$${monetizationConfig.proMonthlyPrice}`,
      cadence: "/ month",
      summary: "Built for daily Twitch and YouTube creators turning VODs into Shorts & Reels.",
      limits: [
        "500 AI highlight scans / month",
        "500 clean 9:16 WebM exports / month",
        "Ad-free workspace experience",
        "Unlimited Gemini hook rewrites",
        "Priority highlight batch queue",
      ],
    },
    {
      id: "agency" as const,
      audience: "For Esports & Agencies",
      name: "Studio Team",
      price: `$${monetizationConfig.agencyMonthlyPrice}`,
      cadence: "/ month",
      summary: "High-volume clipping for editors managing multiple creator channels.",
      limits: [
        "2,500 AI highlight scans / month",
        "2,500 clean 9:16 WebM exports / month",
        "Ad-free workspace experience",
        "Multi-channel VOD workflows",
        "Dedicated quota management",
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-zinc-100">
            Pricing &amp; Creator Plans
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Scale from free stream clipping to high-volume creator and agency quotas.
          </p>
        </div>

        {userProfile && (
          <div className="text-xs text-zinc-300 font-mono tabular-nums bg-[#11141A] border border-white/[0.08] rounded-lg px-3.5 py-2">
            Active: <span className="uppercase text-white font-semibold">{activeTier}</span> · Scans{" "}
            {userProfile.scansUsed}/{userProfile.monthlyScanLimit} · Exports{" "}
            {userProfile.exportsUsed}/{userProfile.monthlyExportLimit}
          </div>
        )}
      </div>

      {statusMsg && (
        <div className="rounded-xl bg-[#11141A] border border-white/[0.12] px-4 py-3 text-xs text-zinc-200">
          {statusMsg}
        </div>
      )}

      {/* 3-Column Comparison Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {plans.map((plan) => {
          const isCurrent = activeTier === plan.id && !!firebaseUser;
          const isFeatured = plan.id === "pro";

          return (
            <section
              key={plan.id}
              className={`rounded-xl p-6 flex flex-col justify-between border ${
                isFeatured
                  ? "bg-[#151922] border-[#F43F5E]/45"
                  : "bg-[#11141A] border-white/[0.08]"
              }`}
            >
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-zinc-400">{plan.audience}</p>
                  <h2 className="font-display text-lg font-semibold text-zinc-100 mt-0.5">
                    {plan.name}
                  </h2>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-3xl font-bold text-white tabular-nums">
                    {plan.price}
                  </span>
                  <span className="text-xs text-zinc-400">{plan.cadence}</span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">{plan.summary}</p>

                <ul className="space-y-2.5 pt-3 border-t border-white/[0.08]">
                  {plan.limits.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-zinc-200">
                      <Check className="w-3.5 h-3.5 text-[#F43F5E] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6">
                {plan.id === "free" ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 px-4 rounded-lg text-xs font-medium bg-[#181C24] border border-white/[0.08] text-zinc-400"
                  >
                    {isCurrent ? "Current Plan" : "Included by Default"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isCurrent}
                    onClick={() => handleRequestUpgrade(plan.id)}
                    className={`w-full py-2.5 px-4 rounded-lg text-xs font-medium transition-colors ${
                      isCurrent
                        ? "bg-[#181C24] border border-white/[0.08] text-zinc-400"
                        : isFeatured
                        ? "bg-[#F43F5E] hover:bg-[#E11D48] text-white"
                        : "bg-[#181C24] hover:bg-[#222834] border border-white/[0.12] text-zinc-100"
                    }`}
                  >
                    {isCurrent ? "Current Active Plan" : `Upgrade to ${plan.name}`}
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Upgrade Request Confirmation Form */}
      {selectedPlan && (
        <form
          onSubmit={confirmUpgradeRequest}
          className="bg-[#11141A] border border-white/[0.12] rounded-xl p-5 space-y-4 max-w-xl"
        >
          <div>
            <h3 className="font-display text-sm font-semibold text-zinc-100">
              Request {selectedPlan === "pro" ? "Creator Pro" : "Studio Team"} Activation
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Submit your Twitch/YouTube channel handle or billing note. The admin can approve your tier immediately.
            </p>
          </div>
          <input
            type="text"
            maxLength={280}
            value={channelNote}
            onChange={(e) => setChannelNote(e.target.value)}
            placeholder="e.g. twitch.tv/mychannel — Monthly Creator Pro request"
            className="w-full px-3.5 py-2 rounded-lg bg-[#0B0D11] border border-white/[0.1] text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#F43F5E]"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#F43F5E] hover:bg-[#E11D48] text-white disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Submit Upgrade Request</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlan(null)}
              className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* User's Upgrade Request History */}
      {requests.length > 0 && (
        <section className="bg-[#11141A] border border-white/[0.08] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.08]">
            <h3 className="font-display text-sm font-semibold text-zinc-100">
              Your Plan Upgrade Requests
            </h3>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {requests.map((req) => (
              <div
                key={req.id}
                className="px-4 py-3 flex items-center justify-between gap-4 text-xs"
              >
                <div>
                  <span className="font-medium text-zinc-100 uppercase">
                    {req.requestedPlan}
                  </span>
                  {req.note && <span className="text-zinc-400 ml-2">· {req.note}</span>}
                </div>
                <span
                  className={`font-medium capitalize ${
                    req.status === "approved"
                      ? "text-emerald-400"
                      : req.status === "rejected"
                      ? "text-red-400"
                      : "text-amber-400"
                  }`}
                >
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
