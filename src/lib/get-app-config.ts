import { adminDb } from "@/lib/firebase-admin";
import type { AppConfigKey, AppConfigValue } from "@/types";
import { CONFIG_SEED } from "@/types";

const CONFIG_DOC_ID = "app";

/** In-memory config cache. Populated on first load, cleared only when config is updated in DB (e.g. PATCH /api/config). */
let appConfigCache: Record<string, AppConfigValue> | null = null;

/**
 * Clear the in-memory config cache. Call this when config is updated in the DB (e.g. after PATCH)
 * so the next loadAppConfigFromDb() refetches and repopulates the cache.
 */
export function invalidateAppConfigCache(): void {
  appConfigCache = null;
}

/**
 * Get app config: use in-memory cache if set, otherwise fetch from Firestore, seed missing keys,
 * store in cache and return. Single source of truth — no hardcoded defaults in callers.
 */
export async function loadAppConfigFromDb(): Promise<Record<string, AppConfigValue>> {
  if (appConfigCache !== null) {
    return appConfigCache;
  }

  const ref = adminDb.collection("config").doc(CONFIG_DOC_ID);
  const doc = await ref.get();
  const data = (doc.exists ? doc.data() : {}) as Record<string, AppConfigValue>;
  const keys = Object.keys(CONFIG_SEED) as AppConfigKey[];
  const missing = keys.filter((k) => data[k] === undefined || data[k] === null);

  let result: Record<string, AppConfigValue>;
  if (missing.length > 0) {
    const toWrite = missing.reduce<Record<string, AppConfigValue>>((acc, k) => {
      acc[k] = CONFIG_SEED[k];
      return acc;
    }, {});
    await ref.set({ ...toWrite, updatedAt: new Date() }, { merge: true });
    const after = await ref.get();
    const afterData = (after.exists ? after.data() : {}) as Record<string, AppConfigValue>;
    result = keys.reduce<Record<string, AppConfigValue>>((acc, k) => {
      acc[k] = afterData[k] ?? toWrite[k];
      return acc;
    }, {});
  } else {
    result = keys.reduce<Record<string, AppConfigValue>>((acc, k) => {
      acc[k] = data[k];
      return acc;
    }, {});
  }

  appConfigCache = result;
  return { ...result };
}
