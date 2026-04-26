/**
 * Drizzle rows include createdAt/updatedAt (Date). Passing them from Server
 * Components to Client Components breaks production RSC serialization on some hosts.
 */
export function toWizardArtifactsClientPayload<
  T extends {
    id: number;
    artifactKey: string;
    data: unknown;
    version: number;
    locked: boolean;
  },
>(rows: T[]) {
  return rows.map((r) => ({
    id: r.id,
    artifactKey: r.artifactKey,
    data: r.data,
    version: r.version,
    locked: r.locked,
  }));
}
