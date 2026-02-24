"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { artifactsTable, wizardSessionsTable } from "@/db/schema";
import {
  AdjustSchema,
  LockSchema,
  Phase4AnswersSchema,
} from "@/lib/validations/phase4";
import {
  getOrCreatePhase1Session,
  listLatestPhase1Artifacts,
} from "@/lib/server/phase1-session";
import {
  getOrCreatePhase2Session,
  listLatestPhase2Artifacts,
} from "@/lib/server/phase2-session";
import {
  getOrCreatePhase3Session,
  listLatestPhase3Artifacts,
} from "@/lib/server/phase3-session";
import {
  getOrCreatePhase4Session,
  getLatestPhase4Artifact,
  listLatestPhase4Artifacts,
} from "@/lib/server/phase4-session";
import {
  createMarketingPlanDraftStub,
  createMarketingPlanStub,
  createSimplifiedMarketingPlanStub,
  createMinimalMarketingPlanStub,
  createRegeneratedMarketingPlanStub,
} from "@/lib/server/phase4-stubs";
import { revalidatePath } from "next/cache";

const PHASE_4 = "phase_4";
const STATUS_LOCKED = "locked";
const MARKETING_PLAN_DRAFT = "marketing_plan_draft";
const MARKETING_PLAN = "marketing_plan";
const PHASE4_REGENERATE_COUNT = "phase4_regenerate_count";

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

async function getMaxVersionForPhase4Artifact(
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
        eq(artifactsTable.phaseId, PHASE_4),
        eq(artifactsTable.artifactKey, artifactKey)
      )
    );

  return Number(rows[0]?.maxVersion ?? 0);
}

export async function generatePhase4Draft(input?: {
  projectId: number;
  answersPhase1?: { phase_1: Record<string, unknown> };
  answersPhase2?: { phase_2: Record<string, unknown> };
  answersPhase3?: { phase_3: Record<string, unknown> };
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const projectId = input?.projectId
    ? z.coerce.number().int().positive().parse(input.projectId)
    : undefined;
  if (!projectId) throw new Error("projectId is required");

  const phase1Session = await getOrCreatePhase1Session(projectId);
  const phase1Artifacts = await listLatestPhase1Artifacts(
    projectId,
    phase1Session.id
  );
  const strategyProfile = phase1Artifacts.find(
    (a) => a.artifactKey === "strategy_profile"
  );
  if (!strategyProfile) {
    throw new Error("Bitte Phase 1–3 abschließen (strategy_profile fehlt).");
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
    throw new Error("Bitte Phase 1–3 abschließen (strategic_guidelines fehlt).");
  }

  const phase3Session = await getOrCreatePhase3Session(projectId);
  const phase3Artifacts = await listLatestPhase3Artifacts(
    projectId,
    phase3Session.id
  );
  const positioningAndBrandCore = phase3Artifacts.find(
    (a) => a.artifactKey === "positioning_and_brand_core"
  );
  if (!positioningAndBrandCore) {
    throw new Error("Bitte Phase 1–3 abschließen (positioning_and_brand_core fehlt).");
  }

  const session = await getOrCreatePhase4Session(projectId);
  if (session.status === STATUS_LOCKED) {
    throw new Error("Session is locked; cannot generate");
  }

  const phase1AnswersFromInput = input?.answersPhase1?.phase_1;
  const phase1AnswersStored = phase1Artifacts.find((a) => a.artifactKey === "phase1_answers")?.data as Record<string, unknown> | undefined;
  const phase1Answers = phase1AnswersFromInput ?? phase1AnswersStored;
  const answers = phase1Answers
    ? { ...phase1Answers, ...input?.answersPhase2?.phase_2, ...input?.answersPhase3?.phase_3 }
    : undefined;

  await db
    .delete(artifactsTable)
    .where(
      and(
        eq(artifactsTable.projectId, projectId),
        eq(artifactsTable.sessionId, session.id),
        eq(artifactsTable.phaseId, PHASE_4),
        eq(artifactsTable.artifactKey, MARKETING_PLAN_DRAFT)
      )
    );

  const stub = createMarketingPlanDraftStub(answers);
  await db.insert(artifactsTable).values({
    projectId,
    userId,
    sessionId: session.id,
    phaseId: PHASE_4,
    artifactKey: MARKETING_PLAN_DRAFT,
    version: 1,
    locked: false,
    data: stub,
  });

  revalidatePath(`/wizard/${projectId}/phase-4`);

  return {
    sessionId: session.id,
    drafted: true,
  };
}

export async function generatePhase4FinalPlan(input: {
  projectId: number;
  answersPhase4: { phase_4: Record<string, unknown> };
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const projectId = z.coerce.number().int().positive().parse(input.projectId);
  Phase4AnswersSchema.pick({ phase_4: true }).parse({
    phase_4: input.answersPhase4.phase_4,
  });

  const session = await getOrCreatePhase4Session(projectId);
  if (session.status === STATUS_LOCKED) {
    throw new Error("Session is locked; cannot generate");
  }

  const draftArtifact = await getLatestPhase4Artifact(
    projectId,
    session.id,
    MARKETING_PLAN_DRAFT
  );
  if (!draftArtifact) {
    throw new Error("Bitte erst Draft erzeugen (marketing_plan_draft fehlt).");
  }

  const draft = draftArtifact.data as Record<string, unknown>;
  const stub = createMarketingPlanStub(draft, input.answersPhase4.phase_4);

  const nextVersion =
    (await getMaxVersionForPhase4Artifact(
      projectId,
      session.id,
      MARKETING_PLAN
    )) + 1;

  await db.insert(artifactsTable).values({
    projectId,
    userId,
    sessionId: session.id,
    phaseId: PHASE_4,
    artifactKey: MARKETING_PLAN,
    version: nextVersion,
    locked: false,
    data: stub,
  });

  revalidatePath(`/wizard/${projectId}/phase-4`);

  return {
    sessionId: session.id,
    version: nextVersion,
  };
}

export async function regeneratePhase4FinalPlan(input: {
  projectId: number;
  sessionId: number;
  area: string;
  notes: string;
}) {
  const validated = AdjustSchema.parse(input);
  await assertSessionOwnershipAndNotLocked(
    validated.projectId,
    validated.sessionId
  );

  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const existingPlan = await getLatestPhase4Artifact(
    validated.projectId,
    validated.sessionId,
    MARKETING_PLAN
  );
  if (!existingPlan) {
    throw new Error("marketing_plan nicht gefunden. Bitte zuerst Final Plan erzeugen.");
  }

  const existing = existingPlan.data as Record<string, unknown>;
  const stub = createRegeneratedMarketingPlanStub(
    existing,
    validated.area,
    validated.notes
  );

  const nextVersion =
    (await getMaxVersionForPhase4Artifact(
      validated.projectId,
      validated.sessionId,
      MARKETING_PLAN
    )) + 1;

  await db.insert(artifactsTable).values({
    projectId: validated.projectId,
    userId,
    sessionId: validated.sessionId,
    phaseId: PHASE_4,
    artifactKey: MARKETING_PLAN,
    version: nextVersion,
    locked: false,
    data: stub,
  });

  const countArtifact = await getLatestPhase4Artifact(
    validated.projectId,
    validated.sessionId,
    PHASE4_REGENERATE_COUNT
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
      phaseId: PHASE_4,
      artifactKey: PHASE4_REGENERATE_COUNT,
      version: 1,
      locked: false,
      data: { count: nextCount },
    });
  }

  revalidatePath(`/wizard/${validated.projectId}/phase-4`);

  return {
    sessionId: validated.sessionId,
    version: nextVersion,
    count: nextCount,
  };
}

