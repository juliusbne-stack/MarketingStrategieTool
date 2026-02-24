"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { artifactsTable, wizardSessionsTable } from "@/db/schema";
import {
  AdjustSchema,
  LockSchema,
  Phase5AnswersSchema,
} from "@/lib/validations/phase5";
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
  listLatestPhase4Artifacts,
} from "@/lib/server/phase4-session";
import {
  getOrCreatePhase5Session,
  getLatestPhase5Artifact,
  listLatestPhase5Artifacts,
} from "@/lib/server/phase5-session";
import {
  createDraftContentPlan,
  createFinalContentPlanFromDraft,
  createRegeneratedContentPlanStub,
  simplifyFinalContentPlan,
  forceMinimalFinalContentPlan,
} from "@/lib/server/phase5-stubs";
import { revalidatePath } from "next/cache";

const PHASE_5 = "phase_5";
const STATUS_LOCKED = "locked";
const CONTENT_PLAN_DRAFT = "content_plan_draft";
const CONTENT_PLAN = "content_plan";
const PHASE5_REGENERATE_COUNT = "phase5_regenerate_count";

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

async function getMaxVersionForPhase5Artifact(
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
        eq(artifactsTable.phaseId, PHASE_5),
        eq(artifactsTable.artifactKey, artifactKey)
      )
    );

  return Number(rows[0]?.maxVersion ?? 0);
}

export async function generatePhase5Draft(input: { projectId: number }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const projectId = z.coerce.number().int().positive().parse(input.projectId);

  const phase1Session = await getOrCreatePhase1Session(projectId);
  const phase1Artifacts = await listLatestPhase1Artifacts(
    projectId,
    phase1Session.id
  );
  const strategyProfile = phase1Artifacts.find(
    (a) => a.artifactKey === "strategy_profile"
  );
  if (!strategyProfile) {
    throw new Error("Bitte Phase 1–4 abschließen (strategy_profile fehlt).");
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
    throw new Error("Bitte Phase 1–4 abschließen (strategic_guidelines fehlt).");
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
    throw new Error("Bitte Phase 1–4 abschließen (positioning_and_brand_core fehlt).");
  }

  const phase4Session = await getOrCreatePhase4Session(projectId);
  const phase4Artifacts = await listLatestPhase4Artifacts(
    projectId,
    phase4Session.id
  );
  const marketingPlan = phase4Artifacts.find(
    (a) => a.artifactKey === "marketing_plan"
  );
  if (!marketingPlan) {
    throw new Error("Bitte Phase 1–4 abschließen (marketing_plan fehlt).");
  }

  const session = await getOrCreatePhase5Session(projectId);
  if (session.status === STATUS_LOCKED) {
    throw new Error("Session is locked; cannot generate");
  }

  await db
    .delete(artifactsTable)
    .where(
      and(
        eq(artifactsTable.projectId, projectId),
        eq(artifactsTable.sessionId, session.id),
        eq(artifactsTable.phaseId, PHASE_5),
        eq(artifactsTable.artifactKey, CONTENT_PLAN_DRAFT)
      )
    );

  const stub = createDraftContentPlan(
    strategyProfile.data,
    strategicGuidelines.data,
    positioningAndBrandCore.data,
    marketingPlan.data
  );
  await db.insert(artifactsTable).values({
    projectId,
    userId,
    sessionId: session.id,
    phaseId: PHASE_5,
    artifactKey: CONTENT_PLAN_DRAFT,
    version: 1,
    locked: false,
    data: stub,
  });

  revalidatePath(`/wizard/${projectId}/phase-5`);

  return {
    sessionId: session.id,
    drafted: true,
  };
}

