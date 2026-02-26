import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { z } from "zod/v4";
import type { AIModelConfig } from "@/types";

const CreateModelSchema = z.object({
  provider: z.enum(["openrouter", "pollinations"]),
  modelId: z.string().min(1),
  displayName: z.string().min(1),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  capabilities: z.array(z.enum(["chat", "structured-output", "streaming"])),
});

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("aiModels")
      .orderBy("updatedAt", "desc")
      .get();

    const models = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<AIModelConfig, "id">),
    }));

    return NextResponse.json({ models });
  } catch (error) {
    console.error("[api/ai-models] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI models" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = CreateModelSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid model config", details: result.error.message },
        { status: 400 }
      );
    }

    const now = new Date();

    if (result.data.isDefault) {
      const existing = await adminDb
        .collection("aiModels")
        .where("isDefault", "==", true)
        .get();
      const batch = adminDb.batch();
      for (const doc of existing.docs) {
        batch.update(doc.ref, { isDefault: false, updatedAt: now });
      }
      await batch.commit();
    }

    const doc = {
      ...result.data,
      createdAt: now,
      updatedAt: now,
    };

    const ref = await adminDb.collection("aiModels").add(doc);

    return NextResponse.json(
      { id: ref.id, ...doc },
      { status: 201 }
    );
  } catch (error) {
    console.error("[api/ai-models] Error:", error);
    return NextResponse.json(
      { error: "Failed to create AI model config" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body as { id: string } & Partial<AIModelConfig>;

    if (!id) {
      return NextResponse.json(
        { error: "Missing model id" },
        { status: 400 }
      );
    }

    const now = new Date();

    if (updates.isDefault) {
      const existing = await adminDb
        .collection("aiModels")
        .where("isDefault", "==", true)
        .get();
      const batch = adminDb.batch();
      for (const doc of existing.docs) {
        if (doc.id !== id) {
          batch.update(doc.ref, { isDefault: false, updatedAt: now });
        }
      }
      await batch.commit();
    }

    await adminDb
      .collection("aiModels")
      .doc(id)
      .update({ ...updates, updatedAt: now });

    return NextResponse.json({ id, ...updates, updatedAt: now });
  } catch (error) {
    console.error("[api/ai-models] Error:", error);
    return NextResponse.json(
      { error: "Failed to update AI model config" },
      { status: 500 }
    );
  }
}
