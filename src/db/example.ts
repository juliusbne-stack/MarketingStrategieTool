import { sql } from "drizzle-orm";
import { db } from "./index";

async function main() {
  // Test database connection
  const result = await db.execute(sql`SELECT 1 as ok`);
  console.log("Database connection OK:", result);
}

main();
