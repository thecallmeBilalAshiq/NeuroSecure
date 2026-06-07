import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { HttpError } from "../middleware/errorHandler";
import { userService } from "../services/user.service";

const router = Router();

const settingsSchema = z.object({
  whatsapp_number: z
    .string()
    .trim()
    .min(6)
    .max(32)
    .regex(/^\+?[0-9 ()-]+$/, "Invalid phone number")
    .nullable()
    .optional(),
});

router.patch("/settings", authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new HttpError(401, "UNAUTHORIZED", "Authentication required");
    }
    const data = settingsSchema.parse(req.body);
    const user = await userService.updateSettings(req.user.id, data);
    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        whatsapp_number: user.whatsapp_number,
        updated_at: user.updated_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
