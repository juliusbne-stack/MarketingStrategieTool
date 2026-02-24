/**
 * Dev only: Triggers Force Refresh via API route.
 * Run: npm run dev:force-refresh [projectId]
 * Requires dev server running: npm run dev
 */
const projectId = process.argv[2];
const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const url = projectId
  ? `${base}/api/dev/trigger-refresh?projectId=${projectId}`
  : `${base}/api/dev/trigger-refresh`;

async function main() {
  console.log("Triggering Force Refresh via", url);
  console.log("(Ensure dev server is running: npm run dev)\n");

  try {
    const res = await fetch(url);
    const result = (await res.json()) as {
      success?: boolean;
      error?: string;
      diagnostics?: Record<string, unknown>;
      stack?: string;
    };

    if (!res.ok) {
      console.log("\n✗ Request failed:", res.status, result.error ?? "");
      if (result.stack) console.log(result.stack);
      if (result.diagnostics) {
        console.log("\nDiagnostics:", JSON.stringify(result.diagnostics, null, 2));
      }
      process.exit(1);
    }

    if (result.success) {
      console.log("\n✓ Job status: success");
      if (result.diagnostics) {
        const d = result.diagnostics;
        console.log("\nDiagnostics:");
        console.log(`  rawOrganicCount: ${d.rawOrganicCount ?? "—"}`);
        console.log(`  rawNewsCount: ${d.rawNewsCount ?? "—"}`);
        console.log(`  whitelistKeptCount: ${d.whitelistKeptCount ?? "—"}`);
        console.log(`  verifiedCount: ${d.verifiedCount ?? "—"}`);
        console.log(`  datedKeptCount: ${d.datedKeptCount ?? "—"}`);
        console.log(`  driversKeptCount: ${d.driversKeptCount ?? "—"}`);
        if (d.errorStage) console.log(`  errorStage: ${d.errorStage}`);
      }
    } else {
      console.log("\n✗ Job failed:", result.error ?? "Unknown error");
      if (result.diagnostics) {
        console.log("\nDiagnostics:", JSON.stringify(result.diagnostics, null, 2));
      }
      process.exit(1);
    }
  } catch (err) {
    console.error("\nError:", err instanceof Error ? err.message : String(err));
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

main();
