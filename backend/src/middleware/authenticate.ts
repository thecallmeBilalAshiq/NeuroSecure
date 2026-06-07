import { NextFunction, Request, Response } from "express";
import { supabaseAnon } from "../services/supabase";
import { userService } from "../services/user.service";

export interface AuthenticatedUser {
  id: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      accessToken?: string;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const header = req.header("authorization") ?? req.header("Authorization");
    if (!header || !header.toLowerCase().startsWith("bearer ")) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Missing Bearer token",
        statusCode: 401,
      });
      return;
    }

    const token = header.slice("bearer ".length).trim();
    if (!token) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Empty Bearer token",
        statusCode: 401,
      });
      return;
    }

    const { data, error } = await supabaseAnon.auth.getUser(token);
    if (error || !data.user || !data.user.email) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Invalid or expired session",
        statusCode: 401,
      });
      return;
    }

    await userService.ensureUser({
      id: data.user.id,
      email: data.user.email,
    });

    req.user = { id: data.user.id, email: data.user.email };
    req.accessToken = token;
    next();
  } catch (err) {
    next(err);
  }
}
