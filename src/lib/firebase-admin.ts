import {
  getApps,
  initializeApp,
  cert,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let _db: Firestore | null = null;

function ensureInitialized(): Firestore {
  if (_db) return _db;

  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_KEY is not set. " +
          "Paste the full service-account JSON as a single-line string in .env.local"
      );
    }
    const serviceAccount = JSON.parse(raw) as ServiceAccount;
    initializeApp({ credential: cert(serviceAccount) });
  }

  _db = getFirestore();
  return _db;
}

export const adminDb = new Proxy({} as Firestore, {
  get(_target, prop, receiver) {
    const db = ensureInitialized();
    const value = Reflect.get(db, prop, receiver);
    if (typeof value === "function") {
      return value.bind(db);
    }
    return value;
  },
});
