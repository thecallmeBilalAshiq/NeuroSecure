import { useEffect } from "react";
import App from "./App";
import Logo from "./components/ui/Logo";
import "./style.css";

function Options(): JSX.Element {
  useEffect(() => {
    document.title = "NeuroSecure";
    document.body.classList.add("ns-options");
    return () => {
      document.body.classList.remove("ns-options");
    };
  }, []);

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-8 sm:py-12"
      style={{
        background:
          "radial-gradient(circle at 18% 14%, rgba(6,182,212,0.18), transparent 55%), radial-gradient(circle at 84% 6%, rgba(245,158,11,0.16), transparent 55%), radial-gradient(circle at 50% 105%, rgba(16,185,129,0.18), transparent 60%), linear-gradient(180deg,#FFFFFF 0%,#F1F5F9 100%)",
      }}
    >
      <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-[1fr_minmax(380px,460px)] gap-10 lg:gap-16 items-center">
        <aside className="hidden lg:flex flex-col gap-8 max-w-md justify-self-center">
          <Logo size={120} showWordmark />
          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight text-text-primary leading-tight">
              Your face is the&nbsp;
              <span
                style={{
                  background:
                    "linear-gradient(135deg,#06B6D4 0%,#10B981 50%,#F59E0B 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                only key
              </span>
              &nbsp;to your screen.
            </h2>
            <p className="text-sm leading-relaxed text-text-secondary">
              NeuroSecure watches your webcam locally and instantly blurs the
              page when an unrecognized face appears. Nothing is uploaded —
              your face data is encrypted with your PIN and stored on this
              device only.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <span>
                <strong className="text-text-primary">100% on-device</strong>
                &nbsp;face recognition with face-api.js
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-success shrink-0" />
              <span>
                <strong className="text-text-primary">PIN-encrypted</strong>
                &nbsp;biometric template (AES-GCM, never leaves your browser)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
              <span>
                <strong className="text-text-primary">Email & WhatsApp</strong>
                &nbsp;alerts when someone else looks at your screen
              </span>
            </li>
          </ul>
        </aside>

        <div className="w-full max-w-[420px] mx-auto bg-white text-text-primary border border-border rounded-card shadow-card-lg overflow-hidden">
          <App variant="options" />
        </div>
      </div>
    </div>
  );
}

export default Options;
