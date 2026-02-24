"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { artifactsTable, wizardSessionsTable } from "@/db/schema";
import {
  GenerateSchema,
  LockSchema,
  RegenerateSchema,
  SimplifySchema,
} from "@/lib/validations/phase1";
import {
  getOrCreatePhase1Session,
  listLatestPhase1Artifacts,
} from "@/lib/server/phase1-session";
import {
  PHASE1_ARTIFACT_KEYS,
  createMinimalStubForArtifactKey,
  type Phase1ArtifactKey,
} from "@/lib/server/phase1-stubs";
import { generatePhase1ArtifactsWithOpenAI } from "@/lib/server/phase1-openai";
import { filterVerifiedSourcesInPestelArtifact } from "@/lib/server/verify-url";
import { revalidatePath } from "next/cache";

const PHASE_1 = "phase_1";
const STATUS_LOCKED = "locked";
const STATUS_IN_PROGRESS = "in_progress";

/**
 * Maps p1_adjust_area (selectedAreas) to artifact keys.
 */
const AREA_TO_ARTIFACT_KEYS: Record<string, Phase1ArtifactKey[]> = {
  target_group: ["target_profiles"],
  competition: ["porter_5_forces", "strategic_group_map"],
  market: ["pestel", "market_segmentation"],
  positioning_space: ["strategic_group_map", "swot"],
  other: ["strategy_profile"],
};

function resolveArtifactKeysFromAreas(selectedAreas: string[]): Phase1ArtifactKey[] {
  const keys = new Set<Phase1ArtifactKey>();
  for (const area of selectedAreas) {
    const mapped = AREA_TO_ARTIFACT_KEYS[area] ?? ["strategy_profile"];
    for (const k of mapped) keys.add(k);
  }
  return Array.from(keys);
}

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

async function getMaxVersionForSession(
  projectId: number,
  sessionId: number
): Promise<Record<string, number>> {
  const rows = await db
    .select({
      artifactKey: artifactsTable.artifactKey,
      maxVersion: sql<number>`max(${artifactsTable.version})::int`,
    })
    .from(artifactsTable)
    .where(
      and(
        eq(artifactsTable.projectId, projectId),
        eq(artifactsTable.sessionId, sessionId),
        eq(artifactsTable.phaseId, PHASE_1)
      )
    )
    .groupBy(artifactsTable.artifactKey);

  const map: Record<string, number> = {};
  for (const r of rows) {
    map[r.artifactKey] = Number(r.maxVersion) ?? 1;
  }
  return map;
}

