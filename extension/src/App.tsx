import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import BottomNav, { type NavTab } from "./components/layout/BottomNav";
import Header from "./components/layout/Header";
import Spinner from "./components/ui/Spinner";
import { useAuth } from "./hooks/useAuth";
import DashboardPage from "./pages/DashboardPage";
import EnrollmentPage from "./pages/EnrollmentPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SettingsPage from "./pages/SettingsPage";
import UpgradePage from "./pages/UpgradePage";
import { initAuthListener, useAuthStore } from "./store/authStore";
import { useSettingsStore } from "./store/settingsStore";

type Mode = "login" | "register" | "enroll" | "app";

interface AppProps {
  variant?: "popup" | "options";
}

export function App({ variant = "popup" }: AppProps): JSX.Element {
  const { user, status } = useAuth();
  const hydrate = useAuthStore((s) => s.hydrate);
  const settingsHydrate = useSettingsStore((s) => s.hydrate);
  const isEnrolled = useSettingsStore((s) => s.isEnrolled);

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [tab, setTab] = useState<NavTab>("dashboard");
  const [forceEnroll, setForceEnroll] = useState(false);

  useEffect(() => {
    initAuthListener();
    void hydrate();
    void settingsHydrate();
  }, [hydrate, settingsHydrate]);

  let mode: Mode = "login";
  if (status === "loading") mode = "login";
  else if (status === "unauthenticated") mode = authMode;
  else if (!isEnrolled || forceEnroll) mode = "enroll";
  else mode = "app";

  const handleEnrollComplete = async (): Promise<void> => {
    setForceEnroll(false);
    await settingsHydrate();
    setTab("dashboard");
  };

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[600px] gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-text-secondary">Loading NeuroSecure…</p>
      </div>
    );
  }

  if (mode === "login") {
    return (
      <div className="flex flex-col w-full min-h-[600px]">
        <AnimatePresence mode="wait">
          <LoginPage
            key="login"
            onSwitchToRegister={() => setAuthMode("register")}
          />
        </AnimatePresence>
      </div>
    );
  }

  if (mode === "register") {
    return (
      <div className="flex flex-col w-full min-h-[600px]">
        <AnimatePresence mode="wait">
          <RegisterPage key="register" onBack={() => setAuthMode("login")} />
        </AnimatePresence>
      </div>
    );
  }

  if (mode === "enroll") {
    // The browser closes extension popups whenever they lose focus, which
    // means the camera permission prompt would dismiss the popup before the
    // user could grant access. Redirect the user to the options page (a real
    // tab) so getUserMedia can request the camera without focus loss.
    if (variant === "popup") {
      const openInTab = (): void => {
        if (
          typeof chrome !== "undefined" &&
          chrome.runtime &&
          chrome.tabs?.create
        ) {
          chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
          window.close();
        }
      };
      return (
        <div className="flex flex-col w-full min-h-[600px]">
          <Header plan={user?.plan ?? "FREE"} title="Face Enrollment" />
          <div className="flex flex-col items-center justify-center flex-1 px-6 text-center gap-5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-primary"
              style={{ background: "linear-gradient(135deg,#6366F1,#4F46E5)" }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="6" width="14" height="12" rx="2" />
                <polygon points="22,8 16,12 22,16" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold">Set Up Your Face ID</h2>
              <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                We'll open enrollment in a new tab so we can ask for camera
                access. It only takes about 30 seconds.
              </p>
            </div>
            <button
              type="button"
              onClick={openInTab}
              className="w-full rounded-button px-5 py-3 text-sm font-semibold text-white shadow-primary transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg,#6366F1,#4F46E5)" }}
            >
              Open Enrollment
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col w-full min-h-[600px]">
        <Header
          plan={user?.plan ?? "FREE"}
          showBack={isEnrolled}
          onBack={() => setForceEnroll(false)}
          title="Face Enrollment"
        />
        <AnimatePresence mode="wait">
          <EnrollmentPage key="enroll" onComplete={handleEnrollComplete} />
        </AnimatePresence>
      </div>
    );
  }

  // Authenticated + enrolled
  return (
    <div className="flex flex-col w-full min-h-[600px]">
      <Header plan={user?.plan ?? "FREE"} />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          {tab === "dashboard" && (
            <DashboardPage
              key="dashboard"
              variant={variant}
              onReEnroll={() => setForceEnroll(true)}
            />
          )}
          {tab === "protection" && (
            <DashboardPage
              key="protection"
              variant={variant}
              onReEnroll={() => setForceEnroll(true)}
            />
          )}
          {tab === "settings" && (
            <SettingsPage
              key="settings"
              onReEnroll={() => setForceEnroll(true)}
              onUpgrade={() => setTab("upgrade")}
            />
          )}
          {tab === "upgrade" && (
            <UpgradePage key="upgrade" onClose={() => setTab("dashboard")} />
          )}
        </AnimatePresence>
      </main>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}

export default App;
