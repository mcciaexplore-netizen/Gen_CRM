const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

if (!process.env.DATABASE_URL) {
  console.error("PGlite did not provide DATABASE_URL to the local API launcher.");
  process.exit(1);
}

const localDatabaseUrl = new URL(process.env.DATABASE_URL);
localDatabaseUrl.searchParams.set("connection_limit", "1");
process.env.DATABASE_URL = localDatabaseUrl.toString();

const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
const migration = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

if (migration.status !== 0) {
  process.exit(migration.status ?? 1);
}

const api = spawn(process.execPath, ["dist/main.js"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => api.kill(signal));
}

api.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
