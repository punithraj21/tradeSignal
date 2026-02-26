import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { AppConfigKey, AppConfigValue } from "@/types";
import { CONFIG_SEED } from "@/types";
import { loadAppConfigFromDb, invalidateAppConfigCache } from "@/lib/get-app-config";

const CONFIG_DOC_ID = "app";

export async function GET() {
  try {
    const config = await loadAppConfigFromDb();
    return NextResponse.json({ config });
  } catch (error) {
    console.error("[api/config] GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body as { key: AppConfigKey; value: AppConfigValue };

    if (!key || !Object.keys(CONFIG_SEED).includes(key)) {
      return NextResponse.json({ error: "Invalid or missing config key" }, { status: 400 });
    }

    const ref = adminDb.collection("config").doc(CONFIG_DOC_ID);
    const now = new Date();
    await ref.set({ [key]: value, updatedAt: now }, { merge: true });

    invalidateAppConfigCache();
    const config = await loadAppConfigFromDb();

    return NextResponse.json({ key, value, updatedAt: now, config });
  } catch (error) {
    console.error("[api/config] PATCH Error:", error);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
