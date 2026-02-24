"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { artifactsTable, wizardSessionsTable } from "@/db/schema";
import {
  AdjustSchema,
  LockPhase3Schema,
  LockVariantSchema,
  Phase3AnswersSchema,
  SimplifySchema,
} from "@/lib/validations/phase3";
import { listLatestPhase1Artifacts } from "@/lib/server/phase1-session";
import { getOrCreatePhase1Session } from "@/lib/server/phase1-session";
import {
  listLatestPhase2Artifacts,
  getOrCreatePhase2Session,
} from "@/lib/server/phase2-session";
import {
  getOrCreatePhase3Session,
  getLatestPhase3Artifact,
  listLatestPhase3Artifacts,
} from "@/lib/server/phase3-session";
import {
  createPositioningBrandVariantsStub,
  createPositioningAndBrandCoreStub,
  createMinimalPositioningAndBrandCoreStub,
  type Phase3VariantId,
} from "@/lib/server/phase3-stubs";
import { revalidatePath } from "next/cache";

const PHASE_3 = "phase_3";
const STATUS_LOCKED = "locked";
const POSITIONING_BRAND_VARIANTS = "positioning_brand_variants";
const POSITIONING_AND_BRAND_CORE = "positioning_and_brand_core";
const PHASE3_REGENERATE_COUNT = "phase3_regenerate_count";

async function assertSessionOwnershipAndNotLocked(
  projectId: number,
  sessionId: number
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [session] = await db
    .select()
    .from(wizardSessionsTable)
    .where(
      and(
        eq(wizardSessionsTable.id, sessionId),
        eq(wizardSessionsTable.projectId, projectId),
        eq(wizardSessionsTable.userId, userId)
      )
    )
    .limit(1);

  if (!session) throw new Error("Session not found or unauthorized");
  if (session.status === STATUS_LOCKED) {
    throw new Error("Session is locked; cannot modify artifacts");
  }
  return { userId, session };
}

async function getMaxVersionForPhase3Artifact(
  projectId: number,
  sessionId: number,
  artifactKey: string
): Promise<number> {
  const rows = await db
    .select({
      maxVersion: sql<number>`coalesce(max(${artifactsTable.version})::int, 0)`,
    })
    .from(artifactsTable)
    .where(
      and(
        eq(artifactsTable.projectId, projectId),
        eq(artifactsTable.sessionId, sessionId),
        eq(artifactsTable.phaseId, PHASE_3),
        eq(artifactsTable.artifactKey, artifactKey)
      )
    );

  return Number(rows[0]?.maxVersion ?? 0);
}

