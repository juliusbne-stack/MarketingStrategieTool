"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { artifactsTable, wizardSessionsTable } from "@/db/schema";
import {
  AdjustSchema,
  LockPhase2Schema,
  LockVariantSchema,
  Phase2AnswersSchema,
  SimplifySchema,
} from "@/lib/validations/phase2";
import {
  getOrCreatePhase1Session,
  listLatestPhase1Artifacts,
} from "@/lib/server/phase1-session";
import {
  getOrCreatePhase2Session,
  getLatestPhase2Artifact,
  listLatestPhase2Artifacts,
} from "@/lib/server/phase2-session";
import {
  createStrategicGuidelinesVariantsStub,
  createMinimalStrategicGuidelinesStub,
  type Phase2VariantId,
} from "@/lib/server/phase2-stubs";
import { revalidatePath } from "next/cache";

const PHASE_2 = "phase_2";
const STATUS_LOCKED = "locked";
const STATUS_IN_PROGRESS = "in_progress";
const STRATEGIC_GUIDELINES_VARIANTS = "strategic_guidelines_variants";
const STRATEGIC_GUIDELINES = "strategic_guidelines";
const PHASE2_REGENERATE_COUNT = "phase2_regenerate_count";

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

async function getMaxVersionForPhase2Artifact(
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
        eq(artifactsTable.phaseId, PHASE_2),
        eq(artifactsTable.artifactKey, artifactKey)
      )
    );

  return Number(rows[0]?.maxVersion ?? 0);
}

/**
 * 1) generatePhase2GuidelinesThreeVariants
 */
