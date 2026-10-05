// Applies pending SQL migrations from src/migrations (generate them with \`pnpm db:generate\`).
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "../src/index";
await migrate(db, { migrationsFolder: path.join(import.meta.dirname, "../src/migrations") });
console.log("[db] migrations applied");
process.exit(0);
