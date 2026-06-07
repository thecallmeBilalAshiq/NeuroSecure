import { motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";

interface RegisterPageProps {
  onBack: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PasswordChecks {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  special: boolean;
}

function evaluatePassword(pwd: string): PasswordChecks {
  return {
    length: pwd.length >= 12,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    number: /\d/.test(pwd),
    special: /[^A-Za-z0-9]/.test(pwd),
  };
}

function strengthLabel(score: number): {
  label: string;
  color: string;
  bg: string;
} {
  if (score <= 1) return { label: "Weak", color: "#EF4444", bg: "#FEE2E2" };
  if (score === 2) return { label: "Fair", color: "#F59E0B", bg: "#FEF3C7" };
  if (score === 3) return { label: "Good", color: "#EAB308", bg: "#FEF9C3" };
  return { label: "Strong", color: "#10B981", bg: "#D1FAE5" };
}

export function RegisterPage({ onBack }: RegisterPageProps): JSX.Element {
  const { register, error, clearError } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const checks = useMemo(() => evaluatePassword(password), [password]);
  const score =
    Number(checks.length) +
    Number(checks.upper) +
    Number(checks.lower) +
    Number(checks.number) +
    Number(checks.special);
  const strength = strengthLabel(Math.min(score - 1, 4));

  const emailError =
    touched && !EMAIL_RE.test(email) ? "Enter a valid email" : null;
  const pwdError =
    touched && score < 5
      ? "Password must meet all requirements below"
      : null;
  const confirmError =
    touched && password !== confirm ? "Passwords do not match" : null;
  const nameError = touched && name.trim().length < 2 ? "Enter your name" : null;
  const canSubmit =
    !emailError &&
    !pwdError &&
    !confirmError &&
    !nameError &&
    name &&
    email &&
    password &&
    confirm &&
    agree;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      clearError();
      await register(email, password);
    } catch {
      /* error already in store */
    } finally {
      setSubmitting(false);
    }
  };

  const reqRow = (ok: boolean, text: string): JSX.Element => (
    <li
      className={[
        "flex items-center gap-1.5 text-[11px]",
        ok ? "text-success" : "text-text-muted",
      ].join(" ")}
    >
      <span
        className={[
          "w-3.5 h-3.5 rounded-full flex items-center justify-center text-white",
          ok ? "bg-success" : "bg-slate-200",
        ].join(" ")}
      >
        {ok && <Check size={10} />}
      </span>
      {text}
    </li>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-5 px-5 py-5"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="-ml-2 p-2 rounded-full text-text-secondary hover:bg-surface hover:text-text-primary transition"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Create Account</h1>
          <p className="text-xs text-text-secondary">Join NeuroSecure</p>
        </div>
      </div>

      {error && (
        <Card variant="bordered" padding="md" className="border-red-200 bg-red-50">
          <p className="text-xs text-danger font-medium">{error}</p>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <Input
          label="Full name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
          leftIcon={<UserIcon size={16} />}
          placeholder="Jane Doe"
          autoComplete="name"
          error={nameError}
        />

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

        <div className="flex flex-col gap-1.5">
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
            placeholder="••••••••••••"
            autoComplete="new-password"
            error={pwdError}
          />

          {password.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex h-1.5 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full transition-colors"
                    style={{
                      background:
                        i < Math.max(score - 1, 0) ? strength.color : "#E2E8F0",
                    }}
                  />
                ))}
              </div>
              <div
                className="self-start rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: strength.bg, color: strength.color }}
              >
                {strength.label}
              </div>
            </div>
          )}

          <ul className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
            {reqRow(checks.length, "12+ characters")}
            {reqRow(checks.upper, "Uppercase letter")}
            {reqRow(checks.lower, "Lowercase letter")}
            {reqRow(checks.number, "Number")}
            {reqRow(checks.special, "Special character")}
          </ul>
        </div>

        <Input
          label="Confirm password"
          type={showPwd ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onBlur={() => setTouched(true)}
          leftIcon={<Lock size={16} />}
          placeholder="Re-enter password"
          autoComplete="new-password"
          error={confirmError}
        />

        <label className="flex items-start gap-2 select-none">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary cursor-pointer"
          />
          <span className="text-[11px] text-text-secondary leading-snug">
            I agree to the{" "}
            <span className="text-primary font-semibold">Terms of Service</span>{" "}
            and{" "}
            <span className="text-primary font-semibold">Privacy Policy</span>.
          </span>
        </label>

        <Button
          type="submit"
          fullWidth
          loading={submitting}
          disabled={!canSubmit}
        >
          Create Account
        </Button>
      </form>

      <p className="text-[12px] text-text-secondary text-center">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onBack}
          className="text-primary font-semibold hover:underline"
        >
          Sign in
        </button>
      </p>
    </motion.div>
  );
}

export default RegisterPage;
