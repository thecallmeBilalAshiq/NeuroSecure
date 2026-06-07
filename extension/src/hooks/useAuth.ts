import { useAuthStore } from "../store/authStore";

export interface UseAuth {
  user: ReturnType<typeof useAuthStore.getState>["user"];
  session: ReturnType<typeof useAuthStore.getState>["session"];
  status: ReturnType<typeof useAuthStore.getState>["status"];
  error: string | null;
  isAuthenticated: boolean;
  isPro: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): UseAuth {
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);
  const clearError = useAuthStore((s) => s.clearError);

  return {
    user,
    session,
    status,
    error,
    isAuthenticated: status === "authenticated",
    isPro: user?.plan === "PRO",
    login,
    register,
    logout,
    clearError,
  };
}
