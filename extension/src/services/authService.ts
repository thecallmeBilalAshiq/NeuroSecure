import { createClient } from "@supabase/supabase-js";
import type {
  Session,
  SupabaseClient,
  User,
} from "@supabase/supabase-js";

const SUPABASE_URL = process.env.PLASMO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY ?? "";
const BACKEND_URL =
  process.env.PLASMO_PUBLIC_BACKEND_URL ?? "http://localhost:3000";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Visible in popup devtools — without these, auth cannot work.
  console.error("[authService] Supabase env vars missing");
}

/**
 * chrome.storage.local-backed adapter so Supabase persists sessions
 * across popup open/close.
 */
const chromeStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return null;
    const r = await chrome.storage.local.get(key);
    const v = r[key];
    return typeof v === "string" ? v : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    await chrome.storage.local.set({ [key]: value });
  },
  async removeItem(key: string): Promise<void> {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    await chrome.storage.local.remove(key);
  },
};

/**
 * Cache the Supabase client on `globalThis` so Plasmo's HMR (which can
 * re-evaluate this module) doesn't create multiple GoTrueClient instances
 * fighting over the same `ns_auth_v1` storage key.
 */
const GLOBAL_KEY = "__neurosecureSupabaseClient__" as const;
type GlobalWithCache = typeof globalThis & {
  [GLOBAL_KEY]?: SupabaseClient;
};

const globalScope = globalThis as GlobalWithCache;

function buildClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: chromeStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storageKey: "ns_auth_v1",
    },
  });
}

export const supabase: SupabaseClient =
  globalScope[GLOBAL_KEY] ?? (globalScope[GLOBAL_KEY] = buildClient());

export interface AuthResult {
  user: User | null;
  session: Session | null;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);
    return { user: data.user, session: data.session };
  },

  async register(email: string, password: string): Promise<AuthResult> {
    // Registration is handled by our backend so the user is auto-confirmed
    // (browser extensions can't handle Supabase email-confirmation redirects).
    let res: Response;
    try {
      res = await fetch(`${BACKEND_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      throw new Error(
        "Cannot reach NeuroSecure backend. Make sure it is running."
      );
    }

    const json = (await res.json().catch(() => null)) as {
      user?: { id: string; email: string | null };
      session?: { access_token: string; refresh_token: string };
      message?: string;
    } | null;

    if (!res.ok || !json?.session) {
      throw new Error(json?.message ?? "Registration failed");
    }

    // Load the session into the Supabase client so it's persisted via
    // chrome.storage.local and used for subsequent requests.
    const { data, error } = await supabase.auth.setSession({
      access_token: json.session.access_token,
      refresh_token: json.session.refresh_token,
    });
    if (error) throw new Error(error.message);

    return { user: data.user, session: data.session };
  },

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session ?? null;
  },

  async getUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  },

  onAuthStateChange(
    callback: (session: Session | null) => void
  ): () => void {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session ?? null);
    });
    return () => data.subscription.unsubscribe();
  },
};
