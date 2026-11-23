import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db, googleProvider, handleFirestoreError, OperationType } from "../firebase";
import { StreamPlatform } from "../types/clip";

export const BOOTSTRAPPED_ADMIN_EMAIL = "paswansagar655@gmail.com";

export type PlanTier = "free" | "pro" | "agency";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  planTier: PlanTier;
  scansUsed: number;
  exportsUsed: number;
  monthlyScanLimit: number;
  monthlyExportLimit: number;
}

export interface MonetizationConfig {
  adsEnabled: boolean;
  adsenseClientId: string;
  adsenseSlotId: string;
  proMonthlyPrice: number;
  agencyMonthlyPrice: number;
  freeMonthlyScanLimit: number;
  freeMonthlyExportLimit: number;
}

export const DEFAULT_MONETIZATION_CONFIG: MonetizationConfig = {
  adsEnabled: false,
  adsenseClientId: "",
  adsenseSlotId: "",
  proMonthlyPrice: 19,
  agencyMonthlyPrice: 79,
  freeMonthlyScanLimit: 5,
  freeMonthlyExportLimit: 5,
};

interface FirebaseContextValue {
  authReady: boolean;
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  monetizationConfig: MonetizationConfig;
  authError: string | null;
  signInWithGoogle: () => Promise<User | null>;
  signOutUser: () => Promise<void>;
  canPerformAction: (action: "scan" | "export") => { allowed: boolean; reason?: string };
  recordUsage: (
    actionType: "highlight_scan" | "hook_rewrite" | "short_export",
    streamTitle: string,
    platform: StreamPlatform
  ) => Promise<void>;
  submitUpgradeRequest: (requestedPlan: "pro" | "agency", note: string) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdminDoc, setIsAdminDoc] = useState(false);
  const [monetizationConfig, setMonetizationConfig] = useState<MonetizationConfig>(
    DEFAULT_MONETIZATION_CONFIG
  );
  const [authError, setAuthError] = useState<string | null>(null);

  // Load global monetization config
  useEffect(() => {
    const configRef = doc(db, "appConfig", "monetization");
    const unsub = onSnapshot(
      configRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setMonetizationConfig({
            adsEnabled: Boolean(data.adsEnabled),
            adsenseClientId: String(data.adsenseClientId || ""),
            adsenseSlotId: String(data.adsenseSlotId || ""),
            proMonthlyPrice: Number(data.proMonthlyPrice) || 19,
            agencyMonthlyPrice: Number(data.agencyMonthlyPrice) || 79,
            freeMonthlyScanLimit: Number(data.freeMonthlyScanLimit) || 5,
            freeMonthlyExportLimit: Number(data.freeMonthlyExportLimit) || 5,
          });
        }
      },
      () => {
        // Default monetization config applies if not yet seeded
      }
    );
    return () => unsub();
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (!user) {
        setUserProfile(null);
        setIsAdminDoc(false);
      }
    });
    return () => unsub();
  }, []);

  // Ensure user profile & subscribe when signed in
  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    const userPath = `users/${firebaseUser.uid}`;
    const userRef = doc(db, "users", firebaseUser.uid);
    let cancelled = false;

    const ensureProfile = async () => {
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists() && !cancelled) {
          const isBootAdmin =
            firebaseUser.email === BOOTSTRAPPED_ADMIN_EMAIL && firebaseUser.emailVerified;
          const initialScanLimit = isBootAdmin
            ? 10000
            : Math.min(25, Math.max(1, monetizationConfig.freeMonthlyScanLimit));
          const initialExportLimit = isBootAdmin
            ? 10000
            : Math.min(25, Math.max(1, monetizationConfig.freeMonthlyExportLimit));

          await setDoc(userRef, {
            uid: firebaseUser.uid,
            email: (firebaseUser.email || "creator@clipdeck.app").slice(0, 160),
            displayName: (firebaseUser.displayName || "Creator").slice(0, 100),
            planTier: isBootAdmin ? "agency" : "free",
            scansUsed: 0,
            exportsUsed: 0,
            monthlyScanLimit: initialScanLimit,
            monthlyExportLimit: initialExportLimit,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        // Seed default monetization config on first admin sign-in if missing
        if (firebaseUser.email === BOOTSTRAPPED_ADMIN_EMAIL && firebaseUser.emailVerified) {
          const cfgRef = doc(db, "appConfig", "monetization");
          const cfgSnap = await getDoc(cfgRef);
          if (!cfgSnap.exists()) {
            await setDoc(cfgRef, {
              ...DEFAULT_MONETIZATION_CONFIG,
              updatedAt: serverTimestamp(),
            });
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, userPath);
      }
    };

    void ensureProfile();

    const unsubProfile = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setUserProfile({
            uid: String(d.uid),
            email: String(d.email),
            displayName: String(d.displayName),
            planTier: (d.planTier as PlanTier) || "free",
            scansUsed: Number(d.scansUsed) || 0,
            exportsUsed: Number(d.exportsUsed) || 0,
            monthlyScanLimit: Number(d.monthlyScanLimit) || 5,
            monthlyExportLimit: Number(d.monthlyExportLimit) || 5,
          });
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, userPath);
      }
    );

    const adminRef = doc(db, "admins", firebaseUser.uid);
    const unsubAdmin = onSnapshot(
      adminRef,
      (snap) => {
        setIsAdminDoc(snap.exists());
      },
      () => {
        setIsAdminDoc(false);
      }
    );

    return () => {
      cancelled = true;
      unsubProfile();
      unsubAdmin();
    };
  }, [
    authReady,
    firebaseUser,
    monetizationConfig.freeMonthlyExportLimit,
    monetizationConfig.freeMonthlyScanLimit,
  ]);

  const isAdmin = Boolean(
    firebaseUser?.emailVerified &&
      (firebaseUser.email === BOOTSTRAPPED_ADMIN_EMAIL || isAdminDoc)
  );

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      return cred.user;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google Sign-In failed.";
      setAuthError(msg);
      return null;
    }
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, []);

  const canPerformAction = useCallback(
    (action: "scan" | "export") => {
      if (isAdmin) return { allowed: true };
      if (!firebaseUser || !userProfile) {
        return { allowed: true };
      }
      if (action === "scan" && userProfile.scansUsed >= userProfile.monthlyScanLimit) {
        return {
          allowed: false,
          reason: `Monthly AI scan limit reached (${userProfile.scansUsed}/${userProfile.monthlyScanLimit} on ${userProfile.planTier} plan). Upgrade in Pricing & Plans for more scans.`,
        };
      }
      if (action === "export" && userProfile.exportsUsed >= userProfile.monthlyExportLimit) {
        return {
          allowed: false,
          reason: `Monthly export limit reached (${userProfile.exportsUsed}/${userProfile.monthlyExportLimit} on ${userProfile.planTier} plan). Upgrade in Pricing & Plans for more exports.`,
        };
      }
      return { allowed: true };
    },
    [firebaseUser, isAdmin, userProfile]
  );

  const recordUsage = useCallback(
    async (
      actionType: "highlight_scan" | "hook_rewrite" | "short_export",
      streamTitle: string,
      platform: StreamPlatform
    ) => {
      if (!firebaseUser || !userProfile) return;

      const safeTitle = (streamTitle || "Untitled Stream").trim().slice(0, 180);
      const logPath = "usageLogs";
      try {
        await addDoc(collection(db, logPath), {
          userId: firebaseUser.uid,
          actionType,
          streamTitle: safeTitle,
          platform,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, logPath);
      }

      if (actionType === "highlight_scan" || actionType === "short_export") {
        const userPath = `users/${firebaseUser.uid}`;
        const nextScans =
          actionType === "highlight_scan"
            ? Math.min(userProfile.monthlyScanLimit, userProfile.scansUsed + 1)
            : userProfile.scansUsed;
        const nextExports =
          actionType === "short_export"
            ? Math.min(userProfile.monthlyExportLimit, userProfile.exportsUsed + 1)
            : userProfile.exportsUsed;

        if (
          nextScans !== userProfile.scansUsed ||
          nextExports !== userProfile.exportsUsed
        ) {
          try {
            await updateDoc(doc(db, "users", firebaseUser.uid), {
              scansUsed: nextScans,
              exportsUsed: nextExports,
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, userPath);
          }
        }
      }
    },
    [firebaseUser, userProfile]
  );

  const submitUpgradeRequest = useCallback(
    async (requestedPlan: "pro" | "agency", note: string) => {
      if (!firebaseUser) {
        throw new Error("Please sign in with Google first to request an upgrade.");
      }
      const reqPath = "upgradeRequests";
      try {
        await addDoc(collection(db, reqPath), {
          userId: firebaseUser.uid,
          userEmail: (firebaseUser.email || "creator@clipdeck.app").slice(0, 160),
          requestedPlan,
          status: "pending",
          note: note.trim().slice(0, 300),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, reqPath);
      }
    },
    [firebaseUser]
  );

  return (
    <FirebaseContext.Provider
      value={{
        authReady,
        firebaseUser,
        userProfile,
        isAdmin,
        monetizationConfig,
        authError,
        signInWithGoogle,
        signOutUser,
        canPerformAction,
        recordUsage,
        submitUpgradeRequest,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error("useFirebase must be used inside FirebaseProvider");
  }
  return ctx;
}