export async function simplifyPhase4Plan(input: {
  projectId: number;
  sessionId: number;
}) {
  const validated = LockSchema.parse(input);
  await assertSessionOwnershipAndNotLocked(
    validated.projectId,
    validated.sessionId
  );

  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const existingPlan = await getLatestPhase4Artifact(
    validated.projectId,
    validated.sessionId,
    MARKETING_PLAN
  );
  const existing = existingPlan
    ? (existingPlan.data as Record<string, unknown>)
    : {};

  const stub = createSimplifiedMarketingPlanStub(existing);

  const nextVersion =
    (await getMaxVersionForPhase4Artifact(
      validated.projectId,
      validated.sessionId,
      MARKETING_PLAN
    )) + 1;

  await db.insert(artifactsTable).values({
    projectId: validated.projectId,
    userId,
    sessionId: validated.sessionId,
    phaseId: PHASE_4,
    artifactKey: MARKETING_PLAN,
    version: nextVersion,
    locked: false,
    data: stub,
  });

  revalidatePath(`/wizard/${validated.projectId}/phase-4`);

  return {
    sessionId: validated.sessionId,
    simplified: true,
    version: nextVersion,
  };
}

export async function forceMinimalPhase4Plan(input: {
  projectId: number;
  sessionId: number;
}) {
  const validated = LockSchema.parse(input);
  await assertSessionOwnershipAndNotLocked(
    validated.projectId,
    validated.sessionId
  );

  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const existingPlan = await getLatestPhase4Artifact(
    validated.projectId,
    validated.sessionId,
    MARKETING_PLAN
  );
  const existing = existingPlan
    ? (existingPlan.data as Record<string, unknown>)
    : undefined;

  const stub = createMinimalMarketingPlanStub(existing);

  const nextVersion =
    (await getMaxVersionForPhase4Artifact(
      validated.projectId,
      validated.sessionId,
      MARKETING_PLAN
    )) + 1;

  await db.insert(artifactsTable).values({
    projectId: validated.projectId,
    userId,
    sessionId: validated.sessionId,
    phaseId: PHASE_4,
    artifactKey: MARKETING_PLAN,
    version: nextVersion,
    locked: false,
    data: stub,
  });

  revalidatePath(`/wizard/${validated.projectId}/phase-4`);

  return {
    sessionId: validated.sessionId,
    forcedMinimal: true,
    version: nextVersion,
  };
}

export async function lockPhase4(input: {
  projectId: number;
  sessionId: number;
}) {
  const validated = LockSchema.parse(input);
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

  const latestArtifacts = await listLatestPhase4Artifacts(
    validated.projectId,
    validated.sessionId
  );
  const marketingPlanArtifact = latestArtifacts.find(
    (a) => a.artifactKey === MARKETING_PLAN
  );
  if (marketingPlanArtifact) {
    await db
      .update(artifactsTable)
      .set({ locked: true, updatedAt: new Date() })
      .where(eq(artifactsTable.id, marketingPlanArtifact.id));
  }

  revalidatePath(`/wizard/${validated.projectId}/phase-4`);

  return {
    sessionId: validated.sessionId,
    locked: true,
  };
}
