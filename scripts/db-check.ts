/**
 * DB-Check: Prüft ob external_search_cache existiert und zeigt Migrationen.
 * Run: npm run db:check
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { db } from "../src/db";

async function main() {
  console.log("=== DB-Check: external_search_cache & Migrationen ===\n");

  // 1. Prüfe ob Tabelle external_search_cache existiert
  const cacheResult = await db.execute(
    sql`select to_regclass('public.external_search_cache') as cache_table`
  );
  const cacheTable = (cacheResult.rows[0] as { cache_table: string | null })
    ?.cache_table;
  console.log("1) Tabelle external_search_cache:");
  console.log("   to_regclass('public.external_search_cache'):", cacheTable);
  console.log("   Vorhanden:", cacheTable != null && cacheTable !== "" ? "JA" : "NEIN");
  console.log();

  // 2. Prüfe Drizzle-Migrationen (Falls Tabelle existiert)
  try {
    const migrationsResult = await db.execute(
      sql`select * from drizzle.__drizzle_migrations order by created_at desc limit 20`
    );
    console.log("2) Letzte 20 Migrationen (drizzle.__drizzle_migrations):");
    if (migrationsResult.rows.length === 0) {
      console.log("   (Keine Einträge oder Tabelle existiert nicht)");
    } else {
      console.table(migrationsResult.rows);
    }
  } catch (err) {
    console.log("2) Migrationen:");
    console.log("   Fehler:", (err as Error).message);
    console.log("   (Tabelle drizzle.__drizzle_migrations evtl. nicht vorhanden - bei db:push üblich)");
  }

  console.log("\n=== Ende ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
