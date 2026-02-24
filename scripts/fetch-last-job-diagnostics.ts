/** Dev: Fetch last external insight job. Run: npx tsx scripts/fetch-last-job-diagnostics.ts */
import "dotenv/config";
import { db } from "../src/db";
import { externalInsightJobsTable } from "../src/db/schema";
import { desc } from "drizzle-orm";

async function main() {
  const [job] = await db
    .select({
      status: externalInsightJobsTable.status,
      error: externalInsightJobsTable.error,
      diagnostics: externalInsightJobsTable.diagnostics,
    })
    .from(externalInsightJobsTable)
    .orderBy(desc(externalInsightJobsTable.startedAt))
    .limit(1);

  if (!job) {
    console.log("No jobs found.");
    return;
  }

  const d = job.diagnostics as Record<string, unknown> | null;
  console.log("Status:", job.status);
  console.log("Error:", job.error ?? "—");
  console.log("whitelistKeptCount:", d?.whitelistKeptCount);
  console.log("verifiedCount:", d?.verifiedCount);
  console.log("datedKeptCount:", d?.datedKeptCount);
  console.log("driversKeptCount:", d?.driversKeptCount);
  console.log("driversDroppedTooFewSources:", d?.driversDroppedTooFewSources);
  console.log("driversDroppedNotEnoughDomains:", d?.driversDroppedNotEnoughDomains);
  console.log("driversDroppedNoDate:", d?.driversDroppedNoDate);
  console.log("driversDroppedMissingImplication:", d?.driversDroppedMissingImplication);
}

main().catch(console.error).finally(() => process.exit(0));
