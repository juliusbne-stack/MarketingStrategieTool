/**
 * Dev-only: Verifies "newest wins" cache behavior.
 * Run: npx tsx src/db/verify-cache-race.ts
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import { verifyNewestWinsCacheBehavior } from "@/lib/server/search-cache";

async function main() {
  const ok = await verifyNewestWinsCacheBehavior();
  console.log(ok ? "PASS: Newest-wins cache OK" : "FAIL");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
