import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState } from "react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Logo from "../components/ui/Logo";
import { useAuth } from "../hooks/useAuth";

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage({ onSwitchToRegister }: LoginPageProps): JSX.Element {
  const { login, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const emailError =
    touched && !EMAIL_RE.test(email) ? "Enter a valid email" : null;
  const pwdError =
    touched && password.length < 8
      ? "Password must be at least 8 characters"
      : null;
  const canSubmit = !emailError && !pwdError && email && password;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      clearError();
      await login(email, password);
    } catch {
      /* error already in store */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-6 px-5 py-6"
    >
      <header className="flex flex-col items-center gap-3 pt-2">
        <Logo size={72} showWordmark />
        <div className="text-[12px] text-text-secondary -mt-1">
          AI-powered Privacy Protection
        </div>
      </header>

      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="text-xl font-bold text-text-primary">Welcome back</h1>
        <p className="text-sm text-text-secondary">
          Sign in to protect your browser
        </p>
      </div>

      {error && (
        <Card variant="bordered" padding="md" className="border-red-200 bg-red-50">
          <p className="text-xs text-danger font-medium">{error}</p>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          leftIcon={<Mail size={16} />}
          placeholder="you@example.com"
          autoComplete="email"
          error={emailError}
        />

        <Input
          label="Password"
          type={showPwd ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched(true)}
          leftIcon={<Lock size={16} />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              aria-label={showPwd ? "Hide password" : "Show password"}
              className="p-1 hover:text-text-primary"
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          placeholder="••••••••"
          autoComplete="current-password"
          error={pwdError}
        />

        <Button
          type="submit"
          fullWidth
          loading={submitting}
          disabled={!canSubmit}
        >
          Sign In
        </Button>
      </form>

      <div className="flex items-center gap-3 text-[11px] text-text-muted uppercase tracking-wider">
        <div className="flex-1 h-px bg-border" />
        <span>or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <Button variant="secondary" fullWidth onClick={onSwitchToRegister}>
        Create account
      </Button>

      <p className="text-[11px] text-text-muted text-center">
        Your face data never leaves this device.
      </p>
    </motion.div>
  );
}

export default LoginPage;
