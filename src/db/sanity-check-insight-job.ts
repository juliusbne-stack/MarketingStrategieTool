import { sql } from "drizzle-orm";
import { db } from "./index";

async function main() {
  const rows = await db.execute(sql`
    SELECT id, status, diagnostics, error, started_at, finished_at
    FROM external_insight_jobs
    ORDER BY id DESC
    LIMIT 5
  `);

  const raw = rows as { rows?: Record<string, unknown>[] };
  const allRows = raw?.rows ?? (Array.isArray(rows) ? rows : []);
  if (!allRows.length) {
    console.log("Keine Jobs in external_insight_jobs gefunden.");
    return;
  }

  const successRow = allRows.find((r: Record<string, unknown>) => r.status === "success");
  const row = (successRow ?? allRows[0]) as Record<string, unknown>;

  console.log("=== External Insight Job (letzter" + (successRow ? " erfolgreicher" : "") + ") ===\n");
  console.log("ID:", row.id);
  console.log("Status:", row.status);
  console.log("Error:", row.error ?? "(keiner)");
  console.log("Started:", row.started_at);
  console.log("Finished:", row.finished_at ?? "(nicht beendet)");
  console.log("\n=== Diagnostics (roh) ===\n");
  console.log(JSON.stringify(row.diagnostics, null, 2));

  const d = row.diagnostics as Record<string, unknown> | null;
  if (!d) {
    console.log("\nKeine diagnostics vorhanden.");
    return;
  }

  console.log("\n=== Strukturierte Zusammenfassung ===\n");
  const keys = [
    "rawOrganicCount",
    "rawNewsCount",
    "whitelistKeptCount",
    "verifiedCount",
    "datedKeptCount",
    "driversKeptCount",
    "sourcesDroppedNotWhitelisted",
    "sourcesDroppedNoDate",
    "driversDroppedTooFewSources",
    "driversDroppedNotEnoughDomains",
  ];
  for (const k of keys) {
    console.log(`${k}: ${d[k] ?? "(nicht vorhanden)"}`);
  }

  if (allRows.length > 1) {
    console.log("\n=== Letzte 5 Jobs (Übersicht) ===\n");
    for (const r of allRows as Record<string, unknown>[]) {
      console.log(`  ID ${r.id}: ${r.status} (${r.started_at})`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
