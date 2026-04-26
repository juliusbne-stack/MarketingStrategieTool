/**
 * Deep-clone to JSON-serializable plain data (strips Dates, class instances, etc.).
 * Used before passing DB-backed objects from Server Components to Client Components.
 */
export function cloneJsonSafe<T>(value: T): T {
  if (value === undefined || value === null) {
    return value;
  }
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

/**
 * Drizzle rows include createdAt/updatedAt (Date). Passing them from Server
 * Components to Client Components breaks production RSC serialization on some hosts.
 * `data` is JSON-cloned so nested values are plain JSON only.
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
    data: cloneJsonSafe(r.data) as unknown,
    version: r.version,
    locked: r.locked,
  }));
}
