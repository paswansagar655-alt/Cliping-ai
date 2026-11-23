import { useEffect, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { Check, Loader2, RotateCcw, Save, X } from "lucide-react";
import { PlanTier, useFirebase, UserProfile } from "../context/FirebaseContext";
import { db, handleFirestoreError, OperationType } from "../firebase";

interface AdminUpgradeRequest {
  id: string;
  userId: string;
  userEmail: string;
  requestedPlan: "pro" | "agency";
  status: "pending" | "approved" | "rejected";
  note: string;
}

interface UsageLogEntry {
  id: string;
  userId: string;
  actionType: string;
  streamTitle: string;
  platform: string;
}

const TIER_LIMITS: Record<PlanTier, { scans: number; exports: number }> = {
  free: { scans: 5, exports: 5 },
  pro: { scans: 500, exports: 500 },
  agency: { scans: 2500, exports: 2500 },
};

export function AdminConsoleView() {
  const { isAdmin, monetizationConfig, firebaseUser } = useFirebase();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<AdminUpgradeRequest[]>([]);
  const [logs, setLogs] = useState<UsageLogEntry[]>([]);

  const [adsEnabled, setAdsEnabled] = useState(monetizationConfig.adsEnabled);
  const [adsenseClientId, setAdsenseClientId] = useState(monetizationConfig.adsenseClientId);
  const [adsenseSlotId, setAdsenseSlotId] = useState(monetizationConfig.adsenseSlotId);
  const [proPrice, setProPrice] = useState(monetizationConfig.proMonthlyPrice);
  const [agencyPrice, setAgencyPrice] = useState(monetizationConfig.agencyMonthlyPrice);
  const [freeScans, setFreeScans] = useState(monetizationConfig.freeMonthlyScanLimit);
  const [freeExports, setFreeExports] = useState(monetizationConfig.freeMonthlyExportLimit);

  const [savingConfig, setSavingConfig] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setAdsEnabled(monetizationConfig.adsEnabled);
    setAdsenseClientId(monetizationConfig.adsenseClientId);
    setAdsenseSlotId(monetizationConfig.adsenseSlotId);
    setProPrice(monetizationConfig.proMonthlyPrice);
    setAgencyPrice(monetizationConfig.agencyMonthlyPrice);
    setFreeScans(monetizationConfig.freeMonthlyScanLimit);
    setFreeExports(monetizationConfig.freeMonthlyExportLimit);
  }, [monetizationConfig]);

  useEffect(() => {
    if (!isAdmin || !firebaseUser) return;

    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        setUsers(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              uid: String(data.uid),
              email: String(data.email),
              displayName: String(data.displayName),
              planTier: (data.planTier as PlanTier) || "free",
              scansUsed: Number(data.scansUsed) || 0,
              exportsUsed: Number(data.exportsUsed) || 0,
              monthlyScanLimit: Number(data.monthlyScanLimit) || 5,
              monthlyExportLimit: Number(data.monthlyExportLimit) || 5,
            };
          })
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, "users")
    );

    const unsubRequests = onSnapshot(
      query(collection(db, "upgradeRequests"), orderBy("createdAt", "desc"), limit(30)),
      (snap) => {
        setRequests(
          snap.docs.map((d) => ({
            id: d.id,
            userId: String(d.data().userId),
            userEmail: String(d.data().userEmail),
            requestedPlan: d.data().requestedPlan as "pro" | "agency",
            status: d.data().status as "pending" | "approved" | "rejected",
            note: String(d.data().note || ""),
          }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, "upgradeRequests")
    );

    const unsubLogs = onSnapshot(
      query(collection(db, "usageLogs"), orderBy("createdAt", "desc"), limit(20)),
      (snap) => {
        setLogs(
          snap.docs.map((d) => ({
            id: d.id,
            userId: String(d.data().userId),
            actionType: String(d.data().actionType),
            streamTitle: String(d.data().streamTitle),
            platform: String(d.data().platform),
          }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, "usageLogs")
    );

    return () => {
      unsubUsers();
      unsubRequests();
      unsubLogs();
    };
  }, [firebaseUser, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="bg-[#11141A] border border-white/[0.08] rounded-xl p-8 text-center space-y-2">
        <h1 className="font-display text-lg font-semibold text-zinc-100">Admin Access Required</h1>
        <p className="text-sm text-zinc-400">
          Sign in with the administrator Google account (`paswansagar655@gmail.com`) to access this console.
        </p>
      </div>
    );
  }

  const handleSaveMonetization = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setFeedback(null);
    const path = "appConfig/monetization";
    try {
      await setDoc(doc(db, "appConfig", "monetization"), {
        adsEnabled,
        adsenseClientId: adsenseClientId.trim().slice(0, 64),
        adsenseSlotId: adsenseSlotId.trim().slice(0, 64),
        proMonthlyPrice: Math.max(1, Math.min(10000, Math.round(Number(proPrice) || 19))),
        agencyMonthlyPrice: Math.max(1, Math.min(50000, Math.round(Number(agencyPrice) || 79))),
        freeMonthlyScanLimit: Math.max(1, Math.min(25, Math.round(Number(freeScans) || 5))),
        freeMonthlyExportLimit: Math.max(1, Math.min(25, Math.round(Number(freeExports) || 5))),
        updatedAt: serverTimestamp(),
      });
      setFeedback("Saved Google AdSense & plan monetization settings.");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleUpdateUserTier = async (userId: string, nextTier: PlanTier) => {
    setBusyId(userId);
    setFeedback(null);
    const limits =
      nextTier === "free"
        ? { scans: freeScans, exports: freeExports }
        : TIER_LIMITS[nextTier];
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, "users", userId), {
        planTier: nextTier,
        monthlyScanLimit: limits.scans,
        monthlyExportLimit: limits.exports,
        updatedAt: serverTimestamp(),
      });
      setFeedback(`Updated plan tier to ${nextTier.toUpperCase()}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } finally {
      setBusyId(null);
    }
  };

  const handleResetQuota = async (userId: string) => {
    setBusyId(userId);
    setFeedback(null);
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, "users", userId), {
        scansUsed: 0,
        exportsUsed: 0,
        updatedAt: serverTimestamp(),
      });
      setFeedback("Reset user monthly usage counters to 0.");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } finally {
      setBusyId(null);
    }
  };

  const handleResolveUpgrade = async (req: AdminUpgradeRequest, approve: boolean) => {
    setBusyId(req.id);
    setFeedback(null);
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "upgradeRequests", req.id), {
        status: approve ? "approved" : "rejected",
        updatedAt: serverTimestamp(),
      });
      if (approve) {
        const limits = TIER_LIMITS[req.requestedPlan];
        batch.update(doc(db, "users", req.userId), {
          planTier: req.requestedPlan,
          monthlyScanLimit: limits.scans,
          monthlyExportLimit: limits.exports,
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      setFeedback(
        approve
          ? `Approved ${req.userEmail} for ${req.requestedPlan.toUpperCase()}.`
          : `Declined upgrade request for ${req.userEmail}.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `upgradeRequests/${req.id}`);
    } finally {
      setBusyId(null);
    }
  };

  const paidCount = users.filter((u) => u.planTier !== "free").length;
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const totalScans = users.reduce((acc, u) => acc + u.scansUsed, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-zinc-100">Admin Console</h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          Signed in as {firebaseUser?.email} · Manage Google AdSense units, pricing, and user quotas.
        </p>
      </div>

      {feedback && (
        <div className="rounded-xl bg-[#11141A] border border-emerald-500/30 px-4 py-3 text-xs text-emerald-200">
          {feedback}
        </div>
      )}

      {/* 4-Column Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#11141A] border border-white/[0.08] rounded-xl p-4">
          <p className="text-xs text-zinc-400">Registered Users</p>
          <p className="font-display text-2xl font-bold text-zinc-100 tabular-nums mt-1">
            {users.length}
          </p>
        </div>
        <div className="bg-[#11141A] border border-white/[0.08] rounded-xl p-4">
          <p className="text-xs text-zinc-400">Pro / Agency Accounts</p>
          <p className="font-display text-2xl font-bold text-zinc-100 tabular-nums mt-1">
            {paidCount}
          </p>
        </div>
        <div className="bg-[#11141A] border border-white/[0.08] rounded-xl p-4">
          <p className="text-xs text-zinc-400">Pending Upgrades</p>
          <p className="font-display text-2xl font-bold text-amber-400 tabular-nums mt-1">
            {pendingCount}
          </p>
        </div>
        <div className="bg-[#11141A] border border-white/[0.08] rounded-xl p-4">
          <p className="text-xs text-zinc-400">Total AI Scans</p>
          <p className="font-display text-2xl font-bold text-zinc-100 tabular-nums mt-1">
            {totalScans}
          </p>
        </div>
      </div>

      {/* Google AdSense & Pricing Configuration */}
      <form
        onSubmit={handleSaveMonetization}
        className="bg-[#11141A] border border-white/[0.08] rounded-xl p-5 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div>
            <h2 className="font-display text-base font-semibold text-zinc-100">
              Google AdSense &amp; Plan Monetization
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Ad slots render only for Free-tier users when enabled and never appear for Pro/Agency accounts.
            </p>
          </div>
          <label className="flex items-center gap-2.5 text-xs font-medium text-zinc-100 cursor-pointer">
            <input
              type="checkbox"
              checked={adsEnabled}
              onChange={(e) => setAdsEnabled(e.target.checked)}
              className="rounded accent-[#F43F5E]"
            />
            <span>Enable AdSense Banner Slots</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="space-y-1.5 block">
            <span className="text-xs text-zinc-400 block">AdSense Publisher ID</span>
            <input
              type="text"
              placeholder="ca-pub-1234567890123456"
              value={adsenseClientId}
              onChange={(e) => setAdsenseClientId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0B0D11] border border-white/[0.1] text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#F43F5E]"
            />
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs text-zinc-400 block">AdSense Ad Slot ID</span>
            <input
              type="text"
              placeholder="9876543210"
              value={adsenseSlotId}
              onChange={(e) => setAdsenseSlotId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0B0D11] border border-white/[0.1] text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#F43F5E]"
            />
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs text-zinc-400 block">Creator Pro Price ($/mo)</span>
            <input
              type="number"
              min={1}
              max={10000}
              value={proPrice}
              onChange={(e) => setProPrice(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-[#0B0D11] border border-white/[0.1] text-xs font-mono tabular-nums text-zinc-100 focus:outline-none focus:border-[#F43F5E]"
            />
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs text-zinc-400 block">Studio Team Price ($/mo)</span>
            <input
              type="number"
              min={1}
              max={50000}
              value={agencyPrice}
              onChange={(e) => setAgencyPrice(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-[#0B0D11] border border-white/[0.1] text-xs font-mono tabular-nums text-zinc-100 focus:outline-none focus:border-[#F43F5E]"
            />
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs text-zinc-400 block">Free Tier Monthly Scans</span>
            <input
              type="number"
              min={1}
              max={25}
              value={freeScans}
              onChange={(e) => setFreeScans(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-[#0B0D11] border border-white/[0.1] text-xs font-mono tabular-nums text-zinc-100 focus:outline-none focus:border-[#F43F5E]"
            />
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs text-zinc-400 block">Free Tier Monthly Exports</span>
            <input
              type="number"
              min={1}
              max={25}
              value={freeExports}
              onChange={(e) => setFreeExports(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-[#0B0D11] border border-white/[0.1] text-xs font-mono tabular-nums text-zinc-100 focus:outline-none focus:border-[#F43F5E]"
            />
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingConfig}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#F43F5E] hover:bg-[#E11D48] text-white disabled:opacity-60 transition-colors"
          >
            {savingConfig ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Monetization Settings</span>
          </button>
        </div>
      </form>

      {/* Upgrade Requests Queue */}
      <section className="bg-[#11141A] border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.08]">
          <h2 className="font-display text-sm font-semibold text-zinc-100">
            Plan Upgrade Requests
          </h2>
        </div>
        {requests.length === 0 ? (
          <p className="p-6 text-xs text-zinc-400 text-center">No upgrade requests yet.</p>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {requests.map((req) => (
              <div
                key={req.id}
                className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div>
                  <p className="font-medium text-zinc-100">
                    {req.userEmail} · <span className="uppercase">{req.requestedPlan}</span>
                  </p>
                  <p className="text-zinc-400 mt-0.5">{req.note || "No note attached"}</p>
                </div>

                {req.status === "pending" ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busyId === req.id}
                      onClick={() => handleResolveUpgrade(req, true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      disabled={busyId === req.id}
                      onClick={() => handleResolveUpgrade(req, false)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#181C24] hover:bg-[#222834] border border-white/[0.1] text-zinc-300"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                  </div>
                ) : (
                  <span
                    className={`font-medium capitalize ${
                      req.status === "approved" ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {req.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Users & Quotas Table */}
      <section className="bg-[#11141A] border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.08]">
          <h2 className="font-display text-sm font-semibold text-zinc-100">
            Users &amp; Monthly Quotas
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-zinc-400 bg-[#0E1116]">
                <th className="py-3 px-4">Creator</th>
                <th className="py-3 px-4">Plan Tier</th>
                <th className="py-3 px-4 text-right">AI Scans</th>
                <th className="py-3 px-4 text-right">Exports</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {users.map((u) => (
                <tr key={u.uid} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-4">
                    <p className="font-medium text-zinc-100">{u.displayName}</p>
                    <p className="text-zinc-400">{u.email}</p>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      aria-label={`Plan tier for ${u.email}`}
                      value={u.planTier}
                      disabled={busyId === u.uid}
                      onChange={(e) => handleUpdateUserTier(u.uid, e.target.value as PlanTier)}
                      className="px-2.5 py-1.5 rounded-md bg-[#0B0D11] border border-white/[0.1] text-xs text-zinc-100"
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="agency">Agency</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-zinc-200">
                    {u.scansUsed} / {u.monthlyScanLimit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-zinc-200">
                    {u.exportsUsed} / {u.monthlyExportLimit}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      disabled={busyId === u.uid}
                      onClick={() => handleResetQuota(u.uid)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#181C24] hover:bg-[#222834] border border-white/[0.1] text-zinc-200"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Usage</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Usage Audit Logs */}
      {logs.length > 0 && (
        <section className="bg-[#11141A] border border-white/[0.08] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.08]">
            <h2 className="font-display text-sm font-semibold text-zinc-100">
              Recent Activity Log
            </h2>
          </div>
          <div className="divide-y divide-white/[0.06] text-xs">
            {logs.map((entry) => (
              <div key={entry.id} className="px-4 py-2.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <span className="font-medium text-zinc-200">{entry.actionType}</span>
                  <span className="text-zinc-500 mx-2">·</span>
                  <span className="text-zinc-300 truncate">{entry.streamTitle}</span>
                </div>
                <span className="text-zinc-400 capitalize shrink-0">{entry.platform}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