export async function generatePhase5Final(input: {
  projectId: number;
  answersPhase5: { phase_5: Record<string, unknown> };
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const projectId = z.coerce.number().int().positive().parse(input.projectId);
  Phase5AnswersSchema.pick({ phase_5: true }).parse({
    phase_5: input.answersPhase5.phase_5,
  });

  const session = await getOrCreatePhase5Session(projectId);
  if (session.status === STATUS_LOCKED) {
    throw new Error("Session is locked; cannot generate");
  }

  const draftArtifact = await getLatestPhase5Artifact(
    projectId,
    session.id,
    CONTENT_PLAN_DRAFT
  );
  if (!draftArtifact) {
    throw new Error("Bitte erst Draft erzeugen (content_plan_draft fehlt).");
  }

  const draft = draftArtifact.data as {
    pillars: unknown[];
    editorial_board_4w: unknown;
    briefings: unknown[];
  };
  const stub = createFinalContentPlanFromDraft(
    draft as Parameters<typeof createFinalContentPlanFromDraft>[0],
    input.answersPhase5.phase_5
  );

  const nextVersion =
    (await getMaxVersionForPhase5Artifact(
      projectId,
      session.id,
      CONTENT_PLAN
    )) + 1;

  await db.insert(artifactsTable).values({
    projectId,
    userId,
    sessionId: session.id,
    phaseId: PHASE_5,
    artifactKey: CONTENT_PLAN,
    version: nextVersion,
    locked: false,
    data: stub,
  });

  revalidatePath(`/wizard/${projectId}/phase-5`);

  return {
    sessionId: session.id,
    version: nextVersion,
  };
}

export async function regeneratePhase5Final(input: {
  projectId: number;
  sessionId: number;
  area: string[];
  notes: string;
}) {
  const validated = AdjustSchema.parse(input);
  await assertSessionOwnershipAndNotLocked(
    validated.projectId,
    validated.sessionId
  );

  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const existingPlan = await getLatestPhase5Artifact(
    validated.projectId,
    validated.sessionId,
    CONTENT_PLAN
  );
  if (!existingPlan) {
    throw new Error("content_plan nicht gefunden. Bitte zuerst Final Plan erzeugen.");
  }

  const existing = existingPlan.data as Parameters<typeof createRegeneratedContentPlanStub>[0];
  const stub = createRegeneratedContentPlanStub(
    existing,
    validated.area,
    validated.notes
  );

  const nextVersion =
    (await getMaxVersionForPhase5Artifact(
      validated.projectId,
      validated.sessionId,
      CONTENT_PLAN
    )) + 1;

  await db.insert(artifactsTable).values({
    projectId: validated.projectId,
    userId,
    sessionId: validated.sessionId,
    phaseId: PHASE_5,
    artifactKey: CONTENT_PLAN,
    version: nextVersion,
    locked: false,
    data: stub,
  });

  const countArtifact = await getLatestPhase5Artifact(
    validated.projectId,
    validated.sessionId,
    PHASE5_REGENERATE_COUNT
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
      phaseId: PHASE_5,
      artifactKey: PHASE5_REGENERATE_COUNT,
      version: 1,
      locked: false,
      data: { count: nextCount },
    });
  }

  revalidatePath(`/wizard/${validated.projectId}/phase-5`);

  return {
    sessionId: validated.sessionId,
    version: nextVersion,
    count: nextCount,
  };
}

export async function simplifyPhase5Plan(input: {
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

  const existingPlan = await getLatestPhase5Artifact(
    validated.projectId,
    validated.sessionId,
    CONTENT_PLAN
  );
  const existing = existingPlan
    ? (existingPlan.data as Parameters<typeof simplifyFinalContentPlan>[0])
    : { pillars: [], editorial_board_4w: { week_1: [], week_2: [], week_3: [], week_4: [] }, briefings: [] };

  const stub = simplifyFinalContentPlan(existing);

  const nextVersion =
    (await getMaxVersionForPhase5Artifact(
      validated.projectId,
      validated.sessionId,
      CONTENT_PLAN
    )) + 1;

  await db.insert(artifactsTable).values({
    projectId: validated.projectId,
    userId,
    sessionId: validated.sessionId,
    phaseId: PHASE_5,
    artifactKey: CONTENT_PLAN,
    version: nextVersion,
    locked: false,
    data: stub,
  });

  revalidatePath(`/wizard/${validated.projectId}/phase-5`);

  return {
    sessionId: validated.sessionId,
    simplified: true,
    version: nextVersion,
  };
}

export async function forceMinimalPhase5Plan(input: {
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

  const existingPlan = await getLatestPhase5Artifact(
    validated.projectId,
    validated.sessionId,
    CONTENT_PLAN
  );
  const existing = existingPlan
    ? (existingPlan.data as Parameters<typeof forceMinimalFinalContentPlan>[0])
    : undefined;

  const stub = forceMinimalFinalContentPlan(existing);

  const nextVersion =
    (await getMaxVersionForPhase5Artifact(
      validated.projectId,
      validated.sessionId,
      CONTENT_PLAN
    )) + 1;

  await db.insert(artifactsTable).values({
    projectId: validated.projectId,
    userId,
    sessionId: validated.sessionId,
    phaseId: PHASE_5,
    artifactKey: CONTENT_PLAN,
    version: nextVersion,
    locked: false,
    data: stub,
  });

  revalidatePath(`/wizard/${validated.projectId}/phase-5`);

  return {
    sessionId: validated.sessionId,
    forcedMinimal: true,
    version: nextVersion,
  };
}

export async function lockPhase5(input: {
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

  const latestArtifacts = await listLatestPhase5Artifacts(
    validated.projectId,
    validated.sessionId
  );
  const contentPlanArtifact = latestArtifacts.find(
    (a) => a.artifactKey === CONTENT_PLAN
  );
  if (contentPlanArtifact) {
    await db
      .update(artifactsTable)
      .set({ locked: true, updatedAt: new Date() })
      .where(eq(artifactsTable.id, contentPlanArtifact.id));
  }

  revalidatePath(`/wizard/${validated.projectId}/phase-5`);

  return {
    sessionId: validated.sessionId,
    locked: true,
  };
}
