import { app } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`Received ${signal}; shutting down Servora API.`);
  const timeout = setTimeout(() => {
    console.error("Graceful shutdown timed out.");
    process.exit(1);
  }, 10_000);
  timeout.unref();
  try {
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error("Error while closing database connection.", error);
    process.exit(1);
  }
}
async function start(): Promise<void> {
  await connectDatabase();
  const server = app.listen(env.PORT, () => {
    console.info(`Servora API listening on port ${env.PORT} (${env.NODE_ENV}).`);
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      server.close(() => { void shutdown(signal); });
    });
  }
}
start().catch((error: unknown) => {
  console.error("Failed to start Servora API.", error);
  process.exit(1);
});
