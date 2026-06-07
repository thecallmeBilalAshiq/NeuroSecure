import { createApp } from "./app";
import { env } from "./config/env";
import { emailService } from "./services/email.service";

async function main(): Promise<void> {
  const app = createApp();

  // Best-effort SMTP check (non-blocking)
  emailService
    .verify()
    .then((ok) => {
      if (ok) {
        console.log("[smtp] Gmail transport ready");
      } else {
        console.warn("[smtp] Gmail transport failed verification");
      }
    })
    .catch(() => {
      /* already logged */
    });

  const server = app.listen(env.PORT, () => {
    console.log(`\n🛡️  NeuroSecure backend`);
    console.log(`    env  : ${env.NODE_ENV}`);
    console.log(`    port : ${env.PORT}`);
    console.log(`    cors : ${env.CORS_ORIGIN}`);
    console.log(`    url  : http://localhost:${env.PORT}\n`);
  });

  const shutdown = (signal: string): void => {
    console.log(`\n${signal} received, shutting down...`);
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
