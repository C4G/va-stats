import "dotenv/config";
import { defineConfig } from "prisma/config";

const { DATABASE_URL, MYSQL_DATABASE, MYSQL_HOST, MYSQL_PASSWORD, MYSQL_PORT, MYSQL_USER } = process.env;

const databaseUrl =
  DATABASE_URL ??
  (MYSQL_HOST && MYSQL_DATABASE && MYSQL_USER && MYSQL_PASSWORD
    ? `mysql://${encodeURIComponent(MYSQL_USER)}:${encodeURIComponent(MYSQL_PASSWORD)}@${MYSQL_HOST}:${MYSQL_PORT ?? "3306"}/${encodeURIComponent(MYSQL_DATABASE)}`
    : undefined);

export default defineConfig({
  schema: "prisma",
  migrations: {
    seed: "node --experimental-strip-types scripts/seed-e2e.ts",
  },
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),
});
