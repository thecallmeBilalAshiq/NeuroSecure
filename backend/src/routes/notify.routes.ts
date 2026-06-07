import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { HttpError } from "../middleware/errorHandler";
import { userService } from "../services/user.service";
import { emailService } from "../services/email.service";
import { env } from "../config/env";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

const RATE_LIMIT_WINDOW_MS = 30_000;
const lastAlertAt = new Map<string, number>();

const bodySchema = z.object({
  tabUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  timestamp: z.string().optional(),
});

router.post(
  "/alert",
  authenticate,
  upload.single("photo"),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "UNAUTHORIZED", "Authentication required");
      }

      const now = Date.now();
      const last = lastAlertAt.get(req.user.id) ?? 0;
      if (now - last < RATE_LIMIT_WINDOW_MS) {
        const retryAfterSec = Math.ceil(
          (RATE_LIMIT_WINDOW_MS - (now - last)) / 1000
        );
        res.setHeader("Retry-After", String(retryAfterSec));
        throw new HttpError(
          429,
          "RATE_LIMITED",
          `Too many alerts. Try again in ${retryAfterSec}s.`
        );
      }
      lastAlertAt.set(req.user.id, now);

      const parsed = bodySchema.safeParse({
        tabUrl: typeof req.body?.tabUrl === "string" ? req.body.tabUrl : undefined,
        timestamp:
          typeof req.body?.timestamp === "string" ? req.body.timestamp : undefined,
      });
      if (!parsed.success) {
        throw new HttpError(
          400,
          "VALIDATION_ERROR",
          parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")
        );
      }

      let photoDataUrl: string | null = null;
      if (req.file && req.file.buffer && req.file.buffer.length > 0) {
        const mime = req.file.mimetype || "image/jpeg";
        photoDataUrl = `data:${mime};base64,${req.file.buffer.toString("base64")}`;
      }

      const alert = await userService.createAlert({
        userId: req.user.id,
        photoUrl: photoDataUrl,
      });

      // Always notify the registered account holder. Optionally also CC an
      // operations inbox (env.ALERT_EMAIL) when configured to a *different*
      // address.
      const recipients = new Set<string>();
      recipients.add(req.user.email);
      if (
        env.ALERT_EMAIL &&
        env.ALERT_EMAIL.trim().length > 0 &&
        env.ALERT_EMAIL.trim().toLowerCase() !==
          req.user.email.trim().toLowerCase() &&
        env.ALERT_EMAIL.trim().toLowerCase() !==
          (env.GMAIL_USER ?? "").trim().toLowerCase()
      ) {
        recipients.add(env.ALERT_EMAIL.trim());
      }

      await emailService.sendAlertEmail(Array.from(recipients), {
        alertId: alert.id,
        triggeredAt: alert.triggered_at,
        tabUrl: parsed.data.tabUrl ?? null,
        intruderPhoto: photoDataUrl,
        userEmail: req.user.email,
      });

      res.status(200).json({
        alertId: alert.id,
        message: "Alert delivered",
        deliveredTo: Array.from(recipients),
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/alerts", authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new HttpError(401, "UNAUTHORIZED", "Authentication required");
    }
    const alerts = await userService.listAlerts(req.user.id, 20);
    res.status(200).json({ alerts });
  } catch (err) {
    next(err);
  }
});

export default router;