export async function generatePhase3PositioningBrandTwoVariants(input: {
  projectId: number;
  answersPhase3: { phase_3: Record<string, unknown> };
  answersPhase1?: { phase_1: Record<string, unknown> };
  answersPhase2?: { phase_2: Record<string, unknown> };
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const projectId = z.coerce.number().int().positive().parse(input.projectId);
  Phase3AnswersSchema.pick({ phase_3: true }).parse({
    phase_3: input.answersPhase3.phase_3,
  });

  const phase1Session = await getOrCreatePhase1Session(projectId);
  const phase1Artifacts = await listLatestPhase1Artifacts(
    projectId,
    phase1Session.id
  );
  const strategyProfile = phase1Artifacts.find(
    (a) => a.artifactKey === "strategy_profile"
  );
  if (!strategyProfile) {
    throw new Error("Bitte Phase 1 abschließen (strategy_profile fehlt).");
  }

  const phase2Session = await getOrCreatePhase2Session(projectId);
  const phase2Artifacts = await listLatestPhase2Artifacts(
    projectId,
    phase2Session.id
  );
  const strategicGuidelines = phase2Artifacts.find(
    (a) => a.artifactKey === "strategic_guidelines"
  );
  if (!strategicGuidelines) {
    throw new Error("Bitte Phase 2 abschließen (strategic_guidelines fehlt).");
  }

  const session = await getOrCreatePhase3Session(projectId);
  if (session.status === STATUS_LOCKED) {
    throw new Error("Session is locked; cannot generate");
  }

  await db
    .delete(artifactsTable)
    .where(
      and(
        eq(artifactsTable.projectId, projectId),
        eq(artifactsTable.sessionId, session.id),
        eq(artifactsTable.phaseId, PHASE_3),
        eq(artifactsTable.artifactKey, POSITIONING_BRAND_VARIANTS)
      )
    );

  const stub = createPositioningBrandVariantsStub();
  await db.insert(artifactsTable).values({
    projectId,
    userId,
    sessionId: session.id,
    phaseId: PHASE_3,
    artifactKey: POSITIONING_BRAND_VARIANTS,
    version: 1,
    locked: false,
    data: stub,
  });

  revalidatePath(`/wizard/${projectId}/phase-3`);

  return {
    sessionId: session.id,
    variants: ["option_a", "option_b"] as const,
    defaultSelected: "option_a" as const,
  };
}

export async function lockPhase3Variant(input: {
  projectId: number;
  sessionId: number;
  variantId: Phase3VariantId;
}) {
  const validated = LockVariantSchema.parse(input);
  await assertSessionOwnershipAndNotLocked(
    validated.projectId,
    validated.sessionId
  );

  const variantsArtifact = await getLatestPhase3Artifact(
    validated.projectId,
    validated.sessionId,
    POSITIONING_BRAND_VARIANTS
  );
  if (!variantsArtifact) {
    throw new Error(
      "positioning_brand_variants nicht gefunden. Bitte zuerst Varianten generieren."
    );
  }

  const data = variantsArtifact.data as {
    variants?: Array<{
      variant_id: string;
      competitive_strategy: unknown;
      positioning: unknown;
      brand: unknown;
    }>;
  };
  const variants = data?.variants ?? [];
  const selected = variants.find((v) => v.variant_id === validated.variantId);
  if (!selected) {
    throw new Error(`Variante "${validated.variantId}" nicht gefunden.`);
  }

  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const nextVersion =
    (await getMaxVersionForPhase3Artifact(
      validated.projectId,
      validated.sessionId,
      POSITIONING_AND_BRAND_CORE
    )) + 1;
  const coreData = {
    selected_variant_id: validated.variantId,
    competitive_strategy: selected.competitive_strategy,
    positioning: selected.positioning,
    brand: selected.brand,
  };

  await db.insert(artifactsTable).values({
    projectId: validated.projectId,
    userId,
    sessionId: validated.sessionId,
    phaseId: PHASE_3,
    artifactKey: POSITIONING_AND_BRAND_CORE,
    version: nextVersion,
    locked: false,
    data: coreData,
  });

  revalidatePath(`/wizard/${validated.projectId}/phase-3`);

  return {
    sessionId: validated.sessionId,
    coreVersion: nextVersion,
  };
}

export async function regeneratePhase3PositioningBrandCore(input: {
  projectId: number;
  sessionId: number;
  area: "competitive_strategy" | "positioning" | "brand";
  notes: string;
}) {
  const validated = AdjustSchema.parse(input);
  await assertSessionOwnershipAndNotLocked(
    validated.projectId,
    validated.sessionId
  );

  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const nextVersion =
    (await getMaxVersionForPhase3Artifact(
      validated.projectId,
      validated.sessionId,
      POSITIONING_AND_BRAND_CORE
    )) + 1;
  const existingCore = await getLatestPhase3Artifact(
    validated.projectId,
    validated.sessionId,
    POSITIONING_AND_BRAND_CORE
  );
  const selectedId = (existingCore?.data as { selected_variant_id?: Phase3VariantId })
    ?.selected_variant_id ?? "option_a";
  const stub = createPositioningAndBrandCoreStub(
    selectedId,
    validated.notes,
    validated.area
  ) as Record<string, unknown>;

  await db.insert(artifactsTable).values({
    projectId: validated.projectId,
    userId,
    sessionId: validated.sessionId,
    phaseId: PHASE_3,
    artifactKey: POSITIONING_AND_BRAND_CORE,
    version: nextVersion,
    locked: false,
    data: stub,
  });

  const countArtifact = await getLatestPhase3Artifact(
    validated.projectId,
    validated.sessionId,
    PHASE3_REGENERATE_COUNT
  );
  const nextCount = countArtifact
    ? ((countArtifact.data as { count?: number })?.count ?? 0) + 1
    : 1;

  if (countArtifact) {
    await db
      .update(artifactsTable)
      .set({
        data: { count: nextCount },
        updatedAt: new Date(),
      })
      .where(eq(artifactsTable.id, countArtifact.id));
  } else {
    await db.insert(artifactsTable).values({
      projectId: validated.projectId,
      userId,
      sessionId: validated.sessionId,
      phaseId: PHASE_3,
      artifactKey: PHASE3_REGENERATE_COUNT,
      version: 1,
      locked: false,
      data: { count: nextCount },
    });
  }

  revalidatePath(`/wizard/${validated.projectId}/phase-3`);

  return {
    sessionId: validated.sessionId,
    regenerated: true,
    count: nextCount,
  };
}

export async function simplifyPhase3CoreToMinimalViable(input: {
  projectId: number;
  sessionId: number;
}) {
  const validated = SimplifySchema.parse(input);
  await assertSessionOwnershipAndNotLocked(
    validated.projectId,
    validated.sessionId
  );

  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const nextVersion =
    (await getMaxVersionForPhase3Artifact(
      validated.projectId,
      validated.sessionId,
      POSITIONING_AND_BRAND_CORE
    )) + 1;
  const minimalStub = createMinimalPositioningAndBrandCoreStub();

  await db.insert(artifactsTable).values({
    projectId: validated.projectId,
    userId,
    sessionId: validated.sessionId,
    phaseId: PHASE_3,
    artifactKey: POSITIONING_AND_BRAND_CORE,
    version: nextVersion,
    locked: false,
    data: minimalStub,
  });

  revalidatePath(`/wizard/${validated.projectId}/phase-3`);

  return {
    sessionId: validated.sessionId,
    simplified: true,
  };
}

export async function lockPhase3(input: {
  projectId: number;
  sessionId: number;
}) {
  const validated = LockPhase3Schema.parse(input);
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [session] = await db
    .select()
    .from(wizardSessionsTable)
    .where(
      and(
        eq(wizardSessionsTable.id, validated.sessionId),
        eq(wizardSessionsTable.projectId, validated.projectId),
        eq(wizardSessionsTable.userId, userId)
      )
    )
    .limit(1);

  if (!session) throw new Error("Session not found or unauthorized");

  await db
    .update(wizardSessionsTable)
    .set({ status: STATUS_LOCKED, updatedAt: new Date() })
    .where(eq(wizardSessionsTable.id, validated.sessionId));

  const coreArtifact = await getLatestPhase3Artifact(
    validated.projectId,
    validated.sessionId,
    POSITIONING_AND_BRAND_CORE
  );
  if (coreArtifact) {
    await db
      .update(artifactsTable)
      .set({ locked: true, updatedAt: new Date() })
      .where(eq(artifactsTable.id, coreArtifact.id));
  }

  revalidatePath(`/wizard/${validated.projectId}/phase-3`);

  return {
    sessionId: validated.sessionId,
    locked: true,
  };
}