export async function generatePhase1Artifacts(input: {
  projectId: number;
  answersPhase1: { phase_1: Record<string, unknown> };
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = GenerateSchema.parse(input);

  const session = await getOrCreatePhase1Session(validated.projectId);
  if (session.status === STATUS_LOCKED) {
    throw new Error("Session is locked; cannot generate");
  }

  const rawArtifacts = await generatePhase1ArtifactsWithOpenAI({
    answersPhase1: validated.answersPhase1.phase_1,
  });

  const artifacts: Record<string, Record<string, unknown>> = { ...rawArtifacts };

  const companyName = (() => {
    const a = validated.answersPhase1?.phase_1?.p1_company_name;
    if (!a || typeof a !== "object" || !("type" in a)) return "";
    const t = a as { type: string; value?: string };
    if (t.type === "preset" && t.value === "no_name") return "";
    if (t.type === "custom" && typeof t.value === "string" && t.value.trim()) return t.value.trim();
    return "";
  })();
  if (artifacts.strategy_profile && typeof artifacts.strategy_profile === "object") {
    artifacts.strategy_profile = { ...artifacts.strategy_profile, company_name: companyName };
  }

  if (artifacts.pestel && typeof artifacts.pestel === "object") {
    const filtered = await filterVerifiedSourcesInPestelArtifact(
      artifacts.pestel as Record<string, unknown>
    ) as { categories?: Array<{ drivers?: Array<{ validated?: boolean }> }> };
    const withValidated = {
      ...filtered,
      categories: (filtered.categories ?? []).map((cat) => ({
        ...cat,
        drivers: (cat.drivers ?? []).map((d) => ({ ...d, validated: true })),
      })),
    };
    artifacts.pestel = withValidated as Record<string, unknown>;
  }

  const createdKeys: string[] = [];
  for (const key of PHASE1_ARTIFACT_KEYS) {
    await db.insert(artifactsTable).values({
      projectId: validated.projectId,
      userId,
      sessionId: session.id,
      phaseId: PHASE_1,
      artifactKey: key,
      version: 1,
      locked: false,
      data: artifacts[key],
    });
    createdKeys.push(key);
  }

  /** Originalantworten aus dem Fragebogen dauerhaft speichern – für alle Analysen nutzbar */
  await db.insert(artifactsTable).values({
    projectId: validated.projectId,
    userId,
    sessionId: session.id,
    phaseId: PHASE_1,
    artifactKey: "phase1_answers",
    version: 1,
    locked: false,
    data: validated.answersPhase1.phase_1,
  });
  createdKeys.push("phase1_answers");

  revalidatePath("/dashboard");
  revalidatePath(`/wizard/${validated.projectId}/phase-1`);

  return {
    sessionId: session.id,
    createdKeys,
    version: 1,
  };
}

export async function regeneratePhase1Artifacts(input: {
  projectId: number;
  sessionId: number;
  selectedAreas: string[];
  notes: string;
  answersPhase1?: { phase_1: Record<string, unknown> };
}) {
  const validated = RegenerateSchema.parse(input);
  await assertSessionOwnershipAndNotLocked(
    validated.projectId,
    validated.sessionId
  );

  const artifactKeys = resolveArtifactKeysFromAreas(validated.selectedAreas);
  const maxVersions = await getMaxVersionForSession(
    validated.projectId,
    validated.sessionId
  );

  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const latestArtifacts = await listLatestPhase1Artifacts(
    validated.projectId,
    validated.sessionId
  );
  const strategyProfile = latestArtifacts.find(
    (a) => a.artifactKey === "strategy_profile"
  );
  const existingStrategyProfile = strategyProfile?.data
    ? (strategyProfile.data as Record<string, unknown>)
    : undefined;

  /** Gespeicherte Originalantworten nutzen, falls keine neuen übergeben */
  const phase1AnswersArtifact = latestArtifacts.find(
    (a) => a.artifactKey === "phase1_answers"
  );
  const storedAnswers = phase1AnswersArtifact?.data
    ? (phase1AnswersArtifact.data as Record<string, unknown>)
    : undefined;
  const answersToUse = validated.answersPhase1?.phase_1 ?? storedAnswers;

  const rawArtifacts = await generatePhase1ArtifactsWithOpenAI({
    answersPhase1: answersToUse,
    selectedAreas: validated.selectedAreas,
    notes: validated.notes,
    existingStrategyProfile,
    isRegenerate: true,
  });

  const artifacts: Record<string, Record<string, unknown>> = { ...rawArtifacts };

  const companyName = (() => {
    const a = answersToUse?.p1_company_name;
    if (a && typeof a === "object" && "type" in a) {
      const t = a as { type: string; value?: string };
      if (t.type === "preset" && t.value === "no_name") return "";
      if (t.type === "custom" && typeof t.value === "string" && t.value.trim()) return t.value.trim();
    }
    if (existingStrategyProfile && typeof existingStrategyProfile.company_name === "string") {
      return existingStrategyProfile.company_name;
    }
    return "";
  })();
  if (artifacts.strategy_profile && typeof artifacts.strategy_profile === "object") {
    artifacts.strategy_profile = { ...artifacts.strategy_profile, company_name: companyName };
  }

  if (artifacts.pestel && typeof artifacts.pestel === "object") {
    const filtered = await filterVerifiedSourcesInPestelArtifact(
      artifacts.pestel as Record<string, unknown>
    ) as { categories?: Array<{ drivers?: Array<{ validated?: boolean }> }> };
    const withValidated = {
      ...filtered,
      categories: (filtered.categories ?? []).map((cat) => ({
        ...cat,
        drivers: (cat.drivers ?? []).map((d) => ({ ...d, validated: true })),
      })),
    };
    artifacts.pestel = withValidated as Record<string, unknown>;
  }

  const regeneratedKeys: string[] = [];
  const newVersions: Record<string, number> = {};

  for (const key of artifactKeys) {
    const nextVersion = (maxVersions[key] ?? 0) + 1;
    await db.insert(artifactsTable).values({
      projectId: validated.projectId,
      userId,
      sessionId: validated.sessionId,
      phaseId: PHASE_1,
      artifactKey: key,
      version: nextVersion,
      locked: false,
      data: artifacts[key],
    });
    regeneratedKeys.push(key);
    newVersions[key] = nextVersion;
  }

  revalidatePath("/dashboard");
  revalidatePath(`/wizard/${validated.projectId}/phase-1`);

  return {
    sessionId: validated.sessionId,
    regeneratedKeys,
    newVersions,
  };
}

export async function simplifyPhase1ArtifactsToMinimalViable(input: {
  projectId: number;
  sessionId: number;
}) {
  const validated = SimplifySchema.parse(input);
  await assertSessionOwnershipAndNotLocked(
    validated.projectId,
    validated.sessionId
  );

  const maxVersions = await getMaxVersionForSession(
    validated.projectId,
    validated.sessionId
  );
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  for (const key of PHASE1_ARTIFACT_KEYS) {
    const nextVersion = (maxVersions[key] ?? 0) + 1;
    const minimal = createMinimalStubForArtifactKey(key);

    await db.insert(artifactsTable).values({
      projectId: validated.projectId,
      userId,
      sessionId: validated.sessionId,
      phaseId: PHASE_1,
      artifactKey: key,
      version: nextVersion,
      locked: false,
      data: minimal,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/wizard/${validated.projectId}/phase-1`);

  return {
    sessionId: validated.sessionId,
    simplified: true,
  };
}

export async function lockPhase1(input: { projectId: number; sessionId: number }) {
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

  const latestArtifacts = await listLatestPhase1Artifacts(
    validated.projectId,
    validated.sessionId
  );

  for (const art of latestArtifacts) {
    await db
      .update(artifactsTable)
      .set({ locked: true, updatedAt: new Date() })
      .where(eq(artifactsTable.id, art.id));
  }

  revalidatePath("/dashboard");
  revalidatePath(`/wizard/${validated.projectId}/phase-1`);

  return {
    sessionId: validated.sessionId,
    locked: true,
  };
}
