import cors from "cors";
import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import notifyRoutes from "./routes/notify.routes";
import userRoutes from "./routes/user.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export function createApp(): Application {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));
  if (env.NODE_ENV !== "test") {
    app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  }

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  // Friendly landing for Supabase auth-confirmation redirects, in case any
  // legacy verification links land here. Registration in NeuroSecure is
  // auto-confirmed server-side, so users normally never see this page.
  const confirmHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>NeuroSecure</title>
  <style>
    body{font-family:Inter,system-ui,Arial,sans-serif;background:#fff;color:#0f172a;
      display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
    .card{max-width:420px;padding:32px;border:1px solid #E2E8F0;border-radius:16px;
      box-shadow:0 1px 3px rgba(0,0,0,.05);text-align:center}
    h1{font-size:20px;margin:0 0 8px;font-weight:700}
    p{color:#64748B;font-size:14px;line-height:1.5;margin:0 0 16px}
    .badge{display:inline-block;background:#EEF2FF;color:#4F46E5;font-weight:600;
      padding:6px 12px;border-radius:999px;font-size:12px;margin-bottom:12px}
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">NeuroSecure</div>
    <h1>You're all set</h1>
    <p>Your email has been confirmed. You can close this tab and return
       to the NeuroSecure browser extension to sign in.</p>
  </div>
</body>
</html>`;
  const confirmHandler = (_req: Request, res: Response): void => {
    res.status(200).type("html").send(confirmHtml);
  };
  app.get("/", confirmHandler);
  app.get("/auth/confirm", confirmHandler);
  app.get("/auth/callback", confirmHandler);

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/notify", notifyRoutes);
  app.use("/api/v1/user", userRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
