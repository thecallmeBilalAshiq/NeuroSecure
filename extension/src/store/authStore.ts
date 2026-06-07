import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { authService, supabase } from "../services/authService";

const BACKEND_URL =
  process.env.PLASMO_PUBLIC_BACKEND_URL ?? "http://localhost:3000";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
export type Plan = "FREE" | "PRO";

export interface AppUser {
  id: string;
  email: string;
  plan: Plan;
  whatsapp_number: string | null;
}

interface AuthState {
  user: AppUser | null;
  rawUser: User | null;
  session: Session | null;
  status: AuthStatus;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

async function fetchProfile(accessToken: string): Promise<AppUser | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { user?: AppUser };
    return json.user ?? null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  rawUser: null,
  session: null,
  status: "loading",
  error: null,

  async login(email, password) {
    set({ error: null });
    try {
      const { user, session } = await authService.login(email, password);
      let appUser: AppUser | null = null;
      if (session?.access_token) {
        appUser = await fetchProfile(session.access_token);
      }
      set({
        user:
          appUser ??
          (user
            ? {
                id: user.id,
                email: user.email ?? email,
                plan: "FREE",
                whatsapp_number: null,
              }
            : null),
        rawUser: user,
        session,
        status: session ? "authenticated" : "unauthenticated",
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Login failed",
        status: "unauthenticated",
      });
      throw err;
    }
  },

  async register(email, password) {
    set({ error: null });
    try {
      const { user, session } = await authService.register(email, password);
      let appUser: AppUser | null = null;
      if (session?.access_token) {
        appUser = await fetchProfile(session.access_token);
      }
      set({
        user:
          appUser ??
          (user
            ? {
                id: user.id,
                email: user.email ?? email,
                plan: "FREE",
                whatsapp_number: null,
              }
            : null),
        rawUser: user,
        session,
        status: session ? "authenticated" : "unauthenticated",
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Registration failed",
        status: "unauthenticated",
      });
      throw err;
    }
  },

  async logout() {
    try {
      await authService.logout();
    } catch {
      /* even if remote fails, clear local state */
    }
    set({
      user: null,
      rawUser: null,
      session: null,
      status: "unauthenticated",
      error: null,
    });
  },

  async hydrate() {
    set({ status: "loading", error: null });
    const session = await authService.getSession();
    if (!session) {
      set({
        user: null,
        rawUser: null,
        session: null,
        status: "unauthenticated",
      });
      return;
    }
    const profile = await fetchProfile(session.access_token);
    set({
      user:
        profile ??
        (session.user
          ? {
              id: session.user.id,
              email: session.user.email ?? "",
              plan: "FREE",
              whatsapp_number: null,
            }
          : null),
      rawUser: session.user ?? null,
      session,
      status: "authenticated",
    });
  },

  async refreshProfile() {
    const session = get().session;
    if (!session) return;
    const profile = await fetchProfile(session.access_token);
    if (profile) {
      set({ user: profile });
    }
  },

  clearError() {
    set({ error: null });
  },
}));

// Keep store in sync with Supabase auth state changes.
let initialized = false;
export function initAuthListener(): void {
  if (initialized) return;
  initialized = true;
  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session) {
      useAuthStore.setState({
        user: null,
        rawUser: null,
        session: null,
        status: "unauthenticated",
      });
      return;
    }
    const profile = await fetchProfile(session.access_token);
    useAuthStore.setState({
      user:
        profile ??
        (session.user
          ? {
              id: session.user.id,
              email: session.user.email ?? "",
              plan: "FREE",
              whatsapp_number: null,
            }
          : null),
      rawUser: session.user ?? null,
      session,
      status: "authenticated",
    });
  });
}