export async function generatePhase2GuidelinesThreeVariants(input: {
  projectId: number;
  answersPhase2: { phase_2: Record<string, unknown> };
  answersPhase1?: { phase_1: Record<string, unknown> };
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const projectId = z.coerce.number().int().positive().parse(input.projectId);
  Phase2AnswersSchema.pick({ phase_2: true }).parse({
    phase_2: input.answersPhase2.phase_2,
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

  const session = await getOrCreatePhase2Session(projectId);
  if (session.status === STATUS_LOCKED) {
    throw new Error("Session is locked; cannot generate");
  }

  await db
    .delete(artifactsTable)
    .where(
      and(
        eq(artifactsTable.projectId, projectId),
        eq(artifactsTable.sessionId, session.id),
        eq(artifactsTable.phaseId, PHASE_2),
        eq(artifactsTable.artifactKey, STRATEGIC_GUIDELINES_VARIANTS)
      )
    );

  const stub = createStrategicGuidelinesVariantsStub();
  await db.insert(artifactsTable).values({
    projectId,
    userId,
    sessionId: session.id,
    phaseId: PHASE_2,
    artifactKey: STRATEGIC_GUIDELINES_VARIANTS,
    version: 1,
    locked: false,
    data: stub,
  });

  revalidatePath(`/wizard/${projectId}/phase-2`);

  return {
    sessionId: session.id,
    availableVariants: ["conservative", "balanced", "bold"] as const,
    defaultSelected: "balanced" as const,
  };
}

/**
 * 2) lockPhase2Variant
 */
export async function lockPhase2Variant(input: {
  projectId: number;
  sessionId: number;
  variantId: Phase2VariantId;
}) {
  const validated = LockVariantSchema.parse(input);
  await assertSessionOwnershipAndNotLocked(
    validated.projectId,
    validated.sessionId
  );

  const variantsArtifact = await getLatestPhase2Artifact(
    validated.projectId,
    validated.sessionId,
    STRATEGIC_GUIDELINES_VARIANTS
  );
  if (!variantsArtifact) {
    throw new Error("strategic_guidelines_variants nicht gefunden. Bitte zuerst Varianten generieren.");
  }

  const data = variantsArtifact.data as { variants?: Array<{ variant_id: string; vision: unknown; mission: unknown; goals: unknown }> };
  const variants = data?.variants ?? [];
  const selected = variants.find((v) => v.variant_id === validated.variantId);
  if (!selected) {
    throw new Error(`Variante "${validated.variantId}" nicht gefunden.`);
  }

  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const nextVersion =
    (await getMaxVersionForPhase2Artifact(
      validated.projectId,
      validated.sessionId,
      STRATEGIC_GUIDELINES
    )) + 1;
  const guidelinesData = {
    selected_variant_id: validated.variantId,
    vision: selected.vision,
    mission: selected.mission,
    goals: selected.goals,
  };

  await db.insert(artifactsTable).values({
    projectId: validated.projectId,
    userId,
    sessionId: validated.sessionId,
    phaseId: PHASE_2,
    artifactKey: STRATEGIC_GUIDELINES,
    version: nextVersion,
    locked: false,
    data: guidelinesData,
  });

  revalidatePath(`/wizard/${validated.projectId}/phase-2`);

  return {
    sessionId: validated.sessionId,
    lockedVariant: validated.variantId,
    guidelinesVersion: nextVersion,
  };
}

/**
 * 3) regeneratePhase2Guidelines
 */
export async function regeneratePhase2Guidelines(input: {
  projectId: number;
  sessionId: number;
  notes: string;
  selectedAreas?: string[];
}) {
  const validated = AdjustSchema.parse({
    projectId: input.projectId,
    sessionId: input.sessionId,
    notes: input.notes,
    selectedAreas: input.selectedAreas,
  });
  await assertSessionOwnershipAndNotLocked(
    validated.projectId,
    validated.sessionId
  );

  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db
    .delete(artifactsTable)
    .where(
      and(
        eq(artifactsTable.projectId, validated.projectId),
        eq(artifactsTable.sessionId, validated.sessionId),
        eq(artifactsTable.phaseId, PHASE_2),
        eq(artifactsTable.artifactKey, STRATEGIC_GUIDELINES_VARIANTS)
      )
    );

  const stub = createStrategicGuidelinesVariantsStub(validated.notes) as {
    variants: Array<{ variant_id: string; vision: unknown; mission: unknown; goals: unknown }>;
  };
  await db.insert(artifactsTable).values({
    projectId: validated.projectId,
    userId,
    sessionId: validated.sessionId,
    phaseId: PHASE_2,
    artifactKey: STRATEGIC_GUIDELINES_VARIANTS,
    version: 1,
    locked: false,
    data: stub,
  });

  // Regenerate outputs strategic_guidelines (spec): use balanced variant from new stub
  const balanced = stub.variants.find((v) => v.variant_id === "balanced") ?? stub.variants[0];
  const nextVersion =
    (await getMaxVersionForPhase2Artifact(
      validated.projectId,
      validated.sessionId,
      STRATEGIC_GUIDELINES
    )) + 1;
  await db.insert(artifactsTable).values({
    projectId: validated.projectId,
    userId,
    sessionId: validated.sessionId,
    phaseId: PHASE_2,
    artifactKey: STRATEGIC_GUIDELINES,
    version: nextVersion,
    locked: false,
    data: {
      selected_variant_id: balanced.variant_id,
      vision: balanced.vision,
      mission: balanced.mission,
      goals: balanced.goals,
    },
  });

  // Increment iteration counter (max 3 per phase2.process.json)
  const countArtifact = await getLatestPhase2Artifact(
    validated.projectId,
    validated.sessionId,
    PHASE2_REGENERATE_COUNT
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
      phaseId: PHASE_2,
      artifactKey: PHASE2_REGENERATE_COUNT,
      version: 1,
      locked: false,
      data: { count: nextCount },
    });
  }

  revalidatePath(`/wizard/${validated.projectId}/phase-2`);

  return {
    sessionId: validated.sessionId,
    regenerated: true,
    iterationCount: nextCount,
  };
}

/**
 * 4) simplifyPhase2GuidelinesToMinimalViable
 */
export async function simplifyPhase2GuidelinesToMinimalViable(input: {
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

  await db
    .delete(artifactsTable)
    .where(
      and(
        eq(artifactsTable.projectId, validated.projectId),
        eq(artifactsTable.sessionId, validated.sessionId),
        eq(artifactsTable.phaseId, PHASE_2),
        eq(artifactsTable.artifactKey, STRATEGIC_GUIDELINES_VARIANTS)
      )
    );

  const minimalStub = {
    variants: (["conservative", "balanced", "bold"] as const).map((variant_id) => {
      const m = createMinimalStrategicGuidelinesStub(variant_id);
      return {
        variant_id,
        label: "Minimal",
        vision: m.vision,
        mission: m.mission,
        goals: m.goals,
      };
    }),
  };

  await db.insert(artifactsTable).values({
    projectId: validated.projectId,
    userId,
    sessionId: validated.sessionId,
    phaseId: PHASE_2,
    artifactKey: STRATEGIC_GUIDELINES_VARIANTS,
    version: 1,
    locked: false,
    data: minimalStub,
  });

  revalidatePath(`/wizard/${validated.projectId}/phase-2`);

  return {
    sessionId: validated.sessionId,
    simplified: true,
  };
}

/**
 * 5) lockPhase2
 */
export async function lockPhase2(input: { projectId: number; sessionId: number }) {
  const validated = LockPhase2Schema.parse(input);
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

  const latestArtifacts = await listLatestPhase2Artifacts(
    validated.projectId,
    validated.sessionId
  );

  for (const art of latestArtifacts) {
    await db
      .update(artifactsTable)
      .set({ locked: true, updatedAt: new Date() })
      .where(eq(artifactsTable.id, art.id));
  }

  revalidatePath(`/wizard/${validated.projectId}/phase-2`);

  return {
    sessionId: validated.sessionId,
    locked: true,
  };
}
