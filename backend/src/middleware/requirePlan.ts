import { NextFunction, Request, Response } from "express";
import { Plan } from "@prisma/client";
import { userService } from "../services/user.service";

export function requirePlan(required: Plan) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "UNAUTHORIZED",
          message: "Authentication required",
          statusCode: 401,
        });
        return;
      }

      const user = await userService.getUserById(req.user.id);
      if (!user) {
        res.status(404).json({
          error: "USER_NOT_FOUND",
          message: "User profile not found",
          statusCode: 404,
        });
        return;
      }

      const ranks: Record<Plan, number> = { FREE: 0, PRO: 1 };
      if (ranks[user.plan] < ranks[required]) {
        res.status(403).json({
          error: "UPGRADE_REQUIRED",
          message: `${required} plan required`,
          statusCode: 403,
        });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
