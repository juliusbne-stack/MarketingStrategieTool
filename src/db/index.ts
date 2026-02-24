import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

// WebSocket required for Node.js (Next.js server) - enables transactions
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle({ client: pool });
