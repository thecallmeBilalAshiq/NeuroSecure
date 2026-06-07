import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin, supabaseAnon } from "../services/supabase";
import { userService } from "../services/user.service";
import { authenticate } from "../middleware/authenticate";
import { HttpError } from "../middleware/errorHandler";

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

router.post("/register", async (req, res, next) => {
  try {
    const { email, password } = credentialsSchema.parse(req.body);

    // Step 1: try to create the user with email already confirmed.
    // We bypass the email-confirmation flow because a browser-extension
    // popup cannot reliably handle the Supabase redirect.
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    let supabaseUserId: string | null = created?.user?.id ?? null;
    let supabaseUserEmail: string | null = created?.user?.email ?? null;

    if (createErr || !created?.user) {
      const message = createErr?.message ?? "Could not create account";
      const looksLikeExists =
        createErr?.status === 422 ||
        createErr?.status === 400 ||
        /already|exists|registered/i.test(message);

      if (!looksLikeExists) {
        throw new HttpError(400, "REGISTRATION_FAILED", message);
      }

      // The email is already in Supabase Auth (likely an orphan account from
      // an earlier failed registration). Attempt to verify the password by
      // signing in. If it succeeds, treat this as completing registration.
      const { data: existing, error: existingErr } =
        await supabaseAnon.auth.signInWithPassword({ email, password });

      if (existingErr || !existing?.user || !existing?.session) {
        throw new HttpError(
          409,
          "EMAIL_TAKEN",
          "This email is already registered. Please sign in instead."
        );
      }

      supabaseUserId = existing.user.id;
      supabaseUserEmail = existing.user.email ?? email;

      await userService.ensureUser({
        id: supabaseUserId,
        email: supabaseUserEmail,
      });

      res.status(200).json({
        user: { id: supabaseUserId, email: supabaseUserEmail },
        session: existing.session,
      });
      return;
    }

    if (!supabaseUserId) {
      throw new HttpError(
        500,
        "REGISTRATION_FAILED",
        "Supabase did not return a user id"
      );
    }

    try {
      await userService.ensureUser({
        id: supabaseUserId,
        email: supabaseUserEmail ?? email,
      });
    } catch (dbErr) {
      // Database upsert failed (e.g. missing tables). Roll back the auth user
      // so the email isn't left orphaned and the next attempt can succeed.
      await supabaseAdmin.auth.admin
        .deleteUser(supabaseUserId)
        .catch(() => undefined);
      const detail = dbErr instanceof Error ? dbErr.message : "Database error";
      throw new HttpError(
        500,
        "DATABASE_UNAVAILABLE",
        `Could not save user profile: ${detail}`
      );
    }

    const { data: signed, error: signErr } =
      await supabaseAnon.auth.signInWithPassword({ email, password });

    if (signErr || !signed.user || !signed.session) {
      throw new HttpError(
        500,
        "REGISTRATION_FAILED",
        signErr?.message ?? "Account created but could not sign in"
      );
    }

    res.status(201).json({
      user: {
        id: signed.user.id,
        email: signed.user.email,
      },
      session: signed.session,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = credentialsSchema.parse(req.body);

    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user || !data.session) {
      throw new HttpError(
        401,
        "INVALID_CREDENTIALS",
        error?.message ?? "Invalid email or password"
      );
    }

    await userService.ensureUser({
      id: data.user.id,
      email: data.user.email ?? email,
    });

    res.status(200).json({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: data.session,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const { refresh_token } = refreshSchema.parse(req.body);
    const { data, error } = await supabaseAnon.auth.refreshSession({
      refresh_token,
    });
    if (error || !data.session) {
      throw new HttpError(
        401,
        "REFRESH_FAILED",
        error?.message ?? "Could not refresh session"
      );
    }
    res.status(200).json({ session: data.session });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", authenticate, async (_req, res, next) => {
  try {
    // Token-revocation in Supabase is handled client-side; we acknowledge.
    res.status(200).json({ message: "Signed out" });
  } catch (err) {
    next(err);
  }
});

router.get("/me", authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new HttpError(401, "UNAUTHORIZED", "Authentication required");
    }
    const profile = await userService.getUserById(req.user.id);
    if (!profile) {
      throw new HttpError(404, "USER_NOT_FOUND", "User not found");
    }
    res.status(200).json({
      user: {
        id: profile.id,
        email: profile.email,
        plan: profile.plan,
        whatsapp_number: profile.whatsapp_number,
        created_at: profile.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
