import { useAuth } from "./useAuth";

export type PlanRequirement = "pro" | "free";

export interface PlanGate {
  allowed: boolean;
}

export function usePlanGate(required: PlanRequirement): PlanGate {
  const { isPro } = useAuth();
  if (required === "free") {
    return { allowed: true };
  }
  return { allowed: isPro };
}
